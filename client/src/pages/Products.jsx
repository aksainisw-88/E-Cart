import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";

import Footer from "../components/home/Footer";
import ProductCard from "../components/home/ProductCard";
import { productCategories } from "../data/products";

const API_URL = import.meta.env.VITE_API_URL || "";

const categoryLabels = {
  medicines: "Medicines",
  "health-care": "Health Care",
  "personal-care": "Personal Care",
  "baby-care": "Baby Care",
  devices: "Medical Devices",
  wellness: "Wellness",
  vitamins: "Vitamins & Supplements",
  "first-aid": "First Aid",
};

const normalizeCategory = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "all";

const Products = () => {
  const { category } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const routeCategory = category ? categoryLabels[category] || category : "All Products";
  const initialCategory = productCategories.includes(routeCategory) ? routeCategory : "All Products";

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("search") || "");
  const [priceLimit, setPriceLimit] = useState("all");
  const [sortOrder, setSortOrder] = useState("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    // Route category changes need to reset the selected filter.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    let active = true;

    fetch(`${API_URL}/api/catalog/products`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load products.");
        return result;
      })
      .then((result) => {
        if (!active) return;
        const normalizedItems = (result.data || []).map((product) => ({
          ...product,
          id: product._id,
          image: product.image ? `${API_URL}${product.image}` : "",
          images: (product.images?.length ? product.images : product.image ? [product.image] : []).map((image) => `${API_URL}${image}`),
          category: product.category || "General",
        }));
        const imageResults = location.state?.imageSearchResults;
        setProducts(imageResults?.length ? imageResults.map((product) => ({ ...product, id: product._id, image: product.image ? `${API_URL}${product.image}` : "", images: (product.images?.length ? product.images : product.image ? [product.image] : []).map((image) => `${API_URL}${image}`), category: product.category || "General" })) : normalizedItems);
        setLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error.message);
        setLoading(false);
      });

    return () => { active = false; };
  }, [location.state?.imageSearchResults]);

  const visibleProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const productCategory = product.category || "General";
      const categoryMatch = selectedCategory === "All Products" ||
        normalizeCategory(productCategory) === normalizeCategory(selectedCategory);
      const matchesSearch = `${product.name} ${productCategory}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesPrice = priceLimit === "all" || Number(product.price) <= Number(priceLimit);

      return categoryMatch && matchesSearch && matchesPrice;
    });

    return [...filtered].sort((first, second) => {
      if (sortOrder === "price-low") return Number(first.price) - Number(second.price);
      if (sortOrder === "price-high") return Number(second.price) - Number(first.price);
      if (sortOrder === "rating") return Number(second.rating || 0) - Number(first.rating || 0);
      return Number(first.id) - Number(second.id);
    });
  }, [priceLimit, products, searchTerm, selectedCategory, sortOrder]);

  const clearFilters = () => {
    setSelectedCategory("All Products");
    setSearchTerm("");
    setPriceLimit("all");
    setSortOrder("featured");
  };

  return (
    <>
      <main className="bg-gray-50">
        <section className="border-b bg-white">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Our Products</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">Healthcare for every day</h1>
            <p className="mt-3 max-w-2xl text-gray-500">
              Browse trusted medicines, wellness essentials, and healthcare devices delivered to your door.
            </p>

            <div className="relative mt-7 max-w-2xl">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search products or categories"
                className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-12 pr-4 text-sm outline-none transition focus:border-primary focus:bg-white"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setFiltersOpen((isOpen) => !isOpen)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
            <p className="text-sm text-gray-500">{visibleProducts.length} products</p>
            <label className="flex items-center gap-2 text-sm text-gray-500">
              <span className="hidden sm:inline">Sort by</span>
              <span className="relative">
                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  className="appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-9 font-medium text-gray-700 outline-none focus:border-primary"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: Low to high</option>
                  <option value="price-high">Price: High to low</option>
                  <option value="rating">Top rated</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              </span>
            </label>
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[220px_1fr]">
            <aside className={`${filtersOpen ? "block" : "hidden"} rounded-xl border border-gray-200 bg-white p-5 lg:block`}>
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                  <Filter className="h-4 w-4 text-primary" />
                  Filters
                </h2>
                <button type="button" onClick={clearFilters} className="text-xs font-semibold text-primary hover:text-primary-dark">
                  Clear all
                </button>
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold text-gray-900">Categories</p>
                <div className="mt-3 space-y-2.5">
                  {productCategories.map((productCategory) => (
                    <button
                      key={productCategory}
                      type="button"
                      onClick={() => setSelectedCategory(productCategory)}
                      className={`block w-full text-left text-sm transition ${selectedCategory === productCategory ? "font-semibold text-primary" : "text-gray-500 hover:text-gray-900"}`}
                    >
                      {productCategory}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-7 border-t border-gray-100 pt-6">
                <p className="text-sm font-semibold text-gray-900">Price range</p>
                <div className="mt-3 space-y-2.5">
                  {[
                    { value: "all", label: "All prices" },
                    { value: "300", label: "Under ₹300" },
                    { value: "700", label: "Under ₹700" },
                    { value: "1500", label: "Under ₹1,500" },
                  ].map((limit) => (
                    <label key={limit.value} className="flex items-center gap-2 text-sm text-gray-500">
                      <input
                        type="radio"
                        name="price"
                        value={limit.value}
                        checked={priceLimit === limit.value}
                        onChange={(event) => setPriceLimit(event.target.value)}
                        className="accent-teal-600"
                      />
                      {limit.label}
                    </label>
                  ))}
                </div>
              </div>
            </aside>

            <div>
              {selectedCategory !== "All Products" && (
                <div className="mb-5 flex items-center gap-2 text-sm text-gray-600">
                  <span>Showing:</span>
                  <button type="button" onClick={() => setSelectedCategory("All Products")} className="flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 font-medium text-primary">
                    {selectedCategory}
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {loading ? (
                <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-500">Loading products from the store...</div>
              ) : loadError ? (
                <div className="rounded-xl border border-red-100 bg-red-50 px-6 py-16 text-center text-sm text-red-700">{loadError}</div>
              ) : visibleProducts.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
                  <h2 className="text-lg font-semibold text-gray-900">No products found</h2>
                  <p className="mt-2 text-sm text-gray-500">Try a different search or clear your filters.</p>
                  <button type="button" onClick={clearFilters} className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark">
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Products;