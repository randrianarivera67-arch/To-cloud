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

export function useFiles(cat, opts = {}) {
  const [files, setFiles] = useState([]);
  const [quota, setQuota] = useState({ quota: 0, used: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listFiles(cat, opts);
      setFiles(r.files.map(f => ({
        ...f,
        g: groupOf(f.created),
        when: labelOf(f.created),
        sizeLabel: humanSize(f.size),
      })));
      setQuota({ quota: r.quota, used: r.used });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [cat, opts.thumbs]);

  useEffect(() => { refresh(); }, [refresh]);

  return { files, quota, loading, error, refresh };
}
