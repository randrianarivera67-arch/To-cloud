/**
 * To-cloud — passerelle Telegram.
 *
 * Le Worker ne connait plus les comptes ni les fichiers : Supabase s'en charge.
 * Il ne fait que trois choses, et rien d'autre :
 *   1. deposer un morceau sur le canal prive
 *   2. rendre un morceau a son proprietaire
 *   3. servir un fichier entier derriere un lien de partage
 *
 * Le jeton de l'utilisateur est verifie a chaque appel, puis retransmis a
 * Supabase : c'est la base, via ses regles RLS, qui decide de ce que la
 * personne a le droit de voir. Le Worker ne tranche jamais lui-meme.
 */

const API = "https://api.telegram.org";

/* ─────────── reponses ─────────── */

const ORIGINS = [
  "https://localhost", "capacitor://localhost", "http://localhost",
  "http://localhost:5173", "http://localhost:4173",
];

const cors = (env, request) => {
  const origin = request?.headers.get("origin") || "";
  const allowed = [env.ALLOWED_ORIGIN, ...ORIGINS].filter(Boolean);
  return {
    "access-control-allow-origin": allowed.includes(origin) ? origin : (env.ALLOWED_ORIGIN || "*"),
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    "access-control-allow-headers": "authorization,content-type",
    "access-control-max-age": "86400",
    vary: "origin",
  };
};

const json = (env, request, data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...cors(env, request) },
  });

const fail = (env, request, msg, status = 400) => json(env, request, { error: msg }, status);

/* ─────────── jeton Supabase ─────────── */

const b64url = str => {
  const pad = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "=".repeat((4 - pad.length % 4) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
};

/**
 * Verifie la signature du jeton Supabase.
 *
 * Les projets recents signent en ES256 avec une paire de cles : le secret
 * partage n'existe plus. On recupere donc les cles publiques (JWKS) et on
 * verifie avec celle dont l'identifiant figure dans l'en-tete du jeton.
 *
 * HS256 reste accepte pour les projets plus anciens, si SUPABASE_JWT_SECRET
 * est fourni.
 */

let JWKS = { keys: [], at: 0 };

async function jwks(env) {
  // les cles changent rarement : une heure de cache evite un appel par requete
  if (JWKS.keys.length && Date.now() - JWKS.at < 3600_000) return JWKS.keys;

  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`, {
    headers: { apikey: env.SUPABASE_ANON_KEY },
  });
  if (!res.ok) throw new Error(`JWKS ${res.status}`);

  const data = await res.json();
  JWKS = { keys: data.keys || [], at: Date.now() };
  return JWKS.keys;
}

const ALG = {
  ES256: { name: "ECDSA", namedCurve: "P-256", hash: "SHA-256" },
  RS256: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
};

async function verifyJWT(env, jwt) {
  if (!jwt || jwt.split(".").length !== 3) return null;
  const [head, body, mac] = jwt.split(".");

  let header;
  try {
    header = JSON.parse(new TextDecoder().decode(b64url(head)));
  } catch {
    return null;
  }

  const signed = new TextEncoder().encode(`${head}.${body}`);
  let ok = false;

  if (header.alg === "HS256") {
    if (!env.SUPABASE_JWT_SECRET) return null;
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(env.SUPABASE_JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    ok = await crypto.subtle.verify("HMAC", key, b64url(mac), signed);
  } else {
    const spec = ALG[header.alg];
    if (!spec) return null;

    const jwk = (await jwks(env)).find(k => k.kid === header.kid);
    if (!jwk) return null;

    const key = await crypto.subtle.importKey("jwk", jwk, spec, false, ["verify"]);
    const params = header.alg === "ES256"
      ? { name: "ECDSA", hash: "SHA-256" }
      : { name: "RSASSA-PKCS1-v1_5" };
    ok = await crypto.subtle.verify(params, key, b64url(mac), signed);
  }
  if (!ok) return null;

  const claims = JSON.parse(new TextDecoder().decode(b64url(body)));
  if (claims.exp * 1000 < Date.now()) return null;
  return claims;      // claims.sub = identifiant de l'utilisateur
}

const bearer = request => {
  const h = request.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
};

/* ─────────── Supabase (lecture soumise a RLS) ─────────── */

/**
 * Interroge Supabase avec le jeton de l'appelant.
 * Les regles de la base filtrent le resultat : impossible de recuperer la ligne
 * de quelqu'un d'autre, meme en connaissant son identifiant.
 */
async function ask(env, jwt, path) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      authorization: `Bearer ${jwt}`,
      accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}

/** Requete de service, reservee au partage public (aucun utilisateur connecte). */
async function askAdmin(env, path) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}

/* ─────────── Telegram ─────────── */

const bots = env => {
  const list = (env.TELEGRAM_BOT_TOKENS || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!list.length) throw new Error("TELEGRAM_BOT_TOKENS manquant");
  return list;
};

async function tg(token, method, body, form = false) {
  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    ...(form ? { body } : {
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description || res.status}`);
  return data.result;
}

/** URL de telechargement fraiche : file_path expire en une heure environ. */
async function chunkUrl(env, fileId, botIndex = 0) {
  const list = bots(env);
  const token = list[botIndex] ?? list[0];
  const f = await tg(token, "getFile", { file_id: fileId });
  return `${API}/file/bot${token}/${f.file_path}`;
}

/* ─────────── routes ─────────── */

async function putChunk(env, request) {
  const claims = await verifyJWT(env, bearer(request));
  if (!claims) return fail(env, request, "Session expiree", 401);

  const idx = Number(new URL(request.url).searchParams.get("idx") || 0);
  const blob = await request.blob();
  if (!blob.size) return fail(env, request, "Morceau vide");

  const list = bots(env);
  const botIndex = idx % list.length;      // repartit la charge entre les bots

  const form = new FormData();
  form.append("chat_id", env.TELEGRAM_CHANNEL_ID);
  form.append("document", blob, `${claims.sub}_${String(idx).padStart(4, "0")}.part`);
  form.append("disable_notification", "true");

  const msg = await tg(list[botIndex], "sendDocument", form, true);

  return json(env, request, {
    file_id: msg.document.file_id,
    message_id: msg.message_id,
    bot: botIndex,
    size: msg.document.file_size,
  });
}

async function getChunk(env, request, fileId, idx) {
  const jwt = bearer(request);
  const claims = await verifyJWT(env, jwt);
  if (!claims) return fail(env, request, "Session expiree", 401);

  const rows = await ask(env, jwt,
    `chunks?file_id=eq.${fileId}&idx=eq.${Number(idx)}&select=tg_file_id,bot,size`);
  if (!rows.length) return fail(env, request, "Morceau introuvable", 404);

  const c = rows[0];
  const upstream = await fetch(await chunkUrl(env, c.tg_file_id, c.bot));
  if (!upstream.ok) return fail(env, request, "Morceau indisponible sur le canal", 502);

  return new Response(upstream.body, {
    headers: {
      "content-type": "application/octet-stream",
      "content-length": String(c.size),
      "cache-control": "private, max-age=600",
      ...cors(env, request),
    },
  });
}

/** Retire les morceaux du canal avant la suppression definitive de la ligne. */
async function dropChunks(env, request, fileId) {
  const jwt = bearer(request);
  const claims = await verifyJWT(env, jwt);
  if (!claims) return fail(env, request, "Session expiree", 401);

  const rows = await ask(env, jwt,
    `chunks?file_id=eq.${fileId}&select=tg_message_id,bot`);

  const list = bots(env);
  for (const c of rows) {
    if (!c.tg_message_id) continue;
    try {
      await tg(list[c.bot] ?? list[0], "deleteMessage", {
        chat_id: env.TELEGRAM_CHANNEL_ID,
        message_id: c.tg_message_id,
      });
    } catch {
      // un message trop ancien n'est plus supprimable : sans consequence,
      // la ligne disparait de toute facon
    }
  }
  return json(env, request, { ok: true, removed: rows.length });
}

/** Lien public : le fichier entier, morceaux recolles a la volee. */
async function serveShare(env, request, shareId) {
  const rows = await askAdmin(env,
    `shares?id=eq.${shareId}&select=expires_at,file_id,files(name,size)`);
  if (!rows.length) return fail(env, request, "Lien introuvable", 404);

  const share = rows[0];
  if (new Date(share.expires_at).getTime() < Date.now()) {
    return fail(env, request, "Lien expire", 410);
  }

  const chunks = await askAdmin(env,
    `chunks?file_id=eq.${share.file_id}&select=idx,tg_file_id,bot&order=idx.asc`);
  if (!chunks.length) return fail(env, request, "Fichier vide", 404);

  const stream = new ReadableStream({
    async start(ctrl) {
      try {
        for (const c of chunks) {
          const res = await fetch(await chunkUrl(env, c.tg_file_id, c.bot));
          if (!res.ok) throw new Error(`morceau ${c.idx}`);
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

  const file = share.files || {};
  return new Response(stream, {
    headers: {
      "content-type": "application/octet-stream",
      ...(file.size ? { "content-length": String(file.size) } : {}),
      "content-disposition":
        `attachment; filename*=UTF-8''${encodeURIComponent(file.name || "to-cloud")}`,
    },
  });
}

/* ─────────── routeur ─────────── */

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors(env, request) });
    }

    const seg = new URL(request.url).pathname.split("/").filter(Boolean);

    try {
      if (seg[0] !== "api") return fail(env, request, "Introuvable", 404);

      if (seg[1] === "upload" && seg[2] === "chunk" && request.method === "POST") {
        return await putChunk(env, request);
      }
      if (seg[1] === "dl" && seg[2] && seg[3]) {
        return await getChunk(env, request, seg[2], seg[3]);
      }
      if (seg[1] === "chunks" && seg[2] && request.method === "DELETE") {
        return await dropChunks(env, request, seg[2]);
      }
      if (seg[1] === "s" && seg[2]) {
        return await serveShare(env, request, seg[2]);
      }

      return fail(env, request, "Introuvable", 404);
    } catch (e) {
      return fail(env, request, e.message || "Erreur interne", 500);
    }
  },
};
