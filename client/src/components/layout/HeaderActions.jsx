import { UserRound, Heart, ShoppingCart } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useCart } from "../../context/cartContext";
import { useWishlist } from "../../context/wishlistContext";

const HeaderActions = () => {
  const { itemCount, setDrawerOpen } = useCart();
  const { items } = useWishlist();

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <NavLink
        to="/customer/login"
        className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-slate-600 transition hover:bg-emerald-50 hover:text-primary"
      >
        <UserRound size={20} />
        <span className="hidden text-xs font-semibold sm:block">Account</span>
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
