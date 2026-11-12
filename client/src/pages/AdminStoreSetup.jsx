import { useEffect, useState } from "react";
import { ArrowRight, ImagePlus, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../utils/api";

const inputClass = "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-primary";

const AdminStoreSetup = () => {
  const [segments, setSegments] = useState([]);
  const [segmentsError, setSegmentsError] = useState("");
  const [form, setForm] = useState({
    storeName: "",
    businessSegmentId: "",
    storePhone: "",
    storeEmail: "",
    storeAddress: "",
    city: "",
    deliveryPincode: "",
    deliveryFee: "49",
    freeDeliveryAbove: "999",
    tagline: "",
    storeDescription: "",
    theme: "teal",
  });
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    fetch(apiUrl("/api/business-segments"))
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load business types.");
        return result.data;
      })
      .then((data) => {
        if (!active) return;
        setSegments(data);
        setForm((current) => ({ ...current, businessSegmentId: current.businessSegmentId || data[0]?.segmentId || "" }));
      })
      .catch((requestError) => { if (active) setSegmentsError(requestError.message); });
    return () => { active = false; };
  }, []);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const chooseLogo = (event) => {
    const file = event.target.files?.[0] || null;
    setLogo(file);
    setLogoPreview(file ? URL.createObjectURL(file) : "");
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, value));
    if (logo) payload.append("logo", logo);
    try {
      const response = await fetch(apiUrl("/api/auth/admin-store-setup"), {
        method: "POST",
        credentials: "include",
        body: payload,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save store details.");
      navigate("/admin/subscription-registration", { replace: true });
    } catch (requestError) {
      setError(requestError instanceof TypeError ? "Unable to reach the server. Please try again." : requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-primary"><Store className="h-5 w-5" /></span>
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Step 2 of 3</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Set up your store</h1></div>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-500">Add your business profile. Database credentials are securely managed by the platform and are not needed here.</p>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">Store name
              <input required minLength={2} maxLength={100} value={form.storeName} onChange={update("storeName")} className={inputClass} />
            </label>
            <label className="text-sm font-medium text-slate-700">Business type
              <select required disabled={!segments.length} value={form.businessSegmentId} onChange={update("businessSegmentId")} className={inputClass}>
                {segments.map((segment) => <option key={segment.id} value={segment.segmentId}>{segment.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Store phone
              <input required type="tel" minLength={5} maxLength={30} value={form.storePhone} onChange={update("storePhone")} className={inputClass} />
            </label>
            <label className="text-sm font-medium text-slate-700">Store email
              <input required type="email" maxLength={254} value={form.storeEmail} onChange={update("storeEmail")} className={inputClass} />
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">Store address
              <input required minLength={3} maxLength={200} value={form.storeAddress} onChange={update("storeAddress")} className={inputClass} />
            </label>
            <label className="text-sm font-medium text-slate-700">City
              <input required minLength={2} maxLength={80} value={form.city} onChange={update("city")} className={inputClass} />
            </label>
            <label className="text-sm font-medium text-slate-700">Delivery pincode
              <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={form.deliveryPincode} onChange={(event) => setForm((current) => ({ ...current, deliveryPincode: event.target.value.replace(/\D/g, "").slice(0, 6) }))} className={inputClass} />
            </label>
            <label className="text-sm font-medium text-slate-700">Delivery fee
              <input type="number" min="0" max="100000" step="0.01" value={form.deliveryFee} onChange={update("deliveryFee")} className={inputClass} />
            </label>
            <label className="text-sm font-medium text-slate-700">Free delivery above
              <input type="number" min="0" max="10000000" step="0.01" value={form.freeDeliveryAbove} onChange={update("freeDeliveryAbove")} className={inputClass} />
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">Tagline (optional)
              <input maxLength={160} value={form.tagline} onChange={update("tagline")} className={inputClass} />
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">Store description (optional)
              <textarea maxLength={500} rows={3} value={form.storeDescription} onChange={update("storeDescription")} className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-primary" />
            </label>
            <label className="text-sm font-medium text-slate-700">Theme
              <select value={form.theme} onChange={update("theme")} className={inputClass}>
                <option value="teal">Teal</option><option value="blue">Blue</option><option value="emerald">Emerald</option><option value="amber">Amber</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Store logo (optional, max 2 MB)
              <span className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-normal text-slate-600"><ImagePlus className="h-4 w-4" /><input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={chooseLogo} className="min-w-0 flex-1 text-xs" /></span>
            </label>
          </div>
          {logoPreview && <img src={logoPreview} alt="Store logo preview" className="h-20 w-20 rounded-lg border border-slate-200 object-contain p-2" />}
          {segmentsError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{segmentsError}</p>}
          {!segmentsError && segments.length === 0 && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">No business types are currently available.</p>}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end border-t border-slate-100 pt-5">
            <button type="submit" disabled={busy || !segments.length} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving..." : "Continue to subscription"}<ArrowRight className="h-4 w-4" /></button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminStoreSetup;
