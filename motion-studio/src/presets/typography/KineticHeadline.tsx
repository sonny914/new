import React from 'react';
import type {PresetDef} from '../../engine/types';
import {layoutText, textParams, type TextLayout, type TextParams} from './textcore';
import {TypeSetter} from './TypeSetter';

const schema = textParams({size: 'fit', weight: 'heavy', width: 'condensed', tracking: 'tight', by: 'glyph'});

export const KineticHeadline: PresetDef<typeof schema, TextLayout> = {
  id: 'KineticHeadline',
  category: 'typography',
  summary: 'Oversized display type that enters glyph by glyph, can change into another word, and leaves through its own baseline.',
  doc: {
    effect:
      'A single typographic object that persists across scenes. Glyphs rise through a slot at the baseline (CharacterReveal), converge from wide tracking (TrackingExpansion), or fade. A later state swaps only the letters that differ while shared letters slide to their new places (MatchCut / TextScaleTransition).',
    timing: 'enter: per-unit stagger (tight = 1.5f) over `base` (16f). change: letters that differ roll through their slot as glued pairs, old one slot above new (stagger `base` 3f, each over `base` 16f), while shared letters slide over `long` (24f). exit: per-unit stagger over `short` (10f).',
    easing: 'Entrances ease out (.23,1,.32,1); exits ease in (the same curve reversed); rolls and slides ease in-out (.77,0,.175,1).',
    supports: ['single words', 'short lines', 'word-to-word transformations', 'outlined echoes (outline > 0)'],
    performance: 'One <text> per glyph; measurement cached per string + style. Negligible per-frame cost.',
    covers: ['CharacterReveal', 'KineticHeadline', 'TrackingExpansion', 'TextScaleTransition', 'MatchCut (typographic)'],
    limitations: ['One line per layer: set multi-line headlines as several layers with "like" to share size.', 'Glyph matching is by character, so ligatures are not modelled.'],
  },
  schema,
  anchors: ['start', 'end', 'inkEnd', 'firstEnd', 'top', 'center', 'bottom'],
  refs: {layers: ['like']},
  layout: (p: TextParams, ctx, layer) => {
    const d = layoutText(p, ctx, layer);
    const first = d.states[0];
    const last = d.states[d.states.length - 1];
    return {
      data: d,
      anchors: {
        start: {x: last.inkLeft, y: d.baseline},
        end: {x: last.x0 + last.width, y: d.baseline},
        inkEnd: {x: last.inkRight, y: d.baseline},
        firstEnd: {x: first.inkRight, y: d.baseline},
        top: {x: last.inkLeft, y: d.baseline - d.capHeight},
        center: {x: (last.inkLeft + last.inkRight) / 2, y: d.baseline - d.capHeight / 2},
        bottom: {x: last.inkLeft, y: d.clip.bottom},
      },
    };
  },
  events: (p, ctx, layer) => {
    const states = p.states ?? [{text: p.text!, at: p.at ?? layer.from}];
    return states.map((s, i) => ctx.t(i === 0 && !p.states ? (p.at ?? layer.from) : s.at));
  },
  component: ({rt}) => <TypeSetter d={rt.layout} rt={rt} />,
  example: {
    duration: '3s',
    note: 'COMPLEXITY enters, then becomes SIMPLICITY: six shared letters hold, four roll through.',
    params: {
      states: [
        {text: 'COMPLEXITY', at: 4},
        {text: 'SIMPLICITY', at: '1.6s'},
      ],
      y: 'safe.cy',
    },
  },
};
