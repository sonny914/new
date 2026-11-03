// The permission guard: decides every tool call the agent makes that the SDK does not already allow.
//
// Internal work is allowed (read the workspace, edit the writable paths, research the web). Anything
// else is denied with a message that points the agent at propose_action, so a denied call turns into a
// proposal the founder can approve rather than a dead end.

import { resolve, relative, sep, isAbsolute } from 'node:path';

const READ_TOOLS = new Set(['Read', 'Glob', 'Grep', 'LS', 'NotebookRead']);
const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
const WEB_TOOLS = new Set(['WebSearch', 'WebFetch']);
/** Planning and delegation tools that touch nothing outside the session. */
const HARMLESS = new Set(['Agent', 'Task', 'TodoWrite', 'TaskCreate', 'TaskUpdate', 'TaskList', 'TaskGet', 'ToolSearch']);

/** Never writable, whatever the company config says: deploy config, functions, workflows, secrets, the engine itself. */
const NEVER_WRITE = [/^\.git(\/|$)/, /^\.github\//, /^\.env/, /(^|\/)\.env/, /^netlify\.toml$/, /^_redirects$/, /^netlify\//, /^nightshift\//, /^package(-lock)?\.json$/, /^db\//];
/** Never readable: credentials and git internals. */
const NEVER_READ = [/^\.git(\/|$)/, /(^|\/)\.env/, /(^|\/)\.npmrc$/];

const DENY_OUTWARD =
  'Not available on the night shift. If this needs to happen, call mcp__nightshift__propose_action with the exact content so the founder can approve it.';

/** Workspace-relative POSIX path, or null if the path escapes the workspace. */
export function inside(workspaceDir, p) {
  if (typeof p !== 'string' || !p) return null;
  const abs = isAbsolute(p) ? resolve(p) : resolve(workspaceDir, p);
  const rel = relative(resolve(workspaceDir), abs);
  if (rel === '') return '';
  if (rel.startsWith('..') || isAbsolute(rel)) return null;
  return rel.split(sep).join('/');
}

export function isWritable(rel, writable = []) {
  if (rel == null || rel === '') return false;
  if (NEVER_WRITE.some((re) => re.test(rel))) return false;
  return writable.some((w) => (w.endsWith('/') ? rel.startsWith(w) : rel === w));
}

/**
 * policy: { workspaceDir, writable: string[], web: boolean, bash: boolean, mcpAllow: { [server]: string[] | ['*'] } }
 * Returns a PermissionResult-shaped object.
 */
export function decide(toolName, input = {}, policy) {
  const allow = { behavior: 'allow', updatedInput: input };
  const deny = (message) => ({ behavior: 'deny', message });

  if (HARMLESS.has(toolName)) return allow;
  if (toolName.startsWith('mcp__nightshift__')) return allow;

  if (READ_TOOLS.has(toolName)) {
    const target = input.file_path ?? input.path ?? input.notebook_path;
    if (target === undefined) return allow; // defaults to the working directory
    const rel = inside(policy.workspaceDir, target);
    if (rel === null) return deny('Stay inside the workspace.');
    if (NEVER_READ.some((re) => re.test(rel))) return deny('That file is off-limits.');
    return allow;
  }

  if (WRITE_TOOLS.has(toolName)) {
    const rel = inside(policy.workspaceDir, input.file_path ?? input.notebook_path);
    if (isWritable(rel, policy.writable)) return allow;
    return deny(`You can only change files under: ${(policy.writable ?? []).join(', ') || '(nothing)'}. For anything else, propose_action with kind "site".`);
  }

  if (WEB_TOOLS.has(toolName)) return policy.web ? allow : deny('Web access is off for this company.');

  if (toolName === 'Bash') return policy.bash ? allow : deny('Shell access is off on the night shift. Use Read, Glob, Grep and Edit.');

  const mcp = /^mcp__([^_]+(?:_[^_]+)*)__(.+)$/.exec(toolName);
  if (mcp) {
    const [, server, name] = mcp;
    const allowed = policy.mcpAllow?.[server] ?? [];
    if (allowed.includes('*') || allowed.includes(name)) return allow;
    return deny(DENY_OUTWARD);
  }

  return deny(DENY_OUTWARD);
}

export function makeGuard(policy, onDecision = () => {}) {
  return async (toolName, input) => {
    const result = decide(toolName, input, policy);
    onDecision(toolName, result.behavior);
    return result;
  };
}
