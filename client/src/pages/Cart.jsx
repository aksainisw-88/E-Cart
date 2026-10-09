import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  ShieldCheck,
  Tag,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "../components/home/Footer";
import { useEffect, useState } from "react";
import { useCart } from "../context/cartContext";
import { useStore } from "../context/storeContext";

const money = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

const Cart = () => {
  const { items, subtotal, discountTotal, promoCode, promoDiscount, promoTitle, applyPromo, removePromo, updateQuantity, removeFromCart, syncCartStock, promoError } = useCart();
  const [checkingStock, setCheckingStock] = useState(true);
  const [stockError, setStockError] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const store = useStore();
  useEffect(() => {
    syncCartStock()
      .catch((requestError) => setStockError(requestError.message))
      .finally(() => setCheckingStock(false));
    // Stock is checked once when the cart page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const delivery = subtotal >= Number(store.freeDeliveryAbove ?? 999) ? 0 : Number(store.deliveryFee ?? 49);
  const total = Math.max(0, subtotal + delivery - promoDiscount);
  const submitPromo = async (event) => { event.preventDefault(); setPromoLoading(true); await applyPromo(promoInput); setPromoLoading(false); };
  return (
    <>
      <main className="min-h-[60vh] bg-slate-50 py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-5">
            <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Your selection</p><h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">My cart <span className="text-lg font-medium text-slate-400">({items.length})</span></h1></div>
            <Link to="/products" className="text-sm font-semibold text-slate-600 hover:text-primary">Continue shopping <span aria-hidden="true">→</span></Link>
          </div>
          {(stockError || promoError) && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">{stockError || promoError}</p>}
          <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            {items.length > 0 ? (
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="flex gap-3 border-b border-slate-100 p-4 last:border-b-0 sm:gap-5 sm:p-5"
                  >
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-50 sm:h-24 sm:w-24">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <ShoppingBag className="h-8 w-8 text-gray-300" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between sm:flex-row sm:items-center sm:gap-4">
                      <div>
                        <p className="text-[11px] text-slate-500">{item.category}</p>
                        <h2 className="mt-1 text-sm font-semibold text-slate-900 sm:text-base">
                          {item.name}
                        </h2>
                        <p className="mt-1 text-xs text-slate-400">{money(item.price)} each</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 sm:mt-0 sm:gap-4">
                        <div className="flex h-9 items-center rounded-lg border border-slate-200">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-2 text-slate-500 hover:text-primary"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-7 text-center text-sm font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-2 text-slate-500 hover:text-primary"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="min-w-20 text-right text-sm font-bold text-slate-900">
                          {money(item.price * item.quantity)}
                        </p>
                        <button
                          type="button"
                          aria-label={`Remove ${item.name}`}
                          onClick={() => removeFromCart(item.id)}
                          className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            ) : (
              <section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
                <ShoppingBag className="mx-auto h-10 w-10 text-gray-300" />
                <h2 className="mt-4 text-lg font-semibold text-slate-900">
                  Your cart is empty
                </h2>
                <Link
                  to="/products"
                  className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Browse products
                </Link>
              </section>
            )}
            <aside className="sticky top-28 h-fit rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-base font-bold text-slate-900">Order summary</h2>
              <form onSubmit={submitPromo} className="mt-4 border-b border-slate-100 pb-4">
                <label htmlFor="cart-promo" className="flex items-center gap-2 text-xs font-semibold text-slate-700"><Tag className="h-4 w-4 text-primary" />Promo code</label>
                {promoCode ? <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><span className="min-w-0 truncate"><strong>{promoCode}</strong>{promoTitle ? ` · ${promoTitle}` : ""}</span><button type="button" onClick={removePromo} aria-label="Remove promo" className="rounded p-1 hover:bg-emerald-100"><X className="h-4 w-4" /></button></div> : <div className="mt-2 flex gap-2"><input id="cart-promo" value={promoInput} onChange={(event) => setPromoInput(event.target.value)} placeholder="Enter code" className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm uppercase outline-none focus:border-primary" /><button type="submit" disabled={promoLoading} className="rounded-lg border border-primary px-3 text-xs font-semibold text-primary disabled:opacity-50">{promoLoading ? "..." : "Apply"}</button></div>}
              </form>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
                {discountTotal > 0 && <div className="flex justify-between text-emerald-700"><span>Product discount</span><span>−{money(discountTotal)}</span></div>}
                {promoDiscount > 0 && <div className="flex justify-between text-emerald-700"><span>Promo savings</span><span>−{money(promoDiscount)}</span></div>}
                <div className="flex justify-between text-slate-500">
                  <span>Delivery</span>
                  <span>{delivery ? money(delivery) : "Free"}</span>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex justify-between text-base font-bold text-slate-900">
                    <span>Total</span>
                    <span>{money(total)}</span>
                  </div>
                </div>
              </div>
              <Link
                to={checkingStock ? "/cart" : items.length ? "/checkout" : "/products"}
                aria-disabled={checkingStock || !items.length}
                className={`mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 font-semibold text-white hover:bg-slate-800 ${checkingStock || !items.length ? "pointer-events-none opacity-60" : ""}`}
              >
                {checkingStock ? "Checking stock..." : items.length ? "Checkout" : "Browse products"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
                <p className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  Free delivery above {money(store.freeDeliveryAbove ?? 999)}
                </p>
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Secure checkout
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Cart;
