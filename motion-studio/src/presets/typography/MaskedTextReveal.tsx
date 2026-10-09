import React from 'react';
import type {PresetDef} from '../../engine/types';
import {layoutText, textParams, type TextLayout, type TextParams} from './textcore';
import {TypeSetter} from './TypeSetter';

const schema = textParams({size: 'subhead', weight: 'medium', width: 'normal', tracking: 'normal', by: 'line'});

export const MaskedTextReveal: PresetDef<typeof schema, TextLayout> = {
  id: 'MaskedTextReveal',
  category: 'typography',
  summary: 'A supporting line of text that rises through its baseline as a line, word by word, or glyph by glyph.',
  doc: {
    effect: 'Text appears from behind an invisible edge at its own baseline, so it reads as set into the layout rather than faded onto it.',
    timing: 'by line: one move over `base` (16f). by word: words stagger by `tight` (1.5f). Exits leave through the same edge.',
    easing: 'Out on entry, in on exit (theme curves).',
    supports: ['subheads', 'small connective words', 'labels', 'URLs', 'captions'],
    performance: 'Same renderer as KineticHeadline.',
    covers: ['MaskedTextReveal'],
    limitations: ['One line per layer.'],
  },
  schema,
  anchors: ['start', 'end', 'inkEnd', 'top', 'center', 'bottom'],
  refs: {layers: ['like']},
  layout: (p: TextParams, ctx, layer) => {
    const d = layoutText(p, ctx, layer);
    const s = d.states[d.states.length - 1];
    return {
      data: d,
      anchors: {
        start: {x: s.inkLeft, y: d.baseline},
        end: {x: s.x0 + s.width, y: d.baseline},
        inkEnd: {x: s.inkRight, y: d.baseline},
        top: {x: s.inkLeft, y: d.baseline - d.capHeight},
        center: {x: (s.inkLeft + s.inkRight) / 2, y: d.baseline - d.capHeight / 2},
        bottom: {x: s.inkLeft, y: d.clip.bottom},
      },
    };
  },
  component: ({rt}) => <TypeSetter d={rt.layout} rt={rt} />,
  example: {
    duration: '2s',
    note: 'A connective line set under a headline, revealed word by word.',
    params: {text: 'IS A', by: 'word', at: 4, y: 'safe.cy'},
  },
};
