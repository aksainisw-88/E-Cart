import { useEffect, useState } from "react";
import { Bell, LogOut, Menu, Moon, Search, Sun, X } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import {
  adminNavigation,
  adminSecondaryNavigation,
} from "../../data/adminNavigation";
import { useStore } from "../../context/storeContext";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authState, setAuthState] = useState("checking");
  const [adminUser, setAdminUser] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [orderCount, setOrderCount] = useState(0);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("e-mart-admin-dark") === "true");
  const navigate = useNavigate();
  const store = useStore();
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); navigate("/account", { replace: true }); };
  const toggleDarkMode = () => setDarkMode((current) => { const next = !current; localStorage.setItem("e-mart-admin-dark", String(next)); return next; });

  useEffect(() => {
    let active = true;

    fetch("/api/auth/me", { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        return result;
      })
      .then(({ user }) => {
        if (!active) return;
        if (!["admin", "manager", "user"].includes(user.role)) {
          navigate("/", { replace: true });
          return;
        }
        setAdminUser(user);
        setAuthState("authorized");
      })
      .catch(() => {
        if (active) navigate("/account", { replace: true });
      });

    return () => { active = false; };
  }, [navigate]);

  useEffect(() => {
    if (!adminUser) return;
    fetch("/api/admin/orders", { credentials: "include" }).then((response) => response.json()).then((result) => { const orders = result.data || []; setOrderCount(orders.length); setNotifications(orders.slice(0, 5)); }).catch(() => {});
  }, [adminUser]);

  if (authState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
          <p className="mt-4 text-sm text-slate-500">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (authState !== "authorized") return null;

  const visibleNavigation = adminNavigation.filter((item) => item.roles.includes(adminUser.role));
  const visibleSecondaryNavigation = adminSecondaryNavigation.filter((item) => item.roles.includes(adminUser.role));
  const initials = adminUser.name.split(" ").map((part) => part[0]).join("").slice(0, 2);
  const renderNavItem = (item) => {
    const Icon = item.icon;

    return (
      <NavLink
        key={item.to}
        end={item.to === "/admin"}
        to={item.to}
        onClick={() => setSidebarOpen(false)}
        className={({ isActive }) =>
          `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            isActive
              ? "bg-primary text-white shadow-sm shadow-primary/20"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          }`
        }
      >
        {({ isActive }) => (
          <>
            <Icon className={`h-[18px] w-[18px] ${isActive ? "text-white" : ""}`} />
            <span>{item.label}</span>
            {(item.badge || item.to === "/admin/orders") && (
              <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"}`}>
                {item.to === "/admin/orders" ? orderCount : item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <div className={`admin-shell min-h-screen bg-[#f3f6f4] text-slate-900 ${darkMode ? "admin-dark" : ""}`}>
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white shadow-[8px_0_24px_rgba(15,23,42,0.03)] transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white px-5">
          <NavLink to="/admin" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary-dark text-xl font-bold text-white shadow-md shadow-primary/20">
              {store.logoUrl ? <img src={store.logoUrl} alt="" className="h-full w-full object-contain" /> : "+"}
            </span>
            <span>
              <strong className="block max-w-[150px] truncate text-sm text-slate-900">{store.name}</strong>
              <small className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Admin console</small>
            </span>
          </NavLink>
          <button type="button" onClick={() => setSidebarOpen(false)} className="text-slate-400 lg:hidden" aria-label="Close sidebar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="px-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Workspace</p>
          <nav className="mt-3 space-y-1">{visibleNavigation.map(renderNavItem)}</nav>
          <p className="mt-8 px-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Configuration</p>
          <nav className="mt-3 space-y-1">{visibleSecondaryNavigation.map(renderNavItem)}</nav>
        </div>

        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-primary">{initials}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{adminUser.name}</p>
              <p className="text-xs capitalize text-slate-500">{adminUser.role}</p>
            </div>
            <button type="button" onClick={logout} aria-label="Sign out" className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 md:flex md:w-80">
              <Search className="h-4 w-4 text-slate-400" />
              <input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Search products, orders, customers..." />
            </div>
          </div>
          <div className="relative flex items-center gap-2 sm:gap-4">
            <button type="button" onClick={toggleDarkMode} aria-label={darkMode ? "Enable light mode" : "Enable dark mode"} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button type="button" aria-label="Notifications" onClick={() => setNotificationsOpen((open) => !open)} className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100">
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900">Recent orders</h2>
                  <span className="text-xs text-slate-400">{notifications.length}</span>
                </div>
                <div className="mt-3 space-y-3">
                  {notifications.length ? notifications.map((order) => (
                    <NavLink key={order._id} to="/admin/orders" onClick={() => setNotificationsOpen(false)} className="block rounded-xl bg-slate-50 p-3 hover:bg-teal-50">
                      <p className="text-sm font-semibold text-slate-700">#{order.orderNumber}</p>
                      <p className="mt-1 text-xs text-slate-500">{order.customer?.name || "Customer"} · ₹{order.total}</p>
                      <p className="mt-1 text-xs text-primary">{order.status}</p>
                    </NavLink>
                  )) : <p className="text-sm text-slate-500">No recent orders.</p>}
                </div>
              </div>
            )}
            <div className="hidden h-7 w-px bg-slate-200 sm:block" />
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{initials}</div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold">{adminUser.name}</p>
                <p className="text-xs capitalize text-slate-500">{adminUser.role}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-8"><Outlet /></main>
      </div>
    </div>
  );
};

export default AdminLayout;
