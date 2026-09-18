import SearchBar from "./SearchBar";
import HeaderActions from "./HeaderActions";
import { Link } from "react-router-dom";
import { useStore } from "../../context/storeContext";

const MainHeader = () => {
  const store = useStore();
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex min-h-[76px] max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6 md:h-[76px] md:flex-nowrap md:py-0 lg:px-8">

        {/* Logo */}
        <Link to="/" aria-label="Go to home" className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 md:flex-none">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-2xl font-bold text-white shadow-sm sm:h-11 sm:w-11">{store.logoUrl ? <img src={store.logoUrl} alt="" className="h-full w-full rounded-lg object-contain" /> : "+"}</div>

          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-xl">
              {store.name}
            </h1>

            <p className="hidden text-[11px] text-slate-400 sm:block">
              {store.tagline}
            </p>
          </div>
        </Link>

        {/* Search */}
        <div className="order-3 basis-full md:order-none md:flex-1">
          <SearchBar />
        </div>

        {/* Actions */}
        <HeaderActions />

      </div>
    </div>
  );
};

export default MainHeader;