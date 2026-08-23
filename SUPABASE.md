# Passage à Supabase

Le registre épinglé sur Telegram disparaît. Les comptes, fichiers, dossiers et
corbeille vivent maintenant dans Postgres. Telegram ne garde plus que les
morceaux.

Ce que cela règle : la limite de 45 comptes, les écritures simultanées qui
s'écrasaient, l'absence de sauvegarde, la réinitialisation de mot de passe, la
connexion Google. Ce que cela ne règle pas : Telegram reste hors de ses
conditions d'utilisation, un bot peut toujours être bloqué.

---

## 1. Créer le projet

Sur `supabase.com` → New project. Région **Frankfurt** (la plus proche de
Madagascar parmi les gratuites). Noter le mot de passe de la base.

## 2. Créer les tables

SQL Editor → coller `supabase/schema.sql` → **Run**.

Vérifier ensuite dans Table Editor que `profiles`, `folders`, `files`, `chunks`
et `shares` existent, chacune avec le cadenas RLS actif.

## 3. Relever les clés

Settings → API :

| | Où l'utiliser |
|---|---|
| Project URL | Pages + Worker |
| `anon public` | Pages + Worker |
| `service_role` | **Worker uniquement** |
| JWT Secret | Worker |

La clé `service_role` contourne toutes les règles RLS. Elle ne doit jamais
apparaître dans le code du site : n'importe qui pourrait alors lire la base
entière.

## 4. Activer Google

Authentication → Providers → Google. Il faut un `client_id` et un
`client_secret` obtenus sur `console.cloud.google.com` (OAuth consent screen
puis Credentials). L'URL de redirection à déclarer est affichée par Supabase.

Sans cette étape, le bouton Google renvoie une erreur — le reste fonctionne.

## 5. Cloudflare Pages

Settings → Environment variables :

| Nom | Valeur |
|---|---|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | clé `anon public` |
| `VITE_API_URL` | adresse du Worker |

Puis redéployer.

## 6. Cloudflare Worker

Dans `worker/wrangler.toml`, remplacer `SUPABASE_URL` par l'URL du projet.

Settings → Variables and Secrets, **type Secret** :

- `TELEGRAM_BOT_TOKENS`
- `TELEGRAM_CHANNEL_ID`
- `SUPABASE_JWT_SECRET`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

Les anciens secrets `JWT_SECRET` et `SIGN_SECRET` ne servent plus.

## 7. GitHub Actions

Settings → Secrets and variables → Actions → Variables :

- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Les fichiers déjà envoyés

Ils ne migrent pas. Ils restent sur le canal Telegram, mais l'ancien index
épinglé n'est plus lu : l'application ne les verra plus.

Vous en avez deux ou trois de test — le plus simple est de les renvoyer. Écrire
un script de migration coûterait plus de temps que le contenu ne le vaut.

Le message épinglé peut rester en place : il ne gêne pas.

## Le projet s'endort

Sans trafic pendant sept jours, Supabase met le projet en pause et il faut le
réveiller à la main. Un cron Cloudflare qui appelle la base une fois par jour
suffit à l'éviter — à ajouter avant d'ouvrir le service à d'autres personnes.

## Ce qui reste ouvert

**Pas de reprise sur envoi interrompu.** Coupure au morceau 14 sur 24 : tout est
à refaire.

**L'assemblage tient en mémoire.** Une vidéo de 400 Mo occupe 400 Mo de RAM le
temps de la reconstituer. Sur un téléphone modeste, l'onglet peut être tué.

**Les liens de partage ne s'annulent pas.** Une fois émis, un lien reste valable
sept jours. Supprimer la ligne dans `shares` le coupe, mais l'interface ne le
propose pas encore.
