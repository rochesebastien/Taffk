import {
  Archive,
  ArrowLeft,
  Command,
  Database,
  Eclipse,
  GitGraph,
  Globe,
  HandHeart,
  MessageCircleQuestionMark,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Settings,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { openExternal } from '../lib/api';
import { useStore, type SettingsSection } from '../lib/store';
import { useTheme } from '../lib/theme';
import { useSidebar, SIDEBAR_COLLAPSED } from '../lib/sidebar';
import { cn } from '../lib/utils';
import { NavItem } from './Sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import logoDark from '../assets/logo_navbar_dark.png';
import logoLight from '../assets/logo_navbar_light.png';
import logoAlone from '../assets/logo_alone.png';

const SECTIONS: { id: SettingsSection; icon: LucideIcon; label: string }[] = [
  { id: 'general', icon: Settings, label: 'Général' },
  { id: 'profile', icon: UserRound, label: 'Profil' },
  { id: 'appearance', icon: Eclipse, label: 'Apparence' },
  { id: 'archives', icon: Archive, label: 'Archives' },
  { id: 'data', icon: Database, label: 'Données' },
  { id: 'shortcuts', icon: Command, label: 'Raccourcis clavier' },
  { id: 'updates', icon: RefreshCw, label: 'Mises à jour' },
];

const LINKS: { icon: LucideIcon; label: string; url: string }[] = [
    {
    icon: MessageCircleQuestionMark,
    label: 'Signaler un bug',
    url: 'https://github.com/rochesebastien/Taffk/issues',
  },
  { icon: Globe, label: 'Site vitrine', url: 'https://taffk.vercel.app/' },
  { icon: GitGraph, label: 'Lien du Github', url: 'https://github.com/rochesebastien/Taffk' },
  { icon: HandHeart, label: 'Créateur de Taffk', url: 'https://sebastien-roche.fr' }
];

const railBtn =
  'group flex w-full items-center justify-center rounded-md px-2 py-2 text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground';

export function SettingsSidebar() {
  const { theme } = useTheme();
  const { width, collapsed, toggleCollapsed } = useSidebar();
  const section = useStore((s) => s.settingsSection);
  const setSection = useStore((s) => s.setSettingsSection);
  const closeSettings = useStore((s) => s.closeSettings);

  return (
    <aside
      style={{ width: collapsed ? SIDEBAR_COLLAPSED : width }}
      className={cn(
        'relative flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar py-4 text-sidebar-foreground',
        collapsed ? 'px-2' : 'px-3',
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
        onClick={closeSettings}
      />

      <nav className="mt-1.5 flex flex-col gap-0.5">
        {SECTIONS.map((s) => (
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
    </aside>
  );
}
