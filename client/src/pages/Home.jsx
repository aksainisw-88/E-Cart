import HeroSlider from "../components/home/HeroSlider";
import ShopCategories from "../components/home/ShopCategories";
import FeaturedProducts from "../components/home/FeaturedProducts";
import SpecialOffers from "../components/home/SpecialOffers";
import Footer from "../components/home/Footer";
import { Headset, LockKeyhole, PackageCheck } from "lucide-react";

const shoppingBenefits = [
  { icon: LockKeyhole, title: "Secure checkout", detail: "Protected payment options" },
  { icon: PackageCheck, title: "Order updates", detail: "Follow each order from your account" },
  { icon: Headset, title: "Here to help", detail: "Get support when you need it" },
];

const Home = () => {
  return (
    <main>
      <HeroSlider />
      <section aria-label="Shopping benefits" className="border-b border-slate-100 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-slate-100 px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">
          {shoppingBenefits.map(({ icon: Icon, title, detail }) => (
            <div key={title} className="flex items-center gap-3 py-4 sm:justify-center sm:px-4 lg:py-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-primary"><Icon className="h-5 w-5" /></span>
              <span><strong className="block text-sm text-slate-800">{title}</strong><span className="mt-0.5 block text-xs text-slate-500">{detail}</span></span>
            </div>
          ))}
        </div>
      </section>
      <ShopCategories />
      <FeaturedProducts />
      <SpecialOffers />

      <Footer />
    </main>
  );
};

export default Home;
