import { Clock3, ShieldCheck, ShoppingBasket, Tag } from "lucide-react";
import { useStore } from "../../context/storeContext";

const benefits = [
  {
    id: 1,
    name: "10 minute grocery now",
    message: "Get your essentials delivered quickly from stores near you.",
    icon: Clock3,
  },
  {
    id: 2,
    name: "Best prices & offers",
    message: "Great value, honest prices and offers you can count on.",
    icon: Tag,
  },
  {
    id: 3,
    name: "Wide assortment",
    message: "Explore medicines, personal care, wellness and more.",
    icon: ShoppingBasket,
  },
  {
    id: 4,
    name: "Genuine products",
    message: "Every order is packed with care and delivered with confidence.",
    icon: ShieldCheck,
  },
];

const Testimonials = () => {
  const { testimonials = benefits } = useStore();
  return (
    <section className="bg-white py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Why shop with us</p>
          <h2 className="mt-2 text-2xl font-semibold text-gray-900 sm:text-3xl">Everything you need, made easy.</h2>
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 divide-y divide-slate-200 border-y border-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {testimonials.map((benefit, index) => {
            const Icon = [Clock3, Tag, ShoppingBasket, ShieldCheck][index] || ShieldCheck;
            return (
            <div key={benefit.id} className="p-5 sm:p-6">
              <Icon className="h-7 w-7 text-primary" strokeWidth={1.7} />
              <h3 className="mt-4 font-semibold text-slate-900">{benefit.name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{benefit.message}</p>
            </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;