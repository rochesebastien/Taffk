---
name: taffk
description: Gère les tâches, projets, étiquettes et temps de travail de l'utilisateur dans Taffk (gestionnaire de travail local, base SQLite sur la machine). À utiliser dès que l'utilisateur parle de ses tâches, de son planning du jour, de ses projets, ou demande d'ajouter, planifier, terminer ou retrouver quelque chose à faire.
---

# Taffk

Taffk est un gestionnaire de travail personnel, local-first. Toutes les données
(tâches, projets, étiquettes, sessions de focus) vivent dans un seul fichier
SQLite sur la machine de l'utilisateur. Tu y accèdes de deux façons, à choisir
dans cet ordre :

1. **Les outils MCP `taffk`** s'ils sont disponibles dans ta session
   (`list_tasks`, `create_task`, `update_task`, …). C'est la voie normale.
2. **La CLI `taffk-cli`** sinon, toujours avec `--json` pour un résultat
   structuré : `taffk-cli --json task list --today`.

L'application de bureau se rafraîchit d'elle-même après une écriture externe :
inutile de demander à l'utilisateur de relancer quoi que ce soit.

## Modèle de données

- **Tâche** : `title`, `notes` (markdown), `status` (`todo` · `in_progress` ·
  `done`), `scheduledFor` (jour planifié, `YYYY-MM-DD`), `scheduledTime`
  (`HH:MM`), `dueDate`, `estimateMinutes`, `spentMinutes`, `projectId`,
  `tagIds`, `parentId` (sous-tâche), `archived`.
- **Projet** : `name`, `alias` (raccourci pour `@alias`), `color`, `pinned`,
  `archived`.
- **Étiquette** : `name`, `color`.
- **Temps** : une entrée par session de focus (`work` ou `break`), en secondes.

`done` et `status` ne divergent jamais : passer une tâche en `done` la coche,
tout autre statut la décoche. Les outils et la CLI s'en chargent — ne les
modifie jamais séparément.

## Conventions

- **Identifiants** : les ids sont des UUID. Les outils acceptent un id complet,
  un préfixe unique (les 8 premiers caractères suffisent), ou le titre exact.
  Un projet se désigne par son nom, son alias ou son id ; une étiquette par son
  nom.
- **Syntaxe rapide** : dans un titre, `#etiquette` ajoute une étiquette et
  `@projet` rattache au projet (créé s'il n'existe pas). `Relire le contrat
  #urgent @Client` crée la tâche « Relire le contrat ».
- **Dates** : `YYYY-MM-DD`, ou `today` / `tomorrow` (aussi `aujourd'hui`,
  `demain`). Les dates sont locales à la machine de l'utilisateur.
- **Vue « Aujourd'hui »** = tâches dont `scheduledFor` est la date du jour.
  Planifier pour aujourd'hui, c'est mettre `scheduledFor: "today"`.
- Par défaut les listes cachent les tâches terminées et archivées ; demande-les
  explicitement (`includeDone`, `--done`) quand c'est pertinent.

## Façons de travailler

**Planifier la journée** : liste ce qui est prévu aujourd'hui, ce qui est en
retard (`dueDate` passée, non terminée) et le backlog du projet en cours, puis
propose un ordre. Ne planifie rien sans l'accord de l'utilisateur.

**Capturer** : quand l'utilisateur mentionne quelque chose à faire, crée la
tâche tout de suite avec le projet et les étiquettes qui vont de soi, et dis-le
en une ligne. Ne demande pas de confirmation pour une simple création.

**Clore** : marque `done` ce que l'utilisateur dit avoir fini. Si la tâche a
des sous-tâches, elles suivent.

**Consigner du temps** : `log_time` (ou `taffk-cli time log`) ajoute des
minutes de travail à une tâche ; `time_summary` donne le total du jour.

**Retrouver** : cherche par mot-clé (`query`) avant de dire qu'une tâche
n'existe pas. En cas d'ambiguïté, l'outil renvoie les candidats : présente-les
plutôt que de deviner.

## Garde-fous

- **Ne supprime jamais** une tâche, un projet ou une étiquette sans que
  l'utilisateur l'ait demandé explicitement. Préfère `archived` quand il veut
  « faire du tri ».
- Ne modifie pas `notes` d'une tâche existante sans montrer ce que tu remplaces :
  les notes sont du markdown écrit par l'utilisateur.
- Ne crée pas de projets ou d'étiquettes en cascade « au cas où » ; réutilise
  ceux qui existent (`list_projects`, `list_tags`).
- Réponds court : une tâche créée, c'est une ligne avec son titre et son
  projet, pas un tableau.
