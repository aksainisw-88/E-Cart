import { ArrowRight, Check, ShieldCheck, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { useStore } from "../../context/storeContext";
import { getBusinessProfile } from "../../data/businessTypes";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

const API_URL = import.meta.env.VITE_API_URL || "";

const defaultSlides = [
  {
    id: 1,
    eyebrow: "Care for every day",
    title: "Feel good about your everyday essentials.",
    description: "Trusted medicines, wellness favorites, and personal care for your whole family.",
    button: "Shop essentials",
    to: "/products",
    image: "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=1800&q=90",
  },
  {
    id: 2,
    eyebrow: "Make room for wellbeing",
    title: "A little easier. A little healthier.",
    description: "Find thoughtful essentials for the routines that make you feel your best.",
    button: "Explore products",
    to: "/products",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1800&q=90",
  },
  {
    id: 3,
    eyebrow: "Shop with confidence",
    title: "Everyday care, delivered with care.",
    description: "Discover useful favorites and keep your orders easy to find and follow.",
    button: "Browse the store",
    to: "/products",
    image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1800&q=90",
  },
];

const businessImages = {
  garments: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1800&q=90",
  footwear: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1800&q=90",
  supermarket: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1800&q=90",
  grocery: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1800&q=90",
  electronics: "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1800&q=90",
  beauty: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1800&q=90",
  home_living: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1800&q=90",
  furniture: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1800&q=90",
  jewelry: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1800&q=90",
  toys: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=1800&q=90",
  books_stationery: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1800&q=90",
  sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1800&q=90",
  pet_supplies: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=1800&q=90",
  general: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1800&q=90",
};

const HeroSlider = () => {
  const store = useStore();
  const { heroSlides = [] } = store;
  const businessProfile = getBusinessProfile(store.businessType);
  const businessDefaultSlide = {
    ...defaultSlides[0],
    eyebrow: `The ${businessProfile.label.toLowerCase()} edit`,
    title: businessProfile.productHeading,
    description: businessProfile.productDescription,
    button: "Shop the collection",
    image: businessImages[store.businessType] || defaultSlides[0].image,
  };
  const activeSlides = store.heroSlidesConfigured && heroSlides.length === 3
    ? heroSlides
    : store.businessType === "pharmacy" ? defaultSlides : [businessDefaultSlide];
  const freeDeliveryAbove = Number(store.freeDeliveryAbove ?? 999);

  return (
    <section aria-label="Featured store collections" className="bg-[#faf9f6] px-4 pb-8 pt-5 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8">
      <div className="mx-auto max-w-[1380px]">
        <Swiper
          modules={[Autoplay, Pagination, Navigation]}
          autoplay={activeSlides.length > 1 ? { delay: 6500, disableOnInteraction: false } : false}
          pagination={{ clickable: true }}
          navigation
          loop={activeSlides.length > 1}
          className="hero-slider overflow-hidden rounded-[1.8rem] bg-[#e9f1e9] shadow-[0_26px_70px_-42px_rgba(23,55,36,0.38)] sm:rounded-[2.5rem]"
        >
          {activeSlides.map((slide, index) => (
            <SwiperSlide key={slide.id || index}>
              <div className="relative isolate min-h-[520px] overflow-hidden sm:min-h-[540px] lg:min-h-[590px]">
                <img
                  src={slide.image?.startsWith("/") ? `${API_URL}${slide.image}` : slide.image}
                  alt=""
                  fetchPriority={index === 0 ? "high" : "auto"}
                  className="absolute inset-0 z-0 h-full w-full object-cover object-center lg:object-[center_42%]"
                />
                <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(238,244,232,0.98)_0%,rgba(238,244,232,0.96)_37%,rgba(238,244,232,0.72)_58%,rgba(238,244,232,0.04)_100%)] max-lg:bg-[linear-gradient(90deg,rgba(238,244,232,0.98)_0%,rgba(238,244,232,0.94)_45%,rgba(238,244,232,0.55)_100%)] max-sm:bg-[linear-gradient(90deg,rgba(238,244,232,0.98)_0%,rgba(238,244,232,0.9)_72%,rgba(238,244,232,0.68)_100%)]" />
                <div className="pointer-events-none absolute -left-28 -top-36 z-10 h-[27rem] w-[27rem] rounded-full border border-[#526f4e]/10" />
                <div className="relative z-20 flex min-h-[520px] items-center px-6 py-12 sm:min-h-[540px] sm:px-12 lg:min-h-[590px] lg:px-[7%]">
                  <div className="max-w-[570px] pb-8 text-[#213526]">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#456747]/15 bg-white/60 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#456747] backdrop-blur-sm sm:text-[11px]">
                      <ShieldCheck className="h-4 w-4" />{slide.eyebrow}
                    </span>
                    <h2 className="mt-6 max-w-[560px] text-[2.7rem] font-semibold leading-[1.04] tracking-[-0.045em] sm:text-5xl lg:text-[4.35rem]">
                      {slide.title}
                    </h2>
                    <p className="mt-5 max-w-md text-sm leading-7 text-[#526151] sm:text-base sm:leading-7">
                      {slide.description}
                    </p>
                    <div className="mt-7 flex flex-wrap items-center gap-3">
                      <Link to={slide.to || "/products"} className="inline-flex h-12 items-center gap-3 rounded-full bg-[#28533a] px-6 text-sm font-bold text-white shadow-lg shadow-[#28533a]/15 transition hover:-translate-y-0.5 hover:bg-[#1e432e]">
                        {slide.button || "Shop now"}<ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link to="/offers" className="inline-flex h-12 items-center rounded-full px-5 text-sm font-bold text-[#3f5940] transition hover:bg-white/60">Explore offers</Link>
                    </div>
                    <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-[#647260]">
                      <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#538257]" />Thoughtfully selected</span>
                      <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#538257]" />Easy order tracking</span>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-5 right-5 z-20 hidden min-w-56 items-center gap-3 rounded-2xl border border-white/75 bg-white/85 p-4 text-[#29452f] shadow-lg shadow-black/5 backdrop-blur-md sm:flex lg:bottom-8 lg:right-8">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf3e9]"><Truck className="h-5 w-5" /></span>
                  <span><span className="block text-[10px] font-bold uppercase tracking-wider text-[#798675]">A little extra</span><span className="mt-0.5 block text-sm font-bold">Free delivery over ₹{freeDeliveryAbove.toLocaleString("en-IN")}</span></span>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

export default HeroSlider;
