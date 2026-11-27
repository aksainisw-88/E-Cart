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
    <section aria-labelledby="shop-categories-title" className="bg-[#f2f2eb] py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#62785d]">A good place to start</p>
            <h2 id="shop-categories-title" className="mt-2 text-3xl font-semibold tracking-tight text-[#26352a] sm:text-4xl">Find your kind of good.</h2>
            <p className="mt-2 text-sm text-[#70796e]">{businessProfile.description}</p>
          </div>
          <Link to="/products" className="inline-flex items-center gap-2 rounded-full border border-[#d8ddd2] bg-white px-5 py-3 text-sm font-bold text-[#3b543b] transition hover:border-[#688463] hover:text-[#315735]">
            Shop all products<ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          {businessProfile.categories.map((name) => {
            const Icon = categoryIcon(name);
            return (
              <Link
                key={name}
                to={`/products?category=${encodeURIComponent(name)}`}
                className="group relative flex min-h-32 items-center gap-3 overflow-hidden rounded-[1.5rem] border border-[#e4e5db] bg-[#fbfaf6] p-4 transition duration-300 hover:-translate-y-1 hover:border-[#bac8b2] hover:shadow-xl hover:shadow-[#314b33]/[0.08] sm:min-h-36 sm:gap-4 sm:p-5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#edf1e7] text-[#557253] transition group-hover:scale-105 group-hover:bg-[#dfe8d8] sm:h-14 sm:w-14">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold leading-5 text-[#344236] transition group-hover:text-[#426844] sm:text-sm">{name}</span>
                  <span className="mt-1 block text-[10px] font-semibold text-[#899084] sm:text-xs">Explore collection</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-[#a6ac9e] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#557253]" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ShopCategories;
