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
    <section className="bg-white py-8 md:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <div className="mb-5 flex items-end justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Tag size={18} className="text-primary" />

              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Save more today
              </span>
            </div>

            <h2 className="text-xl font-bold text-gray-900 md:text-2xl">
              Offers for your everyday care
            </h2>

          </div>

          <Link to="/offers" className="hidden items-center gap-1 text-sm font-semibold text-primary transition hover:text-primary-dark sm:flex">
            View All
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className={`flex min-h-[170px] flex-col items-start justify-between rounded-lg p-4 sm:p-5 ${offer.id === 1 ? "bg-emerald-50 text-emerald-950" : offer.id === 2 ? "bg-sky-50 text-sky-950" : "bg-amber-50 text-amber-950"}`}
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Limited time</span>
                <h3 className="mt-1 text-2xl font-bold">{offer.title}</h3>
                <h4 className="mt-0.5 text-sm font-semibold">{offer.subtitle}</h4>
                <p className="mt-1 text-xs opacity-75">{offer.description}</p>
              </div>
              <Link to="/offers" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold underline underline-offset-4 transition hover:gap-2.5">
                  {offer.button}
                <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>

        {/* Mobile View All */}
        <div className="mt-6 text-center sm:hidden">
          <Link to="/offers" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
            View All
            <ArrowRight size={16} />
          </Link>
        </div>

      </div>
    </section>
  );
};

export default SpecialOffers;