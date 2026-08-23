# To-cloud

Stockage cloud pour Madagascar. 100 Go gratuits par compte.

Les fichiers volumineux sont découpés en parties de 18 Mo, envoyées vers un canal
Telegram privé qui sert de CDN, puis reconstituées en un seul fichier au moment du
téléchargement. L'utilisateur ne voit jamais le découpage.

## Stack

| Couche | Technologie |
|---|---|
| Frontend | React 18 + Vite + Tailwind |
| Mobile | Capacitor (APK Android) |
| API | Cloudflare Workers |
| Stockage | Canal Telegram privé (chunks de 18 Mo) |
| Index | `index_<user>.json` + message épinglé servant de registre |
| Assemblage | Côté navigateur — la bande passante ne passe pas par le serveur |

## Démarrage

```bash
npm install
npm run dev
```

## Build web

```bash
npm run build
npx vercel --prod
```

## Build APK

```bash
npx cap add android
npm run android
```

## Interface

- Mode clair, bordures animées par couleur de catégorie
- 15 langues, français par défaut
- Lecteurs intégrés : image (zoom), vidéo, audio (waveform), document (pages)
- Envoi avec choix de la catégorie de destination
- Sélection multiple, menu par fichier, corbeille, nettoyage

## Limites Telegram à connaître

- Upload Bot API : 50 Mo — d'où les parties de 18 Mo
- Download `getFile` : 20 Mo — 18 Mo laisse une marge de sécurité
- `file_path` expire après ~1 heure : ne stocker que le `file_id`
- Rate limit : environ 20 messages par minute et par canal

Rotation sur plusieurs bots pour répartir la charge. Sauvegarde quotidienne du
registre : sans lui, les fichiers restent sur Telegram mais deviennent
introuvables.

## Avertissement

Utiliser Telegram comme backend de stockage pour un produit commercial n'est pas
conforme à ses conditions d'utilisation. Le bot peut être bloqué sans préavis.
Prévoir un stockage de secours pour les comptes payants.

## Licence

MIT
