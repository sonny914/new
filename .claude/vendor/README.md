# Vendored Claude Code toolkits

Skills, commands and agents under `.claude/` that were copied from upstream
plugin repositories so they load in every session on this repo, including
cloud sessions that cannot reach the plugin installers.

| Toolkit | Upstream | Version / commit | License | What was copied |
|---|---|---|---|---|
| Impeccable | https://github.com/pbakaus/impeccable (`plugin/skills/impeccable`) | 4.4.0 / `9d715cc` | Apache-2.0 | `skills/impeccable/` |
| Marketing | https://github.com/anthropics/knowledge-work-plugins (`marketing`) | 1.2.0 / `da38ec1` | Apache-2.0 | 8 skills, `CONNECTORS.md` |
| Brand Voice | https://github.com/anthropics/knowledge-work-plugins (`partner-built/brand-voice`) | 1.1.0 / `da38ec1` | MIT | 3 skills, 3 commands, 5 agents, settings example |
| Superdesign | https://github.com/superdesigndev/superdesign-skill (`skills/superdesign`) | 0.6.0 / `f9f05cd` | MIT | `skills/superdesign/` |

Not copied on purpose:

- `.mcp.json` from Marketing and Brand Voice. Those list remote connectors
  (Slack, Figma, HubSpot, Notion, ...) that are configured per account, not
  per repo.
- Hook manifests. Impeccable's per-edit detector goes in the machine-local
  `.claude/settings.local.json`; run `/impeccable hooks on` to install it.

Runtime notes:

- Impeccable downloads its engine binary from GitHub Releases on first run.
- Superdesign runs `npx --yes @superdesign/cli@latest` and needs a login.
- Brand Voice reads `.claude/brand-voice.local.md` (gitignored; see the
  `.example`) and writes guidelines to `.claude/brand-voice-guidelines.md`,
  which is meant to be committed.

To refresh, re-clone the upstream repo, copy the same paths, and update this
table.
