const CACHE_NAME = "melendi-cache-v5";

const urlsToCache = [
  "/",
  "/index.html",
  "/best-strip-clubs-las-vegas.html",
  "/guides.html",
  "/reservation.html",
  "/contact.html",
  "/about.html",
  "/privacy.html",
  "/terms.html",

  // CLUBS
  "/sapphire.html",
  "/spearmint-rhino.html",
  "/crazy-horse.html",
  "/treasures.html",
  "/hustler.html",
  "/scores.html",
  "/peppermint-hippo.html",
  "/deja-vu.html",
  "/diamond-cabaret.html",
  "/honeys.html",
  "/airstrip.html",
  "/las-vegas-strip-club.html",

  // GUIDES
  "/sapphire-guide.html",
  "/spearmint-rhino-guide.html",
  "/crazyhorse-guide.html",
  "/treasures-guide.html",
  "/hustler-guide.html",
  "/scores-guide.html",
  "/peppermint-hippo-guide.html",
  "/deja-vu-guide.html",
  "/diamond-guide.html",
  "/honeys-guide.html",
  "/airstrip-guide.html",
  "/las-vegas-strip-club-guide.html"
];

// INSTALL
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
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

// FETCH
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));

          return response;
        })
        .catch(() => {
          if (event.request.destination === "document") {
            return caches.match("/index.html");
          }
        });

      return cached || networkFetch;
    })
  );
});
