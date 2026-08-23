# Patch 2 — brancher l'interface sur le Worker

`Auth.jsx` est déjà modifié dans l'archive : il appelle le vrai Worker.
Il reste `App.jsx`, qui affiche encore des fichiers factices.

Quatre modifications.

---

## 1 — Imports

Après la ligne `} from "lucide-react";` :

```jsx
import { useFiles, humanSize } from "./lib/useFiles.js";
import { upload, downloadToDisk, removeFile, objectUrl, logout } from "./lib/api.js";
```

---

## 2 — Le quota vient du serveur

Dans `HomeView`, remplacer les valeurs figées. Ajouter en première ligne de la
fonction :

```jsx
  const { quota } = useFiles();
  const usedGo = (quota.used / 1024 ** 3).toFixed(1).replace(".", ",");
  const totalGo = Math.round(quota.quota / 1024 ** 3);
  const freeGo = Math.max(0, totalGo - Math.round(quota.used / 1024 ** 3));
```

Puis dans le panneau de stockage :

- `>51<` devient `>{usedGo}<`
- `/ 100 Go` devient `/ {totalGo} Go`
- `49 Go {t.freeSpace}` devient `{freeGo} Go {t.freeSpace}`

---

## 3 — La liste des fichiers

Dans `CategoryView`, supprimer le `useMemo` qui filtre `FILES` et le remplacer
par :

```jsx
  const { files: items, loading, error, refresh } = useFiles(cat.key);
  const groups = useMemo(() => {
    const m = {};
    items.forEach(f => { (m[f.g] ||= []).push(f); });
    return m;
  }, [items]);
```

Dans le rendu de chaque ligne, `f.size` devient `f.sizeLabel`.

Ajouter un état de chargement avant la liste :

```jsx
  {loading && (
    <p style={{ color: T.mute }} className="text-sm px-6 py-8 text-center">
      Chargement…
    </p>
  )}
  {error && (
    <p style={{ color: T.rose }} className="text-sm px-6 py-8 text-center">{error}</p>
  )}
```

---

## 4 — L'envoi réel

Dans `UploadSheet`, remplacer la simulation. Le composant doit recevoir un
vrai fichier : ajouter un `<input type="file" hidden>` déclenché au choix de la
catégorie.

```jsx
  const inputRef = useRef(null);
  const [pickedCat, setPickedCat] = useState(null);

  function chooseCategory(key) {
    setPickedCat(key);
    inputRef.current?.click();
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPick(pickedCat);
    setFileName(file.name);
    try {
      await upload(file, pickedCat, p => setDone(p.done) || setTotal(p.total));
      setFinished(true);
    } catch (err) {
      setError(err.message);
    }
  }
```

Et dans le JSX, sous la grille de catégories :

```jsx
  <input ref={inputRef} type="file" hidden onChange={onFile} />
```

Le `onClick={() => setPick(c.key)}` de chaque tuile devient
`onClick={() => chooseCategory(c.key)}`.

---

## 5 — Ouvrir un fichier

Dans `Viewer`, l'aperçu utilise encore des dégradés. Pour de vrais fichiers,
récupérer une URL au montage :

```jsx
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (!file) return;
    let dead = false;
    objectUrl(file.id, p => setLoad(p.done)).then(u => { if (!dead) setSrc(u); });
    return () => { dead = true; if (src) URL.revokeObjectURL(src); };
  }, [file?.id]);
```

Puis remplacer le carré dégradé par `<img src={src} />`, et le lecteur vidéo par
`<video src={src} controls />`. Même chose pour l'audio.

---

# Après le patch

```bash
npm run build
git add -A && git commit -m "Wire UI to Worker API" && git push
```

Les Pages se redéploient seules.

---

# Ce qui reste ouvert

**La connexion Google est désactivée.** Le bouton affiche un message et ne fait
rien. Le flux OAuth demande un `client_id`, un `client_secret` gardé côté Worker
et une route de rappel — cela n'existe pas encore. Mieux vaut un bouton
visiblement inactif qu'un bouton qui semble marcher.

**L'assemblage tient en mémoire.** Un fichier de 400 Mo occupe 400 Mo de RAM
pendant la reconstitution. Sur un téléphone d'entrée de gamme, l'onglet peut
être tué. C'est le prochain vrai chantier : écrire au fur et à mesure via
l'API File System Access plutôt que tout garder en mémoire.

**Aucune reprise sur envoi interrompu.** Si le réseau tombe au morceau 14 sur
24, tout est à refaire. Le Worker renvoie déjà un `uploadId` — il suffit de
conserver les morceaux déjà envoyés côté navigateur et de reprendre à l'index
suivant.

**Le registre reste le point unique de défaillance.** Rien n'a changé sur ce
point. La sauvegarde quotidienne du message épinglé est le premier travail à
faire avant d'ouvrir le service à qui que ce soit d'autre que vous.
