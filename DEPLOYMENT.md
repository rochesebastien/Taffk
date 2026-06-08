# Déploiement & releases

Deux pipelines indépendants :

1. **Site vitrine** (`/website`) → déployé sur **Vercel** (intégration Git, sans CI).
2. **Application** (Tauri/Windows) → publiée en **release GitHub** via GitHub Actions.

---

## 1. Site vitrine sur Vercel

Le site est 100 % statique (`website/index.html`, `styles.css`, `app.js`, `assets/`).
Vercel le sert directement, sans étape de build. La config vit dans
[`website/vercel.json`](website/vercel.json) (en-têtes de sécurité ; `cleanUrls`
laissé désactivé pour ne pas casser les liens internes en `.html`).

### Mise en place (une seule fois)

1. Sur [vercel.com](https://vercel.com) → **Add New… → Project** → importez le
   repo GitHub `rochesebastien/Taffk`.
2. Dans la configuration du projet :
   - **Root Directory** : `website`  ← **indispensable** (sinon Vercel déploie la racine du repo).
   - **Framework Preset** : `Other`.
   - **Build Command** : *(vide)*.
   - **Output Directory** : *(vide / racine)*.
3. **Deploy**.

### Ensuite, c'est automatique

- Push sur `main` → déploiement **production**.
- Push sur une autre branche / PR → déploiement **preview** (URL dédiée).

Aucun secret ni workflow GitHub n'est nécessaire : Vercel écoute le repo directement.
Pour brancher un domaine perso : *Project → Settings → Domains*.

---

## 2. Release de l'application

Workflow : [`.github/workflows/release.yml`](.github/workflows/release.yml).
Il tourne sur `windows-latest`, compile l'app avec
[`tauri-action`](https://github.com/tauri-apps/tauri-action), crée la release et
y attache **trois façons** de récupérer Taffk :

| Option | Fichier dans la release | Construit par |
| --- | --- | --- |
| **Installateur** | `Taffk_<version>_x64-setup.exe` (NSIS) | `tauri-action` (`--bundles nsis`) |
| **Portable** (sans installateur) | `Taffk_<version>_x64_portable.exe` | copie de `target/release/taffk.exe` |
| **Code source** | *Source code* (zip / tar.gz) | ajouté automatiquement par GitHub |

### Publier une version

1. Vérifiez que `version` dans
   [`src-tauri/tauri.conf.json`](src-tauri/tauri.conf.json) correspond à la
   version voulue (ex. `0.0.1`).
2. Créez et poussez un tag `v<version>` :

   ```sh
   git tag v0.0.1
   git push origin v0.0.1
   ```

3. Le workflow se déclenche, compile, et publie la release sur la page
   *Releases* du repo.

> Lancement manuel possible : **Actions → Release → Run workflow**, en
> sélectionnant un tag existant dans « Use workflow from ».

Aucun secret à configurer : le workflow utilise le `GITHUB_TOKEN` fourni
automatiquement par GitHub Actions.

> ℹ️ Le mode portable est simplement l'exécutable Tauri brut. Tauri ne fournit
> pas de « vrai » mode portable officiel (les données restent stockées dans le
> dossier de données utilisateur, pas à côté de l'`.exe`).

---

## 3. Vérifs continues (CI)

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) tourne sur chaque push
vers `main` et chaque PR :

- **frontend** : `npm run check` (typecheck) + `npm run build`.
- **backend** : `cargo test` (avec les libs système Tauri sous Linux).
