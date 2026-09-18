import { createContext, useContext } from "react";

export const WishlistContext = createContext(null);
export const useWishlist = () => useContext(WishlistContext);
