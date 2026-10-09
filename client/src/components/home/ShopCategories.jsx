import {
  Pill,
  HeartPulse,
  Sparkles,
  Baby,
  Stethoscope,
  Dumbbell,
  Apple,
  BriefcaseMedical,
} from "lucide-react";
import { Link } from "react-router-dom";

const categories = [
  { id: 1, name: "Medicines", icon: Pill, path: "/medicines" },
  { id: 2, name: "Health Care", icon: HeartPulse, path: "/health-care" },
  { id: 3, name: "Personal Care", icon: Sparkles, path: "/personal-care" },
  { id: 4, name: "Baby Care", icon: Baby, path: "/baby-care" },
  { id: 5, name: "Medical Devices", icon: Stethoscope, path: "/devices" },
  { id: 6, name: "Wellness", icon: Dumbbell, path: "/wellness" },
  { id: 7, name: "Vitamins & Supplements", icon: Apple, path: "/vitamins" },
  { id: 8, name: "First Aid", icon: BriefcaseMedical, path: "/first-aid" },
];

const ShopCategories = () => {
  return (
    <section className="bg-slate-50 py-8 md:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between border-b border-slate-200 pb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Find what you need</p>
            <h2 className="mt-1 text-xl font-bold text-gray-900 md:text-2xl">
              Shop top categories
            </h2>
          </div>
          <Link to="/products" className="text-xs font-semibold text-primary hover:text-primary-dark sm:text-sm">
            View all →
          </Link>
        </div>

        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:px-0 lg:grid-cols-8">
          {categories.map((category) => {
            const Icon = category.icon;

            return (
              <Link
                key={category.id}
                to={category.path}
                className="group flex w-[86px] shrink-0 flex-col items-center text-center sm:w-auto"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white transition group-hover:border-primary group-hover:bg-emerald-50 sm:h-[72px] sm:w-[72px]">
                  <Icon
                    size={28}
                    strokeWidth={1.5}
                    className="text-primary transition-transform duration-200 group-hover:scale-110"
                  />
                </div>

                <h3 className="mt-2.5 text-center text-[11px] font-medium leading-4 text-gray-700 transition-colors group-hover:text-primary sm:text-xs">
                  {category.name}
                </h3>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ShopCategories;
