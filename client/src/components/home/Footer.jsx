import {
  Globe,
  HeartPulse,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "../../context/storeContext";

const shopLinks = [
  { label: "Medicines", to: "/medicines" },
  { label: "Vitamins & Supplements", to: "/vitamins" },
  { label: "Personal Care", to: "/personal-care" },
  { label: "Medical Devices", to: "/devices" },
];

const supportLinks = [
  { label: "Contact Us", to: "/contact" },
  { label: "Track Order", to: "/account/orders" },
  { label: "Shipping & Delivery", to: "/products" },
  { label: "FAQs", to: "/offers" },
];

const Footer = () => {
  const store = useStore();
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr_1fr_1.1fr]">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-primary text-white">
                {store.logoUrl ? <img src={store.logoUrl} alt="" className="h-full w-full object-contain" /> : <HeartPulse className="h-6 w-6" />}
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{store.name}</p>
                <p className="text-xs text-slate-400">{store.tagline}</p>
              </div>
            </div>

            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-500">
              Trusted healthcare products delivered to your doorstep with care,
              speed, and confidence.
            </p>

            <div className="mt-6 flex gap-3">
              {[MessageCircle, Send, Globe].map((Icon, index) => (
                <a
                  key={index}
                  href={index === 0 ? "https://www.facebook.com" : index === 1 ? "https://www.instagram.com" : "https://x.com"}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={["Facebook", "Instagram", "Twitter"][index]}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-primary hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">Shop</h2>
            <ul className="mt-5 space-y-3 text-sm">
              {shopLinks.map((link) => (
                <li key={link.label}>
                  <Link className="transition hover:text-primary" to={link.to}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">Customer Care</h2>
            <ul className="mt-5 space-y-3 text-sm">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link className="transition hover:text-primary" to={link.to}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">Stay connected</h2>
            <p className="mt-5 text-sm leading-6 text-slate-500">
              Get wellness tips and exclusive offers in your inbox.
            </p>
            <form className="mt-4 flex max-w-sm" onSubmit={(event) => event.preventDefault()}>
              <label className="sr-only" htmlFor="footer-email">Email address</label>
              <input
                id="footer-email"
                type="email"
                placeholder="Your email address"
                className="min-w-0 flex-1 rounded-l-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary"
              />
              <button
                type="submit"
                aria-label="Subscribe to newsletter"
                className="flex items-center justify-center rounded-r-lg bg-primary px-4 text-white transition hover:bg-primary-dark"
              >
                <Mail className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 grid gap-4 border-y border-slate-200 py-5 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 text-primary" />
            <span>Fast, reliable delivery</span>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span>100% genuine products</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-primary" />
            <span>Support: {store.phone || "-"}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 {store.name}. All rights reserved.</p>
          <div className="flex gap-5">
            <Link className="transition hover:text-primary" to="/contact">Privacy Policy</Link>
            <Link className="transition hover:text-primary" to="/contact">Terms of Service</Link>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            <span>Serving customers across India</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;