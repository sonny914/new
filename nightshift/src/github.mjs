// GitHub as the founder's inbox: one issue per company in a PRIVATE repository. The issue body is the
// approval board (tick to approve), comments from the founder are notes for the next shift, and each
// shift posts its brief as a comment so the phone gets a notification.
//
// The runner refuses a public repository. Briefs carry lead names, email drafts and strategy; a public
// issue would publish them.

const API = 'https://api.github.com';

export function githubClient(token, fetchImpl = fetch) {
  async function call(method, path, body) {
    const res = await fetchImpl(API + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'nightshift-runner',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 200);
      throw new Error(`GitHub ${method} ${path.split('?')[0]} failed: ${res.status} ${detail}`);
    }
    return res.status === 204 ? null : res.json();
  }
  return { call };
}

export async function githubInbox({ token, repo, companyName, founders = [], allowPublic = false, fetchImpl = fetch }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo ?? '')) throw new Error(`NIGHTSHIFT_HQ_REPO must look like owner/name, got "${repo}"`);
  const gh = githubClient(token, fetchImpl);
  const info = await gh.call('GET', `/repos/${repo}`);
  if (!info.private && !allowPublic) {
    throw new Error(`Refusing to use ${repo} as the inbox: it is public, and briefs carry leads, drafts and strategy. Make it private.`);
  }
  const title = `Night Shift · ${companyName}`;
  const trusted = new Set(founders.map((f) => f.toLowerCase()));

  async function findIssue(number) {
    if (number) {
      const issue = await gh.call('GET', `/repos/${repo}/issues/${number}`).catch(() => null);
      if (issue && issue.state === 'open') return issue;
    }
    const open = await gh.call('GET', `/repos/${repo}/issues?state=open&per_page=100`);
    return open.find((i) => !i.pull_request && i.title === title) ?? null;
  }

  return {
    kind: 'github',
    repo,
    async load(meta = {}) {
      const issue = await findIssue(meta.issueNumber);
      return issue ? { body: issue.body ?? '', number: issue.number } : null;
    },
    /** Comments since the last shift from the founders only. Anyone else's words are not instructions. */
    async founderNotes(doc, sinceIso) {
      if (!doc?.number) return [];
      const since = sinceIso ? `&since=${encodeURIComponent(sinceIso)}` : '';
      const comments = await gh.call('GET', `/repos/${repo}/issues/${doc.number}/comments?per_page=100${since}`);
      return comments
        .filter((c) => trusted.has(String(c.user?.login).toLowerCase()))
        .filter((c) => !sinceIso || Date.parse(c.created_at) > Date.parse(sinceIso))
        .filter((c) => !String(c.body).startsWith('<!-- ns:brief -->'))
        .map((c) => ({ author: c.user.login, at: c.created_at, body: String(c.body).slice(0, 4000) }));
    },
    async publish({ doc, body, comment }) {
      let number = doc?.number;
      if (number) await gh.call('PATCH', `/repos/${repo}/issues/${number}`, { body });
      else number = (await gh.call('POST', `/repos/${repo}/issues`, { title, body })).number;
      if (comment) await gh.call('POST', `/repos/${repo}/issues/${number}/comments`, { body: `<!-- ns:brief -->\n${comment}` });
      return number;
    },
  };
}
