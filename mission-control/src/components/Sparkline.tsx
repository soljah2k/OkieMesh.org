"use client";

import { useId } from "react";

/**
 * Minimal SVG sparkline: 2px line, soft area fill, no axes.
 * `max` pins the scale (e.g. 100 for percentages) so motion is honest.
 */
export function Sparkline({
  data,
  color,
  max,
  height = 36,
  className,
}: {
  data: number[];
  color: string;
  max?: number;
  height?: number;
  className?: string;
}) {
  const gid = useId();
  const w = 120;
  const h = height;
  if (data.length < 2) {
    return <svg className={className} viewBox={`0 0 ${w} ${h}`} height={h} aria-hidden />;
  }
  const top = max ?? Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - 3 - (Math.min(v, top) / top) * (h - 6);
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `M0,${h} L${line.replace(/ /g, " L")} L${w},${h} Z`;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      height={h}
      preserveAspectRatio="none"
      role="img"
      aria-label="trend sparkline"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
