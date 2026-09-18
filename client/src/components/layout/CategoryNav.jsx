import { Menu, Store } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Medicines", path: "/medicines" },
  { label: "Health Care", path: "/health-care" },
  { label: "Personal Care", path: "/personal-care" },
  { label: "Baby Care", path: "/baby-care" },
  { label: "Devices", path: "/devices" },
  { label: "Wellness", path: "/wellness" },
  { label: "Offers", path: "/offers" },
  { label: "Contact Us", path: "/contact" },
];

const CategoryNav = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="border-b border-slate-200 bg-white text-slate-700">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[52px] items-center">
          <button
            type="button"
            className="mr-3 flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <span className="text-sm font-semibold text-slate-700 md:hidden">Shop categories</span>

          <NavLink to="/products" className="mr-5 hidden items-center gap-2 text-sm font-semibold text-primary md:flex">
            <Store size={17} /> Shop all
          </NavLink>

          <div className="hidden h-full items-center md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex h-full items-center px-3 text-sm transition ${
                    isActive ? "font-semibold text-primary" : "text-slate-500 hover:text-primary"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        {menuOpen && (
          <div className="space-y-1 border-t border-slate-100 pb-3 pt-2 md:hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm transition ${
                    isActive ? "bg-emerald-50 font-semibold text-primary" : "hover:bg-slate-50"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default CategoryNav;