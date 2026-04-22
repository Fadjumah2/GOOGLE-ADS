import React from 'react';
import { T, Mono } from './primitives.jsx';

export function ChartArea({ seriesA = [], seriesB = [], h = 200 }) {
  const allVals = [...seriesA, ...seriesB].filter(Boolean);
  if (!allVals.length) return <div style={{ height: h, display:"flex", alignItems:"center", justifyContent:"center" }}><Mono size={11}>No data for this period</Mono></div>;
  const max = Math.max(...allVals) || 1;
  const w = 800, pad = 20;
  const toPath = (arr) => arr.map((v, i) => `${i === 0 ? "M" : "L"}${pad + (i / (arr.length - 1)) * (w - pad * 2)},${pad + (1 - v / max) * (h - pad * 2)}`).join(" ");
  const toArea = (arr) => toPath(arr) + ` L${pad + (w - pad * 2)},${h - pad} L${pad},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width:"100%", height:h }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.accent} stopOpacity="0.25" />
          <stop offset="100%" stopColor={T.accent} stopOpacity="0" />
        </linearGradient>
        <pattern id="grid" width="80" height="40" patternUnits="userSpaceOnUse">
          <path d="M 80 0 L 0 0 0 40" fill="none" stroke={T.line} strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width={w} height={h} fill="url(#grid)" />
      {seriesA.length > 1 && <path d={toArea(seriesA)} fill="url(#gradA)" />}
      {seriesA.length > 1 && <path d={toPath(seriesA)} fill="none" stroke={T.accent} strokeWidth="2" />}
      {seriesB.length > 1 && <path d={toPath(seriesB)} fill="none" stroke={T.ink} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.45" />}
    </svg>
  );
}
