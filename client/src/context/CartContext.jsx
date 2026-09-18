import { useState } from "react";
import { CartContext } from "./cartContext";
const storageKey = "e-mart-cart";

const readCart = () => {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "[]");
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(readCart);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [promo, setPromo] = useState({ code: "", discount: 0, title: "" });
  const [promoError, setPromoError] = useState("");
  const saveItems = (nextItems) => {
    setItems(nextItems);
    localStorage.setItem(storageKey, JSON.stringify(nextItems));
  };
  const addToCart = (product, quantity = 1) => {
    const id = product.id || product._id;
    const amount = Number(quantity) > 0 ? Number(quantity) : 1;
    const stock = Number(product.stock ?? 0);
    if (stock <= 0) return;
    const existing = items.find((item) => item.id === id);
    if (existing) {
      saveItems(items.map((item) => item.id === id ? { ...item, quantity: Math.min(stock, item.quantity + amount) } : item));
    } else {
      saveItems([...items, { ...product, id, quantity: Math.min(stock, amount) }]);
    }
    setDrawerOpen(true);
  };
  const updateQuantity = (id, amount) => saveItems(items.map((item) => item.id === id ? { ...item, quantity: Math.min(Number(item.stock ?? Number.MAX_SAFE_INTEGER), Math.max(1, item.quantity + amount)) } : item));
  const removeFromCart = (id) => saveItems(items.filter((item) => item.id !== id));
  const syncCartStock = async () => {
    const response = await fetch("/api/catalog/products", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Unable to check product stock.");
    const productMap = new Map((result.data || []).map((product) => [product._id, product]));
    let changed = false;
    const nextItems = items.map((item) => {
      const currentProduct = productMap.get(item.id);
      if (!currentProduct || Number(currentProduct.stock) <= 0) {
        changed = true;
        return null;
      }
      const quantity = Math.min(item.quantity, Number(currentProduct.stock));
      if (quantity !== item.quantity || Number(item.stock) !== Number(currentProduct.stock)) changed = true;
      return { ...item, ...currentProduct, id: currentProduct._id, quantity };
    }).filter(Boolean);
    if (changed) {
      saveItems(nextItems);
      setPromo({ code: "", discount: 0, title: "" });
      setPromoError("Cart stock was updated. Please review your cart before checkout.");
    }
    return changed;
  };
  const clearCart = () => { saveItems([]); setPromo({ code: "", discount: 0, title: "" }); setPromoError(""); };
  const applyPromo = async (code) => {
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode) { setPromoError("Enter a promo code."); return false; }
    setPromoError("");
    try {
      const response = await fetch(`/api/catalog/offers/validate?code=${encodeURIComponent(normalizedCode)}&subtotal=${subtotal}&items=${encodeURIComponent(JSON.stringify(items.map(({ id, price, quantity }) => ({ id, price, quantity }))))}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to apply promo code.");
      if (result.data.offerType === "buy_product_get_product" && result.data.freeProduct && !items.some((item) => item.id === result.data.freeProduct._id)) {
        saveItems([...items, { ...result.data.freeProduct, id: result.data.freeProduct._id, quantity: result.data.freeQuantity }]);
      }
      setPromo({ code: result.data.code, discount: Number(result.data.discountAmount), title: result.data.title });
      return true;
    } catch (error) {
      setPromo({ code: "", discount: 0, title: "" });
      setPromoError(error.message);
      return false;
    }
  };
  const removePromo = () => { setPromo({ code: "", discount: 0, title: "" }); setPromoError(""); };
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce((total, item) => total + Number(item.price) * item.quantity, 0);
  const discountTotal = items.reduce((total, item) => {
    const price = Number(item.price) || 0;
    const originalPrice = Number(item.originalPrice) || 0;
    const percentageDiscount = price * ((Number(item.discount) || 0) / 100);
    const itemDiscount = originalPrice > price ? originalPrice - price : percentageDiscount;
    return total + itemDiscount * item.quantity;
  }, 0);
  const originalSubtotal = subtotal + discountTotal;
  const value = { items, itemCount, subtotal, originalSubtotal, discountTotal, promoCode: promo.code, promoDiscount: promo.discount, promoTitle: promo.title, promoError, applyPromo, removePromo, addToCart, updateQuantity, removeFromCart, syncCartStock, clearCart, drawerOpen, setDrawerOpen };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
