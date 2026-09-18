import { useEffect, useState } from "react";
import { BarChart3, CalendarDays, Crown, Package, RefreshCw, Users } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";
const today = new Date();
const initialTo = today.toISOString().slice(0, 10);
const initialFrom = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const emptyReport = { totals: { revenue: 0, orders: 0, customers: 0, cost: 0, profit: 0, promoSavings: 0 }, trend: [], topProducts: [], repeatCustomers: [] };

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const dateLabel = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
const fetchReport = async (from, to) => {
  const response = await fetch(`${API_URL}/api/admin/reports?from=${from}&to=${to}`, { credentials: "include" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Unable to load reports.");
  return result.data;
};

const AdminReports = () => {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [report, setReport] = useState(emptyReport);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = async () => {
    setLoading(true);
    setError("");
    try {
      setReport(await fetchReport(from, to));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchReport(initialFrom, initialTo)
      .then((data) => { if (active) setReport(data); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const maxRevenue = Math.max(...report.trend.map((item) => Number(item.revenue)), 1);
  const totals = report.totals;
  const cards = [
    { label: "Sales revenue", value: money(totals.revenue), icon: BarChart3, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Estimated profit", value: money(totals.profit), icon: Crown, tone: "bg-amber-50 text-amber-700" },
    { label: "Paid orders", value: totals.orders.toLocaleString("en-IN"), icon: Package, tone: "bg-blue-50 text-blue-700" },
    { label: "Repeat customers", value: report.repeatCustomers.length.toLocaleString("en-IN"), icon: Users, tone: "bg-teal-50 text-primary" },
  ];

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Business intelligence</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Reports</h1>
          <p className="mt-2 text-sm text-slate-500">Understand revenue, product performance, profit, and customer loyalty.</p>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); loadReport(); }} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <label className="text-xs font-semibold text-slate-500">From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 block h-9 rounded-lg border border-slate-200 px-2 text-sm font-normal text-slate-700 outline-none focus:border-primary" /></label>
          <label className="text-xs font-semibold text-slate-500">To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 block h-9 rounded-lg border border-slate-200 px-2 text-sm font-normal text-slate-700 outline-none focus:border-primary" /></label>
          <button type="submit" disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />Apply</button>
        </form>
      </div>

      {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <p className="mt-5 flex items-center gap-2 text-xs text-slate-500"><CalendarDays className="h-4 w-4" /> {dateLabel(from)} to {dateLabel(to)} · Paid, non-cancelled orders</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{loading ? "..." : value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}><Icon className="h-5 w-5" /></span></div>{label === "Estimated profit" && <p className="mt-3 text-xs text-slate-400">Uses product cost price when available.</p>}</div>)}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-900">Sales revenue</h2><p className="mt-1 text-xs text-slate-500">Monthly paid revenue in the selected period</p></div><span className="text-sm font-bold text-primary">{money(totals.revenue)}</span></div>
          <div className="mt-8 flex h-48 items-end gap-2 sm:gap-4">{report.trend.length ? report.trend.map((item) => <div key={item._id} className="flex min-w-0 flex-1 flex-col items-center gap-2"><div className="w-full max-w-16 rounded-t-md bg-primary transition-all" title={money(item.revenue)} style={{ height: `${Math.max(8, Number(item.revenue) / maxRevenue * 100)}%` }} /><span className="truncate text-[11px] text-slate-400">{item._id}</span></div>) : <p className="w-full self-center text-center text-sm text-slate-500">No paid sales in this period.</p>}</div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-900">Profit report</h2><p className="mt-1 text-xs text-slate-500">Revenue less product cost</p></div><span className="text-xl font-bold text-amber-600">{money(totals.profit)}</span></div><div className="mt-6 space-y-4 text-sm"><div className="flex justify-between text-slate-500"><span>Sales revenue</span><span className="font-semibold text-slate-700">{money(totals.revenue)}</span></div><div className="flex justify-between text-slate-500"><span>Product cost</span><span className="font-semibold text-slate-700">-{money(totals.cost)}</span></div><div className="flex justify-between border-t border-slate-100 pt-4 font-semibold text-slate-900"><span>Estimated profit</span><span className="text-amber-600">{money(totals.profit)}</span></div><div className="flex justify-between text-xs text-slate-400"><span>Promo savings given</span><span>{money(totals.promoSavings)}</span></div></div></section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-100 p-5"><h2 className="font-semibold text-slate-900">Top-selling products</h2><p className="mt-1 text-xs text-slate-500">Ranked by units sold</p></div><div className="overflow-x-auto"><table className="w-full min-w-[500px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3 font-semibold">Product</th><th className="px-5 py-3 font-semibold">Units</th><th className="px-5 py-3 font-semibold">Revenue</th></tr></thead><tbody className="divide-y divide-slate-100">{report.topProducts.map((product, index) => <tr key={`${product._id}-${index}`}><td className="px-5 py-4 font-medium text-slate-700"><span className="mr-3 text-xs text-slate-400">#{index + 1}</span>{product.name}</td><td className="px-5 py-4 text-slate-500">{product.quantity}</td><td className="px-5 py-4 font-semibold text-slate-700">{money(product.revenue)}</td></tr>)}</tbody></table>{!report.topProducts.length && <p className="p-8 text-center text-sm text-slate-500">No product sales in this period.</p>}</div></section>
        <section className="rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-100 p-5"><h2 className="font-semibold text-slate-900">Most repeated customers</h2><p className="mt-1 text-xs text-slate-500">Customers with two or more paid orders</p></div><div className="overflow-x-auto"><table className="w-full min-w-[500px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3 font-semibold">Customer</th><th className="px-5 py-3 font-semibold">Orders</th><th className="px-5 py-3 font-semibold">Spent</th></tr></thead><tbody className="divide-y divide-slate-100">{report.repeatCustomers.map((customer) => <tr key={customer._id}><td className="px-5 py-4"><p className="font-medium text-slate-700">{customer.name || "Customer"}</p><p className="mt-1 text-xs text-slate-400">{customer.email || "-"}</p></td><td className="px-5 py-4 font-semibold text-slate-700">{customer.orders}</td><td className="px-5 py-4 font-semibold text-slate-700">{money(customer.spent)}</td></tr>)}</tbody></table>{!report.repeatCustomers.length && <p className="p-8 text-center text-sm text-slate-500">No repeat customers in this period.</p>}</div></section>
      </div>
    </div>
  );
};

export default AdminReports;
