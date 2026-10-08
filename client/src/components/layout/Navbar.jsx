import TopBar from "./TopBar";
import MainHeader from "./MainHeader";
import CategoryNav from "./CategoryNav";

const Navbar = () => {
  return (
    <header className="sticky top-0 z-40 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <TopBar />
      <MainHeader />
      <CategoryNav />
    </header>
  );
};

export default Navbar;
