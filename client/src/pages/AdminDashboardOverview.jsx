import { useEffect, useState } from "react";
import { ArrowUpRight, CircleDollarSign, Clock3, Package, Plus, ShoppingCart, Users } from "lucide-react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";
const money = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const statusStyles = {
  Processing: "bg-amber-50 text-amber-700",
  Shipped: "bg-sky-50 text-sky-700",
  Delivered: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-red-50 text-red-700",
};

const AdminDashboardOverview = () => {
  const [overview, setOverview] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/admin/overview`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load dashboard metrics.");
        return result.data;
      })
      .then((data) => { if (active) setOverview(data); })
      .catch((error) => { if (active) setLoadError(error.message); });
    return () => { active = false; };
  }, []);

  const revenueTrend = overview?.revenueTrend || [];
  const weeklyOrders = overview?.weeklyOrders || [];
  const topProducts = overview?.topProducts || [];
  const recentOrders = overview?.recentOrders || [];
  const revenueMax = Math.max(...revenueTrend.map((item) => Number(item.revenue || 0)), 1);
  const revenuePoints = revenueTrend.map((item, index) => {
    const x = revenueTrend.length > 1 ? 24 + index * (552 / (revenueTrend.length - 1)) : 300;
    const y = 148 - (Number(item.revenue || 0) / revenueMax) * 126;
    return { x, y, item };
  });
  const weekActivity = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - 6 + index);
    const id = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const day = weeklyOrders.find((entry) => entry._id === id);
    return { id, label: date.toLocaleDateString("en-IN", { weekday: "short" }), orders: Number(day?.orders || 0) };
  });
  const maxDailyOrders = Math.max(...weekActivity.map((day) => day.orders), 1);
  const monthlyRevenue = Number(overview?.monthlyRevenue || 0);
  const monthlyOrderCount = Number(overview?.monthlyOrderCount || 0);
  const kpis = [
    { label: "Total revenue", value: overview ? money(overview.revenue) : "—", note: `${money(monthlyRevenue)} this month`, icon: CircleDollarSign, tone: "text-blue-600 bg-blue-50" },
    { label: "Orders this month", value: overview ? monthlyOrderCount.toLocaleString("en-IN") : "—", note: `${overview?.awaitingDispatch || 0} awaiting dispatch`, icon: ShoppingCart, tone: "text-violet-600 bg-violet-50" },
    { label: "Customers", value: overview ? Number(overview.customerCount || 0).toLocaleString("en-IN") : "—", note: `${overview?.newCustomers || 0} joined this week`, icon: Users, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Products listed", value: overview ? Number(overview.productCount || 0).toLocaleString("en-IN") : "—", note: `${overview?.lowStock?.length || 0} need restocking`, icon: Package, tone: "text-amber-600 bg-amber-50" },
  ];
  const statusRows = ["Processing", "Shipped", "Delivered", "Cancelled"].map((status) => ({ status, count: overview?.orderStatuses?.[status] || 0 }));
  const totalStatuses = Math.max(statusRows.reduce((sum, item) => sum + item.count, 0), 1);
  const repeatRate = Number(overview?.repeatCustomerRate || 0);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Store overview</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Sales, fulfillment, and customer activity at a glance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/categories" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary"><Package className="h-4 w-4" />Categories</Link>
          <Link to="/admin/products" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><Plus className="h-4 w-4" />Add product</Link>
        </div>
      </div>

      {loadError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}

      <section aria-label="Store metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, note, icon: Icon, tone }) => <article key={label} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p></div><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></span></div>
          <p className="mt-3 text-xs text-slate-500">{note}</p>
        </article>)}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-sm font-semibold text-slate-900">Revenue performance</p><p className="mt-1 text-xs text-slate-500">Monthly sales over the last six months</p></div>
            <Link to="/admin/reports" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">Reports <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3"><p className="text-2xl font-bold text-slate-900">{overview ? money(monthlyRevenue) : "—"}</p><span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><ArrowUpRight className="h-3.5 w-3.5" />{monthlyOrderCount} orders this month</span></div>
          <div className="mt-4 h-48 w-full overflow-hidden">
            {revenuePoints.length > 1 ? <svg role="img" aria-label="Monthly revenue trend" viewBox="0 0 600 180" preserveAspectRatio="none" className="h-full w-full overflow-visible">
              {[25, 65, 105, 145].map((y) => <line key={y} x1="20" x2="580" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 5" />)}
              <polygon points={`20,160 ${revenuePoints.map((point) => `${point.x},${point.y}`).join(" ")} 580,160`} fill="url(#revenue-fill)" />
              <defs><linearGradient id="revenue-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" /></linearGradient></defs>
              <polyline points={revenuePoints.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              {revenuePoints.map((point) => <circle key={point.item._id} cx={point.x} cy={point.y} r="4" fill="#fff" stroke="#2563eb" strokeWidth="2"><title>{`${point.item._id}: ${money(point.item.revenue)}`}</title></circle>)}
            </svg> : <div className="flex h-full items-center justify-center text-sm text-slate-400">Revenue data will appear as orders are completed.</div>}
          </div>
          <div className="mt-2 flex justify-between gap-2 text-[11px] text-slate-400">{revenueTrend.map((item) => <span key={item._id}>{new Date(`${item._id}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short" })}</span>)}</div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-slate-900">Orders this week</p><p className="mt-1 text-xs text-slate-500">Daily fulfillment volume</p></div><Clock3 className="h-4 w-4 text-slate-400" /></div>
          <div className="mt-5 flex h-36 items-end justify-between gap-2">
            {weekActivity.map((day, index) => <div key={day.id} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100">{day.orders}</span>
              <div className={`w-full max-w-10 rounded-t-md ${index === weekActivity.length - 1 ? "bg-blue-600" : "bg-blue-100"}`} style={{ height: `${Math.max(day.orders ? 14 : 4, day.orders / maxDailyOrders * 100)}%` }} title={`${day.orders} orders`} />
              <span className="text-[10px] text-slate-400">{day.label}</span>
            </div>)}
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-700">Order status</p>
            <div className="mt-3 space-y-2.5">{statusRows.map(({ status, count }) => <div key={status} className="flex items-center gap-2 text-xs"><span className={`h-2 w-2 rounded-full ${status === "Delivered" ? "bg-emerald-500" : status === "Processing" ? "bg-amber-500" : status === "Shipped" ? "bg-sky-500" : "bg-red-400"}`} /><span className="flex-1 text-slate-500">{status}</span><span className="font-semibold text-slate-700">{count}</span><span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-blue-500" style={{ width: `${count / totalStatuses * 100}%` }} /></span></div>)}</div>
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5"><div><h2 className="text-sm font-semibold text-slate-900">Best-selling products</h2><p className="mt-1 text-xs text-slate-500">Ranked by units sold</p></div><Link to="/admin/products" className="text-xs font-semibold text-blue-600 hover:text-blue-700">Manage products</Link></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400"><tr><th className="px-4 py-3 font-semibold">Product</th><th className="px-4 py-3 font-semibold">Units sold</th><th className="px-4 py-3 font-semibold">Revenue</th></tr></thead><tbody className="divide-y divide-slate-100">{topProducts.map((product, index) => <tr key={product._id || product.name}><td className="px-4 py-3"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-xs font-bold text-slate-400">{String(index + 1).padStart(2, "0")}</span><span className="font-medium text-slate-700">{product.name}</span></div></td><td className="px-4 py-3 text-slate-600">{Number(product.sold || 0).toLocaleString("en-IN")}</td><td className="px-4 py-3 font-semibold text-slate-700">{money(product.revenue)}</td></tr>)}{!topProducts.length && <tr><td colSpan="3" className="px-4 py-10 text-center text-sm text-slate-400">Product sales will appear here.</td></tr>}</tbody></table></div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div><h2 className="text-sm font-semibold text-slate-900">Customer retention</h2><p className="mt-1 text-xs text-slate-500">Customers with more than one order</p></div>
          <div className="mt-5 flex items-center gap-5">
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#2563eb ${repeatRate}%, #e2e8f0 ${repeatRate}% 100%)` }}><div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-2xl font-bold text-slate-900">{overview ? `${repeatRate}%` : "—"}</div></div>
            <div><p className="text-sm font-semibold text-slate-800">Repeat customers</p><p className="mt-1 text-xs leading-5 text-slate-500">Based on completed and active orders in your store.</p></div>
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4"><Link to="/admin/customers" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">View customers <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5"><div><h2 className="text-sm font-semibold text-slate-900">Recent orders</h2><p className="mt-1 text-xs text-slate-500">Latest customer purchases and payment status</p></div><Link to="/admin/orders" className="text-xs font-semibold text-blue-600 hover:text-blue-700">All orders</Link></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400"><tr>{["Order", "Customer", "Date", "Amount", "Status"].map((heading) => <th key={heading} className="px-4 py-3 font-semibold sm:px-5">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{recentOrders.map((order) => <tr key={order._id} className="hover:bg-slate-50"><td className="px-4 py-3 font-semibold text-slate-700 sm:px-5">#{order.orderNumber}</td><td className="px-4 py-3 text-slate-600 sm:px-5">{order.customer?.name || "Customer"}</td><td className="px-4 py-3 text-slate-500 sm:px-5">{new Date(order.createdAt).toLocaleDateString("en-IN")}</td><td className="px-4 py-3 font-medium text-slate-700 sm:px-5">{money(order.total)}</td><td className="px-4 py-3 sm:px-5"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyles[order.status] || "bg-slate-100 text-slate-600"}`}>{order.status}</span></td></tr>)}{!recentOrders.length && <tr><td colSpan="5" className="px-5 py-10 text-center text-sm text-slate-400">New orders will appear here.</td></tr>}</tbody></table></div>
      </section>
    </div>
  );
};

export default AdminDashboardOverview;