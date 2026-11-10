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

const API_URL = import.meta.env.VITE_API_URL || "";

const iconMap = {
  LayoutDashboard,
  Building2,
  Inbox,
  KeyRound,
  WalletCards,
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

const nextYear = (date = new Date()) => {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + 1);
  return next.toISOString().slice(0, 10);
};

function App() {
  const [clients, setClients] = useState([]);
  const [requests, setRequests] = useState([]);
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

  useEffect(() => {
    let active = true;
    apiRequest("/api/super-admin/me")
      .then(async (result) => {
        if (!active) return;
        setSuperAdmin(result.user);
        setAuthState("authorized");
        try {
          await Promise.all([refreshSubscriptions(), refreshRequests()]);
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
        await Promise.all([refreshSubscriptions(), refreshRequests()]);
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
      setDialog({ type: "approve", request, amount: "" });
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
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{navItems.find((item) => item.id === activePage)?.label}</strong></div>
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
              openClient={setSelectedClient}
              decideRequest={decideRequest}
              onAdd={() => setDialog({ type: "new-request" })}
            />
          )}
          {activePage === "clients" && (
            <ClientsPage clients={visibleClients} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} openClient={setSelectedClient} onAdd={() => setDialog({ type: "new-request" })} />
          )}
          {activePage === "requests" && (
            <RequestsPage requests={requests} decideRequest={decideRequest} />
          )}
          {activePage === "subscriptions" && (
            <SubscriptionsPage clients={clients} openClient={setSelectedClient} onRenew={(client) => setDialog({ type: "renew", client })} />
          )}
          {activePage === "payments" && (
            <PaymentsPage clients={clients} openClient={setSelectedClient} />
          )}
        </div>
      </main>

      {selectedClient && (
        <ClientDrawer
          client={{ ...(clients.find((client) => client.id === selectedClient.id) || selectedClient), ...(selectedClient.licenseKey ? { licenseKey: selectedClient.licenseKey } : {}) }}
          close={() => setSelectedClient(null)}
          onStatusChange={(client) => updateClient(client, client.status === "Suspended" ? "Active" : "Suspended")}
          onRenew={(client) => setDialog({ type: "renew", client })}
          onRotateKey={rotateLicenseKey}
          onCopy={(value) => {
            if (!navigator.clipboard) return notify("Clipboard access is unavailable.");
            navigator.clipboard.writeText(value).then(() => notify("Copied to clipboard.")).catch(() => notify("Clipboard access is unavailable."));
          }}
        />
      )}
      {dialog && (
        <Dialog
          dialog={dialog}
          close={() => setDialog(null)}
          approveRequest={approveRequest}
          renewLicense={renewLicense}
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
              <td><button className="row-more" aria-label={`View ${client.business}`} onClick={(event) => { event.stopPropagation(); openClient(client); }}><MoreHorizontal size={19} /></button></td>
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
              <div className="request-card-main"><div className={`avatar request-avatar ${avatarColor(request.business)}`}>{request.business.slice(0, 1)}</div><div className="request-copy"><div className="request-title-line"><h3>{request.business}</h3><StatusBadge status={request.status} /></div><p>{request.name} <span>·</span> {request.plan} plan</p><div className="request-meta"><span><CalendarDays size={14} /> Received {shortDate(request.requestedAt)}</span><span><CreditCard size={14} /> Subscription request</span></div><p className="request-notes">{request.notes || "No additional details provided."}</p></div></div>
              <div className="request-contact"><span><small>EMAIL</small>{request.email}</span><span><small>PHONE</small>{request.phone}</span></div>
              {request.status === "Pending" ? <div className="request-actions"><button className="button button-secondary button-small" onClick={() => decideRequest(request, "Rejected")}><XCircle size={15} /> Reject</button><button className="button button-success button-small" onClick={() => decideRequest(request, "Approved")}><Check size={15} /> Approve & issue license</button></div> : <div className="request-resolved"><CheckCircle2 size={16} /> Request {request.status.toLowerCase()}</div>}
            </article>
          ))}
        </div>}
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

function ClientDrawer({ client, close, onStatusChange, onRenew, onRotateKey, onCopy }) {
  const pendingAmount = Math.max(client.amount - client.paid, 0);
  return (
    <div className="drawer-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <aside className="client-drawer" role="dialog" aria-modal="true" aria-label={`${client.business} client details`}>
        <div className="drawer-top"><span className="eyebrow">CLIENT PROFILE</span><button className="icon-button" onClick={close} aria-label="Close client details"><X size={19} /></button></div>
        <div className="drawer-client-heading"><div className={`avatar drawer-avatar ${avatarColor(client.business)}`}>{client.business.slice(0, 1)}</div><div><h2>{client.business}</h2><p>{client.name}</p></div><StatusBadge status={client.status} /></div>
        <div className="drawer-actions"><button className="button button-primary" onClick={() => onRenew(client)}><FileClock size={16} /> Renew license</button><button className="button button-secondary" onClick={() => onStatusChange(client)}>{client.status === "Suspended" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}{client.status === "Suspended" ? "Activate" : "Suspend"}</button><button className="button button-secondary" onClick={() => onRotateKey(client)}><RefreshCw size={15} /> Reissue key</button></div>
        <div className="drawer-section"><div className="drawer-section-heading"><h3>Business details</h3></div><DetailRow label="Primary contact" value={client.name} /><DetailRow label="Email address" value={client.email} /><DetailRow label="Phone number" value={client.phone || "—"} /><DetailRow label="Registered on" value={shortDate(client.registeredAt)} /></div>
        <div className="drawer-section"><div className="drawer-section-heading"><h3>License details</h3><ShieldCheck size={17} className="section-heading-icon" /></div><CredentialRow label="Registration number" value={client.registrationNumber || "Not issued"} onCopy={onCopy} /><CredentialRow label="License key" value={client.licenseKey || "Hidden after issuance"} onCopy={onCopy} /><DetailRow label="Activated on" value={shortDate(client.activatedAt)} /><DetailRow label="Valid from" value={shortDate(client.validFrom)} /><DetailRow label="Valid until" value={shortDate(client.validTill)} /></div>
        <div className="drawer-section"><div className="drawer-section-heading"><h3>Payment overview</h3><span className="mini-plan">{client.plan} plan</span></div><div className="drawer-finance"><div><small>Platform amount</small><strong>{currency(client.amount)}</strong></div><div><small>Paid amount</small><strong className="text-green">{currency(client.paid)}</strong></div><div><small>Pending amount</small><strong className="text-amber">{currency(pendingAmount)}</strong></div></div><div className="payment-progress"><span style={{ width: `${client.amount ? Math.min((client.paid / client.amount) * 100, 100) : 0}%` }} /></div><div className="payment-progress-label"><span>Payment completion</span><span>{client.amount ? Math.round((client.paid / client.amount) * 100) : 0}%</span></div></div>
        <div className="drawer-section history-section"><div className="drawer-section-heading"><h3>Subscription history</h3><span className="history-count">{(client.history || []).length}</span></div>{(client.history || []).length === 0 ? <p className="no-history">No subscription or payment history recorded.</p> : (client.history || []).slice().reverse().map((item, index) => <div className="history-item" key={`${item.date}-${index}`}><div className="history-dot"><CreditCard size={13} /></div><div className="history-copy"><strong>{item.type}</strong><small>{shortDate(item.date)}</small></div><span className="history-amount">{currency(item.amount)}</span><PaymentBadge status={item.status} /></div>)}</div>
        <div className="prototype-inline-note"><ShieldCheck size={14} /> License keys are stored as hashes and are only shown once when issued.</div>
      </aside>
    </div>
  );
}

function Dialog({ dialog, close, approveRequest, renewLicense, createRequest }) {
  const [amount, setAmount] = useState(dialog.amount ?? dialog.client?.amount ?? "");
  const [paidNow, setPaidNow] = useState(dialog.client?.paid ?? 0);
  const [form, setForm] = useState({ name: "", business: "", email: "", phone: "", proposedAmount: "", paid: "0" });
  const onChange = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
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
      ) : dialog.type === "approve" ? (
        <form className="modal-card" role="dialog" aria-modal="true" onSubmit={(event) => { event.preventDefault(); approveRequest(dialog.request, amount, paidNow); }}>
          <div className="modal-header"><div><span className="eyebrow">APPROVE SUBSCRIPTION</span><h2>Set price and issue license</h2><p>Approve {dialog.request.business} and issue a real license for {dialog.request.email}.</p></div><button type="button" className="icon-button" onClick={close} aria-label="Close"><X size={19} /></button></div>
          <div className="approval-summary"><div className={`avatar ${avatarColor(dialog.request.business)}`}>{dialog.request.business.slice(0, 1)}</div><div><strong>{dialog.request.business}</strong><span>{dialog.request.name} · {dialog.request.email}</span></div></div>
          <label className="modal-label">Final subscription amount<input required type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <label className="modal-label">Amount paid now<input required type="number" min="0" max={amount || undefined} value={paidNow} onChange={(event) => setPaidNow(event.target.value)} /></label>
          <div className="credential-notice"><KeyRound size={17} /><span>A new registration number and license key will be generated. The key is shown once after approval; copy it and send it securely to the customer admin.</span></div>
          <div className="modal-footer"><button type="button" className="button button-secondary" onClick={close}>Cancel</button><button className="button button-success" type="submit"><Check size={16} /> Approve & issue license</button></div>
        </form>
      ) : (
        <div className="modal-card" role="dialog" aria-modal="true">
          <div className="modal-header"><div><span className="eyebrow">SUBSCRIPTION</span><h2>Renew license</h2><p>Extend platform access for {dialog.client.business}.</p></div><button className="icon-button" onClick={close} aria-label="Close"><X size={19} /></button></div>
          <div className="renewal-dates"><div><small>Current expiry</small><strong>{shortDate(dialog.client.validTill)}</strong></div><ArrowRight size={17} /><div><small>New expiry</small><strong>{shortDate(nextYear(dialog.client.validTill && new Date(`${dialog.client.validTill}T00:00:00`) > new Date() ? new Date(`${dialog.client.validTill}T00:00:00`) : new Date()))}</strong></div></div>
          <label className="modal-label">Renewal amount<input type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <label className="modal-label">Amount paid now<input type="number" min="0" value={paidNow} onChange={(event) => setPaidNow(event.target.value)} /></label>
          <div className="credential-notice"><Clock3 size={17} /><span>Renewal is stored in the database and extends access for one year.</span></div>
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
