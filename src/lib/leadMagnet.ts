export type SpecialBlockType = 'cover' | 'banner' | 'illustration' | 'video' | 'qr' | 'pagebreak' | 'answer' | 'gallery';

export interface GalleryItem {
  image?: string;
  title: string;
  description?: string;
  url?: string;
  kind?: 'image' | 'video';
}

export interface MarkdownBlock {
  type: 'heading' | 'paragraph' | 'bullet' | 'ordered' | 'quote' | 'table' | 'special' | 'spacer';
  level?: number;
  text?: string;
  items?: string[];
  rows?: string[][];
  special?: {
    type: SpecialBlockType;
    url?: string;
    image?: string;
    alt?: string;
    label?: string;
    lines?: number;
    items?: GalleryItem[];
  };
}

export interface LeadMagnetDocument {
  title: string;
  author: string;
  link: string;
  blocks: MarkdownBlock[];
  warnings: string[];
}

const SPECIAL_PATTERN = /^:::(cover|banner|illustration|video|qr|pagebreak|answer|gallery)(?:\s+(.*?))?\s*$/i;
const GALLERY_ITEM_PATTERN = /^(?:-\s*)?:::?item(?:\s+(.*?))?\s*$/i;
const ATTRIBUTE_PATTERN = /(\w+)=(?:"([^"]*)"|'([^']*)'|(\S+))/g;

export function parseLeadMagnet(markdown: string): LeadMagnetDocument {
  const lines = markdown.replace(/\r/g, '').split('\n');
  const blocks: MarkdownBlock[] = [];
  const warnings: string[] = [];
  let paragraph: string[] = [];
  let table: string[][] = [];
  let title = 'Mon lead magnet';
  let author = '';
  let link = '';
  let galleryItems: GalleryItem[] | null = null;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraph.join('\n') });
      paragraph = [];
    }
  };

  const flushTable = () => {
    if (table.length > 0) {
      blocks.push({ type: 'table', rows: table });
      table = [];
    }
  };

  for (const sourceLine of lines) {
    const line = sourceLine.trimEnd();
    const trimmed = line.trim();

    if (galleryItems) {
      if (trimmed === ':::') {
        blocks.push({ type: 'special', special: { type: 'gallery', items: galleryItems } });
        galleryItems = null;
        continue;
      }
      const itemMatch = trimmed.match(GALLERY_ITEM_PATTERN);
      if (itemMatch) {
        const attributes = parseAttributes(itemMatch[1] ?? '');
        if (!attributes.title) warnings.push('Chaque élément de galerie doit contenir un titre.');
        galleryItems.push({
          image: attributes.image,
          title: attributes.title || 'Sans titre',
          description: attributes.description,
          url: safeExternalUrl(attributes.url),
          kind: attributes.kind?.toLowerCase() === 'video' ? 'video' : 'image',
        });
      }
      continue;
    }

    const specialMatch = trimmed.match(SPECIAL_PATTERN);

    if (specialMatch) {
      flushParagraph();
      flushTable();
      const specialType = specialMatch[1].toLowerCase() as SpecialBlockType;
      const attributes = parseAttributes(specialMatch[2] ?? '');
      if (specialType === 'gallery') {
        galleryItems = [];
      } else if (specialType === 'pagebreak') {
        blocks.push({ type: 'special', special: { type: specialType } });
      } else if (specialType === 'answer') {
        blocks.push({ type: 'special', special: { type: specialType, lines: Number(attributes.lines) || 4 } });
      } else {
        if (!attributes.url && specialType !== 'video') warnings.push(`La balise ${specialType} doit contenir un lien url.`);
        blocks.push({
          type: 'special',
          special: {
            type: specialType,
            url: safeExternalUrl(attributes.url),
            image: safeExternalUrl(attributes.image),
            alt: attributes.alt,
            label: attributes.label,
          },
        });
      }
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushTable();
      const level = heading[1].length;
      const headingText = heading[2].trim();
      if (!title || title === 'Mon lead magnet') title = headingText;
      blocks.push({ type: 'heading', level, text: headingText });
      continue;
    }

    const authorMatch = trimmed.match(/^Auteur\s*:\s*(.+)$/i);
    if (authorMatch) {
      flushParagraph();
      flushTable();
      author = authorMatch[1].trim();
      continue;
    }

    const linkMatch = trimmed.match(/^Lien\s*:\s*(.+)$/i);
    if (linkMatch) {
      flushParagraph();
      flushTable();
      link = linkMatch[1].trim();
      continue;
    }

    if (/^\s*\|.*\|\s*$/.test(line)) {
      flushParagraph();
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
      if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
      table.push(cells);
      continue;
    }

    if (trimmed === '---') {
      flushParagraph();
      flushTable();
      blocks.push({ type: 'spacer' });
      continue;
    }

    const bullet = trimmed.match(/^[-*+]\s+(.+)$/);
    if (bullet) {
      flushTable();
      const previous = blocks[blocks.length - 1];
      if (previous?.type === 'bullet') previous.items?.push(bullet[1]);
      else blocks.push({ type: 'bullet', items: [bullet[1]] });
      continue;
    }

    const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) {
      flushTable();
      const previous = blocks[blocks.length - 1];
      if (previous?.type === 'ordered') previous.items?.push(ordered[1]);
      else blocks.push({ type: 'ordered', items: [ordered[1]] });
      continue;
    }

    if (trimmed.startsWith('>')) {
      flushParagraph();
      flushTable();
      blocks.push({ type: 'quote', text: trimmed.replace(/^>\s?/, '') });
      continue;
    }

    if (trimmed === '') {
      flushParagraph();
      flushTable();
      continue;
    }

    flushTable();
    paragraph.push(trimmed);
  }

  if (galleryItems) {
    blocks.push({ type: 'special', special: { type: 'gallery', items: galleryItems } });
  }
  flushParagraph();
  flushTable();
  return { title, author, link: safeExternalUrl(link) || '', blocks, warnings };
}

function safeExternalUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : undefined;
  } catch {
    return undefined;
  }
}

function parseAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of source.matchAll(ATTRIBUTE_PATTERN)) {
    attributes[match[1]] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attributes;
}

export function slugify(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-') || 'lead-magnet';
}

export function getSpecialTagExamples(): string[] {
  return [
    ':::cover url="https://placehold.co/1240x1754/png" alt="Couverture"',
    ':::banner url="https://placehold.co/1200x300/png" alt="Bannière"',
    ':::illustration url="https://placehold.co/800x500/png" alt="Illustration"',
    ':::gallery',
    ':::item image="https://placehold.co/800x500/png" title="Titre" description="Description" url="https://exemple.com"',
    ':::',
    ':::video url="https://exemple.com/video" image="https://placehold.co/900x500/png" label="Voir la vidéo"',
    ':::qr url="https://exemple.com" image="https://placehold.co/240x240/png"',
    ':::answer lines="5"',
    ':::pagebreak',
  ];
}
