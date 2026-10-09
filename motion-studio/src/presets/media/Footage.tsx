import React from 'react';
import {OffthreadVideo, staticFile} from 'remotion';
import {z} from 'zod';
import {EaseZ, PosExprZ, TimeExprZ} from '../../engine/config/schema';
import {sampleTrack} from '../../engine/keyframes';
import type {PresetDef} from '../../engine/types';
import {color} from '../../themes';

const schema = z
  .object({
    /** Video file inside the project folder. */
    src: z.string(),
    x: PosExprZ.default(0),
    y: PosExprZ.default(0),
    width: z.number().positive().default(1080),
    height: z.number().positive().default(1920),
    /** Source time (s) that plays at the video's absolute frame 0, so picture stays locked to a separate voice track. */
    offset: z.number().default(0),
    /** Restrained correction, CSS filter terms. */
    grade: z.object({brightness: z.number().default(1), contrast: z.number().default(1), saturate: z.number().default(1)}).strict().default({}),
    /** Fade the bottom of the plate into the ground, as fractions of its height (e.g. from 0.7 to 1). */
    fadeBottom: z.object({from: z.number().min(0).max(1), to: z.number().min(0).max(1)}).strict().optional(),
    /** Punch-ins and reframes: scale about the plate's centre plus an offset in px. */
    keys: z.array(z.object({at: TimeExprZ, scale: z.number().positive().default(1), x: z.number().default(0), y: z.number().default(0), ease: EaseZ.optional()}).strict()).default([]),
    volume: z.number().min(0).max(2).default(0),
  })
  .strict();

type Data = {x: number; y: number; ground: string; keys: {frame: number; value: {scale: number; x: number; y: number}; ease?: z.output<typeof EaseZ>}[]};

export const Footage: PresetDef<typeof schema, Data> = {
  id: 'Footage',
  category: 'media',
  summary: 'A live-action plate (talking head, B-roll) placed, graded, reframed and kept in sync with the absolute timeline.',
  doc: {
    effect: 'The person stays the anchor: footage sits in a defined plate, can punch in on emphasis, and can dissolve into the black ground so type and captions share the frame with it.',
    timing: 'Source time = absolute time + offset, whatever window the layer is mounted in, so cuts away and back never drift from the voice.',
    easing: 'Punch-in keys ease in-out by default.',
    supports: ['talking heads', 'B-roll plates', 'screen recordings'],
    performance: 'OffthreadVideo extracts exact frames; cost scales with source resolution. Pre-scale large sources.',
    covers: ['Footage', 'CameraPush (on footage)'],
    limitations: ['Grade is CSS-filter level (exposure, contrast, saturation); do heavier correction in the prep step.', 'Audio defaults to muted: mix the voice as its own track.'],
  },
  schema,
  layout: (p, ctx) => ({
    data: {
      x: ctx.x(p.x),
      y: ctx.y(p.y),
      ground: color(ctx.theme, 'ground'),
      keys: [{frame: -1, value: {scale: 1, x: 0, y: 0}}, ...p.keys.map((k) => ({frame: ctx.t(k.at), value: {scale: k.scale, x: k.x, y: k.y}, ease: k.ease}))],
    },
  }),
  component: ({params, rt}) => {
    const d = rt.layout;
    const cam = sampleTrack(rt.theme, d.keys, rt.absolute);
    const g = params.grade;
    // Remotion counts the video from the layer's mount; trim so it plays at absolute time + offset.
    const trim = Math.max(0, Math.round((rt.layer.from / rt.fps + params.offset) * rt.fps));
    return (
      <div style={{position: 'absolute', left: d.x, top: d.y, width: params.width, height: params.height, overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale})`, transformOrigin: '50% 45%'}}>
          <OffthreadVideo
            src={staticFile(`${rt.assetBase}/${params.src}`)}
            trimBefore={trim || undefined}
            volume={params.volume}
            muted={params.volume === 0}
            style={{width: '100%', height: '100%', objectFit: 'cover', filter: `brightness(${g.brightness}) contrast(${g.contrast}) saturate(${g.saturate})`}}
          />
        </div>
        {params.fadeBottom ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(to bottom, transparent ${params.fadeBottom.from * 100}%, ${d.ground} ${params.fadeBottom.to * 100}%)`,
            }}
          />
        ) : null}
      </div>
    );
  },
  example: {duration: '1s', note: 'Needs a video in the project folder; see projects/ai-gold-rush.', params: {src: 'assets/source/face.mp4'}, gallery: false},
};
