// 오프라인: 앱 파일을 저장해 두고, 새 판이 있으면 받아 둠
const CACHE = "ipteugi-v13";
const FILES = ["./", "index.html", "css/app.css", "js/app.js", "js/store.js", "js/srs.js", "js/grade.js", "js/speech.js", "js/listen.js", "js/mascot.js", "data/sentences.js", "data/keys.js", "data/tips.js", "data/listening.js", "data/listen-sounds.js", "data/audio.js", "data/dialogs.js", "assets/char/girl.webp", "assets/char/girl2.webp", "icon.svg", "icon-192.png", "icon-512.png", "manifest.webmanifest"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request, { cache: "no-store" }).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request))
  );
});
