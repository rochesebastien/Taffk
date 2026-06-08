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

## 3. Avertissement Windows Defender / SmartScreen (« éditeur inconnu »)

Au premier lancement, Windows affiche un écran bleu SmartScreen
(« Windows a protégé votre ordinateur » / « éditeur inconnu »). Ce n'est **pas
un bug ni un virus** : l'exécutable n'est tout simplement **pas signé
numériquement**, donc pour Windows l'éditeur est inconnu et l'app n'a pas encore
de réputation SmartScreen.

Deux niveaux de réponse, selon le besoin.

### a) Pour votre propre machine (gratuit, immédiat)

Signez le build avec un certificat **auto-signé** installé comme « éditeur
approuvé ». Windows fait alors confiance à la signature et l'alerte disparaît
**sur cette machine**.

```sh
npm run tauri build          # produit target/release/taffk.exe + l'installateur NSIS
npm run sign:win             # crée/approuve un certificat et signe les .exe
```

Le script [`src-tauri/scripts/sign-windows.ps1`](src-tauri/scripts/sign-windows.ps1) :

1. crée (ou réutilise) un certificat de signature de code auto-signé ;
2. l'installe dans « Racines de confiance » + « Éditeurs approuvés » de
   l'utilisateur courant (Windows peut demander une confirmation la 1ʳᵉ fois) ;
3. signe l'exécutable et l'installateur, horodatage RFC-3161 inclus.

> ⚠️ Un certificat auto-signé n'est reconnu que là où il est installé : il ne
> supprime **pas** l'alerte pour les autres personnes qui téléchargent la
> release. Pour ça, voir (b).

### b) Pour la distribution (release GitHub, tout le monde)

Il faut une **signature de confiance** reconnue par Windows partout :

| Option | Coût indicatif | Effet sur SmartScreen |
| --- | --- | --- |
| **Azure Trusted Signing** | ~10 $/mois | Reconnu immédiatement (recommandé indé). |
| Certificat **OV** (Authenticode) | ~100–300 $/an | Réputation acquise progressivement. |
| Certificat **EV** | ~300–500 $/an (token matériel) | Réputation immédiate. |

Tauri signe automatiquement le bundle si une de ces méthodes est configurée.
Pour l'intégrer au workflow [`release.yml`](.github/workflows/release.yml) :

- **Azure Trusted Signing** — ajouter les inputs `tauri-action`
  (`azureTenantId`, `azureClientId`, `azureClientSecret`, l'endpoint et le nom
  de profil de signature) alimentés par des *secrets* GitHub.
- **Certificat .pfx** — renseigner dans `bundle.windows` de
  [`tauri.conf.json`](src-tauri/tauri.conf.json) `certificateThumbprint`,
  `digestAlgorithm` (`sha256`) et `timestampUrl`, et fournir le certificat à
  l'environnement de build via un secret.

Tant qu'aucune de ces options n'est configurée, la release reste **non signée**
(l'alerte SmartScreen est donc attendue côté téléchargement) : c'est volontaire
pour ne pas casser la CI, qui ne dispose d'aucun secret.

---

## 4. Vérifs continues (CI)

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) tourne sur chaque push
vers `main` et chaque PR :

- **frontend** : `npm run check` (typecheck) + `npm run build`.
- **backend** : `cargo test` (avec les libs système Tauri sous Linux).
