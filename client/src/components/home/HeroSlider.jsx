import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import { useStore } from "../../context/storeContext";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

const API_URL = import.meta.env.VITE_API_URL || "";

const slides = [
  {
    id: 1,
    eyebrow: "Fresh care for every day",
    title: "Good health starts with better choices.",
    description: "Quality medicines, wellness essentials and personal care delivered to your doorstep.",
    button: "Shop now",
    to: "/products",
    image: "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=1400&q=85",
  },
  {
    id: 2,
    eyebrow: "Everything in one place",
    title: "Your everyday wellness, made simple.",
    description:
      "Everything you need for your health and wellness in one place.",
    button: "Explore Products",
    to: "/products",
    image:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 3,
    eyebrow: "Small steps, big difference",
    title: "Feel your best, every single day.",
    description:
      "Discover our collection of wellness and personal care products.",
    button: "View Collection",
    to: "/products",
    image:
      "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1200&q=80",
  },
];

const HeroSlider = () => {
  const { heroSlides = slides } = useStore();
  const activeSlides = heroSlides.length === 3 ? heroSlides : slides;
  return (
    <section className="w-full">
      <Swiper
        modules={[Autoplay, Pagination, Navigation]}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        pagination={{
          clickable: true,
        }}
        navigation
        loop
        className="hero-slider"
      >
        {activeSlides.map((slide, index) => (
          <SwiperSlide key={slide.id || index}>
            <div className="relative h-[360px] w-full overflow-hidden sm:h-[430px]">
              <img
                src={slide.image?.startsWith("/") ? `${API_URL}${slide.image}` : slide.image}
                alt={slide.title}
                className="absolute inset-0 h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-[#103f32]/90 via-[#103f32]/55 to-transparent" />

              <div className="relative mx-auto flex h-full max-w-7xl items-center px-6 lg:px-8">
                <div className="max-w-xl text-white">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                    {slide.eyebrow}
                  </p>

                  <h2 className="max-w-lg text-4xl font-semibold leading-[1.08] md:text-6xl">
                    {slide.title}
                  </h2>

                  <p className="mt-5 max-w-md text-base leading-7 text-white/85 md:text-lg">
                    {slide.description}
                  </p>

                  <Link
                    to={slide.to}
                    className="mt-7 inline-flex rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#126b49] transition hover:bg-emerald-50"
                  >
                    {slide.button}
                  </Link>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
};

export default HeroSlider;