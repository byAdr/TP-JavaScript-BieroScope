const NOM_CACHE = "bieroscope-statique-v3";

const FICHIERS_STATIQUES = ["./", "./index.html", "./style.css", "./app.js", "./stockage.js", "./add-beer.html", "./manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(NOM_CACHE).then((cache) => {
      return cache.addAll(FICHIERS_STATIQUES.map(chemin => new Request(chemin, { cache: "reload" })));
    }).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.delete("bieroscope-statique-v1"),
    caches.delete("bieroscope-statique-v2"),
    self.clients.claim(),
  ]));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request, { cacheName: NOM_CACHE }).then((reponseEnCache) => {
      return reponseEnCache ?? fetch(request);
    }),
  );
});

