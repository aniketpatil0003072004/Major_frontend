// service-worker.js - Enhanced version
const CACHE_NAME = "ai-proctor-v1";
const RUNTIME_CACHE = "ai-proctor-runtime-v1";

// Files to cache immediately on install
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/android-chrome-192x192.png",
  "/icons/android-chrome-512x512.png",
  "/desktop-1.png",
  "/mobile-1.png",
];

// Install event - cache essential files
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching app shell");
        return cache.addAll(urlsToCache).catch((err) => {
          console.error("[SW] Cache addAll failed:", err);
          // Continue even if some resources fail
          return Promise.all(
            urlsToCache.map((url) =>
              cache.add(url).catch((e) => {
                console.warn(`[SW] Failed to cache ${url}:`, e);
              })
            )
          );
        });
      })
      .then(() => {
        console.log("[SW] Installation complete");
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  const cacheWhitelist = [CACHE_NAME, RUNTIME_CACHE];

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheWhitelist.includes(cacheName)) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("[SW] Activation complete, claiming clients");
        return self.clients.claim();
      })
  );
});

// Fetch event - Network First for HTML, Cache First for assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Strategy: Cache First for static assets
  if (
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "style" ||
    request.destination === "script"
  ) {
    event.respondWith(cacheFirst(request));
  }
  // Strategy: Network First for HTML/documents
  else if (
    request.destination === "document" ||
    request.headers.get("accept").includes("text/html")
  ) {
    event.respondWith(networkFirst(request));
  }
  // Default: Network First with cache fallback
  else {
    event.respondWith(networkFirst(request));
  }
});

// Cache First Strategy - for static assets
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log("[SW] Cache hit:", request.url);
      return cachedResponse;
    }

    console.log("[SW] Fetching and caching:", request.url);
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error("[SW] Cache first failed:", error);
    // Return a fallback if available
    return caches.match("/offline.html") || new Response("Offline");
  }
}

// Network First Strategy - for dynamic content
async function networkFirst(request) {
  try {
    console.log("[SW] Network first:", request.url);
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log("[SW] Network failed, trying cache:", request.url);
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Last resort fallback
    if (request.destination === "document") {
      return caches.match("/") || new Response("Offline");
    }

    return new Response("Network error", {
      status: 408,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

// Listen for messages from the client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("[SW] Received SKIP_WAITING message");
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CACHE_URLS") {
    console.log("[SW] Received cache request for URLs");
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

console.log("[SW] Service Worker loaded successfully");
