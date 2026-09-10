# Agent IA

Taffk expose un serveur [MCP](https://modelcontextprotocol.io) (Model Context
Protocol). Une fois branché, un agent IA — Claude Code, Claude Desktop, Cursor,
Codex ou tout autre client MCP — peut lister vos tâches, en créer, les planifier,
les terminer et consigner du temps, directement dans votre base locale.

## Prérequis

Le serveur est embarqué dans `taffk-cli` (voir
[Installer `taffk-cli`](overview.md#installer-taffk-cli)). Il doit être
accessible depuis votre `PATH` :

```sh
taffk-cli --version
```

Sur Windows, si la commande n'est pas trouvée, utilisez le chemin complet du
`.exe` dans les configurations ci-dessous (par exemple
`C:\Users\vous\bin\taffk-cli.exe`).

## Configuration

Le serveur se lance avec `taffk-cli mcp` et communique sur son entrée/sortie
standard (transport *stdio*). Chaque client a sa manière de le déclarer.

### Claude Code

```sh
claude mcp add --scope user taffk -- taffk-cli mcp
```

`--scope user` rend le serveur disponible dans tous vos projets. Vérifiez avec
`claude mcp list`, ou tapez `/mcp` dans une session.

### Claude Desktop

Ouvrez *Paramètres → Développeur → Modifier la configuration* et ajoutez le
serveur dans `claude_desktop_config.json` :

```json
{
  "mcpServers": {
    "taffk": {
      "command": "taffk-cli",
      "args": ["mcp"]
    }
  }
}
```

Redémarrez Claude Desktop : l'icône des outils affiche `taffk`.

### Cursor

Dans `~/.cursor/mcp.json` (global) ou `.cursor/mcp.json` (projet) :

```json
{
  "mcpServers": {
    "taffk": {
      "command": "taffk-cli",
      "args": ["mcp"]
    }
  }
}
```

### Codex

```sh
codex mcp add taffk -- taffk-cli mcp
```

### Autre base que celle de l'application

Ajoutez la variable d'environnement `TAFFK_DB` à la configuration du serveur
(`"env": { "TAFFK_DB": "/chemin/vers/autre.db" }`), ou passez `--db` avant
`mcp` : `taffk-cli --db /chemin/vers/autre.db mcp`.

## Outils disponibles

| Outil | Ce qu'il fait |
| --- | --- |
| `list_tasks` | Liste les tâches ; filtres `query`, `project`, `tag`, `status`, `scheduledFor`, `includeDone`, `includeArchived`. |
| `get_task` | Une tâche complète, notes markdown comprises. |
| `create_task` | Crée une tâche (titre avec `#etiquette` / `@projet`, dates, estimation, sous-tâche). |
| `update_task` | Modifie les champs fournis ; `null` efface projet, dates ou parent. |
| `complete_task` | Termine ou rouvre une tâche, avec cascade sur les sous-tâches. |
| `archive_task` | Archive ou restaure une tâche. |
| `delete_task` | Supprime définitivement une tâche. |
| `list_projects` · `create_project` · `update_project` · `delete_project` | Projets, avec alias, couleur, épinglage, archivage. |
| `list_tags` · `create_tag` · `delete_tag` | Étiquettes. |
| `log_time` | Enregistre une session de travail ou de pause (en minutes). |
| `time_summary` | Temps de travail et de pause d'une journée, par tâche. |
| `stats` | Compteurs, date du jour et temps travaillé aujourd'hui. |

Chaque outil renvoie du JSON avec les noms résolus (`projectName`, `tagNames`)
et un `shortId` de 8 caractères, réutilisable tel quel dans l'appel suivant.

## Conventions

- **Identifiants** — un id complet, un préfixe unique (les 8 premiers
  caractères suffisent) ou le titre exact d'une tâche. Un projet se désigne par
  son nom, son alias ou son id ; une étiquette par son nom.
- **Syntaxe rapide** — dans un titre, `#etiquette` ajoute une étiquette (créée
  si besoin) et `@projet` rattache au projet (créé s'il n'existe pas), comme
  dans la saisie rapide de l'application.
- **Dates** — `YYYY-MM-DD`, ou `today` / `tomorrow` (aussi `aujourd'hui`,
  `demain`). Les dates sont locales à votre machine. La vue *Aujourd'hui* de
  l'application correspond à `scheduledFor: "today"`.
- **Statut** — `todo`, `in_progress` ou `done`. Passer en `done` coche la
  tâche, tout autre statut la décoche : l'agent ne peut pas les désynchroniser.
- **Listes** — par défaut, `list_tasks` cache les tâches terminées et archivées.

## Exemples de demandes

Une fois le serveur branché, parlez simplement de votre travail :

> Qu'est-ce que j'ai prévu aujourd'hui ?

> Ajoute « préparer la démo » au projet Client pour demain, 30 minutes.

> Passe la tâche « relire le contrat » en cours et note-lui 25 minutes.

> Liste ce qui est en retard dans le projet Site, et propose un ordre pour
> cette semaine.

Pour que l'agent applique ces conventions sans qu'on les lui rappelle, installez
aussi le [skill](skill.md).

## Sous le capot

`taffk-cli mcp` est un serveur MCP minimal : JSON-RPC 2.0 sur stdio, un message
par ligne, méthodes `initialize`, `tools/list` et `tools/call`. Il ouvre le
même fichier SQLite que l'application ; celle-ci détecte les écritures externes
et se rafraîchit d'elle-même. Aucune connexion réseau n'est ouverte par le
serveur. Le code vit dans `src-tauri/crates/taffk-cli/src/mcp.rs`.
