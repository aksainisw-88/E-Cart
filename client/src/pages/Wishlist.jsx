import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import CustomerAccountNav from "../components/customer/CustomerAccountNav";
import Footer from "../components/home/Footer";
import { useCart } from "../context/cartContext";
import { useWishlist } from "../context/wishlistContext";

const Wishlist = () => {
  const { items: savedProducts, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();

  return (
    <>
      <main className="min-h-[55vh] bg-[#f4f7f5] py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <CustomerAccountNav />
            <section className="min-w-0">
              <div className="flex flex-wrap items-end justify-between gap-4 rounded-3xl bg-gradient-to-br from-[#063d34] via-[#075747] to-[#0b7660] px-5 py-6 text-white shadow-lg shadow-emerald-950/10 sm:px-7 sm:py-8">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200">Saved for later</p>
                  <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Your wishlist</h1>
                  <p className="mt-2 text-sm text-emerald-50/80">Keep the products you love within easy reach.</p>
                </div>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">{savedProducts.length} {savedProducts.length === 1 ? "saved item" : "saved items"}</span>
              </div>

              {savedProducts.length > 0 ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {savedProducts.map((product) => (
                    <article key={product.id} className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
                      <div className="flex h-44 items-center justify-center overflow-hidden rounded-xl bg-slate-50">
                        {product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-contain p-5" /> : <Heart className="h-10 w-10 text-gray-200" />}
                      </div>
                      <p className="mt-4 text-xs text-gray-500">{product.category}</p>
                      <h2 className="mt-1 min-h-10 text-sm font-semibold text-gray-900">{product.name}</h2>
                      <p className="mt-3 text-lg font-bold text-primary">₹{product.price}</p>
                      <div className="mt-4 flex gap-2">
                        <button type="button" onClick={() => addToCart(product)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white transition hover:bg-primary-dark">
                          <ShoppingCart className="h-4 w-4" />Add to cart
                        </button>
                        <button type="button" aria-label={`Remove ${product.name}`} onClick={() => toggleWishlist(product)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-primary"><Heart className="h-6 w-6" /></span>
                  <h2 className="mt-4 text-lg font-bold text-gray-900">Your wishlist is empty</h2>
                  <p className="mt-2 text-sm text-gray-500">Save products from the catalogue and they will appear here.</p>
                  <Link to="/products" className="mt-5 inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark">Explore products</Link>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Wishlist;
