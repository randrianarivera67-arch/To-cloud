import {
  putChunk, chunkUrl, dropChunk, loadIndex, saveIndex, mutateIndex,
} from "./telegram.js";
import {
  hashPassword, verifyPassword, issueToken, readToken, bearer,
  signChunk, checkChunk, signShare, userIdFor, newId,
} from "./auth.js";

/* ── reponses ─────────────────────────────────────────────────────────── */

const cors = env => ({
  "access-control-allow-origin": env.ALLOWED_ORIGIN || "*",
  "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
  "access-control-allow-headers": "authorization,content-type",
  "access-control-max-age": "86400",
});

const json = (env, data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...cors(env) },
  });

const fail = (env, msg, status = 400) => json(env, { error: msg }, status);

/* ── categories ───────────────────────────────────────────────────────── */

const EXT = {
  sary:  ["jpg", "jpeg", "png", "gif", "webp", "heic", "bmp", "svg"],
  video: ["mp4", "mkv", "mov", "avi", "webm", "3gp", "m4v"],
  feo:   ["mp3", "wav", "ogg", "m4a", "flac", "aac", "opus"],
  doc:   ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "odt"],
  apk:   ["apk", "aab", "xapk"],
};

function categorize(name, hinted) {
  if (hinted && (EXT[hinted] || hinted === "hafa")) return hinted;
  const ext = (name.split(".").pop() || "").toLowerCase();
  for (const [key, list] of Object.entries(EXT)) if (list.includes(ext)) return key;
  return "hafa";
}

/* ── garde ────────────────────────────────────────────────────────────── */

async function requireUser(env, request) {
  const session = await readToken(env, bearer(request));
  if (!session) throw json(env, { error: "Session expiree" }, 401);
  return session;
}

/* ── routes ───────────────────────────────────────────────────────────── */

async function register(env, request) {
  const { name, email, password } = await request.json();
  if (!/^\S+@\S+\.\S+$/.test(email || "")) return fail(env, "Adresse e-mail invalide");
  if ((password || "").length < 8) return fail(env, "Mot de passe trop court");

  const userId = await userIdFor(email);
  const existing = await loadIndex(env, userId, email);
  if (existing.auth) return fail(env, "Ce compte existe deja", 409);

  const { hash, salt } = await hashPassword(password);
  existing.auth = { hash, salt, provider: "email", created: Date.now() };
  existing.name = (name || email.split("@")[0]).trim();
  await saveIndex(env, existing);

  return json(env, {
    token: await issueToken(env, { userId, email }),
    user: { name: existing.name, email, quota: existing.quota, used: existing.used },
  });
}

async function login(env, request) {
  const { email, password } = await request.json();
  const userId = await userIdFor(email || "");
  const index = await loadIndex(env, userId, email);

  if (!index.auth || index.auth.provider !== "email") {
    return fail(env, "Identifiants incorrects", 401);
  }
  const ok = await verifyPassword(password || "", index.auth.hash, index.auth.salt);
  if (!ok) return fail(env, "Identifiants incorrects", 401);

  return json(env, {
    token: await issueToken(env, { userId, email }),
    user: { name: index.name, email, quota: index.quota, used: index.used },
  });
}

async function me(env, request) {
  const s = await requireUser(env, request);
  const index = await loadIndex(env, s.userId, s.email);
  return json(env, {
    user: { name: index.name, email: s.email, quota: index.quota, used: index.used },
  });
}

async function listFiles(env, request) {
  const s = await requireUser(env, request);
  const index = await loadIndex(env, s.userId, s.email);

  const q = new URL(request.url).searchParams;
  const cat = q.get("cat");
  const folder = q.get("folder");
  const withThumbs = q.get("thumbs") === "1";
  const limit = Math.min(60, Math.max(1, Number(q.get("limit") || 20)));
  const cursor = Number(q.get("cursor") || 0);

  const all = (index.files || [])
    .filter(f => !cat || f.cat === cat)
    .filter(f => !folder ? true : (f.folder || "root") === folder)
    .sort((a, b) => b.created - a.created);

  const page = all.slice(cursor, cursor + limit).map(({ chunks, thumb, ...rest }) => ({
    ...rest,
    parts: chunks.length,
    ...(withThumbs && thumb ? { thumb } : {}),
  }));

  return json(env, {
    files: page,
    total: all.length,
    cursor: cursor + page.length,
    done: cursor + page.length >= all.length,
    quota: index.quota,
    used: index.used,
    counts: (index.files || []).reduce((m, f) => {
      const e = m[f.cat] || (m[f.cat] = { n: 0, bytes: 0 });
      e.n += 1; e.bytes += f.size;
      return m;
    }, {}),
    folders: index.folders || [],
    trashCount: (index.trash || []).length,
  });
}

/** Reserve la place avant l'envoi — evite de decouvrir le quota au dernier morceau. */
async function uploadInit(env, request) {
  const s = await requireUser(env, request);
  const { name, size, cat } = await request.json();
  if (!name || !size) return fail(env, "Nom ou taille manquant");

  const index = await loadIndex(env, s.userId, s.email);
  if (index.used + size > index.quota) {
    return fail(env, "Quota depasse — contactez l'administrateur", 507);
  }

  const chunkSize = Number(env.CHUNK_SIZE || 18874368);
  return json(env, {
    uploadId: newId(),
    chunkSize,
    parts: Math.ceil(size / chunkSize),
    cat: categorize(name, cat),
  });
}

async function uploadChunk(env, request) {
  await requireUser(env, request);
  const url = new URL(request.url);
  const uploadId = url.searchParams.get("uploadId");
  const idx = Number(url.searchParams.get("idx"));
  if (!uploadId || Number.isNaN(idx)) return fail(env, "Parametres manquants");

  const blob = await request.blob();
  if (!blob.size) return fail(env, "Morceau vide");

  const part = await putChunk(env, blob, `${uploadId}_${String(idx).padStart(4, "0")}.part`, idx);
  return json(env, { idx, ...part });
}

async function uploadComplete(env, request) {
  const s = await requireUser(env, request);
  const { name, size, cat, chunks, thumb, folder } = await request.json();
  if (!Array.isArray(chunks) || !chunks.length) return fail(env, "Aucun morceau");

  const id = newId();
  const record = {
    id,
    name,
    size,
    cat: categorize(name, cat),
    created: Date.now(),
    // vignette WebP ~4 Ko generee par le navigateur : evite de telecharger
    // l'image entiere juste pour peupler une grille
    ...(thumb ? { thumb } : {}),
    ...(folder ? { folder } : {}),
    chunks: chunks
      .sort((a, b) => a.idx - b.idx)
      .map(c => ({ i: c.idx, f: c.file_id, m: c.message_id, b: c.bot, s: c.size })),
  };

  await mutateIndex(env, s.userId, s.email, index => {
    if (index.used + size > index.quota) throw new Error("Quota depasse");
    index.files.push(record);
    index.used += size;
    return index;
  });

  return json(env, { id, cat: record.cat });
}

/**
 * Rend la liste des morceaux a assembler.
 * Le navigateur telecharge et recolle — la bande passante ne passe pas par
 * le Worker, ce qui garde le cout a zero.
 */
async function fileUrls(env, request, id) {
  const s = await requireUser(env, request);
  const index = await loadIndex(env, s.userId, s.email);
  const file = index.files.find(f => f.id === id);
  if (!file) return fail(env, "Fichier introuvable", 404);

  const parts = await Promise.all(file.chunks.map(async c => ({
    idx: c.i,
    size: c.s,
    url: `${new URL(request.url).origin}/api/dl/${id}/${c.i}?t=${await signChunk(env, id, c.i)}`,
  })));

  return json(env, { name: file.name, size: file.size, cat: file.cat, parts });
}

/**
 * Renvoie les octets d'un morceau.
 *
 * Une redirection 302 vers api.telegram.org serait moins couteuse, mais
 * Telegram n'envoie aucun en-tete CORS : le navigateur refuse alors la
 * reponse. Le Worker doit donc relayer le flux. Il le fait en streaming, sans
 * rien garder en memoire.
 */
async function download(env, request, id, idx) {
  const token = new URL(request.url).searchParams.get("t");
  if (!await checkChunk(env, id, Number(idx), token)) return fail(env, "Lien expire", 403);

  const s = await readToken(env, bearer(request));
  if (!s) return fail(env, "Session expiree", 401);

  const index = await loadIndex(env, s.userId, s.email);
  const file = index.files.find(f => f.id === id);
  const chunk = file?.chunks.find(c => c.i === Number(idx));
  if (!chunk) return fail(env, "Morceau introuvable", 404);

  const url = await chunkUrl(env, chunk.f, chunk.b);
  const upstream = await fetch(url);
  if (!upstream.ok) return fail(env, "Morceau indisponible sur le canal", 502);

  return new Response(upstream.body, {
    headers: {
      "content-type": "application/octet-stream",
      "content-length": String(chunk.s),
      "cache-control": "private, max-age=600",
      ...cors(env),
    },
  });
}

/**
 * Suppression douce.
 *
 * Le fichier quitte la liste mais ses morceaux restent sur le canal : c'est ce
 * qui rend la restauration possible. Le quota n'est libere qu'a la purge, sinon
 * on promettrait de la place toujours occupee.
 */
async function remove(env, request, id) {
  const s = await requireUser(env, request);

  await mutateIndex(env, s.userId, s.email, index => {
    const i = index.files.findIndex(f => f.id === id);
    if (i === -1) throw new Error("Fichier introuvable");
    const victim = index.files.splice(i, 1)[0];
    victim.deleted = Date.now();
    (index.trash ||= []).push(victim);
    return index;
  });

  return json(env, { ok: true });
}

async function listTrash(env, request) {
  const s = await requireUser(env, request);
  const index = await loadIndex(env, s.userId, s.email);
  const files = (index.trash || [])
    .sort((a, b) => b.deleted - a.deleted)
    .map(({ chunks, thumb, ...rest }) => ({ ...rest, parts: chunks.length }));
  return json(env, { files });
}

async function restore(env, request, id) {
  const s = await requireUser(env, request);
  await mutateIndex(env, s.userId, s.email, index => {
    const i = (index.trash || []).findIndex(f => f.id === id);
    if (i === -1) throw new Error("Introuvable dans la corbeille");
    const back = index.trash.splice(i, 1)[0];
    delete back.deleted;
    index.files.push(back);
    return index;
  });
  return json(env, { ok: true });
}

/** Efface pour de bon : morceaux retires du canal, quota rendu. */
async function purge(env, request, id) {
  const s = await requireUser(env, request);
  const gone = [];

  await mutateIndex(env, s.userId, s.email, index => {
    const keep = [];
    for (const f of (index.trash || [])) {
      if (id === "all" || f.id === id) {
        gone.push(f);
        index.used = Math.max(0, index.used - f.size);
      } else keep.push(f);
    }
    if (!gone.length) throw new Error("Rien a purger");
    index.trash = keep;
    return index;
  });

  for (const f of gone) {
    for (const c of f.chunks) await dropChunk(env, c.m, c.b);
  }
  return json(env, { ok: true, removed: gone.length });
}

/* ── dossiers ── */

async function addFolder(env, request) {
  const s = await requireUser(env, request);
  const { name, cat } = await request.json();
  if (!name || !name.trim()) return fail(env, "Nom de dossier vide");

  const folder = {
    id: newId(),
    name: name.trim().slice(0, 60),
    cat: cat || null,
    created: Date.now(),
  };
  await mutateIndex(env, s.userId, s.email, index => {
    (index.folders ||= []).push(folder);
    return index;
  });
  return json(env, folder);
}

/** Le dossier disparait, ses fichiers remontent a la racine — jamais supprimes. */
async function dropFolder(env, request, id) {
  const s = await requireUser(env, request);
  await mutateIndex(env, s.userId, s.email, index => {
    index.folders = (index.folders || []).filter(f => f.id !== id);
    index.files.forEach(f => { if (f.folder === id) delete f.folder; });
    return index;
  });
  return json(env, { ok: true });
}

async function moveFile(env, request, id) {
  const s = await requireUser(env, request);
  const { folder } = await request.json();
  await mutateIndex(env, s.userId, s.email, index => {
    const f = index.files.find(x => x.id === id);
    if (!f) throw new Error("Fichier introuvable");
    if (folder) f.folder = folder; else delete f.folder;
    return index;
  });
  return json(env, { ok: true });
}

/* ── partage ── */

/**
 * Fabrique un lien public temporaire.
 *
 * L'identifiant du compte voyage dans l'URL : sans lui, impossible de
 * retrouver l'index sans session. Le jeton signe empeche de deviner les liens
 * des autres.
 */
async function makeShare(env, request, id) {
  const s = await requireUser(env, request);
  const index = await loadIndex(env, s.userId, s.email);
  const file = index.files.find(f => f.id === id);
  if (!file) return fail(env, "Fichier introuvable", 404);

  const days = 7;
  const exp = Date.now() + days * 86400_000;
  const mac = await signShare(env, s.userId, id, exp);
  const origin = new URL(request.url).origin;

  return json(env, {
    url: `${origin}/api/s/${s.userId}/${id}?e=${exp}&t=${mac}`,
    expires: exp,
    days,
  });
}

/** Sert le fichier entier, morceaux recolles a la volee, sans session. */
async function serveShare(env, request, userId, id) {
  const q = new URL(request.url).searchParams;
  const exp = Number(q.get("e") || 0);
  const mac = q.get("t");

  if (!exp || exp < Date.now()) return fail(env, "Lien expire", 410);
  if (await signShare(env, userId, id, exp) !== mac) return fail(env, "Lien invalide", 403);

  const index = await loadIndex(env, userId, null);
  const file = index.files.find(f => f.id === id);
  if (!file) return fail(env, "Fichier introuvable", 404);

  const chunks = [...file.chunks].sort((a, b) => a.i - b.i);

  // flux continu : le Worker ne garde jamais le fichier entier en memoire
  const stream = new ReadableStream({
    async start(ctrl) {
      try {
        for (const c of chunks) {
          const url = await chunkUrl(env, c.f, c.b);
          const res = await fetch(url);
          if (!res.ok) throw new Error(`morceau ${c.i}`);
          const reader = res.body.getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            ctrl.enqueue(value);
          }
        }
        ctrl.close();
      } catch (e) {
        ctrl.error(e);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/octet-stream",
      "content-length": String(file.size),
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "cache-control": "private, max-age=600",
    },
  });
}

/* ── routeur ──────────────────────────────────────────────────────────── */

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors(env) });

    const { pathname } = new URL(request.url);
    const seg = pathname.split("/").filter(Boolean);   // ["api", ...]

    try {
      if (seg[0] !== "api") return fail(env, "Introuvable", 404);

      if (seg[1] === "auth") {
        if (seg[2] === "register" && request.method === "POST") return await register(env, request);
        if (seg[2] === "login"    && request.method === "POST") return await login(env, request);
        if (seg[2] === "me"       && request.method === "GET")  return await me(env, request);
      }

      if (seg[1] === "files" && request.method === "GET") return await listFiles(env, request);

      if (seg[1] === "upload") {
        if (seg[2] === "init"     && request.method === "POST") return await uploadInit(env, request);
        if (seg[2] === "chunk"    && request.method === "POST") return await uploadChunk(env, request);
        if (seg[2] === "complete" && request.method === "POST") return await uploadComplete(env, request);
      }

      if (seg[1] === "trash") {
        if (!seg[2] && request.method === "GET")    return await listTrash(env, request);
        if (seg[2] && request.method === "DELETE")  return await purge(env, request, seg[2]);
      }

      if (seg[1] === "folders") {
        if (!seg[2] && request.method === "POST")   return await addFolder(env, request);
        if (seg[2] && request.method === "DELETE")  return await dropFolder(env, request, seg[2]);
      }

      if (seg[1] === "file" && seg[2]) {
        if (seg[3] === "restore" && request.method === "POST") return await restore(env, request, seg[2]);
        if (seg[3] === "move"    && request.method === "POST") return await moveFile(env, request, seg[2]);
        if (seg[3] === "share"   && request.method === "POST") return await makeShare(env, request, seg[2]);
        if (seg[3] === "urls" && request.method === "GET")    return await fileUrls(env, request, seg[2]);
        if (request.method === "DELETE")                      return await remove(env, request, seg[2]);
      }

      if (seg[1] === "s" && seg[2] && seg[3]) return await serveShare(env, request, seg[2], seg[3]);

      if (seg[1] === "dl" && seg[2] && seg[3]) return await download(env, request, seg[2], seg[3]);

      return fail(env, "Introuvable", 404);
    } catch (e) {
      if (e instanceof Response) return e;
      return fail(env, e.message || "Erreur interne", 500);
    }
  },
};
