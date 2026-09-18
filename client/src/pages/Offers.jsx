import { useEffect, useState } from "react";
import { Check, Copy, Tag } from "lucide-react";
import { useCart } from "../context/cartContext";
import Footer from "../components/home/Footer";

const API_URL = import.meta.env.VITE_API_URL || "";
const offerLabel = (offer) => {
  if (offer.offerType === "buy_one_get_one") return "Buy 1 Get 1";
  if (offer.offerType === "buy_product_get_product") return "Buy product, get another free";
  return offer.discountType === "percentage" ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`;
};
const Offers = () => {
  const [offers, setOffers] = useState([]); const [copied, setCopied] = useState("");
  const { items, applyPromo, promoCode } = useCart();
  useEffect(() => { fetch(`${API_URL}/api/catalog/offers`).then((response) => response.json()).then((result) => setOffers(result.data || [])).catch(() => {}); }, []);
  const copy = async (code) => { await navigator.clipboard?.writeText(code); setCopied(code); setTimeout(() => setCopied(""), 1600); };
  const claim = async (code) => { if (items.length) await applyPromo(code); await copy(code); };
  return <><main className="bg-gray-50 py-12 sm:py-16"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><p className="text-sm font-semibold uppercase tracking-wide text-primary">Save more on healthcare</p><h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">Offers & promotions</h1><p className="mt-3 max-w-2xl text-gray-500">Claim a code here, then see the savings applied at checkout.</p>{offers.length ? <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{offers.map((offer) => <article key={offer._id} className="relative overflow-hidden rounded-2xl border border-teal-100 bg-white p-6 shadow-sm"><div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-teal-50" /><Tag className="relative h-7 w-7 text-primary" /><h2 className="mt-7 text-xl font-bold text-gray-900">{offer.title}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-gray-500">{offer.description}</p><p className="mt-5 text-3xl font-bold text-primary">{offerLabel(offer)}</p>{offer.code && <div className="mt-5 flex gap-2"><button type="button" onClick={() => claim(offer.code)} className="flex min-w-0 flex-1 items-center justify-between rounded-lg border border-dashed border-primary bg-teal-50 px-3 py-2 text-sm font-bold tracking-wider text-primary"><span>{promoCode === offer.code ? "Claimed" : copied === offer.code ? "Copied" : offer.code}</span>{promoCode === offer.code ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button></div>}<p className="mt-4 text-xs text-gray-400">Minimum order ₹{offer.minOrder} · Valid until {new Date(offer.endsAt).toLocaleDateString()}</p></article>)}</div> : <div className="mt-10 rounded-xl border border-dashed border-gray-300 bg-white p-20 text-center text-sm text-gray-500">No active offers right now. Check back soon.</div>}</div></main><Footer /></>;
};

export default Offers;
