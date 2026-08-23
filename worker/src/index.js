import {
  putChunk, chunkUrl, dropChunk, loadIndex, saveIndex, mutateIndex,
} from "./telegram.js";
import {
  hashPassword, verifyPassword, issueToken, readToken, bearer,
  signChunk, checkChunk, userIdFor, newId,
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
  const cat = new URL(request.url).searchParams.get("cat");

  const files = index.files
    .filter(f => !cat || f.cat === cat)
    .sort((a, b) => b.created - a.created)
    .map(({ chunks, ...rest }) => ({ ...rest, parts: chunks.length }));

  return json(env, { files, quota: index.quota, used: index.used });
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
  const { name, size, cat, chunks } = await request.json();
  if (!Array.isArray(chunks) || !chunks.length) return fail(env, "Aucun morceau");

  const id = newId();
  const record = {
    id,
    name,
    size,
    cat: categorize(name, cat),
    created: Date.now(),
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
  return Response.redirect(url, 302);
}

async function remove(env, request, id) {
  const s = await requireUser(env, request);
  let victim = null;

  await mutateIndex(env, s.userId, s.email, index => {
    const i = index.files.findIndex(f => f.id === id);
    if (i === -1) throw new Error("Fichier introuvable");
    victim = index.files[i];
    index.files.splice(i, 1);
    index.used = Math.max(0, index.used - victim.size);
    return index;
  });

  // L'index fait foi : si le menage echoue, le fichier a deja disparu pour
  // l'utilisateur et il ne reste qu'un morceau orphelin cote canal.
  if (victim) {
    for (const c of victim.chunks) await dropChunk(env, c.m, c.b);
  }
  return json(env, { ok: true });
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

      if (seg[1] === "file" && seg[2]) {
        if (seg[3] === "urls" && request.method === "GET")    return await fileUrls(env, request, seg[2]);
        if (request.method === "DELETE")                      return await remove(env, request, seg[2]);
      }

      if (seg[1] === "dl" && seg[2] && seg[3]) return await download(env, request, seg[2], seg[3]);

      return fail(env, "Introuvable", 404);
    } catch (e) {
      if (e instanceof Response) return e;
      return fail(env, e.message || "Erreur interne", 500);
    }
  },
};
