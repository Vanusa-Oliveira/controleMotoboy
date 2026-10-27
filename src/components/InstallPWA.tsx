import { useEffect, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "rotapro:pwa-install-dismissed";

function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iPadOS = navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(ua) || iPadOS;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function InstallPWA() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") {
      setDismissed(true);
      return;
    }

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    const onInstalled = () => {
      setDeferred(null);
      setShowIOS(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    // iOS auto-open once after short delay
    if (isIOS()) {
      const t = setTimeout(() => setShowIOS(true), 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBIP);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
    setDeferred(null);
    setShowIOS(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  if (dismissed || isStandalone()) return null;

  if (showIOS) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 safe-bottom sm:inset-x-auto sm:right-4 sm:max-w-sm">
        <div className="relative rounded-2xl border border-border bg-card p-4 shadow-2xl">
          <button
            onClick={dismiss}
            className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-accent"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Download className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold">Instale o RotaPro</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Para instalar no iPhone, toque em{" "}
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Share className="h-3.5 w-3.5" /> Compartilhar
                </span>{" "}
                e depois em{" "}
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Plus className="h-3.5 w-3.5" /> Adicionar à Tela de Início
                </span>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (deferred) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 safe-bottom sm:inset-x-auto sm:right-4 sm:max-w-sm">
        <div className="relative flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-2xl">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Download className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight">Instalar RotaPro</p>
            <p className="text-xs text-muted-foreground">Acesse rápido pela tela inicial.</p>
          </div>
          <button
            onClick={install}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
          >
            Instalar
          </button>
          <button
            onClick={dismiss}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
