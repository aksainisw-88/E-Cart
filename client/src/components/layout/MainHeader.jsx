import SearchBar from "./SearchBar";
import HeaderActions from "./HeaderActions";
import { Link } from "react-router-dom";
import { useStore } from "../../context/storeContext";

const MainHeader = () => {
  const store = useStore();
  return (
    <div className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-[80px] max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6 md:h-[80px] md:flex-nowrap md:py-0 lg:px-8">
        <Link to="/" aria-label="Go to home" className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 md:flex-none">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-2xl font-bold text-white shadow-md shadow-primary/25 sm:h-12 sm:w-12">
            {store.logoUrl ? <img src={store.logoUrl} alt="" className="h-full w-full object-contain" /> : "+"}
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-xl">
              {store.name}
            </h1>
            <p className="hidden text-[11px] text-slate-400 sm:block">
              {store.tagline}
            </p>
          </div>
        </Link>

        <div className="order-3 basis-full md:order-none md:flex-1">
          <SearchBar />
        </div>

        <HeaderActions />
      </div>
    </div>
  );
};

export default MainHeader;
