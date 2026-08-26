import { useState, useEffect, useCallback } from "react";
import { listFiles, counts, listFolders, profile } from "./api.js";
import { load as cacheGet, save as cacheSet } from "./storage.js";

/**
 * Charge les fichiers depuis le Worker.
 *
 * Les dates arrivent en millisecondes et sont regroupees ici : aujourd'hui,
 * hier, ce mois-ci. Le composant n'a pas a s'en occuper.
 */
export function groupOf(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = (a, b) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  if (sameDay(d, now)) return "today";
  const yday = new Date(now);
  yday.setDate(now.getDate() - 1);
  if (sameDay(d, yday)) return "yday";
  return "month";
}

export function labelOf(ts) {
  const d = new Date(ts);
  const g = groupOf(ts);
  const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (g === "today" || g === "yday") return hhmm;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Taille lisible.
 *
 * Le passage a l'unite superieure se fait des 1000, pas 1024 : sinon un espace
 * libre de 1023,8 Go s'affiche « 1024 Go » juste sous la barre qui annonce un
 * quota de 1 To, ce qui donne l'impression d'une incoherence.
 */
export function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} o`;
  const units = ["Ko", "Mo", "Go", "To"];
  let v = bytes / 1024, i = 0;
  while (v >= 1000 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 ? 0 : 1).replace(".", ",")} ${units[i]}`;
}

/**
 * Charge une page a la fois.
 *
 * Les fichiers ne sont demandes qu'au fur et a mesure du defilement : sur un
 * forfait mobile, tirer 300 vignettes d'un coup se paie cher pour rien.
 */
export function useFiles(cat, opts = {}) {
  /* La derniere page vue est gardee localement : au retour, l'ecran s'affiche
     tout de suite et la requete ne sert qu'a rafraichir. Sur un forfait, ouvrir
     l'application ne coute alors presque rien. */
  const key = `tc_cache_${cat || "all"}_${opts.folder || "root"}`;
  const seed = cacheGet(key, null);

  const [files, setFiles] = useState(() => seed?.files || []);
  const [meta, setMeta] = useState(() => seed?.meta || {
    quota: 0, used: 0, total: 0, counts: {}, folders: [], trashCount: 0,
  });
  const [cursor, setCursor] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(!seed);
  const [more, setMore] = useState(false);
  const [error, setError] = useState(null);

  const decorate = list => list.map(f => ({
    ...f,
    g: groupOf(f.created),
    when: labelOf(f.created),
    sizeLabel: humanSize(f.size),
  }));

  const load = useCallback(async (from = 0, append = false) => {
    append ? setMore(true) : setLoading(true);
    setError(null);
    try {
      const r = await listFiles({
        cat,
        folder: opts.folder,
        cursor: from,
        limit: opts.limit || 20,
      });
      // compteurs, dossiers et quota ne changent pas d'une page a l'autre :
      // on ne les redemande qu'au premier chargement
      const extra = append ? null : await Promise.all([counts(), listFolders(), profile()]);
      setFiles(prev => append ? [...prev, ...decorate(r.files)] : decorate(r.files));
      if (extra) {
        const [c, folders, prof] = extra;
        setMeta({
          quota: prof?.quota || 0, used: prof?.used || 0, total: r.total,
          counts: c, folders, trashCount: 0,
        });
      } else {
        setMeta(m => ({ ...m, total: r.total }));
      }
      setCursor(r.cursor);
      setDone(r.done);
      if (!append) {
        // les vignettes gonflent le cache : on ne garde que la premiere page
        const [c, folders, prof] = extra;
        cacheSet(key, {
          files: decorate(r.files).slice(0, 12),
          meta: { quota: prof?.quota || 0, used: prof?.used || 0, total: r.total,
                  counts: c, folders, trashCount: 0 },
        });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setMore(false);
    }
  }, [cat, opts.thumbs, opts.folder, opts.limit]);

  useEffect(() => { setCursor(0); setDone(false); load(0, false); }, [load]);

  const loadMore = useCallback(() => {
    if (!done && !more && !loading) load(cursor, true);
  }, [done, more, loading, cursor, load]);

  return {
    files, meta, loading, more, done, error,
    quota: { quota: meta.quota, used: meta.used },
    loadMore,
    refresh: () => load(0, false),
  };
}
