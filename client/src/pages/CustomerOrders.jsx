import { useEffect, useState } from "react";
import { Check, Clock3, Package, Truck, XCircle } from "lucide-react";
import Footer from "../components/home/Footer";

const API_URL = import.meta.env.VITE_API_URL || "";

const statusSteps = ["Pending", "Processing", "Shipped", "Delivered"];

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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () =>
    fetch(`${API_URL}/api/orders/mine`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        setOrders(result.data || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const cancel = async (order) => {
    if (!window.confirm(`Cancel order #${order.orderNumber}?`)) return;

    const response = await fetch(`${API_URL}/api/orders/${order._id}/cancel`, {
      method: "PATCH",
      credentials: "include",
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.message);
      return;
    }

    setOrders((current) =>
      current.map((item) => (item._id === order._id ? result.data : item)),
    );
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
      <main className="min-h-[55vh] bg-gray-50 py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Order tracking</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Your orders</h1>
          <p className="mt-2 text-gray-500">Follow or cancel eligible orders.</p>

          {loading ? (
            <div className="mt-8 rounded-xl bg-white p-12 text-center text-sm text-gray-500">
              Loading your orders...
            </div>
          ) : error ? (
            <div className="mt-8 rounded-xl bg-red-50 p-6 text-sm text-red-700">{error}</div>
          ) : orders.length ? (
            <div className="mt-8 space-y-5">
              {orders.map((order) => (
                <article
                  key={order._id}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <h2 className="font-bold text-gray-900">#{order.orderNumber}</h2>
                      <p className="mt-1 text-xs text-gray-500">
                        Placed {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-sm font-semibold">
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
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => downloadPdf(order)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Download PDF
                      </button>
                    </div>
                  </div>

                  {order.status === "Cancelled" ? (
                    <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      This order was cancelled.
                    </p>
                  ) : (
                    <OrderTimeline status={order.status} />
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
            <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-16 text-center">
              <Package className="mx-auto h-10 w-10 text-gray-300" />
              <h2 className="mt-4 font-semibold text-gray-900">No orders yet</h2>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CustomerOrders;
