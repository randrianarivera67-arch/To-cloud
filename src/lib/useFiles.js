import { useState, useEffect, useCallback } from "react";
import { listFiles } from "./api.js";

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

export function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} o`;
  const units = ["Ko", "Mo", "Go", "To"];
  let v = bytes / 1024, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 ? 0 : 1).replace(".", ",")} ${units[i]}`;
}

/**
 * Charge une page a la fois.
 *
 * Les fichiers ne sont demandes qu'au fur et a mesure du defilement : sur un
 * forfait mobile, tirer 300 vignettes d'un coup se paie cher pour rien.
 */
export function useFiles(cat, opts = {}) {
  const [files, setFiles] = useState([]);
  const [meta, setMeta] = useState({
    quota: 0, used: 0, total: 0, counts: {}, folders: [], trashCount: 0,
  });
  const [cursor, setCursor] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
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
      const r = await listFiles(cat, {
        thumbs: opts.thumbs,
        folder: opts.folder,
        cursor: from,
        limit: opts.limit || 20,
      });
      setFiles(prev => append ? [...prev, ...decorate(r.files)] : decorate(r.files));
      setMeta({
        quota: r.quota, used: r.used, total: r.total,
        counts: r.counts || {}, folders: r.folders || [], trashCount: r.trashCount || 0,
      });
      setCursor(r.cursor);
      setDone(r.done);
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
