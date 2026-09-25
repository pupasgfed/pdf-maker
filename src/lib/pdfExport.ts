import { jsPDF } from 'jspdf';
import type { LeadMagnetDocument, MarkdownBlock } from './leadMagnet';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_X = 20;
const TOP = 28;
const BOTTOM = 24;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const BODY_COLOR: [number, number, number] = [38, 38, 38];
const MUTED_COLOR: [number, number, number] = [106, 106, 106];

export async function exportLeadMagnetPdf(document: LeadMagnetDocument, filename: string): Promise<void> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  let y = TOP;
  let pageNumber = 1;
  const pageImageCache = new Map<string, string | null>();

  const drawHeaderFooter = () => {
    pdf.setTextColor(...MUTED_COLOR);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.text(`${document.title.toUpperCase()}${document.author ? ` · ${document.author}` : ''}`, PAGE_WIDTH / 2, 12, { align: 'center' });
    pdf.text(`Page ${pageNumber}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: 'center' });
    if (document.link) {
      pdf.setTextColor(...MUTED_COLOR);
      pdf.setFontSize(7);
      pdf.textWithLink(document.link, PAGE_WIDTH / 2, PAGE_HEIGHT - 7, { align: 'center', url: document.link });
    }
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN_X, PAGE_HEIGHT - 16, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 16);
  };

  const newPage = () => {
    pdf.addPage();
    pageNumber += 1;
    y = TOP;
    drawHeaderFooter();
  };

  const ensureSpace = (height: number) => {
    if (y + height > PAGE_HEIGHT - BOTTOM) newPage();
  };

  const writeParagraph = (text: string, size = 10.5, lineHeight = 5.2, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor(...BODY_COLOR);
    const lines = pdf.splitTextToSize(text, CONTENT_WIDTH) as string[];
    ensureSpace(lines.length * lineHeight + 2);
    pdf.text(lines, MARGIN_X, y, { baseline: 'top' });
    y += lines.length * lineHeight + 4;
  };

  const drawImageBlock = async (url: string | undefined, alt: string | undefined, width: number, height: number) => {
    ensureSpace(height + 8);
    const imageData = url ? await getImageData(url, pageImageCache) : null;
    if (imageData) {
      pdf.addImage(imageData, 'JPEG', MARGIN_X + (CONTENT_WIDTH - width) / 2, y, width, height, undefined, 'FAST');
    } else {
      pdf.setFillColor(245, 245, 245);
      pdf.rect(MARGIN_X, y, CONTENT_WIDTH, height, 'F');
      pdf.setTextColor(...MUTED_COLOR);
      pdf.setFontSize(9);
      pdf.text(alt || 'Ressource visuelle indisponible', PAGE_WIDTH / 2, y + height / 2, { align: 'center' });
    }
    y += height + 8;
  };

  drawHeaderFooter();
  for (const block of document.blocks) {
    if (block.type === 'special' && block.special?.type === 'pagebreak') {
      newPage();
      continue;
    }
    await renderBlock(pdf, block, {
      ensureSpace,
      writeParagraph,
      drawImageBlock,
      getImageData: (url) => getImageData(url, pageImageCache),
      currentY: () => y,
      setY: (nextY) => { y = nextY; },
    });
  }

  pdf.save(filename);
}

interface RenderContext {
  ensureSpace: (height: number) => void;
  writeParagraph: (text: string, size?: number, lineHeight?: number, bold?: boolean) => void;
  drawImageBlock: (url: string | undefined, alt: string | undefined, width: number, height: number) => Promise<void>;
  getImageData: (url: string) => Promise<string | null>;
  currentY: () => number;
  setY: (nextY: number) => void;
}

async function renderBlock(pdf: jsPDF, block: MarkdownBlock, context: RenderContext): Promise<void> {
  if (block.type === 'heading') {
    const level = block.level ?? 1;
    const size = level === 1 ? 18 : level === 2 ? 13 : 10.5;
    context.writeParagraph(block.text ?? '', size, size * 0.52, true);
    return;
  }
  if (block.type === 'paragraph') {
    context.writeParagraph(block.text ?? '');
    return;
  }
  if (block.type === 'quote') {
    const text = block.text ?? '';
    pdf.setFillColor(246, 246, 246);
    pdf.setDrawColor(55, 55, 55);
    const lines = pdf.splitTextToSize(text, CONTENT_WIDTH - 10) as string[];
    context.ensureSpace(lines.length * 5.2 + 10);
    pdf.rect(MARGIN_X, context.currentY() - 3, CONTENT_WIDTH, lines.length * 5.2 + 7, 'F');
    pdf.setFillColor(40, 40, 40);
    pdf.rect(MARGIN_X, context.currentY() - 3, 1.5, lines.length * 5.2 + 7, 'F');
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(10.5);
    pdf.setTextColor(...BODY_COLOR);
    pdf.text(lines, MARGIN_X + 7, context.currentY(), { baseline: 'top' });
    context.setY(context.currentY() + lines.length * 5.2 + 12);
    return;
  }
  if (block.type === 'bullet' || block.type === 'ordered') {
    const items = block.items ?? [];
    items.forEach((item, index) => {
      const prefix = block.type === 'bullet' ? '•' : `${index + 1}.`;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10.5);
      const lines = pdf.splitTextToSize(item, CONTENT_WIDTH - 8) as string[];
      context.ensureSpace(lines.length * 5.2 + 2);
      pdf.setTextColor(...BODY_COLOR);
      pdf.text(prefix, MARGIN_X, context.currentY(), { baseline: 'top' });
      pdf.text(lines, MARGIN_X + 7, context.currentY(), { baseline: 'top' });
      context.setY(context.currentY() + lines.length * 5.2 + 2);
    });
    context.setY(context.currentY() + 4);
    return;
  }
  if (block.type === 'table') {
    const rows = block.rows ?? [];
    if (rows.length === 0) return;
    const rowHeight = 10;
    context.ensureSpace(rows.length * rowHeight + 8);
    const columnCount = Math.max(...rows.map((row) => row.length), 1);
    const columnWidth = CONTENT_WIDTH / columnCount;
    rows.forEach((row, rowIndex) => {
      row.forEach((cell, columnIndex) => {
        const x = MARGIN_X + columnIndex * columnWidth;
        const cellY = context.currentY() + rowIndex * rowHeight;
        pdf.setFillColor(rowIndex === 0 ? 242 : 255, rowIndex === 0 ? 242 : 255, rowIndex === 0 ? 242 : 255);
        pdf.setDrawColor(70, 70, 70);
        pdf.rect(x, cellY, columnWidth, rowHeight, 'FD');
        pdf.setFont('helvetica', rowIndex === 0 ? 'bold' : 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(...BODY_COLOR);
        const lines = pdf.splitTextToSize(cell, columnWidth - 5) as string[];
        pdf.text(lines.slice(0, 2), x + 2.5, cellY + 3, { baseline: 'top' });
      });
    });
    context.setY(context.currentY() + rows.length * rowHeight + 8);
    return;
  }
  if (block.type === 'spacer') {
    context.setY(context.currentY() + 8);
    return;
  }
  if (block.type === 'special' && block.special) {
    const special = block.special;
    if (special.type === 'answer') {
      const lineCount = special.lines ?? 4;
      context.ensureSpace(lineCount * 9 + 10);
      pdf.setDrawColor(150, 150, 150);
      pdf.setLineWidth(0.25);
      for (let index = 0; index < lineCount; index += 1) {
        const lineY = context.currentY() + index * 9 + 5;
        pdf.line(MARGIN_X, lineY, PAGE_WIDTH - MARGIN_X, lineY);
      }
      context.setY(context.currentY() + lineCount * 9 + 10);
      return;
    }
    if (special.type === 'cover') {
      await context.drawImageBlock(special.url, special.alt, CONTENT_WIDTH, 245);
      return;
    }
    if (special.type === 'banner') {
      await context.drawImageBlock(special.url, special.alt, CONTENT_WIDTH, 48);
      return;
    }
    if (special.type === 'illustration') {
      await context.drawImageBlock(special.url, special.alt, Math.min(CONTENT_WIDTH, 155), 95);
      return;
    }
    if (special.type === 'video') {
      await context.drawImageBlock(special.image, special.label || 'Aperçu vidéo', 150, 84);
      if (special.url) context.writeParagraph(`${special.label || 'Voir la vidéo'} : ${special.url}`, 9, 4.5);
      return;
    }
    if (special.type === 'qr') {
      const imageData = special.image ? await context.getImageData(special.image) : null;
      context.ensureSpace(64);
      if (imageData) pdf.addImage(imageData, 'JPEG', PAGE_WIDTH / 2 - 25, context.currentY(), 50, 50, undefined, 'FAST');
      else {
        pdf.setDrawColor(100, 100, 100);
        pdf.rect(PAGE_WIDTH / 2 - 25, context.currentY(), 50, 50);
        pdf.setFontSize(8);
        pdf.text('QR code', PAGE_WIDTH / 2, context.currentY() + 26, { align: 'center' });
      }
      context.setY(context.currentY() + 58);
    }
  }
}

async function getImageData(url: string | undefined, cache: Map<string, string | null>): Promise<string | null> {
  if (!url) return null;
  if (cache.has(url)) return cache.get(url) ?? null;
  const result = await new Promise<string | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext('2d')?.drawImage(image, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
  cache.set(url, result);
  return result;
}
