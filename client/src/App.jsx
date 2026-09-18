import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import Navbar from "./components/layout/Navbar";
import Home from "./pages/Home";
import Products from "./pages/Products";
import Account from "./pages/Account";
import Wishlist from "./pages/Wishlist";
import Cart from "./pages/Cart";
import ContactUs from "./pages/ContactUs";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSection from "./pages/AdminSection";
import Checkout from "./pages/Checkout";
import Payment from "./pages/Payment";
import CartDrawer from "./components/layout/CartDrawer";
import Offers from "./pages/Offers";
import CustomerOrders from "./pages/CustomerOrders";
import ProductDetails from "./pages/ProductDetails";
import AdminReports from "./pages/AdminReports";
import AdminDeliveryArea from "./pages/AdminDeliveryArea";
import AdminTestimonials from "./pages/AdminTestimonials";
import AdminHeroSlider from "./pages/AdminHeroSlider";

const RequireCustomerAuth = ({ children }) => {
  const location = useLocation();
  const [state, setState] = useState("checking");

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => { if (!response.ok) throw new Error("Unauthenticated"); return response.json(); })
      .then(({ user }) => { if (active) setState(user?.role === "customer" ? "authorized" : "denied"); })
      .catch(() => { if (active) setState("denied"); });
    return () => { active = false; };
  }, []);

  if (state === "checking") return <div className="flex min-h-[55vh] items-center justify-center bg-gray-50 text-sm text-gray-500">Checking your account...</div>;
  if (state !== "authorized") return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return children;
};

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <>
      {!isAdminRoute && <Navbar />}
      {!isAdminRoute && <CartDrawer />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:productId" element={<ProductDetails />} />
        <Route path="/account" element={<Account initialMode="login" />} />
        <Route path="/login" element={<Account initialMode="login" />} />
        <Route path="/register" element={<Account initialMode="signup" />} />
        <Route path="/account/orders" element={<RequireCustomerAuth><CustomerOrders /></RequireCustomerAuth>} />
        <Route path="/wishlist" element={<RequireCustomerAuth><Wishlist /></RequireCustomerAuth>} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<RequireCustomerAuth><Checkout /></RequireCustomerAuth>} />
        <Route path="/payment" element={<RequireCustomerAuth><Payment /></RequireCustomerAuth>} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="products" element={<AdminSection section="products" />} />
          <Route path="users" element={<AdminSection section="users" />} />
          <Route path="customers" element={<AdminSection section="customers" />} />
          <Route path="orders" element={<AdminSection section="orders" />} />
          <Route path="payments" element={<AdminSection section="payments" />} />
          <Route path="store" element={<AdminSection section="store" />} />
          <Route path="testimonials" element={<AdminTestimonials />} />
          <Route path="hero-slider" element={<AdminHeroSlider />} />
          <Route path="store/delivery" element={<AdminDeliveryArea />} />
          <Route path="settings" element={<AdminSection section="settings" />} />
          <Route path="offers" element={<AdminSection section="offers" />} />
          <Route path="support" element={<AdminSection section="support" />} />
        </Route>
        <Route path="/:category" element={<Products />} />
      </Routes>
    </>
  );
}

export default App;