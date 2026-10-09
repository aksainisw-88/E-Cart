import { MapPin, PackageSearch, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "../../context/storeContext";

const TopBar = () => {
  const store = useStore();
  const freeDeliveryAbove = Number(store.freeDeliveryAbove ?? 999);

  return (
    <div className="border-b border-slate-200 bg-slate-50 text-slate-600">
      <div className="mx-auto flex min-h-8 max-w-7xl items-center justify-between gap-3 px-4 text-[11px] font-medium sm:px-6 lg:px-8">
        <p className="truncate">Welcome to {store.name}</p>
        <div className="flex shrink-0 items-center gap-4">
          <span className="hidden items-center gap-1.5 sm:inline-flex"><Truck className="h-3.5 w-3.5 text-primary" />Free delivery over ₹{freeDeliveryAbove.toLocaleString("en-IN")}</span>
          <span className="hidden items-center gap-1.5 md:inline-flex"><MapPin className="h-3.5 w-3.5 text-primary" />Serving India</span>
          <Link to="/account/orders" className="inline-flex items-center gap-1.5 hover:text-primary"><PackageSearch className="h-3.5 w-3.5 text-primary" />Track order</Link>
        </div>
      </div>
    </div>
  );
};

export default TopBar;