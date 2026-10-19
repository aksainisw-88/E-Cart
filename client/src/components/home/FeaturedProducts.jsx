import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../../context/storeContext";
import { getBusinessProfile } from "../../data/businessTypes";

import ProductCard from "./ProductCard";

const API_URL = import.meta.env.VITE_API_URL || "";

const FeaturedProducts = () => {
  const store = useStore();
  const businessProfile = getBusinessProfile(store.businessType);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch(`${API_URL}/api/catalog/products`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load products.");
        return result.data || [];
      })
      .then((items) => {
        if (!active) return;

        const availableProducts = items
          .filter((product) => product.status === "Published" && Number(product.stock) > 0)
          .sort((first, second) => Number(second.rating || 0) - Number(first.rating || 0) || Number(second.reviews || 0) - Number(first.reviews || 0))
          .slice(0, 4)
          .map((product) => ({
            ...product,
            id: product._id || product.id,
            image: product.image ? `${API_URL}${product.image}` : "",
          }));

        setProducts(availableProducts);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setProducts([]);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="bg-white py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              Popular picks
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Popular in {businessProfile.label}
            </h2>
            <p className="mt-2 text-sm text-slate-500">{businessProfile.productDescription}</p>
          </div>

          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-primary hover:text-primary"
          >
            Browse all products <span aria-hidden="true">→</span>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white p-3">
                <div className="h-44 rounded-xl bg-slate-100 sm:h-48" />
                <div className="space-y-3 p-4">
                  <div className="h-3 w-24 rounded bg-slate-100" />
                  <div className="h-4 w-full rounded bg-slate-100" />
                  <div className="h-8 w-full rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
            No in-stock products are available right now. Browse the full catalogue to see all products.
            <Link to="/products" className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark">Browse products</Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProducts;
