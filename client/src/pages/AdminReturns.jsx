import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, RotateCcw, Search } from "lucide-react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";
const returnStatuses = ["All", "Requested", "Approved", "Rejected", "Completed"];
const money = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

const AdminReturns = () => {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Requested");
  const [staffNotes, setStaffNotes] = useState({});
  const [refundAmounts, setRefundAmounts] = useState({});
  const [refundModes, setRefundModes] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadOrders = async () => {
    const response = await fetch(`${API_URL}/api/admin/orders`, { credentials: "include" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Unable to load return requests.");
    setOrders((result.data || []).filter((order) => order.returnStatus && order.returnStatus !== "Not requested"));
  };

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/admin/orders`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load return requests.");
        return result.data || [];
      })
      .then((items) => {
        if (active) setOrders(items.filter((order) => order.returnStatus && order.returnStatus !== "Not requested"));
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visibleOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = statusFilter === "All" || order.returnStatus === statusFilter;
      const matchesQuery = `${order.orderNumber} ${order.customer?.name || ""} ${order.customer?.email || ""}`.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [orders, query, statusFilter]);

  const updateReturn = async (order, status) => {
    setSavingId(order._id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/api/admin/orders/${order._id}/return-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, note: (staffNotes[order._id] || "").trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to update this return.");
      setOrders((current) => current.map((item) => item._id === order._id ? result.data : item));
      setStaffNotes((current) => ({ ...current, [order._id]: "" }));
      setMessage(`Order #${order.orderNumber} return marked ${status.toLowerCase()}.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingId("");
    }
  };

  const issueRefund = async (order) => {
    const amount = Number(refundAmounts[order._id] ?? order.total);
    const automaticAvailable = order.paymentMethod === "razorpay" && order.paymentStatus === "Paid" && Boolean(order.razorpayPaymentId);
    const mode = refundModes[order._id] || (automaticAvailable ? "razorpay" : "manual");
    if (!Number.isFinite(amount) || amount <= 0 || amount > Number(order.total)) {
      setError(`Enter a refund amount between ₹0.01 and ${money(order.total)} for order #${order.orderNumber}.`);
      return;
    }
    setSavingId(order._id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/api/admin/orders/${order._id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount, mode, note: (staffNotes[order._id] || "").trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to process this refund.");
      setOrders((current) => current.map((item) => item._id === order._id ? result.data : item));
      setMessage(result.data.refundStatus === "Refunded"
        ? `${money(result.data.refundAmount)} ${mode === "razorpay" ? "refunded through Razorpay" : "recorded as refunded"} for order #${order.orderNumber}.`
        : result.data.refundStatus === "Failed"
          ? `Razorpay reported a failed refund for order #${order.orderNumber}. Review the provider response before retrying.`
          : `Refund for order #${order.orderNumber} is awaiting Razorpay confirmation.`);
    } catch (requestError) {
      setError(requestError.message);
      await loadOrders().catch(() => {});
    } finally {
      setSavingId("");
    }
  };

  const counts = {
    requested: orders.filter((order) => order.returnStatus === "Requested").length,
    approved: orders.filter((order) => order.returnStatus === "Approved").length,
    completed: orders.filter((order) => order.returnStatus === "Completed").length,
    refunded: orders.filter((order) => order.refundStatus === "Refunded").length,
  };

  return (
    <div className="mx-auto max-w-375">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Admin workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Returns & replacements</h1>
          <p className="mt-2 text-sm text-slate-500">Review customer requests, track returned items, and process refunds.</p>
        </div>
        <button type="button" onClick={() => { setLoading(true); loadOrders().catch((requestError) => setError(requestError.message)).finally(() => setLoading(false)); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RotateCcw className="h-4 w-4" />Refresh</button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[["Awaiting review", counts.requested], ["Approved", counts.approved], ["Completed", counts.completed], ["Refunded", counts.refunded]].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-white px-4 py-3"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-900">{value}</p></div>)}
      </div>

      {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

      <div className="mt-6 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Filter return status">
          {returnStatuses.map((status) => <button key={status} type="button" role="tab" aria-selected={statusFilter === status} onClick={() => setStatusFilter(status)} className={`shrink-0 border-b-2 px-3 py-2 text-sm font-semibold ${statusFilter === status ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{status}</button>)}
        </div>
        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Search returns</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Order or customer" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary" />
        </label>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading return requests...</div> : visibleOrders.length ? visibleOrders.map((order) => {
          const automaticAvailable = order.paymentMethod === "razorpay" && order.paymentStatus === "Paid" && Boolean(order.razorpayPaymentId);
          const refundMode = refundModes[order._id] || (automaticAvailable ? "razorpay" : "manual");
          const tone = order.returnStatus === "Rejected" ? "bg-red-50 text-red-700" : order.returnStatus === "Completed" ? "bg-emerald-50 text-emerald-700" : order.returnStatus === "Approved" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700";
          return (
            <article key={order._id} className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-900">Order #{order.orderNumber}</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{order.returnType || "Return"}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{order.returnStatus}</span></div>
                  <p className="mt-1 text-xs text-slate-500">{order.customer?.name || order.shipping?.name || "Customer"} · {order.customer?.email || order.shipping?.phone || ""} · {new Date(order.returnRequestedAt || order.createdAt).toLocaleString("en-IN")}</p>
                </div>
                <Link to={`/admin/orders/${order._id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Order details <ArrowUpRight className="h-3.5 w-3.5" /></Link>
              </div>

              <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer reason</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{order.returnReason || "No reason provided."}</p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500"><span>Order total {money(order.total)}</span><span>Payment {order.paymentMethod || "Unknown"} · {order.paymentStatus || "Pending"}</span></div>
                  {order.returnAdminNote && <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600"><span className="font-semibold">Staff update:</span> {order.returnAdminNote}</p>}
                </div>

                <div className="border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                  {(order.returnStatus === "Requested" || order.returnStatus === "Approved") && <>
                    <label className="block text-xs font-semibold text-slate-600" htmlFor={`staff-note-${order._id}`}>Update for customer</label>
                    <textarea id={`staff-note-${order._id}`} value={staffNotes[order._id] || ""} onChange={(event) => setStaffNotes((current) => ({ ...current, [order._id]: event.target.value }))} maxLength={500} rows={2} placeholder="Optional decision or handling note" className="mt-2 w-full resize-y rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-primary" />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {order.returnStatus === "Requested" ? <>
                        <button type="button" disabled={savingId === order._id} onClick={() => updateReturn(order, "Approved")} className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">Approve</button>
                        <button type="button" disabled={savingId === order._id} onClick={() => updateReturn(order, "Rejected")} className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">Reject</button>
                      </> : <button type="button" disabled={savingId === order._id} onClick={() => updateReturn(order, "Completed")} className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60">Mark {order.returnType === "Replacement" ? "replacement" : "return"} complete</button>}
                    </div>
                  </>}

                  {order.returnStatus === "Completed" && order.returnType === "Return" && (order.refundStatus === "Refunded" ? (
                    <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"><p className="font-semibold">Refund completed · {money(order.refundAmount)}</p><p className="mt-1 text-xs">{order.refundMethod === "Razorpay" ? `Razorpay reference ${order.refundId || "recorded"}` : "Recorded as a manual refund"}{order.refundedAt ? ` · ${new Date(order.refundedAt).toLocaleString("en-IN")}` : ""}</p></div>
                  ) : order.refundStatus === "Processing" ? (
                    <p role="status" className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">Refund is processing. Verify the payment provider before retrying.{order.refundNote ? ` ${order.refundNote}` : ""}</p>
                  ) : <>
                    {order.refundStatus === "Failed" && <p role="alert" className="mb-2 rounded-md bg-red-50 p-3 text-xs text-red-700">{order.refundNote || "The provider reported a refund failure. Review before retrying."}</p>}
                    <p className="text-sm font-semibold text-slate-800">Process refund</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <label className="text-xs font-medium text-slate-600">Amount<input type="number" min="0.01" max={Number(order.total)} step="0.01" value={refundAmounts[order._id] ?? order.total} onChange={(event) => setRefundAmounts((current) => ({ ...current, [order._id]: event.target.value }))} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-2.5 text-sm outline-none focus:border-primary" /></label>
                      <label className="text-xs font-medium text-slate-600">Refund method<select value={refundMode} onChange={(event) => setRefundModes((current) => ({ ...current, [order._id]: event.target.value }))} className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-primary"><option value="manual">Record manual refund</option>{automaticAvailable && <option value="razorpay">Issue Razorpay refund</option>}</select></label>
                    </div>
                    <label className="mt-2 block text-xs font-medium text-slate-600">Refund note<textarea value={staffNotes[order._id] || ""} onChange={(event) => setStaffNotes((current) => ({ ...current, [order._id]: event.target.value }))} maxLength={500} rows={2} placeholder="Optional reference or transfer note" className="mt-1 w-full resize-y rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-primary" /></label>
                    <button type="button" disabled={savingId === order._id} onClick={() => issueRefund(order)} className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"><span>{savingId === order._id ? "Processing..." : refundMode === "razorpay" ? "Issue refund" : "Record refund"}</span></button>
                  </>)}
                </div>
              </div>
            </article>
          );
        }) : <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No return requests match this view.</div>}
      </div>
    </div>
  );
};

export default AdminReturns;
