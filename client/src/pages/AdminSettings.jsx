import { useEffect, useState } from "react";
import { Bell, CheckCircle2, CreditCard, LockKeyhole, Save, UserRound } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";
const preferenceKey = "e-mart-admin-preferences";
const defaultPreferences = { emailNotifications: true, orderAlerts: true, compactTables: false };
const readPreferences = () => {
  try {
    return { ...defaultPreferences, ...(JSON.parse(localStorage.getItem(preferenceKey) || "null") || {}) };
  } catch {
    return defaultPreferences;
  }
};
const paymentProviders = [
  { key: "phonepe", name: "PhonePe POS", description: "Connect your PhonePe merchant terminal." },
  { key: "paytm", name: "Paytm POS", description: "Accept payments through your Paytm device." },
  { key: "fingpay", name: "Fingpay", description: "Connect Fingpay assisted payment services." },
  { key: "pinelab", name: "Pine Labs", description: "Connect your Pine Labs payment terminal." },
];
const emptyIntegrations = Object.fromEntries(paymentProviders.map(({ key }) => [key, { enabled: false, mode: "test", merchantId: "", terminalId: "", deviceId: "", apiKey: "", apiSecret: "", apiKeyConfigured: false, apiSecretConfigured: false }]));

const AdminSettings = () => {
  const [profile, setProfile] = useState({ id: "", name: "", email: "", role: "" });
  const [preferences, setPreferences] = useState(readPreferences);
  const [integrations, setIntegrations] = useState(emptyIntegrations);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/auth/me`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load account details.");
        return result.user;
      })
      .then((user) => setProfile({ id: user.id, name: user.name, email: user.email, role: user.role }))
      .catch((requestError) => setError(requestError.message));
    fetch(`${API_URL}/api/store/payment-integrations`, { credentials: "include" })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.message || "Unable to load payment integrations."); return result.data; })
      .then((data) => setIntegrations((current) => ({ ...current, ...data })))
      .catch((requestError) => setError(requestError.message));
  }, []);

  const updateProfile = (field) => (event) => setProfile((current) => ({ ...current, [field]: event.target.value }));
  const updatePreference = (field) => (event) => setPreferences((current) => ({ ...current, [field]: event.target.checked }));
  const updateIntegration = (provider, field) => (event) => setIntegrations((current) => ({ ...current, [provider]: { ...current[provider], [field]: field === "enabled" ? event.target.checked : event.target.value } }));

  const saveSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/users/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: profile.name, email: profile.email, role: profile.role }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save account settings.");
      localStorage.setItem(preferenceKey, JSON.stringify(preferences));
      const integrationsResponse = await fetch(`${API_URL}/api/store/payment-integrations`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(integrations) });
      const integrationsResult = await integrationsResponse.json();
      if (!integrationsResponse.ok) throw new Error(integrationsResult.message || "Unable to save payment integrations.");
      setIntegrations((current) => ({ ...current, ...integrationsResult.data }));
      setProfile((current) => ({ ...current, ...result.data }));
      setMessage("Settings saved successfully.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-275">
      <div>
        <p className="text-sm font-medium text-primary">Admin workspace</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Settings</h1>
        <p className="mt-2 text-sm text-slate-500">Manage your admin profile and workspace preferences.</p>
      </div>

      {(message || error) && <div className={`mt-5 rounded-lg p-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-700"}`}>{error || message}</div>}

      <form onSubmit={saveSettings} className="mt-8 space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-primary"><UserRound className="h-5 w-5" /></span><div><h2 className="font-semibold text-slate-900">Profile</h2><p className="mt-1 text-xs text-slate-500">This information identifies you in the admin console.</p></div></div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Full name<input required minLength="2" value={profile.name} onChange={updateProfile("name")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
            <label className="text-sm font-medium text-slate-700">Email address<input required type="email" value={profile.email} onChange={updateProfile("email")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
            <div className="rounded-lg bg-slate-50 p-4 text-sm sm:col-span-2"><p className="text-xs uppercase tracking-wide text-slate-400">Access role</p><p className="mt-1 font-semibold capitalize text-slate-700">{profile.role || "Loading..."}</p><p className="mt-1 text-xs text-slate-500">Role permissions are managed from the Users module.</p></div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Bell className="h-5 w-5" /></span><div><h2 className="font-semibold text-slate-900">Notifications and display</h2><p className="mt-1 text-xs text-slate-500">Choose how this browser presents admin updates.</p></div></div>
          <div className="mt-5 divide-y divide-slate-100">
            {[["emailNotifications", "Email notifications", "Receive important store activity updates."], ["orderAlerts", "Order alerts", "Show recent order activity in the header."], ["compactTables", "Compact tables", "Use denser rows in admin data tables."]].map(([field, title, description]) => <label key={field} className="flex cursor-pointer items-center justify-between gap-4 py-4"><span><span className="block text-sm font-semibold text-slate-700">{title}</span><span className="mt-1 block text-xs text-slate-500">{description}</span></span><input type="checkbox" checked={preferences[field]} onChange={updatePreference(field)} className="h-5 w-5 accent-teal-600" /></label>)}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-primary"><CreditCard className="h-5 w-5" /></span><div><h2 className="font-semibold text-slate-900">Payment integrations</h2><p className="mt-1 text-xs text-slate-500">Connect your store&apos;s POS providers for assisted payments at checkout.</p></div></div>
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {paymentProviders.map((provider) => {
              const integration = integrations[provider.key];
              return <article key={provider.key} className="rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold text-slate-900">{provider.name}</h3><p className="mt-1 text-xs text-slate-500">{provider.description}</p></div><label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={integration.enabled} onChange={updateIntegration(provider.key, "enabled")} className="h-4 w-4 accent-teal-600" /> Enabled</label></div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-600">Connection mode<select value={integration.mode} onChange={updateIntegration(provider.key, "mode")} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 outline-none focus:border-primary"><option value="test">Test / sandbox</option><option value="live">Live</option></select></label>
                  <label className="text-xs font-semibold text-slate-600">Merchant ID<input value={integration.merchantId} onChange={updateIntegration(provider.key, "merchantId")} placeholder="Merchant ID" className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label>
                  <label className="text-xs font-semibold text-slate-600">Terminal ID<input value={integration.terminalId} onChange={updateIntegration(provider.key, "terminalId")} placeholder="Terminal ID" className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label>
                  <label className="text-xs font-semibold text-slate-600">Device ID<input value={integration.deviceId} onChange={updateIntegration(provider.key, "deviceId")} placeholder="POS device ID" className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label>
                  <label className="text-xs font-semibold text-slate-600">API key<input value={integration.apiKey} onChange={updateIntegration(provider.key, "apiKey")} placeholder={integration.apiKeyConfigured ? "Saved key (leave blank to keep)" : "API key"} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label>
                  <label className="text-xs font-semibold text-slate-600">API secret<input type="password" value={integration.apiSecret} onChange={updateIntegration(provider.key, "apiSecret")} placeholder={integration.apiSecretConfigured ? "Saved secret (leave blank to keep)" : "API secret"} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label>
                </div>
                <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500"><CheckCircle2 className={`h-3.5 w-3.5 ${integration.apiKeyConfigured || integration.apiSecretConfigured ? "text-emerald-600" : "text-slate-300"}`} /> Credentials are stored securely and never returned.</p>
              </article>;
            })}
          </div>
          <p className="mt-5 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">POS providers use different onboarding, device APIs, and settlement contracts. Save the provider credentials here first; transaction activation also requires the provider&apos;s approved POS/API access.</p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><LockKeyhole className="h-5 w-5" /></span><div><h2 className="font-semibold text-slate-900">Security</h2><p className="mt-1 text-xs text-slate-500">Your session is protected with an HttpOnly authentication cookie.</p></div></div><p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">To change your password, sign out and use the account recovery flow. Admin role changes remain available in Users.</p></section>

        <div className="flex justify-end"><button type="submit" disabled={saving || !profile.id} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save settings"}</button></div>
      </form>
    </div>
  );
};

export default AdminSettings;
