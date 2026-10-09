// Motion Studio command line. `npm run <command> -- <project> [options]`; see README.md.
import {mkdirSync, readdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {writeCatalog} from './lib/catalog';
import {contactSheet} from './lib/contact';
import {fromIdea, fromScript, fromVoice, readText, writeDraft} from './lib/modes';
import {locate, OUTPUT, PROJECTS, report, validate, type LoadedProject} from './lib/project';
import {analyse} from './lib/reference';
import {runPreview, runRender, runVerify} from './lib/pipeline';
import {makeBundle, stills, video} from './lib/render';
import {PRESETS} from '../src/presets';
import {exampleProject} from '../src/presets/examples';
import {copyFileSync} from 'node:fs';
import {writeSounds} from './lib/sound';
import {writeStoryboard} from './lib/storyboard';

type Args = {_: string[]; flags: Record<string, string | boolean>};

function parse(argv: string[]): Args {
  const out: Args = {_: [], flags: {}};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      if (v !== undefined) out.flags[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) out.flags[k] = argv[++i];
      else out.flags[k] = true;
    } else out._.push(a);
  }
  return out;
}

export function mustValidate(p: LoadedProject) {
  const v = validate(p);
  report(v, path.relative(process.cwd(), p.file));
  if (!v.ok || !v.prepared) process.exit(1);
  return v.prepared;
}

const commands: Record<string, (a: Args) => Promise<void>> = {
  async preview(a) {
    const state = await runPreview(locate(a._[0]));
    if (!state.ok) process.exit(1);
  },

  async render(a) {
    const {delivery} = await runRender(locate(a._[0]), {force: Boolean(a.flags.force)});
    console.log(`done: ${path.relative(process.cwd(), delivery)}`);
  },

  async verify(a) {
    runVerify(locate(a._[0]));
  },

  async validate(a) {
    const targets = a._.length ? a._ : (await import('./lib/project')).listProjects();
    let bad = 0;
    for (const t of targets) {
      const v = validate(locate(t));
      report(v, t);
      if (!v.ok) bad++;
    }
    if (bad) process.exit(1);
  },

  async storyboard(a) {
    const p = locate(a._[0]);
    const prep = mustValidate(p);
    const sb = writeStoryboard(prep, p.dir);
    mkdirSync(p.outDir, {recursive: true});
    writeFileSync(path.join(p.outDir, 'storyboard.json'), JSON.stringify(sb, null, 2));
    console.log(`storyboard: ${path.relative(process.cwd(), path.join(p.dir, 'storyboard.md'))}`);
    for (const r of sb.reading.filter((x) => !x.ok)) console.log(`! reading: "${r.text}" rests ${r.seconds}s, needs ${r.needed}s`);
  },

  async sound(a) {
    const p = locate(a._[0]);
    const prep = mustValidate(p);
    for (const s of writeSounds(p, prep)) console.log(`sound: ${path.relative(process.cwd(), s.file)} (${s.cues} cues, peak ${(20 * Math.log10(s.peak || 1e-9)).toFixed(1)} dBFS)`);
  },

  async still(a) {
    const p = locate(a._[0]);
    const prep = mustValidate(p);
    const frames = String(a.flags.frames ?? a._.slice(1).join(','))
      .split(',')
      .filter(Boolean)
      .map((f) => (f === 'last' ? prep.duration - 1 : Number(f)));
    if (!frames.length) throw new Error('Give frames: --frames 0,45,90 (or "last").');
    writeSounds(p, prep);
    const b = await makeBundle(p);
    const scale = a.flags.scale ? Number(a.flags.scale) : 1;
    const out = await stills(p, b, frames, path.join(p.outDir, 'stills'), scale);
    out.forEach((f) => console.log(`still: ${path.relative(process.cwd(), f)}`));
  },
};

function draftReport(file: string) {
  const p = locate(path.dirname(file));
  const v = validate(p);
  report(v, path.relative(process.cwd(), file));
  if (v.ok && v.prepared) writeStoryboard(v.prepared, p.dir);
  console.log(`next: edit ${path.relative(process.cwd(), file)}, then npm run preview -- ${p.raw.id}`);
}

const draftOpts = (a: Args) => ({
  id: String(a.flags.id ?? a._[1] ?? ''),
  title: a.flags.title as string | undefined,
  format: a.flags.format as string | undefined,
  theme: a.flags.theme as string | undefined,
  brand: a.flags['no-brand'] ? false : undefined,
});

Object.assign(commands, {
  /** new <id> [--from <project>] [--format story|portrait|square|landscape] [--idea "topic"] */
  async new(a: Args) {
    const id = a._[0];
    if (!id) throw new Error('Usage: npm run new -- <id> [--from <project>] [--format portrait] [--idea "topic"] [--title "..."]');
    let file: string;
    if (a.flags.from) {
      const src = locate(String(a.flags.from));
      const raw: Record<string, unknown> = {...src.raw, id, title: (a.flags.title as string) ?? `${src.raw.title} (copy)`};
      if (a.flags.format) raw.format = a.flags.format;
      file = writeDraft(raw as never);
      for (const sub of ['assets']) {
        const from = path.join(src.dir, sub);
        try {
          for (const f of readdirSync(from)) if (f !== 'generated') copyFileSync(path.join(from, f), path.join(path.dirname(file), sub, f));
        } catch {
          // No assets to copy.
        }
      }
    } else if (a.flags.idea) file = writeDraft(fromIdea(String(a.flags.idea), {...draftOpts(a), id}));
    else file = writeDraft(fromScript('YOUR LINE\nA SUPPORTING LINE\n\nTHE PAYOFF', {...draftOpts(a), id, title: (a.flags.title as string) ?? id}));
    draftReport(file);
  },

  /** from-script <script.txt> --id <id> [--format ...] [--no-brand] */
  async 'from-script'(a: Args) {
    const file = writeDraft(fromScript(readText(a._[0]), draftOpts(a)));
    draftReport(file);
  },

  /** voice <audio> --id <id> [--script lines.txt] [--format ...] */
  async voice(a: Args) {
    const script = a.flags.script ? readText(String(a.flags.script)) : undefined;
    const {config, timing, asset} = fromVoice(a._[0], script, draftOpts(a));
    const file = writeDraft(config);
    mkdirSync(path.join(path.dirname(file), 'assets'), {recursive: true});
    copyFileSync(asset.from, path.join(path.dirname(file), asset.to));
    writeFileSync(path.join(path.dirname(file), 'timing.json'), JSON.stringify(timing, null, 2) + '\n');
    draftReport(file);
  },

  /** reference <video> [--out dir] [--threshold 12] */
  async reference(a: Args) {
    const video = a._[0];
    if (!video) throw new Error('Usage: npm run reference -- <video> [--out dir]');
    const out = String(a.flags.out ?? path.join(OUTPUT, 'reference', path.basename(video).replace(/\.[^.]+$/, '')));
    const r = analyse(video, out, {cutThreshold: a.flags.threshold ? Number(a.flags.threshold) : undefined});
    console.log(`reference: ${r.cuts.length} cut(s), ${r.holds.length} hold(s), ${r.bursts.length} burst(s) → ${path.relative(process.cwd(), path.join(out, 'reference.md'))}`);
  },

  async catalog() {
    const r = writeCatalog();
    console.log(`catalog: ${r.presets} presets, ${r.projects} projects, ${r.benchmarks} benchmark rows → docs/PRESET_CATALOG.md, docs/catalog.json`);
  },

  /** gallery: render every preset's example and tile them into one sheet. */
  async gallery(a: Args) {
    const out = path.join(OUTPUT, 'gallery');
    mkdirSync(out, {recursive: true});
    const only = a._.length ? a._ : Object.keys(PRESETS);
    const fake = (config: ReturnType<typeof exampleProject>): LoadedProject => ({dir: PROJECTS, folder: '.', publicDir: PROJECTS, file: '', raw: config as never, hash: '', outDir: out});
    const b = await makeBundle(fake(exampleProject(PRESETS[only[0]])));
    for (const id of only) {
      const config = exampleProject(PRESETS[id]);
      const file = path.join(out, `${config.id}.mp4`);
      await video(fake(config), b, {file, scale: 0.5, crf: 23, quality: 'preview'});
      const total = Math.round(Number(String(config.duration).replace('s', '')) * 30);
      contactSheet(file, path.join(out, `${config.id}.png`), 30, {frames: [0.15, 0.35, 0.55, 0.75, 0.97].map((k) => Math.round(k * (total - 1))), cols: 5, tile: 216});
      console.log(`gallery: ${id} → ${path.relative(process.cwd(), file)}`);
    }
  },
});

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const run = cmd ? commands[cmd] : undefined;
  if (!run) {
    console.log(`Commands: ${Object.keys(commands).join(', ')}`);
    process.exit(cmd ? 1 : 0);
  }
  await run(parse(rest));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
