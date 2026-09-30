// Diffusion hors connexion : chaque fichier est pris sur le reseau quand
// il repond (tu vois toujours la derniere version), sinon dans le cache.
// Les images des apps, elles, ne changent pas : cache d'abord.

const CACHE = 'diffusion-v1';
const COQUILLE = [
  './',
  'index.html',
  'css/app.css',
  'js/app.js',
  'js/canaux.js',
  'js/textes.js',
  'js/visuels.js',
  'js/stockage.js',
  'js/zip.js',
  'vendor/qrcode.js',
  'manifest.webmanifest',
  'icones/icone-192.png',
  'icones/icone-512.png',
  'icones/apple-touch-icon.png',
  'data/apps.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(COQUILLE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/api/')) return;

  const image = /\/data\/apps\/.+\.(png|jpe?g)$/.test(url.pathname);
  e.respondWith(image ? cacheDAbord(e.request) : reseauDAbord(e.request));
});

async function reseauDAbord(requete) {
  const cache = await caches.open(CACHE);
  try {
    const reponse = await fetch(requete);
    if (reponse.ok) cache.put(requete, reponse.clone());
    return reponse;
  } catch {
    return (await cache.match(requete, { ignoreSearch: true })) ?? Response.error();
  }
}

async function cacheDAbord(requete) {
  const cache = await caches.open(CACHE);
  const garde = await cache.match(requete);
  if (garde) return garde;
  const reponse = await fetch(requete);
  if (reponse.ok) cache.put(requete, reponse.clone());
  return reponse;
}
