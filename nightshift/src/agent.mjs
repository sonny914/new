// The real shift: one Claude Agent SDK query() with the night shift's tools mounted as an in-process MCP
// server, three subagents, the permission guard and hard budget caps. The SDK is imported lazily so the
// tests and the dry run work without it installed.

import { buildAgents } from './prompt.mjs';
import { makeGuard } from './guard.mjs';
import { TOOL_DOCS } from './tools.mjs';

/** The agent's subprocess gets only what it needs to reach the model. No GitHub, Supabase or Resend keys. */
const PASS_ENV = /^(PATH|HOME|USER|LANG|LC_\w+|TERM|TMPDIR|TEMP|TMP|SHELL|NODE_EXTRA_CA_CERTS|SSL_CERT_FILE|SSL_CERT_DIR|HTTPS?_PROXY|https?_proxy|NO_PROXY|no_proxy|ANTHROPIC_API_KEY|ANTHROPIC_BASE_URL|ANTHROPIC_AUTH_TOKEN|CLAUDE_CODE_\w+|CI|GITHUB_ACTIONS|RUNNER_\w+)$/;

export function agentEnv(env) {
  return Object.fromEntries(Object.entries(env).filter(([k, v]) => PASS_ENV.test(k) && typeof v === 'string'));
}

/**
 * External MCP servers from company.json, e.g.
 *   "mcp": { "stripe": { "type": "http", "url": "https://mcp.stripe.com", "headers": { "Authorization": "Bearer ${STRIPE_KEY}" }, "allow": ["list_customers"] } }
 * Header values may reference env vars. A server whose variables are unset is skipped, not half-configured.
 */
export function externalMcp(config, env) {
  const servers = {};
  const allow = {};
  for (const [name, s] of Object.entries(config.mcp ?? {})) {
    if (name === 'nightshift') continue;
    let missing = false;
    const fill = (v) => String(v).replace(/\$\{(\w+)\}/g, (_, k) => (env[k] ? env[k] : ((missing = true), '')));
    const headers = Object.fromEntries(Object.entries(s.headers ?? {}).map(([k, v]) => [k, fill(v)]));
    const url = fill(s.url ?? '');
    if (missing || !url) continue;
    servers[name] = { type: s.type ?? 'http', url, headers };
    allow[name] = s.allow ?? [];
  }
  return { servers, allow };
}

function progress(message, log) {
  if (message.type !== 'assistant') return;
  for (const block of message.message?.content ?? []) {
    // Tool names only: the run log may be public, the content is not.
    if (block.type === 'tool_use') log(`  · ${message.parent_tool_use_id ? '  ' : ''}${block.name}${block.name === 'Agent' || block.name === 'Task' ? ` → ${block.input?.subagent_type ?? ''}` : ''}`);
  }
}

export async function runAgent({ config, system, prompt, tools, workspaceDir, env, log = console.log }) {
  const { query, tool, createSdkMcpServer } = await import('@anthropic-ai/claude-agent-sdk');
  const { z } = await import('zod');

  const shapes = {
    log_work: { area: z.enum(['product', 'growth', 'ops', 'research', 'finance']), summary: z.string() },
    remember: { note: z.string() },
    rewrite_memory: { content: z.string() },
    propose_action: {
      kind: z.enum(['email', 'post', 'site', 'spend', 'other']),
      title: z.string().describe('One line the founder can scan on a phone'),
      why: z.string().describe('Why this moves the charter goal; for outreach, where you found the contact (URL)'),
      payload: z
        .object({
          to: z.union([z.string(), z.array(z.string())]).optional(),
          subject: z.string().optional(),
          body: z.string().optional(),
          channel: z.string().optional(),
          text: z.string().optional(),
          amount_usd: z.number().optional(),
          vendor: z.string().optional(),
          details: z.string().optional(),
        })
        .describe('email {to, subject, body}; post {channel, text}; spend {amount_usd, vendor, details}; site/other {details}'),
    },
    close_proposal: { id: z.string(), outcome: z.enum(['done', 'failed']), note: z.string() },
    read_metrics: {},
    end_shift: {
      headline: z.string(),
      summary: z.string(),
      needs_from_founder: z.array(z.string()).optional(),
      tomorrow: z.string(),
      pr_title: z.string().optional(),
      pr_body: z.string().optional(),
    },
  };

  const server = createSdkMcpServer({
    name: 'nightshift',
    version: '1.0.0',
    // The agent's own tools are always in the prompt; otherwise it spends its first turn searching for them.
    alwaysLoad: true,
    tools: Object.entries(shapes).map(([name, shape]) => tool(name, TOOL_DOCS[name], shape, (args) => tools[name](args))),
  });

  const external = externalMcp(config, env);
  const denied = [];
  const guard = makeGuard(
    {
      workspaceDir,
      writable: config.workspace?.writable ?? [],
      web: config.tools?.web !== false,
      bash: config.tools?.bash === true,
      mcpAllow: external.allow,
    },
    (name, behavior) => behavior === 'deny' && denied.push(name),
  );

  const run = query({
    prompt,
    options: {
      model: config.model ?? 'claude-opus-5-5',
      effort: config.effort ?? 'high',
      maxTurns: config.budget?.maxTurns ?? 60,
      maxBudgetUsd: config.budget?.maxUsdPerShift ?? 3,
      // Lets the model see its remaining token budget and pace itself to reach end_shift before the hard cap.
      ...(config.budget?.taskTokens ? { taskBudget: { total: config.budget.taskTokens } } : {}),
      cwd: workspaceDir,
      systemPrompt: { type: 'preset', preset: 'claude_code', append: system },
      agents: buildAgents(config),
      mcpServers: { nightshift: server, ...external.servers },
      strictMcpConfig: true,
      settingSources: [],
      permissionMode: 'default',
      // No allowedTools: every call that needs permission goes through the one guard, own tools included.
      canUseTool: guard,
      disallowedTools: config.tools?.bash === true ? [] : ['Bash'],
      env: agentEnv(env),
      ...(env.NIGHTSHIFT_DEBUG ? { stderr: (d) => process.stderr.write(d) } : {}),
    },
  });

  let result = null;
  let thrown = null;
  try {
    for await (const message of run) {
      progress(message, log);
      if (message.type === 'result') result = message;
    }
  } catch (e) {
    // The SDK throws when a run ends in an error result (budget or turn cap included). Hitting a cap is
    // a normal way for a shift to end: the work already went through the tools, so keep going.
    thrown = e;
  }
  if (denied.length) log(`  guard denied ${denied.length} call(s): ${[...new Set(denied)].join(', ')}`);
  return summariseRun(result, thrown);
}

/** Turn the SDK's final result (or the error it threw) into the runner's run record. */
export function summariseRun(result, thrown) {
  if (result) {
    // An API failure (unreachable, auth, overloaded) arrives as subtype "success" with is_error set and
    // the error in the result text. Treat it as the failure it is.
    const apiError = result.subtype === 'success' && result.is_error;
    const subtype = apiError ? 'api_error' : result.subtype;
    const detail = apiError ? String(result.result ?? '') : (result.errors ?? []).join('; ');
    return {
      cost: result.total_cost_usd ?? 0,
      turns: result.num_turns ?? 0,
      subtype,
      error: subtype === 'success' ? null : `${subtype}${detail ? `: ${detail.slice(0, 300)}` : ''}`,
    };
  }
  const message = String(thrown?.message ?? 'the agent produced no result').slice(0, 300);
  const subtype = /maximum budget/i.test(message) ? 'error_max_budget_usd' : /maximum (number of )?turns/i.test(message) ? 'error_max_turns' : thrown ? 'error_during_execution' : 'no_result';
  return { cost: null, turns: null, subtype, error: message };
}

/**
 * A scripted shift that exercises every tool without a model or a network. `npm run dry` shows the whole
 * loop (inbox → executors → tools → journal → brief) end to end.
 */
export async function runDryAgent({ tools, log = console.log }) {
  log('  · (dry run: scripted agent, no model calls)');
  await tools.read_metrics({});
  await tools.log_work({ area: 'research', summary: 'Dry run: read the metrics and the outbox.' });
  await tools.log_work({ area: 'product', summary: 'Dry run: would have asked the builder for one note page.' });
  await tools.remember({ note: 'Dry run happened; the real first shift should read the product and the charter first.' });
  await tools.propose_action({
    kind: 'other',
    title: 'Dry run: example proposal',
    why: 'Shows how a proposal looks in the inbox. Safe to leave unticked; it expires.',
    payload: { details: 'Nothing. This proposal exists to demonstrate the approval flow.' },
  });
  await tools.end_shift({
    headline: 'Dry run complete: the loop works end to end',
    summary: 'The scripted agent called every tool. No model, email, post or spend was involved.',
    needs_from_founder: ['Set ANTHROPIC_API_KEY and run a real shift.'],
    tomorrow: 'A real shift.',
  });
  return { cost: 0, turns: 0, subtype: 'dry_run', error: null };
}
