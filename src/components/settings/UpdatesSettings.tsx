import { useEffect, useState } from 'react';
import { Download, ExternalLink, Loader2, RefreshCw, RotateCw } from 'lucide-react';
import { isTauri, openExternal } from '../../lib/api';
import {
  checkForUpdate,
  installUpdate,
  relaunchApp,
  RELEASES_URL,
  type UpdateInfo,
} from '../../lib/updater';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { SettingsGroup, SettingRow } from './parts';

type Phase =
  | { id: 'idle' }
  | { id: 'checking' }
  | { id: 'upToDate' }
  | { id: 'available'; info: UpdateInfo }
  | { id: 'downloading'; info: UpdateInfo; percent: number | null }
  | { id: 'ready'; info: UpdateInfo }
  | { id: 'error'; message: string };

export function UpdatesSettings() {
  const [version, setVersion] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ id: 'idle' });

  useEffect(() => {
    if (!isTauri) return;
    void import('@tauri-apps/api/app').then(({ getVersion }) => getVersion()).then(setVersion);
  }, []);

  async function check() {
    setPhase({ id: 'checking' });
    try {
      const result = await checkForUpdate();
      if (result.status === 'available') setPhase({ id: 'available', info: result.info });
      else setPhase({ id: 'upToDate' });
    } catch (e) {
      setPhase({ id: 'error', message: String(e) });
    }
  }

  async function install(info: UpdateInfo) {
    setPhase({ id: 'downloading', info, percent: null });
    try {
      await installUpdate((percent) => setPhase({ id: 'downloading', info, percent }));
      setPhase({ id: 'ready', info });
    } catch (e) {
      setPhase({ id: 'error', message: String(e) });
    }
  }

  const busy = phase.id === 'checking' || phase.id === 'downloading';

  return (
    <>
      <SettingsGroup title="Version">
        <SettingRow label="Version installée" description="La version de Taffk en cours d'exécution.">
          <span className="font-mono text-sm text-muted-foreground">
            {version ? `v${version}` : '—'}
          </span>
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="Mises à jour">
        <SettingRow
          label="Rechercher les mises à jour"
          description={
            isTauri
              ? 'Vérifie la dernière release GitHub. Rien n\'est téléchargé sans votre accord.'
              : 'Disponible uniquement dans l\'application de bureau.'
          }
        >
          <Button variant="outline" size="sm" disabled={!isTauri || busy} onClick={() => void check()}>
            {phase.id === 'checking' ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Rechercher
          </Button>
        </SettingRow>

        {phase.id === 'upToDate' && (
          <SettingRow label="Taffk est à jour" description="Aucune nouvelle version disponible." />
        )}

        {phase.id === 'available' && !phase.info.portable && (
          <SettingRow
            label={`Nouvelle version disponible : v${phase.info.version}`}
            description="L'installateur sera téléchargé puis lancé ; Taffk redémarrera ensuite."
          >
            <Button size="sm" onClick={() => void install(phase.info)}>
              <Download /> Télécharger et installer
            </Button>
          </SettingRow>
        )}

        {phase.id === 'available' && phase.info.portable && (
          <SettingRow
            label={`Nouvelle version disponible : v${phase.info.version}`}
            description="La version portable ne peut pas se mettre à jour toute seule : téléchargez le nouvel exécutable depuis la page de release."
          >
            <Button size="sm" variant="outline" onClick={() => void openExternal(RELEASES_URL)}>
              <ExternalLink /> Page de téléchargement
            </Button>
          </SettingRow>
        )}

        {phase.id === 'downloading' && (
          <SettingRow
            label={`Téléchargement de v${phase.info.version}…`}
            description={phase.percent !== null ? `${phase.percent} %` : 'En cours…'}
            stacked
          >
            <Progress value={phase.percent ?? 0} className="w-full min-w-56" />
          </SettingRow>
        )}

        {phase.id === 'ready' && (
          <SettingRow
            label={`v${phase.info.version} installée`}
            description="Redémarrez Taffk pour terminer la mise à jour."
          >
            <Button size="sm" onClick={() => void relaunchApp()}>
              <RotateCw /> Redémarrer maintenant
            </Button>
          </SettingRow>
        )}

        {phase.id === 'error' && (
          <SettingRow
            label="La vérification a échoué"
            description={phase.message}
          />
        )}
      </SettingsGroup>
    </>
  );
}
