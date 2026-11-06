import {
  Heart,
  ShoppingCart,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/cartContext";
import { useWishlist } from "../../context/wishlistContext";
import { useStore } from "../../context/storeContext";
import { getBusinessProfile, splitProductSizes } from "../../data/businessTypes";

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { isSaved, toggleWishlist } = useWishlist();
  const store = useStore();
  const businessProfile = getBusinessProfile(store.businessType);
  const saved = isSaved(product);
  const stock = Number(product.stock ?? 0);
  const outOfStock = stock <= 0;

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-950/[0.08]">
      <button
        type="button"
        className={`absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border shadow-sm backdrop-blur transition ${saved ? "border-rose-500 bg-rose-500 text-white" : "border-white/80 bg-white/90 text-slate-500 hover:border-primary hover:bg-primary hover:text-white"}`}
        aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
        onClick={(event) => {
          event.stopPropagation();
          toggleWishlist(product);
        }}
      >
        <Heart size={18} className={saved ? "fill-current" : ""} />
      </button>

      {product.discount && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-amber-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
          {product.discount}% OFF
        </span>
      )}
      {outOfStock && <span className="absolute left-3 top-11 z-10 rounded-full bg-slate-800 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white">Out of stock</span>}

      <Link to={`/products/${product.id}`} aria-label={`View ${product.name}`} className="flex h-44 items-center justify-center bg-gradient-to-br from-[#f7faf7] to-[#eef6f0] p-5 sm:h-52 sm:p-6">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
        />
      </Link>

      <div className="p-4 sm:p-5">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:text-[11px]">{product.brand ? `${product.brand} · ` : ""}{product.category}</p>

        <h3 className="mt-2 min-h-[40px] text-sm font-bold leading-5 text-slate-900 sm:text-base">
          <Link to={`/products/${product.id}`} className="line-clamp-2 rounded-sm hover:text-primary focus-visible:outline-primary">{product.name}</Link>
        </h3>

        {product.size && (businessProfile.sizeOptions ? (
          <div className="mt-2 flex min-h-7 flex-wrap items-center gap-1.5" aria-label={`${businessProfile.attributeLabel}: ${product.size}`}>
            {splitProductSizes(product.size).slice(0, 5).map((size) => <span key={size} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600">{size}</span>)}
          </div>
        ) : (
          <p className="mt-2 truncate text-[11px] text-slate-500"><span className="font-semibold text-slate-600">{businessProfile.attributeLabel}:</span> {product.size}</p>
        ))}

        <div className="mt-2 flex items-center gap-1">
          <div className="flex">
            {[...Array(5)].map((_, index) => (
              <Star
                key={index}
                size={13}
                className={
                  index < product.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                }
              />
            ))}
          </div>

          <span className="text-xs text-slate-400">({product.reviews})</span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-xl font-bold tracking-tight text-slate-900">₹{Number(product.price).toLocaleString("en-IN")}</span>

          {product.originalPrice && (
            <span className="text-sm text-slate-400 line-through">₹{Number(product.originalPrice).toLocaleString("en-IN")}</span>
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
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-xs font-bold text-white shadow-sm shadow-primary/15 transition hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none sm:text-sm"
        >
          <ShoppingCart size={17} />
          {outOfStock ? "Out of stock" : "Add to Cart"}
        </button>
      </div>
    </article>
  );
};

export default ProductCard;
