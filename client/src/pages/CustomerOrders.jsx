import { useEffect, useState } from "react";
import { Check, Clock3, Package, ShoppingCart, X, XCircle } from "lucide-react";
import CustomerAccountNav from "../components/customer/CustomerAccountNav";
import Footer from "../components/home/Footer";
import { useCart } from "../context/cartContext";

const API_URL = import.meta.env.VITE_API_URL || "";

const statusSteps = ["Pending", "Processing", "Shipped", "Delivered"];
const availableReturnTypes = (order) => {
  const items = order?.items || [];
  if (!items.length) return [];
  return [
    ...(items.every((item) => item.returnEligible) ? ["Return"] : []),
    ...(items.every((item) => item.replaceEligible) ? ["Replacement"] : []),
  ];
};

const OrderTimeline = ({ status }) => {
  const activeIndex = status === "Cancelled" ? -1 : statusSteps.indexOf(status);

  return (
    <div className="mt-5">
      <div className="flex items-center gap-2">
        {statusSteps.map((step, index) => {
          const isDone = status !== "Cancelled" && index <= activeIndex;
          const isCurrent = status !== "Cancelled" && index === activeIndex;

          return (
            <div key={step} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                  isDone
                    ? "border-primary bg-primary text-white"
                    : isCurrent
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-300 bg-white text-gray-400"
                }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : <span className="text-[10px] font-bold">{index + 1}</span>}
              </div>

              {index < statusSteps.length - 1 && (
                <div className={`h-0.5 flex-1 ${isDone ? "bg-primary" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-gray-500">
        {statusSteps.map((step) => (
          <span key={step} className={status === step || (status !== "Cancelled" && statusSteps.indexOf(status) >= statusSteps.indexOf(step)) ? "text-primary" : ""}>
            {step}
          </span>
        ))}
      </div>
    </div>
  );
};

const CustomerOrders = () => {
  const { addProductsToCart } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelingOrder, setCancelingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelSaving, setCancelSaving] = useState(false);
  const [returningOrder, setReturningOrder] = useState(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnType, setReturnType] = useState("Return");
  const [returnError, setReturnError] = useState("");
  const [returnSaving, setReturnSaving] = useState(false);
  const [reorderingOrderId, setReorderingOrderId] = useState("");
  const [reorderFeedback, setReorderFeedback] = useState({});

  const load = () =>
    fetch(`${API_URL}/api/orders/mine`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        setOrders(result.data || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  const reorder = async (order) => {
    setReorderingOrderId(order._id);
    setReorderFeedback((current) => ({ ...current, [order._id]: "" }));
    try {
      const response = await fetch(`${API_URL}/api/catalog/products`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to check current product availability.");

      const catalog = new Map((result.data || []).map((product) => [String(product._id), product]));
      const requestedItems = (order.items || []).map((item) => {
        const currentProduct = catalog.get(String(item.product));
        if (!currentProduct) return { name: item.name, stock: 0, quantity: item.quantity };
        return {
          ...currentProduct,
          id: currentProduct._id,
          image: currentProduct.image?.startsWith("/") ? `${API_URL}${currentProduct.image}` : currentProduct.image,
          quantity: item.quantity,
        };
      });
      const { addedQuantity, unavailable } = addProductsToCart(requestedItems);
      const message = addedQuantity
        ? `${addedQuantity} item${addedQuantity === 1 ? "" : "s"} added to your cart${unavailable.length ? ". Some products were unavailable or limited by current stock." : "."}`
        : "No additional quantity could be added; these items may be out of stock or already at their stock limit.";
      setReorderFeedback((current) => ({ ...current, [order._id]: message }));
    } catch (requestError) {
      setReorderFeedback((current) => ({ ...current, [order._id]: requestError.message }));
    } finally {
      setReorderingOrderId("");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cancel = (order) => {
    setCancelingOrder(order);
    setCancelReason("");
    setCancelError("");
  };

  const submitCancellation = async (event) => {
    event.preventDefault();
    const reason = cancelReason.trim();
    if (reason.length < 3) {
      setCancelError("Please enter a reason (at least 3 characters).");
      return;
    }
    if (!cancelingOrder) return;

    setCancelSaving(true);
    setCancelError("");
    try {
      const response = await fetch(`${API_URL}/api/orders/${cancelingOrder._id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to cancel this order.");
      setOrders((current) => current.map((item) => (item._id === cancelingOrder._id ? result.data : item)));
      setCancelingOrder(null);
    } catch (requestError) {
      setCancelError(requestError.message);
    } finally {
      setCancelSaving(false);
    }
  };

  const submitReturnRequest = async (event) => {
    event.preventDefault();
    const reason = returnReason.trim();
    if (reason.length < 3) {
      setReturnError("Please enter a reason (at least 3 characters).");
      return;
    }
    if (!returningOrder) return;

    setReturnSaving(true);
    setReturnError("");
    try {
      const response = await fetch(`${API_URL}/api/orders/${returningOrder._id}/return`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason, type: returnType }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to request a return.");
      setOrders((current) => current.map((item) => (item._id === returningOrder._id ? result.data : item)));
      setReturningOrder(null);
    } catch (requestError) {
      setReturnError(requestError.message);
    } finally {
      setReturnSaving(false);
    }
  };

  const downloadPdf = (order) => {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    const itemsHtml = (order.items || []).map((item) => `
      <tr>
        <td>${item.name || "Product"}</td>
        <td>${Number(item.quantity || 1)}</td>
        <td>₹${Number(item.price || 0).toLocaleString("en-IN")}</td>
        <td>₹${(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString("en-IN")}</td>
      </tr>
    `).join("");

    const content = `
      <html>
        <head>
          <title>Order ${order.orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #1f2937; margin: 24px; }
            h1 { margin-bottom: 8px; }
            .meta { margin-bottom: 18px; color: #4b5563; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
            th { background: #f3f4f6; }
            .totals { margin-top: 20px; width: 280px; margin-left: auto; }
            .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
            .grand { font-weight: bold; font-size: 18px; }
          </style>
        </head>
        <body>
          <h1>Order Invoice</h1>
          <div class="meta">
            <div><strong>Order:</strong> #${order.orderNumber}</div>
            <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</div>
            <div><strong>Status:</strong> ${order.status || "Processing"}</div>
          </div>

          <div class="meta">
            <div><strong>Customer:</strong> ${order.shipping?.name || "Customer"}</div>
            <div><strong>Address:</strong> ${order.shipping?.address || "-"}, ${order.shipping?.city || "-"} - ${order.shipping?.pincode || "-"}</div>
            <div><strong>Phone:</strong> ${order.shipping?.phone || "-"}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <div class="totals">
            <div class="totals-row"><span>Subtotal</span><span>₹${Number(order.subtotal || 0).toLocaleString("en-IN")}</span></div>
            <div class="totals-row"><span>Discount</span><span>-₹${Number(order.discount || 0).toLocaleString("en-IN")}</span></div>
            <div class="totals-row"><span>Delivery</span><span>₹${Number(order.delivery || 0).toLocaleString("en-IN")}</span></div>
            <div class="totals-row grand"><span>Total</span><span>₹${Number(order.total || 0).toLocaleString("en-IN")}</span></div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <>
      <main className="min-h-[55vh] bg-[#f4f7f5] py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <CustomerAccountNav />
            <section className="min-w-0">
              <div className="rounded-3xl bg-gradient-to-br from-[#063d34] via-[#075747] to-[#0b7660] px-5 py-6 text-white shadow-lg shadow-emerald-950/10 sm:px-7 sm:py-8">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200">Customer account</p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold sm:text-3xl">Your orders</h1>
                    <p className="mt-2 max-w-lg text-sm leading-6 text-emerald-50/80">Track deliveries, review purchases, and manage eligible orders.</p>
                  </div>
                  {!loading && !error && <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">{orders.length} {orders.length === 1 ? "order" : "orders"}</span>}
                </div>
              </div>

          {loading ? (
            <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-sm text-gray-500 shadow-sm">
              Loading your orders...
            </div>
          ) : error ? (
            <div className="mt-6 rounded-xl bg-red-50 p-6 text-sm text-red-700">{error}</div>
          ) : orders.length ? (
            <div className="mt-6 space-y-4">
              {orders.map((order) => (
              <article
                  key={order._id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-emerald-200 sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <h2 className="font-bold text-gray-900">#{order.orderNumber}</h2>
                      <p className="mt-1 text-xs text-gray-500">
                        Placed {new Date(order.createdAt).toLocaleString()}
                      </p>
                      {order.store?.name && <p className="mt-1 text-xs font-medium text-slate-500">Store: {order.store.name}{order.store.city ? ` · ${order.store.city}` : ""}</p>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold sm:gap-3">
                      {order.status === "Cancelled" ? (
                        <>
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="text-red-600">Cancelled</span>
                        </>
                      ) : (
                        <>
                          <Clock3 className="h-4 w-4 text-primary" />
                          <span className="text-primary">{order.status}</span>
                          {order.status === "Processing" && (
                            <button
                              type="button"
                              onClick={() => cancel(order)}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                            >
                              Cancel order
                            </button>
                          )}
                          {order.status === "Delivered" && (!order.returnStatus || order.returnStatus === "Not requested") && availableReturnTypes(order).length > 0 && (
                            <button
                              type="button"
                              onClick={() => { setReturningOrder(order); setReturnType(availableReturnTypes(order)[0]); setReturnReason(""); setReturnError(""); }}
                              className="rounded-lg border border-primary/30 px-3 py-1.5 text-xs text-primary hover:bg-primary/5"
                            >
                              {availableReturnTypes(order).length > 1 ? "Request return or replacement" : `Request ${availableReturnTypes(order)[0].toLowerCase()}`}
                            </button>
                          )}
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => downloadPdf(order)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Download PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => reorder(order)}
                        disabled={reorderingOrderId === order._id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        {reorderingOrderId === order._id ? "Checking stock..." : "Buy again"}
                      </button>
                    </div>
                  </div>

                  {reorderFeedback[order._id] && <p role="status" className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">{reorderFeedback[order._id]}</p>}

                  {order.status === "Cancelled" ? (
                    <div className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      <p>This order was cancelled.</p>
                      {order.cancelReason && <p className="mt-1 text-red-800"><span className="font-semibold">Reason:</span> {order.cancelReason}</p>}
                    </div>
                  ) : (
                    <OrderTimeline status={order.status} />
                  )}

                  {order.returnStatus && order.returnStatus !== "Not requested" && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-800">{order.returnType || "Return"} {order.returnStatus.toLowerCase()}</p>
                        {order.returnRequestedAt && <p className="text-xs text-slate-500">Requested {new Date(order.returnRequestedAt).toLocaleDateString()}</p>}
                      </div>
                      {order.returnReason && <p className="mt-2 text-slate-600"><span className="font-medium">Reason:</span> {order.returnReason}</p>}
                      {order.returnAdminNote && <p className="mt-1 text-slate-600"><span className="font-medium">Update:</span> {order.returnAdminNote}</p>}
                      {order.refundStatus === "Refunded" && <p className="mt-1 text-emerald-700"><span className="font-medium">Refund:</span> ₹{Number(order.refundAmount || 0).toLocaleString("en-IN")} ({order.refundMethod === "Razorpay" ? "processed through Razorpay" : "recorded by the store"})</p>}
                      {order.refundStatus === "Processing" && <p className="mt-1 text-amber-700"><span className="font-medium">Refund:</span> Processing{order.refundMethod === "Razorpay" ? " with the payment provider" : " by the store"}.</p>}
                      {order.refundStatus === "Failed" && <p className="mt-1 text-red-700"><span className="font-medium">Refund:</span> The payment provider reported a failure. Please contact support.</p>}
                    </div>
                  )}

                  <div className="mt-6 grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-gray-400">Items</p>
                      <p className="mt-1 text-sm font-semibold">{order.items?.length || 0} products</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Delivering to</p>
                      <p className="mt-1 text-sm font-semibold">
                        {order.shipping?.city || "N/A"} - {order.shipping?.pincode || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Total</p>
                      <p className="mt-1 text-sm font-bold text-primary">₹{order.total}</p>
                      <p className="mt-1 text-xs font-medium text-emerald-600">Discount: -₹{Number(order.discount || 0).toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-16 text-center shadow-sm">
              <Package className="mx-auto h-10 w-10 text-gray-300" />
              <h2 className="mt-4 font-semibold text-gray-900">No orders yet</h2>
            </div>
          )}
            </section>
          </div>
        </div>
      </main>
      {cancelingOrder && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
        <form onSubmit={submitCancellation} role="dialog" aria-modal="true" aria-labelledby="cancel-order-title" className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-red-600">Cancel order</p>
              <h2 id="cancel-order-title" className="mt-1 text-xl font-bold text-slate-900">Order #{cancelingOrder.orderNumber}</h2>
              <p className="mt-2 text-sm text-slate-500">Please tell us why you want to cancel. This will be visible to our support team.</p>
            </div>
            <button type="button" onClick={() => setCancelingOrder(null)} aria-label="Close cancellation dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
          <label htmlFor="cancellation-reason" className="mt-5 block text-sm font-semibold text-slate-700">Cancellation reason</label>
          <textarea id="cancellation-reason" required minLength={3} maxLength={500} rows={4} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="For example: I ordered the wrong item..." className="mt-2 w-full resize-y rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-primary" />
          <p className="mt-1 text-right text-xs text-slate-400">{cancelReason.length}/500</p>
          {cancelError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{cancelError}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setCancelingOrder(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Keep order</button>
            <button type="submit" disabled={cancelSaving} className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{cancelSaving ? "Cancelling..." : "Confirm cancellation"}</button>
          </div>
        </form>
      </div>}
      {returningOrder && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
        <form onSubmit={submitReturnRequest} role="dialog" aria-modal="true" aria-labelledby="return-order-title" className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Request a {returnType.toLowerCase()}</p>
              <h2 id="return-order-title" className="mt-1 text-xl font-bold text-slate-900">Order #{returningOrder.orderNumber}</h2>
              <p className="mt-2 text-sm text-slate-500">Tell us why you would like to {returnType.toLowerCase()} this order. Our team will review your request.</p>
            </div>
            <button type="button" onClick={() => setReturningOrder(null)} aria-label="Close return request dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
          <label htmlFor="return-type" className="mt-4 block text-sm font-semibold text-slate-700">Request type</label>
          <select id="return-type" value={returnType} onChange={(event) => setReturnType(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary">{availableReturnTypes(returningOrder).map((type) => <option key={type} value={type}>{type}</option>)}</select>
          <label htmlFor="return-reason" className="mt-4 block text-sm font-semibold text-slate-700">Reason</label>
          <textarea id="return-reason" required minLength={3} maxLength={500} rows={4} value={returnReason} onChange={(event) => setReturnReason(event.target.value)} placeholder="Describe the issue with your order..." className="mt-2 w-full resize-y rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-primary" />
          <p className="mt-1 text-right text-xs text-slate-400">{returnReason.length}/500</p>
          {returnError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{returnError}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setReturningOrder(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Keep order</button>
            <button type="submit" disabled={returnSaving} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">{returnSaving ? "Submitting..." : "Submit request"}</button>
          </div>
        </form>
      </div>}
      <Footer />
    </>
  );
};

export default CustomerOrders;
