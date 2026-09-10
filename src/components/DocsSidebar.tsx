import {
  ArrowLeft,
  BookOpen,
  Bot,
  ExternalLink,
  GitGraph,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Terminal,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { openExternal } from '../lib/api';
import { useStore, type DocsSection } from '../lib/store';
import { useTheme } from '../lib/theme';
import {
  useSidebar,
  SIDEBAR_COLLAPSED,
  SIDEBAR_DEFAULT,
  SIDEBAR_MAX,
  SIDEBAR_MIN,
} from '../lib/sidebar';
import { cn } from '../lib/utils';
import { NavItem } from './Sidebar';
import { PanelResizeHandle } from './PanelResizeHandle';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import logoDark from '../assets/logo_navbar_dark.svg';
import logoLight from '../assets/logo_navbar_light.svg';
import logoAlone from '../assets/logo_alone.svg';

export const DOCS_SECTIONS: { id: DocsSection; icon: LucideIcon; label: string; description: string }[] = [
  { id: 'overview', icon: BookOpen, label: "Vue d'ensemble", description: 'Comment Taffk s’ouvre aux agents et au terminal.' },
  { id: 'agents', icon: Bot, label: 'Agent IA', description: 'Brancher Claude Code, Claude Desktop, Cursor ou Codex via MCP.' },
  { id: 'cli', icon: Terminal, label: 'CLI', description: 'Gérer tâches, projets et temps depuis le terminal.' },
  { id: 'skill', icon: Sparkles, label: 'Skill', description: 'Apprendre à un agent comment bien travailler avec Taffk.' },
];

const LINKS: { icon: LucideIcon; label: string; url: string }[] = [
  { icon: GitGraph, label: 'Code source', url: 'https://github.com/rochesebastien/Taffk' },
  { icon: ExternalLink, label: 'Model Context Protocol', url: 'https://modelcontextprotocol.io' },
];

const railBtn =
  'group flex w-full items-center justify-center rounded-md px-2 py-2 text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground';

export function DocsSidebar() {
  const { theme } = useTheme();
  const { width, setWidth, collapsed, toggleCollapsed } = useSidebar();
  const [dragging, setDragging] = useState(false);
  const section = useStore((s) => s.docsSection);
  const setSection = useStore((s) => s.setDocsSection);
  const closeDocs = useStore((s) => s.closeDocs);

  return (
    <aside
      style={{ width: collapsed ? SIDEBAR_COLLAPSED : width }}
      className={cn(
        'relative flex h-full max-w-[calc(100vw-4rem)] shrink-0 flex-col border-r border-sidebar-border bg-sidebar py-4 text-sidebar-foreground md:max-w-[45vw]',
        collapsed ? 'px-2' : 'px-3',
        !dragging && 'transition-[width] duration-200 ease-out',
      )}
    >
      {collapsed ? (
        <div className="mb-2 flex flex-col items-center gap-2">
          <img className="size-8" src={logoAlone} alt="Taffk" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={toggleCollapsed} className={railBtn} title="Déployer le menu">
                <PanelLeftOpen size={18} className="text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Déployer le menu</TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <div className="flex items-center justify-between pb-4 pl-2 pr-1">
          <img className="h-8 w-auto" src={theme === 'light' ? logoDark : logoLight} alt="Taffk" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleCollapsed}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <PanelLeftClose size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Réduire le menu</TooltipContent>
          </Tooltip>
        </div>
      )}

      <NavItem
        icon={ArrowLeft}
        label="Revenir à l'application"
        collapsed={collapsed}
        active={false}
        onClick={closeDocs}
      />

      {!collapsed && (
        <div className="mb-1 mt-4 px-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Documentation
        </div>
      )}
      <nav className={cn('flex flex-col gap-0.5', collapsed && 'mt-1.5')}>
        {DOCS_SECTIONS.map((s) => (
          <NavItem
            key={s.id}
            icon={s.icon}
            label={s.label}
            collapsed={collapsed}
            active={section === s.id}
            onClick={() => setSection(s.id)}
          />
        ))}
      </nav>

      <div className="flex-1" />

      <nav className="flex flex-col gap-0.5 border-t border-sidebar-border pt-3">
        {LINKS.map((l) => (
          <NavItem
            key={l.label}
            icon={l.icon}
            label={l.label}
            collapsed={collapsed}
            active={false}
            external
            onClick={() => void openExternal(l.url)}
          />
        ))}
      </nav>

      <div className="h-32 shrink-0" />

      {!collapsed && (
        <PanelResizeHandle
          side="left"
          value={width}
          min={SIDEBAR_MIN}
          max={SIDEBAR_MAX}
          defaultValue={SIDEBAR_DEFAULT}
          label="Redimensionner le panneau de documentation"
          onChange={setWidth}
          onDraggingChange={setDragging}
        />
      )}
    </aside>
  );
}
