import { useEffect, useMemo, useState } from "react";
import { Boxes, Check, MapPin, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";

const apiUrl = import.meta.env.VITE_API_URL || "";

const locationIdOf = (location) => String(location?._id || location || "");

const normalizeStock = (stock = [], locations = []) => {
  const entries = new Map(stock.map((item) => [locationIdOf(item.locationId || item.location), Number(item.quantity) || 0]));
  locations.forEach((location) => {
    if (!entries.has(location._id)) entries.set(location._id, 0);
  });
  return [...entries].filter(([locationId]) => locationId).map(([locationId, quantity]) => ({ locationId, quantity }));
};

const buildDraft = (product, locations) => {
  let locationStock = normalizeStock(product.locationStock, locations);
  if (!product.locationStock?.length && Number(product.stock) > 0 && locations.length) {
    const defaultLocation = locations.find((location) => location.isDefault) || locations[0];
    locationStock = locationStock.map((item) => ({
      ...item,
      quantity: item.locationId === defaultLocation._id ? Number(product.stock) : item.quantity,
    }));
  }
  return {
    ...product,
    locationStock,
    variants: (product.variants || []).map((variant) => ({
      ...variant,
      price: variant.price ?? "",
      locationStock: normalizeStock(variant.locationStock, locations),
    })),
  };
};

const stockAt = (stock, locationId) => stock.find((item) => item.locationId === locationId)?.quantity ?? 0;

const updateStock = (stock, locationId, quantity) => {
  const existing = stock.find((item) => item.locationId === locationId);
  if (existing) return stock.map((item) => item.locationId === locationId ? { ...item, quantity } : item);
  return [...stock, { locationId, quantity }];
};

const AdminInventory = () => {
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [editingStockProductId, setEditingStockProductId] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [savingAll, setSavingAll] = useState(false);
  const [dirtyProductIds, setDirtyProductIds] = useState(() => new Set());
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`${apiUrl}/api/inventory`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load inventory.");
        return result.data;
      })
      .then(({ locations: availableLocations, products: availableProducts }) => {
        if (!active) return;
        const branchList = availableLocations || [];
        const productList = availableProducts || [];
        const initialLocation = branchList.find((location) => location.isDefault) || branchList[0];
        setLocations(branchList);
        setProducts(productList);
        setSelectedLocationId(initialLocation?._id || "");
        setDrafts(Object.fromEntries(productList.map((product) => [product._id, buildDraft(product, branchList)])));
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visibleProducts = useMemo(() => products.filter((product) =>
    `${product.name} ${product.brand || ""} ${product.category}`.toLowerCase().includes(query.trim().toLowerCase()),
  ), [products, query]);
  const editingProduct = products.find((product) => product._id === editingProductId);

  const updateDraft = (productId, update) => {
    setDrafts((current) => ({ ...current, [productId]: update(current[productId]) }));
    setDirtyProductIds((current) => new Set(current).add(productId));
    setError("");
    setMessage("");
  };

  const saveInventory = async (productId) => {
    const draft = drafts[productId];
    if (!draft) return false;
    setSavingId(productId);
    setError("");
    setMessage("");
    const payload = {
      locationStock: draft.locationStock.map(({ locationId, quantity }) => ({ locationId, quantity: Number(quantity) || 0 })),
      variants: draft.variants.map((variant) => ({
        name: variant.name.trim(),
        sku: variant.sku || "",
        ...(variant.price === "" || variant.price == null ? {} : { price: Number(variant.price) }),
        locationStock: variant.locationStock.map(({ locationId, quantity }) => ({ locationId, quantity: Number(quantity) || 0 })),
      })),
    };
    try {
      const response = await fetch(`${apiUrl}/api/inventory/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save inventory.");
      const updatedProduct = result.data;
      setProducts((current) => current.map((product) => product._id === productId ? updatedProduct : product));
      setDrafts((current) => ({ ...current, [productId]: buildDraft(updatedProduct, locations) }));
      setDirtyProductIds((current) => {
        const next = new Set(current);
        next.delete(productId);
        return next;
      });
      setMessage(`Inventory saved for ${updatedProduct.name}.`);
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setSavingId("");
    }
  };

  const saveAllInventory = async () => {
    const productIds = [...dirtyProductIds];
    if (!productIds.length) return;
    setSavingAll(true);
    const results = await Promise.all(productIds.map(saveInventory));
    if (results.every(Boolean)) {
      setMessage(`Inventory saved for ${productIds.length} ${productIds.length === 1 ? "product" : "products"}.`);
    } else {
      setError("Some inventory changes could not be saved. Review the products and try again.");
    }
    setSavingAll(false);
  };

  const saveStockEdit = async (productId) => {
    if (await saveInventory(productId)) setEditingStockProductId(null);
  };

  const cancelStockEdit = (product) => {
    const originalDraft = buildDraft(product, locations);
    setDrafts((current) => ({
      ...current,
      [product._id]: { ...current[product._id], locationStock: originalDraft.locationStock },
    }));
    setDirtyProductIds((current) => {
      const next = new Set(current);
      if (JSON.stringify(drafts[product._id]?.variants) === JSON.stringify(originalDraft.variants)) next.delete(product._id);
      return next;
    });
    setEditingStockProductId(null);
  };

  const addVariant = () => {
    updateDraft(editingProductId, (draft) => ({
      ...draft,
      variants: [...draft.variants, {
        name: "",
        sku: "",
        price: "",
        locationStock: locations.map((location) => ({ locationId: location._id, quantity: 0 })),
      }],
    }));
  };

  const updateVariant = (index, field, value) => {
    updateDraft(editingProductId, (draft) => ({
      ...draft,
      variants: draft.variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, [field]: value } : variant),
    }));
  };

  const updateVariantStock = (index, locationId, quantity) => {
    updateDraft(editingProductId, (draft) => ({
      ...draft,
      variants: draft.variants.map((variant, variantIndex) => variantIndex === index
        ? { ...variant, locationStock: updateStock(variant.locationStock, locationId, quantity) }
        : variant),
    }));
  };

  const removeVariant = (index) => updateDraft(editingProductId, (draft) => ({
    ...draft,
    variants: draft.variants.filter((_, variantIndex) => variantIndex !== index),
  }));

  return (
    <div className="mx-auto max-w-375">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Admin workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Inventory by location</h1>
          <p className="mt-2 text-sm text-slate-500">Maintain product and variant quantities for each store branch.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1.5 flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Stock location</span>
            <select value={selectedLocationId} onChange={(event) => setSelectedLocationId(event.target.value)} disabled={!locations.length || savingAll || editingStockProductId !== null} className="h-11 min-w-56 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary disabled:opacity-60">
              {locations.map((location) => <option key={location._id} value={location._id}>{location.name}{location.active ? "" : " (inactive)"}</option>)}
            </select>
          </label>
          <button type="button" onClick={saveAllInventory} disabled={!dirtyProductIds.size || savingAll || editingStockProductId !== null} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50">
            <Save className="h-4 w-4" />{savingAll ? "Saving..." : `Save changes${dirtyProductIds.size ? ` (${dirtyProductIds.size})` : ""}`}
          </button>
        </div>
      </div>

      {(error || message) && <div role={error ? "alert" : "status"} className={`mt-6 rounded-lg p-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>{error || message}</div>}

      <section className="mt-7 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Products</h2>
            <p className="mt-1 text-xs text-slate-500">Base stock updates the product total used by the existing catalogue.</p>
          </div>
          <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 sm:w-72">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </label>
        </div>

        {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading inventory...</p> : !locations.length ? (
          <p className="p-8 text-center text-sm text-slate-500">Add an active store location before managing inventory.</p>
        ) : !visibleProducts.length ? (
          <p className="p-8 text-center text-sm text-slate-500">No products match this search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-195 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Unit</th>
                  <th className="w-44 px-5 py-3 font-semibold">{locations.find((location) => location._id === selectedLocationId)?.name || "Branch"} stock</th>
                  <th className="px-5 py-3 font-semibold">Variants</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleProducts.map((product) => {
                  const draft = drafts[product._id];
                  const totalStock = draft?.locationStock.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;
                  return (
                    <tr key={product._id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{product.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{product.brand || "No brand"} · Total {totalStock} {product.unit || "unit"}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{product.category}</td>
                      <td className="px-5 py-4 text-slate-600">{product.unit || "unit"}</td>
                      <td className="px-5 py-4">
                        {editingStockProductId === product._id ? (
                          <div className="flex items-center gap-2"><input aria-label={`${product.name} stock in ${product.unit || "unit"} at selected location`} type="number" min="0" step="1" value={stockAt(draft?.locationStock || [], selectedLocationId)} disabled={savingId === product._id || savingAll} onChange={(event) => updateDraft(product._id, (current) => ({ ...current, locationStock: updateStock(current.locationStock, selectedLocationId, event.target.value) }))} className="h-10 w-28 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary disabled:opacity-60" /><span className="text-xs text-slate-500">{product.unit || "unit"}</span></div>
                        ) : <span className="font-medium text-slate-700">{stockAt(draft?.locationStock || [], selectedLocationId)} <span className="text-xs font-normal text-slate-500">{product.unit || "unit"}</span></span>}
                      </td>
                      <td className="px-5 py-4">
                        <button type="button" disabled={savingAll} onClick={() => setEditingProductId(product._id)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline disabled:cursor-wait disabled:opacity-50">
                          <Plus className="h-4 w-4" />Add{draft?.variants.length ? <span className="text-xs text-slate-500">({draft.variants.length})</span> : null}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {editingStockProductId === product._id ? (
                          <div className="flex justify-end gap-2"><button type="button" onClick={() => cancelStockEdit(product)} disabled={savingId === product._id || savingAll} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button><button type="button" onClick={() => saveStockEdit(product._id)} disabled={savingId === product._id || savingAll || !dirtyProductIds.has(product._id)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-3.5 w-3.5" />{savingId === product._id ? "Saving..." : "Save"}</button></div>
                        ) : <button type="button" onClick={() => setEditingStockProductId(product._id)} disabled={savingAll || editingStockProductId !== null} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"><Pencil className="h-3.5 w-3.5" />Edit</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="variant-dialog-title" className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase text-primary">Product variants</p>
                <h2 id="variant-dialog-title" className="mt-1 text-xl font-bold text-slate-900">{editingProduct.name}</h2>
                <p className="mt-1 text-sm text-slate-500">Unit: {editingProduct.unit || "unit"}. Set a name, SKU, optional price, and stock for each branch.</p>
              </div>
              <button type="button" onClick={() => setEditingProductId(null)} aria-label="Close variants" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </header>
            <div className="max-h-[calc(90vh-145px)] overflow-auto p-5 sm:p-6">
              <div className="flex justify-end">
                <button type="button" onClick={addVariant} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary"><Plus className="h-4 w-4" />Add variant</button>
              </div>
              {drafts[editingProductId]?.variants.length ? (
                <div className="mt-4 space-y-4">
                  {drafts[editingProductId].variants.map((variant, index) => (
                    <article key={variant._id || `${editingProductId}-${index}`} className="rounded-lg border border-slate-200 p-4">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <label className="text-xs font-semibold text-slate-600">Variant name<input required value={variant.name} onChange={(event) => updateVariant(index, "name", event.target.value)} placeholder="500 ml" className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-900 outline-none focus:border-primary" /></label>
                        <label className="text-xs font-semibold text-slate-600">SKU<input value={variant.sku || ""} onChange={(event) => updateVariant(index, "sku", event.target.value)} placeholder="Optional SKU" className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-900 outline-none focus:border-primary" /></label>
                        <label className="text-xs font-semibold text-slate-600">Price (optional)<input type="number" min="0" step="0.01" value={variant.price ?? ""} onChange={(event) => updateVariant(index, "price", event.target.value)} placeholder={String(editingProduct.price)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-900 outline-none focus:border-primary" /></label>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Branch quantities</h3>
                        <button type="button" onClick={() => removeVariant(index)} aria-label={`Remove ${variant.name || "variant"}`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {locations.map((location) => (
                          <label key={location._id} className="text-xs font-medium text-slate-600">{location.name}<input aria-label={`${variant.name || "Variant"} stock at ${location.name}`} type="number" min="0" step="1" value={stockAt(variant.locationStock, location._id)} onChange={(event) => updateVariantStock(index, location._id, event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-primary" /></label>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              ) : <div className="mt-5 rounded-lg bg-slate-50 p-8 text-center"><Boxes className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-700">No variants yet</p><p className="mt-1 text-xs text-slate-500">Add a size, pack, or other option to track its branch stock.</p></div>}
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-200 p-4 sm:px-6">
              <button type="button" onClick={() => setEditingProductId(null)} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button>
              <button type="button" disabled={savingId === editingProductId} onClick={async () => { if (await saveInventory(editingProductId)) setEditingProductId(null); }} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60"><Check className="h-4 w-4" />{savingId === editingProductId ? "Saving..." : "Save inventory"}</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminInventory;