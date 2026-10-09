import { useEffect, useMemo, useState } from "react";
import { MapPin, Printer, Plus, Save, Search, Trash2, X } from "lucide-react";
import SearchableSelect from "../components/admin/SearchableSelect";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);

const API_URL = import.meta.env.VITE_API_URL || "";

const applyAutomaticPromotions = (items, availableOffers) => items.map((item) => {
  const discountOffer = availableOffers.find((offer) => (
    offer.status === "Active" &&
    offer.offerType === "discount" &&
    offer.discountType === "percentage" &&
    Number(offer.minOrder || 0) === 0
  ));
  const buyOneGetOneOffer = availableOffers.find((offer) => (
    offer.status === "Active" &&
    offer.offerType === "buy_one_get_one" &&
    String(offer.buyProduct) === String(item.id)
  ));

  if (buyOneGetOneOffer) {
    const buyQuantity = Math.max(1, Number(buyOneGetOneOffer.buyQuantity) || 1);
    const freeQuantity = Math.floor(item.qty / buyQuantity) * Math.max(1, Number(buyOneGetOneOffer.freeQuantity) || 1);
    return { ...item, freeQty: freeQuantity, automaticOffer: buyOneGetOneOffer.title, automaticDiscount: 0 };
  }

  if (discountOffer) {
    const discount = item.qty * item.price * (Number(discountOffer.discountValue) / 100);
    return { ...item, discount, automaticOffer: discountOffer.title, automaticDiscount: discount };
  }

  return item;
});

const AdminPos = () => {
  const [inventory, setInventory] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [offers, setOffers] = useState([]);
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [appliedPromotion, setAppliedPromotion] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [freeQuantity, setFreeQuantity] = useState(0);
  const [cart, setCart] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [historyQuery, setHistoryQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const loadPos = async () => {
      try {
        const [productResponse, locationResponse, offerResponse, salesResponse] = await Promise.all([
          fetch(`${API_URL}/api/products`, { credentials: "include" }),
          fetch(`${API_URL}/api/stores`),
          fetch(`${API_URL}/api/catalog/offers`, { credentials: "include" }),
          fetch(`${API_URL}/api/pos/sales`, { credentials: "include" }),
        ]);
        const [productResult, locationResult, offerResult, salesResult] = await Promise.all([
          productResponse.json(), locationResponse.json(), offerResponse.json(), salesResponse.json(),
        ]);
        if (!productResponse.ok || !locationResponse.ok || !offerResponse.ok || !salesResponse.ok) {
          throw new Error(productResult.message || locationResult.message || offerResult.message || salesResult.message || "Unable to load POS data.");
        }
        if (!active) return;
        const productData = (productResult.data || []).filter((product) => product.status === "Published");
        const availableLocations = locationResult.data || [];
        const nextInventory = productData.map((product) => ({ ...product, id: product._id, price: Number(product.price) || 0 }));
        const initialLocation = availableLocations.find((location) => location.isDefault) || availableLocations[0];
        setInventory(nextInventory);
        setLocations(availableLocations);
        setSelectedLocationId(initialLocation?._id || "");
        setSelectedProductId(nextInventory[0]?.id || "");
        setOffers(offerResult.data || []);
        setRecentInvoices((salesResult.data || []).map((sale) => ({
          id: sale.invoiceNumber,
          customer: sale.customerName,
          items: sale.items.length,
          total: sale.total,
          paymentMode: sale.paymentMode,
          status: sale.paymentStatus,
          date: new Date(sale.createdAt).toLocaleDateString(),
          location: sale.location?.name || "-",
          sale,
        })));
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadPos();
    return () => { active = false; };
  }, []);

  const selectedProduct = inventory.find((product) => product.id === selectedProductId);
  const selectedLocation = locations.find((location) => location._id === selectedLocationId);
  const filteredInvoices = useMemo(() => recentInvoices.filter((invoice) => `${invoice.id} ${invoice.customer} ${invoice.location || ""} ${invoice.paymentMode}`.toLowerCase().includes(historyQuery.trim().toLowerCase())), [recentInvoices, historyQuery]);
  const stockAtSelectedLocation = (product) => {
    const entry = product?.locationStock?.find((stock) => String(stock.location?._id || stock.location) === selectedLocationId);
    if (entry) return Number(entry.quantity) || 0;
    return selectedLocation?.isDefault && !product?.locationStock?.length ? Number(product.stock) || 0 : 0;
  };

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
    const itemDiscount = cart.reduce((sum, item) => sum + (item.discount || 0), 0);
    const promotionDiscount = Math.min(subtotal, appliedPromotion?.discountAmount || 0);
    const discount = itemDiscount + promotionDiscount;
    const discountedSubtotal = Math.max(subtotal - discount, 0);
    const tax = discountedSubtotal * 0.05;
    const total = discountedSubtotal + tax;
    return { subtotal, discount, tax, total };
  }, [cart, appliedPromotion]);

  const applyPromotion = async () => {
    const offer = offers.find((candidate) => candidate._id === selectedOfferId);
    if (!offer) {
      setMessage("Select a promotion first.");
      return;
    }

    const subtotal = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
    if (offer.offerType === "discount" && !offer.code) {
      const discountAmount = offer.discountType === "percentage"
        ? subtotal * (Number(offer.discountValue) / 100)
        : Number(offer.discountValue);
      if (subtotal < Number(offer.minOrder || 0)) {
        setMessage(`Add ${formatCurrency(Number(offer.minOrder) - subtotal)} more to use this promotion.`);
        return;
      }
      setCart((current) => current.map((item) => item.automaticOffer ? { ...item, discount: 0, automaticDiscount: 0, automaticOffer: null } : item));
      setAppliedPromotion({ title: offer.title, discountAmount: Math.min(subtotal, discountAmount), freeQuantity: 0 });
      setMessage(`${offer.title} applied to this invoice.`);
      return;
    }

    if (!offer.code) {
      setMessage("This promotion needs a promo code before it can be applied.");
      return;
    }

    const items = cart.map(({ id, price, qty }) => ({ id, price, quantity: qty }));
    const response = await fetch(`${API_URL}/api/catalog/offers/validate?code=${encodeURIComponent(offer.code)}&subtotal=${subtotal}&items=${encodeURIComponent(JSON.stringify(items))}`);
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.message || "Unable to apply promotion.");
      return;
    }
    setCart((current) => current.map((item) => item.automaticOffer ? { ...item, discount: 0, automaticDiscount: 0, automaticOffer: null } : item));
    setAppliedPromotion({ ...result.data });
    setMessage(`${result.data.title} applied to this invoice.`);
  };

  const removePromotion = () => {
    setAppliedPromotion(null);
    setSelectedOfferId("");
    setCart((current) => applyAutomaticPromotions(current, offers));
    setMessage("Promotion removed from the invoice.");
  };

  const addToCart = () => {
    if (!selectedProduct || !selectedLocationId) {
      setError("Select a store location and product before adding to the invoice.");
      return;
    }

    const nextQty = Number(quantity) || 1;
    const nextFreeQty = Number(freeQuantity) || 0;
    const existingItem = cart.find((item) => item.id === selectedProduct.id);
    const requestedStock = nextQty + nextFreeQty + (existingItem?.qty || 0) + (existingItem?.freeQty || 0);
    const availableStock = stockAtSelectedLocation(selectedProduct);
    if (nextQty <= 0 || nextFreeQty < 0) {
      setError("Quantity must be greater than zero.");
      return;
    }
    if (requestedStock > availableStock) {
      setError(`Only ${availableStock} ${selectedProduct.unit || "unit"} available at ${selectedLocation.name}.`);
      return;
    }

    setError("");
    if (existingItem) {
      setCart((current) =>
        current.map((item) =>
          item.id === selectedProduct.id
            ? applyAutomaticPromotions([{ ...item, qty: item.qty + nextQty, freeQty: item.freeQty + nextFreeQty }], offers)[0]
            : item
        )
      );
    } else {
      setCart((current) => [
        ...current,
        ...applyAutomaticPromotions([{ id: selectedProduct.id, name: selectedProduct.name, price: selectedProduct.price, qty: nextQty, freeQty: nextFreeQty, discount: 0 }], offers),
      ]);
    }

    setMessage(`${selectedProduct.name} added to the invoice.`);
  };

  const updateCartItem = (productId, field, value) => {
    const nextValue = Math.max(Number(value) || 0, 0);
    if (field === "qty" || field === "freeQty") {
      const item = cart.find((cartItem) => cartItem.id === productId);
      const product = inventory.find((inventoryItem) => inventoryItem.id === productId);
      const nextQuantity = field === "qty" ? nextValue : item?.qty || 0;
      const nextFreeQuantity = field === "freeQty" ? nextValue : item?.freeQty || 0;
      if (nextQuantity + nextFreeQuantity > stockAtSelectedLocation(product)) {
        setError(`Only ${stockAtSelectedLocation(product)} ${product?.unit || "unit"} available at ${selectedLocation?.name || "this location"}.`);
        return;
      }
    }
    setError("");
    setCart((current) => current.map((item) => {
      if (item.id !== productId) return item;
      const updatedItem = { ...item, [field]: nextValue };
      if (field === "qty" && item.automaticOffer) return applyAutomaticPromotions([updatedItem], offers)[0];
      return updatedItem;
    }));
  };

  const removeFromCart = (productId) => {
    setCart((current) => current.filter((item) => item.id !== productId));
    setMessage("Item removed from the cart.");
  };

  const saveInvoice = async (printAfterSave = false) => {
    if (!cart.length) {
      setError("Add at least one product before creating the invoice.");
      return;
    }
    if (!selectedLocationId) {
      setError("Select a stock location before completing the sale.");
      return;
    }
    if (!paymentMode) {
      setError("Select a payment mode before creating the invoice.");
      return;
    }

    const receiptWindow = printAfterSave ? window.open("", "_blank", "width=440,height=720") : null;
    if (printAfterSave && !receiptWindow) {
      setError("Allow pop-ups to print the receipt.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/pos/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customerName,
          locationId: selectedLocationId,
          paymentMode,
          promotionDiscount: appliedPromotion?.discountAmount || 0,
          items: cart.map((item) => ({ productId: item.id, quantity: item.qty, freeQuantity: item.freeQty, discount: item.discount || 0 })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to complete sale.");
      const sale = result.data;
      const receipt = {
        invoiceNumber: sale.invoiceNumber,
        customerName: sale.customerName,
        paymentMode: sale.paymentMode,
        locationName: sale.location?.name || selectedLocation?.name,
        items: cart,
        totals: { subtotal: sale.subtotal, discount: sale.discount, tax: sale.tax, total: sale.total },
        promotion: appliedPromotion,
      };
      setLastReceipt(receipt);
      setRecentInvoices((current) => [{ id: sale.invoiceNumber, customer: sale.customerName, items: sale.items.length, total: sale.total, paymentMode: sale.paymentMode, status: sale.paymentStatus, date: new Date(sale.createdAt).toLocaleDateString(), location: sale.location?.name || selectedLocation?.name || "-", sale }, ...current]);
      setInventory((current) => current.map((product) => {
        const soldItem = cart.find((item) => item.id === product.id);
        if (!soldItem) return product;
        const quantitySold = soldItem.qty + soldItem.freeQty;
        return {
          ...product,
          stock: Math.max(0, product.stock - quantitySold),
          locationStock: (product.locationStock || []).map((entry) => String(entry.location?._id || entry.location) === selectedLocationId ? { ...entry, quantity: Math.max(0, entry.quantity - quantitySold) } : entry),
        };
      }));
      setMessage(`Invoice ${sale.invoiceNumber} saved. Stock deducted from ${selectedLocation?.name || "the selected location"}.`);
      setCart([]);
      setQuantity(1);
      setFreeQuantity(0);
      setPaymentMode("Cash");
      setAppliedPromotion(null);
      setSelectedOfferId("");
      setSelectedProductId(inventory[0]?.id || "");
      if (printAfterSave) printReceipt(receipt, receiptWindow);
    } catch (saveError) {
      receiptWindow?.close();
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const printReceipt = (receiptToPrint = lastReceipt, existingWindow = null) => {
    if (!receiptToPrint) {
      setMessage("Create an invoice before printing a receipt.");
      return;
    }

    const printWindow = existingWindow || window.open("", "_blank", "width=440,height=720");
    if (!printWindow) {
      setMessage("Allow pop-ups to print the receipt.");
      return;
    }

    const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
    const itemRows = receiptToPrint.items.map((item) => `<tr><td>${escapeHtml(item.name)}<small>${item.freeQty ? `${item.freeQty} free` : ""}</small></td><td>${item.qty}</td><td>${formatCurrency(Math.max(item.qty * item.price - item.discount, 0))}</td></tr>`).join("");
    printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(receiptToPrint.invoiceNumber)}</title><style>body{font-family:Arial,sans-serif;color:#17202a;padding:24px;max-width:390px;margin:auto}h1{font-size:20px;margin:0 0 4px}p{margin:5px 0;color:#5b6670;font-size:13px}.meta{border-bottom:1px solid #dfe4e8;padding-bottom:14px;margin-bottom:14px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:9px 0;border-bottom:1px solid #edf0f2;text-align:left}th:last-child,td:last-child{text-align:right}td:nth-child(2){text-align:center}small{display:block;color:#008f68;margin-top:3px}.totals{margin-top:14px}.line{display:flex;justify-content:space-between;padding:5px 0;font-size:13px}.total{border-top:2px solid #17202a;margin-top:6px;padding-top:10px;font-size:18px;font-weight:bold}.thanks{text-align:center;margin-top:28px}@media print{body{padding:0}}</style></head><body><div class="meta"><h1>Sales Invoice</h1><p><strong>${escapeHtml(receiptToPrint.invoiceNumber)}</strong></p><p>Customer: ${escapeHtml(receiptToPrint.customerName)}</p><p>Payment: ${escapeHtml(receiptToPrint.paymentMode)}</p><p>${new Date().toLocaleString()}</p></div><table><thead><tr><th>Product</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${itemRows}</tbody></table><div class="totals"><div class="line"><span>Subtotal</span><span>${formatCurrency(receiptToPrint.totals.subtotal)}</span></div><div class="line"><span>Discount</span><span>-${formatCurrency(receiptToPrint.totals.discount)}</span></div>${receiptToPrint.promotion ? `<div class="line"><span>Offer</span><span>${escapeHtml(receiptToPrint.promotion.title)}</span></div>` : ""}<div class="line"><span>GST (5%)</span><span>${formatCurrency(receiptToPrint.totals.tax)}</span></div><div class="line total"><span>Total</span><span>${formatCurrency(receiptToPrint.totals.total)}</span></div></div><p class="thanks">Thank you for shopping with us.</p><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();};</script></body></html>`);
    printWindow.document.close();
  };

  const cancelInvoice = () => {
    setCart([]);
    setCustomerName("Walk-in Customer");
    setPaymentMode("Cash");
    setAppliedPromotion(null);
    setSelectedOfferId("");
    setQuantity(1);
    setFreeQuantity(0);
    setError("");
    setMessage("Current invoice cancelled.");
  };

  const printSavedInvoice = (invoice) => {
    const sale = invoice.sale;
    printReceipt({
      invoiceNumber: invoice.id,
      customerName: invoice.customer,
      paymentMode: invoice.paymentMode,
      locationName: invoice.location,
      items: sale.items.map((item) => ({ name: item.productName, qty: item.quantity, freeQty: item.freeQuantity, price: item.unitPrice, discount: item.discount })),
      totals: { subtotal: sale.subtotal, discount: sale.discount, tax: sale.tax, total: sale.total },
    });
  };

  return (
    <div className="mx-auto max-w-375 space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-medium text-primary">Store operations</p><h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">POS sales</h1><p className="mt-2 text-sm text-slate-500">Create an invoice and deduct stock from the selected branch.</p></div>
        <div className="flex flex-wrap items-center gap-2"><span className={`rounded-lg border px-3 py-2 text-xs font-semibold ${loading ? "border-slate-200 bg-slate-50 text-slate-500" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{loading ? "Loading POS data" : selectedLocation?.name || "Choose a location"}</span><button type="button" onClick={printReceipt} disabled={!lastReceipt} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><Printer className="h-4 w-4" />Last receipt</button></div>
      </header>

      {(error || message) && <div role={error ? "alert" : "status"} className={`rounded-lg px-4 py-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>{error || message}<button type="button" onClick={() => { setError(""); setMessage(""); }} aria-label="Dismiss message" className="float-right"><X className="h-4 w-4" /></button></div>}

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Invoice details</p><h2 className="mt-1 text-lg font-bold text-slate-900">Customer and location</h2></div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <label className="text-sm font-medium text-slate-700">Customer<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Walk-in customer" className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" /></label>
          <label className="text-sm font-medium text-slate-700"><span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Stock location</span><select value={selectedLocationId} onChange={(event) => { if (cart.length && !window.confirm("Changing location will clear the current invoice. Continue?")) return; setCart([]); setSelectedLocationId(event.target.value); setError(""); }} disabled={loading || saving} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary disabled:opacity-60"><option value="">Select a store location</option>{locations.map((location) => <option key={location._id} value={location._id}>{location.name}</option>)}</select></label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Sales invoice</p><h2 className="mt-1 text-lg font-bold text-slate-900">Add products</h2><p className="mt-1 text-sm text-slate-500">Available quantities reflect the selected location.</p></div>
        <div className="grid items-end gap-4 p-5 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1.6fr)_120px_120px_150px_auto] sm:p-6">
          <SearchableSelect label="Product" value={selectedProductId} onChange={setSelectedProductId} placeholder="Search products..." options={inventory.map((product) => ({ value: product.id, label: product.name, description: `${product.category || "Product"} · ${stockAtSelectedLocation(product)} ${product.unit || "unit"} at location · ${formatCurrency(product.price)}` }))} />
          <label className="text-sm font-medium text-slate-700">Qty<input type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" /></label>
          <label className="text-sm font-medium text-slate-700">Free qty<input type="number" min="0" value={freeQuantity} onChange={(event) => setFreeQuantity(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" /></label>
          <div className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-[10px] font-semibold uppercase text-slate-400">Rate / available</p><p className="truncate text-sm font-semibold text-slate-800">{selectedProduct ? `${formatCurrency(selectedProduct.price)} · ${stockAtSelectedLocation(selectedProduct)} ${selectedProduct.unit || "unit"}` : "Select product"}</p></div>
          <button type="button" onClick={addToCart} disabled={!selectedProduct || !selectedLocationId || loading || saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />Add line</button>
        </div>
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-190 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Product</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Free</th><th className="px-4 py-3">Rate</th><th className="px-4 py-3">Discount</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3" /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {cart.length ? cart.map((item) => <tr key={item.id}><td className="px-5 py-3 font-medium text-slate-800">{item.name}{item.automaticOffer && <span className="mt-1 block text-xs text-primary">{item.automaticOffer}</span>}</td><td className="px-4 py-3"><input aria-label={`${item.name} quantity`} type="number" min="1" value={item.qty} onChange={(event) => updateCartItem(item.id, "qty", event.target.value)} className="w-16 rounded-md border border-slate-200 px-2 py-1" /></td><td className="px-4 py-3"><input aria-label={`${item.name} free quantity`} type="number" min="0" value={item.freeQty} onChange={(event) => updateCartItem(item.id, "freeQty", event.target.value)} className="w-16 rounded-md border border-slate-200 px-2 py-1" /></td><td className="px-4 py-3 text-slate-600">{formatCurrency(item.price)}</td><td className="px-4 py-3"><input aria-label={`${item.name} discount`} type="number" min="0" value={item.discount} onChange={(event) => updateCartItem(item.id, "discount", event.target.value)} className="w-20 rounded-md border border-slate-200 px-2 py-1" /></td><td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(Math.max(item.qty * item.price - item.discount, 0))}</td><td className="px-4 py-3"><button type="button" onClick={() => removeFromCart(item.id)} aria-label={`Remove ${item.name}`} className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></td></tr>) : <tr><td colSpan="7" className="px-5 py-12 text-center text-sm text-slate-500">{loading ? "Loading products..." : "No items yet. Search for a product to start this invoice."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-800">Promotions and offers</summary>
        <div className="grid gap-3 border-t border-slate-100 p-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="text-sm font-medium text-slate-700">Promotion<select id="promotion" value={selectedOfferId} onChange={(event) => setSelectedOfferId(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary"><option value="">Select active promotion</option>{offers.map((offer) => <option key={offer._id} value={offer._id}>{offer.title} {offer.code ? `· ${offer.code}` : ""}</option>)}</select></label>
          <button type="button" onClick={applyPromotion} disabled={!cart.length} className="h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">Apply offer</button>
          {appliedPromotion && <div className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 sm:col-span-2"><span><strong>{appliedPromotion.title}</strong> applied {appliedPromotion.freeQuantity ? `· ${appliedPromotion.freeQuantity} free item(s)` : ""}</span><button type="button" onClick={removePromotion} className="font-semibold underline">Remove</button></div>}
        </div>
      </details>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Payment and total</p><h2 className="mt-1 text-lg font-bold text-slate-900">Complete sale</h2><div className="mt-4 flex flex-wrap gap-2">{["Cash", "UPI", "Card", "Credit", "Cheque"].map((mode) => <button key={mode} type="button" onClick={() => setPaymentMode(mode)} aria-pressed={paymentMode === mode} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${paymentMode === mode ? "border-primary bg-primary text-white" : "border-slate-200 text-slate-600 hover:border-primary"}`}>{mode}</button>)}</div></div>
          <div className="space-y-2 border-t border-slate-100 pt-4 text-sm lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"><div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div><div className="flex justify-between text-rose-600"><span>Discount</span><span>-{formatCurrency(totals.discount)}</span></div><div className="flex justify-between text-slate-600"><span>GST (5%)</span><span>{formatCurrency(totals.tax)}</span></div><div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-bold text-slate-900"><span>Total</span><span>{formatCurrency(totals.total)}</span></div></div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={cancelInvoice} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><X className="h-4 w-4" />Clear invoice</button><button type="button" onClick={() => saveInvoice(true)} disabled={saving || loading || !cart.length || !selectedLocationId} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-primary px-4 text-sm font-semibold text-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"><Printer className="h-4 w-4" />{saving ? "Saving..." : "Save & print"}</button><button type="button" onClick={() => saveInvoice(false)} disabled={saving || loading || !cart.length || !selectedLocationId} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving sale..." : "Complete sale"}</button></div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">POS register</p><h2 className="mt-1 text-lg font-bold text-slate-900">Recent sales <span className="ml-1 text-sm font-medium text-slate-400">{filteredInvoices.length}</span></h2></div><label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 sm:w-80"><Search className="h-4 w-4 shrink-0 text-slate-400" /><input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Search invoice, customer, location..." className="w-full bg-transparent text-sm outline-none" /></label></div>
        <div className="overflow-x-auto"><table className="w-full min-w-220 text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Invoice</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Receipt</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredInvoices.map((invoice) => <tr key={invoice.id}><td className="px-5 py-3 font-semibold text-primary">{invoice.id}</td><td className="px-4 py-3 text-slate-700">{invoice.customer}</td><td className="px-4 py-3 text-slate-600">{invoice.location}</td><td className="px-4 py-3 text-slate-600">{invoice.items}</td><td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(invoice.total)}</td><td className="px-4 py-3 text-slate-600">{invoice.paymentMode}<span className="block text-xs text-slate-500">{invoice.status}</span></td><td className="px-4 py-3 text-slate-500">{invoice.date}</td><td className="px-4 py-3"><button type="button" onClick={() => printSavedInvoice(invoice)} aria-label={`Print ${invoice.id}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Printer className="h-4 w-4" /></button></td></tr>)}</tbody></table>{!filteredInvoices.length && <p className="px-5 py-12 text-center text-sm text-slate-500">{recentInvoices.length ? "No sales match this search." : "No saved sales yet."}</p>}</div>
      </section>
    </div>
  );
};

export default AdminPos;
