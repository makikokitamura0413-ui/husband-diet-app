/*
 * カロリー記録の Service Worker
 *
 * 役割：アプリ本体のファイル（HTML / JS / CSS / アイコン）をキャッシュして、
 *       電波が弱いときやオフラインでも起動できるようにするだけ。
 *
 * 重要：記録データ（ブラウザの保存領域にある体重・食事・運動・設定）には一切アクセスしない。
 *       削除するのは、このファイルが作った古いキャッシュ（hda-app-shell-*）だけ。
 *
 * BUILD_ID と PRECACHE の値はビルド時に埋め込む（vite.config.ts）。
 */
const BUILD_ID = '__BUILD_ID__';
const PRECACHE = __PRECACHE__;
const CACHE_PREFIX = 'hda-app-shell-';
const CACHE = CACHE_PREFIX + BUILD_ID;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 画面（HTML）は最新を優先し、オフラインのときだけキャッシュを使う
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html').then((hit) => hit || caches.match('./'))),
    );
    return;
  }

  // JS / CSS / アイコンはファイル名にハッシュが付くので、キャッシュ優先
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
