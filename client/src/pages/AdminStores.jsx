import { useEffect, useState } from "react";
import { Building2, Edit3, Plus, Store, Trash2, X } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";
const emptyStore = { name: "", description: "", phone: "", email: "", address: "", city: "", pincode: "", active: true };

const AdminStores = () => {
  const [stores, setStores] = useState([]);
  const [form, setForm] = useState(emptyStore);
  const [editingId, setEditingId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadStores = async () => {
    const response = await fetch(`${API_URL}/api/stores/manage`, { credentials: "include" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Unable to load store locations.");
    setStores(result.data || []);
  };

  useEffect(() => {
    fetch(`${API_URL}/api/stores/manage`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load store locations.");
        return result.data || [];
      })
      .then(setStores)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setEditingId("");
    setForm(emptyStore);
    setError("");
    setFormOpen(true);
  };

  const openEdit = (store) => {
    setEditingId(store._id);
    setForm({ ...emptyStore, ...store });
    setError("");
    setFormOpen(true);
  };

  const updateField = (field) => (event) => setForm((current) => ({
    ...current,
    [field]: event.target.type === "checkbox" ? event.target.checked : event.target.value,
  }));

  const saveStore = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/api/stores${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save store location.");
      await loadStores();
      setFormOpen(false);
      setMessage(editingId ? "Store location updated." : "Store location added.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteStore = async (store) => {
    if (!window.confirm(`Delete ${store.name}?`)) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/api/stores/${store._id}`, { method: "DELETE", credentials: "include" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to delete store location.");
      setStores((current) => current.filter((item) => item._id !== store._id));
      setMessage("Store location deleted.");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Admin workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Store locations</h1>
          <p className="mt-2 text-sm text-slate-500">Manage the branches available to business customers when placing orders.</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">
          <Plus className="h-4 w-4" />Add location
        </button>
      </div>

      {(error || message) && <p role="status" className={`mt-5 rounded-lg p-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{error || message}</p>}

      <section className="mt-7 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading store locations...</p> : stores.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>{["Store", "Location", "Contact", "Status", "Actions"].map((heading) => <th key={heading} className="px-5 py-3 font-semibold">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stores.map((store) => (
                  <tr key={store._id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-primary"><Store className="h-5 w-5" /></span>
                        <div><p className="font-semibold text-slate-800">{store.name}</p>{store.isDefault && <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">Default</span>}</div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{store.address}, {store.city}{store.pincode ? ` · ${store.pincode}` : ""}</td>
                    <td className="px-5 py-4 text-slate-500">{store.phone || store.email || "-"}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${store.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{store.active ? "Active" : "Inactive"}</span></td>
                    <td className="px-5 py-4"><div className="flex gap-2">
                      <button type="button" onClick={() => openEdit(store)} aria-label={`Edit ${store.name}`} className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-primary"><Edit3 className="h-4 w-4" /></button>
                      <button type="button" onClick={() => deleteStore(store)} disabled={store.isDefault} aria-label={`Delete ${store.name}`} title={store.isDefault ? "The default store cannot be deleted" : "Delete store"} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="px-6 py-16 text-center"><Building2 className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-800">No locations yet</p><p className="mt-1 text-sm text-slate-500">Add a branch for B2B customers to choose at checkout.</p></div>}
      </section>

      {formOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
        <form onSubmit={saveStore} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="text-xl font-bold text-slate-900">{editingId ? "Edit store location" : "Add store location"}</h2><p className="mt-1 text-sm text-slate-500">Active locations are available to B2B customers.</p></div>
            <button type="button" onClick={() => setFormOpen(false)} aria-label="Close store form" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">Store name<input required minLength="2" maxLength="100" value={form.name} onChange={updateField("name")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">Address<input required value={form.address} onChange={updateField("address")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
            <label className="text-sm font-medium text-slate-700">City<input required value={form.city} onChange={updateField("city")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
            <label className="text-sm font-medium text-slate-700">PIN code<input pattern="[0-9]{6}" value={form.pincode} onChange={updateField("pincode")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
            <label className="text-sm font-medium text-slate-700">Phone<input value={form.phone} onChange={updateField("phone")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
            <label className="text-sm font-medium text-slate-700">Email<input type="email" value={form.email} onChange={updateField("email")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">Description<input maxLength="300" value={form.description} onChange={updateField("description")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2"><input type="checkbox" checked={form.active} onChange={updateField("active")} className="h-4 w-4 accent-emerald-700" />Available to business customers</label>
          </div>
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-5">
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">{saving ? "Saving..." : editingId ? "Save changes" : "Add location"}</button>
          </div>
        </form>
      </div>}
    </div>
  );
};

export default AdminStores;