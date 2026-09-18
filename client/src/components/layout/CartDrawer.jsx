import { ArrowRight, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/cartContext";

const CartDrawer = () => {
  const {
    items,
    subtotal,
    updateQuantity,
    removeFromCart,
    drawerOpen,
    setDrawerOpen,
  } = useCart();
  if (!drawerOpen) return null;
  return (
    <>
      <button
        type="button"
        aria-label="Close cart"
        onClick={() => setDrawerOpen(false)}
        className="pointer-events-none fixed inset-0 z-40 bg-slate-950/10"
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Your cart</h2>
            <p className="text-xs text-gray-500">{items.length} products</p>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close cart"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {items.length ? (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 border-b border-gray-100 pb-4"
                >
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-50">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <ShoppingBag className="h-5 w-5 text-gray-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {item.name}
                    </p>
                    <p className="mt-1 text-sm font-bold text-primary">
                      ₹{item.price}
                    </p>
                    <div className="mt-2 flex items-center rounded-lg border border-gray-200 w-fit">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1.5 text-gray-500"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-xs">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1.5 text-gray-500"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    className="self-start text-xs text-gray-400 hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">Your cart is empty.</p>
            </div>
          )}
        </div>
        {items.length > 0 && (
          <div className="border-t border-gray-100 p-5">
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>₹{subtotal}</span>
            </div>
            <Link
              to="/cart"
              onClick={() => setDrawerOpen(false)}
              className="mt-4 flex h-11 items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-white hover:bg-primary-dark"
            >
              View cart and checkout
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </aside>
    </>
  );
};

export default CartDrawer;
