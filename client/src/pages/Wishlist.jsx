import { useEffect, useState } from "react";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import Footer from "../components/home/Footer";
import { useCart } from "../context/cartContext";

const API_URL = import.meta.env.VITE_API_URL || "";

const Wishlist = () => {
  const [savedProducts, setSavedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/catalog/products`).then((response) => response.json()).then((result) => {
      if (!active) return;
      setSavedProducts(result.data.slice(0, 4).map((product) => ({ ...product, id: product._id, image: product.image ? `${API_URL}${product.image}` : "" })));
      setLoading(false);
    }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <><main className="min-h-[55vh] bg-gray-50 py-12 sm:py-16"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wide text-primary">Saved for later</p><h1 className="mt-2 text-3xl font-bold text-gray-900">Your wishlist</h1><p className="mt-2 text-gray-500">Keep the products you love within easy reach.</p></div><Heart className="hidden h-12 w-12 text-teal-100 sm:block" /></div>{loading ? <div className="mt-10 rounded-2xl border border-gray-200 bg-white px-6 py-20 text-center text-sm text-gray-500">Loading products from the store...</div> : savedProducts.length > 0 ? <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{savedProducts.map((product) => <article key={product.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"><div className="flex h-44 items-center justify-center rounded-xl bg-gray-50">{product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-contain p-5" /> : <Heart className="h-10 w-10 text-gray-200" />}</div><p className="mt-4 text-xs text-gray-500">{product.category}</p><h2 className="mt-1 min-h-10 text-sm font-semibold text-gray-900">{product.name}</h2><p className="mt-3 text-lg font-bold text-primary">₹{product.price}</p><div className="mt-4 flex gap-2"><button type="button" onClick={() => addToCart(product)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-semibold text-white hover:bg-primary-dark"><ShoppingCart className="h-4 w-4" />Add to cart</button><button type="button" aria-label={`Remove ${product.name}`} onClick={() => setSavedProducts((items) => items.filter((item) => item.id !== product.id))} className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500"><Trash2 className="h-4 w-4" /></button></div></article>)}</div> : <div className="mt-10 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-20 text-center"><Heart className="mx-auto h-10 w-10 text-gray-300" /><h2 className="mt-4 text-lg font-semibold text-gray-900">Your wishlist is empty</h2><p className="mt-2 text-sm text-gray-500">Products you save will appear here.</p></div>}</div></main><Footer /></>;
};

export default Wishlist;
