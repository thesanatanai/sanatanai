const STATIC_CACHE = "sanatanai";
const OFFLINE_URLs = ["/offline.html", "/manifest.json", "/favicon.ico"];
const offlineFallbackResponse = () =>
  caches.open(STATIC_CACHE).then((cache) => cache.match(OFFLINE_URLs[0]));

// 1. INSTALL: Pre-cache core shell and the offline page
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.allSettled(
        OFFLINE_URLs.map((url) =>
          fetch(url, { cache: "reload" }).then((response) => {
            if (!response.ok) {
              throw new Error(`${url} returned ${response.status}`);
            }
            return cache.put(url, response);
          }),
        ),
      ),
    ),
  );
  event.target.skipWaiting();
});

// 2. ACTIVATE: Clean up older cache versions
self.addEventListener("activate", (event) => {
  event.waitUntil(caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => key !== STATIC_CACHE && caches.delete(key)),
        ),
      ));
  self.clients.claim();
});

const cacheFirstWithTimeout = async (request, cacheKey) => {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(cacheKey || "");

  const networkPromise = fetch(request)
    .then((networkResponse) => {
      if (
        networkResponse &&
        (networkResponse.ok || networkResponse.type === "opaque") &&
        cacheKey
      ) {
        const responseToCache = networkResponse.clone();
        cache.put(cacheKey, responseToCache).catch((err) => {
          console.warn("[SW] cache.put failed", cacheKey, err);
        });
      }
      return networkResponse;
    })
    .catch(() => null);

  if (cachedResponse) {
    return cachedResponse;
  }

  return cache.match(cacheKey).then((response) => response || networkPromise);
};

// 3. FETCH: Prefer fresh network responses, but fall back to cache quickly when the network is slow
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  const isImage =
    event.request.destination === "image" ||
    /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname);
  const isFont =
    event.request.destination == "font" ||
    /\.(woff2|woff|ttf)$/i.test(url.pathname);
  const isIcon = url.href.includes("icons/");
  const isOfflineAsset = OFFLINE_URLs.includes(url.pathname);
  const cacheKey = isOfflineAsset ? url.pathname : event.request;
  if (isImage || isFont || isOfflineAsset || isIcon) {
    event.respondWith(cacheFirstWithTimeout(event.request, cacheKey));
    return;
  }
  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request);
          return networkResponse;
        } catch {
          const cache = await caches.open(STATIC_CACHE);
          const cachedResponse = await cache.match(OFFLINE_URLs[0]);
          return cachedResponse || offlineFallbackResponse();
        }
      })()
    );
  }
});
