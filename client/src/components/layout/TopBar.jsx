import { useStore } from "../../context/storeContext";

const TopBar = () => {
  const store = useStore();
  const freeDeliveryAbove = Number(store.freeDeliveryAbove ?? 999);

  return (
    <div className="bg-gradient-to-r from-[#0c5c3e] via-[#0f6b49] to-[#168a5b] text-emerald-50">
      <div className="mx-auto flex min-h-9 max-w-7xl items-center justify-center px-4 text-[11px] font-medium tracking-wide sm:justify-between sm:px-6 lg:px-8">
        <p>Free delivery on orders above ₹{freeDeliveryAbove.toLocaleString("en-IN")}</p>
        <p className="hidden text-emerald-100/90 sm:block">Need help? {store.phone || "Contact support"}</p>
      </div>
    </div>
  );
};

export default TopBar;