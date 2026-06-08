# Site vitrine — Taffk

Landing page statique pour Taffk. Aucune étape de build : trois fichiers, zéro dépendance.

```
website/
  index.html   — structure + contenu (FR)
  styles.css   — design system (tokens, thème clair/sombre, responsive)
  app.js       — thème persisté, reveal au scroll, démo de saisie #tag @projet
```

## Aperçu local

Ouvrez `index.html` directement, ou servez le dossier :

```sh
cd website && python3 -m http.server 4321
# puis http://localhost:4321
```

## Design

- **Couleur de marque** : bleu électrique `#1218fc` (identique au logo de l'app).
- **Typographie** : Bricolage Grotesque (titres), Geist (corps), Geist Mono (code/raccourcis) — chargées via Google Fonts.
- **Direction** : refined minimal (Linear / Apple), fidèle à l'app. Thème clair par
  défaut, bascule sombre persistée (`taffk.site.theme`), respecte `prefers-color-scheme`
  et `prefers-reduced-motion`.

Le visuel produit du hero, le mini-Kanban, le planning, la heatmap et la démo
clavier sont entièrement construits en HTML/CSS — aucune capture d'écran requise.
