import { ArrowUpRight, Headphones, Heart, LayoutDashboard, Package } from "lucide-react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/account", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/account/orders", label: "Orders", icon: Package },
  { to: "/wishlist", label: "Saved items", icon: Heart },
  { to: "/contact", label: "Help & support", icon: Headphones },
];

const CustomerAccountNav = () => (
  <nav aria-label="Customer account" className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm lg:sticky lg:top-28 lg:h-fit lg:p-3">
    <p className="hidden px-3 pb-3 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 lg:block">Your account</p>
    <div className="flex gap-1 overflow-x-auto lg:flex-col">
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `group flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition lg:w-full ${isActive ? "bg-emerald-50 text-primary" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
        >
          {({ isActive }) => <>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-white text-primary shadow-sm" : "bg-slate-50 text-slate-500 group-hover:text-slate-800"}`}><Icon className="h-4 w-4" /></span>
            <span className="flex-1 text-left">{label}</span>
            <ArrowUpRight className={`hidden h-3.5 w-3.5 lg:block ${isActive ? "text-primary" : "text-slate-300"}`} />
          </>}
        </NavLink>
      ))}
    </div>
  </nav>
);

export default CustomerAccountNav;
