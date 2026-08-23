# Patch — authentification + barre d'installation

Cinq modifications dans `src/App.jsx`. Rien d'autre à toucher.

---

## 1 — Imports

Juste **après** la ligne `} from "lucide-react";` (en haut du fichier), ajouter :

```jsx
import Auth from "./Auth.jsx";
import InstallBanner from "./InstallBanner.jsx";
import { load, save, drop } from "./lib/storage.js";
```

---

## 2 — État de session

Dans `export default function ToCloud() {`, ajouter en **première** ligne :

```jsx
  const [user, setUser] = useState(() => load("tc_user", null));
```

---

## 3 — Le portail

Juste **avant** le `return (` de `ToCloud`, ajouter :

```jsx
  if (!user) {
    return <Auth lang={lang} onDone={u => { save("tc_user", u); setUser(u); }} />;
  }
```

---

## 4 — La barre d'installation

Chercher cette ligne :

```jsx
        <UploadSheet open={up} onClose={() => setUp(false)} t={t}
```

Juste **au-dessus**, ajouter :

```jsx
        <InstallBanner lang={lang} />
```

---

## 5 — Remonter le bouton d'envoi

La barre occupe le bas de l'écran. Dans le bouton flottant, remplacer :

```jsx
          className="fixed right-5 bottom-6 w-16 h-16 rounded-full flex items-center justify-center z-40 active:scale-95"
```

par :

```jsx
          className="fixed right-5 bottom-28 w-16 h-16 rounded-full flex items-center justify-center z-40 active:scale-95"
```

---

## Optionnel — déconnexion réelle

Dans `AccountSheet`, la ligne `signOut` appelle `onClose`. Pour vider la session,
passer `onSignOut` depuis `ToCloud` et appeler :

```jsx
drop("tc_user"); setUser(null);
```

---

# Déploiement Cloudflare Pages

## Par le tableau de bord

Workers & Pages → Create → Pages → Connect to Git → dépôt `To-cloud`.

| Réglage | Valeur |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 20 |

Chaque `git push` redéploie automatiquement.

## Par la ligne de commande

```bash
npm install -D wrangler
npm run build
npx wrangler pages deploy dist --project-name=to-cloud
```

`public/_redirects` renvoie toutes les routes vers `index.html` — sans ce fichier,
un rafraîchissement sur une sous-page donne une erreur 404.

## Publier l'APK

Une fois l'APK compilé :

```bash
mkdir -p public/downloads
cp android/app/build/outputs/apk/release/app-release.apk public/downloads/to-cloud.apk
```

Le fichier est alors servi sur `/downloads/to-cloud.apk`, exactement l'adresse
attendue par `APK_URL` dans `src/InstallBanner.jsx`.

Au-delà d'environ 25 Mo, préférer une release GitHub et pointer `APK_URL` vers
son lien direct — Pages n'est pas prévu pour les gros binaires.

---

# À savoir sur l'authentification

`Auth.jsx` est pour l'instant une **interface seule**. Les deux fonctions
`withGoogle()` et `withEmail()` acceptent tout le monde après un délai simulé, et
la session est gardée en local. Rien n'est vérifié côté serveur.

C'est volontaire — la vérification appartient au Worker, qui n'existe pas encore.
Deux points à traiter au moment de le construire :

- **Google** : flux OAuth complet, avec échange du code contre un jeton côté
  serveur. Le secret client ne doit jamais se trouver dans le bundle.
- **Mot de passe** : hachage Argon2id ou bcrypt côté Worker. Jamais de stockage
  en clair, jamais de hachage dans le navigateur.

Tant que le Worker n'est pas branché, ne pas présenter To-cloud comme sécurisé
auprès de vrais utilisateurs : n'importe qui peut entrer avec une adresse
quelconque.
