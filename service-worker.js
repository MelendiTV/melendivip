const CACHE_NAME = "melendi-vip-v4";

const urlsToCache = [
  "/",
  "/index.html",
  "/about.html",
  "/clubs.html",
  "/guides.html",
  "/contact.html",
  "/reservation.html",
  "/services.html",
  "/vip-info.html",
  "/privacy.html",
  "/terms.html",
  "/best-strip-clubs-las-vegas.html",
  "/strip-clubs-near-las-vegas.html",
  "/las-vegas-strip-club-rules.html",
  "/sapphire.html",
  "/sapphire-guide.html",
  "/scores.html",
  "/scores-guide.html",
  "/honeys.html",
  "/honeys-guide.html",
  "/hustler.html",
  "/hustler-guide.html",
  "/peppermint-hippo.html",
  "/peppermint-hippo-guide.html",
  "/crazy-horse.html",
  "/crazyhorse-guide.html",
  "/diamond-cabaret.html",
  "/diamond-guide.html",
  "/treasures.html",
  "/treasure-guide.html"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

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
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
