// Service worker minimal untuk syarat installability (PWA).
// Tidak meng-cache apa pun; semua request lewat jaringan seperti biasa.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // passthrough (biarkan browser menangani)
});
