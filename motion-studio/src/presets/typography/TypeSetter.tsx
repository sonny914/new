// Draws a TextLayout at a frame: one SVG <text> per glyph at its measured (kerned) position,
// clipped to the type's slot so glyphs rise and fall through the line rather than fading.
import React from 'react';
import {fontCss} from '../../engine/measure.browser';
import type {Runtime} from '../../engine/types';
import {evaluateText, type TextLayout} from './textcore';

export const TypeSetter: React.FC<{d: TextLayout; rt: Runtime; frame?: number; dyOffset?: number; opacity?: number}> = ({d, rt, frame, dyOffset = 0, opacity = 1}) => {
  const {glyphs, rest, state} = evaluateText(d, frame ?? rt.frame, rt.theme);
  const {width: W, height: H} = rt.format;
  const clipId = `clip-${rt.layer.id}`;
  const font = fontCss(d.style, d.family, d.fallback);
  // QA box: the ink of the text at rest, from layout (not the em box), so safe-area checks are exact.
  const shown = d.states[Math.max(0, state)];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <defs>
        <clipPath id={clipId}>
          <rect x={-W} y={d.clip.top + dyOffset} width={W * 3} height={d.clip.bottom - d.clip.top} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`} opacity={opacity}>
        {glyphs.map((g) => (
          <text
            key={g.key}
            x={g.x}
            y={d.baseline + dyOffset}
            transform={g.dy ? `translate(0 ${(g.dy * d.rise).toFixed(3)})` : undefined}
            opacity={g.opacity}
            fill={d.outline ? 'none' : d.color}
            stroke={d.outline ? d.color : undefined}
            strokeWidth={d.outline || undefined}
            style={{...font, letterSpacing: 0}}
          >
            {g.char}
          </text>
        ))}
      </g>
      {glyphs.length ? (
        <rect
          {...rt.qa('text', rest)}
          x={shown.inkLeft}
          y={d.baseline + dyOffset - d.capHeight}
          width={Math.max(1, shown.inkRight - shown.inkLeft)}
          height={d.capHeight}
          fill="none"
        />
      ) : null}
    </svg>
  );
};
