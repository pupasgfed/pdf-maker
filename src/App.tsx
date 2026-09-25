import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronDown, Download, FileText, Image as ImageIcon, Info, Link2, Upload } from 'lucide-react';
import { exportLeadMagnetPdf } from './lib/pdfExport';
import { getSpecialTagExamples, parseLeadMagnet, slugify, type MarkdownBlock } from './lib/leadMagnet';

const SAMPLE_MARKDOWN = `# Atelier mon premier contact hypno-dom
Auteur : Hypnosekinky
Lien : https://hypnosekinky.com

:::cover url="https://placehold.co/1240x1754/png" alt="Couverture du guide"

## Bienvenue dans mon monde d’hypnose

**Un petit recap pour aider à se remémorer quelques points clés.**

> Tu ne sors pas de cet atelier avec une simple théorie : tu repars avec des repères concrets.

:::banner url="https://placehold.co/1200x300/png" alt="Bannière de l'atelier"

### Tout ce qu’il faut pour commencer

| Apprendre et pratiquer | Les bons repères |
| --- | --- |
| Comprendre, pratiquer, observer | Protection, écoute, description |
| Apprendre à expliquer | Préparer et adapter |

:::qr url="https://example.com" image="https://placehold.co/240x240/png" label="Ressource complémentaire"

## Les bases à retenir

- Observer avant d’interpréter
- Poser un cadre clair
- Avancer de manière progressive

:::video url="https://example.com/video" image="https://placehold.co/900x500/png" label="Voir la vidéo"

:::answer lines="5"

:::pagebreak

## Une pratique guidée

Prends un moment pour t’installer. Ajuste ta position si tu en ressens le besoin. Laisse chaque respiration devenir plus calme et plus confortable.

> Chaque étape renforce la suivante.

1. Accueillir le moment présent
2. Observer les sensations
3. Revenir doucement à l’instant présent`;

export default function App() {
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN);
  const [fileName, setFileName] = useState('mon-lead-magnet.md');
  const [isExporting, setIsExporting] = useState(false);
  const [showTags, setShowTags] = useState(true);
  const [authorOverride, setAuthorOverride] = useState('');
  const [linkOverride, setLinkOverride] = useState('');
  const parsed = useMemo(() => parseLeadMagnet(markdown), [markdown]);
  const document = useMemo(() => ({
    ...parsed,
    author: authorOverride.trim() || parsed.author,
    link: linkOverride.trim() || parsed.link,
  }), [parsed, authorOverride, linkOverride]);
  const tags = getSpecialTagExamples();

  useEffect(() => {
    if (parsed.author && !authorOverride) setAuthorOverride(parsed.author);
    if (parsed.link && !linkOverride) setLinkOverride(parsed.link);
  }, [parsed.author, parsed.link]);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setMarkdown(typeof reader.result === 'string' ? reader.result : '');
      setFileName(file.name);
    };
    reader.readAsText(file);
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await exportLeadMagnetPdf(document, `${slugify(document.title)}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#ecebe8] text-[#252525]">
      <header className="border-b border-[#d6d4cf] bg-[#f8f7f4]">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-5 px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#272727] text-[#f8f7f4] shadow-sm"><BookOpen size={21} /></div>
            <div>
              <p className="font-serif text-xl font-semibold tracking-[-0.02em]">Lead Magnet Studio</p>
              <p className="text-xs uppercase tracking-[0.18em] text-[#77736c]">Markdown vers PDF · A4</p>
            </div>
          </div>
          <button onClick={handleExport} disabled={isExporting || document.blocks.length === 0} className="inline-flex items-center gap-2 rounded-md bg-[#252525] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#444] disabled:cursor-not-allowed disabled:opacity-50">
            <Download size={16} /> {isExporting ? 'Création du PDF…' : 'Télécharger le PDF'}
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-6 px-5 py-6 lg:grid-cols-[390px_minmax(0,1fr)] lg:px-8">
        <aside className="space-y-4">
          <section className="rounded-xl border border-[#d6d4cf] bg-[#f8f7f4] p-5 shadow-[0_8px_30px_rgba(42,38,32,0.05)]">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a857d]">Document actif</p>
                <h1 className="font-serif text-2xl leading-tight">Préparer un lead magnet</h1>
              </div>
              <FileText className="mt-1 text-[#77736c]" size={21} />
            </div>
            <div className="mb-4 grid gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a857d]">Nom de l’auteur</label>
                <input
                  type="text"
                  value={authorOverride}
                  onChange={(event) => setAuthorOverride(event.target.value)}
                  placeholder="Ex : Hypnosekinky"
                  className="w-full rounded-md border border-[#d6d4cf] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#55514b] focus:ring-2 focus:ring-[#c9c5bc]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a857d]">Lien direct (URL)</label>
                <input
                  type="url"
                  value={linkOverride}
                  onChange={(event) => setLinkOverride(event.target.value)}
                  placeholder="https://votre-site.com"
                  className="w-full rounded-md border border-[#d6d4cf] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#55514b] focus:ring-2 focus:ring-[#c9c5bc]"
                />
              </div>
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-[#aaa69e] bg-white px-4 py-3 text-sm font-semibold transition hover:border-[#252525] hover:bg-[#fbfaf8]">
              <Upload size={16} /> Importer un fichier .md
              <input type="file" accept=".md,text/markdown,text/plain" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
            </label>
            <p className="mt-3 truncate text-xs text-[#817d75]" title={fileName}>{fileName}</p>
          </section>

          <section className="rounded-xl border border-[#d6d4cf] bg-[#f8f7f4] p-5 shadow-[0_8px_30px_rgba(42,38,32,0.05)]">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a857d]">Source</p>
                <h2 className="font-serif text-xl">Votre Markdown</h2>
              </div>
              <span className="rounded-full bg-[#ebe9e4] px-2.5 py-1 text-xs text-[#77736c]">A4 portrait</span>
            </div>
            <textarea value={markdown} onChange={(event) => setMarkdown(event.target.value)} spellCheck={false} className="min-h-[510px] w-full resize-y rounded-md border border-[#d6d4cf] bg-white px-4 py-3 font-mono text-[12px] leading-6 text-[#34322f] outline-none transition focus:border-[#55514b] focus:ring-2 focus:ring-[#c9c5bc]" />
            {document.warnings.length > 0 && <div className="mt-3 rounded-md border border-[#d7b46a] bg-[#fff9e9] px-3 py-2 text-xs text-[#765b20]">{document.warnings.join(' ')}</div>}
          </section>

          <section className="overflow-hidden rounded-xl border border-[#d6d4cf] bg-[#f8f7f4] shadow-[0_8px_30px_rgba(42,38,32,0.05)]">
            <button onClick={() => setShowTags((value) => !value)} className="flex w-full items-center justify-between px-5 py-4 text-left">
              <span className="flex items-center gap-2 font-semibold"><Info size={16} /> Balises visuelles</span>
              <ChevronDown size={17} className={`transition-transform ${showTags ? 'rotate-180' : ''}`} />
            </button>
            {showTags && <div className="border-t border-[#e0ded9] px-5 pb-5 pt-4">
              <p className="mb-3 text-xs leading-5 text-[#77736c]">Ajoutez ces balises directement dans votre Markdown. Chaque lien reste géré en dehors de l’application.</p>
              <div className="space-y-2">
                {tags.map((tag) => <code key={tag} className="block overflow-x-auto rounded bg-[#ebe9e4] px-3 py-2 text-[11px] leading-5 text-[#4c4943]">{tag}</code>)}
              </div>
            </div>}
          </section>
        </aside>

        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a857d]">Aperçu fidèle</p>
              <h2 className="font-serif text-3xl">Document A4</h2>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#77736c]"><span>{document.blocks.length} blocs</span><span className="flex items-center gap-1"><Link2 size={13} /> Liens conservés dans le PDF</span></div>
          </div>
          <div className="rounded-xl border border-[#d6d4cf] bg-[#dedcd7] p-4 sm:p-7 lg:p-10">
            <div className="space-y-6">
              <PreviewPage document={document} pageNumber={1} />
              {document.blocks.some((block) => block.type === 'special' && block.special?.type === 'pagebreak') && <PreviewPage document={document} pageNumber={2} secondPage />}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function PreviewPage({ document, pageNumber, secondPage = false }: { document: ReturnType<typeof parseLeadMagnet>; pageNumber: number; secondPage?: boolean }) {
  const blocks = secondPage ? splitAfterPageBreak(document.blocks) : document.blocks.filter((block) => !(block.type === 'special' && block.special?.type === 'pagebreak'));
  const limitedBlocks = secondPage ? blocks : blocks.slice(0, 18);
  return <article className="mx-auto min-h-[1120px] max-w-[794px] bg-white px-[9%] py-10 text-[#292929] shadow-[0_5px_20px_rgba(45,42,38,0.12)] sm:py-14">
    <div className="mb-10 text-center text-[9px] font-medium uppercase tracking-[0.08em] text-[#77736c]">{document.title}{document.author ? ` · ${document.author}` : ''} {pageNumber}</div>
    <div className="space-y-5">{limitedBlocks.map((block, index) => <PreviewBlock key={`${block.type}-${index}`} block={block} />)}</div>
    <div className="mt-16 border-t border-[#deddd9] pt-3 text-center text-[9px] text-[#77736c]">Ce contenu est proposé par {document.author || 'votre marque'}{document.link && <> · <a href={document.link} target="_blank" rel="noreferrer" className="underline decoration-[#999] underline-offset-2">{document.link}</a></>}</div>
  </article>;
}

function splitAfterPageBreak(blocks: MarkdownBlock[]): MarkdownBlock[] {
  const index = blocks.findIndex((block) => block.type === 'special' && block.special?.type === 'pagebreak');
  return index >= 0 ? blocks.slice(index + 1) : [];
}

function PreviewBlock({ block }: { block: MarkdownBlock }) {
  if (block.type === 'heading') {
    const className = block.level === 1 ? 'font-serif text-2xl font-semibold uppercase tracking-[-0.02em]' : block.level === 2 ? 'text-[15px] font-bold uppercase tracking-[0.02em]' : 'text-[12px] font-bold uppercase';
    return <h3 className={className}>{renderInline(block.text || '')}</h3>;
  }
  if (block.type === 'paragraph') return <p className="whitespace-pre-line text-[11px] leading-[1.55]">{renderInline(block.text || '')}</p>;
  if (block.type === 'quote') return <blockquote className="border-l-2 border-[#444] bg-[#f5f5f3] px-4 py-3 text-[11px] italic leading-[1.55]">{renderInline(block.text || '')}</blockquote>;
  if (block.type === 'bullet' || block.type === 'ordered') return <ul className={`${block.type === 'ordered' ? 'list-decimal' : 'list-disc'} space-y-1 pl-5 text-[11px] leading-[1.5]`}>{(block.items || []).map((item) => <li key={item}>{renderInline(item)}</li>)}</ul>;
  if (block.type === 'table') return <div className="overflow-hidden border border-[#383838]"><table className="w-full border-collapse text-[10px]"><tbody>{(block.rows || []).map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} className={`border border-[#383838] px-2 py-2 align-top ${rowIndex === 0 ? 'bg-[#f2f2f0] font-semibold' : ''}`}>{renderInline(cell)}</td>)}</tr>)}</tbody></table></div>;
  if (block.type === 'spacer') return <div className="h-2" />;
  if (block.type === 'special') return <SpecialPreview special={block.special} />;
  return null;
}

function SpecialPreview({ special }: { special: MarkdownBlock['special'] }) {
  if (!special) return null;
  if (special.type === 'pagebreak') return <div className="border-t border-dashed border-[#aaa69e] py-1 text-center text-[9px] uppercase tracking-[0.14em] text-[#9b968d]">Saut de page</div>;
  if (special.type === 'answer') return <div className="space-y-5 py-2">{Array.from({ length: special.lines || 4 }, (_, index) => <div key={index} className="border-b border-[#999]" />)}</div>;
  if (special.type === 'video') return <figure className="space-y-2"><a href={special.url} target="_blank" rel="noreferrer" className="group relative block overflow-hidden bg-[#efefed]"><RemoteImage src={special.image} alt={special.label || 'Aperçu vidéo'} className="aspect-[16/9] w-full object-cover" /><span className="absolute inset-0 flex items-center justify-center bg-black/25 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">Ouvrir la vidéo</span></a><figcaption className="text-center text-[10px] text-[#77736c]">{special.label || 'Voir la vidéo'}</figcaption></figure>;
  if (special.type === 'qr') return <figure className="flex flex-col items-center gap-2"><RemoteImage src={special.image} alt={special.label || 'QR code'} className="h-28 w-28 object-cover" /><figcaption className="text-[10px] text-[#77736c]">{special.label || special.url}</figcaption></figure>;
  const className = special.type === 'cover' ? 'aspect-[1240/1754]' : special.type === 'banner' ? 'aspect-[4/1]' : 'aspect-[8/5]';
  return <RemoteImage src={special.url} alt={special.alt || special.type} className={`w-full object-cover ${className}`} />;
}

function RemoteImage({ src, alt, className }: { src?: string; alt: string; className: string }) {
  const fallback = <div className={`${className} flex items-center justify-center bg-[#efefed] text-[10px] uppercase tracking-[0.12em] text-[#99958d]`}><span className="flex items-center gap-1"><ImageIcon size={13} /> Image indisponible</span></div>;
  return src ? <img src={src} alt={alt} className={className} onError={(event) => { event.currentTarget.replaceWith(fallback as unknown as Node); }} /> : fallback;
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^\)]+\))/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer" className="underline decoration-[#999] underline-offset-2">{link[1]}</a>;
    return <span key={index}>{part}</span>;
  });
}
