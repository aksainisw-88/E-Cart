import { useEffect, useState } from "react";
import { ArrowRight, Check, MapPin, ShieldCheck, Tag, Truck, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../components/home/Footer";
import { useCart } from "../context/cartContext";
import { useStore } from "../context/storeContext";

const Checkout = () => {
  const { items, subtotal, discountTotal, promoCode, promoDiscount, promoTitle, promoError, applyPromo, removePromo } = useCart();
  const [details, setDetails] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    pincode: "",
  });
  const [session, setSession] = useState("checking");
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const navigate = useNavigate();
  const store = useStore();
  const delivery = subtotal >= Number(store.freeDeliveryAbove ?? 999) ? 0 : Number(store.deliveryFee ?? 49);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => setSession(response.ok ? "signed-in" : "guest"))
      .catch(() => setSession("guest"));
  }, []);

  useEffect(() => {
    if (session !== "signed-in") return;
    fetch("/api/addresses", { credentials: "include" }).then((response) => response.json()).then((result) => { const saved = result.data || []; setAddresses(saved); const preferred = saved.find((address) => address.isDefault) || saved[0]; if (preferred) { setSelectedAddress(preferred._id); setDetails(preferred); } }).catch(() => {});
  }, [session]);

  const update = (field) => (event) =>
    setDetails((current) => ({ ...current, [field]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    fetch("/api/store/delivery-check", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ pincode: details.pincode }) }).then((response) => response.json()).then((result) => { if (!result.data?.available) { setDeliveryMessage("Delivery is not available at this pincode."); return; } setDeliveryMessage(""); if (saveAddress && !selectedAddress) fetch("/api/addresses", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ ...details, label: "Home", isDefault: addresses.length === 0 }) }); navigate("/payment", { state: { details } }); }).catch(() => setDeliveryMessage("We could not validate this delivery area. Please try again."));
  };
  const submitPromo = async (event) => { event.preventDefault(); setPromoLoading(true); await applyPromo(promoInput); setPromoLoading(false); };

  if (items.length === 0)
    return (
      <main className="bg-gray-50 px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Your cart is empty</h1>
        <Link
          to="/products"
          className="mt-5 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white"
        >
          Browse products
        </Link>
      </main>
    );
  if (session === "checking")
    return (
      <main className="bg-gray-50 px-4 py-24 text-center text-sm text-gray-500">
        Checking your account...
      </main>
    );
  if (session === "guest")
    return (
      <>
        <main className="bg-gray-50 px-4 py-24">
          <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">
              Sign in to place your order
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-500">
              Your cart is saved. Sign in or create a customer account before
              continuing to checkout.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white"
            >
              Sign in to continue
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );

  return (
    <>
      <main className="bg-gray-50 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Step 1 of 2
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Delivery details
          </h1>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
            <form
              onSubmit={submit}
              className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8"
            >
              <div className="flex items-center gap-3 border-b border-gray-100 pb-5">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="font-semibold text-gray-900">
                    Where should we deliver?
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    All fields are required for delivery.
                  </p>
                </div>
              </div>
              {addresses.length > 0 && <label className="mt-6 block text-sm font-medium text-gray-700">Use a saved address<select value={selectedAddress} onChange={(event) => { const address = addresses.find((item) => item._id === event.target.value); setSelectedAddress(event.target.value); if (address) setDetails(address); }} className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 outline-none focus:border-primary"><option value="">Enter a new address</option>{addresses.map((address) => <option key={address._id} value={address._id}>{address.label} · {address.address}, {address.pincode}</option>)}</select></label>}
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {[
                  ["name", "Full name"],
                  ["phone", "Phone number"],
                  ["address", "Address"],
                  ["city", "City"],
                  ["pincode", "PIN code"],
                ].map(([field, label]) => (
                  <label
                    key={field}
                    className={`text-sm font-medium text-gray-700 ${field === "address" ? "sm:col-span-2" : ""}`}
                  >
                    {label}
                    <input
                      required
                      value={details[field]}
                      onChange={update(field)}
                      pattern={
                        field === "phone"
                          ? "[0-9]{10}"
                          : field === "pincode"
                            ? "[0-9]{6}"
                            : undefined
                      }
                      className="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 outline-none focus:border-primary"
                    />
                  </label>
                ))}
              </div>
              <label className="mt-5 flex items-center gap-2 text-sm text-gray-600 sm:col-span-2"><input type="checkbox" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} className="h-4 w-4 accent-teal-600" /> Save this address for faster checkout</label>
              {deliveryMessage && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{deliveryMessage}</p>}
              <button
                type="submit"
                className="mt-8 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-white hover:bg-primary-dark"
              >
                Continue to payment
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
            <Summary subtotal={subtotal} discountTotal={discountTotal} promoCode={promoCode} promoDiscount={promoDiscount} promoTitle={promoTitle} promoError={promoError} promoInput={promoInput} setPromoInput={setPromoInput} promoLoading={promoLoading} submitPromo={submitPromo} removePromo={removePromo} delivery={delivery} freeDeliveryAbove={store.freeDeliveryAbove} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

const Summary = ({ subtotal, discountTotal, promoCode, promoDiscount, promoTitle, promoError, promoInput, setPromoInput, promoLoading, submitPromo, removePromo, delivery, freeDeliveryAbove }) => (
  <aside className="h-fit rounded-xl border border-gray-200 bg-white p-6">
    <h2 className="font-bold text-gray-900">Order summary</h2>
    <form onSubmit={submitPromo} className="mt-5 border-b border-gray-100 pb-5">
      <label htmlFor="promo-code" className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Tag className="h-4 w-4 text-primary" /> Promo code</label>
      {promoCode ? <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"><span className="flex min-w-0 items-center gap-2"><Check className="h-4 w-4 shrink-0" /><span className="truncate"><b>{promoCode}</b>{promoTitle ? ` · ${promoTitle}` : ""}</span></span><button type="button" onClick={removePromo} aria-label="Remove promo code" className="rounded p-1 hover:bg-emerald-100"><X className="h-4 w-4" /></button></div> : <div className="mt-3 flex gap-2"><input id="promo-code" value={promoInput} onChange={(event) => setPromoInput(event.target.value)} placeholder="Enter code" className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 text-sm uppercase outline-none focus:border-primary" /><button type="submit" disabled={promoLoading} className="rounded-lg border border-primary px-3 py-2 text-xs font-bold text-primary disabled:opacity-50">{promoLoading ? "..." : "Apply"}</button></div>}
      {promoError && <p className="mt-2 text-xs text-red-600">{promoError}</p>}
    </form>
    <div className="mt-5 space-y-3 text-sm">
      <div className="flex justify-between text-gray-500">
        <span>Subtotal</span>
        <span>₹{subtotal}</span>
      </div>
      {discountTotal > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-₹{discountTotal}</span></div>}
      {promoDiscount > 0 && <div className="flex justify-between font-medium text-emerald-600"><span>Promo savings</span><span>-₹{promoDiscount}</span></div>}
      <div className="flex justify-between text-gray-500">
        <span>Delivery</span>
        <span>{delivery ? `₹${delivery}` : "Free"}</span>
      </div>
      <div className="border-t border-gray-100 pt-4">
        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span>₹{Math.max(0, subtotal + delivery - promoDiscount)}</span>
        </div>
      </div>
    </div>
    <div className="mt-6 space-y-3 border-t border-gray-100 pt-5 text-xs text-gray-500">
      <p className="flex gap-2">
        <Truck className="h-4 w-4 text-primary" />
        Free delivery above ₹{freeDeliveryAbove ?? 999}
      </p>
      <p className="flex gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        Secure checkout
      </p>
    </div>
  </aside>
);

export default Checkout;
