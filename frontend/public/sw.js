// Service Worker for Security Headers
// Addresses OWASP ZAP findings for frontend security headers

self.addEventListener('fetch', function(event) {
  // Only handle same-origin requests
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch(event.request).then(function(response) {
        // Clone the response so we can modify headers
        const newResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });

        // Add security headers to all responses
        newResponse.headers.set('Content-Security-Policy', 
          "default-src 'self'; " +
          "script-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; " +
          "style-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; " +
          "font-src 'self' https://cdnjs.cloudflare.com; " +
          "img-src 'self' data: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; " +
          "connect-src 'self' http://localhost:5001; " +
          "frame-ancestors 'none'"
        );
        
        newResponse.headers.set('X-Frame-Options', 'DENY');
        newResponse.headers.set('X-Content-Type-Options', 'nosniff');
        newResponse.headers.set('X-XSS-Protection', '1; mode=block');
        
        return newResponse;
      })
    );
  }
});

self.addEventListener('install', function(event) {
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  // Take control of all clients immediately
  event.waitUntil(self.clients.claim());
});