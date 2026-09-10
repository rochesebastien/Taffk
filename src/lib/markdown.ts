import MarkdownIt from 'markdown-it';

const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

export function renderMarkdown(src: string): string {
  return md.render(src);
}

/** Turn a heading into a stable anchor id (`## Outils disponibles` → `outils-disponibles`). */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type DocHeading = { id: string; text: string; level: number };

const docsMd: MarkdownIt = new MarkdownIt({ html: true, linkify: true, typographer: true });

// Give every heading an id so the docs "on this page" rail can scroll to it.
docsMd.core.ruler.push('heading_ids', (state) => {
  const tokens = state.tokens;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'heading_open') continue;
    const text = tokens[i + 1]?.children?.filter((t) => t.type === 'text' || t.type === 'code_inline').map((t) => t.content).join('') ?? '';
    tokens[i].attrSet('id', slugify(text));
  }
});

/** Render a documentation page; also returns its h2 headings for the side rail. */
export function renderDocs(src: string): { html: string; headings: DocHeading[] } {
  const tokens = docsMd.parse(src, {});
  const headings: DocHeading[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'heading_open' || tokens[i].tag !== 'h2') continue;
    const text = tokens[i + 1]?.children?.filter((t) => t.type === 'text' || t.type === 'code_inline').map((t) => t.content).join('') ?? '';
    headings.push({ id: tokens[i].attrGet('id') ?? slugify(text), text, level: 2 });
  }
  return { html: docsMd.renderer.render(tokens, docsMd.options, {}), headings };
}
