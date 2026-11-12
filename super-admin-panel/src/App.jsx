import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  CreditCard,
  Download,
  Ellipsis,
  Eye,
  FileClock,
  Filter,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Store,
  TrendingUp,
  UserPlus,
  Users,
  WalletCards,
  X,
  XCircle,
  Zap,
  Inbox,
} from "lucide-react";
import { navItems } from "./data.js";
import ClientDetailsModule from "./ClientDetailsModule.jsx";

const API_URL = import.meta.env.VITE_API_URL || "";

const iconMap = {
  LayoutDashboard,
  Building2,
  Inbox,
  CreditCard,
  KeyRound,
  WalletCards,
  Store,
};

const currency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const shortDate = (date) => {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`));
};

const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }
  if (!response.ok) throw new Error(result.message || "The request could not be completed.");
  return result;
};

const nextBillingPeriod = (date, billingInterval = "yearly") => {
  const start = new Date(`${date}T00:00:00.000Z`);
  const monthOffset = billingInterval === "monthly" ? 1 : 12;
  const target = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + monthOffset, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(start.getUTCDate(), lastDay));
  return target.toISOString().slice(0, 10);
};

function App() {
  const [clients, setClients] = useState([]);
  const [requests, setRequests] = useState([]);
  const [plans, setPlans] = useState([]);
  const [businessSegments, setBusinessSegments] = useState([]);
  const [activePage, setActivePage] = useState("overview");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All status");
  const [selectedClient, setSelectedClient] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authState, setAuthState] = useState("checking");
  const [superAdmin, setSuperAdmin] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loadingClients, setLoadingClients] = useState(false);

  const refreshSubscriptions = async () => {
    setLoadingClients(true);
    try {
      const result = await apiRequest("/api/super-admin/subscriptions");
      setClients(result.data);
    } finally {
      setLoadingClients(false);
    }
  };

  const refreshRequests = async () => {
    const result = await apiRequest("/api/super-admin/requests");
    setRequests(result.data);
  };

  const refreshPlans = async () => {
    const result = await apiRequest("/api/super-admin/plans");
    setPlans(result.data);
  };

  const refreshBusinessSegments = async () => {
    const result = await apiRequest("/api/super-admin/business-segments");
    setBusinessSegments(result.data);
  };

  useEffect(() => {
    let active = true;
    apiRequest("/api/super-admin/me")
      .then(async (result) => {
        if (!active) return;
        setSuperAdmin(result.user);
        setAuthState("authorized");
        try {
          await Promise.all([refreshSubscriptions(), refreshRequests(), refreshPlans(), refreshBusinessSegments()]);
        } catch (error) {
          if (active) notify(error.message);
        }
      })
      .catch(() => {
        if (active) setAuthState("signed-out");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const pendingRequests = requests.filter((request) => request.status === "Pending");
  const collected = clients.reduce((sum, client) => sum + client.paid, 0);
  const pending = clients.reduce((sum, client) => sum + Math.max(client.amount - client.paid, 0), 0);
  const activeCount = clients.filter((client) => client.status === "Active").length;
  const expiringClients = clients.filter((client) => {
    if (!client.validTill || client.status !== "Active") return false;
    const daysLeft = (new Date(`${client.validTill}T00:00:00`) - new Date()) / 86400000;
    return daysLeft >= 0 && daysLeft <= 45;
  });

  const visibleClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesQuery =
        !normalizedQuery ||
        [client.business, client.name, client.email, client.registrationNumber]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      const matchesStatus = statusFilter === "All status" || client.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [clients, query, statusFilter]);

  const notify = (message) => setToast(message);

  const signIn = async (event) => {
    event.preventDefault();
    setAuthError("");
    try {
      const result = await apiRequest("/api/super-admin/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      setSuperAdmin(result.user);
      setLoginPassword("");
      setAuthState("authorized");
      try {
        await Promise.all([refreshSubscriptions(), refreshRequests(), refreshPlans(), refreshBusinessSegments()]);
      } catch (error) {
        notify(error.message);
      }
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const signOut = async () => {
    try {
      await apiRequest("/api/super-admin/logout", { method: "POST" });
    } catch (error) {
      notify(error.message);
    } finally {
      setSuperAdmin(null);
      setAuthState("signed-out");
    }
  };

  const updateClient = async (client, status) => {
    const result = await apiRequest(`/api/super-admin/subscriptions/${client.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setClients((current) => current.map((item) => item.id === client.id ? result.data : item));
    setSelectedClient(result.data);
    notify(`License ${status.toLowerCase()}.`);
  };

  const saveClientDetails = async (client, values) => {
    try {
      const result = await apiRequest(`/api/super-admin/subscriptions/${client.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...values,
          amount: Number(values.amount),
          paid: Number(values.paid),
        }),
      });
      setClients((current) => current.map((item) => item.id === client.id ? result.data : item));
      setSelectedClient(result.data);
      setDialog(null);
      notify(result.message);
    } catch (error) {
      notify(error.message);
    }
  };

  const approveRequest = async (request, amount, paid = 0) => {
    try {
      const result = request.id
        ? await apiRequest(`/api/super-admin/requests/${request.id}/approve`, {
          method: "POST",
          body: JSON.stringify({ amount: Number(amount), paidNow: Number(paid) }),
        })
        : await apiRequest("/api/super-admin/subscriptions", {
          method: "POST",
          body: JSON.stringify({
            name: request.name,
            business: request.business,
            email: request.email,
            phone: request.phone,
            amount: Number(amount),
            paid: Number(paid),
            plan: request.plan || "Annual",
          }),
        });
      await Promise.all([refreshSubscriptions(), refreshRequests()]);
      setDialog(null);
      setSelectedClient(result.data);
      notify(result.message);
    } catch (error) {
      notify(error.message);
    }
  };

  const decideRequest = async (request, status) => {
    if (status === "Approved") {
      setDialog({ type: "approve", request, amount: request.planPrice ?? "" });
      return;
    }
    try {
      const result = await apiRequest(`/api/super-admin/requests/${request.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await refreshRequests();
      notify(result.message);
    } catch (error) {
      notify(error.message);
    }
  };

  const savePlan = async (planId, values) => {
    try {
      await apiRequest(planId ? `/api/super-admin/plans/${planId}` : "/api/super-admin/plans", {
        method: planId ? "PATCH" : "POST",
        body: JSON.stringify(values),
      });
      await refreshPlans();
      notify(planId ? "Subscription plan updated." : "Subscription plan created.");
      return true;
    } catch (error) {
      notify(error.message);
      return false;
    }
  };

  const togglePlan = async (plan) => {
    try {
      await apiRequest(`/api/super-admin/plans/${plan.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !plan.active }),
      });
      await refreshPlans();
      notify(`Plan ${plan.active ? "deactivated" : "activated"}.`);
    } catch (error) {
      notify(error.message);
    }
  };

  const saveBusinessSegment = async (segmentId, values) => {
    try {
      await apiRequest(segmentId ? `/api/super-admin/business-segments/${segmentId}` : "/api/super-admin/business-segments", {
        method: segmentId ? "PATCH" : "POST",
        body: JSON.stringify(values),
      });
      await refreshBusinessSegments();
      notify(segmentId ? "Business segment updated." : "Business segment created.");
      return true;
    } catch (error) {
      notify(error.message);
      return false;
    }
  };

  const toggleBusinessSegment = async (segment) => {
    try {
      await apiRequest(`/api/super-admin/business-segments/${segment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !segment.enabled }),
      });
      await refreshBusinessSegments();
      notify(`Business segment ${segment.enabled ? "disabled" : "enabled"}.`);
    } catch (error) {
      notify(error.message);
    }
  };

  const renewLicense = async (client, amount, paidNow) => {
    try {
      const result = await apiRequest(`/api/super-admin/subscriptions/${client.id}/renew`, {
        method: "POST",
        body: JSON.stringify({ amount: Number(amount), paidNow: Number(paidNow) }),
      });
      setClients((current) => current.map((item) => item.id === client.id ? result.data : item));
      setSelectedClient(result.data);
      setDialog(null);
      notify(`License renewed through ${shortDate(result.data.validTill)}.`);
    } catch (error) {
      notify(error.message);
    }
  };

  const rotateLicenseKey = async (client) => {
    if (!window.confirm(`Reissue the license key for ${client.business}? The current key will stop working immediately.`)) return;
    try {
      const result = await apiRequest(`/api/super-admin/subscriptions/${client.id}/rotate-key`, { method: "POST" });
      setClients((current) => current.map((item) => item.id === client.id ? result.data : item));
      setSelectedClient(result.data);
      notify(result.message);
    } catch (error) {
      notify(error.message);
    }
  };

  const switchPage = (page) => {
    setActivePage(page);
    setQuery("");
    setSidebarOpen(false);
  };

  const openClient = (client) => {
    setSelectedClient(client);
    setActivePage("client-details");
    setSidebarOpen(false);
  };

  const closeClientDetails = () => {
    setSelectedClient(null);
    setActivePage("clients");
  };

  if (authState === "checking") {
    return <main className="login-page"><p>Checking super-admin access...</p></main>;
  }

  if (authState !== "authorized") {
    return (
      <main className="login-page">
        <form className="login-card" onSubmit={signIn}>
          <div className="eyebrow">E-CART PLATFORM</div>
          <h1>Super Admin sign in</h1>
          <p>Sign in with the super-admin account provisioned on the API.</p>
          {authError && <p role="alert" className="login-error">{authError}</p>}
          <label>Email<input required type="email" autoComplete="username" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} /></label>
          <label>Password<input required type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} /></label>
          <button className="button button-primary" type="submit">Sign in</button>
        </form>
      </main>
    );
  }

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-symbol"><span>e</span></div>
          <div><strong>e-cart</strong><small>PLATFORM ADMIN</small></div>
          <button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>
        <div className="workspace-switcher">
          <div className="workspace-icon"><ShieldCheck size={16} /></div>
          <span><strong>Super Admin</strong><small>Platform workspace</small></span>
          <ChevronDown size={15} />
        </div>
        <p className="nav-caption">WORKSPACE</p>
        <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map(({ id, label, icon: IconName }) => {
            const Icon = iconMap[IconName];
            return (
              <button key={id} className={`nav-item ${activePage === id ? "nav-item-active" : ""}`} onClick={() => switchPage(id)}>
                <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
                {id === "requests" && pendingRequests.length > 0 && <span className="nav-count">{pendingRequests.length}</span>}
              </button>
            );
          })}
        </nav>
        <p className="nav-caption nav-caption-lower">PREFERENCES</p>
        <nav className="primary-nav" aria-label="Preferences">
          <button className="nav-item" onClick={() => notify("Platform settings are not configured.")}><Settings size={18} strokeWidth={1.8} /><span>Settings</span></button>
          <button className="nav-item" onClick={() => notify("Help center is not configured.")}><CircleHelp size={18} strokeWidth={1.8} /><span>Help center</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon"><Zap size={16} fill="currentColor" /></div>
            <strong>Platform overview</strong>
            <p>Manage every client and license from one place.</p>
            <button onClick={() => switchPage("subscriptions")}>View subscriptions <ArrowRight size={14} /></button>
          </div>
          <button className="profile-button" onClick={signOut}>
            <div className="avatar avatar-purple">{superAdmin?.name?.slice(0, 2).toUpperCase() || "SA"}</div>
            <span><strong>{superAdmin?.name || "Super Admin"}</strong><small>Super Administrator · Sign out</small></span>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{activePage === "client-details" ? "Client Details" : navItems.find((item) => item.id === activePage)?.label}</strong></div>
          <div className="topbar-actions">
            <div className="system-status"><span /> API connected</div>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => notify(`${pendingRequests.length} registration requests need review.`)}>
              <Bell size={18} />{pendingRequests.length > 0 && <i />}
            </button>
            <div className="avatar avatar-purple top-avatar">{superAdmin?.name?.slice(0, 2).toUpperCase() || "SA"}</div>
          </div>
        </header>

        <div className="page-content">
          {loadingClients && <div className="prototype-notice"><Activity size={15} /><span>Loading subscription records from the server...</span></div>}
          {activePage === "overview" && (
            <Overview
              clients={clients}
              pendingRequests={pendingRequests}
              activeCount={activeCount}
              collected={collected}
              pending={pending}
              expiringClients={expiringClients}
              switchPage={switchPage}
              openClient={openClient}
              decideRequest={decideRequest}
              onAdd={() => setDialog({ type: "new-request" })}
            />
          )}
          {activePage === "clients" && (
            <ClientsPage clients={visibleClients} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} openClient={openClient} onAdd={() => setDialog({ type: "new-request" })} />
          )}
          {activePage === "client-records" && (
            <ClientDetailsModule
              clients={clients}
              onView={openClient}
              onEdit={(client) => setDialog({ type: "edit-client", client })}
            />
          )}
          {activePage === "business-segments" && (
            <BusinessSegmentsPage segments={businessSegments} saveSegment={saveBusinessSegment} toggleSegment={toggleBusinessSegment} />
          )}
          {activePage === "requests" && (
            <RequestsPage requests={requests} decideRequest={decideRequest} />
          )}
          {activePage === "plans" && (
            <PlansPage plans={plans} savePlan={savePlan} togglePlan={togglePlan} />
          )}
          {activePage === "subscriptions" && (
            <SubscriptionsPage clients={clients} openClient={openClient} onRenew={(client) => setDialog({ type: "renew", client })} />
          )}
          {activePage === "payments" && (
            <PaymentsPage clients={clients} openClient={openClient} />
          )}
          {activePage === "client-details" && selectedClient && (
            <ClientDetailsPage
              client={{ ...(clients.find((client) => client.id === selectedClient.id) || selectedClient), ...(selectedClient.licenseKey ? { licenseKey: selectedClient.licenseKey } : {}) }}
              onBack={closeClientDetails}
              onStatusChange={(client) => updateClient(client, client.status === "Suspended" ? "Active" : "Suspended")}
              onRenew={(client) => setDialog({ type: "renew", client })}
              onEdit={(client) => setDialog({ type: "edit-client", client })}
              onRotateKey={rotateLicenseKey}
              onCopy={(value) => {
                if (!navigator.clipboard) return notify("Clipboard access is unavailable.");
                navigator.clipboard.writeText(value).then(() => notify("Copied to clipboard.")).catch(() => notify("Clipboard access is unavailable."));
              }}
            />
          )}
        </div>
      </main>

      {dialog && (
        <Dialog
          dialog={dialog}
          close={() => setDialog(null)}
          approveRequest={approveRequest}
          renewLicense={renewLicense}
          saveClientDetails={saveClientDetails}
          createRequest={(values) => approveRequest({
            name: values.name,
            business: values.business,
            email: values.email,
            phone: values.phone,
          }, values.proposedAmount, values.paid)}
        />
      )}
      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}<button aria-label="Dismiss notification" onClick={() => setToast("")}><X size={15} /></button></div>}
    </div>
  );
}

function PageHeading({ eyebrow, title, description, actions }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  );
}

function Overview({ clients, pendingRequests, activeCount, collected, pending, expiringClients, switchPage, openClient, decideRequest, onAdd }) {
  const statCards = [
    { title: "Total clients", value: clients.length, caption: "Registered in the database", icon: Users, tone: "blue" },
    { title: "Active licenses", value: activeCount, caption: "Currently valid and active", icon: ShieldCheck, tone: "green" },
    { title: "Revenue collected", value: currency(collected), caption: "Payments recorded", icon: CreditCard, tone: "violet" },
    { title: "Pending payments", value: currency(pending), caption: "Outstanding client balances", icon: Clock3, tone: "amber" },
  ];
  return (
    <>
      <PageHeading eyebrow={new Intl.DateTimeFormat("en-IN", { dateStyle: "full" }).format(new Date()).toUpperCase()} title="Platform overview" description="Subscription and payment totals from the connected database." actions={<><button className="button button-secondary" onClick={() => window.print()}><Download size={16} /> Export report</button><button className="button button-primary" onClick={onAdd}><Plus size={17} /> Add client</button></>} />
      <div className="stats-grid">
        {statCards.map(({ title, value, caption, icon: Icon, tone }) => (
          <article className="stat-card" key={title}>
            <div className="stat-top"><span>{title}</span><div className={`stat-icon ${tone}`}><Icon size={18} /></div></div>
            <strong className="stat-value">{value}</strong>
            <div className="stat-caption"><span>{caption}</span></div>
          </article>
        ))}
      </div>

      <div className="overview-grid">
        <section className="panel revenue-panel">
          <div className="panel-header"><div><h2>Revenue overview</h2><p>Subscription revenue collected over time</p></div><button className="select-button" onClick={() => {}}><CalendarDays size={14} /> Last 7 months <ChevronDown size={14} /></button></div>
          <div className="chart-legend"><span><i className="legend-dot legend-revenue" /> Collected</span></div>
          <RevenueChart clients={clients} />
        </section>
        <section className="panel requests-panel">
          <div className="panel-header"><div><h2>Subscription requests</h2><p>Customer admins waiting for license approval</p></div><button className="text-link" onClick={() => switchPage("requests")}>View requests <ArrowRight size={14} /></button></div>
          {pendingRequests.length === 0 ? <EmptyState title="No pending requests" text="New customer subscription requests will appear here." /> : (
            <div className="mini-request-list">
              {pendingRequests.slice(0, 3).map((request) => (
                <div className="mini-request" key={request.id}>
                  <div className="avatar avatar-tone">{request.business.slice(0, 1)}</div>
                  <div className="mini-request-info"><strong>{request.business}</strong><span>{request.name} · {shortDate(request.requestedAt)}</span></div>
                  <button className="mini-more" title="Review request" onClick={() => switchPage("requests")}><Ellipsis size={19} /></button>
                </div>
              ))}
            </div>
          )}
          <button className="panel-footer-link" onClick={() => switchPage("requests")}>Review all requests <ArrowRight size={14} /></button>
        </section>
      </div>

      <div className="overview-grid lower-grid">
        <section className="panel clients-panel">
          <div className="panel-header"><div><h2>Recent clients</h2><p>Your latest client accounts</p></div><button className="text-link" onClick={() => switchPage("clients")}>View all clients <ArrowRight size={14} /></button></div>
          <ClientTable clients={clients.slice(0, 5)} openClient={openClient} compact />
        </section>
        <section className="panel expiring-panel">
          <div className="panel-header"><div><h2>License watch</h2><p>Accounts that may need your attention</p></div><span className="panel-icon amber-icon"><FileClock size={17} /></span></div>
          {expiringClients.length === 0 ? <EmptyState title="No upcoming expirations" text="You're all set for the next 45 days." /> : expiringClients.map((client) => (
            <button className="expiring-client" key={client.id} onClick={() => openClient(client)}>
              <div className="avatar avatar-tone">{client.business.slice(0, 1)}</div>
              <span><strong>{client.business}</strong><small>Expires {shortDate(client.validTill)}</small></span>
              <span className="days-left">{Math.ceil((new Date(`${client.validTill}T00:00:00`) - new Date()) / 86400000)} days</span>
            </button>
          ))}
          <button className="panel-footer-link" onClick={() => switchPage("subscriptions")}>Manage subscriptions <ArrowRight size={14} /></button>
        </section>
      </div>
    </>
  );
}

function RevenueChart({ clients }) {
  const now = new Date();
  const bars = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 6 + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const amount = clients.flatMap((client) => client.history || [])
      .filter((entry) => entry.date.startsWith(key))
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    return { month: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(date), amount };
  });
  const maxAmount = Math.max(...bars.map((bar) => bar.amount), 1);
  return (
    <div className="chart-wrap">
      <div className="chart-y-labels"><span>{currency(maxAmount)}</span><span>{currency(maxAmount * 0.75)}</span><span>{currency(maxAmount * 0.5)}</span><span>{currency(maxAmount * 0.25)}</span><span>{currency(0)}</span></div>
      <div className="chart-main">
        <div className="chart-grid-lines"><i /><i /><i /><i /><i /></div>
        <div className="bar-row">
          {bars.map((bar) => (
            <div className="bar-group" key={bar.month}>
              <div className="bar-stack" style={{ height: `${bar.amount ? Math.max((bar.amount / maxAmount) * 100, 2) : 0}%` }} title={`${bar.month}: ${currency(bar.amount)} collected`}>
                <i className="bar-pending" style={{ height: "0%" }} />
                <i className="bar-collected" style={{ height: "100%" }} />
              </div>
              <span>{bar.month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClientsPage({ clients, query, setQuery, statusFilter, setStatusFilter, openClient, onAdd }) {
  return (
    <>
      <PageHeading eyebrow="CLIENT MANAGEMENT" title="Clients" description="Manage your platform clients, license details, and account status." actions={<button className="button button-primary" onClick={onAdd}><UserPlus size={16} /> Add client</button>} />
      <section className="panel data-panel">
        <div className="list-toolbar"><div><h2>All clients <span className="table-count">{clients.length}</span></h2><p>A complete list of your client accounts.</p></div><div className="toolbar-actions"><label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clients..." /></label><label className="filter-select"><Filter size={15} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All status</option><option>Active</option><option>Pending</option><option>Suspended</option><option>Expired</option></select><ChevronDown size={14} /></label></div></div>
        <ClientTable clients={clients} openClient={openClient} />
        <Pagination label={`${clients.length} client${clients.length === 1 ? "" : "s"}`} />
      </section>
    </>
  );
}

function ClientTable({ clients, openClient, compact = false }) {
  if (clients.length === 0) return <EmptyState title="No clients found" text="Try changing your search or filters." />;
  return (
    <div className={`table-scroll ${compact ? "compact-table" : ""}`}>
      <table className="data-table">
        <thead><tr><th>CLIENT</th><th>REGISTRATION NO.</th><th>LICENSE STATUS</th><th>VALID UNTIL</th><th>PAYMENT</th><th /></tr></thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} onClick={() => openClient(client)} className="clickable-row">
              <td><div className="client-cell"><div className={`avatar ${avatarColor(client.business)}`}>{client.business.slice(0, 1)}</div><span><strong>{client.business}</strong><small>{client.name} · {client.email}</small></span></div></td>
              <td className="mono">{client.registrationNumber || <span className="muted-cell">Not issued</span>}</td>
              <td><StatusBadge status={client.status} /></td>
              <td className="date-cell">{client.validTill ? shortDate(client.validTill) : "—"}</td>
              <td><div className="payment-cell"><span>{currency(client.paid)} <small>of {currency(client.amount)}</small></span><PaymentBadge status={client.paymentStatus} /></div></td>
              <td><button className="client-details-button" aria-label={`View details for ${client.business}`} onClick={(event) => { event.stopPropagation(); openClient(client); }}><Eye size={15} /><span>View details</span></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RequestsPage({ requests, decideRequest }) {
  const [filter, setFilter] = useState("Pending");
  const filtered = requests.filter((request) => filter === "All" || request.status === filter);
  return (
    <>
      <PageHeading eyebrow="ONBOARDING" title="Subscription requests" description="Review customer subscription requests and issue a license when approved." actions={<span className="pending-summary"><span />{requests.filter((request) => request.status === "Pending").length} awaiting review</span>} />
      <section className="panel data-panel">
        <div className="list-toolbar"><div><h2>All requests <span className="table-count">{filtered.length}</span></h2><p>Approving a request creates a subscription and generates a one-time license key.</p></div><div className="toolbar-actions"><label className="filter-select"><Filter size={15} /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>Pending</option><option>Processing</option><option>Approved</option><option>Rejected</option><option>All</option></select><ChevronDown size={14} /></label></div></div>
        {filtered.length === 0 ? <EmptyState title="No requests in this view" text="New registration requests will appear here." /> : <div className="request-cards">
          {filtered.map((request) => (
            <article className="request-card" key={request.id}>
              <div className="request-card-main"><div className={`avatar request-avatar ${avatarColor(request.business)}`}>{request.business.slice(0, 1)}</div><div className="request-copy"><div className="request-title-line"><h3>{request.business}</h3><StatusBadge status={request.status} /></div><p>{request.name} <span>·</span> {request.plan} · {request.billingInterval || "yearly"}</p><div className="request-meta"><span><CalendarDays size={14} /> Received {shortDate(request.requestedAt)}</span><span><CreditCard size={14} /> {request.planPrice == null ? "Price to be set" : `Listed ${currency(request.planPrice)}`}</span></div>{(request.businessType || request.address) && <p className="request-registration-details">{request.businessType}{request.address ? ` · ${request.address}${request.city ? `, ${request.city}` : ""}` : ""}</p>}<p className="request-notes">{request.notes || "No additional details provided."}</p></div>{request.storeLogo && <img className="request-store-logo" src={`${API_URL}${request.storeLogo}`} alt={`${request.business} logo`} />}</div>
              <div className="request-contact"><span><small>ADMIN EMAIL</small>{request.email}</span>{request.storeEmail && <span><small>STORE EMAIL</small>{request.storeEmail}</span>}<span><small>OWNER PHONE</small>{request.ownerPhone || "—"}</span><span><small>STORE PHONE</small>{request.phone || "—"}</span></div>
              {request.status === "Pending" ? <div className="request-actions"><button className="button button-secondary button-small" onClick={() => decideRequest(request, "Rejected")}><XCircle size={15} /> Reject</button><button className="button button-success button-small" onClick={() => decideRequest(request, "Approved")}><Check size={15} /> Approve & issue license</button></div> : <div className="request-resolved"><CheckCircle2 size={16} /> Request {request.status.toLowerCase()}</div>}
            </article>
          ))}
        </div>}
      </section>
    </>
  );
}

function PlansPage({ plans, savePlan, togglePlan }) {
  const emptyForm = { name: "", description: "", billingInterval: "yearly", price: "", active: true, featured: false };
  const [form, setForm] = useState(emptyForm);
  const [editingPlanId, setEditingPlanId] = useState("");
  const [saving, setSaving] = useState(false);

  const editPlan = (plan) => {
    setEditingPlanId(plan.id);
    setForm({
      name: plan.name,
      description: plan.description || "",
      billingInterval: plan.billingInterval,
      price: String(plan.price),
      active: plan.active,
      featured: plan.featured,
    });
  };
  const cancelEdit = () => {
    setEditingPlanId("");
    setForm(emptyForm);
  };
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const saved = await savePlan(editingPlanId, { ...form, price: Number(form.price) });
    setSaving(false);
    if (saved) cancelEdit();
  };

  return (
    <>
      <PageHeading eyebrow="SUBSCRIPTION CATALOG" title="Plans" description="Create and manage the plans customer admins can request." actions={<span className="heading-note"><CreditCard size={15} /> {plans.length} plans</span>} />
      <section className="panel plan-editor">
        <div className="panel-header"><div><h2>{editingPlanId ? "Edit plan" : "Create a plan"}</h2><p>Prices are shown to customers and can be confirmed or edited when approving a request.</p></div></div>
        <form className="form-grid plan-form" onSubmit={submit}>
          <label>Plan name<input required minLength="2" maxLength="80" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Growth" /></label>
          <label>Billing interval<select required value={form.billingInterval} onChange={(event) => setForm((current) => ({ ...current, billingInterval: event.target.value }))}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>
          <label>Price (INR)<input required type="number" min="0" step="1" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} placeholder="e.g. 2500" /></label>
          <label className="plan-description-field">Description<textarea maxLength="500" rows="2" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Describe what's included in this plan." /></label>
          <label className="plan-checkbox"><input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} /> Available to customers</label>
          <label className="plan-checkbox"><input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} /> Mark as featured</label>
          <div className="plan-form-actions">
            {editingPlanId && <button type="button" className="button button-secondary" onClick={cancelEdit}>Cancel</button>}
            <button type="submit" className="button button-primary" disabled={saving}><Plus size={15} />{saving ? "Saving..." : editingPlanId ? "Save changes" : "Create plan"}</button>
          </div>
        </form>
      </section>
      <section className="panel data-panel plan-list-panel">
        <div className="list-toolbar"><div><h2>Plan catalog <span className="table-count">{plans.length}</span></h2><p>Inactive plans stay saved but are hidden from new customer requests.</p></div></div>
        {plans.length === 0 ? <EmptyState title="No plans yet" text="Create a plan above to make it available in customer admin settings." /> : (
          <div className="plan-list">
            {plans.map((plan) => (
              <article className={`plan-item ${!plan.active ? "plan-item-inactive" : ""}`} key={plan.id}>
                <div className="plan-item-content">
                  <div className="plan-item-title"><h3>{plan.name}</h3>{plan.featured && <span className="plan-featured">Featured</span>}<StatusBadge status={plan.active ? "Active" : "Inactive"} /></div>
                  <p>{plan.description || "No description provided."}</p>
                  <strong>{currency(plan.price)} <small>/ {plan.billingInterval === "monthly" ? "month" : "year"}</small></strong>
                </div>
                <div className="plan-item-actions"><button className="button button-secondary button-small" onClick={() => editPlan(plan)}>Edit</button><button className="button button-secondary button-small" onClick={() => togglePlan(plan)}>{plan.active ? "Deactivate" : "Activate"}</button></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function BusinessSegmentsPage({ segments, saveSegment, toggleSegment }) {
  const emptyForm = { name: "", code: "", description: "", baseProfile: "general", enabled: true };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const saved = await saveSegment("", { ...form, code: form.code.trim().toUpperCase() });
    setSaving(false);
    if (saved) setForm(emptyForm);
  };

  return (
    <>
      <PageHeading eyebrow="PLATFORM CONFIGURATION" title="Business segments" description="Manage the business categories available during new store registration." actions={<span className="heading-note"><Store size={15} /> {segments.length} segments</span>} />
      <section className="panel plan-editor">
        <div className="panel-header"><div><h2>Add a business segment</h2><p>New enabled segments become selectable on the public store signup form.</p></div></div>
        <form className="form-grid plan-form" onSubmit={submit}>
          <label>Segment name<input required minLength="2" maxLength="80" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Hardware" /></label>
          <label>Segment code<input required pattern="[A-Za-z][A-Za-z0-9_]{1,39}" maxLength="40" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") }))} placeholder="e.g. HARDWARE" /></label>
          <label>Storefront profile<select value={form.baseProfile} onChange={(event) => setForm((current) => ({ ...current, baseProfile: event.target.value }))}>
            <option value="general">General retail</option><option value="pharmacy">Pharmacy</option><option value="supermarket">Supermarket</option><option value="grocery">Grocery</option><option value="garments">Garments</option><option value="footwear">Footwear</option><option value="electronics">Electronics</option><option value="beauty">Beauty</option><option value="home_living">Home & living</option><option value="furniture">Furniture</option><option value="jewelry">Jewelry</option><option value="toys">Toys</option><option value="books_stationery">Books & stationery</option><option value="sports">Sports</option><option value="pet_supplies">Pet supplies</option>
          </select></label>
          <label className="plan-description-field">Description<textarea maxLength="300" rows="2" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Describe this business category." /></label>
          <label className="plan-checkbox"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} /> Available during signup</label>
          <div className="plan-form-actions"><button type="submit" className="button button-primary" disabled={saving}><Plus size={15} />{saving ? "Saving..." : "Create segment"}</button></div>
        </form>
      </section>
      <section className="panel data-panel plan-list-panel">
        <div className="list-toolbar"><div><h2>Segment catalog <span className="table-count">{segments.length}</span></h2><p>Disabling a segment hides it from new signups; existing stores remain unchanged.</p></div></div>
        {segments.length === 0 ? <EmptyState title="No business segments" text="The platform will seed its standard segments after deployment." /> : (
          <div className="plan-list">
            {segments.map((segment) => (
              <article className={`plan-item ${!segment.enabled ? "plan-item-inactive" : ""}`} key={segment.id}>
                <div className="plan-item-content">
                  <div className="plan-item-title"><h3>{segment.name}</h3><StatusBadge status={segment.enabled ? "Active" : "Inactive"} /></div>
                  <p>{segment.description || "No description provided."}</p>
                  <strong>{segment.code} <small>· {segment.segmentId} · storefront profile: {segment.baseProfile}</small></strong>
                </div>
                <div className="plan-item-actions"><button className="button button-secondary button-small" onClick={() => toggleSegment(segment)}>{segment.enabled ? "Disable" : "Enable"}</button></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function SubscriptionsPage({ clients, openClient, onRenew }) {
  const subscriptions = clients.filter((client) => client.registrationNumber);
  return (
    <>
      <PageHeading eyebrow="LICENSE CONTROL" title="Subscriptions" description="Monitor license validity, renewals, and platform access." actions={<span className="heading-note"><KeyRound size={15} /> {subscriptions.length} issued licenses</span>} />
      <section className="panel data-panel">
        <div className="list-toolbar"><div><h2>License register <span className="table-count">{subscriptions.length}</span></h2><p>Activation and validity details for each client.</p></div></div>
        <div className="table-scroll"><table className="data-table subscription-table"><thead><tr><th>CLIENT</th><th>LICENSE KEY</th><th>ACTIVATED</th><th>VALID FROM</th><th>VALID UNTIL</th><th>STATUS</th><th /></tr></thead>
          <tbody>{subscriptions.map((client) => <tr key={client.id} className="clickable-row" onClick={() => openClient(client)}><td><div className="client-cell"><div className={`avatar ${avatarColor(client.business)}`}>{client.business.slice(0, 1)}</div><span><strong>{client.business}</strong><small>{client.registrationNumber}</small></span></div></td><td className="mono license-key">••••••••••••</td><td className="date-cell">{shortDate(client.activatedAt)}</td><td className="date-cell">{shortDate(client.validFrom)}</td><td className="date-cell">{shortDate(client.validTill)}</td><td><StatusBadge status={client.status} /></td><td><button className="row-more" aria-label={`Renew ${client.business}`} onClick={(event) => { event.stopPropagation(); onRenew(client); }}><MoreHorizontal size={19} /></button></td></tr>)}</tbody>
        </table></div><Pagination label={`${subscriptions.length} licenses`} />
      </section>
    </>
  );
}

function PaymentsPage({ clients, openClient }) {
  const payments = clients.flatMap((client) => (client.history || []).map((item, index) => ({ ...item, client, id: `${client.id}-${index}` }))).sort((a, b) => b.date.localeCompare(a.date));
  const totalPaid = payments.reduce((sum, item) => sum + item.amount, 0);
  const overdue = clients.reduce((sum, client) => sum + Math.max(client.amount - client.paid, 0), 0);
  return (
    <>
      <PageHeading eyebrow="FINANCE" title="Payments" description="Track client payments, outstanding balances, and subscription history." actions={<button className="button button-secondary" onClick={() => window.print()}><Download size={16} /> Export report</button>} />
      <div className="payment-summary-grid">
        <div className="payment-summary-card"><div className="summary-icon green"><ArrowDownLeft size={17} /></div><span>Total collected</span><strong>{currency(totalPaid)}</strong><small>Recorded in client history</small></div>
        <div className="payment-summary-card"><div className="summary-icon amber"><Clock3 size={17} /></div><span>Outstanding balance</span><strong>{currency(overdue)}</strong><small>Across all client accounts</small></div>
        <div className="payment-summary-card"><div className="summary-icon blue"><CreditCard size={17} /></div><span>Payment records</span><strong>{payments.length}</strong><small>Initial payments and renewals</small></div>
      </div>
      <section className="panel data-panel payments-data-panel"><div className="list-toolbar"><div><h2>Payment history <span className="table-count">{payments.length}</span></h2><p>Client-wise subscription and renewal transactions.</p></div></div>
        {payments.length === 0 ? <EmptyState title="No payment records yet" text="Payments will appear here once they are added to client history." /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>CLIENT</th><th>DESCRIPTION</th><th>DATE</th><th>AMOUNT</th><th>STATUS</th><th /></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td><button className="client-cell table-client-button" onClick={() => openClient(payment.client)}><div className={`avatar ${avatarColor(payment.client.business)}`}>{payment.client.business.slice(0, 1)}</div><span><strong>{payment.client.business}</strong><small>{payment.client.email}</small></span></button></td><td>{payment.type}</td><td className="date-cell">{shortDate(payment.date)}</td><td className="amount-cell">{currency(payment.amount)}</td><td><PaymentBadge status={payment.status} /></td><td><button className="row-more" aria-label="Payment details" onClick={() => openClient(payment.client)}><Eye size={16} /></button></td></tr>)}</tbody></table></div>}
        <Pagination label={`${payments.length} payment records`} />
      </section>
    </>
  );
}

function ClientDetailsPage({ client, onBack, onStatusChange, onRenew, onEdit, onRotateKey, onCopy }) {
  return (
    <>
      <PageHeading
        eyebrow="CLIENT PROFILE"
        title={client.business || "Client details"}
        description="Client contact information and subscription credentials."
        actions={<button className="button button-secondary" onClick={onBack}><ArrowLeft size={16} /> Back to clients</button>}
      />
      <div className="client-details-layout">
        <section className="panel client-details-panel">
          <div className="client-details-title">
            <div className={`avatar ${avatarColor(client.business)}`}>{client.business?.slice(0, 1) || "C"}</div>
            <div><h2>{client.business || "—"}</h2><p>Company name</p></div>
            <StatusBadge status={client.status} />
          </div>
          <div className="client-details-grid">
            <DetailRow label="Client name" value={client.name || "—"} />
            <DetailRow label="Company name" value={client.business || "—"} />
            <DetailRow label="Email" value={client.email || "—"} />
            <DetailRow label="Phone" value={client.phone || "—"} />
          </div>
        </section>
        <section className="panel client-details-panel">
          <div className="client-details-section-title"><KeyRound size={17} /><h2>License details</h2></div>
          <div className="client-details-grid">
            <CredentialRow label="Registration number" value={client.registrationNumber || "Not issued"} onCopy={onCopy} />
            <CredentialRow label="License key" value={client.licenseKey || "Hidden after issuance"} onCopy={onCopy} />
            {client.tenantId && <CredentialRow label="Tenant ID" value={client.tenantId} onCopy={onCopy} />}
            <DetailRow label="Valid till" value={shortDate(client.validTill)} />
            <DetailRow label="Valid from" value={shortDate(client.validFrom)} />
            <DetailRow label="Activated on" value={shortDate(client.activatedAt)} />
          </div>
          {!client.licenseKey && <p className="client-key-note">License keys are stored as hashes and shown only once when issued. Reissue the key to generate a new one.</p>}
        </section>
      </div>
      <section className="client-details-actions">
        <button className="button button-primary" onClick={() => onEdit(client)}><Settings size={15} /> Edit details</button>
        <button className="button button-secondary" onClick={() => onRenew(client)}><FileClock size={16} /> Renew license</button>
        <button className="button button-secondary" onClick={() => onStatusChange(client)}>{client.status === "Suspended" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}{client.status === "Suspended" ? "Activate" : "Suspend"}</button>
        <button className="button button-secondary" onClick={() => onRotateKey(client)}><RefreshCw size={15} /> Reissue key</button>
      </section>
    </>
  );
}

function Dialog({ dialog, close, approveRequest, renewLicense, createRequest, saveClientDetails }) {
  const [amount, setAmount] = useState(dialog.amount ?? dialog.client?.amount ?? "");
  const [paidNow, setPaidNow] = useState(dialog.client?.paid ?? 0);
  const [form, setForm] = useState({ name: "", business: "", email: "", phone: "", proposedAmount: "", paid: "0" });
  const [clientForm, setClientForm] = useState(dialog.type === "edit-client" ? {
    name: dialog.client.name,
    business: dialog.client.business,
    phone: dialog.client.phone || "",
    plan: dialog.client.plan || "Annual",
    billingInterval: dialog.client.billingInterval || "yearly",
    amount: String(dialog.client.amount ?? 0),
    paid: String(dialog.client.paid ?? 0),
    validFrom: dialog.client.validFrom,
    validTill: dialog.client.validTill,
  } : null);
  const onChange = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const onClientChange = (event) => setClientForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submitNewRequest = (event) => {
    event.preventDefault();
    createRequest(form);
  };
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      {dialog.type === "new-request" ? (
        <form className="modal-card" onSubmit={submitNewRequest} role="dialog" aria-modal="true">
          <div className="modal-header"><div><span className="eyebrow">CLIENT ONBOARDING</span><h2>Create client subscription</h2><p>Issue a registration number and license key for the admin email entered here.</p></div><button type="button" className="icon-button" onClick={close} aria-label="Close"><X size={19} /></button></div>
          <div className="form-grid"><label>Contact name<input required minLength="2" name="name" value={form.name} onChange={onChange} placeholder="e.g. Maya Patel" /></label><label>Business name<input required minLength="2" name="business" value={form.business} onChange={onChange} placeholder="e.g. Studio Bloom" /></label><label>Email address<input required type="email" name="email" value={form.email} onChange={onChange} placeholder="Customer admin login email" /></label><label>Phone number<input required name="phone" value={form.phone} onChange={onChange} placeholder="+91 98765 43210" /></label><label>Subscription amount<input required type="number" min="0" name="proposedAmount" value={form.proposedAmount} onChange={onChange} placeholder="e.g. 45000" /></label><label>Paid now<input required type="number" min="0" max={form.proposedAmount || undefined} name="paid" value={form.paid} onChange={onChange} /></label></div>
          <div className="credential-notice"><KeyRound size={17} /><span>The license key is shown once after creation. Send both credentials to the customer admin securely.</span></div>
          <div className="modal-footer"><button type="button" className="button button-secondary" onClick={close}>Cancel</button><button className="button button-primary" type="submit"><Plus size={16} /> Create subscription</button></div>
        </form>
      ) : dialog.type === "edit-client" ? (
        <form className="modal-card" role="dialog" aria-modal="true" onSubmit={(event) => { event.preventDefault(); saveClientDetails(dialog.client, clientForm); }}>
          <div className="modal-header"><div><span className="eyebrow">CLIENT MANAGEMENT</span><h2>Edit client details</h2><p>Changes apply to this Super Admin subscription record.</p></div><button type="button" className="icon-button" onClick={close} aria-label="Close"><X size={19} /></button></div>
          <div className="form-grid">
            <label>Contact name<input required minLength="2" maxLength="80" name="name" value={clientForm.name} onChange={onClientChange} /></label>
            <label>Business / store name<input required minLength="2" maxLength="120" name="business" value={clientForm.business} onChange={onClientChange} /></label>
            <label>Email / license identity<input type="email" value={dialog.client.email} readOnly /></label>
            <label>Phone<input maxLength="30" name="phone" value={clientForm.phone} onChange={onClientChange} /></label>
            <label>Plan name<input required minLength="1" maxLength="80" name="plan" value={clientForm.plan} onChange={onClientChange} /></label>
            <label>Billing interval<select name="billingInterval" value={clientForm.billingInterval} onChange={onClientChange}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>
            <label>Subscription amount<input required type="number" min="0" step="0.01" name="amount" value={clientForm.amount} onChange={onClientChange} /></label>
            <label>Amount paid<input required type="number" min="0" max={clientForm.amount} step="0.01" name="paid" value={clientForm.paid} onChange={onClientChange} /></label>
            <label>Valid from<input required type="date" name="validFrom" value={clientForm.validFrom} onChange={onClientChange} /></label>
            <label>Valid until<input required type="date" name="validTill" value={clientForm.validTill} onChange={onClientChange} /></label>
          </div>
          <div className="credential-notice"><ShieldCheck size={17} /><span>Email remains locked because it is the license identity. Email synchronization, business segment, and store URL editing require the per-client API mapping phase.</span></div>
          <div className="modal-footer"><button type="button" className="button button-secondary" onClick={close}>Cancel</button><button className="button button-primary" type="submit"><Check size={16} /> Save client details</button></div>
        </form>
      ) : dialog.type === "approve" ? (
        <form className="modal-card" role="dialog" aria-modal="true" onSubmit={(event) => { event.preventDefault(); approveRequest(dialog.request, amount, paidNow); }}>
          <div className="modal-header"><div><span className="eyebrow">APPROVE SUBSCRIPTION</span><h2>Set price and issue license</h2><p>Approve {dialog.request.business} and issue a real license for {dialog.request.email}.</p></div><button type="button" className="icon-button" onClick={close} aria-label="Close"><X size={19} /></button></div>
          <div className="approval-summary"><div className={`avatar ${avatarColor(dialog.request.business)}`}>{dialog.request.business.slice(0, 1)}</div><div><strong>{dialog.request.business}</strong><span>{dialog.request.name} · {dialog.request.email}</span></div></div>
          {(dialog.request.businessType || dialog.request.address || dialog.request.storeEmail) && <div className="approval-registration-details"><strong>{dialog.request.businessType || "Business type not provided"}</strong><span>{dialog.request.storeEmail || "Store email not provided"} · {dialog.request.phone || "Store phone not provided"}</span><span>{dialog.request.address || "Address not provided"}{dialog.request.city ? `, ${dialog.request.city}` : ""}</span>{dialog.request.storeLogo && <img src={`${API_URL}${dialog.request.storeLogo}`} alt={`${dialog.request.business} logo`} />}</div>}
          <p className="approval-plan">Selected plan: <strong>{dialog.request.plan}</strong> · {dialog.request.billingInterval || "yearly"}{dialog.request.planPrice != null && <> · Listed price {currency(dialog.request.planPrice)}</>}</p>
          <label className="modal-label">Final subscription amount<input required type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <label className="modal-label">Amount paid now<input required type="number" min="0" max={amount || undefined} value={paidNow} onChange={(event) => setPaidNow(event.target.value)} /></label>
          <div className="credential-notice"><KeyRound size={17} /><span>A new registration number and license key will be generated. The key is shown once after approval; copy it and send it securely to the customer admin.</span></div>
          <div className="modal-footer"><button type="button" className="button button-secondary" onClick={close}>Cancel</button><button className="button button-success" type="submit"><Check size={16} /> Approve & issue license</button></div>
        </form>
      ) : (
        <div className="modal-card" role="dialog" aria-modal="true">
          <div className="modal-header"><div><span className="eyebrow">SUBSCRIPTION</span><h2>Renew license</h2><p>Extend platform access for {dialog.client.business}.</p></div><button className="icon-button" onClick={close} aria-label="Close"><X size={19} /></button></div>
          <div className="renewal-dates"><div><small>Current expiry</small><strong>{shortDate(dialog.client.validTill)}</strong></div><ArrowRight size={17} /><div><small>New expiry</small><strong>{shortDate(nextBillingPeriod(dialog.client.validTill && new Date(`${dialog.client.validTill}T00:00:00`) > new Date() ? dialog.client.validTill : new Date().toISOString().slice(0, 10), dialog.client.billingInterval))}</strong></div></div>
          <label className="modal-label">Renewal amount<input type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <label className="modal-label">Amount paid now<input type="number" min="0" value={paidNow} onChange={(event) => setPaidNow(event.target.value)} /></label>
          <div className="credential-notice"><Clock3 size={17} /><span>Renewal is stored in the database and extends access for one {dialog.client.billingInterval === "monthly" ? "month" : "year"}.</span></div>
          <div className="modal-footer"><button className="button button-secondary" onClick={close}>Cancel</button><button className="button button-primary" onClick={() => renewLicense(dialog.client, amount, paidNow)}><Check size={16} /> Confirm renewal</button></div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const className = `status-badge status-${(status || "pending").toLowerCase().replaceAll(" ", "-")}`;
  const dot = <i />;
  return <span className={className}>{dot}{status || "Pending"}</span>;
}

function PaymentBadge({ status }) {
  return <span className={`payment-badge payment-${(status || "unpaid").toLowerCase()}`}>{status}</span>;
}

function DetailRow({ label, value }) {
  return <div className="detail-row"><span>{label}</span><strong>{value}</strong></div>;
}

function CredentialRow({ label, value, onCopy }) {
  const canCopy = value.startsWith("EC-") || value.startsWith("ECAR-");
  return <div className="credential-row"><span>{label}</span><div><code>{value}</code>{canCopy && <button className="copy-button" onClick={() => onCopy(value)} aria-label={`Copy ${label}`}><Copy size={14} /></button>}</div></div>;
}

function Pagination({ label }) {
  return <div className="pagination"><span>Showing <strong>{label}</strong></span><div><button disabled aria-label="Previous page"><ChevronLeft size={16} /></button><button className="page-number">1</button><button disabled aria-label="Next page"><ChevronRight size={16} /></button></div></div>;
}

function EmptyState({ title, text }) {
  return <div className="empty-state"><div><Inbox size={20} /></div><strong>{title}</strong><p>{text}</p></div>;
}

function avatarColor(value = "") {
  const palettes = ["avatar-blue", "avatar-purple", "avatar-peach", "avatar-mint", "avatar-pink", "avatar-yellow"];
  return palettes[value.split("").reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % palettes.length];
}

export default App;
