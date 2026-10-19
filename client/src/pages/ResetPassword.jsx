import { useState } from "react";
import { ArrowRight, KeyRound } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to reset your password.");
      setMessage(result.message || "Password updated. Sign in with your new password.");
    } catch (requestError) {
      setError(requestError instanceof TypeError ? "Unable to reach the server. Please try again." : requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <main className="flex min-h-[calc(100vh-186px)] items-center justify-center bg-slate-50 px-4 py-12 md:min-h-[calc(100vh-146px)]">
        <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-primary"><KeyRound className="h-5 w-5" /></span>
          <p className="mt-5 text-xs font-bold uppercase tracking-wider text-primary">Account recovery</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Set a new password</h1>
          <p className="mt-2 text-sm text-slate-500">Choose a password with at least 8 characters.</p>
          {!token ? <p role="alert" className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">This reset link is invalid. Request a new one from sign in.</p> : message ? (
            <div className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800"><p>{message}</p><Link to="/customer/login" className="mt-3 inline-flex items-center gap-2 font-semibold text-primary hover:text-primary-dark">Go to sign in <ArrowRight className="h-4 w-4" /></Link></div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">New password<input required minLength={8} maxLength={128} autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
              <label className="block text-sm font-medium text-slate-700">Confirm new password<input required minLength={8} maxLength={128} autoComplete="new-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <button type="submit" disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-white hover:bg-primary-dark disabled:opacity-60">{loading ? "Updating..." : "Update password"}<ArrowRight className="h-4 w-4" /></button>
            </form>
          )}
        </section>
      </main>
    </>
  );
};

export default ResetPassword;
