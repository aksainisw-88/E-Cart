import {
  UserRound,
  Heart,
  ShoppingCart
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useCart } from "../../context/cartContext";

const HeaderActions = () => {
  const { itemCount, setDrawerOpen } = useCart();
  return (
    <div className="flex shrink-0 items-center gap-3 sm:gap-5">

      <NavLink to="/login" className="flex items-center gap-2 text-slate-600 transition hover:text-primary">
        <UserRound size={20} />
        <span className="hidden text-xs font-semibold sm:block">Account</span>
      </NavLink>

      <NavLink to="/wishlist" className="flex items-center gap-2 text-slate-600 transition hover:text-primary">
        <Heart size={20} />
        <span className="hidden text-xs font-semibold sm:block">Wishlist</span>
      </NavLink>

      <button type="button" onClick={() => setDrawerOpen(true)} className="relative flex items-center gap-2 text-slate-600 transition hover:text-primary">
        <ShoppingCart size={20} />
        <span className="hidden text-xs font-semibold sm:block">Cart</span>
        {itemCount > 0 && <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">{itemCount}</span>}
      </button>

    </div>
  );
};

export default HeaderActions;