/**
 * Guarded service-worker registration.
 *
 * The service worker must NEVER register in dev, inside an iframe, or in any
 * Lovable preview host — a stale cached shell there would break the editor
 * preview. In those contexts we actively unregister any existing /sw.js.
 */

const SW_URL = "/sw.js";

function isPreviewHost(hostname: string) {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

function shouldRegister() {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!import.meta.env.PROD) return false;
  if (window.self !== window.top) return false; // iframe (preview)
  if (isPreviewHost(window.location.hostname)) return false;
  if (new URL(window.location.href).searchParams.has("sw")) {
    // ?sw=off kill switch
    if (new URL(window.location.href).searchParams.get("sw") === "off") return false;
  }
  return true;
}

async function unregisterAppSW() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    regs
      .filter((r) => (r.active?.scriptURL ?? r.waiting?.scriptURL ?? "").endsWith(SW_URL))
      .map((r) => r.unregister()),
  );
}

/** Registers the SW and calls `onUpdate` when a new version is waiting. */
export async function registerServiceWorker(onUpdate: (applyUpdate: () => void) => void) {
  if (!shouldRegister()) {
    await unregisterAppSW();
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_URL, { scope: "/" });

    const notify = (worker: ServiceWorker) =>
      onUpdate(() => {
        worker.postMessage({ type: "SKIP_WAITING" });
      });

    if (registration.waiting && navigator.serviceWorker.controller) notify(registration.waiting);

    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          notify(installing);
        }
      });
    });

    // Reload once the new SW takes control (one-click "Refresh to update").
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });

    // Check for updates periodically and whenever the tab regains focus.
    setInterval(() => void registration.update(), 60 * 60 * 1000);
    window.addEventListener("focus", () => void registration.update());
  } catch (error) {
    console.error("Service worker registration failed", error);
  }
}

/** True when the app is launched from the home screen / installed app icon. */
export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Web Push readiness: asks for notification permission on demand. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}
