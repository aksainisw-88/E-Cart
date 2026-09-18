import { useState } from "react";
import { WishlistContext } from "./wishlistContext";

const storageKey = "e-mart-wishlist";

const readWishlist = () => {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "[]");
  } catch {
    return [];
  }
};

export const WishlistProvider = ({ children }) => {
  const [items, setItems] = useState(readWishlist);

  const saveItems = (nextItems) => {
    setItems(nextItems);
    localStorage.setItem(storageKey, JSON.stringify(nextItems));
  };

  const getId = (product) => String(product.id || product._id);
  const isSaved = (product) => items.some((item) => getId(item) === getId(product));
  const toggleWishlist = (product) => {
    const id = getId(product);
    saveItems(isSaved(product) ? items.filter((item) => getId(item) !== id) : [...items, { ...product, id }]);
  };

  return <WishlistContext.Provider value={{ items, isSaved, toggleWishlist }}>{children}</WishlistContext.Provider>;
};
