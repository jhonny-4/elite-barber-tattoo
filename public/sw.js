/* Service worker: never cache API responses or queue writes. */
const CACHE = "elite-premium-presentation-v11";
const OFFLINE = "/offline.html";
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll([
          OFFLINE,
          "/pwa/icons/elite-192.png",
          "/pwa/icons/elite-512.png",
        ]),
      ),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("elite-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  )
    return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE)));
    return;
  }
  if (url.pathname === OFFLINE || url.pathname.startsWith("/pwa/icons/"))
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request)),
    );
});
/* Avisos push del equipo (panel cerrado). Solo se abren rutas internas. */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const url =
    typeof data.url === "string" && /^\/(?!\/)/.test(data.url)
      ? data.url
      : "/administracion";
  event.waitUntil(
    self.registration.showNotification(
      typeof data.title === "string" ? data.title : "Novedad en Elite",
      {
        body: typeof data.body === "string" ? data.body : "",
        icon: "/pwa/icons/elite-192.png",
        badge: "/pwa/icons/elite-192.png",
        vibrate: [200, 100, 200],
        tag: `elite-${Date.now()}`,
        data: { url },
      },
    ),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    event.notification.data?.url || "/administracion",
    self.location.origin,
  ).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        const open = list.find((c) => c.url.startsWith(self.location.origin));
        if (!open) return self.clients.openWindow(target);
        // navigate() solo funciona en pestañas controladas; si falla, se abre una nueva.
        return open
          .focus()
          .then(() => open.navigate(target))
          .catch(() => self.clients.openWindow(target));
      }),
  );
});
