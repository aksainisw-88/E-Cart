import {
  Heart,
  ShoppingCart,
  Star,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/cartContext";
import { useWishlist } from "../../context/wishlistContext";

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isSaved, toggleWishlist } = useWishlist();
  const saved = isSaved(product);
  const stock = Number(product.stock ?? 0);
  const outOfStock = stock <= 0;

  const openProduct = () => {
    navigate(`/products/${product.id}`);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openProduct}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openProduct();
        }
      }}
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
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

      <div className="flex h-48 items-center justify-center bg-[#f8faf7] p-5">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="p-4">
        <p className="text-xs text-gray-500">{product.brand ? `${product.brand} · ` : ""}{product.category}</p>

        <h3 className="mt-1 line-clamp-2 min-h-[40px] text-[15px] font-semibold text-gray-900">
          {product.name}
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
          <span className="text-lg font-bold text-slate-900">₹{product.price}</span>

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
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        >
          <ShoppingCart size={17} />
          {outOfStock ? "Out of stock" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;