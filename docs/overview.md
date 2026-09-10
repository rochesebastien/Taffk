# Vue d'ensemble

Tout ce qui constitue Taffk — tâches, projets, étiquettes, temps de focus — est
accessible en dehors de l'application : depuis un terminal avec la CLI, et
depuis un agent IA grâce au serveur MCP. Un skill apprend en plus à l'agent
comment s'en servir correctement.

## Comment ça s'articule

Taffk range tout dans **un seul fichier SQLite** sur votre machine. L'application
de bureau, la CLI et le serveur MCP ouvrent ce même fichier : il n'y a ni
serveur, ni synchronisation, ni compte.

```
Application Taffk  ─┐
taffk-cli           ├──▶  taffk.db (SQLite, local)
taffk-cli mcp  ◀─ agent IA (Claude Code, Claude Desktop, Cursor, Codex…)
```

Quand la CLI ou un agent écrit dans la base, l'application ouverte le remarque
et se rafraîchit d'elle-même dans la seconde. Inutile de la relancer.

| Système | Emplacement de `taffk.db` |
| --- | --- |
| Windows | `%APPDATA%\com.taffk.app\taffk.db` |
| macOS | `~/Library/Application Support/com.taffk.app/taffk.db` |
| Linux | `~/.local/share/com.taffk.app/taffk.db` |

`taffk-cli db path` affiche le chemin effectivement utilisé. La variable
d'environnement `TAFFK_DB` ou l'option `--db` permettent d'en cibler un autre,
par exemple une base de test.

## Installer `taffk-cli`

La CLI et le serveur MCP sont un seul binaire, `taffk-cli`. Il n'est pas
installé avec l'application : récupérez-le d'une des deux façons suivantes.

**Depuis une release GitHub** — sur la
[page des releases](https://github.com/rochesebastien/Taffk/releases),
téléchargez `taffk-cli_<version>_x64.exe` (Windows) ou
`taffk-cli_<version>_universal` (macOS), renommez-le `taffk-cli` et placez-le
dans un dossier de votre `PATH`. Sur macOS, rendez-le exécutable et levez la
quarantaine :

```sh
chmod +x taffk-cli && xattr -d com.apple.quarantine taffk-cli
```

**Depuis le code source** — avec une chaîne Rust installée :

```sh
cargo install --git https://github.com/rochesebastien/Taffk taffk-cli
```

Vérifiez ensuite que tout est en place :

```sh
taffk-cli --version
taffk-cli stats
```

## Trois portes d'entrée

- **[Agent IA](agents.md)** — branchez le serveur MCP dans Claude Code, Claude
  Desktop, Cursor ou Codex. L'agent voit vos tâches et peut en créer, planifier,
  terminer, consigner du temps.
- **[CLI](cli.md)** — `taffk-cli task add "Relire le contrat #urgent @Client"`
  et toute la gestion depuis le terminal, avec une sortie `--json` pour vos
  scripts.
- **[Skill](skill.md)** — un fichier `SKILL.md` à installer dans Claude Code
  (ou tout agent compatible) pour qu'il applique les bonnes conventions :
  syntaxe rapide, dates, statut, garde-fous.

## Ce qui reste local

Aucune de ces portes n'envoie quoi que ce soit sur le réseau : la CLI et le
serveur MCP ne parlent qu'au fichier SQLite. En revanche, ce qu'un agent lit via
les outils MCP (titres, notes, projets) transite par le modèle de cet agent,
comme n'importe quel contexte que vous lui donnez. Branchez le serveur MCP dans
les clients que vous utilisez déjà en connaissance de cause.
