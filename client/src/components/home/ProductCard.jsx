import {
  Heart,
  ShoppingCart,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/cartContext";
import { useWishlist } from "../../context/wishlistContext";

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { isSaved, toggleWishlist } = useWishlist();
  const saved = isSaved(product);
  const stock = Number(product.stock ?? 0);
  const outOfStock = stock <= 0;

  return (
    <article className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg hover:shadow-slate-900/5">
      <button
        type="button"
        className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition ${saved ? "bg-red-500 text-white" : "bg-white text-gray-500 hover:bg-primary hover:text-white"}`}
        aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
        onClick={(event) => {
          event.stopPropagation();
          toggleWishlist(product);
        }}
      >
        <Heart size={18} className={saved ? "fill-current" : ""} />
      </button>

      {product.discount && (
        <span className="absolute left-3 top-3 z-10 rounded bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
          {product.discount}% OFF
        </span>
      )}
      {outOfStock && <span className="absolute left-3 top-10 z-10 rounded bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Out of stock</span>}

      <Link to={`/products/${product.id}`} aria-label={`View ${product.name}`} className="flex h-32 items-center justify-center bg-slate-50 p-3 sm:h-40 sm:p-4">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
        />
      </Link>

      <div className="p-3 sm:p-4">
        <p className="truncate text-[10px] text-gray-500 sm:text-xs">{product.brand ? `${product.brand} · ` : ""}{product.category}</p>

        <h3 className="mt-1 min-h-[36px] text-xs font-semibold text-gray-900 sm:text-sm">
          <Link to={`/products/${product.id}`} className="line-clamp-2 rounded-sm hover:text-primary focus-visible:outline-primary">{product.name}</Link>
        </h3>

        <div className="mt-2 flex items-center gap-1">
          <div className="flex">
            {[...Array(5)].map((_, index) => (
              <Star
                key={index}
                size={14}
                className={
                  index < product.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                }
              />
            ))}
          </div>

          <span className="text-xs text-gray-500">({product.reviews})</span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-base font-bold text-slate-900">₹{product.price}</span>

          {product.originalPrice && (
            <span className="text-sm text-gray-400 line-through">₹{product.originalPrice}</span>
          )}
        </div>
        <p className={`mt-2 text-xs font-medium ${outOfStock ? "text-red-600" : stock <= 5 ? "text-amber-600" : "text-emerald-600"}`}>{outOfStock ? "Currently unavailable" : stock <= 5 ? `Only ${stock} left` : `${stock} in stock`}</p>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (outOfStock) return;
            addToCart(product);
          }}
          disabled={outOfStock}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-primary px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 sm:text-sm"
        >
          <ShoppingCart size={17} />
          {outOfStock ? "Out of stock" : "Add to Cart"}
        </button>
      </div>
    </article>
  );
};

export default ProductCard;
