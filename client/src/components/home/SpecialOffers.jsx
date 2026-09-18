import { ArrowRight, Tag } from "lucide-react";
import { Link } from "react-router-dom";

const offers = [
  {
    id: 1,
    title: "20% OFF",
    subtitle: "Vitamins & supplements",
    description: "Boost your daily wellness with our selected products.",
    button: "Shop Now",
  },
  {
    id: 2,
    title: "UP TO 30% OFF",
    subtitle: "Personal care",
    description: "Take care of yourself with our personal care collection.",
    button: "Explore",
  },
  {
    id: 3,
    title: "₹200 OFF",
    subtitle: "Medical devices",
    description: "Get reliable healthcare devices at special prices.",
    button: "Shop Devices",
  },
];

const SpecialOffers = () => {
  return (
    <section className="bg-[#f7f8f5] py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Tag size={18} className="text-primary" />

              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Save more today
              </span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
              Deals of the week
            </h2>

            <p className="mt-2 text-sm text-gray-500 md:text-base">
              Save more on your favorite healthcare products
            </p>
          </div>

          <button className="hidden items-center gap-1 text-sm font-semibold text-primary transition hover:text-primary-dark sm:flex">
            View All
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Offers */}
        <div className="grid gap-5 md:grid-cols-3">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className={`group relative min-h-[245px] overflow-hidden rounded-xl p-6 text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${offer.id === 1 ? "bg-[#196848]" : offer.id === 2 ? "bg-[#c87045]" : "bg-[#4d6d72]"}`}
            >
              {/* Decorative Circle */}
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />

              <div className="absolute -bottom-16 -right-6 h-40 w-40 rounded-full bg-white/5" />

              {/* Content */}
              <div className="relative z-10">
                <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                  Limited Time
                </span>

                <h3 className="mt-5 text-3xl font-extrabold">
                  {offer.title}
                </h3>

                <h4 className="mt-2 text-lg font-semibold">
                  {offer.subtitle}
                </h4>

                <p className="mt-2 max-w-sm text-sm leading-6 text-white/80">
                  {offer.description}
                </p>

                <Link to="/offers" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-gray-100">
                  {offer.button}

                  <ArrowRight
                    size={16}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile View All */}
        <div className="mt-6 text-center sm:hidden">
          <button className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
            View All
            <ArrowRight size={16} />
          </button>
        </div>

      </div>
    </section>
  );
};

export default SpecialOffers;