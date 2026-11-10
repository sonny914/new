# TECH DROP 001 narration, final wording. PROMPT is what the voice model is given (numbers spelled for speech).
LINES = [
  "Claude Code just got a pretty serious upgrade.",
  "Everybody's talking about Fable 5.2. Up to thirty percent faster than 5.1.",
  "Cool. But that's not the headline.",
  "Claude can now help set up its own cloud environment.",
  "Missing a dependency? It can find it.",
  "Network access? It asks for your approval.",
  "API key? You enter it securely, outside the chat.",
  "/usage shows what's eating your usage, and how to fix it.",
  "/storage clears out old worktrees and sessions.",
  "Ultrathink is back. Extra reasoning, for one turn.",
  "I'm still using Opus for most of my coding.",
  "But Fable for bigger, open-ended problems? Worth testing.",
  "Your session keeps running in the cloud. Pick it up from another device.",
  "The real shift? AI handling more of the work between the idea and the finished product.",
  "Quiet Bands. Build what matters.",
]
PROMPT = {2: "Everybody's talking about Fable five point two. Up to thirty percent faster than five point one.",
          8: "Slash usage shows what's eating your usage, and how to fix it.", 9: "Slash storage clears out old worktrees and sessions."}
prompt = lambda n: PROMPT.get(n, LINES[n - 1])
