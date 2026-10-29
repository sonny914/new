// AI Content Pack 001: the one source for /studio/pack/inside/, its PDF and the free guides under /studio/learn/.
// Edit the words here, then `npm run studio:build`. Rules for this copy: no em dashes, no invented results or numbers,
// no hype words. Prompts use straight quotes so they paste cleanly into any generator.

export const PACK = {
  name: 'AI Content Pack',
  edition: '001',
  title: 'Idea to episode',
  subtitle: 'Everything between a one-line idea and a posted 60-second drama, written down so you stop paying credits to find out what doesn’t work.',
  pdf: 'downloads/quiet-bands-studio-ai-content-pack-001.pdf',
};

// Twelve parts. `guide` marks the parts that are also free, public guides.
export const PARTS = [
  {
    id: 'kill-it', n: '01', title: 'Kill it before you generate it', guide: '60-second-drama',
    summary: 'Five questions that decide whether an idea is worth a single credit.',
    blocks: [
      { p: 'Credits are film stock. Most of them get spent finding out that an idea was never going to work, one generation at a time. Writing it down costs nothing. So before you open a generator, put the idea through five questions. They are written to be able to say no.' },
      { steps: [
        ['One sentence.', 'Can you say the scene with a person, a want and a problem in it? “A woman finds a key under her mat that isn’t hers.” If it takes a paragraph, it isn’t a scene yet.'],
        ['The first frame.', 'What is on screen in the first two seconds? If you can’t picture it, the scroll wins before your story starts.'],
        ['The turn.', 'Something has to change between the start and the end: a reveal, a choice, a reversal. If nothing changes, it’s a mood board.'],
        ['Small enough to hold.', 'Can it be made with one or two characters and one or two locations? Every new face is a consistency problem. Every new location is another look to keep steady.'],
        ['Twice.', 'Would you watch it twice? The ending should ask a question or pay one off.'],
      ] },
      { table: { head: ['Score', 'Call'], rows: [
        ['Five yes', 'Make it.'],
        ['Three or four', 'Fix the weak answer on paper first, then make it.'],
        ['Two or fewer', 'Park it. Keep the note. Spend the credits on the next one.'],
      ] } },
    ],
  },
  {
    id: 'beat-sheet', n: '02', title: 'The 60-second drama', guide: '60-second-drama',
    summary: 'A beat sheet with timings, and a worked example you can steal the shape of.',
    blocks: [
      { p: 'Short drama works when every second has a job. Five beats, timed for 60 seconds. For a 30-second piece, halve each one and cut the second escalation.' },
      { table: { head: ['Time', 'Beat', 'Its job'], rows: [
        ['0–3 s', 'Hook', 'Open mid-action, or on an image that asks a question. No logo, no title card, no “so…”.'],
        ['3–12 s', 'Who and want', 'One person, one want. Shown, not said.'],
        ['12–35 s', 'The wall', 'The problem gets worse twice. Escalate, don’t repeat.'],
        ['35–50 s', 'The turn', 'A reveal or a choice that flips what we thought was happening.'],
        ['50–60 s', 'The cut', 'End on a question, a look or a line. Cut a beat earlier than feels comfortable.'],
      ] } },
      { p: 'Plan eight to fourteen shots for a minute. Most video generators hand back clips of a few seconds, and the usable part of each is shorter than that, so a shot of four to six seconds on screen is a good unit to plan in.' },
      { h: 'Worked example: “The Spare Key”' },
      { example: [
        ['Hook', 'Extreme close-up. A key taped under a doormat. A hand peels the tape back.'],
        ['Who and want', 'Nia, late, arms full of groceries, just wants to get inside. She stops. Her own key is already in her hand. This one isn’t hers.'],
        ['The wall', 'It opens her door anyway. Inside, a second toothbrush she doesn’t own. Her phone lights up: “Did you find it?” Unknown number.'],
        ['The turn', 'Across the hall, her neighbour’s door is open an inch. Someone inside is watching.'],
        ['The cut', 'Nia locks her door from the inside. Then she hears the key turn from the outside.'],
      ] },
      { p: 'One sentence, one location, two faces, a turn and an ending that asks a question. It passes all five questions in part 01, which is why it is worth generating.' },
    ],
  },
  {
    id: 'character-lock', n: '03', title: 'Character lock', guide: 'character-lock',
    summary: 'How to keep one face the same across every shot of an episode.',
    blocks: [
      { p: 'Faces drift between generations. The fix is not a longer prompt. It is deciding the character once, in words and in pictures, and then refusing to improvise.' },
      { h: 'The identity block' },
      { p: 'Fill this in once per character. Paste it into every prompt for that character, word for word, in the same order. Same words, same face.' },
      { template: `NAME:
AGE RANGE:
SKIN TONE:
FACE: (shape, jaw, brows, one detail people would notice)
HAIR: (style, length, colour)
EYES:
BUILD:
MARKS: (scar, freckles, tattoo, glasses)
WARDROBE, THIS EPISODE:
ONE PROP: ` },
      { example: [
        ['Filled in', 'Nia, late 20s, deep brown skin, oval face with high cheekbones and a small gap in her front teeth, shoulder-length box braids with copper ends, dark brown eyes, slim build, small gold hoop in left ear only, oversized olive bomber jacket over a grey hoodie, a ring of keys on a red lanyard.'],
      ] },
      { h: 'The rules' },
      { steps: [
        ['Reference sheet first.', 'Before any scene, generate the character on a plain background in the same light: front, three-quarter, profile and full body. Pick the best of each and keep them. They are the character now.'],
        ['Stills first, motion second.', 'Make each shot as a still from the reference, then animate the still. Image-to-video usually holds a face better than text-to-video.'],
        ['Lock the wardrobe.', 'One outfit per episode. A jacket that changes between shots is a continuity error unless the story asks for it.'],
        ['Regenerate, don’t patch.', 'If a face drifts, go back to the reference and generate again. Adding words to rescue a bad take usually makes the next one worse.'],
        ['Name the files.', 'CHAR_nia_front_v3.png, SH04_nia_door_take2.mp4. You will be glad at two in the morning.'],
        ['Two faces per scene.', 'Every extra character in a shot is another face that can drift. Keep crowds out of focus or out of frame.'],
      ] },
    ],
  },
  {
    id: 'prompts', n: '04', title: 'The shot prompt library',
    summary: 'One formula and 24 copy-ready shot prompts, sorted by the kind of shot.',
    blocks: [
      { h: 'The formula' },
      { template: '[SHOT SIZE] of [CHARACTER: identity block] [ACTION: one verb], [LOCATION], [TIME + LIGHT], [LENS], [CAMERA MOVE], [MOOD + GRADE]' },
      { p: 'An image prompt describes the frame. A video prompt describes what changes in it: the action and the camera move. When you animate a still, don’t describe the whole picture again. Say what moves.' },
      { p: 'Swap anything in {braces}. Keep the light and the grade the same for every shot in a scene.' },
    ],
    prompts: [
      { cat: 'Establishing and wide', items: [
        'Wide establishing shot of {location} at blue hour, streetlights just coming on, one lit window, 24mm lens, slow push in, quiet and tense, muted teal with sodium orange highlights',
        'Extreme wide shot, {character} small in frame crossing an empty {location}, overcast soft light, 35mm lens, locked-off camera, lonely, desaturated',
        'High angle wide shot of {location} from a rooftop, wet street reflecting neon signs, 28mm lens, slow crane down, noir mood, deep blacks',
      ] },
      { cat: 'Medium', items: [
        'Medium shot of {character} {action} at a kitchen counter, warm practical light from a pendant lamp, 50mm lens, static camera, intimate, soft film grain',
        'Medium two-shot, {character A} and {character B} facing each other across a small table, window light from the left, 40mm lens, slow dolly in, tense, natural colour',
        'Medium shot from behind, {character} stops in a narrow hallway and turns their head, hard top light, 35mm lens, handheld, uneasy',
      ] },
      { cat: 'Close-up', items: [
        'Close-up of {character} as they realise something, eyes shift left, cold light from a phone screen, 85mm lens, shallow depth of field, static, blue night grade',
        'Extreme close-up of a hand peeling tape off a key under a doormat, morning light, macro lens, slow push in, crisp detail',
        'Close-up, {character} exhales and looks down, rim light from a window behind them, 85mm lens, static, quiet, warm shadows',
      ] },
      { cat: 'Inserts and details', items: [
        'Insert shot of a phone on a dark table lighting up with a message from an unknown number, 50mm lens, static, the screen is the only light',
        'Insert, a door handle slowly turning from the other side, hallway light leaking under the door, 50mm lens, static, suspense',
        'Overhead insert of a coffee cup with lipstick on the rim beside a set of keys, soft morning light, 35mm lens, still life, warm',
      ] },
      { cat: 'POV and angles', items: [
        'POV shot climbing a dark stairwell, flashlight beam sweeping the walls, 24mm lens, handheld at breathing pace, horror',
        'Low angle shot of {character} standing in a doorway, backlit by hallway light, near silhouette, 24mm lens, static, power',
        'Over-the-shoulder shot from behind {character B} toward {character A} who is speaking, 50mm lens, focus on {character A}, static, conversation',
        'Dutch angle medium shot of {character} on the phone, neon sign flickering through the window, 35mm lens, slow orbit, paranoid',
      ] },
      { cat: 'Movement', items: [
        'Tracking shot alongside {character} walking fast down a sidewalk at night, shop light sliding across their face, 35mm lens, smooth track, urgent',
        'Slow dolly out from {character}\'s face to reveal they are alone in a large empty room, 35mm lens, cold overhead light, isolation',
        'Orbit shot around {character} sitting on the edge of a bed, morning light through blinds striping the room, 35mm lens, slow 90 degree arc, reflective',
        'Whip pan from {character A} to {character B} standing at the door, 24mm lens, handheld energy, surprise',
        'Rack focus from a framed photo in the foreground to {character} in the doorway behind it, 85mm lens, static, reveal',
      ] },
      { cat: 'Light and mood', items: [
        'Medium close-up of {character} in a car at night, streetlights sweeping across their face, 50mm lens, static from the passenger seat, thoughtful',
        'Silhouette of {character} at a window during a thunderstorm, lightning lighting the room in flashes, 35mm lens, static, dread',
        'Golden hour medium shot of {character} on a front stoop laughing with a friend, low sun flare, 50mm lens, handheld, warm and nostalgic',
      ] },
    ],
  },
  {
    id: 'camera-moves', n: '05', title: 'Camera moves', guide: 'camera-moves',
    summary: 'The words video models respond to, what each move does, and when to use it.',
    blocks: [
      { p: 'A camera move is a sentence about how the audience should feel. Pick one per shot and name its speed.' },
      { table: { head: ['Move', 'What the camera does', 'Use it for'], rows: [
        ['Static (locked-off)', 'Doesn’t move.', 'Dialogue, tension, letting a face do the work.'],
        ['Push in (dolly in)', 'Moves toward the subject.', 'Realisation, rising pressure.'],
        ['Pull out (dolly out)', 'Moves away from the subject.', 'Reveals, isolation, endings.'],
        ['Pan', 'Turns left or right on the spot.', 'Following action, showing what’s beside.'],
        ['Tilt', 'Turns up or down on the spot.', 'Height, power, a slow reveal of a person.'],
        ['Tracking (truck)', 'Travels alongside the subject.', 'Walking scenes, momentum.'],
        ['Orbit (arc)', 'Circles the subject.', 'Big moments, decisions, reflection.'],
        ['Crane (pedestal)', 'Rises or drops.', 'Opening or closing a scene.'],
        ['Handheld', 'Small human shake.', 'Panic, intimacy, a documentary feel.'],
        ['Whip pan', 'A fast pan that blurs.', 'Surprise, and transitions between shots.'],
        ['Rack focus', 'Focus shifts from one depth to another.', 'Reveals, connecting two things.'],
      ] } },
      { h: 'The rules' },
      { steps: [
        ['One move per shot.', 'Two moves in one prompt usually gets you neither, or a camera that wanders.'],
        ['Name the speed.', 'Slow, steady or fast. “Slow push in” and “fast push in” are different scenes.'],
        ['Lead with it if it’s ignored.', 'If the model keeps dropping the move, put the move at the start of the prompt and try again.'],
        ['Dolly is not zoom.', 'A zoom changes the lens. A dolly moves the camera, so the background shifts against the subject. Say “dolly” when you want depth to change.'],
        ['Static is a choice.', 'The strongest shot in a scene is often the one where nothing moves except the person.'],
      ] },
    ],
  },
  {
    id: 'light-grade', n: '06', title: 'Light and grade',
    summary: 'Light words, the mood each one carries, and the grade words that hold a scene together.',
    blocks: [
      { table: { head: ['Light', 'Reads as'], rows: [
        ['Soft window light', 'Calm, natural, honest.'],
        ['Hard top light', 'Interrogation, unease.'],
        ['Practical lamps', 'Warm, lived-in, late evening.'],
        ['Phone or screen glow', 'Isolation, late night, secrets.'],
        ['Rim or back light', 'Separation, drama, a person against the world.'],
        ['Blue hour', 'Quiet tension, something about to happen.'],
        ['Golden hour', 'Nostalgia, warmth, a memory.'],
        ['Sodium streetlight', 'City night with an orange cast.'],
        ['Neon spill', 'City, mixed colour, energy or danger.'],
        ['Overcast', 'Flat, plain, sad.'],
        ['Candle or firelight', 'Intimate, flickering, old.'],
        ['Silhouette', 'Mystery, power, a stranger.'],
      ] } },
      { p: 'Grade words: muted, desaturated, teal and orange, lifted blacks, crushed blacks, warm film grain, cold blue, high contrast, pastel, bleach bypass.' },
      { p: 'Pick one light and one grade per scene, and put the same words in every shot prompt of that scene. Matching light sells continuity more than matching details do.' },
    ],
  },
  {
    id: 'dialogue', n: '07', title: 'Dialogue and voice',
    summary: 'Writing lines that survive AI voice, lip-sync and a phone speaker.',
    blocks: [
      { steps: [
        ['One line per shot.', 'Short lines are easier to voice, easier to lip-sync and easier to follow on a phone.'],
        ['Write the subtext.', 'People rarely say what they mean. “Did you eat?” can mean “I’m worried about you.”'],
        ['Read it out loud.', 'If you run out of breath, the line is too long. Cut it.'],
        ['Direct the voice.', 'Give every line a tone, a pace and a volume: “quiet, tired, slow.”'],
        ['Leave silence.', 'A look after a line does more than a second line.'],
        ['Caption everything.', 'Plenty of people watch with the sound off. The story has to survive it.'],
      ] },
    ],
  },
  {
    id: 'edit', n: '08', title: 'The edit recipe',
    summary: 'How to cut generated clips so they play as one scene.',
    blocks: [
      { steps: [
        ['Assemble ugly.', 'Lay every shot in beat order first, untrimmed. Watch it once for story only.'],
        ['Trim to the moment.', 'Most generated clips have a short stretch in the middle where everything works. Cut the warm-up and the drift.'],
        ['Cut on movement.', 'A cut during a turn of the head or a door swinging hides the seam between two generations.'],
        ['J and L cuts.', 'Start the next shot’s sound before its picture (J), or let a shot’s sound run under the next picture (L). It is the cheapest way to make separate clips feel like one place.'],
        ['Four layers of sound.', 'Room tone, foley (footsteps, keys, doors), dialogue, then score. Room tone under everything removes the dead silence that makes AI video feel like AI.'],
        ['Captions that read.', 'Large, high contrast, two lines at most, in the middle of the frame. Keep text and faces away from the bottom and the right edge, where the app puts its buttons. Check it on your own phone before posting.'],
        ['Export for the phone.', 'Vertical 9:16 at 1080 × 1920.'],
        ['End early.', 'Cut before the audience is ready. That is what makes them watch it again.'],
      ] },
    ],
  },
  {
    id: 'hooks', n: '09', title: 'The hook bank',
    summary: '25 openings: ten for the dramas, fifteen for the posts about how you made them.',
    blocks: [
      { p: 'Replace {n} with your real number. Never round up.' },
    ],
    hooks: [
      { cat: 'Drama openings', items: [
        '“This key isn’t mine.”',
        'Close-up of a text arriving: “Don’t come home tonight.”',
        '“Everyone on this block has a secret. Mine has a lock on it.”',
        'A door opens before anyone knocks.',
        '“I only lied once. It was enough.”',
        'A framed photo. One face has been scratched out.',
        'Two people under one umbrella. Neither is talking.',
        '“Who’s at the door?” “Nobody’s at the door.”',
        'A wedding ring left on an empty bus seat.',
        '“You weren’t supposed to see this.”',
      ] },
      { cat: 'Behind the scenes', items: [
        'I made this scene with no camera. Here’s the shot list.',
        'The prompt that finally kept her face the same.',
        'This took {n} generations. Here are the ones I threw away.',
        'Stop writing longer prompts. Do this instead.',
        'The cheapest trick in AI film is sound.',
        'One camera move per shot. Watch what happens when I break that rule.',
        'How I kept one character the same across {n} shots.',
        'Before I spend a single credit, I ask five questions.',
        'Same prompt, two lenses: 24mm and 85mm.',
        'Why your AI video feels like AI: the silence.',
        'Steal my shot list.',
        'I wrote this whole scene as one sentence first.',
        'This is what a 60-second drama looks like on paper.',
        'Three edits that make separate clips feel like one scene.',
        'Rate this opening frame. Be honest.',
      ] },
    ],
  },
  {
    id: 'posting', n: '10', title: 'The posting system',
    summary: 'A weekly rhythm that turns one episode into a week of posts, and a four-week plan.',
    blocks: [
      { p: 'One episode a week is enough if every episode feeds the rest of the week. The episode is the show. Everything else is how you made it.' },
      { table: { head: ['Day', 'Post', 'Ask'], rows: [
        ['1', 'The episode, 30 to 60 seconds.', 'Nothing. Let it be a show.'],
        ['3', 'The breakdown reel: one technique from the episode.', 'One line: comment a keyword for the pack.'],
        ['5', 'A carousel: the shot list or the prompts, made to be saved.', 'One line: the workshop.'],
        ['Daily', 'Stories: the process, a poll on the ending, the misses.', 'Polls and replies, not links.'],
      ] } },
      { table: { head: ['Week', 'Episode', 'Breakdown', 'Carousel'], rows: [
        ['1', 'Episode one.', 'The five-question idea test.', 'The beat sheet, filled in.'],
        ['2', 'Episode two.', 'How the character stayed the same.', 'The identity block and reference sheet.'],
        ['3', 'Episode three.', 'One camera move, done three ways.', 'Six shot prompts from the episode.'],
        ['4', 'Episode four.', 'Sound: the four layers.', 'Everything you threw away this month.'],
      ] } },
      { p: 'Post the misses. Rejected generations are content, and they are the proof that you are actually making things.' },
    ],
  },
  {
    id: 'checklist', n: '11', title: 'Production checklist',
    summary: 'The whole process on one page. Tick it off per episode.',
    checklist: [
      { cat: 'Before you generate', items: [
        'The idea passes the five questions',
        'A one-sentence logline',
        'A beat sheet with timings',
        'An identity block and a reference sheet for every character',
        'A shot list with one prompt per shot',
        'One light and one grade chosen for each scene',
      ] },
      { cat: 'Generating', items: [
        'Stills first, from the reference sheet',
        'Every face checked against the reference before animating',
        'A few takes per shot at most, then rewrite the prompt',
        'Files named by shot number and take',
      ] },
      { cat: 'The edit', items: [
        'Assembled in beat order',
        'Every shot trimmed to its moment',
        'J and L cuts across the seams',
        'Room tone, foley, dialogue, score',
        'Captions checked on a phone',
      ] },
      { cat: 'Posting', items: [
        'The hook is in the first frame',
        'One line of context in the caption',
        'At most one ask',
        'The breakdown scheduled for two days later',
      ] },
    ],
  },
  {
    id: 'tools', n: '12', title: 'The tool map',
    summary: 'Pick tools by the job they do. Prompts move between tools; subscriptions don’t.',
    blocks: [
      { table: { head: ['Job', 'What to look for', 'Examples to test'], rows: [
        ['Character sheets and stills', 'Image references, consistent faces, control over framing.', 'Midjourney, Higgsfield, Flux-based tools'],
        ['Image to video', 'Holds a face from a still, follows camera moves.', 'Kling, Veo, Runway, Higgsfield'],
        ['Voice', 'Direction for tone and pace, a voice you can reuse.', 'ElevenLabs'],
        ['Music and score', 'Stems, or at least a clean ending.', 'Suno'],
        ['Edit and captions', 'J and L cuts, caption styling, 9:16 export.', 'CapCut, DaVinci Resolve'],
      ] } },
      { p: 'Tools, features and prices change every month, so treat the examples as a starting list, not a recommendation. Test any new tool on one shot from your current episode before you pay for a month of it.' },
    ],
  },
];

export const GUIDES = [
  { slug: '60-second-drama', parts: ['kill-it', 'beat-sheet'], title: 'How to write a 60-second drama', short: 'The 60-second drama',
    lede: 'Kill the weak ideas on paper, then build the strong one in five timed beats. With a worked example.' },
  { slug: 'character-lock', parts: ['character-lock'], title: 'How to keep an AI character’s face the same', short: 'Character lock',
    lede: 'The identity block and six rules that stop faces drifting between shots.' },
  { slug: 'camera-moves', parts: ['camera-moves'], title: 'Camera moves for AI video', short: 'Camera moves',
    lede: 'The eleven moves video models respond to, what each one does to a scene, and the rules for using them.' },
];

/** The prompts, numbered P01..P24 in reading order. */
export function numberedPrompts() {
  let i = 0;
  const part = PARTS.find((p) => p.prompts);
  return part.prompts.map((g) => ({ cat: g.cat, items: g.items.map((text) => ({ id: 'P' + String(++i).padStart(2, '0'), text })) }));
}
