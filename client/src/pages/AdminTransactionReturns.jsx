import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, RefreshCw, RotateCcw, Search } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";
const money = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (date) => date ? new Date(date).toLocaleDateString("en-IN") : "—";
const dateInputValue = (date = new Date()) => {
  const value = new Date(date);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 10);
};

const AdminTransactionReturns = ({ type }) => {
  const isPurchaseReturn = type === "Purchase Return";
  const isReplacement = type === "Replacement";
  const [sources, setSources] = useState([]);
  const [entries, setEntries] = useState([]);
  const [partyId, setPartyId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(dateInputValue());
  const [reason, setReason] = useState("");
  const [quantities, setQuantities] = useState({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    try {
      const queryString = `type=${encodeURIComponent(type)}`;
      const [sourceResponse, entryResponse] = await Promise.all([
        fetch(`${API_URL}/api/transaction-returns/sources?${queryString}`, { credentials: "include" }),
        fetch(`${API_URL}/api/transaction-returns?${queryString}`, { credentials: "include" }),
      ]);
      const [sourceResult, entryResult] = await Promise.all([sourceResponse.json(), entryResponse.json()]);
      if (!sourceResponse.ok) throw new Error(sourceResult.message || "Unable to load original invoices.");
      if (!entryResponse.ok) throw new Error(entryResult.message || "Unable to load return entries.");
      setSources(sourceResult.data || []);
      setEntries(entryResult.data || []);
      setSourceId((current) => (sourceResult.data || []).some((source) => source.id === current) ? current : "");
      setPartyId((current) => (sourceResult.data || []).some((source) => (source.partyId || `name:${source.partyName || "Unknown"}`) === current) ? current : "");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    Promise.resolve().then(loadData);
  }, [loadData]);

  const source = useMemo(() => sources.find((entry) => entry.id === sourceId) || null, [sources, sourceId]);
  const parties = useMemo(() => {
    const partyMap = new Map();
    sources.forEach((entry) => {
      const key = entry.partyId || `name:${entry.partyName || "Unknown"}`;
      if (!partyMap.has(key)) partyMap.set(key, { id: key, name: entry.partyName || "Unknown", invoiceCount: 0 });
      partyMap.get(key).invoiceCount += 1;
    });
    return [...partyMap.values()].sort((left, right) => left.name.localeCompare(right.name));
  }, [sources]);
  const partySources = useMemo(() => sources.filter((entry) => (entry.partyId || `name:${entry.partyName || "Unknown"}`) === partyId), [partyId, sources]);
  const selectedLines = useMemo(() => (source?.items || []).filter((item) => Number(quantities[isPurchaseReturn ? item.purchaseId : item.sourceItemIndex] || 0) > 0), [isPurchaseReturn, quantities, source]);
  const returnTotal = useMemo(() => selectedLines.reduce((sum, item) => {
    const key = isPurchaseReturn ? item.purchaseId : item.sourceItemIndex;
    const quantity = Number(quantities[key] || 0);
    if (isReplacement) return sum;
    const unitRate = isPurchaseReturn ? Number(item.rate) : Number(item.quantity) > 0 ? Number(item.amount) / Number(item.quantity) : Number(item.rate);
    return sum + unitRate * quantity;
  }, 0), [isPurchaseReturn, isReplacement, quantities, selectedLines]);

  const setLineQuantity = (item, value) => {
    const key = isPurchaseReturn ? item.purchaseId : item.sourceItemIndex;
    setQuantities((current) => ({ ...current, [key]: value }));
  };

  const saveReturn = async (event) => {
    event.preventDefault();
    if (!partyId) return setError(`Select a ${isPurchaseReturn ? "vendor" : "customer"} first.`);
    if (!source) return setError(`Select the original ${isPurchaseReturn ? "purchase" : "sales"} entry first.`);
    if (!selectedLines.length) return setError("Enter a return quantity for at least one invoice line.");
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const items = selectedLines.map((item) => ({
        ...(isPurchaseReturn ? { purchaseId: item.purchaseId } : { sourceItemIndex: item.sourceItemIndex }),
        quantity: Number(quantities[isPurchaseReturn ? item.purchaseId : item.sourceItemIndex]),
      }));
      const response = await fetch(`${API_URL}/api/transaction-returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type, sourceEntryId: source.id, invoiceDate, reason, items }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || `Unable to save ${type.toLowerCase()}.`);
      setMessage(`${result.data.returnNumber} saved for original entry ${result.data.sourceEntryNo}.`);
      setQuantities({});
      setReason("");
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const visibleEntries = entries.filter((entry) => `${entry.returnNumber} ${entry.sourceEntryNo} ${entry.partyName} ${entry.reason || ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const title = isPurchaseReturn ? "Purchase return" : type;
  const sourceLabel = isPurchaseReturn ? "Purchase invoice" : "Sales invoice";
  const originalRateLabel = isPurchaseReturn ? "Purchase rate" : "Sale rate";

  return (
    <div className="mx-auto max-w-375">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Transaction management</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {isPurchaseReturn
              ? "Select a vendor, choose one of their purchase invoices, then enter returned quantities."
              : isReplacement
                ? "Select a customer, choose one of their sales invoices, then record remaining replacement quantities."
                : "Select a customer, choose one of their sales invoices, then enter returned quantities."}
          </p>
        </div>
        <button type="button" onClick={() => { setLoading(true); setError(""); loadData(); }} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 lg:self-auto">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh
        </button>
      </header>

      {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

      <form onSubmit={saveReturn} className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs font-semibold text-slate-500">{isPurchaseReturn ? "Vendor" : "Customer"}
              <select value={partyId} onChange={(event) => { setPartyId(event.target.value); setSourceId(""); setQuantities({}); setError(""); }} required className="mt-1 block h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-primary">
                <option value="">Select {isPurchaseReturn ? "a vendor" : "a customer"} first</option>
                {parties.map((party) => <option key={party.id} value={party.id}>{party.name} · {party.invoiceCount} {party.invoiceCount === 1 ? "invoice" : "invoices"}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">{sourceLabel}
              <select value={sourceId} disabled={!partyId} onChange={(event) => { setSourceId(event.target.value); setQuantities({}); setError(""); }} required className="mt-1 block h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400">
                <option value="">{partyId ? "Select an invoice" : "Select a party first"}</option>
                {partySources.map((entry) => <option key={entry.id} value={entry.id}>{entry.entryNumber} · {formatDate(entry.invoiceDate)} · {money(entry.total)}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">Return invoice date
              <span className="relative mt-1 block"><CalendarDays aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} required className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-800 outline-none focus:border-primary" /></span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs font-semibold text-slate-500">Customer / vendor</p><p className="mt-1 flex h-11 items-center truncate rounded-lg bg-slate-50 px-3 text-sm font-medium text-slate-800">{source?.partyName || (partyId ? parties.find((party) => party.id === partyId)?.name : "Select a party") || "Select a party"}</p></div>
              <div><p className="text-xs font-semibold text-slate-500">Original invoice date</p><p className="mt-1 flex h-11 items-center rounded-lg bg-slate-50 px-3 text-sm font-medium text-slate-800">{formatDate(source?.invoiceDate)}</p></div>
            </div>
          </div>
          <label className="block text-xs font-semibold text-slate-500">Reason for {isReplacement ? "replacement" : "return"} <span className="font-normal text-slate-400">(optional)</span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={2} placeholder={isReplacement ? "Why is this item being replaced?" : "For example: damaged, expired, incorrect item..."} className="mt-1 block w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none placeholder:text-slate-400 focus:border-primary" />
          </label>
          {source && <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-emerald-50/70 px-3 py-2 text-xs text-slate-600">
            <span><strong className="text-slate-800">Original entry:</strong> {source.entryNumber}</span>
            <span><strong className="text-slate-800">Location:</strong> {source.location?.name || "—"}</span>
              <span><strong className="text-slate-800">Available lines:</strong> {(source.items || []).filter((item) => item.availableQuantity > 0).length}</span>
          </div>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>{["Sr. No.", "Invoice date", "Entry no.", "Product", "Batch / variant", "MRP", originalRateLabel, "Available qty", isReplacement ? "Replace qty" : "Return qty", "Amount"].map((heading) => <th key={heading} className="whitespace-nowrap px-3 py-3 font-semibold">{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {source?.items?.map((item, index) => {
                const key = isPurchaseReturn ? item.purchaseId : item.sourceItemIndex;
                const available = Number(item.availableQuantity) || 0;
                const quantity = Number(quantities[key] || 0);
                const rate = isPurchaseReturn ? Number(item.rate) : Number(item.quantity) > 0 ? Number(item.amount) / Number(item.quantity) : Number(item.rate);
                const amount = isReplacement ? 0 : rate * quantity;
                return <tr key={key} className={available > 0 ? "hover:bg-slate-50" : "bg-slate-50/60 text-slate-400"}>
                  <td className="px-3 py-3 text-slate-500">{index + 1}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-500">{formatDate(source.invoiceDate)}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-semibold text-primary">{source.entryNumber}</td>
                  <td className="px-3 py-3 font-medium text-slate-800">{item.productName}<span className="mt-0.5 block text-xs font-normal text-slate-500">{item.variant || "—"}</span></td>
                  <td className="px-3 py-3 text-slate-600">{item.batchNumber || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">{money(item.mrp)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{money(item.rate)}</td>
                  <td className="px-3 py-3 text-slate-600">{available}</td>
                  <td className="px-3 py-3"><input type="number" min="0" max={available} step="1" value={quantities[key] ?? ""} disabled={!available} onChange={(event) => setLineQuantity(item, event.target.value)} aria-label={`${isReplacement ? "Replacement" : "Return"} quantity for ${item.productName}`} className="h-9 w-24 rounded-md border border-slate-200 bg-white px-2 text-right text-sm outline-none focus:border-primary disabled:bg-slate-100" /></td>
                  <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">{money(amount)}</td>
                </tr>;
              })}
              {!source && <tr><td colSpan="10" className="px-5 py-14 text-center text-sm text-slate-500">{partyId ? `Choose an original ${isPurchaseReturn ? "purchase" : "sales"} invoice to load its returnable product lines.` : `Select a ${isPurchaseReturn ? "vendor" : "customer"} to view their invoices.`}</td></tr>}
              {source && !source.items.length && <tr><td colSpan="10" className="px-5 py-14 text-center text-sm text-slate-500">This invoice has no product lines.</td></tr>}
            </tbody>
            {source && <tfoot className="border-t border-slate-200 bg-slate-50"><tr>
              <td colSpan="8" className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Selected lines: {selectedLines.length}</td>
              <td className="px-3 py-3 text-right text-xs font-semibold text-slate-600">Net amount</td>
              <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-900">{money(returnTotal)}</td>
            </tr></tfoot>}
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="text-xs text-slate-500">{isReplacement ? "Replacement entries issue the same product quantity from available stock; returned goods are not counted as sellable stock." : "Stock and batch quantities update when the return is saved."}</p>
          <button type="submit" disabled={saving || !source || !selectedLines.length} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{saving ? "Saving entry..." : `Save ${type.toLowerCase()}`}
          </button>
        </div>
      </form>

      <section className="mt-7 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div><h2 className="text-sm font-bold text-slate-900">{title} register</h2><p className="mt-1 text-xs text-slate-500">{entries.length.toLocaleString("en-IN")} saved entries</p></div>
          <label className="relative block sm:w-72"><span className="sr-only">Search return register</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Return no., entry no., name" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary" /></label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr>{["Return invoice", "Invoice date", "Original entry", "Customer / vendor", "Reason", "Lines", "Location", "Net amount"].map((heading) => <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {visibleEntries.map((entry) => <tr key={entry._id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-3 py-3 font-semibold text-primary">{entry.returnNumber}</td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDate(entry.invoiceDate)}</td>
                <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-800">{entry.sourceEntryNo}</td>
                <td className="px-3 py-3 text-slate-600">{entry.partyName || "—"}</td>
                <td className="max-w-64 truncate px-3 py-3 text-slate-600" title={entry.reason || "No reason provided"}>{entry.reason || "—"}</td>
                <td className="px-3 py-3 text-slate-600">{entry.items?.length || 0}</td>
                <td className="px-3 py-3 text-slate-600">{entry.location?.name || "—"}</td>
                <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">{money(entry.total)}</td>
              </tr>)}
              {!loading && !visibleEntries.length && <tr><td colSpan="8" className="px-5 py-12 text-center text-sm text-slate-500"><RotateCcw className="mx-auto mb-2 h-5 w-5 text-slate-300" />No {type.toLowerCase()} entries found.</td></tr>}
              {loading && <tr><td colSpan="8" className="px-5 py-12 text-center text-sm text-slate-500">Loading transaction register...</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminTransactionReturns;
