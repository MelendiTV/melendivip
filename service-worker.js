const CACHE_NAME = "melendi-cache-v4";

const urlsToCache = [
  "/",
  "/index.html",
  "/styles.css",
  "/reservation.html",
  "/contact.html",
  "/privacy.html",
  "/terms.html",
  "/sapphire.html",
  "/scores.html",
  "/peppermint-hippo.html",
  "/sapphire-guide.html",
  "/scores-guide.html",
  "/peppermint-hippo-guide.html"
];

// INSTALL
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// ACTIVATE
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// FETCH (ESTRATEGIA PRO)
self.addEventListener("fetch", event => {

  // SOLO GET
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cached => {

      const networkFetch = fetch(event.request)
        .then(response => {

          // guardar solo si es válido
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          const clone = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, clone));

          return response;
        })
        .catch(() => {
          // fallback offline
          if (event.request.destination === "document") {
            return caches.match("/index.html");
          }
        });

      // ⚡ carga rápida desde cache + update en background
      return cached || networkFetch;
    })
  );
});
