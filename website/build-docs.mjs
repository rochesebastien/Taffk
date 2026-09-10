// Génère website/docs/*.html à partir de docs/*.md (source unique de la doc).
// Le site reste statique et sans build côté Vercel : les pages générées sont
// commitées. Relancer après toute modification des .md :
//
//   npm run docs:build
//
// markdown-it vient des dépendances du dépôt (node_modules à la racine).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, 'docs');

const PAGES = [
  { md: 'overview.md', html: 'index.html', label: "Vue d'ensemble", description: 'Comment Taffk s’ouvre aux agents et au terminal : CLI, serveur MCP, skill.' },
  { md: 'agents.md', html: 'agent-ia.html', label: 'Agent IA', description: 'Brancher Claude Code, Claude Desktop, Cursor ou Codex sur Taffk via MCP.' },
  { md: 'cli.md', html: 'cli.html', label: 'CLI', description: 'Gérer tâches, projets, étiquettes et temps depuis le terminal avec taffk-cli.' },
  { md: 'skill.md', html: 'skill.html', label: 'Skill', description: 'Apprendre à un agent comment bien travailler avec Taffk.' },
];

const ICONS = {
  'index.html': '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  'agent-ia.html': '<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 16h.01M16 16h.01"/>',
  'cli.html': '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
  'skill.html': '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
};

const slugify = (text) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const mdToHtml = Object.fromEntries(PAGES.map((p) => [p.md, p.html]));

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

md.core.ruler.push('heading_ids', (state) => {
  const tokens = state.tokens;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'heading_open') continue;
    tokens[i].attrSet('id', slugify(plainText(tokens[i + 1])));
  }
});

// Liens entre pages (`cli.md#ancre`) → pages générées ; liens externes dans un nouvel onglet.
const defaultLink = md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const href = token.attrGet('href') ?? '';
  const [file, hash] = href.split('#');
  if (mdToHtml[file]) {
    token.attrSet('href', mdToHtml[file] + (hash ? `#${hash}` : ''));
  } else if (/^https?:/.test(href)) {
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noopener');
  }
  return defaultLink(tokens, idx, options, env, self);
};

function plainText(inline) {
  return (inline?.children ?? [])
    .filter((t) => t.type === 'text' || t.type === 'code_inline')
    .map((t) => t.content)
    .join('');
}

function render(page) {
  const src = readFileSync(join(root, 'docs', page.md), 'utf8');
  const tokens = md.parse(src, {});
  const headings = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === 'heading_open' && tokens[i].tag === 'h2') {
      headings.push({ id: tokens[i].attrGet('id'), text: plainText(tokens[i + 1]) });
    }
  }
  return { body: md.renderer.render(tokens, md.options, {}), headings };
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function icon(html) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[html]}</svg>`;
}

function layout(page, { body, headings }) {
  const sideNav = PAGES.map(
    (p) => `<a href="${p.html}"${p.html === page.html ? ' class="active" aria-current="page"' : ''}>${icon(p.html)}<span>${escape(p.label)}</span></a>`,
  ).join('\n            ');
  const toc = headings.map((h) => `<a href="#${h.id}">${escape(h.text)}</a>`).join('\n              ');
  const cards =
    page.html === 'index.html'
      ? `<div class="docs-cards">
            ${PAGES.filter((p) => p.html !== 'index.html')
              .map(
                (p) => `<a class="docs-card" href="${p.html}">
              ${icon(p.html)}
              <strong>${escape(p.label)}</strong>
              <span>${escape(p.description)}</span>
            </a>`,
              )
              .join('\n            ')}
          </div>`
      : '';

  // Sur l'accueil, les cartes viennent après le titre et son chapeau.
  const article = cards ? body.replace('</p>', `</p>\n          ${cards}`) : body;

  return `<!DOCTYPE html>
<html lang="fr" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escape(page.label)} — Documentation Taffk</title>
    <meta name="description" content="${escape(page.description)}" />
    <meta name="robots" content="index,follow" />
    <meta name="theme-color" content="#1218fc" />
    <meta property="og:title" content="${escape(page.label)} — Documentation Taffk" />
    <meta property="og:description" content="${escape(page.description)}" />
    <meta property="og:type" content="article" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..700&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="../styles.css" />
    <link rel="icon" type="image/png" sizes="128x128" href="../assets/favicon-128.png" />
    <link rel="icon" type="image/png" sizes="32x32" href="../assets/favicon-32.png" />
  </head>
  <body>
    <nav class="nav" id="nav">
      <div class="container nav-inner">
        <a href="../index.html" class="brand" aria-label="Taffk — accueil">
          <img class="brand-logo light-only" src="../assets/logo_navbar_dark.png" alt="Taffk" />
          <img class="brand-logo dark-only" src="../assets/logo_navbar_light.png" alt="Taffk" />
        </a>
        <div class="nav-links">
          <a href="../index.html#features">Fonctionnalités</a>
          <a href="../index.html#keyboard">Clavier</a>
          <a href="index.html" class="active">Documentation</a>
        </div>
        <div class="nav-actions">
          <button class="theme-toggle" id="themeToggle" aria-label="Changer de thème">
            <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
            <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
          </button>
          <a href="../index.html#download" class="btn btn-primary">Télécharger</a>
        </div>
      </div>
    </nav>

    <main class="docs">
      <div class="container docs-layout">
        <aside class="docs-nav">
          <div class="docs-nav-title">Documentation</div>
          <nav>
            ${sideNav}
          </nav>
          <div class="docs-nav-foot">
            <a href="https://github.com/rochesebastien/Taffk" target="_blank" rel="noopener">Code source ↗</a>
            <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener">Model Context Protocol ↗</a>
          </div>
        </aside>

        <article class="docs-content">
          <div class="docs-crumbs"><a href="index.html">Documentation</a><span>/</span><span>${escape(page.label)}</span></div>
          ${article}
          <div class="docs-foot">
            <span>Cette page est générée depuis <a href="https://github.com/rochesebastien/Taffk/blob/main/docs/${page.md}" target="_blank" rel="noopener"><code>docs/${page.md}</code></a>.</span>
          </div>
        </article>

        <aside class="docs-toc">
          ${headings.length > 1 ? `<div class="docs-toc-title">Sur cette page</div>
            <nav>
              ${toc}
            </nav>` : ''}
        </aside>
      </div>
    </main>

    <script src="../app.js"></script>
  </body>
</html>
`;
}

mkdirSync(outDir, { recursive: true });
for (const page of PAGES) {
  writeFileSync(join(outDir, page.html), layout(page, render(page)));
  console.log(`docs/${page.md} → website/docs/${page.html}`);
}
