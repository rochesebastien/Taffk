import { useStore, type SettingsSection } from '../../lib/store';
import { GeneralSettings } from '../settings/GeneralSettings';
import { ProfileSettings } from '../settings/ProfileSettings';
import { AppearanceSettings } from '../settings/AppearanceSettings';
import { ArchivesSettings } from '../settings/ArchivesSettings';
import { DataSettings } from '../settings/DataSettings';
import { ShortcutsSettings } from '../settings/ShortcutsSettings';

const TITLES: Record<SettingsSection, string> = {
  general: 'Général',
  profile: 'Profil',
  appearance: 'Apparence',
  archives: 'Archives',
  data: 'Données',
  shortcuts: 'Raccourcis clavier',
};

function SectionContent({ section }: { section: SettingsSection }) {
  switch (section) {
    case 'general':
      return <GeneralSettings />;
    case 'profile':
      return <ProfileSettings />;
    case 'appearance':
      return <AppearanceSettings />;
    case 'archives':
      return <ArchivesSettings />;
    case 'data':
      return <DataSettings />;
    case 'shortcuts':
      return <ShortcutsSettings />;
  }
}

export function SettingsView() {
  const section = useStore((s) => s.settingsSection);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-end justify-between gap-4 px-6 pb-4 pt-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">{TITLES[section]}</h1>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-10">
        <div className="mx-auto max-w-2xl pt-2">
          <SectionContent section={section} />
        </div>
      </div>
    </div>
  );
}
