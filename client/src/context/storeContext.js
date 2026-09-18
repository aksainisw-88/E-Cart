import { createContext, useContext } from "react";

export const StoreContext = createContext({
  name: "My Medical Store",
  tagline: "Your Health, Our Priority",
  theme: "teal",
  logo: "",
  deliveryFee: 49,
  freeDeliveryAbove: 999,
});
export const useStore = () => useContext(StoreContext);
