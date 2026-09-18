import { useEffect, useMemo, useState } from "react";
import { Eye, Search, X } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";
const paymentStatuses = ["All", "Paid", "Pending", "Failed"];

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

const formatMethod = (method) => {
  const labels = {
    card: "Card / Debit Credit",
    razorpay: "Razorpay",
    cod: "Cash on delivery",
    phonepe: "PhonePe",
    paytm: "Paytm",
    googlepay: "Google Pay",
  };
  return labels[method] || method || "Unknown";
};

const statusClass = {
  Paid: "bg-emerald-50 text-emerald-700",
  Pending: "bg-amber-50 text-amber-700",
  Failed: "bg-red-50 text-red-700",
};

const AdminPayments = () => {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [method, setMethod] = useState("All");
  const [selected, setSelected] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentStatus: "Pending",
    utrNumber: "",
    paymentNotes: "",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    fetch(`${API_URL}/api/admin/orders`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.message || "Unable to load payments.");
        return result.data || [];
      })
      .then((items) => {
        if (!active) return;
        setOrders(items);
        setLoading(false);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const visiblePayments = useMemo(() => {
    const normalizedQuery = query.toLowerCase();

    return orders.filter((order) => {
      const matchesStatus = status === "All" || order.paymentStatus === status;
      const matchesMethod = method === "All" || order.paymentMethod === method;
      const matchesQuery =
        `${order.orderNumber} ${order.customer?.name || ""} ${order.customer?.email || ""}`
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesStatus && matchesMethod && matchesQuery;
    });
  }, [method, orders, query, status]);

  const paidTotal = orders
    .filter((order) => order.paymentStatus === "Paid")
    .reduce((total, order) => total + Number(order.total || 0), 0);
  const pendingTotal = orders
    .filter((order) => order.paymentStatus === "Pending")
    .reduce((total, order) => total + Number(order.total || 0), 0);

  const openDetails = (order) => {
    setSelected(order);
    setPaymentForm({
      paymentStatus: order.paymentStatus || "Pending",
      utrNumber: order.utrNumber || "",
      paymentNotes: order.paymentNotes || "",
    });
  };

  const updatePayment = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/admin/orders/${selected._id}/payment`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(paymentForm),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Unable to update payment.");

      setOrders((items) =>
        items.map((item) => (item._id === selected._id ? result.data : item)),
      );
      setSelected(result.data);
      setPaymentForm({
        paymentStatus: result.data.paymentStatus,
        utrNumber: result.data.utrNumber || "",
        paymentNotes: result.data.paymentNotes || "",
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1500px]">
      <div>
        <p className="text-sm font-medium text-primary">Admin workspace</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          Payments received
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          View customer payments, order references, and transaction details.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Paid amount</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            ₹{paidTotal.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Pending amount</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            ₹{pendingTotal.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total transactions</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {orders.length}
          </p>
        </div>
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
              placeholder="Search customer or order..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {paymentStatuses.map((paymentStatus) => (
              <button
                key={paymentStatus}
                type="button"
                onClick={() => setStatus(paymentStatus)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${status === paymentStatus ? "bg-primary text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
              >
                {paymentStatus}
              </button>
            ))}
            <select value={method} onChange={(event) => setMethod(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none focus:border-primary"><option value="All">All methods</option><option value="razorpay">Razorpay</option><option value="card">Card / Debit Credit</option><option value="phonepe">PhonePe</option><option value="paytm">Paytm</option><option value="googlepay">Google Pay</option><option value="cod">Cash on delivery</option></select>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-16 text-center text-sm text-slate-500">
            Loading payment records...
          </div>
        ) : visiblePayments.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-500">
            No payment records match your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  {[
                    "Order no.",
                    "Customer",
                    "Date",
                    "Method",
                    "Amount",
                    "Payment status",
                    "Details",
                  ].map((heading) => (
                    <th key={heading} className="px-5 py-3 font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visiblePayments.map((order) => (
                  <tr key={order._id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold text-slate-700">
                      #{order.orderNumber}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-700">
                        {order.customer?.name ||
                          order.shipping?.name ||
                          "Customer"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {order.customer?.email || "-"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {formatMethod(order.paymentMethod)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-700">
                      ₹{Number(order.total || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[order.paymentStatus] || "bg-slate-100 text-slate-600"}`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => openDetails(order)}
                        className="inline-flex items-center gap-1.5 font-semibold text-primary hover:text-primary-dark"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Payment details"
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-6">
              <div>
                <p className="text-sm font-medium text-primary">
                  Payment details
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  #{selected.orderNumber}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close payment details"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={updatePayment}
              className="grid gap-4 p-6 sm:grid-cols-2"
            >
              <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Customer
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                  {selected.customer?.name ||
                    selected.shipping?.name ||
                    "Customer"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {selected.customer?.email || "-"} ·{" "}
                  {selected.shipping?.phone || "-"}
                </p>
              </div>
              {selected.paymentMethod === "razorpay" && (
                <div className="rounded-xl bg-teal-50 p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-teal-700">
                    Razorpay transaction
                  </p>
                  <p className="mt-2 break-all text-xs text-slate-600">
                    Order ID: {selected.razorpayOrderId || "Pending"}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-600">
                    Payment ID: {selected.razorpayPaymentId || "Pending"}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Amount paid
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  ₹{Number(selected.total || 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Payment status
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                  {selected.paymentStatus}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Payment method
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                  {formatMethod(selected.paymentMethod)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Order date
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                  {formatDate(selected.createdAt)}
                </p>
              </div>
              <label className="text-sm font-medium text-slate-700">
                Update payment status
                <select
                  value={paymentForm.paymentStatus}
                  onChange={(event) =>
                    setPaymentForm((form) => ({
                      ...form,
                      paymentStatus: event.target.value,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Failed">Failed</option>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                UTR / transaction number
                <input
                  value={paymentForm.utrNumber}
                  onChange={(event) =>
                    setPaymentForm((form) => ({
                      ...form,
                      utrNumber: event.target.value,
                    }))
                  }
                  placeholder="Enter UTR number"
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Payment notes
                <textarea
                  value={paymentForm.paymentNotes}
                  onChange={(event) =>
                    setPaymentForm((form) => ({
                      ...form,
                      paymentNotes: event.target.value,
                    }))
                  }
                  placeholder="Add payment remarks"
                  rows="3"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Recorded UTR
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {selected.utrNumber || "Not added"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Paid date: {formatDate(selected.paidAt)}
                </p>
              </div>
              <div className="border-t border-slate-100 pt-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Order summary
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {selected.items
                    ?.map((item) => `${item.name} × ${item.quantity}`)
                    .join(", ")}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Subtotal ₹
                  {Number(selected.subtotal || 0).toLocaleString("en-IN")} ·
                  Discount -₹
                  {Number(selected.discount || 0).toLocaleString("en-IN")} ·
                  Delivery ₹
                  {Number(selected.delivery || 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save payment details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;
