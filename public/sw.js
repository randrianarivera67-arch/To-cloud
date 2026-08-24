/**
 * Cache des ressources et lecture en continu.
 *
 * Deux roles :
 *
 * 1. Garder les fichiers de l'application. Ils portent un hash dans leur nom,
 *    donc ne changent jamais sous la meme URL : les servir depuis le cache est
 *    sans risque, et une ouverture suivante ne coute presque rien.
 *
 * 2. Servir les medias par tranches. Une video de 400 Mo etait auparavant
 *    telechargee en entier avant la premiere image — plusieurs minutes
 *    d'attente et autant de forfait a chaque visionnage. Ici, le lecteur
 *    demande « les octets 12 000 000 a 14 000 000 » et seuls les morceaux
 *    concernes sont recuperes. La lecture demarre vite et l'avance rapide
 *    fonctionne.
 */

const CACHE = "tocloud-v2";
const MEDIA = "tocloud-media";
const SHELL = ["/", "/index.html"];

/** Metadonnees transmises par la page : disposition des morceaux et jeton. */
const files = new Map();

/* Au-dela, on garde les morceaux les plus recents et on oublie les autres,
   pour ne pas remplir le stockage du telephone. */
const MAX_CACHED_CHUNKS = 40;

/* Taille maximale d'une reponse partielle. Le lecteur redemandera la suite ;
   assembler davantage ne ferait qu'allonger l'attente initiale. */
const MAX_SLICE = 6 * 1024 * 1024;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE && k !== MEDIA).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => {
  const m = e.data;
  if (m?.type === "tc-file") {
    files.set(m.id, {
      token: m.token,
      api: m.api,
      mime: m.mime,
      size: m.size,
      chunks: m.chunks,          // [{ idx, size }] dans l'ordre
      offsets: cumulative(m.chunks),
    });
    e.ports?.[0]?.postMessage({ ok: true });
  }
  if (m?.type === "tc-forget") files.delete(m.id);
});

function cumulative(chunks) {
  const out = [];
  let total = 0;
  for (const c of chunks) { out.push(total); total += c.size; }
  return out;
}

/* ─────────── morceaux ─────────── */

async function trim() {
  const cache = await caches.open(MEDIA);
  const keys = await cache.keys();
  if (keys.length <= MAX_CACHED_CHUNKS) return;
  // les entrees les plus anciennes viennent en tete
  for (const k of keys.slice(0, keys.length - MAX_CACHED_CHUNKS)) await cache.delete(k);
}

async function getChunk(id, idx) {
  const meta = files.get(id);
  const key = `/tc-chunk/${id}/${idx}`;
  const cache = await caches.open(MEDIA);

  const hit = await cache.match(key);
  if (hit) return new Uint8Array(await hit.arrayBuffer());

  const res = await fetch(`${meta.api}/api/dl/${id}/${idx}`, {
    headers: { authorization: `Bearer ${meta.token}` },
  });
  if (!res.ok) throw new Error(`morceau ${idx} : ${res.status}`);

  const buf = await res.arrayBuffer();
  await cache.put(key, new Response(buf));
  trim();                        // sans attendre : le nettoyage n'urge pas
  return new Uint8Array(buf);
}

/** Octets [start, end] du fichier reconstitue, morceau par morceau. */
async function readRange(id, start, end) {
  const meta = files.get(id);
  const out = new Uint8Array(end - start + 1);
  let written = 0;

  for (let i = 0; i < meta.chunks.length && written < out.length; i++) {
    const from = meta.offsets[i];
    const to = from + meta.chunks[i].size - 1;
    if (to < start) continue;
    if (from > end) break;

    const data = await getChunk(id, meta.chunks[i].idx);
    const a = Math.max(start, from) - from;
    const b = Math.min(end, to) - from;
    out.set(data.subarray(a, b + 1), written);
    written += b - a + 1;
  }

  return written === out.length ? out : out.subarray(0, written);
}

async function serveMedia(request, id) {
  const meta = files.get(id);
  if (!meta) return new Response("Fichier inconnu de ce service worker", { status: 404 });

  const range = request.headers.get("range");

  // Sans en-tete Range, le lecteur veut tout : on repond quand meme par
  // tranches, sinon on retomberait sur le telechargement complet.
  let start = 0;
  let end = Math.min(meta.size - 1, MAX_SLICE - 1);

  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      start = m[1] ? Number(m[1]) : 0;
      const asked = m[2] ? Number(m[2]) : meta.size - 1;
      end = Math.min(asked, meta.size - 1, start + MAX_SLICE - 1);
    }
  }

  if (start >= meta.size) {
    return new Response(null, {
      status: 416,
      headers: { "content-range": `bytes */${meta.size}` },
    });
  }

  try {
    const body = await readRange(id, start, end);
    return new Response(body, {
      status: 206,
      headers: {
        "content-type": meta.mime || "application/octet-stream",
        "content-length": String(body.length),
        "content-range": `bytes ${start}-${start + body.length - 1}/${meta.size}`,
        "accept-ranges": "bytes",
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return new Response(e.message, { status: 502 });
  }
}

/* ─────────── interception ─────────── */

self.addEventListener("fetch", e => {
  const { request } = e;
  const url = new URL(request.url);

  if (url.origin === self.location.origin && url.pathname.startsWith("/tc-stream/")) {
    const id = url.pathname.split("/")[2];
    e.respondWith(serveMedia(request, id));
    return;
  }

  if (request.method !== "GET") return;

  if (url.pathname.startsWith("/api/") || url.origin !== self.location.origin) {
    if (/fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
      e.respondWith(
        caches.match(request).then(hit => hit || fetch(request).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(request, copy));
          return res;
        }))
      );
    }
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    e.respondWith(
      caches.match(request).then(hit => hit || fetch(request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(request, copy));
        return res;
      }))
    );
    return;
  }

  e.respondWith(
    fetch(request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request).then(hit => hit || caches.match("/index.html")))
  );
});
