// Find, read and validate a project from the command line.
import {createHash} from 'node:crypto';
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {formatIssues, prepareProject} from '../../src/engine/config/prepare';
import {approximateMeasure, layoutProject} from '../../src/engine/layout';
import type {Issue, Prepared} from '../../src/engine/types';
import {PRESETS} from '../../src/presets';

export const STUDIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const PROJECTS = path.join(STUDIO, 'projects');
export const OUTPUT = path.join(STUDIO, 'output');

export interface LoadedProject {
  dir: string;
  /** Folder name: assets resolve as staticFile(`${folder}/${rel}`) with publicDir = parent of dir. */
  folder: string;
  publicDir: string;
  file: string;
  raw: Record<string, unknown>;
  hash: string;
  outDir: string;
}

/** Accepts a project id (projects/<id>), a folder, or a path to project.json. */
export function locate(arg: string | undefined): LoadedProject {
  if (!arg) throw new Error('Name a project: an id under projects/, a folder, or a project.json path.');
  let file = arg;
  if (existsSync(path.join(PROJECTS, arg, 'project.json'))) file = path.join(PROJECTS, arg, 'project.json');
  else if (existsSync(path.join(arg, 'project.json'))) file = path.join(arg, 'project.json');
  file = path.resolve(file);
  if (!existsSync(file)) throw new Error(`No project at "${arg}". Projects: ${listProjects().join(', ') || '(none)'}.`);
  const text = readFileSync(file, 'utf8');
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new Error(`${path.relative(process.cwd(), file)} is not valid JSON: ${(e as Error).message}`);
  }
  const dir = path.dirname(file);
  const id = typeof raw.id === 'string' ? raw.id : path.basename(dir);
  return {
    dir,
    folder: path.basename(dir),
    publicDir: path.dirname(dir),
    file,
    raw,
    hash: createHash('sha256').update(text).digest('hex').slice(0, 16),
    outDir: path.join(OUTPUT, id),
  };
}

/**
 * Hash of the engine source (src/, scripts/, lockfile). A preview only vouches for a final render
 * made with the same project file and the same engine code.
 */
export function engineHash(): string {
  const h = createHash('sha256');
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const f = path.join(dir, name);
      if (statSync(f).isDirectory()) walk(f);
      else if (/\.(ts|tsx|json)$/.test(name)) h.update(name).update(readFileSync(f));
    }
  };
  walk(path.join(STUDIO, 'src'));
  walk(path.join(STUDIO, 'scripts'));
  const lock = path.join(STUDIO, 'package-lock.json');
  if (existsSync(lock)) h.update(readFileSync(lock));
  return h.digest('hex').slice(0, 16);
}

export function listProjects(): string[] {
  if (!existsSync(PROJECTS)) return [];
  return readdirSync(PROJECTS).filter((d) => existsSync(path.join(PROJECTS, d, 'project.json')));
}

export interface Validation {
  prepared?: Prepared;
  issues: Issue[];
  ok: boolean;
}

/**
 * Schema + references + assets, then a layout pass with approximate metrics so anchor and path
 * references fail here rather than in the browser. Real glyph metrics are only known at render.
 */
export function validate(p: LoadedProject): Validation {
  const r = prepareProject(p.raw, {
    presets: PRESETS,
    fileExists: (rel) => existsSync(path.join(p.dir, rel)),
  });
  const issues = [...r.issues];
  if (!('format' in r)) return {issues, ok: false};
  const prepared = r as Prepared;
  if (!issues.some((i) => i.level === 'error')) {
    const lay = layoutProject(prepared, PRESETS, approximateMeasure);
    issues.push(...lay.issues);
  }
  return {prepared, issues, ok: !issues.some((i) => i.level === 'error')};
}

export function report(v: Validation, label: string) {
  const errors = v.issues.filter((i) => i.level === 'error').length;
  const warnings = v.issues.length - errors;
  console.log(`${v.ok ? '✓' : '✗'} ${label}: ${errors} error(s), ${warnings} warning(s)`);
  if (v.issues.length) console.log(formatIssues(v.issues));
}
