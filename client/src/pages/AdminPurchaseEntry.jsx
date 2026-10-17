import { useEffect, useMemo, useRef, useState } from "react";
import { FileDown, FileUp, PackagePlus, Pencil, Save, Search, Trash2, Truck, X } from "lucide-react";
import SearchableSelect from "../components/admin/SearchableSelect";

const apiUrl = import.meta.env.VITE_API_URL || "";
const emptyForm = { vendor: "", product: "", variant: "", vendorInvoiceNumber: "", referenceNumber: "", location: "", batchNumber: "", expiryDate: "", mrp: 0, rate: 0, quantity: 1, freeQuantity: 0, unitCost: 0, taxRate: 0, discount: 0, purchaseDate: new Date().toISOString().slice(0, 10) };
const emptyAdjustment = { vendor: "", product: "", stockAdjustment: 0, balanceAdjustment: 0, reason: "", adjustmentDate: new Date().toISOString().slice(0, 10) };
const formatCurrency = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);

const AdminPurchaseEntry = () => {
  const [entries, setEntries] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [variantFormOpen, setVariantFormOpen] = useState(false);
  const [variantForm, setVariantForm] = useState({ name: "", sku: "", price: "" });
  const [variantSaving, setVariantSaving] = useState(false);
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [adjustment, setAdjustment] = useState(emptyAdjustment);
  const [editingId, setEditingId] = useState(null);
  const [historyQuery, setHistoryQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const csvInput = useRef(null);

  const load = async () => {
    const [purchaseResponse, vendorResponse, productResponse, adjustmentResponse, locationResponse] = await Promise.all([
      fetch(`${apiUrl}/api/purchases`, { credentials: "include" }),
      fetch(`${apiUrl}/api/vendors`, { credentials: "include" }),
      fetch(`${apiUrl}/api/products`, { credentials: "include" }),
      fetch(`${apiUrl}/api/purchases/adjustments`, { credentials: "include" }),
      fetch(`${apiUrl}/api/stores`),
    ]);
    const [purchaseResult, vendorResult, productResult, adjustmentResult, locationResult] = await Promise.all([purchaseResponse.json(), vendorResponse.json(), productResponse.json(), adjustmentResponse.json(), locationResponse.json()]);
    if (!purchaseResponse.ok || !vendorResponse.ok || !productResponse.ok || !adjustmentResponse.ok || !locationResponse.ok) throw new Error(purchaseResult.message || vendorResult.message || productResult.message || adjustmentResult.message || locationResult.message || "Unable to load purchase data.");
    return {
      entries: purchaseResult.data || [],
      vendors: vendorResult.data || [],
      products: productResult.data || [],
      adjustments: adjustmentResult.data || [],
      locations: locationResult.data || [],
    };
  };

  const applyLoadedData = ({ entries: loadedEntries, vendors: loadedVendors, products: loadedProducts, adjustments: loadedAdjustments, locations: loadedLocations }) => {
    setEntries(loadedEntries);
    setVendors(loadedVendors);
    setProducts(loadedProducts);
    setAdjustments(loadedAdjustments);
    setLocations(loadedLocations);
    const defaultLocation = loadedLocations.find((location) => location.isDefault) || loadedLocations[0];
    if (defaultLocation) setForm((current) => current.location ? current : { ...current, location: defaultLocation._id });
  };

  const refresh = async () => applyLoadedData(await load());

  useEffect(() => {
    let active = true;
    load()
      .then(({ entries: loadedEntries, vendors: loadedVendors, products: loadedProducts, adjustments: loadedAdjustments, locations: loadedLocations }) => {
        if (!active) return;
        setEntries(loadedEntries);
        setVendors(loadedVendors);
        setProducts(loadedProducts);
        setAdjustments(loadedAdjustments);
        setLocations(loadedLocations);
        const defaultLocation = loadedLocations.find((location) => location.isDefault) || loadedLocations[0];
        if (defaultLocation) setForm((current) => current.location ? current : { ...current, location: defaultLocation._id });
      })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, []);

  const totalPurchase = useMemo(() => entries.reduce((sum, entry) => sum + Number(entry.total || 0), 0), [entries]);
  const filteredEntries = useMemo(() => entries.filter((entry) => `${entry.vendorInvoiceNumber || entry.invoiceNumber} ${entry.referenceNumber || ""} ${entry.vendor?.name || ""} ${entry.productName || ""} ${entry.batchNumber || ""} ${entry.location?.name || ""}`.toLowerCase().includes(historyQuery.trim().toLowerCase())), [entries, historyQuery]);
  const selectedProduct = products.find((product) => product._id === form.product);
  const productVariants = selectedProduct?.variants || [];
  const calculatedAmount = useMemo(() => {
    const subtotal = (Number(form.quantity) || 0) * (Number(form.rate) || 0);
    const tax = subtotal * ((Number(form.taxRate) || 0) / 100);
    return Math.max(subtotal + tax - (Number(form.discount) || 0), 0);
  }, [form.quantity, form.rate, form.taxRate, form.discount]);
  const updateField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const resetForm = () => { setEditingId(null); setForm({ ...emptyForm, location: locations.find((location) => location.isDefault)?._id || locations[0]?._id || "", purchaseDate: new Date().toISOString().slice(0, 10) }); };
  const updateAdjustment = (field) => (event) => setAdjustment((current) => ({ ...current, [field]: event.target.value }));

  const createVariantForPurchase = async (event) => {
    event.preventDefault();
    if (!selectedProduct) return;
    const name = variantForm.name.trim();
    if (!name) return;
    setVariantSaving(true);
    setError("");
    try {
      const response = await fetch(`${apiUrl}/api/purchases/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productId: selectedProduct._id,
          name,
          sku: variantForm.sku.trim(),
          ...(variantForm.price === "" ? {} : { price: Number(variantForm.price) }),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to add this product variant.");
      setProducts((current) => current.map((product) => product._id === selectedProduct._id ? result.data : product));
      setForm((current) => ({ ...current, variant: name }));
      setVariantForm({ name: "", sku: "", price: "" });
      setVariantFormOpen(false);
      setMessage(`${name} added to ${selectedProduct.name}. Enter its batch and purchase stock to complete the intake.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setVariantSaving(false);
    }
  };

  const addPurchaseItem = () => {
    if (!form.vendor || !form.product || !form.location || !form.vendorInvoiceNumber.trim()) {
      setError("Select a vendor, product, location, and invoice number before adding another entry.");
      return;
    }
    if (productVariants.length && !form.variant) {
      setError("Select a product variant or pack before adding this purchase item.");
      return;
    }
    setPurchaseItems((current) => [...current, { ...form, expiryDate: form.expiryDate || undefined }]);
    setMessage("Purchase item added to the batch.");
    resetForm();
  };

  const savePurchase = async () => {
    setError("");
    const itemsToSave = purchaseItems.length ? purchaseItems : [{ ...form, expiryDate: form.expiryDate || undefined }];
    const firstItem = itemsToSave[0];
    const firstItemProduct = products.find((product) => product._id === firstItem?.product);
    if (!firstItem?.vendor || !firstItem?.product || (firstItemProduct?.variants?.length && !firstItem.variant) || (!editingId && (!firstItem?.location || !firstItem?.vendorInvoiceNumber?.trim()))) {
      setError("Select a vendor, product, and stock location, and enter the vendor invoice number for new purchases.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${apiUrl}/api/purchases${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editingId ? { ...firstItem, expiryDate: firstItem.expiryDate || undefined } : { items: itemsToSave.map((item) => ({ ...item, expiryDate: item.expiryDate || undefined })) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save purchase entry.");
      setMessage(editingId ? "Purchase entry updated and stock adjusted." : `${itemsToSave.length} purchase ${itemsToSave.length === 1 ? "entry" : "entries"} saved and stock updated.`);
      setPurchaseItems([]);
      resetForm();
      await refresh();
    } catch (requestError) {
      setError(requestError.message || "Unable to save purchase entry.");
    } finally {
      setSaving(false);
    }
  };

  const saveAdjustment = async (event) => {
    event.preventDefault();
    setError("");
    const response = await fetch(`${apiUrl}/api/purchases/adjustment`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(adjustment) });
    const result = await response.json();
    if (!response.ok) { setError(result.message || "Unable to save adjustment."); return; }
    setMessage("Purchase adjustment saved and inventory updated.");
    setAdjustment({ ...emptyAdjustment, adjustmentDate: new Date().toISOString().slice(0, 10) });
    await refresh();
  };

  const editEntry = (entry) => {
    setEditingId(entry._id);
    setForm({ vendor: entry.vendor?._id || entry.vendor, product: entry.product?._id || entry.product, variant: entry.variant || "", vendorInvoiceNumber: entry.vendorInvoiceNumber || "", referenceNumber: entry.referenceNumber || "", location: entry.location?._id || entry.location || "", batchNumber: entry.batchNumber || "", expiryDate: entry.expiryDate ? new Date(entry.expiryDate).toISOString().slice(0, 10) : "", mrp: entry.mrp || 0, rate: entry.rate ?? entry.unitCost ?? 0, quantity: entry.quantity, freeQuantity: entry.freeQuantity, unitCost: entry.unitCost, taxRate: entry.taxRate || 0, discount: entry.discount || 0, purchaseDate: new Date(entry.purchaseDate).toISOString().slice(0, 10) });
    setMessage("Purchase entry loaded for editing.");
  };

  const deleteEntry = async (entry) => {
    if (!window.confirm("Delete this purchase and reverse its stock update?")) return;
    const response = await fetch(`${apiUrl}/api/purchases/${entry._id}`, { method: "DELETE", credentials: "include" });
    const result = await response.json();
    if (!response.ok) { setError(result.message || "Unable to delete purchase."); return; }
    setMessage("Purchase deleted and stock reversed.");
    await refresh();
  };

  const importCsv = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    const response = await fetch(`${apiUrl}/api/purchases/import`, { method: "POST", credentials: "include", body });
    const result = await response.json();
    if (!response.ok) { setError(result.message || "Unable to import purchase CSV."); return; }
    setMessage(`${result.imported} purchase entries imported and stock updated.`);
    await refresh();
  };

  const downloadSampleCsv = () => {
    const rows = [["vendor", "product", "variant", "vendorInvoiceNumber", "referenceNumber", "location", "batchNumber", "expiryDate", "mrp", "rate", "unitCost", "quantity", "freeQuantity", "taxRate", "discount", "purchaseDate"], [vendors[0]?.name || "Example Vendor", products[0]?.name || "Product name", products[0]?.variants?.[0]?.name || "", "INV-1001", "REF-1001", locations[0]?._id || "", "BATCH-01", "2027-12-31", "120", "80", "75", "10", "1", "5", "0", new Date().toISOString().slice(0, 10)]];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = "purchase-entry-sample.csv";
    link.click();
  };

  return (
    <div className="mx-auto max-w-375">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-medium text-primary">Inventory management</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Purchase entry</h1><p className="mt-2 text-sm text-slate-500">Record purchases, update stock, and track vendor balances.</p></div>
        <div className="flex flex-wrap items-center gap-2"><input ref={csvInput} type="file" accept=".csv,text/csv" onChange={importCsv} className="hidden" /><button type="button" onClick={() => csvInput.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><FileUp className="h-4 w-4" />Import CSV</button><button type="button" onClick={downloadSampleCsv} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><FileDown className="h-4 w-4" />Sample CSV</button><div className="ml-1 border-l border-slate-200 pl-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Recorded purchases</p><p className="text-sm font-semibold text-slate-800">{entries.length} · {formatCurrency(totalPurchase)}</p></div></div>
      </div>
      {(message || error) && <div className={`mb-5 rounded-xl p-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{error || message}<button type="button" onClick={() => { setError(""); setMessage(""); }} className="float-right"><X className="h-4 w-4" /></button></div>}

      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:px-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><PackagePlus className="h-5 w-5" /></span><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">{editingId ? "Editing purchase" : "New invoice"}</p><h2 className="text-lg font-bold text-slate-900">Supplier stock intake</h2></div></div><p className="text-xs text-slate-500">Fields marked required must be filled before saving.</p></div>
          <div className="space-y-6 p-5 sm:p-6">
            <div><h3 className="text-sm font-semibold text-slate-900">Invoice details</h3><p className="mt-1 text-xs text-slate-500">Record the vendor’s invoice and receiving branch.</p></div>
          <SearchableSelect label="Vendor" value={form.vendor} onChange={(vendorId) => setForm((current) => ({ ...current, vendor: vendorId }))} placeholder="Search vendors by name, phone, or email" options={vendors.map((vendor) => ({ value: vendor._id, label: vendor.name, description: [vendor.phone, vendor.email].filter(Boolean).join(" · ") }))} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-medium text-slate-700 xl:col-span-2">Vendor invoice no.<input required value={form.vendorInvoiceNumber} onChange={updateField("vendorInvoiceNumber")} placeholder="Invoice number printed by vendor" className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3" /></label>
            <label className="text-sm font-medium text-slate-700">Reference no. (optional)<input value={form.referenceNumber} onChange={updateField("referenceNumber")} placeholder="Internal reference" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
            <label className="text-sm font-medium text-slate-700">Stock location<select required value={form.location} onChange={updateField("location")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-primary"><option value="">Select location</option>{locations.map((location) => <option key={location._id} value={location._id}>{location.name}</option>)}</select></label>
            <label className="text-sm font-medium text-slate-700">Invoice date<input required type="date" value={form.purchaseDate} onChange={updateField("purchaseDate")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3" /></label>
            <div className="border-t border-slate-100 pt-4 sm:col-span-2 xl:col-span-4"><h3 className="text-sm font-semibold text-slate-900">Product and batch</h3><p className="mt-1 text-xs text-slate-500">Capture the product identity and traceable batch information.</p></div>
            <SearchableSelect label="Product" value={form.product} onChange={(productId) => setForm((current) => ({ ...current, product: productId, variant: "" }))} placeholder="Search products by name or category" className="xl:col-span-2" options={products.map((product) => ({ value: product._id, label: product.name, description: `${product.category} · ${product.stock} ${product.unit || "unit"} in stock` }))} />
            <div><label htmlFor="purchase-variant" className="text-sm font-medium text-slate-700">Variant / pack<select id="purchase-variant" required={productVariants.length > 0} disabled={!productVariants.length} value={form.variant} onChange={updateField("variant")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary disabled:bg-slate-50 disabled:text-slate-400"><option value="">{productVariants.length ? "Select variant / pack" : "No variants configured"}</option>{productVariants.map((variant) => <option key={variant._id || variant.name} value={variant.name}>{variant.name}{variant.sku ? ` · ${variant.sku}` : ""}</option>)}</select></label><button type="button" disabled={!selectedProduct || !locations.length || variantSaving} onClick={() => { setVariantForm({ name: "", sku: "", price: "" }); setVariantFormOpen(true); }} className="mt-2 text-xs font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:text-slate-400">+ Add variant / pack</button></div>
            <label className="text-sm font-medium text-slate-700">Batch<input value={form.batchNumber} onChange={updateField("batchNumber")} placeholder="Batch / lot number" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
            <label className="text-sm font-medium text-slate-700">Expiry date<input type="date" value={form.expiryDate} onChange={updateField("expiryDate")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
            <div className="border-t border-slate-100 pt-4 sm:col-span-2 xl:col-span-4"><h3 className="text-sm font-semibold text-slate-900">Quantity and pricing</h3><p className="mt-1 text-xs text-slate-500">Enter invoice rates and quantities; amount recalculates automatically.</p></div>
            <label className="text-sm font-medium text-slate-700">MRP<input type="number" min="0" step="0.01" value={form.mrp} onChange={updateField("mrp")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
            <label className="text-sm font-medium text-slate-700">Rate<input type="number" min="0" step="0.01" value={form.rate} onChange={updateField("rate")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
            <label className="text-sm font-medium text-slate-700">Cost rate<input type="number" min="0" step="0.01" value={form.unitCost} onChange={updateField("unitCost")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
            <label className="text-sm font-medium text-slate-700">Qty<input type="number" min="1" value={form.quantity} onChange={updateField("quantity")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
            <label className="text-sm font-medium text-slate-700">Free qty<input type="number" min="0" value={form.freeQuantity} onChange={updateField("freeQuantity")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
            <label className="text-sm font-medium text-slate-700">Tax (%)<input type="number" min="0" max="100" step="0.01" value={form.taxRate} onChange={updateField("taxRate")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
            <label className="text-sm font-medium text-slate-700">Discount amount<input type="number" min="0" step="0.01" value={form.discount} onChange={updateField("discount")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
          </div>
          <div className="flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice amount</p><p className="mt-1 text-xs text-slate-500">Qty × rate + tax − discount</p></div><div className="flex flex-col-reverse gap-2 sm:flex-row"><button type="button" onClick={resetForm} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><X className="h-4 w-4" />Cancel</button><button type="button" onClick={addPurchaseItem} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-50">Add product</button><button type="button" onClick={savePurchase} disabled={saving} className="inline-flex h-11 items-center justify-center gap-3 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60"><span>{saving ? "Saving..." : editingId ? "Update purchase" : "Save purchase"}</span><span className="border-l border-white/30 pl-3 font-bold">{formatCurrency(calculatedAmount)}</span></button></div></div>
          {purchaseItems.length > 0 && <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Queued purchase items</p><button type="button" onClick={() => setPurchaseItems([])} className="text-xs font-semibold text-slate-500 hover:text-slate-700">Clear all</button></div>
            <div className="mt-3 flex flex-wrap gap-2">{purchaseItems.map((item, index) => <span key={`${item.product}-${item.variant}-${index}`} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700">{products.find((product) => product._id === item.product)?.name || item.product || "Item"}{item.variant ? ` · ${item.variant}` : ""} · {item.quantity}</span>)}</div>
          </div>}
        </div></section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><Truck className="h-5 w-5" /></span><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Purchase register</p><h2 className="text-lg font-bold text-slate-900">Recent entries <span className="ml-1 text-sm font-medium text-slate-400">{filteredEntries.length}</span></h2></div></div><label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 sm:w-80"><Search className="h-4 w-4 shrink-0 text-slate-400" /><input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Search invoice, vendor, product..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" /></label></div>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-280 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-4 py-3">Vendor invoice</th><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">Product / batch</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Qty / free</th><th className="px-4 py-3">Pricing / tax</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Date / payment</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{filteredEntries.map((entry) => (
                <tr key={entry._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-primary">{entry.vendorInvoiceNumber || entry.invoiceNumber}{entry.referenceNumber && <span className="mt-1 block text-xs font-normal text-slate-500">Ref: {entry.referenceNumber}</span>}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{entry.vendor?.name || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.productName}{entry.variant && <span className="mt-1 block text-xs font-medium text-primary">Pack {entry.variant}</span>}{entry.batchNumber && <span className="mt-1 block text-xs text-slate-500">Batch {entry.batchNumber}</span>}{entry.expiryDate && <span className="block text-xs text-slate-500">Exp {new Date(entry.expiryDate).toLocaleDateString()}</span>}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.location?.name || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.quantity}<span className="block text-xs text-slate-500">Free {entry.freeQuantity}</span></td>
                  <td className="px-4 py-3 text-slate-600">MRP {formatCurrency(entry.mrp)}<span className="block text-xs text-slate-500">Rate {formatCurrency(entry.rate ?? entry.unitCost)} · Cost {formatCurrency(entry.unitCost)}</span><span className="block text-xs text-slate-500">Tax {entry.taxRate || 0}% ({formatCurrency(entry.taxAmount)})</span></td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{formatCurrency(entry.amount ?? entry.total)}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(entry.purchaseDate).toLocaleDateString()}<span className="mt-1 block text-xs">{entry.paymentStatus || "Pending"} · {formatCurrency(Math.max(0, entry.total - (entry.paidAmount || 0)))} due</span></td>
                  <td className="px-4 py-3"><div className="flex gap-1"><button type="button" onClick={() => editEntry(entry)} title="Edit purchase" className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => deleteEntry(entry)} title="Delete purchase" className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div></td>
                </tr>
              ))}</tbody>
            </table>
            {!filteredEntries.length && <p className="px-4 py-12 text-center text-sm text-slate-500">{entries.length ? "No purchases match this search." : "No purchase entries yet."}</p>}
          </div>
        </section>
      </div>

      <details className="mt-6 rounded-xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Stock controls</p><h2 className="mt-1 text-lg font-bold text-slate-900">Purchase adjustments</h2><p className="mt-1 text-sm text-slate-500">Open to correct stock or vendor balances with a reason.</p></div><span className="shrink-0 text-sm font-semibold text-slate-500">{adjustments.length} records</span></summary>
        <div className="border-t border-slate-200 p-5">
        <form onSubmit={saveAdjustment} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SearchableSelect label="Product" value={adjustment.product} onChange={(productId) => setAdjustment((current) => ({ ...current, product: productId }))} options={products.map((product) => ({ value: product._id, label: product.name, description: product.category }))} />
          <SearchableSelect label="Vendor (optional)" value={adjustment.vendor} onChange={(vendorId) => setAdjustment((current) => ({ ...current, vendor: vendorId }))} options={vendors.map((vendor) => ({ value: vendor._id, label: vendor.name, description: [vendor.phone, vendor.email].filter(Boolean).join(" · ") }))} />
          <input type="number" value={adjustment.stockAdjustment} onChange={updateAdjustment("stockAdjustment")} placeholder="Stock +/-" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" />
          <input type="number" step="0.01" value={adjustment.balanceAdjustment} onChange={updateAdjustment("balanceAdjustment")} placeholder="Balance +/-" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" />
          <input value={adjustment.reason} onChange={updateAdjustment("reason")} required placeholder="Reason" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" />
          <input type="date" value={adjustment.adjustmentDate} onChange={updateAdjustment("adjustmentDate")} required className="h-11 rounded-xl border border-slate-200 px-3 text-sm" />
          <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white md:col-span-2 xl:col-span-4"><Save className="h-4 w-4" />Save adjustment</button>
        </form>
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-190 text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Stock change</th><th className="px-4 py-3">Balance change</th><th className="px-4 py-3">Reason</th></tr></thead><tbody className="divide-y divide-slate-100">{adjustments.map((entry) => <tr key={entry._id}><td className="px-4 py-3 text-slate-500">{new Date(entry.adjustmentDate).toLocaleDateString()}</td><td className="px-4 py-3 font-medium text-slate-700">{entry.product?.name || "-"}</td><td className={`px-4 py-3 font-semibold ${entry.stockAdjustment < 0 ? "text-red-600" : "text-emerald-700"}`}>{entry.stockAdjustment > 0 ? "+" : ""}{entry.stockAdjustment}</td><td className={`px-4 py-3 font-semibold ${entry.balanceAdjustment < 0 ? "text-red-600" : "text-emerald-700"}`}>{entry.balanceAdjustment > 0 ? "+" : ""}{formatCurrency(entry.balanceAdjustment)}</td><td className="px-4 py-3 text-slate-600">{entry.reason}</td></tr>)}</tbody></table>{!adjustments.length && <p className="px-4 py-8 text-center text-sm text-slate-500">No adjustments recorded.</p>}</div>
        </div>
      </details>
      {variantFormOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
        <form onSubmit={createVariantForPurchase} role="dialog" aria-modal="true" aria-labelledby="purchase-variant-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <div><p className="text-xs font-bold uppercase tracking-wider text-primary">{selectedProduct?.name}</p><h2 id="purchase-variant-title" className="mt-1 text-xl font-bold text-slate-900">Add variant / pack</h2></div>
          <label className="mt-5 block text-sm font-semibold text-slate-700">Pack or variant name<input required maxLength={120} value={variantForm.name} onChange={(event) => setVariantForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Pack of 10" className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" /></label>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">SKU <span className="font-normal text-slate-400">(optional)</span><input maxLength={80} value={variantForm.sku} onChange={(event) => setVariantForm((current) => ({ ...current, sku: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" /></label><label className="text-sm font-semibold text-slate-700">Selling price <span className="font-normal text-slate-400">(optional)</span><input type="number" min="0" step="0.01" value={variantForm.price} onChange={(event) => setVariantForm((current) => ({ ...current, price: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" /></label></div>
          {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={variantSaving} onClick={() => setVariantFormOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button type="submit" disabled={variantSaving} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">{variantSaving ? "Adding..." : "Add and select"}</button></div>
        </form>
      </div>}
    </div>
  );
};

export default AdminPurchaseEntry;
