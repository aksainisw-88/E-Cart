import { useEffect, useState } from "react";
import { Eye, Search } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";
const statuses = ["Processing", "Shipped", "Delivered", "Cancelled"];

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`${API_URL}/api/admin/orders`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        setOrders(result.data);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);
  const updateStatus = async (order, status) => {
    const response = await fetch(
      `${API_URL}/api/admin/orders/${order._id}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      },
    );
    const result = await response.json();
    if (!response.ok) setError(result.message);
    else
      setOrders((items) =>
        items.map((item) =>
          item._id === order._id ? { ...item, status } : item,
        ),
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
            <div><strong>Customer:</strong> ${order.customer?.name || "Customer"}</div>
            <div><strong>Email:</strong> ${order.customer?.email || "-"}</div>
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
  const visible = orders.filter((order) => {
    const matchesQuery = `${order.orderNumber} ${order.customer?.name || ""} ${order.customer?.email || ""}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (statusFilter === "All" || order.status === statusFilter) && (paymentFilter === "All" || order.paymentStatus === paymentFilter);
  });
  return (
    <div className="mx-auto max-w-[1500px]">
      <div>
        <p className="text-sm font-medium text-primary">Admin workspace</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          Orders
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Review payments, update fulfilment status, and inspect order details.
        </p>
      </div>
      {error && (
        <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <section className="mt-8 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:w-80">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search orders..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"><option value="All">All order statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select><select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"><option value="All">All payment statuses</option><option>Paid</option><option>Pending</option><option>Failed</option></select><span className="text-sm text-slate-500">{visible.length} orders</span></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                {[
                  "Order",
                  "Customer",
                  "Items",
                  "Amount",
                  "Payment",
                  "Status",
                  "Details",
                ].map((heading) => (
                  <th key={heading} className="px-5 py-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((order) => (
                <tr key={order._id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-semibold text-slate-700">
                    #{order.orderNumber}
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    {order.customer?.name || "Customer"}
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    {order.items.length}
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-700">
                    ₹{order.total}
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    {order.paymentStatus}
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={order.status}
                      onChange={(event) =>
                        updateStatus(order, event.target.value)
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold outline-none focus:border-primary"
                    >
                      {statuses.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => setSelected(order)}
                      aria-label={`View ${order.orderNumber}`}
                      className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-primary"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              No orders yet. Orders created at checkout will appear here.
            </div>
          )}
        </div>
      </section>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Order details
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  #{selected.orderNumber}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadPdf(selected)}
                  className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</p>
                <p className="mt-2 font-medium text-slate-800">{selected.customer?.name || "Customer"}</p>
                <p className="text-slate-500">{selected.customer?.email || "No email"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payment</p>
                <p className="mt-2 font-medium text-slate-800">{selected.paymentMethod || "-"} / {selected.paymentStatus || "-"}</p>
                <p className="text-slate-500">Order status: {selected.status || "Processing"}</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800">Shipping details</p>
                <span className="text-xs text-slate-400">{selected.shipping?.city || "N/A"}</span>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <p>{selected.shipping?.name || "-"}</p>
                <p>{selected.shipping?.address || "-"}</p>
                <p>{selected.shipping?.city || "-"} - {selected.shipping?.pincode || "-"}</p>
                <p>{selected.shipping?.phone || "-"}</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold text-slate-800">Items</p>
                <span className="text-xs text-slate-400">{selected.items?.length || 0} products</span>
              </div>

              <div className="space-y-3">
                {(selected.items || []).map((item) => {
                  const quantity = Number(item.quantity || 1);
                  const itemTotal = Number(item.price || 0) * quantity;
                  return (
                    <div
                      key={item.product || item._id || `${item.name}-${quantity}`}
                      className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-800">{item.name || "Product"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Qty: <span className="font-semibold text-slate-700">{quantity}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-800">₹{itemTotal.toLocaleString("en-IN")}</p>
                        <p className="text-xs text-slate-500">₹{Number(item.price || 0).toLocaleString("en-IN")} each</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>₹{Number(selected.subtotal || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-700">
                  <span>Discount</span>
                  <span>-₹{Number(selected.discount || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Delivery</span>
                  <span>₹{Number(selected.delivery || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-base font-bold text-slate-900">
                  <span>Total</span>
                  <span>₹{Number(selected.total || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
