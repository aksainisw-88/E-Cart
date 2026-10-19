import {
  Apple,
  ArrowUpRight,
  Baby,
  BookOpen,
  BriefcaseMedical,
  Carrot,
  Dumbbell,
  Footprints,
  Gamepad2,
  Gem,
  HeartPulse,
  Home,
  PawPrint,
  Pill,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Store,
  Tag,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "../../context/storeContext";
import { getBusinessProfile } from "../../data/businessTypes";

const categoryIcon = (name) => {
  const category = name.toLowerCase();
  if (/medicine|pharma|pill|first aid/.test(category)) return Pill;
  if (/health|wellness|vitamin|device/.test(category)) return HeartPulse;
  if (/baby|kid|child/.test(category)) return Baby;
  if (/men|women|wear|clothing|apparel/.test(category)) return Shirt;
  if (/shoe|footwear|sandal|running/.test(category)) return Footprints;
  if (/fruit|vegetable|produce|fresh/.test(category)) return Carrot;
  if (/grocery|snack|beverage|dairy|pantry/.test(category)) return ShoppingBasket;
  if (/electronic|mobile|computer|audio|camera|smart/.test(category)) return Smartphone;
  if (/beauty|skin|makeup|hair|personal|fragrance/.test(category)) return Sparkles;
  if (/pet|dog|cat|aquarium/.test(category)) return PawPrint;
  if (/book|stationery|school|office|paper/.test(category)) return BookOpen;
  if (/sport|fitness|outdoor|yoga/.test(category)) return Dumbbell;
  if (/jewel|ring|watch|gift/.test(category)) return Gem;
  if (/toy|game|puzzle|play/.test(category)) return Gamepad2;
  if (/home|kitchen|furniture|bedding|living|decor/.test(category)) return Home;
  if (/apple|supplement/.test(category)) return Apple;
  if (/household|cleaning/.test(category)) return BriefcaseMedical;
  if (/store|general/.test(category)) return Store;
  return Tag;
};

const ShopCategories = () => {
  const store = useStore();
  const businessProfile = getBusinessProfile(store.businessType);

  return (
    <section aria-labelledby="shop-categories-title" className="bg-[#f4f7f4] py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Shop {businessProfile.label}</p>
            <h2 id="shop-categories-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Browse by category</h2>
            <p className="mt-2 text-sm text-slate-500">{businessProfile.description}</p>
          </div>
          <Link to="/products" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-primary hover:text-primary">
            Shop all products<ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {businessProfile.categories.map((name) => {
            const Icon = categoryIcon(name);
            return (
              <Link
                key={name}
                to={`/products?category=${encodeURIComponent(name)}`}
                className="group flex min-h-28 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:min-h-32 sm:gap-4 sm:p-5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-primary transition group-hover:scale-105 group-hover:bg-emerald-100 sm:h-14 sm:w-14 sm:rounded-2xl">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold leading-5 text-slate-800 transition group-hover:text-primary sm:text-sm">{name}</span>
                  <span className="mt-1 block text-[10px] font-semibold text-slate-400 sm:text-xs">Explore collection</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ShopCategories;
