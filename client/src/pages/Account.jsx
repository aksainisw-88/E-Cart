import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Heart, LogOut, Mail, MapPin, Package, Plus, ShieldCheck, Star, Trash2, UserRound } from "lucide-react";
import Footer from "../components/home/Footer";

const API_URL = import.meta.env.VITE_API_URL || "";

const normalizeStatus = (status) => String(status || "open").trim().toLowerCase().replace(/\s+/g, "_");
const formatStatus = (status) => {
  const labels = { open: "Open", in_progress: "In progress", resolved: "Resolved" };
  return labels[normalizeStatus(status)] || normalizeStatus(status);
};

const Account = ({ initialMode = "login" }) => {
  const [mode, setMode] = useState(initialMode);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [recentOrders, setRecentOrders] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [addressMessage, setAddressMessage] = useState("");
  const [addressError, setAddressError] = useState("");
  const [addressForm, setAddressForm] = useState({ label: "Home", name: "", phone: "", address: "", city: "", pincode: "", isDefault: false });
  const navigate = useNavigate();

  useEffect(() => {
    // Login and registration routes share this page and need to reset the form mode.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(initialMode);
    setError("");
    setSubmitted(false);
  }, [initialMode]);

  useEffect(() => {
    let active = true;

    fetch(`${API_URL}/api/auth/me`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return null;
        const result = await response.json();
        return result.user;
      })
      .then((user) => {
        if (!active) return;
        setCurrentUser(user);
        setCheckingSession(false);
      })
      .catch(() => {
        if (active) setCheckingSession(false);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "customer") return;

    fetch(`${API_URL}/api/orders/mine`, { credentials: "include" })
      .then((response) => response.json())
      .then((result) => setRecentOrders(result.data || []))
      .catch(() => setRecentOrders([]));

    fetch(`${API_URL}/api/support/mine`, { credentials: "include" })
      .then((response) => response.json())
      .then((result) => setSupportTickets(result.data || []))
      .catch(() => setSupportTickets([]));

    fetch(`${API_URL}/api/addresses`, { credentials: "include" })
      .then((response) => response.json())
      .then((result) => setAddresses(result.data || []))
      .catch(() => setAddresses([]));
  }, [currentUser]);

  const updateAddress = (field) => (event) => setAddressForm((current) => ({ ...current, [field]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));
  const saveAddress = async (event) => {
    event.preventDefault();
    setAddressMessage("");
    setAddressError("");
    try {
      const response = await fetch(`${API_URL}/api/addresses`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ ...addressForm, isDefault: addressForm.isDefault || addresses.length === 0 }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save address.");
      setAddresses(result.data || []);
      setAddressForm({ label: "Home", name: "", phone: "", address: "", city: "", pincode: "", isDefault: false });
      setAddressFormOpen(false);
      setAddressMessage("Shipping address saved.");
    } catch (requestError) { setAddressError(requestError.message); }
  };
  const deleteAddress = async (id) => {
    const response = await fetch(`${API_URL}/api/addresses/${id}`, { method: "DELETE", credentials: "include" });
    const result = await response.json();
    if (response.ok) setAddresses(result.data || []);
    else setAddressError(result.message || "Unable to remove address.");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "login" : "register";
      const response = await fetch(`${API_URL}/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to authenticate.");
      setSubmitted(true);
      if (result.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (requestError) {
      setError(requestError instanceof TypeError ? "Unable to reach the server. Start the backend with npm run dev from the server folder." : requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setCurrentUser(null);
      setSubmitted(false);
      setFormData({ name: "", email: "", password: "" });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field) => (event) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }));
    setError("");
  };

  return (
    <>
      <main className="bg-gray-50 py-12 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:px-8">
          <section className="rounded-2xl bg-primary p-8 text-white sm:p-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
              <UserRound className="h-6 w-6" />
            </div>
            <p className="mt-10 text-sm font-semibold uppercase tracking-wider text-teal-100">Your health, organized</p>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Everything you need, in one account.</h1>
            <p className="mt-4 max-w-md leading-7 text-teal-50">Save your details, follow your deliveries, and make your next healthcare order even easier.</p>
            <div className="mt-10 space-y-5">
              {[[Package, "Track every order", "Stay updated from dispatch to delivery."], [Heart, "Save your favourites", "Keep frequently ordered products close."], [ShieldCheck, "Shop with confidence", "Your account details stay protected."]].map(([Icon, title, text]) => (
                <div key={title} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-teal-100" />
                  <div><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-teal-100">{text}</p></div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
            {!checkingSession && !currentUser && <div className="flex items-center justify-between border-b border-gray-200">
              <div className="flex">{[["login", "Sign in"], ["signup", "Create account"]].map(([value, label]) => (
                <button key={value} type="button" onClick={() => { setMode(value); setSubmitted(false); }} className={`border-b-2 px-2 pb-4 text-sm font-semibold transition sm:px-4 ${mode === value ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-700"}`}>
                  {label}
                </button>
              ))}</div>
              <Link to="/" className="pb-4 text-xs font-semibold text-gray-400 hover:text-primary">Back home</Link>
            </div>}
            <div className="pt-8">
              <h2 className="text-2xl font-bold text-gray-900">{currentUser ? "Your account" : mode === "login" ? "Welcome back" : "Join My Medical Store"}</h2>
              <p className="mt-2 text-sm text-gray-500">{currentUser ? "Manage your orders and saved products." : mode === "login" ? "Sign in to access your orders and saved products." : "Create an account to make shopping simpler."}</p>
              {checkingSession ? <div className="mt-8 rounded-lg bg-gray-50 p-4 text-sm text-gray-500">Checking your account...</div> : currentUser ? (
                <div className="mt-8">
                  <div className="flex items-center gap-4 rounded-xl bg-teal-50 p-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{currentUser.name}</p>
                      <p className="mt-1 flex items-center gap-1 text-sm text-gray-600"><Mail className="h-3.5 w-3.5" />{currentUser.email}</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={() => navigate("/account/orders")} className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-left transition hover:border-primary hover:bg-white">
                      <Package className="h-5 w-5 text-primary" />
                      <p className="mt-3 text-sm font-semibold text-gray-900">Your orders</p>
                      <p className="mt-1 text-xs text-gray-500">Track recent purchases.</p>
                    </button>
                    <button type="button" className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-left transition hover:border-primary hover:bg-white">
                      <Heart className="h-5 w-5 text-primary" />
                      <p className="mt-3 text-sm font-semibold text-gray-900">Saved products</p>
                      <p className="mt-1 text-xs text-gray-500">View your wishlist.</p>
                    </button>
                  </div>

                  <div className="mt-6 rounded-xl border border-gray-100 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">Recent orders</p>
                      <span className="text-xs text-gray-400">{recentOrders.length} found</span>
                    </div>
                    {recentOrders.length > 0 ? (
                      <div className="mt-3 space-y-3">
                        {recentOrders.slice(0, 3).map((order) => (
                          <div key={order._id} className="flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
                            <div>
                              <p className="font-medium text-gray-700">#{order.orderNumber}</p>
                              <p className="text-xs text-gray-500">{order.items.length} items · {new Date(order.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-primary">₹{order.total}</p>
                              <span className="text-xs text-gray-500">{order.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-gray-500">Your completed orders will appear here.</p>
                    )}
                  </div>

                  <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">Support requests</p>
                      <span className="text-xs text-gray-400">{supportTickets.length} active</span>
                    </div>
                    {supportTickets.length > 0 ? (
                      <div className="mt-3 space-y-3">
                        {supportTickets.slice(0, 3).map((ticket) => (
                          <div key={ticket._id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium text-gray-800">{ticket.subject}</p>
                              <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${normalizeStatus(ticket.status) === "open" ? "bg-amber-50 text-amber-700" : normalizeStatus(ticket.status) === "in_progress" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>
                                {formatStatus(ticket.status)}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-gray-500">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                            {ticket.adminReply && (
                              <p className="mt-2 rounded-md bg-white p-2 text-xs text-gray-600">{ticket.adminReply}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-gray-500">No support requests yet.</p>
                    )}
                  </div>

                  <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-primary"><MapPin className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold text-gray-900">Shipping addresses</h2><p className="mt-1 text-xs text-gray-500">Save addresses for faster checkout.</p></div></div>
                      <button type="button" onClick={() => { setAddressFormOpen((open) => !open); setAddressError(""); }} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-dark"><Plus className="h-3.5 w-3.5" />Add new</button>
                    </div>
                    {(addressMessage || addressError) && <p className={`mt-4 rounded-lg p-3 text-xs ${addressError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{addressError || addressMessage}</p>}
                    {addressFormOpen && <form onSubmit={saveAddress} className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Label<input required value={addressForm.label} onChange={updateAddress("label")} placeholder="Home or Work" className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label><label className="text-xs font-semibold text-slate-600">Full name<input required value={addressForm.name} onChange={updateAddress("name")} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label><label className="text-xs font-semibold text-slate-600">Phone<input required pattern="[0-9]{10}" value={addressForm.phone} onChange={updateAddress("phone")} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label><label className="text-xs font-semibold text-slate-600">City<input required value={addressForm.city} onChange={updateAddress("city")} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Address<input required value={addressForm.address} onChange={updateAddress("address")} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label><label className="text-xs font-semibold text-slate-600">PIN code<input required pattern="[0-9]{6}" value={addressForm.pincode} onChange={updateAddress("pincode")} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label><label className="flex items-center gap-2 self-end pb-2 text-xs font-medium text-slate-600"><input type="checkbox" checked={addressForm.isDefault} onChange={updateAddress("isDefault")} className="h-4 w-4 accent-teal-600" />Make default address</label><div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setAddressFormOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button><button type="submit" className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white">Save address</button></div></form>}
                    <div className="mt-5 space-y-3">{addresses.length ? addresses.map((address) => <div key={address._id} className="rounded-lg border border-slate-200 p-3"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><p className="text-sm font-semibold text-slate-800">{address.label}</p>{address.isDefault && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"><Check className="h-3 w-3" />Default</span>}</div><p className="mt-1 text-xs text-slate-500">{address.name} · {address.phone}</p><p className="mt-1 text-xs leading-5 text-slate-500">{address.address}, {address.city} - {address.pincode}</p></div><button type="button" onClick={() => deleteAddress(address._id)} aria-label={`Remove ${address.label} address`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div></div>) : <p className="rounded-lg bg-slate-50 p-4 text-xs text-slate-500">No saved addresses yet. Add one for a faster checkout.</p>}</div>
                  </section>

                  <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                    <div className="flex items-center gap-2 font-semibold">
                      <Star className="h-4 w-4" />
                      Member benefits
                    </div>
                    <p className="mt-1">Fast checkout, easier reorders, and priority support for your wellness routine.</p>
                  </div>

                  <button type="button" onClick={handleLogout} disabled={loading} className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-200 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"><LogOut className="h-4 w-4" />{loading ? "Signing out..." : "Sign out"}</button>
                </div>
              ) : submitted ? <div className="mt-8 rounded-lg bg-teal-50 p-4 text-sm text-teal-800">You are signed in successfully. Your account is ready to use.</div> : (
                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  {mode === "signup" && <label className="block text-sm font-medium text-gray-700">Full name<input required value={formData.name} onChange={updateField("name")} className="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 outline-none focus:border-primary" placeholder="Your name" /></label>}
                  <label className="block text-sm font-medium text-gray-700">Email address<input required value={formData.email} onChange={updateField("email")} type="email" className="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 outline-none focus:border-primary" placeholder="you@example.com" /></label>
                  <label className="block text-sm font-medium text-gray-700">Password<input required value={formData.password} onChange={updateField("password")} minLength={8} type="password" className="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 outline-none focus:border-primary" placeholder="At least 8 characters" /></label>
                  {mode === "login" && <div className="flex justify-end"><button type="button" className="text-sm font-medium text-primary hover:text-primary-dark">Forgot password?</button></div>}
                  {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                  <button disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-white transition hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60" type="submit">{loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}<ArrowRight className="h-4 w-4" /></button>
                  <p className="text-center text-sm text-gray-500">{mode === "login" ? "Don&apos;t have an account?" : "Already have an account?"}{" "}<Link to={mode === "login" ? "/register" : "/login"} className="font-semibold text-primary hover:text-primary-dark">{mode === "login" ? "Create account" : "Sign in"}</Link></p>
                </form>
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Account;