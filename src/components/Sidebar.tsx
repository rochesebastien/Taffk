import { useState } from 'react';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';
import logoDark from '../assets/logo_navbar_dark.png';
import logoLight from '../assets/logo_navbar_light.png';

export function Sidebar() {
  const { theme, toggle } = useTheme();
  const view = useStore((s) => s.view);
  const activeProjectId = useStore((s) => s.activeProjectId);
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const setView = useStore((s) => s.setView);
  const openProject = useStore((s) => s.openProject);
  const addProject = useStore((s) => s.addProject);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = tasks.filter((t) => !t.done && t.scheduledFor === today).length;
  const allCount = tasks.filter((t) => !t.done).length;

  async function submitProject(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      const p = await addProject(trimmed);
      openProject(p.id);
    }
    setName('');
    setAdding(false);
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <img className="sidebar-logo" src={theme === 'light' ? logoLight : logoDark} alt="Taffk" />
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${view === 'today' ? 'active' : ''}`}
          onClick={() => setView('today')}
        >
          <span className="nav-icon">◎</span>
          <span className="nav-label">Aujourd'hui</span>
          {todayCount > 0 && <span className="nav-count">{todayCount}</span>}
        </button>
        <button
          className={`nav-item ${view === 'all' ? 'active' : ''}`}
          onClick={() => setView('all')}
        >
          <span className="nav-icon">≡</span>
          <span className="nav-label">Toutes les tâches</span>
          {allCount > 0 && <span className="nav-count">{allCount}</span>}
        </button>
      </nav>

      <div className="sidebar-section">
        <div className="sidebar-section-head">
          <span>Projets</span>
          <button className="icon-btn" title="Nouveau projet" onClick={() => setAdding(true)}>
            +
          </button>
        </div>
        <div className="project-list">
          {projects.map((p) => {
            const count = tasks.filter((t) => !t.done && t.projectId === p.id).length;
            return (
              <button
                key={p.id}
                className={`nav-item ${view === 'project' && activeProjectId === p.id ? 'active' : ''}`}
                onClick={() => openProject(p.id)}
              >
                <span className="project-dot" style={{ background: p.color ?? 'var(--text-faint)' }} />
                <span className="nav-label">{p.name}</span>
                {count > 0 && <span className="nav-count">{count}</span>}
              </button>
            );
          })}
          {adding && (
            <form onSubmit={submitProject} className="project-add-form">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={submitProject}
                placeholder="Nom du projet"
                className="project-add-input"
              />
            </form>
          )}
        </div>
      </div>

      <div className="sidebar-foot">
        <button className="foot-btn" onClick={toggle} title="Changer de thème">
          {theme === 'dark' ? '☾' : '☀'}
          <span>{theme === 'dark' ? 'Sombre' : 'Clair'}</span>
        </button>
      </div>
    </aside>
  );
}
