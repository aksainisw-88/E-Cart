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
    <section className="bg-[#f7f8f5] py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Shop by department</p>
          <h2 className="mt-2 text-2xl font-semibold text-gray-900 md:text-3xl">
            Shop by Categories
          </h2>
          </div>
          <a href="/products" className="hidden text-sm font-semibold text-primary hover:text-primary-dark sm:block">View all categories →</a>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {categories.map((category) => {
            const Icon = category.icon;

            return (
              <a
                key={category.id}
                href={category.path}
                className="group flex min-h-[148px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-2 py-4 transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 transition-all duration-300 group-hover:bg-emerald-100">
                  <Icon
                    size={28}
                    strokeWidth={1.5}
                    className="text-primary transition-transform duration-300 group-hover:scale-110"
                  />
                </div>

                <h3 className="mt-3 text-center text-xs font-semibold text-gray-700 transition-colors group-hover:text-primary sm:text-sm">
                  {category.name}
                </h3>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ShopCategories;