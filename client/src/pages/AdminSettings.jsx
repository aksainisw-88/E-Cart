import { useEffect, useState } from "react";
import { Bell, CheckCircle2, CreditCard, Database, LockKeyhole, RotateCcw, Save, ShoppingCart, UserRound } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";
const subscriptionPrice = (amount) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
}).format(Number(amount) || 0);
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
  { key: "razorpay", name: "Razorpay", description: "Accept and confirm secure online payments with Razorpay Checkout and webhooks." },
  { key: "phonepe", name: "PhonePe POS", description: "Connect your PhonePe merchant terminal." },
  { key: "paytm", name: "Paytm POS", description: "Accept payments through your Paytm device." },
  { key: "fingpay", name: "Fingpay", description: "Connect Fingpay assisted payment services." },
  { key: "pinelab", name: "Pine Labs", description: "Connect your Pine Labs payment terminal." },
];
const emptyIntegrations = Object.fromEntries(paymentProviders.map(({ key }) => [key, { enabled: false, mode: "test", merchantId: "", terminalId: "", deviceId: "", apiKey: "", apiSecret: "", webhookSecret: "", apiKeyConfigured: false, apiSecretConfigured: false, webhookSecretConfigured: false }]));

const AdminSettings = () => {
  const isSubscriptionRegistration = window.location.pathname === "/admin/subscription-registration";
  const [profile, setProfile] = useState({ id: "", name: "", email: "", role: "" });
  const [preferences, setPreferences] = useState(readPreferences);
  const [integrations, setIntegrations] = useState(emptyIntegrations);
  const [resetOtp, setResetOtp] = useState("");
  const [resetFallbackOtp, setResetFallbackOtp] = useState("");
  const [resetAcknowledged, setResetAcknowledged] = useState(false);
  const [resetBusy, setResetBusy] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const [storeResetOtp, setStoreResetOtp] = useState("");
  const [storeDevelopmentOtp, setStoreDevelopmentOtp] = useState("");
  const [storeResetAcknowledged, setStoreResetAcknowledged] = useState(false);
  const [storeResetBusy, setStoreResetBusy] = useState("");
  const [storeResetMessage, setStoreResetMessage] = useState("");
  const [storeResetError, setStoreResetError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [subscription, setSubscription] = useState(undefined);
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseBusy, setLicenseBusy] = useState(false);
  const [licenseMessage, setLicenseMessage] = useState("");
  const [licenseError, setLicenseError] = useState("");
  const [licenseFormOpen, setLicenseFormOpen] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState(undefined);
  const [databaseUri, setDatabaseUri] = useState("");
  const [databaseAcknowledged, setDatabaseAcknowledged] = useState(false);
  const [databaseBusy, setDatabaseBusy] = useState(false);
  const [databaseMessage, setDatabaseMessage] = useState("");
  const [databaseError, setDatabaseError] = useState("");
  const [sharedPlatform, setSharedPlatform] = useState(undefined);
  const [platformModeError, setPlatformModeError] = useState("");
  const [purchaseRequest, setPurchaseRequest] = useState(null);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [purchaseForm, setPurchaseForm] = useState({ business: "", phone: "", notes: "" });
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [purchaseError, setPurchaseError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/auth/onboarding-config`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || typeof result.sharedPlatform !== "boolean") {
          throw new Error(result.message || "Unable to determine database configuration mode.");
        }
        return result.sharedPlatform;
      })
      .then((isSharedPlatform) => {
        if (active) setSharedPlatform(isSharedPlatform);
      })
      .catch((requestError) => {
        if (!active) return;
        setSharedPlatform(null);
        setPlatformModeError(requestError.message);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (sharedPlatform !== false || !subscription?.active) return undefined;
    let active = true;
    fetch(`${API_URL}/api/customer-database/status`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load database status.");
        return result.data;
      })
      .then((data) => { if (active) setDatabaseStatus(data); })
      .catch((requestError) => { if (active) setDatabaseError(requestError.message); });
    return () => { active = false; };
  }, [sharedPlatform, subscription?.active]);

  useEffect(() => {
    fetch(`${API_URL}/api/auth/me`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load account details.");
        return result.user;
      })
      .then((user) => setProfile({ id: user.id, name: user.name, email: user.email, role: user.role }))
      .catch((requestError) => setError(requestError.message));
    fetch(`${API_URL}/api/subscription/status`, { credentials: "include" })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.message || "Unable to load subscription status."); return result.data; })
      .then((data) => {
        setSubscription(data);
        if (!data?.active) {
          setPlansLoading(true);
          return Promise.all([
            fetch(`${API_URL}/api/subscription/request`, { credentials: "include" }),
            fetch(`${API_URL}/api/subscription/plans`, { credentials: "include" }),
          ]).then(async ([requestResponse, plansResponse]) => {
            const [requestResult, plansResult] = await Promise.all([requestResponse.json(), plansResponse.json()]);
            if (!requestResponse.ok) throw new Error(requestResult.message || "Unable to load subscription request.");
            if (!plansResponse.ok) throw new Error(plansResult.message || "Unable to load subscription plans.");
            setPurchaseRequest(requestResult.data);
            if (requestResult.store) {
              setPurchaseForm((current) => ({
                ...current,
                business: requestResult.store.name || current.business,
                phone: requestResult.store.phone || current.phone,
              }));
            }
            setPlans(plansResult.data);
            setSelectedPlanId((current) => current || plansResult.data[0]?.id || "");
            setPurchaseError("");
          }).catch((requestError) => {
            setPurchaseError(requestError.message);
          }).finally(() => setPlansLoading(false));
        }
        return fetch(`${API_URL}/api/store/payment-integrations`, { credentials: "include" })
          .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.message || "Unable to load payment integrations."); return result.data; })
          .then((data) => setIntegrations((current) => ({ ...current, ...data })));
      })
      .catch((requestError) => {
        setSubscription(null);
        setLicenseError(requestError.message);
      });
  }, []);

  const updateProfile = (field) => (event) => setProfile((current) => ({ ...current, [field]: event.target.value }));
  const updatePreference = (field) => (event) => setPreferences((current) => ({ ...current, [field]: event.target.checked }));
  const updateIntegration = (provider, field) => (event) => setIntegrations((current) => ({ ...current, [provider]: { ...current[provider], [field]: field === "enabled" ? event.target.checked : event.target.value } }));

  const activateSubscription = async (event) => {
    event.preventDefault();
    setLicenseBusy(true);
    setLicenseError("");
    setLicenseMessage("");
    try {
      const response = await fetch(`${API_URL}/api/subscription/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ registrationNumber, licenseKey }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to verify your subscription.");
      setSubscription(result.data);
      setRegistrationNumber("");
      setLicenseKey("");
      setLicenseFormOpen(false);
      setLicenseMessage(result.message || "Subscription verified.");
    } catch (requestError) {
      setLicenseError(requestError.message);
    } finally {
      setLicenseBusy(false);
    }
  };

  const saveDatabase = async (event) => {
    event.preventDefault();
    setDatabaseBusy(true);
    setDatabaseError("");
    setDatabaseMessage("");
    try {
      const response = await fetch(`${API_URL}/api/customer-database`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ uri: databaseUri }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to connect the customer database.");
      setDatabaseStatus(result.data);
      setDatabaseUri("");
      setDatabaseAcknowledged(false);
      setDatabaseMessage(result.message || "Customer database connected.");
    } catch (requestError) {
      setDatabaseError(requestError.message);
    } finally {
      setDatabaseBusy(false);
    }
  };

  const submitPurchaseRequest = async (event) => {
    event.preventDefault();
    setPurchaseBusy(true);
    setPurchaseError("");
    setPurchaseMessage("");
    try {
      const response = await fetch(`${API_URL}/api/subscription/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...purchaseForm, name: profile.name, planId: selectedPlanId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to submit your subscription request.");
      setPurchaseRequest(result.data);
      setPurchaseMessage(result.message || "Subscription request sent for review.");
    } catch (requestError) {
      setPurchaseError(requestError.message);
    } finally {
      setPurchaseBusy(false);
    }
  };

  const sendInventoryResetOtp = async () => {
    setResetBusy("send");
    setResetError("");
    setResetMessage("");
    setResetFallbackOtp("");
    try {
      const response = await fetch(`${API_URL}/api/users/inventory-reset/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to send inventory reset code.");
      setResetFallbackOtp(result.fallbackOtp || "");
      setResetOtp("");
      setResetAcknowledged(false);
      setResetMessage(result.message || "Reset code sent to the signed-in admin email.");
    } catch (requestError) {
      setResetError(requestError.message);
    } finally {
      setResetBusy("");
    }
  };

  const confirmInventoryReset = async () => {
    setResetBusy("reset");
    setResetError("");
    setResetMessage("");
    try {
      const response = await fetch(`${API_URL}/api/users/inventory-reset/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ otp: resetOtp }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to reset inventory.");
      setResetOtp("");
      setResetFallbackOtp("");
      setResetAcknowledged(false);
      setResetMessage(`${result.message} ${result.data?.products ?? 0} products and ${result.data?.batches ?? 0} batches updated.`);
    } catch (requestError) {
      setResetError(requestError.message);
    } finally {
      setResetBusy("");
    }
  };

  const sendStoreResetOtp = async () => {
    setStoreResetBusy("send");
    setStoreResetError("");
    setStoreResetMessage("");
    setStoreDevelopmentOtp("");
    try {
      const response = await fetch(`${API_URL}/api/users/store-reset/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to send store reset code.");
      setStoreDevelopmentOtp(result.developmentOtp || "");
      setStoreResetOtp("");
      setStoreResetAcknowledged(false);
      setStoreResetMessage(result.message || "Store reset code sent to the signed-in admin email.");
    } catch (requestError) {
      setStoreResetError(requestError.message);
    } finally {
      setStoreResetBusy("");
    }
  };

  const confirmStoreReset = async () => {
    setStoreResetBusy("reset");
    setStoreResetError("");
    setStoreResetMessage("");
    try {
      const response = await fetch(`${API_URL}/api/users/store-reset/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ otp: storeResetOtp }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to reset store data.");
      setStoreResetOtp("");
      setStoreDevelopmentOtp("");
      setStoreResetAcknowledged(false);
      setStoreResetMessage(`${result.message} Admin/staff accounts preserved; ${result.data?.products ?? 0} products and ${result.data?.customers ?? 0} customers deleted.`);
    } catch (requestError) {
      setStoreResetError(requestError.message);
    } finally {
      setStoreResetBusy("");
    }
  };

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

  if (subscription === undefined) {
    return <div className="mx-auto max-w-275 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Checking subscription status...</div>;
  }

  return (
    <div className="mx-auto max-w-275">
      <div>
        <p className="text-sm font-medium text-primary">Admin workspace</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{isSubscriptionRegistration ? "Subscription registration" : "Settings"}</h1>
        <p className="mt-2 text-sm text-slate-500">{isSubscriptionRegistration ? "Choose a plan, submit your request for Super Admin review, and activate your approved license." : "Manage your admin profile and workspace preferences."}</p>
      </div>

      {(message || error) && <div className={`mt-5 rounded-lg p-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-700"}`}>{error || message}</div>}

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-lg ${subscription?.active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}><LockKeyhole className="h-5 w-5" /></span><div><h2 className="font-semibold text-slate-900">Subscription license</h2><p className="mt-1 text-xs text-slate-500">Admin operations require a matching registration number, license key, and valid subscription date.</p></div></div>
          {subscription?.active && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Active</span>}
        </div>
        {subscription?.active && !licenseFormOpen ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-700">Registration no. <strong className="ml-1 font-mono">{subscription.registrationNumber}</strong><span className="mx-3 text-slate-300">|</span>Valid until <strong>{subscription.validTill}</strong></p>
            <button type="button" onClick={() => setLicenseFormOpen(true)} className="text-sm font-semibold text-primary">Change license</button>
          </div>
        ) : (
          <form onSubmit={activateSubscription} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Registration number<input required value={registrationNumber} onChange={(event) => setRegistrationNumber(event.target.value)} autoComplete="off" className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 font-mono outline-none focus:border-primary" placeholder="EC-YYYY-XXXXXXXXXXXX" /></label>
            <label className="text-sm font-medium text-slate-700">License key<input required type="password" value={licenseKey} onChange={(event) => setLicenseKey(event.target.value)} autoComplete="off" className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 font-mono outline-none focus:border-primary" placeholder="Enter the key provided by E-Cart" /></label>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <button type="submit" disabled={licenseBusy} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60"><LockKeyhole className="h-4 w-4" />{licenseBusy ? "Verifying..." : "Verify and activate"}</button>
              {subscription?.active && <button type="button" onClick={() => setLicenseFormOpen(false)} className="text-sm text-slate-500">Cancel</button>}
              <span className="text-xs text-slate-500">Credentials are matched against the signed-in admin email.</span>
            </div>
          </form>
        )}
        {subscription !== undefined && !subscription?.active && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">License status: {subscription?.status || "Not activated"}. Admin operations stay locked until an active license with valid dates is entered.</p>}
        {(licenseMessage || licenseError) && <p role={licenseError ? "alert" : "status"} className={`mt-4 rounded-lg p-3 text-sm ${licenseError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{licenseError || licenseMessage}</p>}
      </section>

      {subscription !== undefined && !subscription?.active && <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700"><ShoppingCart className="h-5 w-5" /></span><div><h2 className="font-semibold text-slate-900">Buy a subscription</h2><p className="mt-1 text-xs text-slate-500">Request a subscription and license from the E-Cart platform administrator.</p></div></div>
        {purchaseRequest?.status === "Pending" || purchaseRequest?.status === "Processing" ? (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Request {purchaseRequest.status === "Pending" ? "submitted" : "being processed"}</p>
            <p className="mt-1">Your {purchaseRequest.plan} ({purchaseRequest.billingInterval || "yearly"}) subscription request was received on {purchaseRequest.requestedAt}. The platform administrator will review it and issue your registration number and license key.</p>
          </div>
        ) : purchaseRequest?.status === "Approved" ? (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-semibold">Subscription approved</p>
            <p className="mt-1">Your request was approved. Enter the registration number and license key above to activate your subscription and unlock admin operations.</p>
          </div>
        ) : (
          <form onSubmit={submitPurchaseRequest} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Contact name<input required minLength="2" maxLength="80" readOnly={!profile.name} value={profile.name} onChange={updateProfile("name")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary read-only:bg-slate-50" /></label>
              <label className="text-sm font-medium text-slate-700">Business / store name<input required minLength="2" maxLength="120" value={purchaseForm.business} onChange={(event) => setPurchaseForm((current) => ({ ...current, business: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" placeholder="Your store name" /></label>
              <label className="text-sm font-medium text-slate-700">Admin email<input type="email" readOnly value={profile.email} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 outline-none" /></label>
              <label className="text-sm font-medium text-slate-700">Phone number<input maxLength="30" value={purchaseForm.phone} onChange={(event) => setPurchaseForm((current) => ({ ...current, phone: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" placeholder="Contact phone" /></label>
            </div>
            <fieldset>
              <legend className="text-sm font-medium text-slate-700">Choose a subscription plan</legend>
              {plansLoading ? <p className="mt-3 text-sm text-slate-500">Loading available plans...</p> : plans.length === 0 ? (
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">There are no active plans available right now. Please contact the platform administrator.</p>
              ) : (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {plans.map((plan) => (
                    <button key={plan.id} type="button" aria-pressed={selectedPlanId === plan.id} onClick={() => setSelectedPlanId(plan.id)} className={`rounded-xl border p-4 text-left transition ${selectedPlanId === plan.id ? "border-primary bg-indigo-50/50 ring-1 ring-primary" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                      <span className="flex items-start justify-between gap-3"><span><strong className="text-slate-900">{plan.name}</strong>{plan.featured && <span className="ml-2 rounded-full bg-indigo-100 px-2 py-1 text-[10px] font-semibold text-indigo-700">Featured</span>}</span><span className="text-right font-semibold text-slate-900">{subscriptionPrice(plan.price)}<small className="block font-normal text-slate-500">per {plan.billingInterval === "monthly" ? "month" : "year"}</small></span></span>
                      {plan.description && <span className="mt-2 block text-sm leading-5 text-slate-600">{plan.description}</span>}
                    </button>
                  ))}
                </div>
              )}
            </fieldset>
            <label className="block text-sm font-medium text-slate-700">Message (optional)<textarea maxLength="500" rows="3" value={purchaseForm.notes} onChange={(event) => setPurchaseForm((current) => ({ ...current, notes: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-200 p-3 outline-none focus:border-primary" placeholder="Add any details for the platform administrator." /></label>
            <p className="text-xs text-slate-500">This submits a purchase request only. No payment is charged here. The platform administrator will confirm the listed price and approve your license.</p>
            <button type="submit" disabled={purchaseBusy || plansLoading || !plans.length || !selectedPlanId || !profile.name || !profile.email} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60"><ShoppingCart className="h-4 w-4" />{purchaseBusy ? "Submitting..." : "Request subscription"}</button>
          </form>
        )}
        {(purchaseMessage || purchaseError) && <p role={purchaseError ? "alert" : "status"} className={`mt-4 rounded-lg p-3 text-sm ${purchaseError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{purchaseError || purchaseMessage}</p>}
      </section>}

      {subscription?.active && sharedPlatform === false && <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700"><Database className="h-5 w-5" /></span><div><h2 className="font-semibold text-slate-900">Customer database</h2><p className="mt-1 text-xs text-slate-500">Connect this customer API to a new MongoDB Atlas database.</p></div></div>
        <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
          <p>Connection: <strong className={databaseStatus?.connected ? "text-emerald-700" : "text-amber-700"}>{databaseStatus === undefined ? "Checking..." : databaseStatus.connected ? databaseStatus.configuredInSettings ? "Connected (custom database)" : "Connected (API default database)" : "Unavailable"}</strong>{databaseStatus?.databaseName && <span> · Database: <strong>{databaseStatus.databaseName}</strong></span>}</p>
          <p className="mt-2 text-xs">Only MongoDB Atlas SRV URIs are accepted. Your URI is sent directly to the API, encrypted for this customer deployment, and never shown again. The API must have its database-encryption key configured.</p>
          <p className="mt-2 text-xs font-medium text-amber-800">This switches the database for the entire API deployment, not just this admin account. Store branding and catalog data come from the currently connected database until the switch succeeds. Each separate business needs its own customer API deployment and database.</p>
          <p className="mt-2 text-xs">For Atlas connection failures, allow the Render API's outbound IP addresses in Atlas Network Access and give the Atlas database user read/write permissions on the selected database. After connecting a clean database, set your logo and store details under Store management.</p>
        </div>
        <form onSubmit={saveDatabase} className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700">MongoDB Atlas connection URI
            <input required type="password" autoComplete="new-password" value={databaseUri} onChange={(event) => setDatabaseUri(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm outline-none focus:border-primary" placeholder="mongodb+srv://username:password@cluster.mongodb.net/customer_db?retryWrites=true&w=majority" />
          </label>
          <label className="flex items-start gap-3 text-xs text-slate-600"><input required type="checkbox" checked={databaseAcknowledged} onChange={(event) => setDatabaseAcknowledged(event.target.checked)} className="mt-0.5" /><span>I understand this switches the API to the selected database. Existing store data is not copied or deleted; only my admin account is added to the new database so I can continue signing in.</span></label>
          <button type="submit" disabled={databaseBusy || !databaseUri} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60"><Database className="h-4 w-4" />{databaseBusy ? "Testing and connecting..." : "Test and connect database"}</button>
        </form>
        {(databaseMessage || databaseError) && <p role={databaseError ? "alert" : "status"} className={`mt-4 rounded-lg p-3 text-sm ${databaseError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{databaseError || databaseMessage}</p>}
      </section>}
      {subscription?.active && sharedPlatform === null && <p role="alert" className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">Could not determine whether this deployment uses shared tenant databases. Database connection settings are hidden for safety. {platformModeError}</p>}

      {subscription?.active && <form onSubmit={saveSettings} className="mt-8 space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-primary"><UserRound className="h-5 w-5" /></span><div><h2 className="font-semibold text-slate-900">Profile</h2><p className="mt-1 text-xs text-slate-500">This information identifies you in the admin console.</p></div></div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Full name<input required minLength="2" value={profile.name} onChange={updateProfile("name")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
            <label className="text-sm font-medium text-slate-700">Email address<input required type="email" readOnly={Boolean(subscription?.active)} value={profile.email} onChange={updateProfile("email")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary read-only:bg-slate-50" /></label>
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
                  {provider.key !== "razorpay" && <label className="text-xs font-semibold text-slate-600">Connection mode<select value={integration.mode} onChange={updateIntegration(provider.key, "mode")} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 outline-none focus:border-primary"><option value="test">Test / sandbox</option><option value="live">Live</option></select></label>}
                  {provider.key === "razorpay" ? <>
                    <label className="text-xs font-semibold text-slate-600">Key ID<input value={integration.apiKey} onChange={updateIntegration(provider.key, "apiKey")} placeholder={integration.apiKeyConfigured ? "Saved Key ID (leave blank to keep)" : "rzp_test_... or rzp_live_..."} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label>
                    <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Key Secret<input type="password" value={integration.apiSecret} onChange={updateIntegration(provider.key, "apiSecret")} placeholder={integration.apiSecretConfigured ? "Saved Key Secret (leave blank to keep)" : "Razorpay Key Secret"} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label>
                    <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Webhook secret<input type="password" value={integration.webhookSecret} onChange={updateIntegration(provider.key, "webhookSecret")} placeholder={integration.webhookSecretConfigured ? "Saved webhook secret (leave blank to keep)" : "Secret configured for this webhook in Razorpay"} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label>
                  </> : <>
                  <label className="text-xs font-semibold text-slate-600">Merchant ID<input value={integration.merchantId} onChange={updateIntegration(provider.key, "merchantId")} placeholder="Merchant ID" className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label>
                  <label className="text-xs font-semibold text-slate-600">Terminal ID<input value={integration.terminalId} onChange={updateIntegration(provider.key, "terminalId")} placeholder="Terminal ID" className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label>
                  <label className="text-xs font-semibold text-slate-600">Device ID<input value={integration.deviceId} onChange={updateIntegration(provider.key, "deviceId")} placeholder="POS device ID" className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label>
                  <label className="text-xs font-semibold text-slate-600">API key<input value={integration.apiKey} onChange={updateIntegration(provider.key, "apiKey")} placeholder={integration.apiKeyConfigured ? "Saved key (leave blank to keep)" : "API key"} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label>
                  <label className="text-xs font-semibold text-slate-600">API secret<input type="password" value={integration.apiSecret} onChange={updateIntegration(provider.key, "apiSecret")} placeholder={integration.apiSecretConfigured ? "Saved secret (leave blank to keep)" : "API secret"} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label>
                  </>}
                </div>
                {provider.key === "razorpay" && <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-700">Payment flow</p>
                  <p className="mt-2 text-xs leading-6 text-slate-600">Customer → Your Website/App → Razorpay Checkout → Payment → Razorpay → Webhook/API → Your Server → Order/Invoice Updated</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Webhook URL: <code className="break-all">/api/webhooks/razorpay</code>. Subscribe to the <code>payment.captured</code> event and use the same webhook secret above.</p>
                </div>}
                <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500"><CheckCircle2 className={`h-3.5 w-3.5 ${integration.apiKeyConfigured || integration.apiSecretConfigured ? "text-emerald-600" : "text-slate-300"}`} /> Credentials are stored securely and never returned.</p>
              </article>;
            })}
          </div>
          <p className="mt-5 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">POS providers use different onboarding, device APIs, and settlement contracts. Save the provider credentials here first; transaction activation also requires the provider&apos;s approved POS/API access.</p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><LockKeyhole className="h-5 w-5" /></span><div><h2 className="font-semibold text-slate-900">Security</h2><p className="mt-1 text-xs text-slate-500">Your session is protected with an HttpOnly authentication cookie.</p></div></div><p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">To change your password, sign out and use the account recovery flow. Admin role changes remain available in Users.</p></section>

        <section className="rounded-xl border border-red-200 bg-white p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-red-100 pb-5"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600"><RotateCcw className="h-5 w-5" /></span><div><h2 className="font-semibold text-slate-900">Reset inventory to zero</h2><p className="mt-1 text-xs text-slate-500">This resets product, location, variant, and purchase-batch stock. It preserves customers, products, orders, sales, purchases, and store settings.</p></div></div>
          <div className="mt-5 flex flex-wrap items-end gap-3"><button type="button" onClick={sendInventoryResetOtp} disabled={Boolean(resetBusy)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">{resetBusy === "send" ? "Preparing code..." : "Email OTP or show fallback code"}</button><p className="text-xs text-slate-500">Signed in as {profile.email || "admin"}</p></div>
          {resetFallbackOtp && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Email is unavailable. One-time reset fallback code: <span className="font-bold tracking-widest">{resetFallbackOtp}</span></p>}
          <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(180px,240px)_1fr] sm:items-end">
            <label className="text-sm font-semibold text-slate-700">6-digit OTP<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={resetOtp} onChange={(event) => setResetOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm tracking-widest outline-none focus:border-primary" placeholder="Enter code" /></label>
            <label className="flex cursor-pointer items-start gap-2 pb-2 text-xs leading-5 text-slate-600"><input type="checkbox" checked={resetAcknowledged} onChange={(event) => setResetAcknowledged(event.target.checked)} className="mt-0.5 h-4 w-4 accent-red-600" /><span>I understand all current product, branch, variant, and batch stock quantities will be set to zero.</span></label>
          </div>
          {resetError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{resetError}</p>}
          {resetMessage && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{resetMessage}</p>}
          <div className="mt-5 flex justify-end"><button type="button" onClick={confirmInventoryReset} disabled={Boolean(resetBusy) || resetOtp.length !== 6 || !resetAcknowledged} className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"><RotateCcw className="h-4 w-4" />{resetBusy === "reset" ? "Resetting..." : "Confirm inventory reset"}</button></div>
        </section>

        <section className="rounded-xl border border-red-300 bg-white p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-red-100 pb-5"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-700"><RotateCcw className="h-5 w-5" /></span><div><h2 className="font-semibold text-red-800">Reset all store data</h2><p className="mt-1 text-xs text-slate-500">Permanently deletes customers, products, categories, orders, POS sales, purchases, vendors, offers, support tickets, store locations/settings, and uploaded product/store files. Admin and staff accounts are preserved.</p></div></div>
          <div className="mt-5 flex flex-wrap items-end gap-3"><button type="button" onClick={sendStoreResetOtp} disabled={Boolean(storeResetBusy)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">{storeResetBusy === "send" ? "Sending code..." : "Send separate store reset OTP"}</button><p className="text-xs text-slate-500">Sent to {profile.email || "the signed-in admin email"}</p></div>
          {storeDevelopmentOtp && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Development store reset code: <span className="font-bold tracking-widest">{storeDevelopmentOtp}</span></p>}
          <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(180px,240px)_1fr] sm:items-end">
            <label className="text-sm font-semibold text-slate-700">6-digit store reset OTP<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={storeResetOtp} onChange={(event) => setStoreResetOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm tracking-widest outline-none focus:border-primary" placeholder="Enter separate code" /></label>
            <label className="flex cursor-pointer items-start gap-2 pb-2 text-xs leading-5 text-red-700"><input type="checkbox" checked={storeResetAcknowledged} onChange={(event) => setStoreResetAcknowledged(event.target.checked)} className="mt-0.5 h-4 w-4 accent-red-600" /><span>I understand this permanently deletes the listed store records and uploaded files. This cannot be undone.</span></label>
          </div>
          {storeResetError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{storeResetError}</p>}
          {storeResetMessage && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{storeResetMessage}</p>}
          <div className="mt-5 flex justify-end"><button type="button" onClick={confirmStoreReset} disabled={Boolean(storeResetBusy) || storeResetOtp.length !== 6 || !storeResetAcknowledged} className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"><RotateCcw className="h-4 w-4" />{storeResetBusy === "reset" ? "Resetting store..." : "Permanently reset store data"}</button></div>
        </section>

        <div className="flex justify-end"><button type="submit" disabled={saving || !profile.id} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save settings"}</button></div>
      </form>}
    </div>
  );
};

export default AdminSettings;
