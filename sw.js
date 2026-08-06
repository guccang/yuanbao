"use strict";

const CACHE = "yuanbao-v1";
const PRECACHE = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/modules/math.js",
  "/modules/physics.js",
  "/modules/english.js",
  "/manifest.json"
];

// 安装时预缓存静态资源
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// 激活时清理旧缓存
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// 拦截请求：缓存优先，网络回退
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  // 只缓存同源 GET 请求
  if (event.request.method !== "GET" || url.origin !== location.origin) return;
  // API 请求不缓存
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetched = fetch(event.request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});