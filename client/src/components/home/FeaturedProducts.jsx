import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ProductCard from "./ProductCard";

const API_URL = import.meta.env.VITE_API_URL || "";

const FeaturedProducts = () => {
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
    <section className="bg-white py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Customer favourites
            </p>

            <h2 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">
              Popular products
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Everyday essentials, picked for quality and value.
            </p>
          </div>

          <Link
            to="/products"
            className="inline-flex items-center text-sm font-semibold text-primary transition hover:text-primary-dark"
          >
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
            Loading available products...
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">
            No products are currently available in the database.
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProducts;