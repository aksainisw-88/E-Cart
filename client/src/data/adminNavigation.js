import {
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  CreditCard,
  Store,
  Tag,
  LifeBuoy,
  UserRound,
  Users,
  BarChart3,
  MapPin,
  MessageSquareQuote,
  ImagePlus,
} from "lucide-react";

export const adminNavigation = [
  { label: "Overview", to: "/admin", icon: LayoutDashboard, roles: ["admin"] },
  { label: "Reports", to: "/admin/reports", icon: BarChart3, roles: ["admin", "manager", "user"] },
  { label: "Products", to: "/admin/products", icon: Package, roles: ["admin", "manager", "user"] },
  { label: "Users", to: "/admin/users", icon: UserRound, roles: ["admin"] },
  { label: "Customers", to: "/admin/customers", icon: Users, roles: ["admin", "manager", "user"] },
  { label: "Orders", to: "/admin/orders", icon: ShoppingCart, roles: ["admin", "manager", "user"] },
  { label: "Payments received", to: "/admin/payments", icon: CreditCard, roles: ["admin", "manager", "user"] },
  { label: "Store management", to: "/admin/store", icon: Store, roles: ["admin"] },
  { label: "Testimonials", to: "/admin/testimonials", icon: MessageSquareQuote, roles: ["admin"] },
  { label: "Hero slider", to: "/admin/hero-slider", icon: ImagePlus, roles: ["admin"] },
  { label: "Delivery area", to: "/admin/store/delivery", icon: MapPin, roles: ["admin"] },
  { label: "Offers & promotions", to: "/admin/offers", icon: Tag, roles: ["admin"] },
  { label: "Support inbox", to: "/admin/support", icon: LifeBuoy, roles: ["admin"] },
];

export const adminSecondaryNavigation = [
  { label: "Settings", to: "/admin/settings", icon: Settings, roles: ["admin"] },
];