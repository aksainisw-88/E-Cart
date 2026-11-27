import { Headset, PackageCheck, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import FeaturedProducts from "../components/home/FeaturedProducts";
import Footer from "../components/home/Footer";
import HeroSlider from "../components/home/HeroSlider";
import ShopCategories from "../components/home/ShopCategories";
import SpecialOffers from "../components/home/SpecialOffers";
import { useStore } from "../context/storeContext";

const Home = () => {
  const store = useStore();
  const benefits = [
    { icon: Truck, title: `Free delivery over ₹${Number(store.freeDeliveryAbove ?? 999).toLocaleString("en-IN")}`, detail: "On eligible orders", to: "/products" },
    { icon: PackageCheck, title: "Track your order", detail: "See updates from your account", to: "/account/orders" },
    { icon: Headset, title: "We're here to help", detail: "Get support with your order", to: "/contact" },
  ];

  return (
    <main>
      <HeroSlider />

      <section aria-label="Shopping services" className="bg-[#faf9f6] px-4 pb-6 sm:px-6 sm:pb-10 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-3 sm:gap-4">
          {benefits.map(({ icon: Icon, title, detail, to }) => (
            <Link key={title} to={to} className="group flex items-center gap-4 border-b border-[#e7e9df] px-2 py-4 transition hover:border-[#7e997b] sm:border-b-0 sm:border-r sm:px-5 sm:last:border-r-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#edf2e8] text-[#496748] transition group-hover:bg-[#496748] group-hover:text-white"><Icon className="h-5 w-5" /></span>
              <span className="min-w-0"><strong className="block truncate text-sm font-bold text-[#27362a]">{title}</strong><span className="mt-0.5 block text-xs text-[#7c8578]">{detail}</span></span>
            </Link>
          ))}
        </div>
      </section>

      <ShopCategories />
      <FeaturedProducts />
      <SpecialOffers />

      <section className="bg-white px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#073f35] via-[#08624f] to-[#10846a] p-6 text-white shadow-xl shadow-emerald-950/10 sm:flex-row sm:items-center sm:p-9">
          <div className="max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">Need a hand?</p>
            <h2 className="mt-2 text-xl font-bold sm:text-2xl">We can help with your order.</h2>
            <p className="mt-2 text-sm leading-6 text-emerald-50/80">Ask our team a question or check your latest order updates from your account.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/contact" className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-emerald-900 transition hover:bg-emerald-50">Contact support</Link>
            <Link to="/account/orders" className="inline-flex h-11 items-center justify-center rounded-xl border border-white/30 px-4 text-sm font-bold text-white transition hover:bg-white/10">Track an order</Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Home;
