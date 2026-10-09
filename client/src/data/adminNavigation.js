import {
  LayoutDashboard,
  Package,
  Layers3,
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
  Boxes,
} from "lucide-react";

export const adminNavigation = [
  { label: "Overview", to: "/admin", icon: LayoutDashboard, roles: ["admin"] },
  { label: "Reports", to: "/admin/reports", icon: BarChart3, roles: ["admin", "manager", "user"] },
  { label: "Products", to: "/admin/products", icon: Package, roles: ["admin", "manager", "user"] },
  { label: "Inventory", to: "/admin/inventory", icon: Boxes, roles: ["admin", "manager", "user"] },
  { label: "Categories", to: "/admin/categories", icon: Layers3, roles: ["admin", "manager", "user"] },
  { label: "Users", to: "/admin/users", icon: UserRound, roles: ["admin"] },
  { label: "Customers", to: "/admin/customers", icon: Users, roles: ["admin", "manager", "user"] },
  { label: "Orders", to: "/admin/orders", icon: ShoppingCart, roles: ["admin", "manager", "user"] },
  { label: "POS", to: "/admin/pos", icon: ShoppingCart, roles: ["admin", "manager", "user"] },
  { label: "Purchase entry", to: "/admin/purchase-entry", icon: Package, roles: ["admin", "manager", "user"] },
  { label: "Vendors", to: "/admin/vendors", icon: Store, roles: ["admin", "manager", "user"] },
  { label: "Payments received", to: "/admin/payments", icon: CreditCard, roles: ["admin", "manager", "user"] },
  { label: "Store management", to: "/admin/store", icon: Store, roles: ["admin"], children: [
    { label: "Store locations", to: "/admin/stores", icon: Store, roles: ["admin"] },
    { label: "Testimonials", to: "/admin/testimonials", icon: MessageSquareQuote, roles: ["admin"] },
    { label: "Hero slider", to: "/admin/hero-slider", icon: ImagePlus, roles: ["admin"] },
    { label: "Delivery area", to: "/admin/store/delivery", icon: MapPin, roles: ["admin"] },
  ] },
  { label: "Offers & promotions", to: "/admin/offers", icon: Tag, roles: ["admin"] },
  { label: "Support inbox", to: "/admin/support", icon: LifeBuoy, roles: ["admin"] },
];

export const adminSecondaryNavigation = [
  { label: "Settings", to: "/admin/settings", icon: Settings, roles: ["admin"] },
];