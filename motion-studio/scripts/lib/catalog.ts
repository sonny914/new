// Component memory. The catalog is generated from the preset registry (so it cannot drift from
// the code), plus the project folders, render manifests and benchmark history on disk, plus the
// fixes learned while building productions. `npm run catalog` rewrites both files.
import {existsSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import type {z} from 'zod';
import {PRESETS} from '../../src/presets';
import {OUTPUT, PROJECTS, STUDIO} from './project';

/** Fixes found in real productions. Add one whenever a render teaches something. */
export const COMMON_FIXES = [
  {symptom: 'Elements survive a sweep and vanish later, when the accent lands somewhere else.', cause: 'Clear times use the closest approach over the whole path, including where it goes after the pass.', fix: 'Set `clear.window.to` (Accumulation) or `disassemble.window.to` (GridAssembly) to the end of the pass.', found: 'simplicity-is-a-viewpoint'},
  {symptom: 'Letters overlap mid-swap in a KineticHeadline state change.', cause: 'Outgoing and incoming glyphs moved on different curves.', fix: 'Fixed in the engine: changed letters roll as glued pairs (old exactly one slot above new) on one in-out curve.', found: 'simplicity-is-a-viewpoint'},
  {symptom: 'A rule sits on top of the next line as it rises.', cause: 'The rule retracted after the next text started.', fix: 'Retract structure at the moment the next beat begins, not after.', found: 'simplicity-is-a-viewpoint'},
  {symptom: 'The first half-second is black.', cause: 'Everything starts at frame 0 from zero.', fix: 'Pre-roll the opening layer with a negative time (e.g. `"at": "start-8"`) so frame 0 already shows it forming.', found: 'simplicity-is-a-viewpoint'},
  {symptom: 'QA lists a long still stretch under "holds" that was not designed.', cause: 'A beat finishes earlier than the next one starts.', fix: 'Start the next beat earlier or slow the current move; keep only holds you can name.', found: 'simplicity-is-a-viewpoint'},
  {symptom: 'WordStack lines stay visible after their exit.', cause: 'Exit distance was fixed, but the stack clip spans every line.', fix: 'Fixed in the preset: each line travels to the clip edge.', found: 'automate-the-coordination'},
  {symptom: 'Preview fails "dimensions" by one pixel.', cause: '4:2:0 video needs even sizes; a 0.5× preview of 1350 px is 675.', fix: 'Fixed in QA: scaled previews expect the even size.', found: 'automate-the-coordination'},
  {symptom: 'A final render reused a stale preview after code changed.', cause: 'Preview validity was keyed on the project file only.', fix: 'Fixed: previews are keyed on project hash + engine hash.', found: 'automate-the-coordination'},
  {symptom: '"Circular references" between a path and a layer.', cause: 'A path pins to a layer that also samples that path at layout.', fix: 'Sample at render time: declare the param under `refs.renderPaths` in the preset.', found: 'simplicity-is-a-viewpoint'},
  {symptom: 'A time like "intro-a+4" fails or picks the wrong scene.', cause: 'Scene ids may contain hyphens, which look like minus signs.', fix: 'Fixed: the parser splits at the point where the left side is a known scene.', found: 'engine'},
];

export const LIMITATIONS = [
  'Text layers are single-line; set multi-line copy as several layers sharing a style with "like".',
  'Text measurement uses the browser at render; Node-side validation uses approximate metrics, so anchor positions in the storyboard are estimates.',
  'The synthesised sound bed is a placeholder: a few procedural voices, not music. Use an audio track with `src` for real music or voice.',
  'Voice mode cuts at measured pauses only; there are no word-level timestamps.',
  'Reference analysis measures cuts, motion and audio; it cannot identify typefaces or easing curves.',
  'Three.js is not installed: there is no real 3D. Depth is simulated with group cameras and per-layer parallax.',
  'Rendering is CPU-only by design (SwiftShader); roughly 6 fps for a busy 1080×1920 master on 4 cores.',
  'Remotion is free for individuals and companies of up to three people; larger teams need a Remotion company licence.',
];

interface ParamInfo {
  key: string;
  type: string;
  default?: string;
  optional: boolean;
}

function unwrap(s: z.ZodTypeAny): z.ZodTypeAny {
  let cur = s;
  for (let i = 0; i < 6; i++) {
    const d = cur._def as {typeName?: string; schema?: z.ZodTypeAny; innerType?: z.ZodTypeAny};
    if (d.typeName === 'ZodEffects' && d.schema) cur = d.schema;
    else break;
  }
  return cur;
}

function typeName(s: z.ZodTypeAny): string {
  const d = s._def as {typeName: string; innerType?: z.ZodTypeAny; values?: string[]; options?: z.ZodTypeAny[]; type?: z.ZodTypeAny};
  switch (d.typeName) {
    case 'ZodDefault':
    case 'ZodOptional':
      return typeName(d.innerType!);
    case 'ZodEnum':
      return d.values!.map((v) => `"${v}"`).join(' \\| ');
    case 'ZodUnion':
      return d.options!.map(typeName).join(' \\| ');
    case 'ZodArray':
      return `${typeName(d.type!)}[]`;
    case 'ZodObject':
      return 'object';
    default:
      return d.typeName.replace('Zod', '').toLowerCase();
  }
}

export function params(schema: z.ZodTypeAny): ParamInfo[] {
  const obj = unwrap(schema) as z.ZodObject<z.ZodRawShape>;
  const shape = (obj._def as {shape?: () => z.ZodRawShape}).shape?.() ?? {};
  return Object.entries(shape).map(([key, s]) => {
    const d = (s as z.ZodTypeAny)._def as {typeName: string; defaultValue?: () => unknown};
    return {
      key,
      type: typeName(s as z.ZodTypeAny),
      default: d.typeName === 'ZodDefault' ? JSON.stringify(d.defaultValue!()) : undefined,
      optional: d.typeName === 'ZodOptional' || d.typeName === 'ZodDefault',
    };
  });
}

function projects() {
  if (!existsSync(PROJECTS)) return [];
  return readdirSync(PROJECTS)
    .filter((d) => existsSync(path.join(PROJECTS, d, 'project.json')))
    .map((d) => {
      const raw = JSON.parse(readFileSync(path.join(PROJECTS, d, 'project.json'), 'utf8'));
      const manifest = path.join(OUTPUT, d, 'manifest.json');
      const m = existsSync(manifest) ? JSON.parse(readFileSync(manifest, 'utf8')) : null;
      return {
        id: d,
        title: raw.title,
        format: raw.format ?? 'story',
        duration: raw.duration,
        presets: [...new Set((raw.layers ?? []).map((l: {preset: string}) => l.preset))],
        lastRender: m ? {date: m.rendered, bytes: m.files.delivery.bytes, checks: m.checks.filter((c: {ok: boolean}) => !c.ok).length === 0 ? 'all passed' : 'see report'} : null,
      };
    });
}

export function writeCatalog() {
  const benchFile = path.join(STUDIO, 'docs', 'benchmarks.json');
  const benchmarks = existsSync(benchFile) ? JSON.parse(readFileSync(benchFile, 'utf8')) : [];
  const presets = Object.values(PRESETS).map((p) => ({
    id: p.id,
    category: p.category,
    summary: p.summary,
    covers: p.doc.covers,
    anchors: p.anchors ?? [],
    params: params(p.schema),
    doc: p.doc,
    example: p.example,
  }));
  const comps = projects();
  const catalog = {generated: new Date().toISOString(), presets, projects: comps, benchmarks, commonFixes: COMMON_FIXES, limitations: LIMITATIONS};
  writeFileSync(path.join(STUDIO, 'docs', 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');

  const md: string[] = [
    '# Preset catalog',
    '',
    'Generated by `npm run catalog` from the preset registry (`src/presets`), the project folders and the benchmark log. Do not edit by hand.',
    '',
    '## Index',
    '',
    '| Preset | Category | Covers | Use it for |',
    '|---|---|---|---|',
    ...presets.map((p) => `| [${p.id}](#${p.id.toLowerCase()}) | ${p.category} | ${p.covers.join(', ')} | ${p.doc.supports.join(', ')} |`),
    '',
    'Engine-level behaviours (any layer, no preset needed): group **camera** (CameraPush / CameraPull / pan, keyed), per-layer **depth** (ParallaxShift), group **time freeze** (everything stops), layer **reveal / conceal** masks (`circle` = ShapeReveal / CircleExpansion / FocusTransition, `wipe` = MaskTransition).',
    '',
  ];
  for (const p of presets) {
    md.push(
      `## ${p.id}`,
      '',
      `_${p.category}_ — ${p.summary}`,
      '',
      `**Effect.** ${p.doc.effect}`,
      '',
      `**Timing.** ${p.doc.timing}`,
      '',
      `**Easing.** ${p.doc.easing}`,
      '',
      `**Performance.** ${p.doc.performance}`,
      '',
      ...(p.anchors.length ? [`**Anchors.** ${p.anchors.map((a) => `\`@<id>.${a}\``).join(', ')}`, ''] : []),
      '| Param | Type | Default |',
      '|---|---|---|',
      ...p.params.map((x) => `| \`${x.key}\` | ${x.type} | ${x.default !== undefined ? `\`${x.default.replace(/\|/g, '\\|')}\`` : x.optional ? '_optional_' : '**required**'} |`),
      '',
      `**Example** (${p.example.note}):`,
      '',
      '```json',
      JSON.stringify({preset: p.id, params: p.example.params}, null, 2),
      '```',
      '',
      `Preview: composition \`example-${p.id.replace(/[A-Z]/g, (c, i) => (i ? '-' : '') + c.toLowerCase())}\` in \`npm run studio\`, or \`npm run gallery\`.`,
      '',
      ...(p.doc.limitations.length ? ['**Limitations.**', '', ...p.doc.limitations.map((l) => `- ${l}`), ''] : []),
    );
  }
  md.push(
    '## Tested configurations',
    '',
    '| Project | Format | Duration | Presets | Last render |',
    '|---|---|---|---|---|',
    ...comps.map((c) => `| ${c.id} | ${typeof c.format === 'string' ? c.format : `${c.format.width}×${c.format.height}`} | ${c.duration} | ${c.presets.join(', ')} | ${c.lastRender ? `${c.lastRender.date.slice(0, 10)}, ${(c.lastRender.bytes / 1e6).toFixed(2)} MB, ${c.lastRender.checks}` : 'not rendered here'} |`),
    '',
    '## Rendering benchmarks',
    '',
    '| Project | Date | Frames | Size | Layers | Preview fps | Master fps | Master s | Encode s | Peak MB | Delivery MB | CPUs |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...benchmarks.map((b: Record<string, number | string>) => `| ${b.project} | ${String(b.date).slice(0, 10)} | ${b.frames} | ${b.width}×${b.height} | ${b.layers} | ${b.previewFps} | ${b.masterFps} | ${b.masterSeconds} | ${b.encodeSeconds} | ${b.peakMemMB} | ${b.deliveryMB} | ${b.cpus} |`),
    '',
    '_Peak MB is system-wide memory in use during the master render, minus the baseline (includes Chromium). CPU only; no GPU._',
    '',
    '## Common fixes',
    '',
    '| Symptom | Cause | Fix | Found in |',
    '|---|---|---|---|',
    ...COMMON_FIXES.map((f) => `| ${f.symptom} | ${f.cause} | ${f.fix} | ${f.found} |`),
    '',
    '## Known limitations',
    '',
    ...LIMITATIONS.map((l) => `- ${l}`),
    '',
  );
  writeFileSync(path.join(STUDIO, 'docs', 'PRESET_CATALOG.md'), md.join('\n'));
  return {presets: presets.length, projects: comps.length, benchmarks: benchmarks.length};
}
