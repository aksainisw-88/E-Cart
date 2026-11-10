import { useState } from "react";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../context/storeContext";

const API_URL = import.meta.env.VITE_API_URL || "";

const AdminRegister = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", otp: "" });
  const [otpSent, setOtpSent] = useState(false);
  const [developmentOtp, setDevelopmentOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const store = useStore();

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
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
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          otp: form.otp,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to create the admin account.");
      navigate("/admin", { replace: true });
    } catch (requestError) {
      setError(requestError instanceof TypeError ? "Unable to reach the server. Please try again." : requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />

      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl shadow-black/30 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 p-10 text-white lg:flex">
          <div className="absolute -right-20 top-24 h-64 w-64 rounded-full border border-white/10" />
          <div className="absolute -right-10 top-[8.5rem] h-44 w-44 rounded-full border border-white/10" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white/10 text-xl font-bold ring-1 ring-white/20">
              {store.logoUrl ? <img src={store.logoUrl} alt="" className="h-full w-full object-contain" /> : "+"}
            </span>
            <span><strong className="block text-base">{store.name}</strong><small className="text-xs text-white/60">Admin console</small></span>
          </div>
          <div className="relative max-w-md py-12">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-200/20"><ShieldCheck className="h-6 w-6" /></span>
            <h1 className="mt-6 text-3xl font-semibold leading-tight">Set up your store admin account.</h1>
            <p className="mt-3 text-sm leading-6 text-white/65">Verify your email to manage your store workspace and request a subscription license.</p>
          </div>
          <p className="relative text-xs text-white/45">Email verification required</p>
        </div>

        <div className="px-6 py-8 sm:px-10 sm:py-12 lg:px-12 lg:py-14">
          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-slate-700 lg:hidden">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-primary text-lg font-bold text-white">{store.logoUrl ? <img src={store.logoUrl} alt="" className="h-full w-full object-contain" /> : "+"}</span>
              <span className="max-w-40 truncate">{store.name}</span>
            </Link>
            <Link to="/" className="text-xs font-semibold text-slate-400 transition hover:text-primary">Back to store</Link>
          </div>

          <div className="mx-auto mt-8 max-w-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-primary"><KeyRound className="h-5 w-5" /></span>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-primary">Store admin access</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Create admin account</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Use an email you can verify. You can request a license after signing up.</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">Full name
                <input required minLength={2} maxLength={80} autoComplete="name" value={form.name} onChange={updateField("name")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-primary" placeholder="Your name" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Work email
                <input required type="email" autoComplete="email" value={form.email} onChange={updateField("email")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-primary" placeholder="name@store.com" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Password
                <input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={form.password} onChange={updateField("password")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-primary" placeholder="At least 8 characters" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Confirm password
                <input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={form.confirmPassword} onChange={updateField("confirmPassword")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-primary" placeholder="Re-enter your password" />
              </label>
              {otpSent && <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <label htmlFor="admin-signup-otp" className="block text-sm font-semibold text-slate-800">Email verification code</label>
                <p className="mt-1 text-xs text-slate-600">Enter the six-digit code sent to {form.email}. It expires in 10 minutes.</p>
                <input id="admin-signup-otp" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={form.otp} onChange={(event) => setForm((current) => ({ ...current, otp: event.target.value.replace(/\D/g, "").slice(0, 6) }))} className="mt-3 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-center text-xl font-bold tracking-[0.4em] outline-none focus:border-primary" placeholder="000000" />
                {developmentOtp && <p className="mt-2 text-xs font-medium text-amber-800">Development code: {developmentOtp}</p>}
                <div className="mt-3 flex justify-end"><button type="button" disabled={loading} onClick={requestCode} className="text-xs font-semibold text-primary hover:underline disabled:opacity-50">Resend code</button></div>
              </div>}
              {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
              <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60">
                {loading ? "Please wait..." : otpSent ? "Verify and create account" : "Send verification code"}<ArrowRight className="h-4 w-4" />
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
