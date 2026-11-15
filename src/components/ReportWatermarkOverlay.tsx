import React from 'react';
import { WATERMARK_TEXT } from '../utils/exportReport';

interface ReportWatermarkOverlayProps {
  enabled: boolean;
}

export const ReportWatermarkOverlay: React.FC<ReportWatermarkOverlayProps> = ({ enabled }) => {
  if (!enabled) return null;

  return (
    <div
      data-watermark-layer="true"
      aria-hidden="true"
      className="pointer-events-none select-none absolute inset-0 z-10 overflow-hidden rounded-2xl"
    >
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="stockinsight-report-watermark"
            width="280"
            height="190"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-24)"
          >
            <text
              x="20"
              y="95"
              fill="currentColor"
              className="text-slate-900/[0.045] dark:text-slate-100/[0.05] font-mono text-[15px] font-semibold tracking-wider"
            >
              {WATERMARK_TEXT}
            </text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#stockinsight-report-watermark)" />
      </svg>
    </div>
  );
};
