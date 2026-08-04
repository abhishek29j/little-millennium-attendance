import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { toast } from "sonner";

import { registerServiceWorker, isStandalone } from "@/lib/pwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Handles the whole PWA client experience:
 *  - registers the service worker (guarded, production only)
 *  - shows a toast when a new version is available ("Refresh to update")
 *  - shows a custom "Install App" button when the browser offers installation
 */
export function PwaManager() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    void registerServiceWorker((applyUpdate) => {
      toast("A new version is available", {
        duration: Infinity,
        action: { label: "Refresh to update", onClick: applyUpdate },
      });
    });
  }, []);

  useEffect(() => {
    if (isStandalone()) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null); // hide button after installation

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!installEvent || dismissed) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-lg [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Install Attendance</p>
        <p className="truncate text-xs text-muted-foreground">Works offline, opens like an app.</p>
      </div>
      <button
        onClick={async () => {
          await installEvent.prompt();
          const { outcome } = await installEvent.userChoice;
          if (outcome === "accepted") setInstallEvent(null);
          else setDismissed(true);
        }}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-105"
      >
        <Download className="h-4 w-4" />
        Install
      </button>
      <button
        aria-label="Dismiss install prompt"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-full p-1 text-muted-foreground transition hover:bg-accent"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
