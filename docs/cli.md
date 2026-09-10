# CLI

`taffk-cli` pilote Taffk depuis le terminal : ajouter une tâche sans quitter
l'éditeur, lister le plan du jour dans un script, consigner du temps à la fin
d'une session. Elle travaille sur le même fichier SQLite que l'application, qui
se rafraîchit d'elle-même.

## Installation

Voir [Installer `taffk-cli`](overview.md#installer-taffk-cli). En résumé :
binaire de la page des releases, ou

```sh
cargo install --git https://github.com/rochesebastien/Taffk taffk-cli
```

## Premiers pas

```sh
# Une tâche dans le plan du jour, avec une étiquette et un projet
taffk-cli task add "Relire le contrat #urgent @Client" --date today --time 09:30 --estimate 45

# Ce qui est prévu aujourd'hui
taffk-cli task list --today

# Avancer, puis terminer (l'identifiant est le préfixe affiché dans la liste)
taffk-cli task start aa2aea31
taffk-cli task done aa2aea31

# 25 minutes de travail sur une tâche, désignée par son titre
taffk-cli time log "Relire le contrat" 25
```

Sur macOS et Linux, mettez les titres contenant `#` entre guillemets : sans
cela, le shell prend `#urgent` pour un commentaire.

## Identifiants

Partout où une commande attend une tâche, un projet ou une étiquette, vous
pouvez donner :

- l'**id complet** ou un **préfixe unique** — les 8 caractères affichés par
  `task list` suffisent ;
- pour une tâche, son **titre exact** (insensible à la casse), ou un morceau du
  titre s'il ne correspond qu'à une tâche ;
- pour un projet, son **nom** ou son **alias** ; pour une étiquette, son **nom**.

En cas d'ambiguïté, la commande s'arrête et liste les candidats.

## Référence

### Tâches — `taffk-cli task`

| Commande | Description |
| --- | --- |
| `list` | Tâches non terminées et non archivées. `--today`, `--date`, `--project`, `--tag`, `--status`, `--query`, `--done`, `--archived`. |
| `add <titre…>` | Crée une tâche. `--project`, `--tag` (répétable), `--date`, `--time`, `--due`, `--estimate`, `--notes`, `--parent`. |
| `show <tâche>` | Détail complet, notes comprises. |
| `edit <tâche>` | `--title`, `--notes`, `--project` / `--no-project`, `--tags a,b`, `--status`, `--date` / `--no-date`, `--time` / `--no-time`, `--due` / `--no-due`, `--estimate`, `--parent` / `--no-parent`. |
| `done` · `undone` | Termine ou rouvre (cascade sur les sous-tâches). |
| `start` | Passe « en cours ». |
| `status <tâche> <statut>` | `todo`, `in_progress` ou `done`. |
| `archive <tâche>` | Archive ; `--undo` restaure. |
| `rm <tâche>` | Supprime la tâche et ses sous-tâches. |

`--project` sur `add` exige un projet existant ; `@projet` dans le titre le crée
au besoin, comme dans l'application.

### Projets — `taffk-cli project`

| Commande | Description |
| --- | --- |
| `list` | Projets et nombre de tâches ouvertes. `--archived` inclut les archivés. |
| `add <nom>` | `--alias`, `--color`. |
| `edit <projet>` | `--name`, `--alias`, `--color`. |
| `pin <projet>` | Épingle dans la barre latérale ; `--undo`. |
| `archive <projet>` | Archive ; `--undo`. |
| `rm <projet>` | Supprime le projet ; ses tâches sont conservées, sans projet. |

### Étiquettes — `taffk-cli tag`

| Commande | Description |
| --- | --- |
| `list` | Étiquettes et nombre de tâches. |
| `add <nom>` | `--color`. |
| `edit <étiquette>` | `--name`, `--color`. |
| `rm <étiquette>` | Supprime et retire des tâches. |

### Temps — `taffk-cli time`

| Commande | Description |
| --- | --- |
| `log <tâche> <minutes>` | Session de travail ; `-` à la place de la tâche pour une session libre, `--break` pour une pause. |
| `summary` | Total du jour et répartition par tâche ; `--date YYYY-MM-DD`. |

### Autres

| Commande | Description |
| --- | --- |
| `stats` | Compteurs et emplacement de la base. |
| `export <fichier>` | Sauvegarde complète en JSON (même format que l'application). |
| `import <fichier>` | Remplace toute la base par une sauvegarde. Irréversible. |
| `db path` | Chemin du fichier SQLite utilisé. |
| `mcp` | Lance le serveur MCP sur stdio — voir [Agent IA](agents.md). |
| `skill show` · `skill install` | Affiche ou installe le [skill](skill.md). |

## Sortie JSON

`--json` fait imprimer le résultat en JSON, sur toutes les commandes, avec les
mêmes champs que l'API interne de l'application (`camelCase`) plus les noms
résolus `projectName`, `tagNames` et `shortId`. Les erreurs sortent aussi en
JSON (`{"error": "…"}`) avec un code de retour non nul.

```sh
taffk-cli --json task list --today | jq -r '.[] | "\(.shortId)  \(.title)"'
```

## Base de données

Par défaut la CLI ouvre la base de l'application (voir
[Vue d'ensemble](overview.md#comment-ca-s-articule)). Pour en utiliser une
autre :

```sh
taffk-cli --db ~/taffk-test.db task list
TAFFK_DB=~/taffk-test.db taffk-cli stats
```

Le fichier est créé s'il n'existe pas. Les deux accès simultanés (application
ouverte + CLI) sont prévus : SQLite verrouille le temps d'une écriture, et
l'application recharge ses données dès qu'une autre connexion a écrit.
