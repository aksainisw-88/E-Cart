import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  ShieldCheck,
  Trash2,
  Truck,
} from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "../components/home/Footer";
import { useEffect, useState } from "react";
import { useCart } from "../context/cartContext";
import { useStore } from "../context/storeContext";

const Cart = () => {
  const { items, subtotal, discountTotal, updateQuantity, removeFromCart, syncCartStock, promoError } = useCart();
  const [checkingStock, setCheckingStock] = useState(true);
  const [stockError, setStockError] = useState("");
  const store = useStore();
  useEffect(() => {
    syncCartStock()
      .catch((requestError) => setStockError(requestError.message))
      .finally(() => setCheckingStock(false));
    // Stock is checked once when the cart page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const delivery = subtotal >= Number(store.freeDeliveryAbove ?? 999) ? 0 : Number(store.deliveryFee ?? 49);
  return (
    <>
      <main className="bg-gray-50 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Your selection
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Shopping cart
          </h1>
          <p className="mt-2 text-gray-500">
            {items.length} products ready for checkout.
          </p>
          {(stockError || promoError) && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">{stockError || promoError}</p>}
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
            {items.length > 0 ? (
              <section className="space-y-4">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:p-5"
                  >
                    <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-lg bg-gray-50">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-contain p-3"
                        />
                      ) : (
                        <ShoppingBag className="h-8 w-8 text-gray-300" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        <p className="text-xs text-gray-500">{item.category}</p>
                        <h2 className="mt-1 text-sm font-semibold text-gray-900 sm:text-base">
                          {item.name}
                        </h2>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="flex items-center rounded-lg border border-gray-200">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-2 text-gray-500 hover:text-primary"
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
                            className="p-2 text-gray-500 hover:text-primary"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="font-bold text-primary">
                          ₹{item.price * item.quantity}
                        </p>
                        <button
                          type="button"
                          aria-label={`Remove ${item.name}`}
                          onClick={() => removeFromCart(item.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            ) : (
              <section className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-20 text-center">
                <ShoppingBag className="mx-auto h-10 w-10 text-gray-300" />
                <h2 className="mt-4 text-lg font-semibold">
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
            <aside className="h-fit rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-bold text-gray-900">Order summary</h2>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                {discountTotal > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-₹{discountTotal}</span></div>}
                <div className="flex justify-between text-gray-500">
                  <span>Delivery</span>
                  <span>{delivery ? `₹${delivery}` : "Free"}</span>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex justify-between text-base font-bold text-gray-900">
                    <span>Total</span>
                    <span>₹{subtotal + delivery}</span>
                  </div>
                </div>
              </div>
              <Link
                to={checkingStock ? "/cart" : items.length ? "/checkout" : "/products"}
                aria-disabled={checkingStock || !items.length}
                className={`mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-white hover:bg-primary-dark ${checkingStock || !items.length ? "pointer-events-none opacity-60" : ""}`}
              >
                {checkingStock ? "Checking stock..." : items.length ? "Checkout" : "Browse products"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="mt-6 space-y-3 border-t border-gray-100 pt-5 text-xs text-gray-500">
                <p className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  Free delivery above ₹{store.freeDeliveryAbove ?? 999}
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
