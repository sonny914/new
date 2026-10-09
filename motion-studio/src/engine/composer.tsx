// Scene composer: turns a prepared project + layout into frames. Each layer mounts for its
// [from, to) window inside its group chain (camera, time remap) and optional shape masks.
// Presets receive the absolute frame and their group-remapped frame; nothing else is global.
import React, {useLayoutEffect, useMemo, useRef, useState} from 'react';
import {AbsoluteFill, cancelRender, continueRender, delayRender, Html5Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {PRESETS} from '../presets';
import {color} from '../themes';
import {formatIssues, prepareProject} from './config/prepare';
import type {Mask, ProjectInput} from './config/schema';
import {ease, progress} from './easing';
import {loadThemeFonts} from './fonts';
import {sampleTrack, samplePath} from './keyframes';
import {layoutProject, type LayoutMap} from './layout';
import {browserMeasure} from './measure.browser';
import {resolvePos} from './position';
import {remap} from './remap';
import {resolveTime} from './time';
import type {Prepared, ResolvedLayer, Runtime} from './types';

export interface ProjectProps extends Record<string, unknown> {
  config: ProjectInput;
  /** Folder (under the public dir) that project-relative asset paths resolve against. */
  assetBase: string;
  qa?: {frames: number[]};
}


function groupChain(prep: Prepared, id?: string): string[] {
  const chain: string[] = [];
  let cur = id;
  while (cur && !chain.includes(cur)) {
    chain.unshift(cur);
    cur = prep.groups[cur]?.parent;
  }
  return chain;
}

const ErrorCard: React.FC<{text: string}> = ({text}) => (
  <AbsoluteFill style={{background: '#1a0000', color: '#ffb4a8', padding: 60, fontFamily: 'monospace', fontSize: 26, whiteSpace: 'pre-wrap'}}>
    {`This project does not validate:\n\n${text}`}
  </AbsoluteFill>
);

export const ProjectVideo: React.FC<ProjectProps> = ({config, assetBase, qa}) => {
  const prepared = useMemo(() => prepareProject(config, {presets: PRESETS}), [config]);
  const errors = prepared.issues.filter((i) => i.level === 'error');
  if (!('format' in prepared) || errors.length) return <ErrorCard text={formatIssues(prepared.issues)} />;
  return <Loaded prep={prepared as Prepared} assetBase={assetBase} qa={qa} />;
};

const Loaded: React.FC<{prep: Prepared; assetBase: string; qa?: {frames: number[]}}> = ({prep, assetBase, qa}) => {
  const [handle] = useState(() => delayRender('Loading fonts and laying out type'));
  const [layout, setLayout] = useState<LayoutMap | null>(null);
  useLayoutEffect(() => {
    let live = true;
    loadThemeFonts(prep.theme)
      .then(() => {
        if (!live) return;
        setLayout(layoutProject(prep, PRESETS, browserMeasure));
        continueRender(handle);
      })
      .catch((e) => cancelRender(e));
    return () => {
      live = false;
    };
  }, [prep, handle]);

  const ordered = useMemo(() => prep.layers.map((l, i) => ({l, i})).sort((a, b) => a.l.z - b.l.z || a.i - b.i).map((x) => x.l), [prep]);
  const rootRef = useRef<HTMLDivElement>(null);
  if (!layout) return null;
  if (layout.issues.some((i) => i.level === 'error')) return <ErrorCard text={formatIssues(layout.issues)} />;

  return (
    <AbsoluteFill ref={rootRef} style={{background: color(prep.theme, prep.project.background), overflow: 'hidden'}}>
      {ordered.map((layer) => (
        <Sequence key={layer.id} name={layer.id} from={layer.from} durationInFrames={Math.max(1, layer.to - layer.from)} layout="none">
          <LayerHost prep={prep} layer={layer} layout={layout} />
        </Sequence>
      ))}
      <AudioTracks prep={prep} assetBase={assetBase} />
      {qa ? <QaProbe prep={prep} frames={qa.frames} rootRef={rootRef} /> : null}
    </AbsoluteFill>
  );
};

function maskStyle(prep: Prepared, layout: LayoutMap, m: Mask | undefined, frame: number, reveal: boolean): string | undefined {
  if (!m) return undefined;
  const at = resolveTime(m.at, prep.time);
  const p = progress(frame, at, m.duration, ease(prep.theme, m.ease, reveal ? 'out' : 'in'));
  const shown = reveal ? p : 1 - p;
  if (shown >= 1) return undefined;
  const {width: W, height: H} = prep.format;
  if (m.shape === 'circle') {
    let cx = W / 2;
    let cy = H / 2;
    if (typeof m.origin === 'string') ({x: cx, y: cy} = samplePath(prep.theme, layout.paths[m.origin].keys, at));
    else if (m.origin) {
      const ctx = {format: prep.format, anchors: layout.anchors};
      cx = resolvePos(m.origin.x, 'x', ctx);
      cy = resolvePos(m.origin.y, 'y', ctx);
    }
    const R = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));
    return `circle(${(R * shown).toFixed(2)}px at ${cx.toFixed(2)}px ${cy.toFixed(2)}px)`;
  }
  // Wipe: the visible region grows (reveal) or shrinks (conceal) along the direction of travel.
  const hide = `${((1 - shown) * 100).toFixed(3)}%`;
  const dir = m.direction;
  if (reveal) {
    if (dir === 'right') return `inset(0 ${hide} 0 0)`;
    if (dir === 'left') return `inset(0 0 0 ${hide})`;
    if (dir === 'down') return `inset(0 0 ${hide} 0)`;
    return `inset(${hide} 0 0 0)`;
  }
  if (dir === 'right') return `inset(0 0 0 ${hide})`;
  if (dir === 'left') return `inset(0 ${hide} 0 0)`;
  if (dir === 'down') return `inset(${hide} 0 0 0)`;
  return `inset(0 0 ${hide} 0)`;
}

const LayerHost: React.FC<{prep: Prepared; layer: ResolvedLayer; layout: LayoutMap}> = ({prep, layer, layout}) => {
  const absolute = useCurrentFrame() + layer.from;
  const def = PRESETS[layer.preset];
  const chain = groupChain(prep, layer.group);
  let frame = absolute;
  for (const g of chain) frame = remap(frame, prep.groups[g].time);

  const rt: Runtime = {
    frame,
    absolute,
    fps: prep.fps,
    theme: prep.theme,
    format: prep.format,
    layer,
    layout: layout.data[layer.id],
    t: (e) => resolveTime(e, prep.time),
    path: (id) => layout.paths[id],
    qa: (kind, rest) => ({'data-qa': kind, 'data-qa-layer': layer.id, 'data-qa-rest': rest ? '1' : '0'}),
  };
  const Component = def.component;
  let node: React.ReactNode = <Component params={layer.params as never} rt={rt} />;

  const clipReveal = maskStyle(prep, layout, layer.reveal, absolute, true);
  const clipConceal = maskStyle(prep, layout, layer.conceal, absolute, false);
  if (clipReveal) node = <AbsoluteFill style={{clipPath: clipReveal}}>{node}</AbsoluteFill>;
  if (clipConceal) node = <AbsoluteFill style={{clipPath: clipConceal}}>{node}</AbsoluteFill>;

  // Wrap from the innermost group outwards so the outermost camera applies last.
  for (let i = chain.length - 1; i >= 0; i--) {
    const g = prep.groups[chain[i]];
    if (!g.camera?.length) continue;
    const cam = sampleTrack(
      prep.theme,
      g.camera.map((k) => ({frame: k.frame, value: {scale: k.scale, x: k.x, y: k.y, rotate: k.rotate}, ease: k.ease})),
      absolute,
    );
    const d = layer.depth;
    const ctx = {format: prep.format, anchors: layout.anchors};
    const ox = g.origin ? resolvePos(g.origin.x, 'x', ctx) : prep.format.width / 2;
    const oy = g.origin ? resolvePos(g.origin.y, 'y', ctx) : prep.format.height / 2;
    const s = 1 + (cam.scale - 1) * d;
    node = (
      <AbsoluteFill
        style={{
          transformOrigin: `${ox}px ${oy}px`,
          transform: `translate(${(cam.x * d).toFixed(3)}px, ${(cam.y * d).toFixed(3)}px) rotate(${cam.rotate * d}deg) scale(${s.toFixed(5)})`,
        }}
      >
        {node}
      </AbsoluteFill>
    );
  }
  return <>{node}</>;
};

const AudioTracks: React.FC<{prep: Prepared; assetBase: string}> = ({prep, assetBase}) => (
  <>
    {prep.project.audio.tracks.map((tr) => {
      const from = resolveTime(tr.from, prep.time);
      const to = Math.min(resolveTime(tr.to, prep.time), prep.duration);
      const len = Math.max(1, to - from);
      const file = tr.src ?? `assets/generated/${tr.synth}.wav`;
      const fi = Math.round(tr.fadeIn * prep.fps);
      const fo = Math.round(tr.fadeOut * prep.fps);
      return (
        <Sequence key={tr.id} name={`audio:${tr.id}`} from={from} durationInFrames={len} layout="none">
          <Html5Audio
            src={staticFile(`${assetBase}/${file}`)}
            trimBefore={Math.round(tr.trimBefore * prep.fps)}
            volume={(f) => tr.volume * Math.min(fi ? Math.min(1, f / fi) : 1, fo ? Math.min(1, (len - f) / fo) : 1)}
          />
        </Sequence>
      );
    })}
  </>
);

/** Reports the bounds of every element at rest on the requested frames, for the QA report. */
const QaProbe: React.FC<{prep: Prepared; frames: number[]; rootRef: React.RefObject<HTMLDivElement | null>}> = ({prep, frames, rootRef}) => {
  const frame = useCurrentFrame();
  useLayoutEffect(() => {
    if (!frames.includes(frame) || !rootRef.current) return;
    const root = rootRef.current.getBoundingClientRect();
    const k = prep.format.width / root.width;
    const items = [...rootRef.current.querySelectorAll<HTMLElement | SVGElement>('[data-qa]')]
      .filter((el) => el.getAttribute('data-qa-rest') === '1')
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          layer: el.getAttribute('data-qa-layer'),
          kind: el.getAttribute('data-qa'),
          x: (r.left - root.left) * k,
          y: (r.top - root.top) * k,
          w: r.width * k,
          h: r.height * k,
        };
      })
      .filter((b) => b.w > 0 && b.h > 0);
    console.log(`[qa] ${JSON.stringify({frame, items})}`);
  }, [frame, frames, prep, rootRef]);
  return null;
};
