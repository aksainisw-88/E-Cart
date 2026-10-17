import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, RefreshCw, Search } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";
const today = new Date();
const initialTo = today.toISOString().slice(0, 10);
const initialFrom = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const money = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const formatDate = (date) => date ? new Date(date).toLocaleString("en-IN") : "-";

const AdminSalesTransactions = () => {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [sales, setSales] = useState([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [limited, setLimited] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSales = async (startDate = from, endDate = to) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/admin/reports/sales-transactions?from=${startDate}&to=${endDate}`, { credentials: "include" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to load sales transactions.");
      setSales(result.data.sales || []);
      setTotalEntries(result.data.total || 0);
      setLimited(Boolean(result.data.limited));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/admin/reports/sales-transactions?from=${initialFrom}&to=${initialTo}`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load sales transactions.");
        return result.data;
      })
      .then((data) => {
        if (!active) return;
        setSales(data.sales || []);
        setTotalEntries(data.total || 0);
        setLimited(Boolean(data.limited));
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sales.flatMap((sale) => (sale.items || []).map((item, index) => ({
      key: `${sale._id}-${index}`,
      sale,
      item,
      customerName: sale.customer?.name || sale.customerName || "Walk-in Customer",
      customerPhone: sale.customer?.phone || "",
    }))).filter(({ sale, item, customerName, customerPhone }) => (
      `${sale.invoiceNumber} ${customerName} ${customerPhone} ${item.productName} ${item.batchNumber} ${sale.customer?.email || ""}`.toLowerCase().includes(normalizedQuery)
    ));
  }, [query, sales]);

  const totals = useMemo(() => ({
    invoiceCount: new Set(rows.map((row) => row.sale._id)).size,
    units: rows.reduce((sum, row) => sum + Number(row.item.quantity || 0) + Number(row.item.freeQuantity || 0), 0),
    salesAmount: rows.reduce((sum, row) => sum + Number(row.item.amount || 0), 0),
  }), [rows]);

  const exportCsv = () => {
    const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const header = ["Entry date", "Entry no", "Customer", "Customer source", "Phone", "Product", "Batch", "MRP", "Rate", "Quantity", "Free quantity", "Discount", "Amount", "Payment mode", "Payment status", "Location"];
    const lines = rows.map(({ sale, item, customerName, customerPhone }) => [
      formatDate(sale.createdAt), sale.invoiceNumber, customerName, sale.customerSource || sale.customer?.customerSource || "Walk-in", customerPhone,
      item.productName, item.batchNumber, item.mrp, item.unitPrice, item.quantity, item.freeQuantity, item.discount, item.amount,
      sale.paymentMode, sale.paymentStatus, sale.location?.name || "",
    ].map(escape).join(","));
    const blob = new Blob([[header.map(escape).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales-transactions-${from}-to-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-375">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Business intelligence</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Sales transactions</h1>
          <p className="mt-2 text-sm text-slate-500">Review each POS sale by customer, product, batch, and selling rate.</p>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); loadSales(from, to); }} className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-slate-500">From<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className="mt-1 block h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm font-normal text-slate-700 outline-none focus:border-primary" /></label>
          <label className="text-xs font-semibold text-slate-500">To<input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} className="mt-1 block h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm font-normal text-slate-700 outline-none focus:border-primary" /></label>
          <button type="submit" disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Apply</button>
        </form>
      </header>

      {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {limited && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Showing the latest 5,000 of {totalEntries.toLocaleString("en-IN")} transactions. Narrow the date range to see fewer records.</p>}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[["Transactions", loading ? "..." : totals.invoiceCount.toLocaleString("en-IN")], ["Units sold", loading ? "..." : totals.units.toLocaleString("en-IN")], ["Line sales", loading ? "..." : money(totals.salesAmount)]].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-white px-4 py-3"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-900">{value}</p></div>)}
      </div>

      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-800"><CalendarDays className="h-4 w-4 text-primary" />{rows.length.toLocaleString("en-IN")} line items · {totalEntries.toLocaleString("en-IN")} entries in date range</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block sm:w-72"><span className="sr-only">Search sales transactions</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Entry, customer, product, batch" className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-primary" /></label>
            <button type="button" onClick={exportCsv} disabled={!rows.length} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Download className="h-4 w-4" />Export CSV</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-375 text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr>{["Entry date", "Entry no", "Customer", "Source", "Phone", "Product", "Batch", "MRP", "Rate", "Qty", "Free", "Discount", "Amount", "Payment", "Location"].map((heading) => <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ key, sale, item, customerName, customerPhone }) => <tr key={key} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-3 py-3 text-slate-500">{formatDate(sale.createdAt)}</td>
                <td className="whitespace-nowrap px-3 py-3 font-semibold text-primary">{sale.invoiceNumber}</td>
                <td className="px-3 py-3 font-medium text-slate-800">{customerName}</td>
                <td className="px-3 py-3 text-slate-600">{sale.customerSource || sale.customer?.customerSource || "Walk-in"}</td>
                <td className="px-3 py-3 text-slate-500">{customerPhone || "-"}</td>
                <td className="px-3 py-3 font-medium text-slate-700">{item.productName}</td>
                <td className="px-3 py-3 text-slate-600">{item.batchNumber || "-"}</td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">{money(item.mrp)}</td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-700">{money(item.unitPrice)}</td>
                <td className="px-3 py-3 text-slate-600">{item.quantity}</td>
                <td className="px-3 py-3 text-slate-600">{item.freeQuantity || 0}</td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">{money(item.discount)}</td>
                <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">{money(item.amount)}</td>
                <td className="px-3 py-3 text-slate-600">{sale.paymentMode}<span className="block text-xs text-slate-400">{sale.paymentStatus}</span></td>
                <td className="px-3 py-3 text-slate-600">{sale.location?.name || "-"}</td>
              </tr>)}
              {!loading && !rows.length && <tr><td colSpan="15" className="px-5 py-14 text-center text-sm text-slate-500">No transactions found in this date range.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminSalesTransactions;
