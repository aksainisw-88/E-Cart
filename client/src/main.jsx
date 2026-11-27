import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { StoreProvider } from "./context/StoreContext.jsx";
import { WishlistProvider } from "./context/WishlistContext.jsx";
import { getTenantRouteBase, tenantHeaders } from "./utils/tenant.js";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js", { scope: "/" })
      .catch((error) => console.warn("E-Cart app install support could not start.", error));
  });
}

const apiOrigin = new URL(import.meta.env.VITE_API_URL || window.location.origin).origin;
const browserFetch = window.fetch.bind(window);
// Existing API calls use fetch directly, so attach the selected tenant only to requests sent to this API.
window.fetch = (input, options = {}) => {
  const url = input instanceof Request ? input.url : String(input);
  if (new URL(url, window.location.origin).origin !== apiOrigin) return browserFetch(input, options);
  const headers = tenantHeaders(input instanceof Request ? input.headers : options.headers);
  return browserFetch(input, { ...options, headers });
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter basename={getTenantRouteBase()}>
      <AuthProvider>
        <StoreProvider>
          <WishlistProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </WishlistProvider>
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
