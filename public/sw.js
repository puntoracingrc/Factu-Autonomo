const STATIC_CACHE = "factu-pwa-static-v5";
const CACHE_PREFIX = "factu-pwa-";
const MAX_NEXT_STATIC_ENTRIES = 160;
const PRECACHE_URLS = [
  "/manifest.json",
  "/favicon-16.png",
  "/favicon-32.png",
  "/icon-72.png",
  "/icon-96.png",
  "/icon-128.png",
  "/icon-144.png",
  "/icon-192.png",
  "/icon-512.png",
  "/maskable-icon-192.png",
  "/maskable-icon-512.png",
  "/apple-touch-icon.png",
  "/brand/app-icon.png",
];

function isCacheableStaticRequest(request) {
  if (request.method !== "GET") return false;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/brand/")) return true;

  return PRECACHE_URLS.includes(url.pathname);
}

async function trimNextStaticEntries(cache) {
  const requests = await cache.keys();
  const nextStaticRequests = requests.filter((request) =>
    new URL(request.url).pathname.startsWith("/_next/static/"),
  );
  const excess = nextStaticRequests.length - MAX_NEXT_STATIC_ENTRIES;
  if (excess <= 0) return;

  await Promise.all(
    nextStaticRequests.slice(0, excess).map((request) => cache.delete(request)),
  );
}

async function rememberStaticResponse(request, response) {
  const cache = await caches.open(STATIC_CACHE);
  await cache.put(request, response);
  if (new URL(request.url).pathname.startsWith("/_next/static/")) {
    await trimNextStaticEntries(cache);
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return { response: cachedResponse, cacheWrite: Promise.resolve() };
  }

  const networkResponse = await fetch(request);
  let cacheWrite = Promise.resolve();
  if (networkResponse.ok && networkResponse.type !== "opaque") {
    cacheWrite = rememberStaticResponse(
      request,
      networkResponse.clone(),
    ).catch(() => undefined);
  }

  return { response: networkResponse, cacheWrite };
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith(CACHE_PREFIX) &&
                cacheName !== STATIC_CACHE,
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (!isCacheableStaticRequest(event.request)) return;
  const result = cacheFirst(event.request);
  event.respondWith(result.then(({ response }) => response));
  event.waitUntil(result.then(({ cacheWrite }) => cacheWrite));
});
