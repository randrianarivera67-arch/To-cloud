# Worker To-cloud — mise en place

## 1. Préparer Telegram

**Le bot**

Sur `@BotFather` : `/newbot`, noter le token. En créer trois à cinq — la
rotation répartit la charge et limite les dégâts si l'un se fait bloquer.

**Le canal**

Créer un canal **privé**, y ajouter chaque bot comme administrateur avec le
droit de publier et de supprimer.

**Le message épinglé**

Publier un message contenant exactement `{}`, puis l'épingler. Noter son
`message_id` — c'est le point fixe de tout le système. Il ne doit jamais être
supprimé.

Pour récupérer l'ID du canal et celui du message :

```bash
curl "https://api.telegram.org/bot<TOKEN>/getUpdates"
```

Le `chat.id` d'un canal commence par `-100`.

## 2. Les secrets

```bash
cd worker
npm install

npx wrangler secret put TELEGRAM_BOT_TOKENS   # token1,token2,token3
npx wrangler secret put TELEGRAM_CHANNEL_ID   # -1001234567890
npx wrangler secret put JWT_SECRET
npx wrangler secret put SIGN_SECRET
```

Pour les deux derniers :

```bash
openssl rand -base64 48
```

Dans `wrangler.toml`, ajuster `REGISTRY_MESSAGE_ID` et `ALLOWED_ORIGIN`.

## 3. Déployer

```bash
npx wrangler deploy
```

L'adresse obtenue ressemble à `https://to-cloud-api.<compte>.workers.dev`.
La reporter dans Cloudflare Pages → Settings → Environment variables :

| Variable | Valeur |
|---|---|
| `VITE_API_URL` | l'adresse du Worker |

Puis redéployer les Pages pour que la variable soit prise en compte.

## 4. Vérifier

```bash
curl -X POST https://<worker>/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"name":"Test","email":"test@to-cloud.mg","password":"motdepasse123"}'
```

Un jeton en retour signifie que la chaîne complète fonctionne : le Worker écrit
sur Telegram, met à jour le registre épinglé et sait le relire.

---

# Les points qui posent problème

Quatre choses connues, à traiter avant d'ouvrir à de vrais utilisateurs.

**Le registre est le point unique de défaillance.** S'il est supprimé ou
corrompu, tous les fichiers restent sur Telegram mais deviennent introuvables :
plus aucune correspondance entre un compte et son index. Une sauvegarde
quotidienne vers un second canal est indispensable, pas optionnelle.

**Deux écritures simultanées et l'une est perdue.** `editMessageText` applique
la dernière écriture. `mutateIndex` réessaie trois fois, ce qui réduit la
fenêtre sans la fermer. Un Durable Object par utilisateur donnerait un vrai
verrou — c'est la correction à prévoir dès que plusieurs appareils partagent un
compte.

**PBKDF2 consomme du temps processeur.** Cent mille itérations dépassent
probablement les 10 ms accordées par requête sur le plan gratuit. Si les
inscriptions échouent, deux options : le plan payant à 5 $, ou descendre à
50 000 itérations en acceptant une protection plus faible.

**Le stockage sur Telegram reste hors de ses conditions d'utilisation.** Les
bots peuvent être bloqués sans avertissement. La rotation limite la casse ;
elle ne l'évite pas. Pour les comptes payants, prévoir un stockage de secours —
c'est ce qui protège l'activité le jour où cela arrive.

## Limites Telegram, pour mémoire

| | |
|---|---|
| Envoi Bot API | 50 Mo |
| Réception `getFile` | 20 Mo → morceaux de 18 Mo |
| `file_path` | expire en ~1 h, ne jamais le stocker |
| `file_id` | durable, c'est lui qu'on garde |
| Messages | environ 20 par minute et par canal |
| Message épinglé | 4096 caractères, soit ~60 comptes avant partitionnement |
