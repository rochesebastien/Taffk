# Skill

Un *skill* est un dossier contenant un fichier `SKILL.md` : quelques
instructions que Claude Code (et les agents compatibles) charge à la demande,
quand la conversation s'y prête. Le skill `taffk` explique à l'agent comment
sont organisées vos données, quelles conventions respecter et où placer ses
garde-fous — ce que les outils MCP seuls ne disent pas.

## Installation

Le skill est embarqué dans `taffk-cli`. Pour l'installer dans Claude Code, au
niveau utilisateur (`~/.claude/skills/taffk/SKILL.md`) :

```sh
taffk-cli skill install
```

Pour le limiter à un projet, ciblez son dossier `.claude/skills` :

```sh
taffk-cli skill install --dir .claude/skills/taffk
```

Le fichier source est aussi dans le dépôt, sous `skills/taffk/SKILL.md`, si vous
préférez le copier vous-même ou l'adapter à un autre agent.

Dans Claude Code, `/taffk` l'invoque explicitement ; il se déclenche sinon de
lui-même dès que vous parlez de vos tâches ou de votre planning.

## Ce que le skill contient

Il tient en une page. Pour le lire :

```sh
taffk-cli skill show
```

En résumé, il indique à l'agent :

- **où chercher** — les outils MCP d'abord, `taffk-cli --json` sinon ;
- **le modèle** — tâche, projet, étiquette, temps, et l'invariant
  `done` / `status` ;
- **les conventions** — identifiants par préfixe ou titre, syntaxe `#etiquette
  @projet`, dates `today` / `tomorrow`, listes qui cachent le terminé ;
- **des façons de travailler** — planifier la journée, capturer sans
  cérémonie, clore, consigner du temps, retrouver avant de conclure que
  quelque chose n'existe pas ;
- **des garde-fous** — ne rien supprimer sans demande explicite, préférer
  l'archivage, ne pas réécrire des notes sans les montrer, réutiliser projets et
  étiquettes existants.

## Skill et MCP

Les deux se complètent :

| | Serveur MCP | Skill |
| --- | --- | --- |
| Donne à l'agent | des **outils** pour lire et écrire | une **méthode** pour bien s'en servir |
| S'installe | dans la configuration du client MCP | dans `~/.claude/skills` |
| Sans l'autre | l'agent agit, mais devine les conventions | l'agent connaît les règles, et passe par la CLI |

Avec les deux, l'agent sait par exemple qu'« aujourd'hui » veut dire
`scheduledFor: today`, qu'une tâche se désigne par son préfixe, et qu'on
n'efface pas un projet parce qu'on a dit « fais du tri ».

## Adapter le skill

`SKILL.md` est du markdown avec un en-tête `name` / `description`. La
description décide *quand* l'agent charge le skill : si vous voulez qu'il ne se
déclenche que sur demande explicite, réduisez-la. Le corps décide *comment* il
agit : ajoutez vos propres habitudes (un projet « Inbox » par défaut, une
étiquette pour les appels, une revue le vendredi) — l'agent les suivra.
