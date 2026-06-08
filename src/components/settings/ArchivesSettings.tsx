import { ArchiveRestore, PanelRight, Trash2 } from 'lucide-react';
import { useStore } from '../../lib/store';
import { confirm } from '../../lib/confirm';
import { Button } from '../ui/button';
import { SettingsGroup, SettingRow } from './parts';

export function ArchivesSettings() {
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const archiveProject = useStore((s) => s.archiveProject);
  const removeProject = useStore((s) => s.removeProject);
  const archiveTask = useStore((s) => s.archiveTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const selectTask = useStore((s) => s.selectTask);

  const archivedProjects = projects.filter((p) => p.archived);
  const archivedTasks = tasks.filter((t) => t.archived);

  async function confirmRemoveProject(id: string, name: string) {
    const ok = await confirm({
      title: 'Supprimer définitivement ?',
      description: `« ${name} » sera supprimé. Ses tâches sont conservées mais détachées du projet.`,
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (ok) await removeProject(id);
  }

  async function confirmRemoveTask(id: string, title: string) {
    const ok = await confirm({
      title: 'Supprimer définitivement ?',
      description: `« ${title} » sera supprimée.`,
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (ok) await deleteTask(id);
  }

  return (
    <>
      <SettingsGroup title="Projets archivés">
        {archivedProjects.length === 0 ? (
          <SettingRow
            label="Aucun projet archivé"
            description="Archivez un projet depuis le menu « … » de la barre latérale."
          />
        ) : (
          archivedProjects.map((p) => {
            const count = tasks.filter((t) => t.projectId === p.id).length;
            return (
              <SettingRow key={p.id} label={p.name} description={`${count} tâche${count > 1 ? 's' : ''}`}>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => void archiveProject(p.id, false)}>
                    <ArchiveRestore /> Restaurer
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => void confirmRemoveProject(p.id, p.name)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </SettingRow>
            );
          })
        )}
      </SettingsGroup>

      <SettingsGroup title="Tâches archivées">
        {archivedTasks.length === 0 ? (
          <SettingRow
            label="Aucune tâche archivée"
            description="Archivez une tâche terminée via l'icône d'archive sur sa ligne."
          />
        ) : (
          archivedTasks.map((t) => (
            <SettingRow key={t.id} label={t.title}>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={() => void archiveTask(t.id, false)}>
                  <ArchiveRestore /> Restaurer
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => void confirmRemoveTask(t.id, t.title)}
                >
                  <Trash2 />
                </Button>
                <Button variant="ghost" size="icon" title="Consulter" onClick={() => selectTask(t.id)}>
                  <PanelRight />
                </Button>
              </div>
            </SettingRow>
          ))
        )}
      </SettingsGroup>
    </>
  );
}
