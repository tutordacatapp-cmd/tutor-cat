// Service worker: permite instalar o app e mostra os lembretes de estudo. Sempre busca a versão mais nova na rede.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { corpo: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Tutor da Cat', {
    body: d.corpo || 'Que tal 10 minutinhos de estudo hoje?',
    icon: './icone-192.png', badge: './icone-192.png', tag: 'lembrete-estudo', renotify: true,
    data: { url: './' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of abertas) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  })());
});
