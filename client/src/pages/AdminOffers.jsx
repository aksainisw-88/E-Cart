import { useEffect, useState } from "react";
import { Edit3, Plus, Tag, Trash2, X } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";
const empty = {
  title: "",
  description: "",
  code: "",
  offerType: "discount",
  discountType: "percentage",
  discountValue: "10",
  buyProduct: "",
  freeProduct: "",
  buyQuantity: "1",
  freeQuantity: "1",
  minOrder: "0",
  startsAt: "2026-09-09",
  endsAt: "2026-12-31",
  status: "Active",
};

const schemeLabels = {
  buy_one_get_one: "Buy 1 Get 1",
  buy_product_get_product: "Buy product, get another free",
};

const AdminOffers = () => {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = () => Promise.all([
    fetch(`${API_URL}/api/offers`, { credentials: "include" }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      return result.data;
    }),
    fetch(`${API_URL}/api/products`, { credentials: "include" }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      return result.data;
    }),
  ]).then(([offerData, productData]) => {
    setOffers(offerData);
    setProducts(productData);
  }).catch((requestError) => setError(requestError.message));

  useEffect(() => { load(); }, []);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const openCreate = () => { setEditingId(null); setForm(empty); setError(""); setOpen(true); };
  const edit = (offer) => {
    setEditingId(offer._id);
    setForm({
      ...empty,
      ...offer,
      offerType: offer.offerType || "discount",
      buyProduct: offer.buyProduct?._id || offer.buyProduct || "",
      freeProduct: offer.freeProduct?._id || offer.freeProduct || "",
      startsAt: offer.startsAt.slice(0, 10),
      endsAt: offer.endsAt.slice(0, 10),
    });
    setError("");
    setOpen(true);
  };
  const save = async (event) => {
    event.preventDefault();
    setError("");
    const response = await fetch(`${API_URL}/api/offers${editingId ? `/${editingId}` : ""}`, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    const result = await response.json();
    if (!response.ok) { setError(result.message || "Unable to save offer."); return; }
    setMessage(editingId ? "Offer updated." : "Offer created.");
    setOpen(false);
    setEditingId(null);
    setForm(empty);
    load();
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this offer?")) return;
    await fetch(`${API_URL}/api/offers/${id}`, { method: "DELETE", credentials: "include" });
    load();
  };

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Marketing workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Offers & promotions</h1>
          <p className="mt-2 text-sm text-slate-500">Create discounts and product schemes for your customers.</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" />Create offer
        </button>
      </div>
      {(error || message) && <p className={`mt-5 rounded-lg p-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-700"}`}>{error || message}</p>}
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {offers.map((offer) => (
          <article key={offer._id} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-primary"><Tag className="h-5 w-5" /></span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${offer.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{offer.status}</span>
            </div>
            <h2 className="mt-5 font-bold text-slate-900">{offer.title}</h2>
            <p className="mt-2 min-h-10 text-sm text-slate-500">{offer.description}</p>
            <p className="mt-4 text-2xl font-bold text-primary">
              {offer.offerType === "discount" ? (offer.discountType === "percentage" ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`) : schemeLabels[offer.offerType]}
            </p>
            {offer.code && <p className="mt-2 inline-block rounded bg-slate-100 px-2 py-1 text-xs font-bold tracking-wider text-slate-600">{offer.code}</p>}
            <p className="mt-4 text-xs text-slate-400">Valid until {new Date(offer.endsAt).toLocaleDateString()}</p>
            <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => edit(offer)} aria-label={`Edit ${offer.title}`} className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-primary"><Edit3 className="h-4 w-4" /></button>
              <button type="button" onClick={() => remove(offer._id)} aria-label={`Delete ${offer.title}`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          </article>
        ))}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={save} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8">
            <div className="flex items-start justify-between">
              <div><h2 className="text-xl font-bold text-slate-900">{editingId ? "Edit offer" : "Create offer"}</h2><p className="mt-1 text-sm text-slate-500">Configure a discount or a product scheme.</p></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close offer form" className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">Title<input required value={form.title} onChange={update("title")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">Description<textarea required value={form.description} onChange={update("description")} rows="2" className="mt-2 w-full rounded-lg border border-slate-200 p-3 outline-none focus:border-primary" /></label>
              <label className="text-sm font-medium text-slate-700">Offer type<select value={form.offerType} onChange={update("offerType")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-primary"><option value="discount">Percentage or flat discount</option><option value="buy_one_get_one">Buy 1 Get 1</option><option value="buy_product_get_product">Buy product, get another free</option></select></label>
              <label className="text-sm font-medium text-slate-700">Promo code<input required={form.offerType !== "discount"} value={form.code} onChange={update("code")} placeholder="e.g. BOGO2026" className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 uppercase outline-none focus:border-primary" /></label>
              {form.offerType === "discount" ? <>
                <label className="text-sm font-medium text-slate-700">Discount type<select value={form.discountType} onChange={update("discountType")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-primary"><option value="percentage">Percentage</option><option value="flat">Flat amount</option></select></label>
                <label className="text-sm font-medium text-slate-700">Discount value<input required type="number" min="0" value={form.discountValue} onChange={update("discountValue")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
              </> : <>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Buy product<select required value={form.buyProduct} onChange={update("buyProduct")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-primary"><option value="">Select a product</option>{products.map((product) => <option key={product._id} value={product._id}>{product.name} · ₹{product.price}</option>)}</select></label>
                {form.offerType === "buy_product_get_product" && <label className="text-sm font-medium text-slate-700 sm:col-span-2">Free product<select required value={form.freeProduct} onChange={update("freeProduct")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-primary"><option value="">Select a product</option>{products.map((product) => <option key={product._id} value={product._id}>{product.name} · ₹{product.price}</option>)}</select></label>}
                <label className="text-sm font-medium text-slate-700">Buy quantity<input required type="number" min="1" value={form.buyQuantity} onChange={update("buyQuantity")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
                <label className="text-sm font-medium text-slate-700">Free quantity<input required type="number" min="1" value={form.freeQuantity} onChange={update("freeQuantity")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
              </>}
              <label className="text-sm font-medium text-slate-700">Minimum order<input required type="number" min="0" value={form.minOrder} onChange={update("minOrder")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
              <label className="text-sm font-medium text-slate-700">Status<select value={form.status} onChange={update("status")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-primary"><option>Active</option><option>Draft</option><option>Expired</option></select></label>
              <label className="text-sm font-medium text-slate-700">Starts at<input required type="date" value={form.startsAt} onChange={update("startsAt")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
              <label className="text-sm font-medium text-slate-700">Ends at<input required type="date" value={form.endsAt} onChange={update("endsAt")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
            </div>
            <div className="mt-7 flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button><button type="submit" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white">{editingId ? "Update offer" : "Create offer"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminOffers;
