import HeroSlider from "../components/home/HeroSlider";
import ShopCategories from "../components/home/ShopCategories";
import FeaturedProducts from "../components/home/FeaturedProducts";
import SpecialOffers from "../components/home/SpecialOffers";
import Testimonials from "../components/home/Testimonials";
import Footer from "../components/home/Footer";

const Home = () => {
  return (
    <main>
      <HeroSlider />

      <ShopCategories />

      <FeaturedProducts />

      <SpecialOffers />

      <Testimonials />

      <Footer />
    </main>
  );
};

export default Home;