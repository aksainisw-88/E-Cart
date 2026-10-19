import { useEffect, useState } from "react";
import { UserRound, Heart, ShoppingCart } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useCart } from "../../context/cartContext";
import { useWishlist } from "../../context/wishlistContext";

const API_URL = import.meta.env.VITE_API_URL || "";

const HeaderActions = () => {
  const { itemCount, setDrawerOpen } = useCart();
  const { items } = useWishlist();
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    let active = true;

    fetch(`${API_URL}/api/auth/me`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((result) => {
        if (active && result?.user?.role === "customer") setCustomer(result.user);
      })
      .catch(() => {
        // Public storefront pages remain usable if session lookup is unavailable.
      });

    return () => {
      active = false;
    };
  }, []);

  const customerName = customer?.name?.trim();
  const customerInitial = customerName?.charAt(0)?.toUpperCase() || "C";

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <NavLink
        to={customer ? "/account" : "/customer/login"}
        aria-label={customer ? `Open ${customerName || "customer"} account` : "Sign in to your account"}
        className="flex max-w-[150px] items-center gap-2 rounded-xl px-2 py-2 text-slate-600 transition hover:bg-emerald-50 hover:text-primary sm:max-w-[190px] sm:px-2.5"
      >
        {customer ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-primary">
            {customerInitial}
          </span>
        ) : (
          <UserRound size={20} />
        )}
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block truncate text-xs font-semibold text-slate-700">
            {customer ? customerName || "My account" : "Account"}
          </span>
          {customer && <span className="block text-[10px] leading-4 text-slate-400">My account</span>}
        </span>
      </NavLink>

      <NavLink
        to="/wishlist"
        className="relative flex items-center gap-2 rounded-xl px-2.5 py-2 text-slate-600 transition hover:bg-emerald-50 hover:text-primary"
      >
        <Heart size={20} />
        <span className="hidden text-xs font-semibold sm:block">Wishlist</span>
        {items.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white sm:right-0 sm:top-0.5">
            {items.length}
          </span>
        )}
      </NavLink>

      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="relative flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-white shadow-sm shadow-primary/20 transition hover:bg-primary-dark"
      >
        <ShoppingCart size={20} />
        <span className="hidden text-xs font-semibold sm:block">Cart</span>
        {itemCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-slate-900">
            {itemCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default HeaderActions;
