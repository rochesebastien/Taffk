import { useEffect, useMemo, useRef, type MouseEvent } from 'react';
import { ChevronRight } from 'lucide-react';
import { openExternal } from '../../lib/api';
import { renderDocs } from '../../lib/markdown';
import { useStore, type DocsSection } from '../../lib/store';
import { DOCS_SECTIONS } from '../DocsSidebar';
import overviewMd from '../../../docs/overview.md?raw';
import agentsMd from '../../../docs/agents.md?raw';
import cliMd from '../../../docs/cli.md?raw';
import skillMd from '../../../docs/skill.md?raw';
import './docs.css';

const SOURCES: Record<DocsSection, string> = {
  overview: overviewMd,
  agents: agentsMd,
  cli: cliMd,
  skill: skillMd,
};

/** `agents.md` / `cli.md#outils` links between pages map back onto sections. */
const FILE_TO_SECTION: Record<string, DocsSection> = {
  'overview.md': 'overview',
  'agents.md': 'agents',
  'cli.md': 'cli',
  'skill.md': 'skill',
};

const COPY_BUTTON_CLASS =
  'docs-copy absolute right-2 top-2 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100';

function addCopyButtons(root: HTMLElement) {
  for (const pre of root.querySelectorAll<HTMLPreElement>('pre')) {
    if (pre.querySelector('.docs-copy')) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = COPY_BUTTON_CLASS;
    button.textContent = 'Copier';
    button.addEventListener('click', () => {
      const code = pre.querySelector('code')?.textContent ?? pre.textContent ?? '';
      void navigator.clipboard.writeText(code.trimEnd()).then(() => {
        button.textContent = 'Copié';
        window.setTimeout(() => (button.textContent = 'Copier'), 1500);
      });
    });
    pre.appendChild(button);
  }
}

export function DocsView() {
  const section = useStore((s) => s.docsSection);
  const setSection = useStore((s) => s.setDocsSection);
  const meta = DOCS_SECTIONS.find((s) => s.id === section) ?? DOCS_SECTIONS[0];
  const { html, headings } = useMemo(() => renderDocs(SOURCES[section]), [section]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const proseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    if (proseRef.current) addCopyButtons(proseRef.current);
  }, [html]);

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href') ?? '';
    if (/^https?:/.test(href)) {
      e.preventDefault();
      void openExternal(href);
      return;
    }
    const [file, hash] = href.split('#');
    const target = FILE_TO_SECTION[file];
    if (target) {
      e.preventDefault();
      setSection(target);
      if (hash) window.setTimeout(() => scrollTo(hash), 0);
      return;
    }
    if (href.startsWith('#')) {
      e.preventDefault();
      scrollTo(href.slice(1));
    }
  };

  const scrollTo = (id: string) => {
    proseRef.current?.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-end justify-between gap-4 px-6 pb-4 pt-8">
        <div>
          <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            <span>Documentation</span>
            <ChevronRight size={12} />
            <span>{meta.label}</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{meta.label}</h1>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 pb-16">
        <div className="mx-auto flex max-w-5xl gap-10 pt-2">
          <div className="min-w-0 flex-1">
            {section === 'overview' && (
              <div className="mb-8 grid gap-3 sm:grid-cols-3">
                {DOCS_SECTIONS.filter((s) => s.id !== 'overview').map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSection(s.id)}
                    className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
                  >
                    <s.icon size={18} className="text-primary" />
                    <div className="text-sm font-medium">{s.label}</div>
                    <div className="text-xs leading-relaxed text-muted-foreground">{s.description}</div>
                  </button>
                ))}
              </div>
            )}
            <div
              ref={proseRef}
              onClick={onClick}
              className="preview docs-prose max-w-3xl"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>

          {headings.length > 1 && (
            <nav className="sticky top-0 hidden w-44 shrink-0 self-start xl:block">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Sur cette page</div>
              <ul className="flex flex-col gap-1 border-l border-border">
                {headings.map((h) => (
                  <li key={h.id}>
                    <button
                      onClick={() => scrollTo(h.id)}
                      className="-ml-px block w-full truncate border-l border-transparent py-0.5 pl-3 text-left text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                    >
                      {h.text}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
