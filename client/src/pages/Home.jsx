import HeroSlider from "../components/home/HeroSlider";
import ShopCategories from "../components/home/ShopCategories";
import FeaturedProducts from "../components/home/FeaturedProducts";
import SpecialOffers from "../components/home/SpecialOffers";
import Footer from "../components/home/Footer";

const Home = () => {
  return (
    <main>
      <HeroSlider />
      <FeaturedProducts />

      <ShopCategories />

      <SpecialOffers />

      <Footer />
    </main>
  );
};

export default Home;