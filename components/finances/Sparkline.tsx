'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

interface SparklineProps {
  data: { v: number }[];
  width?: number;
  height?: number;
}

const Sparkline: React.FC<SparklineProps> = ({ data, width = 100, height = 36 }) => {
  const [visible, setVisible] = useState(false);
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const { pathD, areaD, isNegative, gradientId } = useMemo(() => {
    if (!data.length) return { pathD: '', areaD: '', isNegative: false, gradientId: 'sparkGrad' };

    const values = data.map(d => d.v);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const pad = 2;
    const w = width - pad * 2;
    const h = height - pad * 2;

    const points = values.map((v, i) => ({
      x: pad + (i / Math.max(values.length - 1, 1)) * w,
      y: pad + h - ((v - min) / range) * h,
    }));

    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const area = `${line} L${points[points.length - 1].x},${height} L${points[0].x},${height} Z`;

    // Negative trend: all values negative OR last value < first value
    const trending = values[values.length - 1] < values[0];
    const allNeg = values.every(v => v < 0);

    const id = `sparkGrad-${Math.random().toString(36).slice(2, 8)}`;

    return { pathD: line, areaD: area, isNegative: allNeg || trending, gradientId: id };
  }, [data, width, height]);

  if (!data.length) return null;

  const strokeColor = isNegative ? '#ef4444' : '#10b981';
  const fillColor = isNegative ? '#ef4444' : '#10b981';

  return (
    <svg
      ref={ref}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="transition-opacity duration-700"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} stopOpacity={0.25} />
          <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default Sparkline;
