/**
 * Couche Telegram — stockage et index.
 *
 * Le canal prive sert a la fois de stockage (les morceaux de 18 Mo) et de base
 * de donnees (un index JSON par utilisateur). Un message epingle, dont l'ID ne
 * change jamais, contient la table qui relie chaque utilisateur a son index.
 * C'est ce point fixe qui rend le reste retrouvable.
 */

const API = "https://api.telegram.org";

/* ── pool de bots ─────────────────────────────────────────────────────── */

export function bots(env) {
  const list = (env.TELEGRAM_BOT_TOKENS || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!list.length) throw new Error("TELEGRAM_BOT_TOKENS manquant");
  return list;
}

/** Repartit la charge : chaque morceau part sur un bot different. */
function pickBot(env, seed = 0) {
  const list = bots(env);
  return list[seed % list.length];
}

async function tg(token, method, body, isForm = false) {
  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    ...(isForm ? { body } : {
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description || res.status}`);
  return json.result;
}

/* ── morceaux ─────────────────────────────────────────────────────────── */

/**
 * Envoie un morceau. Retourne le file_id, seule valeur durable.
 * Ne jamais stocker file_path : il expire au bout d'environ une heure.
 */
export async function putChunk(env, blob, label, seed) {
  const token = pickBot(env, seed);
  const form = new FormData();
  form.append("chat_id", env.TELEGRAM_CHANNEL_ID);
  form.append("document", blob, label);
  form.append("disable_notification", "true");

  const msg = await tg(token, "sendDocument", form, true);
  return {
    file_id: msg.document.file_id,
    message_id: msg.message_id,
    bot: bots(env).indexOf(token),
    size: msg.document.file_size,
  };
}

/** Resout un file_id en URL de telechargement fraiche. */
export async function chunkUrl(env, file_id, botIndex = 0) {
  const list = bots(env);
  const token = list[botIndex] || list[0];
  const f = await tg(token, "getFile", { file_id });
  return `${API}/file/bot${token}/${f.file_path}`;
}

export async function dropChunk(env, message_id, botIndex = 0) {
  const list = bots(env);
  const token = list[botIndex] || list[0];
  try {
    await tg(token, "deleteMessage", { chat_id: env.TELEGRAM_CHANNEL_ID, message_id });
  } catch {
    // un message trop ancien n'est plus supprimable — sans consequence,
    // l'entree a deja disparu de l'index
  }
}

/* ── registre (message epingle) ───────────────────────────────────────── */

async function readPinned(env) {
  const token = pickBot(env, 0);
  // editMessageText echoue avec "message is not modified" si le texte est
  // identique : on s'en sert pour lire le contenu actuel sans le changer.
  try {
    const msg = await tg(token, "forwardMessage", {
      chat_id: env.TELEGRAM_CHANNEL_ID,
      from_chat_id: env.TELEGRAM_CHANNEL_ID,
      message_id: Number(env.REGISTRY_MESSAGE_ID),
      disable_notification: true,
    });
    const text = msg.text || "{}";
    await tg(token, "deleteMessage", {
      chat_id: env.TELEGRAM_CHANNEL_ID,
      message_id: msg.message_id,
    });
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function writePinned(env, table) {
  const token = pickBot(env, 0);
  const text = JSON.stringify(table);
  if (text.length > 4000) {
    throw new Error("Registre plein — passer au partitionnement (registry_0, registry_1, ...)");
  }
  await tg(token, "editMessageText", {
    chat_id: env.TELEGRAM_CHANNEL_ID,
    message_id: Number(env.REGISTRY_MESSAGE_ID),
    text,
  });
}

/* ── index utilisateur ────────────────────────────────────────────────── */

const emptyIndex = (userId, email) => ({
  v: 1,
  userId,
  email,
  quota: 100 * 1024 ** 3,
  used: 0,
  files: [],
  updated: Date.now(),
});

export async function loadIndex(env, userId, email) {
  const table = await readPinned(env);
  const fileId = table[`u_${userId}`];
  if (!fileId) return emptyIndex(userId, email);

  const url = await chunkUrl(env, fileId);
  const res = await fetch(url);
  if (!res.ok) return emptyIndex(userId, email);
  return await res.json();
}

export async function saveIndex(env, index) {
  index.updated = Date.now();
  const blob = new Blob([JSON.stringify(index)], { type: "application/json" });
  const { file_id } = await putChunk(env, blob, `index_${index.userId}.json`, 0);

  const table = await readPinned(env);
  table[`u_${index.userId}`] = file_id;
  await writePinned(env, table);
  return index;
}

/**
 * Lecture-modification-ecriture avec quelques tentatives.
 *
 * Deux ecritures simultanees sur le registre : la derniere gagne, la premiere
 * est perdue. La reprise attenue le probleme sans le supprimer. Pour un vrai
 * verrou, il faut un Durable Object — a prevoir avant la montee en charge.
 */
export async function mutateIndex(env, userId, email, fn, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const index = await loadIndex(env, userId, email);
      const next = await fn(index);
      return await saveIndex(env, next);
    } catch (e) {
      last = e;
      await new Promise(r => setTimeout(r, 180 * (i + 1)));
    }
  }
  throw last;
}
