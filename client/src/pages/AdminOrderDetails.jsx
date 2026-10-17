import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Box, CalendarDays, Check, Clock3, CreditCard, MapPin, Package, Printer, UserRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";
const statuses = ["Processing", "Shipped", "Delivered", "Cancelled"];
const money = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

const AdminOrderDetails = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [returnNote, setReturnNote] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/admin/orders/${orderId}`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load order details.");
        return result.data;
      })
      .then((data) => { if (active) setOrder(data); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orderId]);

  const updateStatus = async (status) => {
    setUpdating(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to update order status.");
      setOrder((current) => ({ ...current, ...result.data }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdating(false);
    }
  };

  const updateReturnStatus = async (status) => {
    setUpdating(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/admin/orders/${orderId}/return-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, note: returnNote.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to update return status.");
      setOrder((current) => ({ ...current, ...result.data }));
      setReturnNote("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading order details...</div>;
  if (error && !order) return <div className="rounded-xl bg-red-50 p-6 text-sm text-red-700">{error}</div>;
  if (!order) return null;

  const items = order.items || [];
  const statusTone = order.status === "Cancelled" ? "bg-red-50 text-red-700" : order.status === "Delivered" ? "bg-emerald-50 text-emerald-700" : order.status === "Shipped" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700";

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400"><Link to="/admin/orders" className="hover:text-primary">Orders</Link><span>/</span><span className="text-slate-600">Order details</span></div>
          <div className="mt-2 flex flex-wrap items-center gap-3"><Link to="/admin/orders" aria-label="Back to orders" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-primary"><ArrowLeft className="h-4 w-4" /></Link><h1 className="text-2xl font-bold text-slate-900">Order #{order.orderNumber}</h1><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone}`}>{order.status}</span></div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays className="h-3.5 w-3.5" />Placed {new Date(order.createdAt).toLocaleString("en-IN")}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="order-status">Order status</label>
          <select id="order-status" value={order.status} disabled={updating} onChange={(event) => updateStatus(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary disabled:opacity-60">{statuses.map((status) => <option key={status}>{status}</option>)}</select>
          <button type="button" onClick={() => window.print()} aria-label="Print order" title="Print order" className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-500 hover:text-primary"><Printer className="h-4 w-4" /></button>
        </div>
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="min-w-0 space-y-5">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">Order summary</h2></div>
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              {[["Order ID", `#${order.orderNumber}`], ["Date of purchase", new Date(order.createdAt).toLocaleString("en-IN")], ["Payment status", order.paymentStatus || "Pending"], ["Amount", money(order.total)]].map(([label, value]) => <div key={label}><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div>)}
            </div>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" />{order.paymentMethod || "-"}</span>
              <span className="inline-flex items-center gap-1.5"><Box className="h-3.5 w-3.5" />{order.store?.name || "Main store"}</span>
              <span>{order.items?.length || 0} line items</span>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-semibold text-slate-900">Items</h2><p className="mt-1 text-xs text-slate-500">Products included in this order</p></div><span className="text-xs text-slate-400">{items.length} items</span></div>
            <div className="divide-y divide-slate-100">
              {items.map((item, index) => <div key={item.product || item._id || `${item.name}-${index}`} className="flex items-center gap-3 px-5 py-4 sm:gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50">{item.image ? <img src={item.image.startsWith("http") ? item.image : `${API_URL}${item.image}`} alt={item.name || ""} className="h-full w-full object-contain p-1" /> : <Package className="h-5 w-5 text-slate-300" />}</div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{item.name || "Product"}</p><p className="mt-1 text-xs text-slate-500">Unit price {money(item.price)}</p></div>
                <p className="hidden text-xs text-slate-500 sm:block">Qty {Number(item.quantity || 1)}</p>
                <p className="w-24 text-right text-sm font-semibold text-slate-800">{money(Number(item.price || 0) * Number(item.quantity || 1))}</p>
              </div>)}
              {!items.length && <p className="p-8 text-center text-sm text-slate-500">No items recorded on this order.</p>}
            </div>
            <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 text-sm">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
              <div className="flex justify-between text-emerald-700"><span>Discount</span><span>−{money(order.discount)}</span></div>
              {order.promoCode && <div className="flex justify-between text-emerald-700"><span>Promo · {order.promoCode}</span><span>−{money(order.promoDiscount)}</span></div>}
              <div className="flex justify-between text-slate-500"><span>Shipping</span><span>{money(order.delivery)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900"><span>Grand total</span><span>{money(order.total)}</span></div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-blue-600" /><h2 className="text-sm font-semibold text-slate-900">Order activity</h2></div>
            <div className="mt-5 space-y-4">
              <div className="flex gap-3"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Check className="h-3.5 w-3.5" /></span><div><p className="text-sm font-medium text-slate-800">Order placed</p><p className="mt-1 text-xs text-slate-500">{new Date(order.createdAt).toLocaleString("en-IN")}</p></div></div>
              {order.cancelledAt && <div className="flex gap-3"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700">×</span><div><p className="text-sm font-medium text-red-700">Order cancelled</p><p className="mt-1 text-xs text-slate-500">{new Date(order.cancelledAt).toLocaleString("en-IN")}</p>{order.cancelReason && <p className="mt-2 rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-800">{order.cancelReason}</p>}</div></div>}
              {!order.cancelledAt && <div className="flex gap-3"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700"><Clock3 className="h-3.5 w-3.5" /></span><div><p className="text-sm font-medium text-slate-800">Current status: {order.status}</p><p className="mt-1 text-xs text-slate-500">Payment status: {order.paymentStatus}</p></div></div>}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2"><h2 className="text-sm font-semibold text-slate-900">Return request</h2>{order.returnStatus !== "Not requested" && <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{order.returnType || "Return"}</span>}</div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${order.returnStatus === "Rejected" ? "bg-red-50 text-red-700" : order.returnStatus === "Completed" ? "bg-emerald-50 text-emerald-700" : order.returnStatus === "Not requested" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}`}>{order.returnStatus || "Not requested"}</span>
            </div>
            {order.returnStatus && order.returnStatus !== "Not requested" ? (
              <>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{order.returnReason}</p>
                {order.returnRequestedAt && <p className="mt-2 text-xs text-slate-400">Requested {new Date(order.returnRequestedAt).toLocaleString("en-IN")}</p>}
                {order.returnAdminNote && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600"><span className="font-semibold">Staff update:</span> {order.returnAdminNote}</p>}
                {order.refundStatus === "Refunded" && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Refunded {money(order.refundAmount)} via {order.refundMethod === "Razorpay" ? `Razorpay (${order.refundId || "no reference"})` : "manual transfer"}.</p>}
                {order.refundStatus === "Processing" && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Refund is processing. {order.refundNote}</p>}
                {order.refundStatus === "Failed" && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{order.refundNote || "Razorpay reported that the refund failed."}</p>}
                {order.returnStatus === "Completed" && order.returnType === "Return" && order.refundStatus !== "Refunded" && <Link to="/admin/returns" className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline">Process refund in Returns</Link>}
                {order.returnStatus === "Requested" || order.returnStatus === "Approved" ? (
                  <div className="mt-4">
                    <label htmlFor="return-staff-note" className="block text-xs font-semibold text-slate-600">Update for customer</label>
                    <textarea id="return-staff-note" rows={3} maxLength={500} value={returnNote} onChange={(event) => setReturnNote(event.target.value)} className="mt-2 w-full resize-y rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-primary" placeholder="Optional note about this decision" />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {order.returnStatus === "Requested" ? <>
                        <button type="button" disabled={updating} onClick={() => updateReturnStatus("Approved")} className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">Approve {order.returnType === "Replacement" ? "replacement" : "return"}</button>
                        <button type="button" disabled={updating} onClick={() => updateReturnStatus("Rejected")} className="rounded-lg border border-red-200 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">Reject {order.returnType === "Replacement" ? "replacement" : "return"}</button>
                      </> : (
                        <button type="button" disabled={updating} onClick={() => updateReturnStatus("Completed")} className="rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60">Mark {order.returnType === "Replacement" ? "replacement" : "return"} complete</button>
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            ) : <p className="mt-4 text-sm text-slate-500">No return has been requested for this order.</p>}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4"><UserRound className="h-4 w-4 text-blue-600" /><h2 className="text-sm font-semibold text-slate-900">Customer details</h2></div>
            <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-xs text-slate-400">Full name</dt><dd className="mt-1 font-medium text-slate-700">{order.customer?.name || order.shipping?.name || "Customer"}</dd></div><div><dt className="text-xs text-slate-400">Email address</dt><dd className="mt-1 break-all font-medium text-slate-700">{order.customer?.email || "-"}</dd></div>{order.customer?.businessName && <div><dt className="text-xs text-slate-400">Business</dt><dd className="mt-1 font-medium text-slate-700">{order.customer.businessName}</dd></div>}<div><dt className="text-xs text-slate-400">Phone number</dt><dd className="mt-1 font-medium text-slate-700">{order.shipping?.phone || "-"}</dd></div></dl>
            <Link to="/admin/customers" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">Customer directory <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4"><MapPin className="h-4 w-4 text-blue-600" /><h2 className="text-sm font-semibold text-slate-900">Shipping information</h2></div>
            <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-xs text-slate-400">Recipient</dt><dd className="mt-1 font-medium text-slate-700">{order.shipping?.name || "-"}</dd></div><div><dt className="text-xs text-slate-400">Address</dt><dd className="mt-1 leading-5 text-slate-700">{order.shipping?.address || "-"}<br />{order.shipping?.city || "-"} {order.shipping?.pincode || ""}</dd></div><div><dt className="text-xs text-slate-400">Fulfilled by</dt><dd className="mt-1 font-medium text-slate-700">{order.store?.name || "Main store"}{order.store?.city ? ` · ${order.store.city}` : ""}</dd></div></dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4"><CreditCard className="h-4 w-4 text-blue-600" /><h2 className="text-sm font-semibold text-slate-900">Payment details</h2></div>
            <dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-slate-500">Method</dt><dd className="font-medium capitalize text-slate-700">{order.paymentMethod || "-"}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Status</dt><dd className="font-medium text-slate-700">{order.paymentStatus || "Pending"}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Subtotal</dt><dd className="font-medium text-slate-700">{money(order.subtotal)}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Shipping fee</dt><dd className="font-medium text-slate-700">{money(order.delivery)}</dd></div><div className="flex justify-between gap-3 border-t border-slate-100 pt-3 font-bold text-slate-900"><dt>Total paid</dt><dd>{money(order.total)}</dd></div></dl>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default AdminOrderDetails;