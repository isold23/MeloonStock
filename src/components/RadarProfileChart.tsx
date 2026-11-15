import React, { useState } from 'react';
import { AppLanguage, FundamentalAxis } from '../types/research';
import { UI_COPY } from '../constants/i18n';

interface RadarProfileChartProps {
  dimensions: FundamentalAxis[];
  compareDimensions?: FundamentalAxis[] | null;
  primaryLabel?: string;
  compareLabel?: string;
  lang: AppLanguage;
}

export const RadarProfileChart: React.FC<RadarProfileChartProps> = ({
  dimensions,
  compareDimensions,
  primaryLabel,
  compareLabel,
  lang,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const t = UI_COPY[lang];

  if (!dimensions || dimensions.length < 3) return null;

  const size = 280;
  const center = size / 2;
  const radius = 92;
  const count = dimensions.length;

  const angleFor = (idx: number) => (Math.PI * 2 * idx) / count - Math.PI / 2;

  const pointAt = (idx: number, ratio: number) => {
    const angle = angleFor(idx);
    return {
      x: center + Math.cos(angle) * radius * ratio,
      y: center + Math.sin(angle) * radius * ratio,
    };
  };

  const buildPolygonPoints = (axes: FundamentalAxis[]) =>
    axes
      .map((d, i) => {
        const clamped = Math.max(1, Math.min(10, Number(d.score) || 5)) / 10;
        const p = pointAt(i, clamped);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(' ');

  const rings = [0.2, 0.4, 0.6, 0.8, 1.0];
  const activeAxis = dimensions[selectedIndex] || dimensions[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative flex items-center justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full max-w-[270px] h-auto select-none"
          role="img"
          aria-label={t.radarTitle}
        >
          {rings.map((ring) => {
            const pts = dimensions
              .map((_, i) => {
                const p = pointAt(i, ring);
                return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
              })
              .join(' ');
            return (
              <polygon
                key={ring}
                points={pts}
                fill="none"
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeWidth={1}
              />
            );
          })}

          {dimensions.map((_, i) => {
            const outer = pointAt(i, 1);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={outer.x}
                y2={outer.y}
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeWidth={1}
              />
            );
          })}

          {compareDimensions && compareDimensions.length === count && (
            <polygon
              points={buildPolygonPoints(compareDimensions)}
              className="fill-amber-500/15 stroke-amber-500"
              strokeWidth={1.75}
              strokeDasharray="4 3"
            />
          )}

          <polygon
            points={buildPolygonPoints(dimensions)}
            className="fill-teal-600/15 stroke-teal-600 dark:fill-teal-400/20 dark:stroke-teal-400"
            strokeWidth={2}
          />

          {dimensions.map((d, i) => {
            const clamped = Math.max(1, Math.min(10, Number(d.score) || 5)) / 10;
            const vertex = pointAt(i, clamped);
            const labelPos = pointAt(i, 1.24);
            const isSelected = i === selectedIndex;

            return (
              <g
                key={d.label}
                className="cursor-pointer"
                onClick={() => setSelectedIndex(i)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <circle
                  cx={vertex.x}
                  cy={vertex.y}
                  r={isSelected ? 5.5 : 4}
                  className={
                    isSelected
                      ? 'fill-teal-600 dark:fill-teal-400 stroke-white dark:stroke-slate-900'
                      : 'fill-teal-600/80 dark:fill-teal-400/80 stroke-white dark:stroke-slate-900'
                  }
                  strokeWidth={1.5}
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={`text-[10px] font-medium transition-colors ${
                    isSelected
                      ? 'fill-teal-700 dark:fill-teal-300 font-semibold'
                      : 'fill-slate-600 dark:fill-slate-400'
                  }`}
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {compareDimensions && primaryLabel && compareLabel && (
        <div className="flex items-center justify-center gap-5 text-xs text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-teal-600 dark:bg-teal-400 inline-block" />
            {primaryLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-500 inline-block border-b border-dashed" />
            {compareLabel}
          </span>
        </div>
      )}

      {activeAxis && !compareDimensions && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3.5">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {activeAxis.label}
            </span>
            <span className="font-mono text-xs font-semibold tabular-nums text-teal-700 dark:text-teal-400">
              {activeAxis.score} / 10
            </span>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            {activeAxis.reason}
          </p>
        </div>
      )}
    </div>
  );
};
