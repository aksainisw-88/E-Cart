import { useEffect, useState } from "react";
import { StoreContext } from "./storeContext";
const API_URL = import.meta.env.VITE_API_URL || "";
const themes = {
  teal: ["#00796b", "#00695c"],
  blue: ["#2563eb", "#1d4ed8"],
  emerald: ["#059669", "#047857"],
  amber: ["#d97706", "#b45309"],
};

export const StoreProvider = ({ children }) => {
  const [store, setStore] = useState({ name: "My Medical Store", tagline: "Your Health, Our Priority", theme: "teal", logo: "", deliveryFee: 49, freeDeliveryAbove: 999 });

  const loadStore = () => {
    fetch(`${API_URL}/api/catalog/store?updated=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        if (!result.data) return;
        setStore({
          ...result.data,
          deliveryFee: Number(result.data.deliveryFee ?? 49),
          freeDeliveryAbove: Number(result.data.freeDeliveryAbove ?? 999),
        });
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadStore();
    window.addEventListener("store-settings-updated", loadStore);
    return () => window.removeEventListener("store-settings-updated", loadStore);
  }, []);

  useEffect(() => {
    const [primary, dark] = themes[store.theme] || themes.teal;
    document.documentElement.style.setProperty("--color-primary", primary);
    document.documentElement.style.setProperty("--color-primary-dark", dark);
  }, [store.theme]);

  const value = { ...store, logoUrl: store.logo ? `${API_URL}${store.logo}` : "", refreshStore: loadStore };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};
