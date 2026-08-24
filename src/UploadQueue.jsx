import React, {
  createContext, useContext, useState, useRef, useCallback, useEffect,
} from "react";
import { X, Check, CircleAlert, ChevronUp, ChevronDown, Upload } from "lucide-react";
import { T, DISPLAY, MONO, halo } from "./theme.jsx";
import { upload, uploadedParts } from "./lib/api.js";

const Ctx = createContext(null);
export const useUploads = () => useContext(Ctx);

/**
 * File d'attente d'envoi.
 *
 * Les envois vivent au-dessus de la navigation : changer d'ecran, ouvrir un
 * dossier ou lire un fichier n'interrompt rien. Un seul envoi a la fois, pour
 * ne pas saturer la liaison ni les limites de debit du canal.
 */
export function UploadProvider({ children }) {
  const [jobs, setJobs] = useState([]);
  const [doneCount, setDoneCount] = useState(0);
  const runningRef = useRef(false);
  const queueRef = useRef([]);

  const patch = (id, fields) =>
    setJobs(list => list.map(j => (j.id === id ? { ...j, ...fields } : j)));

  const pump = useCallback(async () => {
    if (runningRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;

    runningRef.current = true;
    patch(next.id, { state: "running" });

    try {
      await upload(next.file, next.cat.key, p => {
        patch(next.id, {
          done: p.done, total: p.total, percent: p.percent,
          ...(p.resumed ? { resumed: true } : {}),
        });
      }, next.folder);
      patch(next.id, { state: "done", percent: 100 });
      setDoneCount(n => n + 1);
      // la ligne disparait d'elle-meme, sans masquer les eventuelles erreurs
      setTimeout(() => setJobs(l => l.filter(j => j.id !== next.id)), 4000);
    } catch (e) {
      patch(next.id, { state: "failed", error: e.message });
    } finally {
      runningRef.current = false;
      pump();
    }
  }, []);

  const enqueue = useCallback((file, cat, folder) => {
    const job = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file, cat, folder,
      name: file.name, size: file.size,
      state: "waiting", done: 0, total: 1, percent: 0,
    };
    setJobs(l => [...l, job]);
    queueRef.current.push(job);
    pump();
  }, [pump]);

  const retry = useCallback(job => {
    patch(job.id, { state: "waiting", error: null, done: 0, percent: 0 });
    queueRef.current.push(job);
    pump();
  }, [pump]);

  const dismiss = id => setJobs(l => l.filter(j => j.id !== id));

  const active = jobs.some(j => j.state === "running" || j.state === "waiting");

  /* un rechargement en pleine transmission perd l'envoi : il n'y a pas de
     reprise, donc on previent avant de laisser partir */
  useEffect(() => {
    if (!active) return;
    const warn = e => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);

  return (
    <Ctx.Provider value={{ jobs, enqueue, retry, dismiss, active, doneCount }}>
      {children}
    </Ctx.Provider>
  );
}

const humanSize = b => {
  if (b < 1024) return `${b} o`;
  const u = ["Ko", "Mo", "Go", "To"];
  let v = b / 1024, i = 0;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 ? 0 : 1).replace(".", ",")} ${u[i]}`;
};

/** Carte flottante : repliee, elle tient sur une ligne. */
export function UploadStatus({ t, bottom = 96 }) {
  const { jobs, retry, dismiss } = useUploads();
  const [open, setOpen] = useState(false);
  if (!jobs.length) return null;

  const running = jobs.find(j => j.state === "running");
  const waiting = jobs.filter(j => j.state === "waiting").length;
  const failed = jobs.filter(j => j.state === "failed").length;
  const allDone = jobs.every(j => j.state === "done");

  const accent = failed ? T.rose : allDone ? T.blue : T.violet;
  const head = failed ? t.uploadFailed
    : allDone ? t.uploaded
    : running ? `${t.uploading} · ${running.percent}%`
    : t.uploading;

  return (
    <div className="fixed inset-x-0 z-40 flex justify-center px-3 pointer-events-none"
         style={{ bottom }}>
      <div className="w-full max-w-md pointer-events-auto">
        <div style={{ background: T.card, border: `2px solid ${accent}`, boxShadow: halo(accent) }}
             className="rounded-3xl overflow-hidden">

          <button onClick={() => setOpen(o => !o)}
                  className="w-full flex items-center gap-3 p-3 text-left active:opacity-70">
            <span style={{ background: `${accent}1F` }}
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
              {failed ? <CircleAlert size={19} color={T.rose} />
                : allDone ? <Check size={19} color={T.blue} strokeWidth={2.6} />
                : <Upload size={19} color={accent} />}
            </span>

            <span className="min-w-0 flex-1">
              <span style={{ color: T.text }} className="block text-sm font-bold">{head}</span>
              <span style={{ color: T.mute, fontFamily: MONO, fontSize: 11 }}
                    className="block mt-0.5 truncate">
                {running ? running.name : `${jobs.length} ${t.files}`}
                {waiting > 0 ? ` · +${waiting}` : ""}
              </span>
            </span>

            {open ? <ChevronDown size={20} color={T.mute} /> : <ChevronUp size={20} color={T.mute} />}
          </button>

          {running && !open && (
            <div style={{ background: T.sunken }} className="h-1 w-full">
              <div style={{ width: `${running.percent}%`, background: accent,
                            transition: "width 200ms linear" }} className="h-full" />
            </div>
          )}

          {open && (
            <div style={{ borderTop: `1px solid ${T.line}` }} className="max-h-64 overflow-y-auto">
              {jobs.map(j => (
                <div key={j.id} className="flex items-center gap-3 px-4 py-3"
                     style={{ borderTop: `1px solid ${T.line}` }}>
                  <span className="min-w-0 flex-1">
                    <span style={{ color: T.text }} className="block text-sm truncate">{j.name}</span>
                    <span style={{ color: j.state === "failed" ? T.rose : T.mute, fontFamily: MONO }}
                          className="block text-xs mt-1 truncate">
                      {j.state === "failed" ? j.error
                        : j.state === "done" ? t.saved
                        : j.state === "waiting"
                          ? (uploadedParts(j.file) ? t.willResume : t.queued)
                        : `${humanSize(j.size)} · ${j.done}/${j.total}${j.resumed ? ` · ${t.resumed}` : ""}`}
                    </span>
                    {j.state === "running" && (
                      <span style={{ background: T.sunken }}
                            className="block h-1 w-full rounded-full mt-2 overflow-hidden">
                        <span style={{ width: `${j.percent}%`, background: T.violet,
                                       transition: "width 200ms linear" }}
                              className="block h-full rounded-full" />
                      </span>
                    )}
                  </span>

                  {j.state === "failed" && (
                    <button onClick={() => retry(j)} style={{ color: T.violet }}
                            className="text-xs font-bold shrink-0 px-2">
                      {t.retry}
                    </button>
                  )}
                  {j.state !== "running" && (
                    <button onClick={() => dismiss(j.id)} aria-label="Fermer" className="p-1 shrink-0">
                      <X size={17} color={T.faint} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
