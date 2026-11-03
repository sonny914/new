// October in microdrama: a 7-slide Instagram carousel for @flighty.ai, in the Studio's look.
// Same rules as the pack: no em dashes, no invented numbers, no hype words. Every number carries its source.
// *word* marks the one live (orange) thing on a slide. Render: npm run studio:carousel -- 2026-10-microdrama

export const CAROUSEL = {
  slug: '2026-10-microdrama',
  slate: 'Microdrama · Oct 2026',
  slides: [
    {
      kind: 'cover',
      kicker: 'AI filmmakers, pay attention.',
      title: 'October in *microdrama.*',
      lede: 'Five things that moved the format. Every number checked against its source.',
      list: ['Fox × Hartbeat', 'Channel 4', 'The money', 'AI reality check', 'Who’s watching'],
      visual: { type: 'frame', tc: '00:00:12', label: '9:16 · 60 s' },
    },
    {
      kind: 'stat',
      kicker: 'Fox × Hartbeat',
      title: 'Fox just bought into vertical.',
      stat: '*25*',
      body: '25 live-action vertical series to start, on the My Drama app, under Hartbeat’s Codeblack, Essence and Revolt brands. Fox gets first look at film and TV adaptations.',
      visual: { type: 'slate', count: 25 },
      takeaway: 'The vertical is the pilot now. What performs gets developed.',
      source: 'The Hollywood Reporter, TheWrap · Oct 2026',
    },
    {
      kind: 'story',
      kicker: 'Channel 4',
      title: 'A legacy broadcaster just went *vertical.*',
      body: 'The Guest List is Channel 4’s first microdrama, made with beauty brand Sol de Janeiro. It skips the broadcast schedule and goes straight to social.',
      visual: { type: 'phone', title: 'The Guest List', episodes: 5, meta: ['90 s to 2 min each', 'Weekly from Oct 24'], where: 'TikTok · YouTube · Meta' },
      takeaway: 'Brands are paying for drama, not just ads. That’s work you can pitch.',
      source: 'Deadline · Oct 2026',
    },
    {
      kind: 'stat',
      kicker: 'Industry economics',
      title: 'Projected microdrama revenue this year.',
      stat: '*$14B*',
      body: 'Only SAG-AFTRA has a dedicated Verticals Agreement: budgets up to $300K, day rates, and 21.5% pension and health since July 1. The WGA and DGA have no microdrama contract yet.',
      visual: { type: 'bars', unit: '$B', bars: [
        { label: '2025', value: 11, note: 'estimate' },
        { label: '2026', value: 14, note: 'projected', on: true },
        { label: '2031', value: 25, note: 'forecast', open: true },
      ] },
      takeaway: 'Before you cast anyone, know which deal covers them.',
      source: 'Omdia via Forbes, Oct 13 2026 · SAG-AFTRA',
    },
    {
      kind: 'stat',
      kicker: 'AI reality check',
      title: 'Of new AI dramas passed 50M views.',
      stat: '*1.3%*',
      body: 'DataEye counted 221,900 new AI dramas and AI comic dramas on Douyin in the first half of 2026. 2,886 passed 50 million views, its rough break-even line.',
      visual: { type: 'cells', cols: 11, rows: 7, label: 'About 1 in 77', beside: true },
      takeaway: 'Making it got cheap. Winning it didn’t.',
      source: 'DataEye via 36Kr · 2026',
    },
    {
      kind: 'stat',
      kicker: 'Audience data',
      title: 'Of UK microdrama users are men.',
      stat: '*54%*',
      body: 'Omdia’s consumer survey upends the women-only assumption. Brazil is the outlier.',
      visual: { type: 'split', mid: 50, rows: [
        { label: 'UK', value: 54, on: true },
        { label: 'US', value: 50 },
        { label: 'Spain', value: 47 },
        { label: 'Brazil', value: 29 },
      ], caption: 'Men, share of microdrama users' },
      takeaway: 'Romance for women is a lane, not the whole audience.',
      source: 'Omdia · Oct 13 2026',
    },
    {
      kind: 'cta',
      kicker: 'Your turn',
      title: 'Which one surprised you most?',
      lede: 'Tell me in the comments.',
      pitchLead: 'Making one anyway?',
      pitch: 'Before you build it,\n*try to kill it.*',
      pitchNote: 'Part 01 of the free pack is the five questions that decide if an idea is worth a single credit. Link in bio.',
    },
  ],
  caption: `October in microdrama. Five things that moved the format, every number checked against its source.

1. Fox × Hartbeat: 25 live-action vertical series on My Drama, with Fox holding first look at film and TV.
2. Channel 4’s first microdrama, The Guest List, made with Sol de Janeiro. Social only, from Oct 24.
3. Omdia puts microdrama at about $11B in 2025 and $14B this year. Only SAG-AFTRA has a dedicated Verticals Agreement so far.
4. DataEye: 2,886 of 221,900 new AI dramas on Douyin (1.3%) passed 50M views in the first half of 2026, its rough break-even line.
5. Omdia: men are 54% of UK microdrama users.

Which one surprised you most? 👇

Making one anyway? Part 01 of the free AI Content Pack is five questions to kill a bad idea before it costs you credits. Link in bio.

Sources: The Hollywood Reporter, TheWrap, Deadline, Forbes, Omdia, SAG-AFTRA, 36Kr.

#microdrama #verticaldrama #aifilmmaking #aivideo #shortdrama #filmmaking #creator`,
};
