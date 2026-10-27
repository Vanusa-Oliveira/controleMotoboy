// Guarded PWA service-worker registration wrapper.
// Never registers in dev, iframe, Lovable preview, or when ?sw=off is present.

const APP_SW_PATH = "/sw.js";

function isPreviewOrDevHost(hostname: string): boolean {
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

async function unregisterAppSw() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs.map((r) => {
      const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
      if (url.endsWith(APP_SW_PATH)) return r.unregister();
      return Promise.resolve(false);
    }),
  );
}

export async function registerSW() {
  if (typeof window === "undefined") return;
  const inIframe = window.self !== window.top;
  const params = new URLSearchParams(window.location.search);
  const killSwitch = params.get("sw") === "off";
  const host = window.location.hostname;

  if (!import.meta.env.PROD || inIframe || killSwitch || isPreviewOrDevHost(host)) {
    await unregisterAppSw();
    return;
  }

  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register(APP_SW_PATH, { scope: "/" });
  } catch (err) {
    console.warn("[pwa] SW registration failed", err);
  }
}
