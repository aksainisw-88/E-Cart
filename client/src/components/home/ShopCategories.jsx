import {
  Apple,
  ArrowUpRight,
  Baby,
  BriefcaseMedical,
  Dumbbell,
  HeartPulse,
  Pill,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { Link } from "react-router-dom";

const categories = [
  { name: "Medicines", icon: Pill, path: "/medicines", tone: "bg-emerald-50 text-emerald-700" },
  { name: "Health Care", icon: HeartPulse, path: "/health-care", tone: "bg-rose-50 text-rose-700" },
  { name: "Personal Care", icon: Sparkles, path: "/personal-care", tone: "bg-violet-50 text-violet-700" },
  { name: "Baby Care", icon: Baby, path: "/baby-care", tone: "bg-sky-50 text-sky-700" },
  { name: "Medical Devices", icon: Stethoscope, path: "/devices", tone: "bg-amber-50 text-amber-700" },
  { name: "Wellness", icon: Dumbbell, path: "/wellness", tone: "bg-teal-50 text-teal-700" },
  { name: "Vitamins & Supplements", icon: Apple, path: "/vitamins", tone: "bg-lime-50 text-lime-700" },
  { name: "First Aid", icon: BriefcaseMedical, path: "/first-aid", tone: "bg-orange-50 text-orange-700" },
];

const ShopCategories = () => (
  <section aria-labelledby="shop-categories-title" className="bg-[#f4f7f4] py-10 sm:py-14">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Shop your way</p>
          <h2 id="shop-categories-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Find what you need, faster</h2>
          <p className="mt-2 text-sm text-slate-500">Browse essentials by the category that fits your needs.</p>
        </div>
        <Link to="/products" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-primary hover:text-primary">
          Shop all products<ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 xl:grid-cols-4">
        {categories.map(({ name, icon: Icon, path, tone }) => (
          <Link
            key={name}
            to={path}
            className="group flex min-h-28 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:min-h-32 sm:gap-4 sm:p-5"
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105 sm:h-14 sm:w-14 sm:rounded-2xl ${tone}`}>
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold leading-5 text-slate-800 transition group-hover:text-primary sm:text-sm">{name}</span>
              <span className="mt-1 block text-[10px] font-semibold text-slate-400 sm:text-xs">Explore category</span>
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </div>
  </section>
);

export default ShopCategories;
