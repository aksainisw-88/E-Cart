import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, CreditCard, LockKeyhole, Package } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Footer from "../components/home/Footer";
import { useCart } from "../context/cartContext";
import { useStore } from "../context/storeContext";

const paymentOptions = [
  { value: "razorpay", label: "Razorpay", icon: "R" },
  { value: "card", label: "Card / Debit Credit", icon: "💳" },
  { value: "phonepe", label: "PhonePe", icon: "📱" },
  { value: "paytm", label: "Paytm", icon: "💠" },
  { value: "googlepay", label: "Google Pay", icon: "🔵" },
  { value: "cod", label: "Cash on delivery", icon: "₹" },
];

const Payment = () => {
  const { items, subtotal, discountTotal, promoCode, promoDiscount, clearCart, syncCartStock } = useCart();
  const [method, setMethod] = useState("phonepe");
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState("");
  const [razorpayReady, setRazorpayReady] = useState(() => Boolean(window.Razorpay));
  const paymentState = useLocation().state;
  const details = paymentState?.details;
  const storeId = paymentState?.storeId;
  const storeName = paymentState?.storeName;
  const navigate = useNavigate();
  const store = useStore();
  const delivery = subtotal >= Number(store.freeDeliveryAbove ?? 999) ? 0 : Number(store.deliveryFee ?? 49);

  useEffect(() => {
    if (window.Razorpay) return undefined;
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayReady(true);
    script.onerror = () => setError("Unable to load Razorpay checkout.");
    document.body.appendChild(script);
    return () => script.remove();
  }, []);

  const pay = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const stockChanged = await syncCartStock();
      if (stockChanged) {
        setError("Stock changed for one or more products. Please review your cart before placing the order.");
        return;
      }
    } catch (stockError) {
      setError(stockError.message);
      return;
    }
    if (method === "razorpay" && (!razorpayReady || !window.Razorpay)) {
      setError("Razorpay checkout is still loading. Please try again.");
      return;
    }
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ items, shipping: details, paymentMethod: method, promoCode, ...(storeId ? { storeId } : {}) }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.message || "Please sign in before placing an order.");
      return;
    }
    if (method !== "razorpay") {
      setPaid(true);
      clearCart();
      return;
    }
    const checkout = new window.Razorpay({
      key: result.razorpay.keyId,
      amount: Math.round(Number(result.data.total) * 100),
      currency: "INR",
      name: "E-Mart",
      description: `Order ${result.data.orderNumber}`,
      order_id: result.razorpay.orderId,
      prefill: { name: details?.name, contact: details?.phone },
      handler: async (paymentResponse) => {
        try {
          const verification = await fetch(`/api/orders/${result.data._id}/payment/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(paymentResponse),
          });
          const verificationResult = await verification.json();
          if (!verification.ok) throw new Error(verificationResult.message || "Payment verification failed.");
          setPaid(true);
          clearCart();
        } catch (verificationError) {
          setError(verificationError.message);
        }
      },
      modal: { ondismiss: () => setError("Payment was cancelled. Your order is still pending.") },
      theme: { color: "#0f766e" },
    });
    checkout.open();
  };

  if (paid)
    return (
      <>
        <main className="bg-gray-50 px-4 py-24 text-center">
          <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
            <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-primary">
              Order confirmed
            </p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">
              Thank you for your order
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-500">
              Your order was created successfully. We&apos;ll send delivery
              updates to {details?.phone || "your phone"}.
            </p>
            <Link
              to="/"
              className="mt-7 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white"
            >
              Continue shopping
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  if (items.length === 0)
    return (
      <main className="bg-gray-50 px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          No order to pay for
        </h1>
        <button
          type="button"
          onClick={() => navigate("/products")}
          className="mt-5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white"
        >
          Browse products
        </button>
      </main>
    );
  return (
    <>
      <main className="min-h-[65vh] bg-slate-50 py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs text-slate-400"><Link to="/checkout" className="hover:text-primary">Customer information</Link><span>/</span><span className="font-medium text-slate-600">Payment</span></div>
          <div className="mt-5 flex items-center gap-3 text-xs font-semibold"><span className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-5 w-5" />Customer information</span><span className="h-px w-10 bg-slate-300" /><span className="flex items-center gap-2 text-primary"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] text-white">2</span>Payment</span></div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900 sm:text-3xl">Payment</h1>
          <p className="mt-1 text-sm text-slate-500">Select a secure payment method to place your order.</p>
          {storeName && <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Business order fulfilled by <span className="font-semibold">{storeName}</span></p>}
          {error && (
            <p
              role="alert"
              className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}{" "}
              <Link to="/login" className="font-semibold underline">
                Sign in
              </Link>
            </p>
          )}
          <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <form
            onSubmit={pay}
            className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7"
          >
            <div className="space-y-3">
              {paymentOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${method === option.value ? "border-primary bg-teal-50" : "border-gray-200"}`}
                >
                  <input
                    type="radio"
                    checked={method === option.value}
                    onChange={() => setMethod(option.value)}
                    name="method"
                    className="accent-teal-600"
                  />
                  {option.value === "card" ? (
                    <CreditCard className="h-5 w-5 text-primary" />
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold text-primary">
                      {option.icon}
                    </span>
                  )}
                  <span className="text-sm font-semibold">{option.label}</span>
                </label>
              ))}
            </div>
            {method === "card" && (
              <div className="mt-6 grid gap-5 border-t border-gray-100 pt-6 sm:grid-cols-2">
                <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                  Card number
                  <input
                    required
                    inputMode="numeric"
                    placeholder="4242 4242 4242 4242"
                    className="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 outline-none focus:border-primary"
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Expiry
                  <input
                    required
                    placeholder="MM / YY"
                    className="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 outline-none focus:border-primary"
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  CVV
                  <input
                    required
                    type="password"
                    placeholder="•••"
                    className="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 outline-none focus:border-primary"
                  />
                </label>
              </div>
            )}
            <div className="mt-7 flex flex-col justify-between gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs text-slate-500">Amount to pay</p>
                {discountTotal > 0 && <p className="text-sm text-emerald-600">Discount: -₹{discountTotal}</p>}
                {promoDiscount > 0 && <p className="text-sm text-emerald-600">Promo savings: -₹{promoDiscount}</p>}
                <p className="text-2xl font-bold text-slate-900">
                  ₹{Math.max(0, subtotal + delivery - promoDiscount)}
                </p>
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark"
              >
                <LockKeyhole className="h-4 w-4" />
                Place order
              </button>
            </div>
          </form>
          <aside className="sticky top-28 h-fit rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">Your order</h2>
            <div className="mt-4 max-h-52 space-y-3 overflow-y-auto border-b border-slate-100 pb-4">{items.map((item) => <div key={item.id} className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-50">{item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-contain p-1" /> : <Package className="h-4 w-4 text-slate-300" />}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-700">{item.name}</p><p className="mt-1 text-[11px] text-slate-400">Qty {item.quantity}</p></div><span className="text-xs font-semibold text-slate-700">₹{Number(item.price || 0) * item.quantity}</span></div>)}</div>
            <div className="mt-4 space-y-3 text-sm"><div className="flex justify-between text-slate-500"><span>Subtotal</span><span>₹{subtotal}</span></div>{discountTotal > 0 && <div className="flex justify-between text-emerald-700"><span>Product savings</span><span>−₹{discountTotal}</span></div>}{promoDiscount > 0 && <div className="flex justify-between text-emerald-700"><span>Promo savings</span><span>−₹{promoDiscount}</span></div>}<div className="flex justify-between text-slate-500"><span>Delivery</span><span>{delivery ? `₹${delivery}` : "Free"}</span></div><div className="flex justify-between border-t border-slate-100 pt-3 font-bold text-slate-900"><span>Total</span><span>₹{Math.max(0, subtotal + delivery - promoDiscount)}</span></div></div>
            {details && <div className="mt-4 border-t border-slate-100 pt-4"><p className="text-xs font-semibold text-slate-700">Delivering to</p><p className="mt-1 text-xs leading-5 text-slate-500">{details.name} · {details.phone}<br />{details.address}, {details.city} {details.pincode}</p><Link to="/checkout" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600"><ArrowLeft className="h-3 w-3" />Edit details</Link></div>}
          </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Payment;
