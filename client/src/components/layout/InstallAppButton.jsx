import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";

const isAppInstalled = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

const InstallAppButton = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(isAppInstalled);
  const [helpOpen, setHelpOpen] = useState(false);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const rememberPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const markInstalled = () => {
      setInstalled(true);
      setHelpOpen(false);
    };
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const updateDisplayMode = () => setInstalled(isAppInstalled());

    window.addEventListener("beforeinstallprompt", rememberPrompt);
    window.addEventListener("appinstalled", markInstalled);
    displayMode.addEventListener?.("change", updateDisplayMode);

    return () => {
      window.removeEventListener("beforeinstallprompt", rememberPrompt);
      window.removeEventListener("appinstalled", markInstalled);
      displayMode.removeEventListener?.("change", updateDisplayMode);
    };
  }, []);

  useEffect(() => {
    if (helpOpen) closeButtonRef.current?.focus();
  }, [helpOpen]);

  const installApp = async () => {
    if (!installPrompt) {
      setHelpOpen(true);
      return;
    }

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
    } catch {
      setHelpOpen(true);
    } finally {
      setInstallPrompt(null);
    }
  };

  if (installed) return null;

  return (
    <>
      <button
        type="button"
        onClick={installApp}
        aria-haspopup="dialog"
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-100 px-2.5 py-2 text-primary transition hover:bg-emerald-50 sm:px-3"
        aria-label="Install E-Cart app on this device"
      >
        <Download aria-hidden="true" size={19} />
        <span className="hidden text-xs font-semibold lg:inline">Install app</span>
      </button>

      {helpOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 p-3 sm:items-center sm:p-6"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setHelpOpen(false); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="install-app-title" onKeyDown={(event) => { if (event.key === "Escape") setHelpOpen(false); }} className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">E-Cart app</p>
                <h2 id="install-app-title" className="mt-2 text-xl font-bold text-slate-900">Add E-Cart to this device</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Install the store as an app for quick access from your home screen or desktop.</p>
              </div>
              <button ref={closeButtonRef} type="button" onClick={() => setHelpOpen(false)} aria-label="Close install instructions" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                <X aria-hidden="true" size={19} />
              </button>
            </div>

            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <p><strong className="text-slate-800">Android:</strong> In Chrome, open the menu (⋮) and choose <strong className="text-slate-800">Install app</strong> or <strong className="text-slate-800">Add to Home screen</strong>.</p>
              <p><strong className="text-slate-800">iPhone or iPad:</strong> In Safari, tap <strong className="text-slate-800">Share</strong>, then <strong className="text-slate-800">Add to Home Screen</strong>.</p>
              <p><strong className="text-slate-800">Windows or Mac:</strong> Use your browser menu or the install icon in the address bar and choose <strong className="text-slate-800">Install E-Cart</strong> or <strong className="text-slate-800">Add to Dock</strong>.</p>
            </div>

            <button type="button" onClick={() => setHelpOpen(false)} className="mt-6 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark">Got it</button>
          </section>
        </div>
      )}
    </>
  );
};

export default InstallAppButton;
