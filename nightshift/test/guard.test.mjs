import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, inside, isWritable } from '../src/guard.mjs';
import { agentEnv, externalMcp, summariseRun } from '../src/agent.mjs';

const policy = { workspaceDir: '/ws', writable: ['notes/', 'sitemap.xml'], web: true, bash: false, mcpAllow: { stripe: ['list_customers'] } };
const allowed = (tool, input) => decide(tool, input, policy).behavior === 'allow';

test('paths are resolved against the workspace and cannot escape it', () => {
  assert.equal(inside('/ws', 'notes/a.html'), 'notes/a.html');
  assert.equal(inside('/ws', '/ws/notes/a.html'), 'notes/a.html');
  assert.equal(inside('/ws', '../etc/passwd'), null);
  assert.equal(inside('/ws', '/ws/../ws2/x'), null);
  assert.equal(inside('/ws', 'notes/../../x'), null);
});

test('writes only inside writable paths', () => {
  assert.ok(allowed('Write', { file_path: '/ws/notes/new-note/index.html' }));
  assert.ok(allowed('Edit', { file_path: 'sitemap.xml' }));
  assert.ok(!allowed('Edit', { file_path: '/ws/index.html' }));
  assert.ok(!allowed('Write', { file_path: '/ws/notes/../index.html' }));
  assert.ok(!allowed('Write', { file_path: '/tmp/x' }));
  assert.ok(!allowed('Write', {}));
});

test('config, functions, workflows and the engine are never writable', () => {
  const everything = ['', 'netlify.toml', '_redirects', 'netlify/', '.github/', 'nightshift/', '.env'];
  for (const p of ['netlify.toml', '_redirects', 'netlify/functions/score-lead.js', '.github/workflows/x.yml', 'nightshift/src/guard.mjs', '.env', 'package.json', 'db/x.sql', '.git/config']) {
    assert.equal(isWritable(p, everything.concat([p])), false, p);
  }
});

test('reads stay in the workspace and skip secrets', () => {
  assert.ok(allowed('Read', { file_path: '/ws/index.html' }));
  assert.ok(allowed('Grep', { pattern: 'x' }));
  assert.ok(!allowed('Read', { file_path: '/etc/passwd' }));
  assert.ok(!allowed('Read', { file_path: '/ws/.git/config' }));
  assert.ok(!allowed('Read', { file_path: '/ws/.env.local' }));
});

test('bash is off unless the company turns it on', () => {
  assert.ok(!allowed('Bash', { command: 'ls' }));
  assert.equal(decide('Bash', { command: 'ls' }, { ...policy, bash: true }).behavior, 'allow');
});

test('web follows the config', () => {
  assert.ok(allowed('WebSearch', { query: 'q' }));
  assert.equal(decide('WebFetch', { url: 'u' }, { ...policy, web: false }).behavior, 'deny');
});

test('own tools and delegation are allowed; outside MCP tools only when listed', () => {
  assert.ok(allowed('mcp__nightshift__propose_action', {}));
  assert.ok(allowed('Agent', { subagent_type: 'builder' }));
  assert.ok(allowed('mcp__stripe__list_customers', {}));
  const refund = decide('mcp__stripe__create_refund', {}, policy);
  assert.equal(refund.behavior, 'deny');
  assert.match(refund.message, /propose_action/);
  assert.ok(!allowed('mcp__my_server__do_thing', {}));
  assert.ok(!allowed('SomeNewTool', {}));
});

test('the agent subprocess never sees integration secrets', () => {
  const env = agentEnv({ PATH: '/bin', ANTHROPIC_API_KEY: 'k', NIGHTSHIFT_TOKEN: 'gh', SUPABASE_SERVICE_ROLE_KEY: 's', RESEND_API_KEY: 'r', GITHUB_TOKEN: 'g' });
  assert.deepEqual(Object.keys(env).sort(), ['ANTHROPIC_API_KEY', 'PATH']);
});

test('hitting a cap is a normal end of shift, reported honestly', () => {
  // The SDK throws on an error result rather than yielding it; the runner must not call that a crash.
  const budget = summariseRun(null, new Error('Claude Code returned an error result: Reached maximum budget ($3)'));
  assert.equal(budget.subtype, 'error_max_budget_usd');
  assert.equal(budget.cost, null);
  assert.equal(summariseRun(null, new Error('Reached maximum number of turns (60)')).subtype, 'error_max_turns');
  const ok = summariseRun({ subtype: 'success', is_error: false, total_cost_usd: 1.25, num_turns: 31 }, null);
  assert.deepEqual(ok, { cost: 1.25, turns: 31, subtype: 'success', error: null });
});

test('an API failure dressed as success is reported as a failure', () => {
  // What the SDK actually returns when the API is unreachable (observed against a closed port).
  const r = summariseRun({ subtype: 'success', is_error: true, result: 'API Error: Connection refused (ECONNREFUSED)', total_cost_usd: 0, num_turns: 1 }, new Error('Claude Code returned an error result'));
  assert.equal(r.subtype, 'api_error');
  assert.match(r.error, /Connection refused/);
});

test('external MCP servers fill env refs and are skipped when a ref is unset', () => {
  const config = { mcp: { stripe: { url: 'https://mcp.example', headers: { Authorization: 'Bearer ${STRIPE_KEY}' }, allow: ['list_customers'] }, other: { url: 'https://o.example', headers: { X: '${MISSING}' } } } };
  const { servers, allow } = externalMcp(config, { STRIPE_KEY: 'sk' });
  assert.deepEqual(Object.keys(servers), ['stripe']);
  assert.equal(servers.stripe.headers.Authorization, 'Bearer sk');
  assert.deepEqual(allow.stripe, ['list_customers']);
});
