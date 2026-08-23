/**
 * Cache des ressources de l'application.
 *
 * Le premier chargement coute environ 200 Ko. Sans cache, ce montant se repaie
 * a chaque ouverture — cher sur un forfait mobile. Les fichiers produits par
 * Vite portent un hash dans leur nom : ils ne changent jamais sous la meme URL,
 * donc on peut les servir depuis le cache sans risque de version perimee.
 *
 * Les appels a l'API ne sont jamais mis en cache : ils doivent rester frais.
 */

const CACHE = "tocloud-v1";
const SHELL = ["/", "/index.html"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const { request } = e;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // API, Telegram, tout ce qui est dynamique : reseau uniquement
  if (url.pathname.startsWith("/api/") || url.origin !== self.location.origin) {
    // les polices Google valent la peine d'etre gardees
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

  // ressources versionnees : cache d'abord
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

  // page : reseau d'abord, cache en secours hors connexion
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
