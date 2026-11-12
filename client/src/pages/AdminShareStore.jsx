import { useEffect, useState } from "react";
import { Check, Copy, Download, ExternalLink, Mail, MessageCircle, QrCode, Share2, Store } from "lucide-react";
import QRCode from "qrcode";

const API_URL = import.meta.env.VITE_API_URL || "";

const AdminShareStore = () => {
  const [store, setStore] = useState(null);
  const [qrCode, setQrCode] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const storeUrl = store?.active
    ? `${window.location.origin}/customer/${encodeURIComponent(store.slug)}`
    : "";
  const invitation = storeUrl ? `Shop ${store.storeName} online: ${storeUrl}` : "";

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/store/share-link`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load your store sharing status.");
        return result.data;
      })
      .then((data) => { if (active) setStore(data); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!storeUrl) return undefined;
    QRCode.toDataURL(storeUrl, { width: 320, margin: 2, errorCorrectionLevel: "M" })
      .then((dataUrl) => {
        if (!active) return;
        setQrCodeUrl(storeUrl);
        setQrCode(dataUrl);
      })
      .catch((qrError) => { if (active) setError(`Unable to generate your store QR code: ${qrError.message}`); });
    return () => { active = false; };
  }, [storeUrl]);

  const copyLink = async () => {
    setError("");
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (copyError) {
      setError(`Unable to copy the link. Copy it directly from the link field. ${copyError.message}`);
    }
  };

  const downloadQr = () => {
    const link = document.createElement("a");
    link.href = qrCode;
    link.download = `${store.slug}-store-qr.png`;
    link.click();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Store growth</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Share your store</h1>
        <p className="mt-2 text-sm text-slate-500">Share a direct link or QR code so customers land in your store.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-primary"><Share2 className="h-5 w-5" /></span>
          <div><h2 className="font-semibold text-slate-900">Your customer store link</h2><p className="mt-1 text-xs text-slate-500">The link resolves to your registered tenant store.</p></div>
        </div>

        {loading && <p className="mt-5 text-sm text-slate-500">Checking store status...</p>}
        {!loading && error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {!loading && !error && store && (
          store.active ? (
            <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_220px]">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Store active</p>
                <p className="mt-2 text-sm text-slate-600">{store.storeName}</p>
                <label htmlFor="customer-store-link" className="mt-5 block text-sm font-medium text-slate-700">Customer store URL</label>
                <div className="mt-2 flex gap-2">
                  <input id="customer-store-link" readOnly value={storeUrl} className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700" />
                  <button type="button" onClick={copyLink} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied" : "Copy link"}</button>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a href={`https://wa.me/?text=${encodeURIComponent(invitation)}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><MessageCircle className="h-4 w-4 text-emerald-600" />WhatsApp</a>
                  <a href={`mailto:?subject=${encodeURIComponent(`Shop ${store.storeName}`)}&body=${encodeURIComponent(invitation)}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Mail className="h-4 w-4 text-primary" />Email</a>
                  <a href={storeUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ExternalLink className="h-4 w-4" />Open store</a>
                </div>
                {store.validTill && <p className="mt-5 text-xs text-slate-500">Subscription valid until {store.validTill}.</p>}
              </div>
              <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-800"><QrCode className="h-4 w-4 text-primary" />Store QR code</p>
                {qrCode && qrCodeUrl === storeUrl ? <img src={qrCode} alt={`QR code for ${store.storeName}`} className="mt-3 h-40 w-40 bg-white p-2" /> : <div className="mt-3 flex h-40 w-40 items-center justify-center rounded-lg bg-white text-xs text-slate-400">Generating QR code...</div>}
                <button type="button" onClick={downloadQr} disabled={!qrCode || qrCodeUrl !== storeUrl} className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-50"><Download className="h-4 w-4" />Download PNG</button>
              </div>
            </div>
          ) : (
            <div role="status" className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-900"><Store className="h-4 w-4" />Store sharing is unavailable</p>
              <p className="mt-1 text-sm text-amber-800">Your store must have an active subscription and be approved before its link can be shared. Current status: {store.status || "Inactive"}.</p>
            </div>
          )
        )}
      </section>
    </div>
  );
};

export default AdminShareStore;
