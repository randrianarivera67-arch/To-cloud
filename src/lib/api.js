/**
 * Client API To-cloud.
 *
 * Envoi : le navigateur decoupe, le Worker relaie vers Telegram (le token du
 * bot ne doit jamais atteindre le navigateur).
 * Reception : le Worker ne renvoie que des liens, le navigateur telecharge et
 * recolle lui-meme. La bande passante reste a la charge de Telegram.
 */

import { load, save, drop } from "./storage.js";

export const API = import.meta.env.VITE_API_URL || "https://to-cloud-api.workers.dev";

const token = () => load("tc_token", null);

async function call(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      ...(opts.body && !(opts.body instanceof Blob) ? { "content-type": "application/json" } : {}),
      ...(token() ? { authorization: `Bearer ${token()}` } : {}),
      ...opts.headers,
    },
  });

  if (res.status === 401) {
    drop("tc_token");
    drop("tc_user");
    throw new Error("Session expiree");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

/* ── comptes ──────────────────────────────────────────────────────────── */

export async function register(name, email, password) {
  const r = await call("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  save("tc_token", r.token);
  save("tc_user", r.user);
  return r.user;
}

export async function login(email, password) {
  const r = await call("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  save("tc_token", r.token);
  save("tc_user", r.user);
  return r.user;
}

export function logout() {
  drop("tc_token");
  drop("tc_user");
}

export const me = () => call("/api/auth/me");

/* ── fichiers ─────────────────────────────────────────────────────────── */

export const listFiles = cat => call(`/api/files${cat ? `?cat=${cat}` : ""}`);

export const removeFile = id => call(`/api/file/${id}`, { method: "DELETE" });

/**
 * Envoi decoupe.
 * onProgress recoit ({ done, total, percent }) apres chaque morceau.
 */
export async function upload(file, cat, onProgress) {
  const init = await call("/api/upload/init", {
    method: "POST",
    body: JSON.stringify({ name: file.name, size: file.size, cat }),
  });

  const { uploadId, chunkSize, parts } = init;
  const chunks = [];

  for (let i = 0; i < parts; i++) {
    const slice = file.slice(i * chunkSize, (i + 1) * chunkSize);
    const part = await call(`/api/upload/chunk?uploadId=${uploadId}&idx=${i}`, {
      method: "POST",
      body: slice,
    });
    chunks.push(part);
    onProgress?.({ done: i + 1, total: parts, percent: Math.round((i + 1) / parts * 100) });
  }

  return call("/api/upload/complete", {
    method: "POST",
    body: JSON.stringify({ name: file.name, size: file.size, cat: init.cat, chunks }),
  });
}

const MIME = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
  webp: "image/webp", bmp: "image/bmp", svg: "image/svg+xml", heic: "image/heic",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", mkv: "video/x-matroska",
  "3gp": "video/3gpp", m4v: "video/mp4", avi: "video/x-msvideo",
  mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4",
  flac: "audio/flac", aac: "audio/aac", opus: "audio/opus",
  pdf: "application/pdf", txt: "text/plain", csv: "text/csv",
  zip: "application/zip", apk: "application/vnd.android.package-archive",
};

const mimeOf = name => MIME[(name.split(".").pop() || "").toLowerCase()] || "application/octet-stream";

/**
 * Telechargement : recupere chaque morceau puis les recolle en un seul Blob.
 *
 * Tout tient en memoire. Au-dela d'environ 500 Mo, un telephone d'entree de
 * gamme peut manquer de RAM — passer alors par l'API File System Access, ou
 * proposer le fichier en plusieurs parties.
 */
export async function download(id, onProgress) {
  const meta = await call(`/api/file/${id}/urls`);
  const blobs = [];

  for (const part of meta.parts) {
    const res = await fetch(part.url, { headers: { authorization: `Bearer ${token()}` } });
    if (!res.ok) throw new Error(`Morceau ${part.idx} indisponible`);
    blobs.push(await res.blob());
    onProgress?.({
      done: blobs.length,
      total: meta.parts.length,
      percent: Math.round(blobs.length / meta.parts.length * 100),
    });
  }

  return { blob: new Blob(blobs, { type: mimeOf(meta.name) }), name: meta.name, cat: meta.cat };
}

/** Assemble puis declenche l'enregistrement. */
export async function downloadToDisk(id, onProgress) {
  const { blob, name } = await download(id, onProgress);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** URL utilisable directement par <img>, <video> ou <audio>. */
export async function objectUrl(id, onProgress) {
  const { blob } = await download(id, onProgress);
  return URL.createObjectURL(blob);
}
