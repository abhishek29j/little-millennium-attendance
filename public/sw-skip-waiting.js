// Allows the app to activate a waiting service worker on user request
// ("Refresh to update"). Imported by the generated Workbox service worker.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
