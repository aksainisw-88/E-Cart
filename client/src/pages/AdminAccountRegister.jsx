import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck, Store } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";
const inputClass = "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-primary";

const AdminAccountRegister = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "", otp: "" });
  const [invitationToken] = useState(() => new URLSearchParams(window.location.search).get("invite") || "");
  const [invitationState, setInvitationState] = useState(invitationToken ? "checking" : "none");
  const [otpSent, setOtpSent] = useState(false);
  const [developmentOtp, setDevelopmentOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!invitationToken) return undefined;
    window.history.replaceState(window.history.state, "", window.location.pathname);
    let active = true;
    fetch(`${API_URL}/api/leads/invitations/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: invitationToken }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "This signup invitation is invalid or expired.");
        if (active) {
          setForm((current) => ({
            ...current,
            name: result.data.contactPerson || current.name,
            email: result.data.email || current.email,
            phone: result.data.mobile || current.phone,
          }));
          setInvitationState("valid");
        }
      })
      .catch((invitationError) => {
        if (active) {
          setInvitationState("invalid");
          setError(invitationError instanceof TypeError ? "Unable to verify the signup invitation. Please try again." : invitationError.message);
        }
      });
    return () => { active = false; };
  }, [invitationToken]);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value, ...(field === "email" ? { otp: "" } : {}) }));
    if (field === "email") {
      setOtpSent(false);
      setDevelopmentOtp("");
    }
  };

  const requestCode = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/api/auth/admin-signup-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim(), ...(invitationToken ? { invitationToken } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to send a verification code.");
      setOtpSent(true);
      setDevelopmentOtp(result.developmentOtp || "");
      setMessage(result.message || "Verification code sent. Check your email.");
    } catch (requestError) {
      setError(requestError instanceof TypeError ? "Unable to reach the server. Please try again." : requestError.message);
    } finally {
      setBusy(false);
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
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register/admin-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          otp: form.otp,
          ...(invitationToken ? { invitationToken } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to create the admin account.");
      window.localStorage.setItem("eCartTenantId", result.tenantId);
      navigate("/admin/store-setup", { replace: true });
    } catch (requestError) {
      setError(requestError instanceof TypeError ? "Unable to reach the server. Please try again." : requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />
      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl shadow-black/30 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 p-10 text-white lg:flex">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20"><Store className="h-6 w-6" /></span>
            <span><strong className="block text-base">E-Cart</strong><small className="text-xs text-white/60">Admin registration</small></span>
          </div>
          <div className="max-w-md py-12">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-200/20"><ShieldCheck className="h-6 w-6" /></span>
            <h1 className="mt-6 text-3xl font-semibold leading-tight">Start with your admin account.</h1>
            <p className="mt-3 text-sm leading-6 text-white/65">Your business workspace stays restricted until the store setup, subscription review, and license activation are complete.</p>
          </div>
          <p className="text-xs text-white/45">Each business is provisioned in its own database.</p>
        </div>
        <div className="px-6 py-8 sm:px-10 sm:py-12 lg:px-12 lg:py-14">
          <div className="flex justify-end"><Link to="/" className="text-xs font-semibold text-slate-400 transition hover:text-primary">Back to store</Link></div>
          <div className="mx-auto mt-8 max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Step 1 of 3</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Create your admin account</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{invitationToken ? "Complete the account and store setup for your E-Cart signup invitation." : "Verify your email, then continue to store setup."}</p>
            {invitationState === "checking" && <p className="mt-3 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">Verifying signup invitation...</p>}
            {invitationState === "valid" && <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Invitation verified. This signup will be linked to your inquiry.</p>}
            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">Full name
                <input required minLength={2} maxLength={80} autoComplete="name" value={form.name} onChange={update("name")} className={inputClass} />
              </label>
              <label className="block text-sm font-medium text-slate-700">Email address
                <input required type="email" autoComplete="email" readOnly={Boolean(invitationToken)} value={form.email} onChange={update("email")} className={`${inputClass} ${invitationToken ? "bg-slate-100 text-slate-500" : ""}`} />
              </label>
              <label className="block text-sm font-medium text-slate-700">Phone number
                <input required type="tel" minLength={5} maxLength={30} autoComplete="tel" value={form.phone} onChange={update("phone")} className={inputClass} />
              </label>
              <label className="block text-sm font-medium text-slate-700">Password
                <input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={form.password} onChange={update("password")} className={inputClass} />
              </label>
              <label className="block text-sm font-medium text-slate-700">Confirm password
                <input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={form.confirmPassword} onChange={update("confirmPassword")} className={inputClass} />
              </label>
              {otpSent && <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <label htmlFor="admin-signup-otp" className="block text-sm font-semibold text-slate-800">Email verification code</label>
                <p className="mt-1 text-xs text-slate-600">Enter the six-digit code sent to {form.email}. It expires in 10 minutes.</p>
                <input id="admin-signup-otp" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={form.otp} onChange={(event) => setForm((current) => ({ ...current, otp: event.target.value.replace(/\D/g, "").slice(0, 6) }))} className="mt-3 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-center text-xl font-bold tracking-[0.4em] outline-none focus:border-primary" placeholder="000000" />
                {developmentOtp && <p className="mt-2 text-xs font-medium text-amber-800">Development code: {developmentOtp}</p>}
                <button type="button" disabled={busy} onClick={requestCode} className="mt-3 text-xs font-semibold text-primary hover:underline disabled:opacity-50">Resend code</button>
              </div>}
              {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
              <button type="submit" disabled={busy || invitationState === "checking" || invitationState === "invalid"} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60">
                {busy ? "Please wait..." : otpSent ? "Verify and continue" : "Send verification code"}<ArrowRight className="h-4 w-4" />
              </button>
            </form>
            <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">Already have an admin account? <Link to="/admin/login" className="font-semibold text-primary hover:text-primary-dark">Sign in</Link></p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AdminAccountRegister;
