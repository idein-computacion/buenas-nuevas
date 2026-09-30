// Service worker placeholder to prevent 404 compilation delays
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
