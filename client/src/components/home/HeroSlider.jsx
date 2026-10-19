import { ArrowRight, Check, ShieldCheck, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { useStore } from "../../context/storeContext";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

const API_URL = import.meta.env.VITE_API_URL || "";

const defaultSlides = [
  {
    id: 1,
    eyebrow: "Care for every day",
    title: "Your everyday health essentials, all in one place.",
    description: "Find trusted medicines, wellness essentials, and personal care for your whole family.",
    button: "Shop essentials",
    to: "/products",
    image: "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=1800&q=90",
  },
  {
    id: 2,
    eyebrow: "Make room for wellbeing",
    title: "A simpler way to shop for better routines.",
    description: "Explore healthcare, personal care, and wellness products selected for daily life.",
    button: "Explore products",
    to: "/products",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1800&q=90",
  },
  {
    id: 3,
    eyebrow: "Shop with confidence",
    title: "Care that fits your family's routine.",
    description: "Discover useful essentials and keep your orders easy to find and follow.",
    button: "Browse the store",
    to: "/products",
    image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1800&q=90",
  },
];

const HeroSlider = () => {
  const store = useStore();
  const { heroSlides = [] } = store;
  const activeSlides = heroSlides.length === 3 ? heroSlides : defaultSlides;
  const freeDeliveryAbove = Number(store.freeDeliveryAbove ?? 999);

  return (
    <section aria-label="Featured store collections" className="bg-[#f4f7f4] px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <Swiper
          modules={[Autoplay, Pagination, Navigation]}
          autoplay={{ delay: 6500, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          navigation
          loop
          className="hero-slider overflow-hidden rounded-[24px] shadow-[0_24px_60px_-28px_rgba(6,64,47,0.5)] sm:rounded-[30px]"
        >
          {activeSlides.map((slide, index) => (
            <SwiperSlide key={slide.id || index}>
              <div className="relative min-h-[390px] overflow-hidden sm:min-h-[450px] lg:min-h-[520px]">
                <img
                  src={slide.image?.startsWith("/") ? `${API_URL}${slide.image}` : slide.image}
                  alt=""
                  fetchPriority={index === 0 ? "high" : "auto"}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,47,37,0.96)_0%,rgba(7,65,48,0.85)_42%,rgba(7,65,48,0.24)_100%)]" />
                <div className="pointer-events-none absolute -right-24 -top-28 h-[26rem] w-[26rem] rounded-full border border-white/15" />
                <div className="pointer-events-none absolute right-10 top-12 h-64 w-64 rounded-full border border-white/10" />

                <div className="relative flex min-h-[390px] items-center px-6 py-12 sm:min-h-[450px] sm:px-12 lg:min-h-[520px] lg:px-16">
                  <div className="max-w-2xl pb-5 text-white sm:pb-8">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-50 backdrop-blur-sm">
                      <ShieldCheck className="h-4 w-4" />{slide.eyebrow}
                    </span>
                    <h2 className="mt-5 max-w-2xl text-3xl font-bold leading-[1.08] tracking-tight sm:text-4xl lg:text-6xl">
                      {slide.title}
                    </h2>
                    <p className="mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base sm:leading-7">
                      {slide.description}
                    </p>
                    <div className="mt-7 flex flex-wrap items-center gap-3">
                      <Link
                        to={slide.to || "/products"}
                        className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-emerald-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"
                      >
                        {slide.button || "Shop now"}<ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link to="/offers" className="inline-flex h-12 items-center rounded-xl border border-white/30 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/15">
                        See current offers
                      </Link>
                    </div>
                    <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-white/75">
                      <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-300" />Browse by category</span>
                      <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-300" />Track orders online</span>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-7 right-8 hidden min-w-56 items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 text-white shadow-xl backdrop-blur-md lg:flex lg:bottom-9 lg:right-10">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15"><Truck className="h-5 w-5" /></span>
                  <span><span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-100">Delivery perk</span><span className="mt-0.5 block text-sm font-bold">Free over ₹{freeDeliveryAbove.toLocaleString("en-IN")}</span></span>
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
