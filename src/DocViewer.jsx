import React, { useState, useEffect, useRef } from "react";
import {
  X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, CircleAlert, FileText,
} from "lucide-react";
import { T, DISPLAY, MONO, halo } from "./theme.jsx";
import { downloadToDisk } from "./lib/api.js";

const ext = name => (name.split(".").pop() || "").toLowerCase();

/**
 * Lecteur de documents.
 *
 * Un <iframe> sur un blob suffit dans un navigateur de bureau, mais la WebView
 * Android le refuse le plus souvent : le PDF est alors telecharge au lieu de
 * s'afficher. On rend donc les pages nous-memes avec pdf.js.
 */
export default function DocViewer({ file, blob, t, onClose }) {
  const kind = ext(file.name);

  if (kind === "pdf") return <PdfView file={file} blob={blob} t={t} onClose={onClose} />;
  if (["txt", "csv", "log", "json", "md"].includes(kind)) {
    return <TextView file={file} blob={blob} kind={kind} t={t} onClose={onClose} />;
  }
  return <NoView file={file} t={t} onClose={onClose} />;
}

/* ─────────── chrome commun ─────────── */

function Frame({ file, t, onClose, children, footer }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ background: T.bg }}>
      <div className="flex items-center gap-3 px-4 py-4 shrink-0">
        <button onClick={onClose} aria-label="Fermer" className="p-1 -ml-1">
          <X size={26} color={T.text} />
        </button>
        <div className="min-w-0 flex-1">
          <div style={{ color: T.text }} className="text-base font-semibold truncate">
            {file.name}
          </div>
          <div style={{ color: T.mute, fontFamily: MONO }} className="text-xs mt-0.5">
            {file.sizeLabel}
          </div>
        </div>
        <button onClick={() => downloadToDisk(file.id)} aria-label={t.download} className="p-2">
          <Download size={22} color={T.text} />
        </button>
      </div>
      {children}
      {footer}
    </div>
  );
}

/* ─────────── PDF ─────────── */

function PdfView({ file, blob, t, onClose }) {
  const [doc, setDoc] = useState(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [err, setErr] = useState(null);
  const canvasRef = useRef(null);
  const taskRef = useRef(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

        const buf = await blob.arrayBuffer();
        const loaded = await pdfjs.getDocument({ data: buf }).promise;
        if (!dead) setDoc(loaded);
      } catch (e) {
        if (!dead) setErr(e.message);
      }
    })();
    return () => { dead = true; };
  }, [blob]);

  useEffect(() => {
    if (!doc || !canvasRef.current) return;
    let dead = false;

    (async () => {
      try {
        // une seule page a la fois : rendre tout le document saturerait la memoire
        const p = await doc.getPage(page);
        const canvas = canvasRef.current;
        if (!canvas || dead) return;

        const width = canvas.parentElement.clientWidth - 16;
        const base = p.getViewport({ scale: 1 });
        const viewport = p.getViewport({ scale: (width / base.width) * zoom });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        taskRef.current?.cancel();
        taskRef.current = p.render({ canvasContext: canvas.getContext("2d"), viewport });
        await taskRef.current.promise;
      } catch (e) {
        if (!dead && e?.name !== "RenderingCancelledException") setErr(e.message);
      }
    })();

    return () => { dead = true; taskRef.current?.cancel(); };
  }, [doc, page, zoom]);

  if (err) {
    return (
      <Frame file={file} t={t} onClose={onClose}>
        <div className="flex-1 flex flex-col items-center justify-center px-10 text-center">
          <CircleAlert size={38} color={T.rose} strokeWidth={1.8} className="mb-4" />
          <p style={{ color: T.text }} className="text-base font-semibold mb-1">{t.loadFailed}</p>
          <p style={{ color: T.mute }} className="text-sm">{err}</p>
        </div>
      </Frame>
    );
  }

  return (
    <Frame
      file={file} t={t} onClose={onClose}
      footer={doc && (
        <div className="flex items-center justify-center gap-4 py-4 shrink-0">
          <button onClick={() => setZoom(z => Math.max(0.6, +(z - 0.25).toFixed(2)))}
                  aria-label="Réduire" className="p-2">
            <ZoomOut size={21} color={T.mute} />
          </button>
          <button onClick={() => setPage(p => Math.max(1, p - 1))}
                  aria-label={t.prev} className="p-2">
            <ChevronLeft size={24} color={page > 1 ? T.text : T.faint} />
          </button>
          <span style={{ color: T.text, fontFamily: MONO }} className="text-sm w-16 text-center">
            {page} / {doc.numPages}
          </span>
          <button onClick={() => setPage(p => Math.min(doc.numPages, p + 1))}
                  aria-label={t.next} className="p-2">
            <ChevronRight size={24} color={page < doc.numPages ? T.text : T.faint} />
          </button>
          <button onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))}
                  aria-label="Agrandir" className="p-2">
            <ZoomIn size={21} color={T.mute} />
          </button>
        </div>
      )}
    >
      <div className="flex-1 overflow-auto px-2 py-2">
        {!doc && (
          <p style={{ color: T.mute }} className="text-sm text-center py-16">{t.loading}</p>
        )}
        <canvas ref={canvasRef}
                style={{ background: "#FFFFFF", boxShadow: "0 2px 14px -6px rgba(23,20,42,0.4)" }}
                className="mx-auto rounded-lg block" />
      </div>
    </Frame>
  );
}

/* ─────────── texte et tableurs simples ─────────── */

function TextView({ file, blob, kind, t, onClose }) {
  const [text, setText] = useState(null);

  useEffect(() => {
    let dead = false;
    // au-dela de 2 Mo, l'affichage devient inutilisable : on tronque
    blob.slice(0, 2 * 1024 * 1024).text()
      .then(v => { if (!dead) setText(v); })
      .catch(() => { if (!dead) setText(""); });
    return () => { dead = true; };
  }, [blob]);

  const rows = kind === "csv" && text
    ? text.split(/\r?\n/).slice(0, 300).map(l => l.split(/[,;]/))
    : null;

  return (
    <Frame file={file} t={t} onClose={onClose}>
      <div className="flex-1 overflow-auto px-3 pb-4">
        {text === null && (
          <p style={{ color: T.mute }} className="text-sm text-center py-16">{t.loading}</p>
        )}

        {rows ? (
          <div style={{ background: T.card, border: `1px solid ${T.line}` }}
               className="rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {rows.map((cells, r) => (
                  <tr key={r} style={{ background: r === 0 ? T.sunken : "transparent" }}>
                    {cells.map((c, i) => (
                      <td key={i}
                          style={{ color: r === 0 ? T.text : T.mute,
                                   borderTop: r ? `1px solid ${T.line}` : "none",
                                   fontWeight: r === 0 ? 600 : 400 }}
                          className="px-3 py-2 whitespace-nowrap">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : text ? (
          <pre style={{ background: T.card, border: `1px solid ${T.line}`, color: T.text,
                        fontFamily: MONO }}
               className="rounded-2xl p-4 text-xs whitespace-pre-wrap break-words">
            {text}
          </pre>
        ) : null}
      </div>
    </Frame>
  );
}

/* ─────────── formats non lisibles dans l'application ─────────── */

function NoView({ file, t, onClose }) {
  return (
    <Frame file={file} t={t} onClose={onClose}>
      <div className="flex-1 flex flex-col items-center justify-center px-10 text-center">
        <div style={{ background: T.blueBg }}
             className="w-20 h-20 rounded-full flex items-center justify-center mb-5">
          <FileText size={36} color={T.blue} strokeWidth={1.8} />
        </div>
        <p style={{ color: T.text }} className="text-lg font-semibold mb-1">{t.noPreview}</p>
        <p style={{ color: T.mute }} className="text-sm leading-snug mb-7">{t.openElsewhere}</p>
        <button onClick={() => downloadToDisk(file.id)}
                style={{ background: T.violet, boxShadow: halo(T.violet) }}
                className="flex items-center gap-2.5 px-7 py-3.5 rounded-full active:opacity-80">
          <Download size={20} color="#FFFFFF" />
          <span style={{ fontFamily: DISPLAY }} className="text-base font-bold text-white uppercase">
            {t.download}
          </span>
        </button>
      </div>
    </Frame>
  );
}
