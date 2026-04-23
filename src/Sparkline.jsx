import React from 'react';
import { T } from './primitives.jsx';

export function Sparkline({ data, color = T.accent, w = 80, h = 24 }) {
  const vals = (data || []).map(Number);
  if (vals.length < 2) return null;
  const max = Math.max(...vals), min = Math.min(...vals);
  const range = max - min || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  const lastY = h - ((vals[vals.length - 1] - min) / range) * h;
  return (
    <svg width={w} height={h} style={{ overflow:"visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}
