/**
 * Authentification et signatures.
 *
 * Les Workers n'ont pas Argon2 ni bcrypt. PBKDF2-SHA256 via WebCrypto est
 * l'option realiste ici : plus faible qu'Argon2id face au materiel dedie, mais
 * correct avec un nombre d'iterations eleve. A savoir si la base de mots de
 * passe venait a fuiter.
 */

const enc = new TextEncoder();
const ITERATIONS = 100_000;

const b64u = buf =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const unb64u = str => {
  const pad = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "=".repeat((4 - pad.length % 4) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
};

/* ── mots de passe ────────────────────────────────────────────────────── */

export async function hashPassword(password, salt) {
  const s = salt ? unb64u(salt) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: s, iterations: ITERATIONS, hash: "SHA-256" },
    key, 256
  );
  return { hash: b64u(bits), salt: b64u(s) };
}

export async function verifyPassword(password, hash, salt) {
  const got = await hashPassword(password, salt);
  // comparaison a duree constante
  if (got.hash.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= got.hash.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}

/* ── HMAC ─────────────────────────────────────────────────────────────── */

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
}

async function sign(secret, data) {
  return b64u(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(data)));
}

/* ── jetons de session ────────────────────────────────────────────────── */

export async function issueToken(env, payload, days = 30) {
  const body = { ...payload, exp: Date.now() + days * 86400_000 };
  const data = b64u(enc.encode(JSON.stringify(body)));
  return `${data}.${await sign(env.JWT_SECRET, data)}`;
}

export async function readToken(env, token) {
  if (!token || !token.includes(".")) return null;
  const [data, mac] = token.split(".");
  if (await sign(env.JWT_SECRET, data) !== mac) return null;
  try {
    const body = JSON.parse(new TextDecoder().decode(unb64u(data)));
    return body.exp > Date.now() ? body : null;
  } catch {
    return null;
  }
}

export function bearer(request) {
  const h = request.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

/* ── liens de telechargement signes ───────────────────────────────────── */

/** Empeche d'enumerer les morceaux d'autrui. Courte duree de vie. */
export async function signChunk(env, fileId, idx, minutes = 30) {
  const exp = Date.now() + minutes * 60_000;
  const data = `${fileId}:${idx}:${exp}`;
  return `${exp}.${await sign(env.SIGN_SECRET, data)}`;
}

export async function checkChunk(env, fileId, idx, token) {
  if (!token || !token.includes(".")) return false;
  const [exp, mac] = token.split(".");
  if (Number(exp) < Date.now()) return false;
  return await sign(env.SIGN_SECRET, `${fileId}:${idx}:${exp}`) === mac;
}

/* ── identifiants ─────────────────────────────────────────────────────── */

export async function userIdFor(email) {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(email.toLowerCase().trim()));
  return b64u(buf).slice(0, 16);
}

export const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 20);
