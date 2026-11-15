import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';
import {
  AppLanguage,
  CompanyInfo,
  ExecutiveSynthesis,
  ReportChapterState,
} from '../types/research';
import { ANALYSIS_STEPS } from '../constants/analysisSteps';

export const WATERMARK_TEXT = 'stock.meloon.top';

function drawCanvasWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pageNumber: number
) {
  ctx.save();
  // Diagonal tiled watermark across the A4 slice
  ctx.fillStyle = 'rgba(15, 23, 42, 0.055)';
  ctx.font = '600 28px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const stepX = 420;
  const stepY = 300;
  ctx.translate(width / 2, height / 2);
  ctx.rotate((-26 * Math.PI) / 180);

  for (let x = -width; x <= width; x += stepX) {
    for (let y = -height; y <= height; y += stepY) {
      ctx.fillText(WATERMARK_TEXT, x, y);
    }
  }
  ctx.restore();

  // Subtle footer watermark stamp on each page
  ctx.save();
  ctx.fillStyle = 'rgba(100, 116, 139, 0.55)';
  ctx.font = '500 18px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${WATERMARK_TEXT}  ·  P.${pageNumber + 1}`, width - 24, height - 18);
  ctx.restore();
}

export async function exportElementToPDF(
  elementId: string,
  company: CompanyInfo,
  lang: AppLanguage,
  watermarkEnabled: boolean
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(lang === 'en' ? 'Report element not found' : '未找到可导出的报告内容区域');
  }

  const htmlEl = document.documentElement;
  const wasDark = htmlEl.classList.contains('dark');
  if (wasDark) {
    htmlEl.classList.remove('dark');
    await new Promise((r) => setTimeout(r, 60));
  }

  try {
    const canvas = await toCanvas(element, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      skipFonts: true,
      filter: (node) => {
        if (node instanceof HTMLElement) {
          if (node.classList?.contains('no-export')) return false;
          // Avoid double-watermarking since we stamp crisp vector-grade watermark per PDF slice
          if (node.dataset?.watermarkLayer === 'true') return false;
        }
        return true;
      },
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;

    const pageCanvasHeight = Math.floor(
      canvas.width * (contentHeight / contentWidth)
    );

    let currentY = 0;
    let pageNumber = 0;

    while (currentY < canvas.height) {
      if (pageNumber > 0) {
        pdf.addPage();
      }

      const remainingCanvasHeight = canvas.height - currentY;
      const sliceHeight = Math.min(pageCanvasHeight, remainingCanvasHeight);

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = pageCanvasHeight;
      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          currentY,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight
        );

        if (watermarkEnabled) {
          drawCanvasWatermark(ctx, pageCanvas.width, pageCanvas.height, pageNumber);
        }
      }

      const sliceImgData = pageCanvas.toDataURL('image/jpeg', 0.94);
      const sliceImgHeightMm = (sliceHeight * contentWidth) / canvas.width;

      // Render full page slice height when watermark footer exists at bottom
      pdf.addImage(
        sliceImgData,
        'JPEG',
        margin,
        margin,
        contentWidth,
        watermarkEnabled ? contentHeight : sliceImgHeightMm
      );

      currentY += sliceHeight;
      pageNumber++;
    }

    const safeName = (company.name || 'Company').replace(/[/\\?%*:|"<>]/g, '_');
    const safeTicker = (company.ticker || 'Ticker').replace(/[/\\?%*:|"<>]/g, '_');
    const suffix = lang === 'en' ? 'Equity_Research_Report' : '投资研究报告';
    pdf.save(`${safeName}_${safeTicker}_${suffix}.pdf`);
  } finally {
    if (wasDark) {
      htmlEl.classList.add('dark');
    }
  }
}

export function buildMarkdownDocument(
  company: CompanyInfo,
  chapters: ReportChapterState[],
  synthesis: ExecutiveSynthesis | null,
  notes: string,
  lang: AppLanguage,
  watermarkEnabled: boolean
): string {
  const isEn = lang === 'en';
  const dateStr = new Date().toLocaleDateString(isEn ? 'en-US' : 'zh-CN');
  const lines: string[] = [
    `# ${company.name} (${company.ticker}) — ${isEn ? 'StockInsight AI Equity Research Report' : 'StockInsight AI 深度投资研究报告'}`,
    ``,
    `- **${isEn ? 'Industry' : '所属行业'}**: ${company.industry || (isEn ? 'Diversified' : '综合')}`,
    `- **${isEn ? 'Date' : '生成日期'}**: ${dateStr}`,
  ];

  if (watermarkEnabled) {
    lines.push(`- **${isEn ? 'Source' : '报告水印来源'}**: ${WATERMARK_TEXT}`);
  }
  lines.push(``);

  if (synthesis) {
    lines.push(`## ${isEn ? 'Executive Summary' : '核心执行摘要'}`);
    lines.push(`> **${isEn ? 'Thesis' : '核心投资逻辑'}**: ${synthesis.oneLineThesis}`);
    lines.push(`- **${isEn ? 'Moat' : '护城河类型'}**: ${synthesis.moatType}`);
    lines.push(``);
    lines.push(`### ${isEn ? '5-Axis Fundamental Profile' : '五维基本面画像'}`);
    lines.push(`| ${isEn ? 'Axis' : '维度'} | ${isEn ? 'Score' : '评分'} | ${isEn ? 'Rationale' : '核心依据'} |`);
    lines.push(`| :--- | :---: | :--- |`);
    synthesis.dimensions.forEach((d) => {
      lines.push(`| ${d.label} | ${d.score}/10 | ${d.reason} |`);
    });
    lines.push(``);
    lines.push(`### ${isEn ? 'Bull Catalysts' : '看多催化因素'}`);
    synthesis.bullCatalysts.forEach((b) => lines.push(`- ${b}`));
    lines.push(``);
    lines.push(`### ${isEn ? 'Bear Risks' : '核心风险提示'}`);
    synthesis.bearRisks.forEach((r) => lines.push(`- ${r}`));
    lines.push(``);
    lines.push(`### ${isEn ? 'KPIs to Monitor' : '重点跟踪指标'}`);
    synthesis.trackingMetrics.forEach((m) => lines.push(`- ${m}`));
    lines.push(``);
  }

  if (notes && notes.trim()) {
    lines.push(`## ${isEn ? 'Personal Investment Notes' : '个人投研备忘录'}`);
    lines.push(notes.trim());
    lines.push(``);
  }

  chapters.forEach((ch) => {
    if (ch.status === 'completed' && ch.content) {
      const def = ANALYSIS_STEPS.find((s) => s.id === ch.id);
      lines.push(`---`);
      lines.push(`## ${def?.title[lang] || `Chapter ${ch.id}`}`);
      lines.push(``);
      lines.push(ch.content);
      lines.push(``);
    }
  });

  return lines.join('\n');
}

export function downloadMarkdownFile(
  company: CompanyInfo,
  chapters: ReportChapterState[],
  synthesis: ExecutiveSynthesis | null,
  notes: string,
  lang: AppLanguage,
  watermarkEnabled: boolean
): void {
  const md = buildMarkdownDocument(company, chapters, synthesis, notes, lang, watermarkEnabled);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (company.name || 'Company').replace(/[/\\?%*:|"<>]/g, '_');
  const safeTicker = (company.ticker || 'Ticker').replace(/[/\\?%*:|"<>]/g, '_');
  const suffix = lang === 'en' ? 'Equity_Research_Report' : '投资研究报告';
  a.href = url;
  a.download = `${safeName}_${safeTicker}_${suffix}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
