// 训练规则每次联网读取，避免离线缓存旧版本后继续判分。
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline | WoW Forever Rotation</title><main><h1>You are offline</h1><p>Reconnect to load the current guide and practice rules.</p><a href="/">Try again</a></main></html>',
    {status:503,headers:{'Content-Type':'text/html;charset=utf-8'}}
  )));
});
