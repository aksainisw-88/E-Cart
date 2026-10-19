import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, CreditCard, Download, Package, Percent, RefreshCw, Search, Store, UserRound, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";
const today = new Date();
const initialTo = today.toISOString().slice(0, 10);
const initialFrom = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const reportModules = {
  "purchase-transactions": {
    title: "Purchase transactions", description: "Review received stock, vendor invoices, tax, payments, and outstanding balances.", icon: Package,
    metrics: [{ label: "Purchase total", key: "purchases", type: "money" }, { label: "Paid to vendors", key: "paid", type: "money" }, { label: "Outstanding", key: "due", type: "money" }, { label: "Units received", key: "units", type: "number" }],
    columns: [["date", "Entry date", "date"], ["invoice", "Entry no."], ["vendorInvoice", "Vendor invoice"], ["vendor", "Vendor"], ["product", "Product"], ["variant", "Variant / pack"], ["batch", "Batch"], ["quantity", "Qty", "number"], ["freeQuantity", "Free", "number"], ["rate", "Rate", "money"], ["taxCode", "Tax code"], ["tax", "Tax", "money"], ["amount", "Amount", "money"], ["paid", "Paid", "money"], ["due", "Due", "money"], ["status", "Payment status"], ["location", "Location"]],
  },
  profit: {
    title: "Profit report", description: "Compare paid sales revenue with recorded or estimated product cost.", icon: CreditCard,
    metrics: [{ label: "Net sales", key: "revenue", type: "money" }, { label: "Product cost", key: "cost", type: "money" }, { label: "Estimated profit", key: "profit", type: "money" }, { label: "Profit margin", key: "marginPercent", type: "percent" }],
    note: "When a sale has no stored cost, cost is estimated at 70% of its selling rate.",
    columns: [["date", "Entry date", "date"], ["invoice", "Entry no."], ["source", "Source"], ["customer", "Customer"], ["items", "Lines", "number"], ["revenue", "Net sales", "money"], ["cost", "Product cost", "money"], ["profit", "Profit", "money"], ["marginPercent", "Margin", "percent"], ["estimatedCost", "Cost basis", "estimated"]],
  },
  margin: {
    title: "Margin report", description: "Compare product level sales, cost, profit, and gross margin percentage.", icon: Percent,
    metrics: [{ label: "Net sales", key: "revenue", type: "money" }, { label: "Product cost", key: "cost", type: "money" }, { label: "Gross profit", key: "profit", type: "money" }, { label: "Gross margin", key: "marginPercent", type: "percent" }],
    note: "Products without a stored cost use the same 70% cost estimate as the profit report.",
    columns: [["product", "Product"], ["units", "Units sold", "number"], ["transactions", "Transactions", "number"], ["revenue", "Net sales", "money"], ["cost", "Product cost", "money"], ["profit", "Gross profit", "money"], ["marginPercent", "Gross margin", "percent"], ["estimatedCost", "Cost basis", "estimated"]],
  },
  "top-products": {
    title: "Top-selling products", description: "Rank products by units sold across POS and online orders.", icon: BarChart3,
    metrics: [{ label: "Products", key: "products", type: "number" }, { label: "Units sold", key: "units", type: "number" }, { label: "Sales value", key: "revenue", type: "money" }],
    columns: [["rank", "Rank", "number"], ["product", "Product"], ["units", "Units sold", "number"], ["freeUnits", "Free units", "number"], ["transactions", "Transactions", "number"], ["revenue", "Sales value", "money"]],
  },
  "vendor-ledger": {
    title: "Vendor ledger", description: "Track purchases, payments, adjustments, and period balance by vendor.", icon: Store,
    metrics: [{ label: "Purchases / debit", key: "debits", type: "money" }, { label: "Payments / credit", key: "credits", type: "money" }, { label: "Net movement", key: "balance", type: "money" }, { label: "Entries", key: "entries", type: "number" }],
    note: "Balances show movement within the selected date range.",
    columns: [["date", "Entry date", "date"], ["account", "Vendor"], ["invoice", "Reference"], ["description", "Description"], ["debit", "Debit", "money"], ["credit", "Credit", "money"], ["balance", "Period balance", "money"]],
  },
  "customer-ledger": {
    title: "Customer ledger", description: "Review customer sales and payments with a running balance for the period.", icon: Users,
    metrics: [{ label: "Sales / debit", key: "debits", type: "money" }, { label: "Payments / credit", key: "credits", type: "money" }, { label: "Net movement", key: "balance", type: "money" }, { label: "Entries", key: "entries", type: "number" }],
    note: "Balances show movement within the selected date range.",
    columns: [["date", "Entry date", "date"], ["account", "Customer"], ["invoice", "Reference"], ["description", "Description"], ["debit", "Debit", "money"], ["credit", "Credit", "money"], ["balance", "Period balance", "money"]],
  },
  "outstanding-customers": {
    title: "Customer outstanding", description: "Find unpaid online and credit POS invoices by customer.", icon: UserRound,
    metrics: [{ label: "Customers", key: "accounts", type: "number" }, { label: "Open invoices", key: "invoices", type: "number" }, { label: "Total outstanding", key: "outstanding", type: "money" }],
    note: "Shows unpaid balances as of the selected end date.",
    columns: [["account", "Customer"], ["email", "Email"], ["phone", "Phone"], ["invoices", "Open invoices", "number"], ["oldestDue", "Oldest due", "date"], ["outstanding", "Outstanding", "money"], ["status", "Status"]],
  },
  "outstanding-vendors": {
    title: "Vendor outstanding", description: "See current vendor balances and unpaid purchase invoice counts.", icon: CreditCard,
    metrics: [{ label: "Vendors", key: "accounts", type: "number" }, { label: "Open invoices", key: "invoices", type: "number" }, { label: "Total outstanding", key: "outstanding", type: "money" }],
    note: "Balances reflect the vendor account balance currently recorded in the system.",
    columns: [["account", "Vendor"], ["email", "Email"], ["phone", "Phone"], ["invoices", "Open invoices", "number"], ["outstanding", "Outstanding", "money"], ["status", "Status"]],
  },
};

const displayValue = (value, type) => {
  if (value === undefined || value === null || value === "") return "-";
  if (type === "money") return money(value);
  if (type === "number") return Number(value).toLocaleString("en-IN");
  if (type === "percent") return `${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}%`;
  if (type === "date") return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  if (type === "estimated") return value ? "Estimated" : "Recorded";
  return String(value);
};
const fetchReportData = async (type, startDate, endDate) => {
  const response = await fetch(`${API_URL}/api/admin/reports/${type}?from=${startDate}&to=${endDate}`, { credentials: "include" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Unable to load this report.");
  return result.data;
};

const AdminReportModule = () => {
  const { reportType } = useParams();
  const report = reportModules[reportType];
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [totalEntries, setTotalEntries] = useState(0);
  const [limited, setLimited] = useState(false);
  const [query, setQuery] = useState("");
  const [applying, setApplying] = useState(false);
  const [loadedReportType, setLoadedReportType] = useState("");
  const [error, setError] = useState("");
  const loading = applying || loadedReportType !== reportType;

  const loadReport = async (startDate = from, endDate = to) => {
    if (!report) return;
    setApplying(true);
    setError("");
    try {
      const data = await fetchReportData(reportType, startDate, endDate);
      setRows(data.rows || []);
      setSummary(data.summary || {});
      setTotalEntries(data.total || 0);
      setLimited(Boolean(data.limited));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setApplying(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (!report) return undefined;
    fetchReportData(reportType, initialFrom, initialTo)
      .then((data) => {
        if (!active) return;
        setError("");
        setRows(data.rows || []);
        setSummary(data.summary || {});
        setTotalEntries(data.total || 0);
        setLimited(Boolean(data.limited));
        setFrom(initialFrom);
        setTo(initialTo);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message);
        setRows([]);
        setSummary({});
        setTotalEntries(0);
        setLimited(false);
      })
      .finally(() => { if (active) setLoadedReportType(reportType); });
    return () => { active = false; };
  }, [report, reportType]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const currentRows = loadedReportType === reportType ? rows : [];
    const visibleRows = needle ? currentRows.filter((row) => Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(needle))) : currentRows;
    if (reportType !== "top-products") return visibleRows;
    return visibleRows.map((row, index) => ({ ...row, rank: index + 1 }));
  }, [loadedReportType, query, reportType, rows]);

  const exportCsv = () => {
    if (!report || !filteredRows.length) return;
    const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const columns = report.columns.filter(([key]) => key !== "rank");
    const header = columns.map(([, label]) => label);
    const lines = filteredRows.map((row) => columns.map(([key]) => escape(row[key])).join(","));
    const url = URL.createObjectURL(new Blob([[header.map(escape).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportType}-${from}-to-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!report) return <div className="mx-auto max-w-375 rounded-xl border border-slate-200 bg-white p-8 text-center"><h1 className="text-xl font-bold text-slate-900">Report module not found</h1><Link to="/admin/reports" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">Back to reports</Link></div>;
  const Icon = report.icon;

  return (
    <div className="mx-auto max-w-375">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Business intelligence</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{report.title}</h1>
          <p className="mt-2 text-sm text-slate-500">{report.description}</p>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); loadReport(from, to); }} className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-slate-500">From<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className="mt-1 block h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm font-normal text-slate-700 outline-none focus:border-primary" /></label>
          <label className="text-xs font-semibold text-slate-500">To<input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} className="mt-1 block h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm font-normal text-slate-700 outline-none focus:border-primary" /></label>
          <button type="submit" disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Apply</button>
        </form>
      </header>

      <div className="mt-4"><Link to="/admin/reports" className="text-xs font-semibold text-primary hover:underline">← All reports</Link></div>
      {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {limited && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Showing the latest {rows.length.toLocaleString("en-IN")} of {totalEntries.toLocaleString("en-IN")} entries. Narrow the date range to see fewer records.</p>}
      {report.note && <p className="mt-4 rounded-lg bg-slate-100 p-3 text-xs text-slate-600">{report.note}</p>}

      <div className={`mt-6 grid gap-3 ${report.metrics.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
        {report.metrics.map((metric) => <div key={metric.key} className="rounded-lg border border-slate-200 bg-white px-4 py-3"><p className="text-xs font-medium text-slate-500">{metric.label}</p><p className="mt-1 text-xl font-bold text-slate-900">{loading ? "..." : displayValue(summary[metric.key], metric.type)}</p></div>)}
      </div>

      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-800"><CalendarDays className="h-4 w-4 text-primary" />{filteredRows.length.toLocaleString("en-IN")} rows · {totalEntries.toLocaleString("en-IN")} entries in date range</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block sm:w-72"><span className="sr-only">Search {report.title}</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${report.title.toLowerCase()}...`} className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-primary" /></label>
            <button type="button" onClick={exportCsv} disabled={!filteredRows.length} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Download className="h-4 w-4" />Export CSV</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr>{report.columns.map(([key, label]) => <th key={key} className="whitespace-nowrap px-3 py-3 font-semibold">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row, index) => <tr key={row.key || `${reportType}-${index}`} className="hover:bg-slate-50">
                {report.columns.map(([key, , type]) => <td key={key} className={`px-3 py-3 ${["money", "number", "percent"].includes(type) ? "whitespace-nowrap tabular-nums" : ""} ${["invoice", "product", "account"].includes(key) ? "font-medium text-slate-800" : "text-slate-600"}`}>
                  {key === "rank" ? (index + 1).toLocaleString("en-IN") : type === "estimated" ? <span className={`rounded-full px-2 py-1 text-xs font-semibold ${row[key] ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{displayValue(row[key], type)}</span> : displayValue(row[key], type)}
                </td>)}
              </tr>)}
              {!loading && !filteredRows.length && <tr><td colSpan={report.columns.length} className="px-5 py-14 text-center text-sm text-slate-500">{rows.length ? "No rows match this search." : "No report entries found in this date range."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Icon className="h-4 w-4 text-primary" />Report period: {new Date(`${from}T00:00:00`).toLocaleDateString("en-IN")} to {new Date(`${to}T00:00:00`).toLocaleDateString("en-IN")}</p>
    </div>
  );
};

export default AdminReportModule;
