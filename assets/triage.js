/* Quiet Bands Pressure Test — triage engine.
   Pure functions, no DOM. Transparent rules, no score.
   Input: answers collected by /rd/pressure-test. Output: a review.

   States: research | humans | manual | build | park
   The engine must be able to say "don't build this yet". */

export const EVIDENCE = [
  ['talked',       "I've talked to people experiencing it"],
  ['watched',      "I've watched the work happen"],
  ['spreadsheet',  'There’s an existing spreadsheet / manual process'],
  ['complaints',   'People complain about it publicly'],
  ['other_product','People already use another product / service'],
  ['spend',        'People already spend money trying to solve it'],
  ['data',         'I have internal operational data'],
  ['self',         "I've experienced the problem myself"],
  ['assumptions',  'Mostly assumptions so far'],
  ['other',        'Other'],
];
export const COSTS = [
  ['time','Time'],['labor','Labor'],['revenue','Revenue'],['errors','Errors / rework'],
  ['cx','Customer experience'],['compliance','Compliance / risk'],['opportunity','Opportunity'],
  ['else','Something else'],['unknown',"I don't know"],
];
export const FREQUENCY = [['rarely','Rarely'],['occasionally','Occasionally'],['regularly','Regularly'],['constantly','Constantly'],['unknown',"I don't know"]];
export const SPEND = [['yes','Yes'],['no','No'],['unknown',"I don't know"]];
export const HUMANS = [['several','Yes — several'],['one_two','Yes — one or two'],['not_yet','Not yet'],['self','I am one of the people experiencing it']];
export const PROGRESS = [['nothing','Nothing built'],['notes','Notes / sketches'],['prototype','Prototype'],['working','Working software'],['production','Production software']];
export const DECISION = [
  ['build','Should I build this?'],['first','What should I build first?'],['worth','Whether the problem is worth solving'],
  ['automate','Whether this should be automated'],['custom','Whether custom software is appropriate'],
  ['have_evidence','I already have evidence and need help building'],['other','Other'],
];

export const EMPTY = {
  claim: '', audience: '', problem: '', frequency: '', evidence: [], workaround: '', spend: '',
  costs: [], costText: '', humans: '', surprise: '', progress: '', decision: '',
};

const OBSERVABLE = ['talked', 'watched', 'spreadsheet', 'complaints', 'other_product', 'spend', 'data'];
const CONCRETE_COSTS = ['time', 'labor', 'revenue', 'errors', 'cx', 'compliance', 'opportunity'];
const label = (list, key) => (list.find(([k]) => k === key) || [])[1] || key;
const text = (s) => (s || '').trim();
const meaningful = (s, n = 12) => text(s).length >= n;

/** Derive the evidence signals the rules reason about. Exported so the result page can show them. */
export function signals(a) {
  const ev = new Set(a.evidence || []);
  const observable = OBSERVABLE.filter((k) => ev.has(k));
  const costs = (a.costs || []).filter((k) => CONCRETE_COSTS.includes(k));
  const humansStrong = a.humans === 'several';
  const humansSome = a.humans === 'one_two';
  const humansSelf = a.humans === 'self';
  return {
    observable,                                  // external evidence signals selected
    observableCount: observable.length,
    assumptionsOnly: observable.length === 0,    // nothing beyond self/assumptions/other
    selfOnly: observable.length === 0 && ev.has('self'),
    repeated: a.frequency === 'regularly' || a.frequency === 'constantly',
    rare: a.frequency === 'rarely',
    frequencyKnown: !!a.frequency && a.frequency !== 'unknown',
    workaroundKnown: meaningful(a.workaround),
    spendYes: a.spend === 'yes',
    spendNo: a.spend === 'no',
    consequenceKnown: costs.length > 0,
    costs,
    humansStrong, humansSome, humansSelf,
    humansAny: humansStrong || humansSome,       // conversations with people other than yourself
    softwareSignal: ev.has('spreadsheet') || ev.has('data') || ['prototype', 'working', 'production'].includes(a.progress)
      || ['automate', 'custom', 'have_evidence'].includes(a.decision),
    builtSomething: ['prototype', 'working', 'production'].includes(a.progress),
  };
}

/** Decide the state. Rules are evaluated in order; the first that matches wins. */
export function decide(a) {
  const s = signals(a);
  // E — park: weak or rare problem, nothing observable, no consequence
  if (s.observableCount === 0 && !s.consequenceKnown && (s.rare || s.spendNo)) return 'park';
  if (s.rare && s.spendNo && !s.consequenceKnown && s.observableCount <= 1 && !s.humansStrong) return 'park';
  // A — research more: little or no observable evidence
  if (s.assumptionsOnly) return 'research';
  if (s.observableCount <= 1 && !s.workaroundKnown && !s.humansAny) return 'research';
  // B — talk to humans: some evidence, no human confirmation beyond yourself
  if (!s.humansAny) return 'humans';
  // D — explore a build: several stronger signals together, and a reason software may help
  if (s.observableCount >= 2 && s.workaroundKnown && s.repeated && s.consequenceKnown && s.softwareSignal) return 'build';
  // C — test manually: evidence, workaround and consequence exist, humans confirmed, but no case for software yet
  if (s.workaroundKnown && s.consequenceKnown && s.observableCount >= 1) return 'manual';
  // otherwise the gaps are about the problem itself — back to people
  return 'humans';
}

/** Build the review shown on the result screen. */
export function review(a) {
  const s = signals(a);
  const state = decide(a);
  const see = [], unknown = [], reduce = [];

  // what we can see
  if (meaningful(a.claim, 6)) see.push(`A stated claim: ${quote(a.claim)}.`);
  if (meaningful(a.audience, 4)) see.push(`A named audience: ${quote(a.audience)}.`);
  s.observable.forEach((k) => see.push(signalLine(k)));
  if (s.selfOnly) see.push('First-hand experience of the problem (yours). Real, but one data point.');
  if (s.repeated) see.push(`You believe it happens ${a.frequency}. Belief, not a count yet.`);
  if (s.workaroundKnown) see.push(`A current workaround: ${quote(a.workaround)}.`);
  if (s.spendYes) see.push('Somebody already spends time or money dealing with this.');
  if (s.consequenceKnown) see.push(`A stated cost: ${s.costs.map((k) => label(COSTS, k).toLowerCase()).join(', ')}${meaningful(a.costText, 6) ? ` — ${quote(a.costText)}` : ''}.`);
  if (s.humansStrong) see.push('Several conversations with people who experience it.');
  if (s.humansSome) see.push('One or two conversations with people who experience it.');
  if (meaningful(a.surprise, 6)) see.push(`Something surprised you: ${quote(a.surprise)}.`);
  if (s.builtSomething) see.push(`Something already exists: ${label(PROGRESS, a.progress).toLowerCase()}.`);

  // what is still assumed
  if (s.assumptionsOnly) unknown.push('That the problem exists outside your own head. Nothing selected is observable by someone else.');
  if (!s.frequencyKnown) unknown.push('How often it actually happens.');
  else if (!s.repeated) unknown.push(`Whether “${a.frequency}” is often enough to matter.`);
  if (!s.workaroundKnown) unknown.push('What people do today instead. If there is no workaround, either the problem is tolerable or nobody owns it.');
  if (a.spend !== 'yes') unknown.push(s.spendNo ? 'Why nobody spends anything on it, when it supposedly costs something.' : 'Whether anyone already spends time or money on it.');
  if (!s.consequenceKnown) unknown.push('What it costs. Without a consequence there is no reason to change.');
  if (!s.humansAny) unknown.push(s.humansSelf ? 'Whether anyone besides you experiences it the same way.' : 'What the people doing the work would say. You haven’t asked yet.');
  if (!s.softwareSignal && state !== 'research' && state !== 'park') unknown.push('Whether software is the right intervention. Nothing here shows a manual approach has been tried and failed.');
  if (s.observableCount < 2 && !s.assumptionsOnly) unknown.push('Independent confirmation. One evidence signal is a lead, not a pattern.');

  // what would reduce uncertainty
  const questions = humanQuestions(a, s);
  if (state === 'research') {
    reduce.push('Find one artifact that proves the problem exists without you: a spreadsheet, a thread of complaints, a job posting, an invoice for a workaround.');
    reduce.push('Use the Field Guide’s investigation prompts to have an AI research the problem space, then stop when it starts guessing.');
    reduce.push('Name three specific people who should have this problem. If you can’t, the audience isn’t specific enough yet.');
  } else if (state === 'humans') {
    reduce.push('Three to five conversations with people who do the work, using the questions below. Listen for what they already pay for.');
    reduce.push('Ask to watch the work happen once. Ten minutes of observation beats an hour of opinion.');
  } else if (state === 'manual') {
    reduce.push('Deliver the outcome by hand for one person or one team for two weeks. A spreadsheet, a checklist, a shared inbox, you doing it.');
    reduce.push('Measure what changed: minutes saved, errors avoided, money recovered. That number decides whether software is worth building.');
    reduce.push('Note what breaks when you do it manually. That list is the real software spec.');
  } else if (state === 'build') {
    reduce.push('Write down the smallest version that would change the work for the people you talked to. One workflow, not a platform.');
    reduce.push('Decide what you would measure in the first month to know it worked. If you can’t name it, the build isn’t ready.');
    reduce.push('Bring the artifacts (the spreadsheet, the data, the notes from conversations) to the conversation. They are the brief.');
  } else if (state === 'park') {
    reduce.push('Write one sentence about what evidence would make you reopen this, and where it would come from.');
    reduce.push('Set a reminder for 90 days. If the problem hasn’t come back up by itself, that is also an answer.');
  }

  return { state, signals: s, see, unknown, reduce, questions, meta: STATES[state] };
}

export const STATES = {
  research: { label: 'Research more', headline: 'You’ve got a hypothesis.', copy: 'That’s enough to investigate. It isn’t enough to justify a build yet.',
    cta: { text: 'Use the Field Guide', href: '/rd/#field-guide' }, secondary: { text: 'Edit answers', action: 'restart' } },
  humans: { label: 'Talk to humans', headline: 'The next answer probably isn’t online.', copy: 'You’ve found enough signal to know what questions to ask. The next useful evidence should come from people actually doing the work.',
    cta: { text: 'Save your questions', action: 'save-questions' }, secondary: { text: 'Get the Field Guide', href: '/rd/#field-guide' } },
  manual: { label: 'Test manually', headline: 'Don’t automate it yet.', copy: 'There appears to be enough here to test the outcome. That doesn’t mean software needs to exist yet.',
    cta: { text: 'Plan a manual test', action: 'manual-plan' }, secondary: { text: 'Get the Field Guide', href: '/rd/#field-guide' } },
  build: { label: 'Explore a build', headline: 'A build may be justified.', copy: 'You’ve entered enough evidence to justify a deeper technical conversation. This is not proof that the idea will succeed. It’s evidence that discussing a build may now be useful.',
    cta: { text: 'Talk to Quiet Bands', href: '/work/?from=pressure-test' }, secondary: { text: 'Edit answers', action: 'restart' } },
  park: { label: 'Park it', headline: 'Not enough yet.', copy: 'The evidence you’ve entered doesn’t currently justify more investment. That’s a useful result. You can park the idea and revisit it if new evidence appears.',
    cta: { text: 'Save the Field Guide', href: '/rd/#field-guide' }, secondary: { text: 'Edit answers', action: 'restart' } },
};

/** 3–5 interview questions shaped by the gaps in the answers. */
export function humanQuestions(a, s = signals(a)) {
  const q = [];
  q.push('Walk me through the last time this happened. What did you actually do, step by step?');
  if (!s.frequencyKnown || !s.repeated) q.push('How many times did this come up last month? Could you count them if you had to?');
  if (!s.workaroundKnown) q.push('What do you do today instead? Who else has to be involved?');
  if (!s.consequenceKnown) q.push('When it goes wrong, what does it cost you: time, money, a customer, a headache? Which one hurts most?');
  if (a.spend !== 'yes') q.push('Has anyone here paid for anything, a tool, a person, a service, to deal with this?');
  q.push('What have you already tried that didn’t work, and why did it fail?');
  if (q.length < 5) q.push('If this disappeared tomorrow, what would you do with the time?');
  return q.slice(0, 5);
}

/** Plain-text export of the review, for the save/copy actions. */
export function toText(a, r) {
  const L = [];
  L.push('QUIET BANDS PRESSURE TEST', `Status: ${r.meta.label.toUpperCase()}`, '');
  L.push(`Claim: ${text(a.claim) || '—'}`, `For: ${text(a.audience) || '—'}`, `Problem: ${text(a.problem) || '—'}`, '');
  L.push('WHAT WE CAN SEE'); r.see.forEach((x) => L.push(`- ${x}`)); L.push('');
  L.push('WHAT IS STILL ASSUMED'); r.unknown.forEach((x) => L.push(`- ${x}`)); L.push('');
  L.push('WHAT WOULD REDUCE UNCERTAINTY'); r.reduce.forEach((x) => L.push(`- ${x}`)); L.push('');
  if (r.state === 'humans') { L.push('QUESTIONS TO ASK'); r.questions.forEach((x, i) => L.push(`${i + 1}. ${x}`)); L.push(''); }
  L.push('quietbands.com/rd  ·  A Quiet Bands R&D process, from Flighty.ai');
  return L.join('\n');
}

function signalLine(k) {
  return {
    talked: 'You’ve talked to people experiencing it.',
    watched: 'You’ve watched the work happen.',
    spreadsheet: 'A spreadsheet or manual process already exists. Somebody built a workaround.',
    complaints: 'People complain about it publicly. Searchable, quotable.',
    other_product: 'People already use another product or service for it. There is a market, and a comparison.',
    spend: 'People already spend money trying to solve it.',
    data: 'You have internal operational data. That can be counted.',
  }[k] || k;
}
function quote(s) {
  const t = text(s).replace(/\s+/g, ' ');
  return `“${t.length > 140 ? t.slice(0, 137).trimEnd() + '…' : t}”`;
}
