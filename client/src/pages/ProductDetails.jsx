import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, Minus, Plus, ShoppingCart, Star } from "lucide-react";

import Footer from "../components/home/Footer";
import ProductCard from "../components/home/ProductCard";
import { useCart } from "../context/cartContext";
import { useWishlist } from "../context/wishlistContext";

const API_URL = import.meta.env.VITE_API_URL || "";

const ALL_REVIEWS = [
  { name: "Aarav", rating: 5, comment: "Excellent quality and delivery was fast." },
  { name: "Meera", rating: 4, comment: "Very useful product. Works exactly as expected." },
  { name: "Karan", rating: 5, comment: "Looks premium and feels reliable. Highly recommended." },
  { name: "Nisha", rating: 4, comment: "Good packaging and support was responsive." },
];

const ProductDetails = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isSaved, toggleWishlist } = useWishlist();
  const [quantity, setQuantity] = useState(1);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState("");

  useEffect(() => {
    let active = true;

    fetch(`${API_URL}/api/catalog/products`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load product details.");

        return (result.data || []).map((item) => ({
          ...item,
          id: item._id || item.id,
          image: item.image ? `${API_URL}${item.image}` : "",
          images: (item.images?.length ? item.images : item.image ? [item.image] : []).map((image) => `${API_URL}${image}`),
          category: item.category || "General",
        }));
      })
      .then((catalog) => {
        if (!active) return;
        setProducts(catalog);
        setSelectedImage(catalog.find((item) => String(item.id) === String(productId))?.images?.[0] || "");
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setProducts([]);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId]);

  const product = useMemo(
    () => products.find((item) => String(item.id) === String(productId)) || null,
    [productId, products]
  );

  const similarProducts = useMemo(
    () =>
      product
        ? products
            .filter((item) => item.id !== product.id && item.category === product.category)
            .slice(0, 4)
        : [],
    [product, products]
  );

  const averageRating = product
    ? (product.rating + (ALL_REVIEWS.reduce((total, review) => total + review.rating, 0) / ALL_REVIEWS.length)) / 2
    : 0;

  const increaseQty = () => setQuantity((value) => value + 1);
  const decreaseQty = () => setQuantity((value) => Math.max(1, value - 1));

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, quantity);
    navigate("/cart");
  };

  const saved = product ? isSaved(product) : false;
  const stock = Number(product?.stock ?? 0);
  const outOfStock = stock <= 0;

  if (loading) {
    return (
      <>
        <main className="bg-gray-50 pb-16">
          <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
            <p className="text-sm font-medium text-gray-500">Loading product details...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <main className="bg-gray-50 pb-16">
          <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900">Product not found</h1>
            <Link to="/products" className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white">
              Browse products
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const gallery = product.images?.length ? product.images : [product.image].filter(Boolean);
  const imageUrl = selectedImage || gallery[0] || "https://placehold.co/900x900/f3f4f6/111827?text=Product";

  return (
    <>
      <main className="bg-gray-50 pb-16">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-primary hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-3 pb-4">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                {product.brand ? `${product.brand} · ` : ""}{product.category}
              </span>
              {product.discount && (
                <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white">
                  {product.discount}% OFF
                </span>
              )}
            </div>

            <div className="flex h-[420px] items-center justify-center rounded-2xl bg-gradient-to-br from-gray-50 to-white p-6 sm:h-[520px]">
              <img
                src={imageUrl}
                alt={product.name}
                className="h-full w-full object-contain"
                onError={(event) => {
                  event.currentTarget.src = "https://placehold.co/900x900/f3f4f6/111827?text=Product";
                }}
              />
            </div>
            {gallery.length > 1 && <div className="mt-4 flex gap-3 overflow-x-auto">{gallery.map((image) => <button key={image} type="button" onClick={() => setSelectedImage(image)} className={`h-16 w-16 shrink-0 rounded-lg border p-1 ${image === imageUrl ? "border-primary ring-2 ring-primary/20" : "border-gray-200"}`}><img src={image} alt="" className="h-full w-full object-contain" /></button>)}</div>}
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-500">{product.brand ? `${product.brand} · ` : ""}{product.category}</p>
                <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">{product.name}</h1>
              </div>
              <button
                type="button"
                aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
                onClick={() => toggleWishlist(product)}
                className={`flex h-11 w-11 items-center justify-center rounded-full border transition ${saved ? "border-red-500 bg-red-500 text-white" : "border-gray-200 text-gray-500 hover:border-primary hover:text-primary"}`}
              >
                <Heart className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, index) => (
                  <Star
                    key={index}
                    size={16}
                    className={index < Math.round(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-gray-700">{product.rating}.0</span>
              <span className="text-sm text-gray-500">({product.reviews} reviews)</span>
            </div>

            <div className="mt-6 flex items-end gap-3">
              <span className="text-3xl font-bold text-primary">₹{product.price}</span>
              {product.originalPrice && (
                <span className="pb-1 text-base text-gray-400 line-through">₹{product.originalPrice}</span>
              )}
            </div>

            <p className="mt-5 text-sm leading-7 text-gray-600">
              Crafted with care for everyday wellness and reliable healthcare support. Ideal for home use, travel, and daily routines.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center rounded-full border border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={decreaseQty}
                  className="flex h-11 w-11 items-center justify-center text-xl text-gray-700 transition hover:text-primary"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-12 text-center text-sm font-semibold text-gray-900">{quantity}</span>
                <button
                  type="button"
                  onClick={increaseQty}
                  className="flex h-11 w-11 items-center justify-center text-xl text-gray-700 transition hover:text-primary"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={outOfStock}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <ShoppingCart className="h-4 w-4" />
                {outOfStock ? "Out of stock" : "Add to Cart"}
              </button>
            </div>

            <div className="mt-7 grid gap-3 text-sm text-gray-700 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-gray-500">Shipping</p>
                <p className="mt-1 font-semibold">Free over ₹499</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-gray-500">Availability</p>
                <p className={`mt-1 font-semibold ${outOfStock ? "text-red-600" : stock <= 5 ? "text-amber-600" : "text-emerald-600"}`}>{outOfStock ? "Out of stock" : stock <= 5 ? `Only ${stock} left` : `${stock} in stock`}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-gray-500">Return</p>
                <p className="mt-1 font-semibold">14-day easy return</p>
              </div>
            </div>
          </section>
        </div>

        <div className="mx-auto mt-14 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">Product details</h2>
              <div className="mt-5 space-y-4 text-sm leading-7 text-gray-600">
                <p>
                  This product is selected for quality, efficacy, and everyday comfort. It supports a balanced wellness routine and is suitable for personal care and household use.
                </p>
                <p>
                  Each item is sourced from trusted partners and checked for authenticity before reaching your doorstep.
                </p>
              </div>

              <div className="mt-8 rounded-2xl bg-gray-50 p-5">
                <h3 className="text-lg font-semibold text-gray-900">Specs</h3>
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  <li>• Premium build quality and safe materials</li>
                  <li>• Compact and travel-friendly design</li>
                  <li>• Easy-to-use everyday application</li>
                  <li>• Trusted by thousands of customers</li>
                </ul>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Customer feedback</h2>
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  {averageRating.toFixed(1)} avg rating
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {ALL_REVIEWS.map((review) => (
                  <div key={review.name} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-gray-900">{review.name}</p>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, index) => (
                          <Star
                            key={index}
                            size={14}
                            className={index < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-gray-600">{review.comment}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-gray-900">Similar products</h2>
            <Link to="/products" className="text-sm font-semibold text-primary hover:text-primary-dark">
              View all
            </Link>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {similarProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default ProductDetails;
