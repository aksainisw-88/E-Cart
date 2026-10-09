import { Headphones, Heart, LayoutDashboard, Package } from "lucide-react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/account", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/account/orders", label: "Orders", icon: Package },
  { to: "/wishlist", label: "Saved items", icon: Heart },
  { to: "/contact", label: "Help & support", icon: Headphones },
];

const CustomerAccountNav = () => (
  <nav aria-label="Customer account" className="min-w-0 rounded-xl border border-slate-200 bg-white p-2 lg:sticky lg:top-36 lg:h-fit lg:p-3">
    <p className="hidden px-3 pb-3 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 lg:block">Your account</p>
    <div className="flex gap-1 overflow-x-auto lg:flex-col">
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition lg:w-full ${isActive ? "bg-emerald-50 text-primary" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </NavLink>
      ))}
    </div>
  </nav>
);

export default CustomerAccountNav;