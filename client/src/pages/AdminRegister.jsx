import { useEffect, useState } from "react";
import { ArrowRight, KeyRound, ShieldCheck, Store } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getTenantId, tenantHeaders } from "../utils/tenant";
import AdminAccountRegister from "./AdminAccountRegister";

const API_URL = import.meta.env.VITE_API_URL || "";
const inputClass = "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-primary";

const AdminRegister = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    otp: "",
    storeName: "",
    businessSegmentId: "",
    tagline: "",
    storeDescription: "",
    storePhone: "",
    storeEmail: "",
    storeAddress: "",
    city: "",
    deliveryPincode: "",
    deliveryFee: "49",
    freeDeliveryAbove: "999",
    theme: "teal",
    tenantId: getTenantId(),
    registrationNumber: "",
    licenseKey: "",
    customerDatabaseUri: "",
  });
  const [otpSent, setOtpSent] = useState(false);
  const [developmentOtp, setDevelopmentOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [businessSegments, setBusinessSegments] = useState([]);
  const [segmentsLoading, setSegmentsLoading] = useState(true);
  const [segmentsError, setSegmentsError] = useState("");
  const [onboardingMode, setOnboardingMode] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/auth/onboarding-config`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to check signup availability.");
        return result.sharedPlatform;
      })
      .then((sharedPlatform) => { if (active) setOnboardingMode(sharedPlatform && !getTenantId() ? "shared" : "legacy"); })
      .catch(() => { if (active) setOnboardingMode("unavailable"); });
    fetch(`${API_URL}/api/business-segments`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load business categories.");
        return result.data;
      })
      .then((segments) => {
        if (!active) return;
        setBusinessSegments(segments);
        setForm((current) => ({ ...current, businessSegmentId: current.businessSegmentId || segments[0]?.segmentId || "" }));
      })
      .catch((requestError) => {
        if (active) setSegmentsError(requestError instanceof TypeError ? "Unable to reach the server. Please try again." : requestError.message);
      })
      .finally(() => {
        if (active) setSegmentsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    if (field === "tenantId") {
      const tenantId = event.target.value.trim().toLowerCase();
      if (tenantId) window.localStorage.setItem("eCartTenantId", tenantId);
      else window.localStorage.removeItem("eCartTenantId");
    }
    if (field === "email") {
      setOtpSent(false);
      setDevelopmentOtp("");
      setMessage("");
    }
  };

  const requestCode = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/admin-signup-otp`, {
        method: "POST",
        headers: tenantHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ email: form.email.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to send a verification code.");
      setOtpSent(true);
      setDevelopmentOtp(result.developmentOtp || "");
      setMessage(result.message || "Verification code sent. Check your email.");
    } catch (requestError) {
      setError(requestError instanceof TypeError ? "Unable to reach the server. Please try again." : requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!otpSent) {
      await requestCode();
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register/admin`, {
        method: "POST",
        headers: tenantHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          otp: form.otp,
          storeName: form.storeName,
          businessSegmentId: form.businessSegmentId,
          tagline: form.tagline,
          storeDescription: form.storeDescription,
          storePhone: form.storePhone,
          storeEmail: form.storeEmail,
          storeAddress: form.storeAddress,
          city: form.city,
          deliveryPincode: form.deliveryPincode,
          deliveryFee: form.deliveryFee,
          freeDeliveryAbove: form.freeDeliveryAbove,
          theme: form.theme,
          registrationNumber: form.registrationNumber,
          licenseKey: form.licenseKey,
          ...(form.tenantId ? {} : { customerDatabaseUri: form.customerDatabaseUri }),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to create the admin account.");
      navigate("/admin/settings", { replace: true });
    } catch (requestError) {
      setError(requestError instanceof TypeError ? "Unable to reach the server. Please try again." : requestError.message);
    } finally {
      setLoading(false);
    }
  };

  if (onboardingMode === "shared") return <AdminAccountRegister />;
  if (onboardingMode === null) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-white">Loading signup options...</div>;
  if (onboardingMode === "unavailable") return <div role="alert" className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-sm text-white">Unable to load signup options. Check the server connection and refresh this page.</div>;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />

      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl shadow-black/30 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 p-10 text-white lg:flex">
          <div className="absolute -right-20 top-24 h-64 w-64 rounded-full border border-white/10" />
          <div className="absolute -right-10 top-[8.5rem] h-44 w-44 rounded-full border border-white/10" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-xl font-bold ring-1 ring-white/20"><Store className="h-6 w-6" /></span>
            <span><strong className="block text-base">E-Cart</strong><small className="text-xs text-white/60">Store setup</small></span>
          </div>
          <div className="relative max-w-md py-12">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-200/20"><ShieldCheck className="h-6 w-6" /></span>
            <h1 className="mt-6 text-3xl font-semibold leading-tight">Create your store and admin account.</h1>
            <p className="mt-3 text-sm leading-6 text-white/65">Add your business details, verify your email, then enter your pre-issued license and private customer database connection.</p>
          </div>
          <p className="relative text-xs text-white/45">Store details are saved to this customer API's database.</p>
        </div>

        <div className="px-6 py-8 sm:px-10 sm:py-12 lg:px-12 lg:py-14">
          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-slate-700 lg:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white"><Store className="h-5 w-5" /></span>
              <span className="max-w-40 truncate">E-Cart</span>
            </Link>
            <Link to="/" className="text-xs font-semibold text-slate-400 transition hover:text-primary">Back to store</Link>
          </div>

          <div className="mx-auto mt-8 max-w-xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-primary"><KeyRound className="h-5 w-5" /></span>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-primary">Store onboarding</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Create your store</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Enter your business and owner details. After email verification, provide the subscription issued for this admin email and a new customer database.</p>

            <form onSubmit={submit} className="mt-6 space-y-6">
              <section className="space-y-4 rounded-2xl border border-slate-200 p-4 sm:p-5">
                <div><h3 className="font-semibold text-slate-900">Business details</h3><p className="mt-1 text-xs text-slate-500">These details will be used for your storefront.</p></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700 sm:col-span-2">Store name
                    <input required minLength={2} maxLength={100} autoComplete="organization" value={form.storeName} onChange={updateField("storeName")} className={inputClass} placeholder="Your store name" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700 sm:col-span-2">Business type
                    <select required disabled={segmentsLoading || !businessSegments.length} value={form.businessSegmentId} onChange={updateField("businessSegmentId")} className={inputClass}>
                      {segmentsLoading && <option value="">Loading business categories...</option>}
                      {businessSegments.map((segment) => <option key={segment.id} value={segment.segmentId}>{segment.name}</option>)}
                    </select>
                  </label>
                  {segmentsError && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{segmentsError}</p>}
                  {!segmentsLoading && !segmentsError && businessSegments.length === 0 && <p role="alert" className="text-sm text-red-700 sm:col-span-2">No business categories are currently available. Contact the platform administrator.</p>}
                  <label className="block text-sm font-medium text-slate-700">Store phone
                    <input required type="tel" maxLength={30} autoComplete="tel" value={form.storePhone} onChange={updateField("storePhone")} className={inputClass} placeholder="Business phone" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">Store email
                    <input required type="email" maxLength={254} autoComplete="organization" value={form.storeEmail} onChange={updateField("storeEmail")} className={inputClass} placeholder="contact@yourstore.com" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700 sm:col-span-2">Store address
                    <input required minLength={3} maxLength={200} autoComplete="street-address" value={form.storeAddress} onChange={updateField("storeAddress")} className={inputClass} placeholder="Street address" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">City
                    <input required minLength={2} maxLength={80} autoComplete="address-level2" value={form.city} onChange={updateField("city")} className={inputClass} placeholder="City" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">Delivery pincode
                    <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="postal-code" value={form.deliveryPincode} onChange={(event) => setForm((current) => ({ ...current, deliveryPincode: event.target.value.replace(/\D/g, "").slice(0, 6) }))} className={inputClass} placeholder="Optional" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">Delivery fee
                    <input type="number" min="0" max="100000" step="0.01" value={form.deliveryFee} onChange={updateField("deliveryFee")} className={inputClass} />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">Free delivery above
                    <input type="number" min="0" max="10000000" step="0.01" value={form.freeDeliveryAbove} onChange={updateField("freeDeliveryAbove")} className={inputClass} />
                  </label>
                  <label className="block text-sm font-medium text-slate-700 sm:col-span-2">Tagline (optional)
                    <input maxLength={160} value={form.tagline} onChange={updateField("tagline")} className={inputClass} placeholder="A short message about your store" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700 sm:col-span-2">Store description (optional)
                    <textarea maxLength={500} rows={3} value={form.storeDescription} onChange={updateField("storeDescription")} className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-primary" placeholder="Tell customers what your store offers" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700 sm:col-span-2">Store theme
                    <select value={form.theme} onChange={updateField("theme")} className={inputClass}>
                      <option value="teal">Teal</option><option value="blue">Blue</option><option value="emerald">Emerald</option><option value="amber">Amber</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-slate-200 p-4 sm:p-5">
                <div><h3 className="font-semibold text-slate-900">Admin account</h3><p className="mt-1 text-xs text-slate-500">Verify this email to secure your owner account.</p></div>
                <label className="block text-sm font-medium text-slate-700">Owner full name
                  <input required minLength={2} maxLength={80} autoComplete="name" value={form.name} onChange={updateField("name")} className={inputClass} placeholder="Your name" />
                </label>
                <label className="block text-sm font-medium text-slate-700">Admin email
                  <input required type="email" autoComplete="email" value={form.email} onChange={updateField("email")} className={inputClass} placeholder="name@store.com" />
                </label>
                <label className="block text-sm font-medium text-slate-700">Tenant ID (shared platform)
                  <input value={form.tenantId} onChange={updateField("tenantId")} autoComplete="off" className={inputClass} placeholder="Provided by Super Admin" />
                </label>
                <label className="block text-sm font-medium text-slate-700">Password
                  <input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={form.password} onChange={updateField("password")} className={inputClass} placeholder="At least 8 characters" />
                </label>
                <label className="block text-sm font-medium text-slate-700">Confirm password
                  <input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={form.confirmPassword} onChange={updateField("confirmPassword")} className={inputClass} placeholder="Re-enter your password" />
                </label>
              </section>
              {otpSent && <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <label htmlFor="admin-signup-otp" className="block text-sm font-semibold text-slate-800">Email verification code</label>
                <p className="mt-1 text-xs text-slate-600">Enter the six-digit code sent to {form.email}. It expires in 10 minutes.</p>
                <input id="admin-signup-otp" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={form.otp} onChange={(event) => setForm((current) => ({ ...current, otp: event.target.value.replace(/\D/g, "").slice(0, 6) }))} className="mt-3 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-center text-xl font-bold tracking-[0.4em] outline-none focus:border-primary" placeholder="000000" />
                {developmentOtp && <p className="mt-2 text-xs font-medium text-amber-800">Development code: {developmentOtp}</p>}
                <div className="mt-3 flex justify-end"><button type="button" disabled={loading} onClick={requestCode} className="text-xs font-semibold text-primary hover:underline disabled:opacity-50">Resend code</button></div>
              </div>}
              {otpSent && <section className="space-y-4 rounded-2xl border border-slate-200 p-4 sm:p-5">
                <div><h3 className="font-semibold text-slate-900">Subscription and database setup</h3><p className="mt-1 text-xs leading-5 text-slate-500">Enter the license issued for this admin email. For the shared platform, use the tenant ID from Super Admin; database credentials are managed by the platform.</p></div>
                <label className="block text-sm font-medium text-slate-700">Registration number
                  <input required minLength={5} maxLength={40} autoComplete="off" value={form.registrationNumber} onChange={updateField("registrationNumber")} className={inputClass} placeholder="Enter your registration number" />
                </label>
                <label className="block text-sm font-medium text-slate-700">License key
                  <input required type="password" minLength={8} maxLength={80} autoComplete="new-password" value={form.licenseKey} onChange={updateField("licenseKey")} className={inputClass} placeholder="Enter your license key" />
                </label>
                {!form.tenantId && <>
                  <label className="block text-sm font-medium text-slate-700">MongoDB Atlas connection URI (legacy deployments)
                    <input required type="password" minLength={20} maxLength={2048} autoComplete="new-password" spellCheck="false" value={form.customerDatabaseUri} onChange={updateField("customerDatabaseUri")} className={inputClass} placeholder="mongodb+srv://..." />
                  </label>
                  <p className="text-xs leading-5 text-amber-800">Only use this for a legacy single-store API. New shared-platform accounts must use a tenant ID instead.</p>
                </>}
              </section>}
              {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
              <button type="submit" disabled={loading || segmentsLoading || !businessSegments.length} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60">
                {loading ? "Please wait..." : otpSent ? "Verify and create store" : "Send verification code"}<ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">Already have an admin account? <Link to="/admin/login" className="font-semibold text-primary hover:text-primary-dark">Sign in</Link></p>
            <p className="mt-3 text-center text-sm text-slate-500">Shopping with us? <Link to="/customer/login" className="font-semibold text-primary hover:text-primary-dark">Customer sign in</Link></p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AdminRegister;
