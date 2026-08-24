# Connexion Google

Le code est en place. Il reste la déclaration chez Google et chez Supabase :
deux formulaires, une quinzaine de minutes.

---

## 1. Google Cloud

`console.cloud.google.com`

**Créer le projet**

En haut, sélecteur de projet → **New project** → nom `To-cloud` → Create.

**Écran de consentement**

APIs & Services → **OAuth consent screen** → **External** → Create.

| Champ | Valeur |
|---|---|
| App name | To-cloud |
| User support email | tocloud37@gmail.com |
| Developer contact | tocloud37@gmail.com |

Aucun *scope* à ajouter : l'adresse e-mail et le nom suffisent, et ce sont les
seuls que Supabase demande.

**Identifiants**

APIs & Services → **Credentials** → Create credentials → **OAuth client ID**

| Champ | Valeur |
|---|---|
| Application type | Web application |
| Name | To-cloud web |
| Authorized JavaScript origins | `https://to-cloud.pages.dev` |
| Authorized redirect URIs | `https://drbznjjwqhibvnnbkkul.supabase.co/auth/v1/callback` |

L'URI de redirection doit pointer vers **Supabase**, pas vers le site : c'est
Supabase qui reçoit le retour de Google, puis renvoie vers l'application.

Noter le **Client ID** et le **Client secret**.

## 2. Supabase

Authentication → **Sign In / Providers** → **Google** → Enable.

Coller le Client ID et le Client secret, puis Save.

## 3. Essai

Ouvrir `to-cloud.pages.dev` dans un navigateur, cliquer **Continuer avec
Google**. Le compte apparaît ensuite dans Authentication → Users, et son profil
dans la table `profiles`.

---

# Pendant la phase de test

L'écran de consentement reste en mode **Testing** tant qu'il n'est pas publié :
seules les adresses inscrites dans **Test users** peuvent se connecter. Ajoutez
la vôtre, sinon Google refuse avec « accès bloqué ».

Pour ouvrir à tout le monde : bouton **Publish app**. Comme aucun scope sensible
n'est demandé, la validation est immédiate — pas de vérification manuelle.

---

# Ce qui ne marchera pas dans l'APK

Google **refuse ses pages de connexion à l'intérieur d'une WebView**, ce qu'est
l'APK. Le parcours s'arrête sur `disallowed_useragent`. Ce n'est pas un défaut
de configuration : la règle est volontaire, elle protège contre les
applications qui liraient le mot de passe saisi.

Le bouton est donc grisé dans l'application, avec un message qui renvoie vers
l'e-mail ou vers le site dans un navigateur.

**Pour l'activer aussi dans l'APK**, il faudrait :

1. Un certificat de signature fixe — le workflow en génère un différent à chaque
   build de débogage, ce qui casserait la liaison à chaque fois.
2. Un fichier `/.well-known/assetlinks.json` publié sur le site, contenant
   l'empreinte SHA-256 de ce certificat.
3. Ouvrir le parcours dans le navigateur système via `@capacitor/browser`, et
   récupérer la session au retour par lien profond.

C'est un chantier à part entière, à ouvrir le jour où la connexion Google sur
mobile devient importante. Tant que l'e-mail fonctionne partout, elle ne l'est
probablement pas.
