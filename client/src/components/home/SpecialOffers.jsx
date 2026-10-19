import { useEffect, useState } from "react";
import { ArrowRight, Clock3, Tag } from "lucide-react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";
const offerLabel = (offer) => {
  if (offer.offerType === "buy_one_get_one") return "Buy 1, get 1";
  if (offer.offerType === "buy_product_get_product") return "Buy & get free";
  return offer.discountType === "percentage" ? `${offer.discountValue}% off` : `₹${Number(offer.discountValue).toLocaleString("en-IN")} off`;
};

const SpecialOffers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/catalog/offers`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load offers.");
        return result.data || [];
      })
      .then((items) => {
        if (active) setOffers(items.slice(0, 3));
      })
      .catch(() => {
        if (active) setOffers([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  if (!loading && !offers.length) return null;

  return (
    <section aria-labelledby="home-offers-title" className="bg-[#f4f7f4] py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary"><Tag className="h-3.5 w-3.5" />Current store offers</p>
            <h2 id="home-offers-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Good finds, better value</h2>
            <p className="mt-2 text-sm text-slate-500">See the offers currently available in the store.</p>
          </div>
          <Link to="/offers" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-primary hover:text-primary">
            All offers<ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((item) => <div key={item} className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {offers.map((offer, index) => (
              <article key={offer._id} className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6 ${index === 0 ? "border-emerald-100 bg-gradient-to-br from-emerald-50 to-white" : "border-slate-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-primary shadow-sm"><Tag className="h-5 w-5" /></span>
                  <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-primary ring-1 ring-emerald-100">{offerLabel(offer)}</span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">{offer.title}</h3>
                <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{offer.description}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-4">
                  <span className="text-xs text-slate-500">Minimum order ₹{Number(offer.minOrder || 0).toLocaleString("en-IN")}</span>
                  {offer.endsAt && <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500"><Clock3 className="h-3.5 w-3.5" />Until {new Date(offer.endsAt).toLocaleDateString("en-IN")}</span>}
                </div>
                <Link to="/offers" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary transition hover:gap-2.5">View offer<ArrowRight className="h-4 w-4" /></Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default SpecialOffers;
