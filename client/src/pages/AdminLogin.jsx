import { useEffect, useState } from "react";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../context/storeContext";
import { signIn } from "../utils/auth";

const API_URL = import.meta.env.VITE_API_URL || "";
const staffRoles = ["admin", "manager", "user"];

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingSession, setExistingSession] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const store = useStore();

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/auth/me`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return null;
        const result = await response.json();
        return result.user || null;
      })
      .then((user) => {
        if (!active || !user) return;
        setExistingSession(user.role);
        if (staffRoles.includes(user.role)) navigate("/admin", { replace: true });
      })
      .catch(() => { if (active) setExistingSession(""); });
    return () => { active = false; };
  }, [navigate]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn({ audience: "admin", email, password });
      const requestedPath = location.state?.from;
      const returnTo = typeof requestedPath === "string" && (requestedPath === "/admin" || requestedPath.startsWith("/admin/")) && requestedPath !== "/admin/login"
        ? requestedPath
        : "/admin";
      navigate(returnTo, { replace: true });
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
            <h1 className="mt-6 text-3xl font-semibold leading-tight">Your store operations, all in one place.</h1>
            <p className="mt-3 text-sm leading-6 text-white/65">Sign in with your staff account to manage orders, products, inventory, and store settings.</p>
          </div>
          <p className="relative text-xs text-white/45">Authorized staff access only</p>
        </div>

        <div className="px-6 py-8 sm:px-10 sm:py-12 lg:px-12 lg:py-14">
          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-slate-700 lg:hidden">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-primary text-lg font-bold text-white">{store.logoUrl ? <img src={store.logoUrl} alt="" className="h-full w-full object-contain" /> : "+"}</span>
              <span className="max-w-40 truncate">{store.name}</span>
            </Link>
            <Link to="/" className="text-xs font-semibold text-slate-400 transition hover:text-primary">Back to store</Link>
          </div>

          <div className="mx-auto mt-9 max-w-sm lg:mt-12">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-primary"><KeyRound className="h-5 w-5" /></span>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-primary">Staff access</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Admin sign in</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Use your admin or staff credentials to continue.</p>

            {existingSession === "customer" && <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">A customer session is active. Signing in here will switch this browser to the staff account.</p>}

            <form onSubmit={submit} className="mt-7 space-y-4">
              <label className="block text-sm font-medium text-slate-700">Work email
                <input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-primary" placeholder="name@store.com" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Password
                <input required type="password" minLength={8} maxLength={128} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-primary" placeholder="Enter your password" />
              </label>
              {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60">
                {loading ? "Signing in..." : "Sign in to admin"}<ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-7 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">Shopping with us? <Link to="/customer/login" className="font-semibold text-primary hover:text-primary-dark">Customer sign in</Link></p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AdminLogin;
