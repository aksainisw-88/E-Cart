import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Check, ChevronRight, Heart, LogOut, Mail, MapPin, Package, Plus, ShieldCheck, ShoppingBag, Star, Store, Trash2 } from "lucide-react";
import CustomerAccountNav from "../components/customer/CustomerAccountNav";
import Footer from "../components/home/Footer";
import { useStore } from "../context/storeContext";
import { signIn } from "../utils/auth";

const API_URL = import.meta.env.VITE_API_URL || "";
const authImage = "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=1200&q=85";

const normalizeStatus = (status) => String(status || "open").trim().toLowerCase().replace(/\s+/g, "_");
const formatStatus = (status) => {
  const labels = { open: "Open", in_progress: "In progress", resolved: "Resolved" };
  return labels[normalizeStatus(status)] || normalizeStatus(status);
};

const Account = ({ initialMode = "login" }) => {
  const [mode, setMode] = useState(initialMode);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", customerType: "B2C", businessName: "", gstin: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [developmentOtp, setDevelopmentOtp] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [developmentResetUrl, setDevelopmentResetUrl] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingCustomer, setPendingCustomer] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [recentOrders, setRecentOrders] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(() => localStorage.getItem("e-mart-b2b-store") || "");
  const [storePickerOpen, setStorePickerOpen] = useState(false);
  const [storePickerLoading, setStorePickerLoading] = useState(false);
  const [storePickerError, setStorePickerError] = useState("");
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [addressMessage, setAddressMessage] = useState("");
  const [addressError, setAddressError] = useState("");
  const [addressForm, setAddressForm] = useState({ label: "Home", name: "", phone: "", address: "", city: "", pincode: "", isDefault: false });
  const navigate = useNavigate();
  const location = useLocation();
  const store = useStore();

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

    if (currentUser.customerType === "B2B") {
      fetch(`${API_URL}/api/stores`)
        .then((response) => response.json())
        .then((result) => {
          const locations = result.data || [];
          setStores(locations);
          const preferredId = localStorage.getItem("e-mart-b2b-store");
          const preferred = locations.find((location) => location._id === preferredId) || locations[0];
          if (preferred) {
            setSelectedStoreId(preferred._id);
            localStorage.setItem("e-mart-b2b-store", preferred._id);
          }
        })
        .catch(() => setStores([]));
    }

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
  const loadStoreLocations = async () => {
    setStorePickerLoading(true);
    setStorePickerError("");
    try {
      const response = await fetch(`${API_URL}/api/stores`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to load store locations.");
      const availableStores = result.data || [];
      setStores(availableStores);
      const preferredId = localStorage.getItem("e-mart-b2b-store");
      const preferred = availableStores.find((location) => location._id === preferredId) || availableStores[0];
      setSelectedStoreId(preferred?._id || "");
      if (!availableStores.length) setStorePickerError("No active store locations are available right now.");
    } catch {
      setStorePickerError("Unable to load store locations. Please try again.");
    } finally {
      setStorePickerLoading(false);
    }
  };
  const getCustomerLandingPath = () => {
    const requestedPath = location.state?.from;
    if (typeof requestedPath !== "string" || !requestedPath.startsWith("/") || requestedPath.startsWith("//")) return "/";
    const [requestedPathname] = requestedPath.split(/[?#]/, 1);
    const isAuthPage = ["/customer/login", "/customer/register", "/login", "/register", "/reset-password"].includes(requestedPathname);
    if (isAuthPage || requestedPathname === "/admin" || requestedPathname.startsWith("/admin/")) return "/";
    return requestedPath;
  };
  const confirmStoreLocation = () => {
    if (!stores.some((location) => location._id === selectedStoreId)) return;
    localStorage.setItem("e-mart-b2b-store", selectedStoreId);
    setStorePickerOpen(false);
    if (pendingCustomer) {
      setCurrentUser(pendingCustomer);
      setPendingCustomer(null);
    }
    navigate(getCustomerLandingPath(), { replace: true });
  };
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

  const requestSignupOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/signup-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to send a verification code.");
      setOtpSent(true);
      setOtpCode("");
      setDevelopmentOtp(result.developmentOtp || "");
      setError("");
    } catch (requestError) {
      setError(requestError instanceof TypeError ? "Unable to reach the server. Please try again." : requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async (event) => {
    event.preventDefault();
    setForgotLoading(true);
    setForgotError("");
    setForgotMessage("");
    setDevelopmentResetUrl("");
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to request a password reset.");
      setForgotMessage(result.message || "If an account exists for that email, a reset link will be sent.");
      setDevelopmentResetUrl(result.developmentResetUrl || "");
    } catch (requestError) {
      setForgotError(requestError instanceof TypeError ? "Unable to reach the server. Please try again." : requestError.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (mode === "signup" && !otpSent) {
      await requestSignupOtp();
      return;
    }
    setError("");
    setLoading(true);

    try {
      let result;
      if (mode === "login") {
        result = await signIn({ audience: "customer", email: formData.email, password: formData.password });
      } else {
        const response = await fetch(`${API_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ...formData, otp: otpCode }),
        });
        result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to create your account.");
      }
      setSubmitted(true);
      if (["admin", "manager", "user"].includes(result.user.role)) {
        navigate("/admin/login", { replace: true });
      } else if (result.user.customerType === "B2B") {
        setPendingCustomer(result.user);
        setStorePickerOpen(true);
        await loadStoreLocations();
      } else {
        setCurrentUser(result.user);
        navigate(getCustomerLandingPath(), { replace: true });
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
      setFormData({ name: "", email: "", password: "", customerType: "B2C", businessName: "", gstin: "" });
      localStorage.removeItem("e-mart-b2b-store");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field) => (event) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }));
    setError("");
  };

  if (!checkingSession && !currentUser && location.pathname === "/account") {
    return <Navigate to="/customer/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  if (!checkingSession && currentUser && currentUser.role !== "customer") {
    return <Navigate to="/admin" replace />;
  }
  if (!checkingSession && currentUser && location.pathname.startsWith("/customer/")) {
    return <Navigate to="/account" replace />;
  }

  if (currentUser && !checkingSession) {
    const openTickets = supportTickets.filter((ticket) => normalizeStatus(ticket.status) !== "resolved").length;
    const statusClass = (status) => normalizeStatus(status) === "delivered"
      ? "bg-emerald-50 text-emerald-700"
      : normalizeStatus(status) === "cancelled"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";

    return (
      <>
        <main className="min-h-[70vh] bg-[#f4f7f5] py-8 sm:py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-7 flex flex-col justify-between gap-5 rounded-3xl bg-gradient-to-br from-[#063d34] via-[#075747] to-[#0b7660] px-5 py-6 text-white shadow-lg shadow-emerald-950/10 sm:flex-row sm:items-center sm:px-8 sm:py-8">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200">Customer account</p>
                <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Welcome back, {currentUser.name.split(" ")[0]}</h1>
                <p className="mt-2 text-sm text-emerald-50/80">A little space for everything you need from {store.name}.</p>
              </div>
              <div className="flex items-center gap-3">
                <Link to="/products" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-emerald-900 shadow-sm transition hover:bg-emerald-50">
                  <ShoppingBag className="h-4 w-4" />Continue shopping
                </Link>
                <button type="button" onClick={handleLogout} disabled={loading} aria-label="Sign out" title="Sign out" className="rounded-xl border border-white/20 bg-white/10 p-3 text-white transition hover:bg-white/20 disabled:opacity-60">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
              <CustomerAccountNav />
              <div className="min-w-0 space-y-6">
                <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50 text-xl font-bold text-primary ring-1 ring-emerald-100">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{currentUser.name}</p>
                      <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-slate-500"><Mail className="h-3.5 w-3.5 shrink-0" />{currentUser.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                    <ShieldCheck className="h-4 w-4" />Account protected
                  </div>
                </section>

                {currentUser.customerType === "B2B" && (
                  <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                      <div>
                        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary"><Building2 className="h-4 w-4" />Business account</p>
                        <h2 className="mt-2 text-xl font-bold text-slate-900">{currentUser.businessName || currentUser.name}</h2>
                        {currentUser.gstin && <p className="mt-1 text-xs text-slate-500">GSTIN: {currentUser.gstin}</p>}
                      </div>
                      <p className="text-sm text-slate-500">Choose a branch for your next order.</p>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {stores.map((location) => (
                        <article key={location._id} className={`rounded-lg border p-4 ${selectedStoreId === location._id ? "border-primary bg-emerald-50/50" : "border-slate-200"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Store className="h-4 w-4" /></span>
                              <div className="min-w-0">
                                <h3 className="truncate text-sm font-semibold text-slate-900">{location.name}</h3>
                                <p className="mt-1 text-xs text-slate-500">{location.address}, {location.city}{location.pincode ? ` · ${location.pincode}` : ""}</p>
                                {location.phone && <p className="mt-1 text-xs text-slate-500">{location.phone}</p>}
                              </div>
                            </div>
                            {selectedStoreId === location._id && <Check className="h-4 w-4 shrink-0 text-primary" />}
                          </div>
                          <button type="button" onClick={() => { setSelectedStoreId(location._id); localStorage.setItem("e-mart-b2b-store", location._id); }} className={`mt-4 w-full rounded-lg px-3 py-2 text-xs font-semibold ${selectedStoreId === location._id ? "bg-primary text-white" : "border border-slate-200 text-slate-700 hover:border-primary hover:text-primary"}`}>
                            {selectedStoreId === location._id ? "Selected for orders" : "Select this store"}
                          </button>
                        </article>
                      ))}
                      {!stores.length && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500 md:col-span-2">No active stores are available right now. Please contact support.</p>}
                    </div>
                  </section>
                )}

                <section aria-label="Account summary" className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Total orders", value: recentOrders.length, icon: Package, link: "/account/orders" },
                    { label: "Saved addresses", value: addresses.length, icon: MapPin, link: "#customer-addresses" },
                    { label: "Open support requests", value: openTickets, icon: ShieldCheck, link: "/contact" },
                  ].map(({ label, value, icon: Icon, link }) => (
                    <Link key={label} to={link} className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
                      <div>
                        <p className="text-sm text-slate-500">{label}</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
                      </div>
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-primary transition group-hover:bg-primary group-hover:text-white"><Icon className="h-5 w-5" /></span>
                    </Link>
                  ))}
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                      <h2 className="font-semibold text-slate-900">Recent orders</h2>
                      <p className="mt-1 text-xs text-slate-500">Your latest purchases and delivery status</p>
                    </div>
                    <Link to="/account/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark">View all <ChevronRight className="h-4 w-4" /></Link>
                  </div>
                  {recentOrders.length ? (
                    <div className="divide-y divide-slate-100">
                      {recentOrders.slice(0, 4).map((order) => (
                        <div key={order._id} className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">Order #{order.orderNumber}</p>
                            <p className="mt-1 text-xs text-slate-500">{order.items?.length || 0} items · {new Date(order.createdAt).toLocaleDateString()}{order.store?.name ? ` · ${order.store.name}` : ""}</p>
                          </div>
                          <div className="flex items-center justify-between gap-4 sm:justify-end">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(order.status)}`}>{order.status}</span>
                            <span className="min-w-20 text-right text-sm font-bold text-slate-900">₹{Number(order.total || 0).toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-5 py-10 text-center">
                      <Package className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-3 text-sm font-semibold text-slate-800">No orders yet</p>
                      <p className="mt-1 text-sm text-slate-500">Your purchases will appear here.</p>
                      <Link to="/products" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">Browse products <ArrowRight className="h-4 w-4" /></Link>
                    </div>
                  )}
                </section>

                <div className="grid gap-6 xl:grid-cols-2">
                  <section id="customer-addresses" className="scroll-mt-32 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-slate-900">Saved addresses</h2>
                        <p className="mt-1 text-xs text-slate-500">Manage where your orders are delivered.</p>
                      </div>
                      <button type="button" onClick={() => { setAddressFormOpen((open) => !open); setAddressError(""); }} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-dark"><Plus className="h-3.5 w-3.5" />Add address</button>
                    </div>
                    {(addressMessage || addressError) && <p role="status" className={`mt-4 rounded-lg p-3 text-xs ${addressError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{addressError || addressMessage}</p>}
                    {addressFormOpen && (
                      <form onSubmit={saveAddress} className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                        <label className="text-xs font-semibold text-slate-600">Label<input required value={addressForm.label} onChange={updateAddress("label")} placeholder="Home or Work" className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label>
                        <label className="text-xs font-semibold text-slate-600">Full name<input required value={addressForm.name} onChange={updateAddress("name")} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label>
                        <label className="text-xs font-semibold text-slate-600">Phone<input required pattern="[0-9]{10}" value={addressForm.phone} onChange={updateAddress("phone")} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label>
                        <label className="text-xs font-semibold text-slate-600">City<input required value={addressForm.city} onChange={updateAddress("city")} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label>
                        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Address<input required value={addressForm.address} onChange={updateAddress("address")} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label>
                        <label className="text-xs font-semibold text-slate-600">PIN code<input required pattern="[0-9]{6}" value={addressForm.pincode} onChange={updateAddress("pincode")} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label>
                        <label className="flex items-center gap-2 self-end pb-2 text-xs font-medium text-slate-600"><input type="checkbox" checked={addressForm.isDefault} onChange={updateAddress("isDefault")} className="h-4 w-4 accent-emerald-700" />Make default</label>
                        <button type="submit" className="h-10 rounded-lg bg-primary text-sm font-semibold text-white hover:bg-primary-dark sm:col-span-2">Save address</button>
                      </form>
                    )}
                    <div className="mt-4 space-y-3">
                      {addresses.length ? addresses.map((address) => (
                        <div key={address._id} className="rounded-lg border border-slate-200 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-800">{address.label}</p>{address.isDefault && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">Default</span>}</div>
                              <p className="mt-1 text-xs text-slate-500">{address.name} · {address.phone}</p>
                              <p className="mt-1 text-xs leading-5 text-slate-500">{address.address}, {address.city} - {address.pincode}</p>
                            </div>
                            <button type="button" onClick={() => deleteAddress(address._id)} aria-label={`Remove ${address.label} address`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                      )) : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No saved addresses yet.</p>}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-slate-900">Support requests</h2>
                        <p className="mt-1 text-xs text-slate-500">Updates from our customer care team.</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{supportTickets.length}</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {supportTickets.length ? supportTickets.slice(0, 4).map((ticket) => (
                        <article key={ticket._id} className="rounded-lg border border-slate-200 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-800">{ticket.subject}</p>
                            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${normalizeStatus(ticket.status) === "open" ? "bg-amber-50 text-amber-700" : normalizeStatus(ticket.status) === "in_progress" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>{formatStatus(ticket.status)}</span>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                          {ticket.adminReply && <p className="mt-2 rounded-md bg-slate-50 p-2 text-xs text-slate-600">{ticket.adminReply}</p>}
                        </article>
                      )) : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No support requests yet.</p>}
                    </div>
                    <Link to="/contact" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark">Contact support <ChevronRight className="h-4 w-4" /></Link>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f2f6f3] px-3 py-6 sm:px-6 sm:py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(16,185,129,0.13),transparent_28%),radial-gradient(circle_at_90%_82%,rgba(14,116,144,0.10),transparent_30%)]" />
        <div className="relative mx-auto grid w-full max-w-[1440px] overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_32px_100px_-38px_rgba(15,55,43,0.4)] lg:min-h-[760px] lg:grid-cols-[1.08fr_0.92fr]">
          <section className="relative order-1 flex min-h-[280px] overflow-hidden bg-slate-100 lg:min-h-[760px]">
            <img src={authImage} alt="Healthcare professional holding essential medicines" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#063d34]/75 via-[#063d34]/35 to-[#062d2c]/90" />
            <div className="pointer-events-none absolute -right-24 top-20 h-80 w-80 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-10 top-36 h-52 w-52 rounded-full border border-white/10" />
            <div className="relative flex w-full flex-col justify-between p-6 text-white sm:p-9 lg:p-11">
              <Link to="/" aria-label="Go to home" className="flex w-fit items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-xl font-bold text-primary shadow-sm">
                  {store.logoUrl ? <img src={store.logoUrl} alt="" className="h-full w-full object-contain" /> : "+"}
                </span>
                <span><span className="block text-sm font-bold">{store.name}</span><span className="block text-[11px] text-white/70">Your care, made simpler</span></span>
              </Link>
              <div className="max-w-lg py-5 lg:pb-8">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-emerald-50 backdrop-blur-sm"><ShieldCheck className="h-3.5 w-3.5" />Trusted essentials, delivered</span>
                <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl lg:text-[2.8rem]">Good health starts with a simpler shop.</h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-white/80 sm:text-base">Shop trusted wellness essentials, keep track of every order, and get back to what matters.</p>
                <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-white/90">
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-2">Easy reordering</span>
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-2">Order updates</span>
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-2">Secure account</span>
                </div>
              </div>
              <p className="hidden text-xs text-white/60 lg:block">A convenient way to care for yourself and your family.</p>
            </div>
            <div className="absolute bottom-8 right-8 hidden w-56 rounded-2xl border border-white/20 bg-white/10 p-4 text-white shadow-xl backdrop-blur-md lg:block">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15"><Package className="h-5 w-5" /></span>
                <div><p className="text-xs font-bold">Your account, in one place</p><p className="mt-1 text-[10px] text-white/70">Orders · addresses · support</p></div>
              </div>
            </div>
          </section>

          <section className="order-2 flex min-w-0 flex-col justify-center bg-white px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12">
            <div className="mb-8 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-400">Customer portal</p>
              <Link to="/" className="shrink-0 rounded-full px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-primary">Back to store <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link>
            </div>
            {!checkingSession && !currentUser && <div className="flex rounded-xl bg-slate-100 p-1">
              <div className="grid w-full grid-cols-2">{[["login", "Sign in"], ["signup", "Create account"]].map(([value, label]) => (
                <button key={value} type="button" onClick={() => { setMode(value); setSubmitted(false); setForgotOpen(false); }} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${mode === value ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                  {label}
                </button>
              ))}</div>
            </div>}
            <div className="mx-auto max-w-md pt-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{mode === "login" ? "Welcome back" : "Join the community"}</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{currentUser ? "Your account" : mode === "login" ? "Sign in to your account" : "Create your account"}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{currentUser ? "Manage your orders and saved products." : mode === "login" ? "Pick up where you left off and keep your orders close." : "A few details to make shopping easier."}</p>
              {checkingSession ? <div className="mt-8 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-500"><span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />Checking your account...</div> : currentUser ? (
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
                    <button type="button" onClick={() => navigate("/wishlist")} className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-left transition hover:border-primary hover:bg-white">
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
                    {addressFormOpen && <form onSubmit={saveAddress} className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Label<input required value={addressForm.label} onChange={updateAddress("label")} placeholder="Home or Work" className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label><label className="text-xs font-semibold text-slate-600">Full name<input required value={addressForm.name} onChange={updateAddress("name")} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label><label className="text-xs font-semibold text-slate-600">Phone<input required pattern="[0-9]{10}" value={addressForm.phone} onChange={updateAddress("phone")} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label><label className="text-xs font-semibold text-slate-600">City<input required value={addressForm.city} onChange={updateAddress("city")} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Address<input required value={addressForm.address} onChange={updateAddress("address")} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label><label className="text-xs font-semibold text-slate-600">PIN code<input required pattern="[0-9]{6}" value={addressForm.pincode} onChange={updateAddress("pincode")} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-primary" /></label><label className="flex items-center gap-2 self-end pb-2 text-xs font-medium text-slate-600"><input type="checkbox" checked={addressForm.isDefault} onChange={updateAddress("isDefault")} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />Set as default</label><div className="sm:col-span-2 flex justify-end gap-2 pt-2"><button type="button" onClick={() => setAddressFormOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300">Cancel</button><button type="submit" className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-dark">Save address</button></div></form>}
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
                <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                  {mode === "signup" && <>
                    <label className="block text-sm font-semibold text-slate-700">Full name<input required autoComplete="name" value={formData.name} onChange={updateField("name")} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-emerald-50" placeholder="Your name" /></label>
                    <fieldset>
                      <legend className="text-sm font-semibold text-slate-700">Account type</legend>
                      <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                        {["B2C", "B2B"].map((type) => (
                          <button key={type} type="button" aria-pressed={formData.customerType === type} onClick={() => setFormData((current) => ({ ...current, customerType: type }))} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${formData.customerType === type ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                            {type === "B2C" ? "Personal" : "Business"}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    {formData.customerType === "B2B" && <>
                      <label className="block text-sm font-semibold text-slate-700">Business name<input required minLength={2} maxLength={120} value={formData.businessName} onChange={updateField("businessName")} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-emerald-50" placeholder="Registered business name" /></label>
                      <label className="block text-sm font-semibold text-slate-700">GSTIN <span className="font-normal text-slate-400">(optional)</span><input maxLength={15} value={formData.gstin} onChange={updateField("gstin")} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 text-sm uppercase outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-emerald-50" placeholder="15-character GSTIN" /></label>
                    </>}
                  </>}
                  <label className="block text-sm font-semibold text-slate-700">Email address<input required autoComplete="email" value={formData.email} onChange={(event) => { updateField("email")(event); if (mode === "signup") { setOtpSent(false); setOtpCode(""); setDevelopmentOtp(""); } }} type="email" className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-emerald-50" placeholder="you@example.com" /></label>
                  <label className="block text-sm font-semibold text-slate-700">Password<input required autoComplete={mode === "login" ? "current-password" : "new-password"} value={formData.password} onChange={updateField("password")} minLength={8} type="password" className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-emerald-50" placeholder="At least 8 characters" /></label>
                  {mode === "signup" && otpSent && <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <label htmlFor="signup-otp" className="block text-sm font-semibold text-slate-800">Email verification code</label>
                    <p className="mt-1 text-xs text-slate-600">Enter the six-digit code sent to {formData.email}. It expires in 10 minutes.</p>
                    <input id="signup-otp" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-3 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-center text-xl font-bold tracking-[0.4em] outline-none focus:border-primary" placeholder="000000" />
                    {developmentOtp && <p className="mt-2 text-xs font-medium text-amber-800">Development code: {developmentOtp}</p>}
                    <div className="mt-3 flex justify-end"><button type="button" disabled={loading} onClick={requestSignupOtp} className="text-xs font-semibold text-primary hover:underline disabled:opacity-50">{loading ? "Sending..." : "Resend code"}</button></div>
                  </div>}
                  {mode === "login" && <div className="flex justify-end"><button type="button" onClick={() => { setForgotEmail(formData.email); setForgotOpen((open) => !open); setForgotMessage(""); setForgotError(""); }} className="text-sm font-medium text-primary hover:text-primary-dark">Forgot password?</button></div>}
                  {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm text-red-700">{error}</p>}
                  <button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60" type="submit">{loading ? "Please wait..." : mode === "login" ? "Sign in" : otpSent ? "Verify code & create account" : "Send verification code"}<ArrowRight className="h-4 w-4" /></button>
                  <p className="text-center text-sm text-slate-500">{mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}<Link to={mode === "login" ? "/customer/register" : "/customer/login"} className="font-bold text-primary hover:text-primary-dark">{mode === "login" ? "Create account" : "Sign in"}</Link></p>
                  {mode === "login" && <p className="border-t border-slate-100 pt-4 text-center text-sm text-slate-500">Store staff? <Link to="/admin/login" className="font-bold text-primary hover:text-primary-dark">Admin sign in</Link></p>}
                </form>
              )}
              {mode === "login" && forgotOpen && !checkingSession && !currentUser && <form onSubmit={requestPasswordReset} className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-slate-900">Reset your password</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">Enter your account email and we&apos;ll send a secure reset link if an account matches.</p>
                <label className="mt-4 block text-sm font-medium text-slate-700">Email address<input required type="email" autoComplete="email" value={forgotEmail} onChange={(event) => setForgotEmail(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-primary" placeholder="you@example.com" /></label>
                {forgotError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{forgotError}</p>}
                {forgotMessage && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{forgotMessage}{developmentResetUrl && <a href={developmentResetUrl} className="mt-2 block break-all font-semibold underline">Open development reset link</a>}</p>}
                <div className="mt-4 flex justify-end"><button type="submit" disabled={forgotLoading} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">{forgotLoading ? "Sending..." : "Send reset link"}</button></div>
              </form>}
            </div>
          </section>
        </div>
      </main>
      {storePickerOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="store-picker-title" className="max-h-[min(90vh,48rem)] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-primary"><Store className="h-5 w-5" /></span>
              <div>
                <h2 id="store-picker-title" className="text-lg font-bold text-slate-900">Choose your store location</h2>
                <p className="mt-1 text-sm text-slate-500">Select the branch for your business account and orders.</p>
              </div>
            </div>
            {storePickerLoading ? (
              <p className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Loading store locations...</p>
            ) : storePickerError ? (
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p role="status" className="text-sm text-amber-800">{storePickerError}</p>
                <button type="button" onClick={loadStoreLocations} className="mt-3 text-sm font-semibold text-primary hover:underline">Try again</button>
              </div>
            ) : (
              <div className="mt-6 space-y-2">
                {stores.map((location) => (
                  <button key={location._id} type="button" aria-pressed={selectedStoreId === location._id} onClick={() => setSelectedStoreId(location._id)} className={`flex w-full items-start justify-between gap-3 rounded-xl border p-4 text-left transition ${selectedStoreId === location._id ? "border-primary bg-emerald-50/60" : "border-slate-200 hover:border-primary/50"}`}>
                    <span className="flex min-w-0 items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-900">{location.name}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">{location.address}, {location.city}{location.pincode ? ` · ${location.pincode}` : ""}</span>
                      </span>
                    </span>
                    {selectedStoreId === location._id && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
              <button type="button" onClick={confirmStoreLocation} disabled={storePickerLoading || Boolean(storePickerError) || !stores.some((location) => location._id === selectedStoreId)} className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        </div>
      )}
      {currentUser && <Footer />}
    </>
  );
};

export default Account;
