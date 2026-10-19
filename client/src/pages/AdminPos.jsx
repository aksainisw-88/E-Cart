import { useEffect, useMemo, useState } from "react";
import { MapPin, Printer, Plus, Save, Search, ShoppingCart, Trash2, X } from "lucide-react";
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
  const [showPosForm, setShowPosForm] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOrderBatches, setSelectedOrderBatches] = useState({});
  const [orderBatchData, setOrderBatchData] = useState({ key: "", data: {} });
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: "", phone: "", email: "" });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [offers, setOffers] = useState([]);
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [appliedPromotion, setAppliedPromotion] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [batchData, setBatchData] = useState({ key: "", data: [] });
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [freeQuantity, setFreeQuantity] = useState(0);
  const [rate, setRate] = useState("");
  const [discount, setDiscount] = useState(0);
  const [cart, setCart] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [openOrders, setOpenOrders] = useState([]);
  const [clearingOrderId, setClearingOrderId] = useState("");
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
        const [productResponse, locationResponse, offerResponse, salesResponse, customerResponse, orderResponse] = await Promise.all([
          fetch(`${API_URL}/api/products`, { credentials: "include" }),
          fetch(`${API_URL}/api/stores`, { credentials: "include" }),
          fetch(`${API_URL}/api/catalog/offers`, { credentials: "include" }),
          fetch(`${API_URL}/api/pos/sales`, { credentials: "include" }),
          fetch(`${API_URL}/api/customers`, { credentials: "include" }),
          fetch(`${API_URL}/api/pos/orders`, { credentials: "include" }),
        ]);
        const [productResult, locationResult, offerResult, salesResult, customerResult, orderResult] = await Promise.all([
          productResponse.json(), locationResponse.json(), offerResponse.json(), salesResponse.json(), customerResponse.json(), orderResponse.json(),
        ]);
        if (!productResponse.ok || !locationResponse.ok || !offerResponse.ok || !salesResponse.ok || !customerResponse.ok || !orderResponse.ok) {
          throw new Error(productResult.message || locationResult.message || offerResult.message || salesResult.message || customerResult.message || orderResult.message || "Unable to load POS data.");
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
        setRate(String(nextInventory[0]?.price ?? ""));
        setOffers(offerResult.data || []);
        setCustomers((customerResult.data || []).filter((customer) => customer.status === "Active"));
        setOpenOrders(orderResult.data || []);
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
  const selectedCustomer = customers.find((customer) => customer._id === selectedCustomerId);
  const customerOrders = openOrders.filter((order) => String(order.customer?._id || order.customer) === selectedCustomerId);
  const selectedOrder = openOrders.find((order) => order._id === selectedOrderId);
  const selectedOrderProductIds = [...new Set((selectedOrder?.items || []).map((item) => String(item.product?._id || item.product)).filter(Boolean))];
  const orderBatchesLoading = Boolean(selectedOrder && selectedLocationId && (orderBatchData.key !== selectedLocationId || selectedOrderProductIds.some((productId) => !Object.hasOwn(orderBatchData.data, productId))));
  const batchKey = `${selectedProductId}:${selectedLocationId}`;
  const batches = batchData.key === batchKey ? batchData.data : [];
  const batchLoading = Boolean(selectedProductId && selectedLocationId && batchData.key !== batchKey);
  const selectedBatch = batches.find((batch) => batch._id === selectedBatchId);
  const selectedLocation = locations.find((location) => location._id === selectedLocationId);

  useEffect(() => {
    let active = true;
    if (!selectedProductId || !selectedLocationId) {
      return () => { active = false; };
    }

    const key = `${selectedProductId}:${selectedLocationId}`;
    fetch(`${API_URL}/api/pos/batches?productId=${encodeURIComponent(selectedProductId)}&locationId=${encodeURIComponent(selectedLocationId)}`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load product batches.");
        return result;
      })
      .then((result) => { if (active) setBatchData({ key, data: result.data || [] }); })
      .catch((batchError) => {
        if (!active) return;
        setBatchData({ key, data: [] });
        setError(batchError.message);
      });

    return () => { active = false; };
  }, [selectedProductId, selectedLocationId]);

  useEffect(() => {
    const order = openOrders.find((item) => item._id === selectedOrderId);
    if (!order || !selectedLocationId) return undefined;
    let active = true;
    const productIds = [...new Set(order.items.map((item) => String(item.product?._id || item.product)).filter(Boolean))];
    Promise.all(productIds.map(async (productId) => {
      const response = await fetch(`${API_URL}/api/pos/batches?productId=${encodeURIComponent(productId)}&locationId=${encodeURIComponent(selectedLocationId)}`, { credentials: "include" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to load batches for this customer order.");
      return [productId, result.data || []];
    }))
      .then((entries) => { if (active) setOrderBatchData({ key: selectedLocationId, data: Object.fromEntries(entries) }); })
      .catch((batchError) => { if (active) setError(batchError.message); });
    return () => { active = false; };
  }, [openOrders, selectedLocationId, selectedOrderId]);

  const filteredInvoices = useMemo(() => recentInvoices.filter((invoice) => `${invoice.id} ${invoice.customer} ${invoice.location || ""} ${invoice.paymentMode}`.toLowerCase().includes(historyQuery.trim().toLowerCase())), [recentInvoices, historyQuery]);
  const stockAtSelectedLocation = (product) => {
    const entry = product?.locationStock?.find((stock) => String(stock.location?._id || stock.location) === selectedLocationId);
    if (entry) return Number(entry.quantity) || 0;
    return selectedLocation?.isDefault && !product?.locationStock?.length ? Number(product.stock) || 0 : 0;
  };

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
    const itemDiscount = cart.reduce((sum, item) => sum + (item.discount || 0), 0);
    const promotionDiscount = Math.min(Math.max(subtotal - itemDiscount, 0), appliedPromotion?.discountAmount || 0);
    const discount = itemDiscount + promotionDiscount;
    const prePromotionBase = Math.max(subtotal - itemDiscount, 0);
    const tax = cart.reduce((sum, item) => {
      const lineBase = Math.max(item.qty * item.price - (item.discount || 0), 0);
      const promotionShare = prePromotionBase > 0 ? promotionDiscount * (lineBase / prePromotionBase) : 0;
      return sum + Number((Math.max(lineBase - promotionShare, 0) * (Number(item.taxRate) || 0) / 100).toFixed(2));
    }, 0);
    const discountedSubtotal = Math.max(subtotal - discount, 0);
    const total = discountedSubtotal + tax;
    return { subtotal, discount, promotionDiscount, tax, total };
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
    if (batchLoading) {
      setError("Wait for the product batches to finish loading.");
      return;
    }
    if (batches.length && !selectedBatch) {
      setError("Select a batch before adding this product.");
      return;
    }

    const nextQty = Number(quantity) || 1;
    const nextFreeQty = Number(freeQuantity) || 0;
    const nextRate = Number(rate);
    const nextDiscount = Number(discount) || 0;
    const existingItem = cart.find((item) => item.id === selectedProduct.id && item.batchId === (selectedBatch?._id || ""));
    const productQuantityInCart = cart.filter((item) => item.id === selectedProduct.id).reduce((sum, item) => sum + item.qty + item.freeQty, 0);
    const requestedStock = nextQty + nextFreeQty + productQuantityInCart;
    const availableStock = stockAtSelectedLocation(selectedProduct);
    if (!Number.isFinite(nextRate) || nextRate < 0 || nextQty <= 0 || nextFreeQty < 0 || nextDiscount < 0) {
      setError("Enter a valid rate, quantity, free quantity, and discount.");
      return;
    }
    if (nextDiscount > nextRate * nextQty) {
      setError("Discount cannot exceed the line amount.");
      return;
    }
    if (requestedStock > availableStock) {
      setError(`Only ${availableStock} ${selectedProduct.unit || "unit"} available at ${selectedLocation.name}.`);
      return;
    }
    const batchQuantityInCart = selectedBatch
      ? cart.filter((item) => item.batchId === selectedBatch._id).reduce((sum, item) => sum + item.qty + item.freeQty, 0)
      : 0;
    if (selectedBatch && batchQuantityInCart + nextQty + nextFreeQty > Number(selectedBatch.remainingQuantity)) {
      setError(`Only ${selectedBatch.remainingQuantity} units remain in batch ${selectedBatch.batchNumber || selectedBatch.invoiceNumber}.`);
      return;
    }

    setError("");
    if (existingItem) {
      setCart((current) =>
        current.map((item) =>
          item.lineId === existingItem.lineId
            ? applyAutomaticPromotions([{ ...item, qty: item.qty + nextQty, freeQty: item.freeQty + nextFreeQty, discount: item.discount + nextDiscount }], offers)[0]
            : item
        )
      );
    } else {
      const lineId = `${selectedProduct.id}:${selectedBatch?._id || "unbatched"}`;
      setCart((current) => [
        ...current,
        ...applyAutomaticPromotions([{
          lineId,
          id: selectedProduct.id,
          batchId: selectedBatch?._id || "",
          variant: selectedBatch?.variant || "",
          batchNumber: selectedBatch?.batchNumber || "",
          expiryDate: selectedBatch?.expiryDate || "",
          mrp: Number(selectedBatch?.mrp) || 0,
          batchStock: Number(selectedBatch?.remainingQuantity) || 0,
          name: selectedProduct.name,
          taxCode: selectedProduct.salesTaxCategory?.taxCode || "",
          taxRate: Number(selectedProduct.salesTaxCategory?.taxRate) || 0,
          price: nextRate,
          qty: nextQty,
          freeQty: nextFreeQty,
          discount: nextDiscount,
        }], offers),
      ]);
    }

    setQuantity(1);
    setFreeQuantity(0);
    setDiscount(0);
    setMessage(`${selectedProduct.name} added to the invoice.`);
  };

  const updateCartItem = (lineId, field, value) => {
    const nextValue = Math.max(Number(value) || 0, 0);
    if (field === "qty" || field === "freeQty") {
      const item = cart.find((cartItem) => cartItem.lineId === lineId);
      const product = inventory.find((inventoryItem) => inventoryItem.id === item?.id);
      if (field === "qty" && nextValue < 1) {
        setError("Quantity must be at least one.");
        return;
      }
      const nextQuantity = field === "qty" ? nextValue : item?.qty || 0;
      const nextFreeQuantity = field === "freeQty" ? nextValue : item?.freeQty || 0;
      const otherProductQuantity = cart.filter((cartItem) => cartItem.id === item?.id && cartItem.lineId !== lineId).reduce((sum, cartItem) => sum + cartItem.qty + cartItem.freeQty, 0);
      if (nextQuantity + nextFreeQuantity + otherProductQuantity > stockAtSelectedLocation(product)) {
        setError(`Only ${stockAtSelectedLocation(product)} ${product?.unit || "unit"} available at ${selectedLocation?.name || "this location"}.`);
        return;
      }
      if (item?.batchId && nextQuantity + nextFreeQuantity > item.batchStock) {
        setError(`Only ${item.batchStock} units remain in batch ${item.batchNumber || "selected batch"}.`);
        return;
      }
    }
    if (field === "discount") {
      const item = cart.find((cartItem) => cartItem.lineId === lineId);
      if (item && nextValue > item.qty * item.price) {
        setError("Discount cannot exceed the line amount.");
        return;
      }
    }
    if (field === "price") {
      const item = cart.find((cartItem) => cartItem.lineId === lineId);
      if (item && item.discount > item.qty * nextValue) {
        setError("Rate cannot be lower than the current line discount.");
        return;
      }
    }
    setError("");
    setCart((current) => current.map((item) => {
      if (item.lineId !== lineId) return item;
      const updatedItem = { ...item, [field]: nextValue };
      if (field === "qty" && item.automaticOffer) return applyAutomaticPromotions([updatedItem], offers)[0];
      return updatedItem;
    }));
  };

  const removeFromCart = (lineId) => {
    setCart((current) => current.filter((item) => item.lineId !== lineId));
    setMessage("Item removed from the cart.");
  };

  const saveInvoice = async (printAfterSave = false) => {
    if (selectedOrder) {
      setError("Use Create invoice & mark Shipped to fulfill the selected customer order.");
      return;
    }
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
          customerId: selectedCustomerId || undefined,
          customerName: selectedCustomer?.name || "Walk-in Customer",
          locationId: selectedLocationId,
          paymentMode,
          promotionDiscount: totals.promotionDiscount,
          items: cart.map((item) => ({ productId: item.id, purchaseId: item.batchId || undefined, rate: item.price, quantity: item.qty, freeQuantity: item.freeQty, discount: item.discount || 0 })),
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
        items: sale.items.map((item) => ({ name: item.productName, taxCode: item.taxCode, taxRate: item.taxRate, variant: item.variant, batchNumber: item.batchNumber, expiryDate: item.expiryDate, qty: item.quantity, freeQty: item.freeQuantity, price: item.unitPrice, discount: item.discount })),
        totals: { subtotal: sale.subtotal, discount: sale.discount, tax: sale.tax, total: sale.total },
        promotion: appliedPromotion,
      };
      const soldByBatch = new Map();
      cart.forEach((item) => {
        if (item.batchId) soldByBatch.set(item.batchId, (soldByBatch.get(item.batchId) || 0) + item.qty + item.freeQty);
      });
      setBatchData((current) => current.key === batchKey ? {
        ...current,
        data: current.data.map((batch) => ({ ...batch, remainingQuantity: batch.remainingQuantity - (soldByBatch.get(batch._id) || 0) })).filter((batch) => batch.remainingQuantity > 0),
      } : current);
      setLastReceipt(receipt);
      setRecentInvoices((current) => [{ id: sale.invoiceNumber, customer: sale.customerName, items: sale.items.length, total: sale.total, paymentMode: sale.paymentMode, status: sale.paymentStatus, date: new Date(sale.createdAt).toLocaleDateString(), location: sale.location?.name || selectedLocation?.name || "-", sale }, ...current]);
      setInventory((current) => current.map((product) => {
        const quantitySold = cart.filter((item) => item.id === product.id).reduce((sum, item) => sum + item.qty + item.freeQty, 0);
        if (!quantitySold) return product;
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
      setDiscount(0);
      setSelectedBatchId("");
      setPaymentMode("Cash");
      setAppliedPromotion(null);
      setSelectedOfferId("");
      setSelectedProductId(inventory[0]?.id || "");
      setSelectedCustomerId("");
      setShowPosForm(false);
      if (printAfterSave) printReceipt(receipt, receiptWindow);
    } catch (saveError) {
      receiptWindow?.close();
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const clearOrderToInvoice = async (order) => {
    if (!selectedLocationId) {
      setError("Select a stock location before invoicing a customer order.");
      return;
    }
    const missingBatch = order.items.find((_, index) => !selectedOrderBatches[index]);
    if (missingBatch) {
      setError(`Select an available batch for ${missingBatch.name} before creating the invoice.`);
      return;
    }
    setClearingOrderId(order._id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/api/pos/orders/${order._id}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          locationId: selectedLocationId,
          items: order.items.map((_, orderItemIndex) => ({ orderItemIndex, purchaseId: selectedOrderBatches[orderItemIndex] })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to invoice this customer order.");
      const sale = result.data;
      const receipt = {
        invoiceNumber: sale.invoiceNumber,
        customerName: sale.customerName,
        paymentMode: sale.paymentMode,
        locationName: sale.location?.name || selectedLocation?.name,
        items: sale.items.map((item) => ({ name: item.productName, taxCode: item.taxCode, taxRate: item.taxRate, variant: item.variant, batchNumber: item.batchNumber, expiryDate: item.expiryDate, qty: item.quantity, freeQty: item.freeQuantity, price: item.unitPrice, discount: item.discount })),
        totals: { subtotal: sale.subtotal, discount: sale.discount, tax: sale.tax, delivery: sale.delivery, total: sale.total },
        promotion: sale.promotionDiscount ? { title: "Order promotion" } : null,
      };
      setOpenOrders((current) => current.filter((item) => item._id !== order._id));
      setSelectedOrderId("");
      setSelectedOrderBatches({});
      setShowPosForm(false);
      setRecentInvoices((current) => [{
        id: sale.invoiceNumber,
        customer: sale.customerName,
        items: sale.items.length,
        total: sale.total,
        paymentMode: sale.paymentMode,
        status: sale.paymentStatus,
        date: new Date(sale.createdAt).toLocaleDateString(),
        location: sale.location?.name || selectedLocation?.name || "-",
        sale,
      }, ...current]);
      setLastReceipt(receipt);
      setMessage(result.message || `Invoice ${sale.invoiceNumber} created and order marked Shipped.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setClearingOrderId("");
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
    const itemRows = receiptToPrint.items.map((item) => `<tr><td>${escapeHtml(item.name)}<small>${item.taxCode ? `${escapeHtml(item.taxCode)} · ${Number(item.taxRate) || 0}% · ` : ""}${item.variant ? `${escapeHtml(item.variant)} · ` : ""}${item.batchNumber ? `Batch ${escapeHtml(item.batchNumber)}` : ""}${item.expiryDate ? ` · Exp ${escapeHtml(new Date(item.expiryDate).toLocaleDateString())}` : ""}${item.freeQty ? ` · ${item.freeQty} free` : ""}</small></td><td>${item.qty}</td><td>${formatCurrency(Math.max(item.qty * item.price - item.discount, 0))}</td></tr>`).join("");
    printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(receiptToPrint.invoiceNumber)}</title><style>body{font-family:Arial,sans-serif;color:#17202a;padding:24px;max-width:390px;margin:auto}h1{font-size:20px;margin:0 0 4px}p{margin:5px 0;color:#5b6670;font-size:13px}.meta{border-bottom:1px solid #dfe4e8;padding-bottom:14px;margin-bottom:14px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:9px 0;border-bottom:1px solid #edf0f2;text-align:left}th:last-child,td:last-child{text-align:right}td:nth-child(2){text-align:center}small{display:block;color:#008f68;margin-top:3px}.totals{margin-top:14px}.line{display:flex;justify-content:space-between;padding:5px 0;font-size:13px}.total{border-top:2px solid #17202a;margin-top:6px;padding-top:10px;font-size:18px;font-weight:bold}.thanks{text-align:center;margin-top:28px}@media print{body{padding:0}}</style></head><body><div class="meta"><h1>Sales Invoice</h1><p><strong>${escapeHtml(receiptToPrint.invoiceNumber)}</strong></p><p>Customer: ${escapeHtml(receiptToPrint.customerName)}</p><p>Payment: ${escapeHtml(receiptToPrint.paymentMode)}</p><p>${new Date().toLocaleString()}</p></div><table><thead><tr><th>Product</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${itemRows}</tbody></table><div class="totals"><div class="line"><span>Subtotal</span><span>${formatCurrency(receiptToPrint.totals.subtotal)}</span></div><div class="line"><span>Discount</span><span>-${formatCurrency(receiptToPrint.totals.discount)}</span></div>${receiptToPrint.promotion ? `<div class="line"><span>Offer</span><span>${escapeHtml(receiptToPrint.promotion.title)}</span></div>` : ""}<div class="line"><span>Tax</span><span>${formatCurrency(receiptToPrint.totals.tax)}</span></div><div class="line total"><span>Total</span><span>${formatCurrency(receiptToPrint.totals.total)}</span></div></div><p class="thanks">Thank you for shopping with us.</p><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();};</script></body></html>`);
    const totalsElement = printWindow.document.querySelector(".totals");
    if (totalsElement) {
      const gstRow = [...totalsElement.querySelectorAll(".line")].find((row) => row.textContent.includes("Tax"));
      if (!Number(receiptToPrint.totals.tax || 0)) gstRow?.remove();
      if (Number(receiptToPrint.totals.delivery || 0) > 0) {
        const deliveryRow = printWindow.document.createElement("div");
        deliveryRow.className = "line";
        deliveryRow.innerHTML = `<span>Delivery</span><span>${formatCurrency(receiptToPrint.totals.delivery)}</span>`;
        totalsElement.insertBefore(deliveryRow, totalsElement.querySelector(".total"));
      }
    }
    printWindow.document.close();
  };

  const cancelInvoice = () => {
    setCart([]);
    setSelectedCustomerId("");
    setPaymentMode("Cash");
    setAppliedPromotion(null);
    setSelectedOfferId("");
    setQuantity(1);
    setFreeQuantity(0);
    setError("");
    setMessage("Current invoice cancelled.");
  };

  const savePosCustomer = async (event) => {
    event.preventDefault();
    setSavingCustomer(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(customerForm),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to add customer.");
      setCustomers((current) => [result.data, ...current]);
      setSelectedCustomerId(result.data._id);
      setCustomerForm({ name: "", phone: "", email: "" });
      setCustomerFormOpen(false);
      setMessage(`${result.data.name} added to this sale.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingCustomer(false);
    }
  };

  const printSavedInvoice = (invoice) => {
    const sale = invoice.sale;
    printReceipt({
      invoiceNumber: invoice.id,
      customerName: invoice.customer,
      paymentMode: invoice.paymentMode,
      locationName: invoice.location,
      items: sale.items.map((item) => ({ name: item.productName, taxCode: item.taxCode, taxRate: item.taxRate, variant: item.variant, batchNumber: item.batchNumber, expiryDate: item.expiryDate, qty: item.quantity, freeQty: item.freeQuantity, price: item.unitPrice, discount: item.discount })),
      totals: { subtotal: sale.subtotal, discount: sale.discount, tax: sale.tax, delivery: sale.delivery, total: sale.total },
    });
  };

  const hasPosDraft = Boolean(cart.length || selectedCustomerId || selectedOrderId);
  const totalSales = recentInvoices.reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);

  return (
    <div className="mx-auto max-w-375 space-y-6">
      <header className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:flex-row xl:items-end xl:justify-between">
        <div><p className="text-sm font-medium text-primary">Store operations</p><h1 className="mt-1 text-3xl font-bold text-slate-900">POS sales</h1><p className="mt-2 text-sm text-slate-500">Create an invoice and deduct stock from the selected branch.</p><p className="mt-3 text-xs font-semibold text-slate-500">{recentInvoices.length} recorded · {formatCurrency(totalSales)} total</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-lg border px-3 py-2 text-xs font-semibold ${loading ? "border-slate-200 bg-slate-50 text-slate-500" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{loading ? "Loading POS data" : selectedLocation?.name || "Choose a location"}</span>
          <button type="button" onClick={printReceipt} disabled={!lastReceipt} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><Printer className="h-4 w-4" />Last receipt</button>
          <button type="button" onClick={() => { if (showPosForm) { setShowPosForm(false); return; } if (!hasPosDraft) { setError(""); setMessage(""); } setShowPosForm(true); }} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark">{showPosForm ? <X className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}{showPosForm ? "Back to sales" : hasPosDraft ? "Continue draft" : "New sale"}</button>
        </div>
      </header>

      {(error || message) && <div role={error ? "alert" : "status"} className={`rounded-lg px-4 py-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>{error || message}<button type="button" onClick={() => { setError(""); setMessage(""); }} aria-label="Dismiss message" className="float-right"><X className="h-4 w-4" /></button></div>}

      {showPosForm && <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:px-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShoppingCart className="h-5 w-5" /></span><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">New sale</p><h2 className="text-lg font-bold text-slate-900">Customer checkout</h2></div></div><p className="text-xs text-slate-500">Select a customer and location, add products, then complete payment.</p></div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Invoice details</p><h2 className="mt-1 text-lg font-bold text-slate-900">Customer and location</h2></div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <div>
            <label htmlFor="pos-customer" className="text-sm font-medium text-slate-700">Customer<select id="pos-customer" value={selectedCustomerId} onChange={(event) => { setSelectedCustomerId(event.target.value); setSelectedOrderId(""); setSelectedOrderBatches({}); }} disabled={loading || saving} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary disabled:opacity-60"><option value="">Walk-in Customer</option>{customers.map((customer) => <option key={customer._id} value={customer._id}>{[customer.name, customer.phone, customer.locality, customer.pincode].filter(Boolean).join(" · ")}</option>)}</select></label>
            {selectedCustomer && <p className="mt-2 text-xs leading-5 text-slate-500">{[selectedCustomer.phone, selectedCustomer.address, selectedCustomer.locality, selectedCustomer.pincode, selectedCustomer.district, selectedCustomer.state].filter(Boolean).join(" · ") || "No address details saved"}</p>}
            <button type="button" onClick={() => { setCustomerForm({ name: "", phone: "", email: "" }); setCustomerFormOpen(true); }} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"><Plus className="h-3.5 w-3.5" />Add customer</button>
          </div>
          <label className="text-sm font-medium text-slate-700"><span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Stock location</span><select value={selectedLocationId} onChange={(event) => { if (cart.length && !window.confirm("Changing location will clear the current invoice. Continue?")) return; setCart([]); setSelectedLocationId(event.target.value); setSelectedBatchId(""); setError(""); }} disabled={loading || saving || Boolean(selectedOrder?.store)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary disabled:opacity-60"><option value="">Select a store location</option>{locations.map((location) => <option key={location._id} value={location._id}>{location.name}</option>)}</select>{selectedOrder?.store && <span className="mt-1 block text-xs text-slate-500">This order must be fulfilled at {selectedOrder.store.name}.</span>}</label>
        </div>
        {selectedCustomerId && <div className="border-t border-slate-100 px-5 py-4 sm:px-6"><label htmlFor="pos-customer-order" className="block max-w-xl text-sm font-medium text-slate-700">Customer order<select id="pos-customer-order" value={selectedOrderId} onChange={(event) => {
          const orderId = event.target.value;
          const order = customerOrders.find((item) => item._id === orderId);
          if (order && cart.length && !window.confirm("Selecting this order will replace the current POS invoice items. Continue?")) return;
          if (order) {
            setCart([]);
            setAppliedPromotion(null);
            if (order.store?._id) setSelectedLocationId(order.store._id);
          }
          setSelectedOrderId(orderId);
          setSelectedOrderBatches({});
        }} disabled={loading || saving || !customerOrders.length} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary disabled:opacity-60"><option value="">{loading ? "Loading orders..." : customerOrders.length ? "Select a pending order" : "No pending orders for this customer"}</option>{customerOrders.map((order) => <option key={order._id} value={order._id}>#{order.orderNumber} · {new Date(order.createdAt).toLocaleDateString()} · {formatCurrency(order.total)}</option>)}</select></label></div>}
      </section>

      {selectedOrder && <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Order #{selectedOrder.orderNumber}</p><h2 className="mt-1 text-lg font-bold text-slate-900">Invoice items</h2><p className="mt-1 text-xs text-slate-500">Quantity, rate, and discount are copied from this order. Select an available batch for each product.</p></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Processing</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-225 text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Product</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Rate</th><th className="px-4 py-3">Discount</th><th className="px-4 py-3">Batch</th><th className="px-4 py-3">MRP</th></tr></thead><tbody className="divide-y divide-slate-100">{selectedOrder.items.map((item, index) => {
          const productId = String(item.product?._id || item.product);
          const batchesForItem = orderBatchData.key === selectedLocationId ? orderBatchData.data[productId] || [] : [];
          const selectedBatchForItem = batchesForItem.find((batch) => batch._id === selectedOrderBatches[index]);
          const itemQuantity = Number(item.quantity) || 1;
          const itemDiscount = Number(item.discountAmount || 0) * itemQuantity;
          const availableBatches = batchesForItem.filter((batch) => Number(batch.remainingQuantity) >= itemQuantity);
          return <tr key={`${selectedOrder._id}-${index}`}><td className="px-5 py-3 font-medium text-slate-800">{item.name}</td><td className="px-4 py-3 text-slate-700">{itemQuantity}</td><td className="px-4 py-3 text-slate-700">{formatCurrency(item.price)}</td><td className="px-4 py-3 text-slate-700">{formatCurrency(itemDiscount)}</td><td className="px-4 py-3"><select aria-label={`Batch for ${item.name}`} value={selectedOrderBatches[index] || ""} onChange={(event) => setSelectedOrderBatches((current) => ({ ...current, [index]: event.target.value }))} disabled={!selectedLocationId || orderBatchesLoading || saving || Boolean(clearingOrderId)} className="h-10 min-w-64 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary disabled:bg-slate-50"><option value="">{orderBatchesLoading ? "Loading batches..." : availableBatches.length ? "Select an available batch" : "No available batches"}</option>{availableBatches.map((batch) => <option key={batch._id} value={batch._id}>{batch.variant ? `${batch.variant} · ` : ""}{batch.batchNumber || batch.invoiceNumber} · {batch.remainingQuantity} available</option>)}</select></td><td className="px-4 py-3 text-slate-700">{selectedBatchForItem ? formatCurrency(selectedBatchForItem.mrp) : "-"}</td></tr>;
        })}</tbody></table></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6"><p className="text-xs text-slate-500">Order total {formatCurrency(selectedOrder.total)} · Checkout already deducted stock; invoicing updates the selected batch stock.</p><button type="button" disabled={!selectedLocationId || orderBatchesLoading || Boolean(clearingOrderId) || saving || selectedOrder.items.some((_, index) => !selectedOrderBatches[index])} onClick={() => clearOrderToInvoice(selectedOrder)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" />{clearingOrderId === selectedOrder._id ? "Creating invoice..." : "Create invoice & mark Shipped"}</button></div>
      </section>}

      <section className={`rounded-xl border border-slate-200 bg-white ${selectedOrder ? "hidden" : ""}`}>
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Sales invoice</p><h2 className="mt-1 text-lg font-bold text-slate-900">Add products</h2><p className="mt-1 text-sm text-slate-500">Available quantities reflect the selected location.</p></div>
        <div className="grid items-end gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4 sm:p-6">
          <SearchableSelect label="Product" value={selectedProductId} onChange={(productId) => { setSelectedProductId(productId); setSelectedBatchId(""); setRate(String(inventory.find((product) => product.id === productId)?.price ?? "")); }} placeholder="Search products..." options={inventory.map((product) => ({ value: product.id, label: product.name, description: `${product.category || "Product"} · ${stockAtSelectedLocation(product)} ${product.unit || "unit"} at location · ${formatCurrency(product.price)} · Tax ${Number(product.salesTaxCategory?.taxRate) || 0}%` }))} />
          <label className="text-sm font-medium text-slate-700">Batch<select value={selectedBatchId} onChange={(event) => setSelectedBatchId(event.target.value)} disabled={!selectedProduct || !selectedLocationId || batchLoading || saving} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary disabled:bg-slate-50 disabled:opacity-70"><option value="">{batchLoading ? "Loading batches..." : batches.length ? "Select a batch" : "No batch records"}</option>{batches.map((batch) => <option key={batch._id} value={batch._id}>{batch.variant ? `${batch.variant} · ` : ""}{batch.batchNumber || batch.invoiceNumber} · {batch.remainingQuantity} available</option>)}</select></label>
          <label className="text-sm font-medium text-slate-700">Expiry<input type="date" readOnly value={selectedBatch?.expiryDate ? new Date(selectedBatch.expiryDate).toISOString().slice(0, 10) : ""} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600" /></label>
          <label className="text-sm font-medium text-slate-700">MRP<input type="number" readOnly value={selectedBatch?.mrp ?? ""} placeholder="Select batch" className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600" /></label>
          <label className="text-sm font-medium text-slate-700">Rate<input type="number" min="0" step="0.01" value={rate} onChange={(event) => setRate(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" /></label>
          <label className="text-sm font-medium text-slate-700">Qty<input type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" /></label>
          <label className="text-sm font-medium text-slate-700">Free qty<input type="number" min="0" value={freeQuantity} onChange={(event) => setFreeQuantity(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" /></label>
          <label className="text-sm font-medium text-slate-700">Discount<input type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" /></label>
          <div className="flex justify-end xl:col-span-4"><button type="button" onClick={addToCart} disabled={!selectedProduct || !selectedLocationId || batchLoading || loading || saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />Add line</button></div>
        </div>
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-300 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Product</th><th className="px-4 py-3">Batch</th><th className="px-4 py-3">Expiry</th><th className="px-4 py-3">MRP</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Free qty</th><th className="px-4 py-3">Rate</th><th className="px-4 py-3">Discount</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3" /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {cart.length ? cart.map((item) => <tr key={item.lineId}><td className="px-5 py-3 font-medium text-slate-800">{item.name}{item.taxCode && <span className="mt-1 block text-xs font-normal text-slate-500">{item.taxCode} · {Number(item.taxRate) || 0}% tax</span>}{item.automaticOffer && <span className="mt-1 block text-xs text-primary">{item.automaticOffer}</span>}</td><td className="px-4 py-3 text-slate-600">{item.batchNumber || "-"}</td><td className="px-4 py-3 text-slate-600">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "-"}</td><td className="px-4 py-3 text-slate-600">{item.mrp ? formatCurrency(item.mrp) : "-"}</td><td className="px-4 py-3"><input aria-label={`${item.name} quantity`} type="number" min="1" value={item.qty} onChange={(event) => updateCartItem(item.lineId, "qty", event.target.value)} className="w-16 rounded-md border border-slate-200 px-2 py-1" /></td><td className="px-4 py-3"><input aria-label={`${item.name} free quantity`} type="number" min="0" value={item.freeQty} onChange={(event) => updateCartItem(item.lineId, "freeQty", event.target.value)} className="w-16 rounded-md border border-slate-200 px-2 py-1" /></td><td className="px-4 py-3"><input aria-label={`${item.name} rate`} type="number" min="0" step="0.01" value={item.price} onChange={(event) => updateCartItem(item.lineId, "price", event.target.value)} className="w-24 rounded-md border border-slate-200 px-2 py-1" /></td><td className="px-4 py-3"><input aria-label={`${item.name} discount`} type="number" min="0" value={item.discount} onChange={(event) => updateCartItem(item.lineId, "discount", event.target.value)} className="w-20 rounded-md border border-slate-200 px-2 py-1" /></td><td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(Math.max(item.qty * item.price - item.discount, 0))}</td><td className="px-4 py-3"><button type="button" onClick={() => removeFromCart(item.lineId)} aria-label={`Remove ${item.name}`} className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></td></tr>) : <tr><td colSpan="10" className="px-5 py-12 text-center text-sm text-slate-500">{loading ? "Loading products..." : "No items yet. Search for a product to start this invoice."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <details className={`rounded-xl border border-slate-200 bg-white ${selectedOrder ? "hidden" : ""}`}>
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-800">Promotions and offers</summary>
        <div className="grid gap-3 border-t border-slate-100 p-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="text-sm font-medium text-slate-700">Promotion<select id="promotion" value={selectedOfferId} onChange={(event) => setSelectedOfferId(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary"><option value="">Select active promotion</option>{offers.map((offer) => <option key={offer._id} value={offer._id}>{offer.title} {offer.code ? `· ${offer.code}` : ""}</option>)}</select></label>
          <button type="button" onClick={applyPromotion} disabled={!cart.length} className="h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">Apply offer</button>
          {appliedPromotion && <div className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 sm:col-span-2"><span><strong>{appliedPromotion.title}</strong> applied {appliedPromotion.freeQuantity ? `· ${appliedPromotion.freeQuantity} free item(s)` : ""}</span><button type="button" onClick={removePromotion} className="font-semibold underline">Remove</button></div>}
        </div>
      </details>

      <section className={`rounded-xl border border-slate-200 bg-white p-5 sm:p-6 ${selectedOrder ? "hidden" : ""}`}>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Payment and total</p><h2 className="mt-1 text-lg font-bold text-slate-900">Complete sale</h2><div className="mt-4 flex flex-wrap gap-2">{["Cash", "UPI", "Card", "Credit", "Cheque"].map((mode) => <button key={mode} type="button" onClick={() => setPaymentMode(mode)} aria-pressed={paymentMode === mode} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${paymentMode === mode ? "border-primary bg-primary text-white" : "border-slate-200 text-slate-600 hover:border-primary"}`}>{mode}</button>)}</div></div>
          <div className="space-y-2 border-t border-slate-100 pt-4 text-sm lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"><div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div><div className="flex justify-between text-rose-600"><span>Discount</span><span>-{formatCurrency(totals.discount)}</span></div><div className="flex justify-between text-slate-600"><span>Tax</span><span>{formatCurrency(totals.tax)}</span></div><div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-bold text-slate-900"><span>Total</span><span>{formatCurrency(totals.total)}</span></div></div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={cancelInvoice} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><X className="h-4 w-4" />Clear invoice</button><button type="button" onClick={() => saveInvoice(true)} disabled={saving || loading || !cart.length || !selectedLocationId} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-primary px-4 text-sm font-semibold text-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"><Printer className="h-4 w-4" />{saving ? "Saving..." : "Save & print"}</button><button type="button" onClick={() => saveInvoice(false)} disabled={saving || loading || !cart.length || !selectedLocationId} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving sale..." : "Complete sale"}</button></div>
      </section>
      </div>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">POS register</p><h2 className="mt-1 text-lg font-bold text-slate-900">Recent sales <span className="ml-1 text-sm font-medium text-slate-400">{filteredInvoices.length}</span></h2></div><label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 sm:w-80"><Search className="h-4 w-4 shrink-0 text-slate-400" /><input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Search invoice, customer, location..." className="w-full bg-transparent text-sm outline-none" /></label></div>
        <div className="overflow-x-auto"><table className="w-full min-w-220 text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Invoice</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Receipt</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredInvoices.map((invoice) => <tr key={invoice.id}><td className="px-5 py-3 font-semibold text-primary">{invoice.id}</td><td className="px-4 py-3 text-slate-700">{invoice.customer}</td><td className="px-4 py-3 text-slate-600">{invoice.location}</td><td className="px-4 py-3 text-slate-600">{invoice.items}</td><td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(invoice.total)}</td><td className="px-4 py-3 text-slate-600">{invoice.paymentMode}<span className="block text-xs text-slate-500">{invoice.status}</span></td><td className="px-4 py-3 text-slate-500">{invoice.date}</td><td className="px-4 py-3"><button type="button" onClick={() => printSavedInvoice(invoice)} aria-label={`Print ${invoice.id}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Printer className="h-4 w-4" /></button></td></tr>)}</tbody></table>{!filteredInvoices.length && <p className="px-5 py-12 text-center text-sm text-slate-500">{recentInvoices.length ? "No sales match this search." : "No saved sales yet."}</p>}</div>
      </section>
      {customerFormOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
        <form onSubmit={savePosCustomer} role="dialog" aria-modal="true" aria-labelledby="pos-customer-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-primary">Offline customer</p><h2 id="pos-customer-title" className="mt-1 text-xl font-bold text-slate-900">Add customer</h2></div><button type="button" onClick={() => setCustomerFormOpen(false)} aria-label="Close customer form" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
          <label className="mt-5 block text-sm font-semibold text-slate-700">Full name<input required minLength={2} maxLength={80} value={customerForm.name} onChange={(event) => setCustomerForm((current) => ({ ...current, name: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" /></label>
          <label className="mt-4 block text-sm font-semibold text-slate-700">Phone<input type="tel" maxLength={30} value={customerForm.phone} onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" /></label>
          <label className="mt-4 block text-sm font-semibold text-slate-700">Email <span className="font-normal text-slate-400">(optional)</span><input type="email" value={customerForm.email} onChange={(event) => setCustomerForm((current) => ({ ...current, email: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" /></label>
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setCustomerFormOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button type="submit" disabled={savingCustomer} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">{savingCustomer ? "Saving..." : "Add to sale"}</button></div>
        </form>
      </div>}
    </div>
  );
};

export default AdminPos;
