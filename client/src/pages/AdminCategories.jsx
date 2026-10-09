import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Edit3, Layers3, Plus, Trash2, X } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";
const emptyCategory = { name: "", parentCategoryId: "" };

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyCategory);
  const [editingId, setEditingId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadCategories = async () => {
    const response = await fetch(`${API_URL}/api/products/categories`, { credentials: "include" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Unable to load categories.");
    setCategories(result.data || []);
  };

  useEffect(() => {
    fetch(`${API_URL}/api/products/categories`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load categories.");
        return result.data || [];
      })
      .then(setCategories)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const openCreate = (parent = null) => {
    setEditingId("");
    setForm({ ...emptyCategory, parentCategoryId: parent?._id || "" });
    setError("");
    setFormOpen(true);
  };

  const openEdit = (category) => {
    setEditingId(category._id);
    setForm({ name: category.name, parentCategoryId: "" });
    setError("");
    setFormOpen(true);
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/api/products/categories${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editingId ? { name: form.name } : { name: form.name, parentCategoryId: form.parentCategoryId || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save category.");
      await loadCategories();
      setFormOpen(false);
      setMessage(editingId ? "Category updated." : form.parentCategoryId ? "Subcategory created." : "Category created.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (category) => {
    const categoryType = category.parentCategory ? "subcategory" : "category";
    if (!window.confirm(`Delete ${categoryType} “${category.name}”?`)) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/api/products/categories/${category._id}`, { method: "DELETE", credentials: "include" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to delete category.");
      setCategories((current) => current.filter((item) => item._id !== category._id));
      setMessage(`${categoryType[0].toUpperCase()}${categoryType.slice(1)} deleted.`);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const rootCategories = categories.filter((category) => !category.parentCategory);
  const childrenByParent = new Map();
  categories.filter((category) => category.parentCategory).forEach((category) => {
    const parentId = category.parentCategory._id || category.parentCategory;
    childrenByParent.set(parentId, [...(childrenByParent.get(parentId) || []), category]);
  });

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Admin workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Categories</h1>
          <p className="mt-2 text-sm text-slate-500">Organize products into categories and subcategories.</p>
        </div>
        <button type="button" onClick={() => openCreate()} className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"><Plus className="h-4 w-4" />Add category</button>
      </div>

      {(error || message) && <p role="status" className={`mt-5 rounded-lg p-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{error || message}</p>}

      <section className="mt-7 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)_130px_120px] border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <span>Category</span><span>Type</span><span className="text-right">Actions</span>
        </div>
        {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading categories...</p> : rootCategories.length ? (
          <div className="divide-y divide-slate-100">
            {rootCategories.map((category) => {
              const children = childrenByParent.get(category._id) || [];
              return <div key={category._id}>
                <div className="grid grid-cols-[minmax(0,1fr)_130px_120px] items-center gap-2 px-5 py-3.5">
                  <div className="flex min-w-0 items-center gap-2"><ChevronDown className="h-4 w-4 shrink-0 text-slate-400" /><Layers3 className="h-4 w-4 shrink-0 text-primary" /><span className="truncate text-sm font-semibold text-slate-800">{category.name}</span>{category.builtInKey && <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 sm:inline">Built-in</span>}</div>
                  <span className="text-xs text-slate-500">Main category</span>
                  <div className="flex justify-end gap-1">
                    <button type="button" onClick={() => openCreate(category)} aria-label={`Add subcategory under ${category.name}`} title="Add subcategory" className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-primary"><Plus className="h-4 w-4" /></button>
                    <button type="button" onClick={() => openEdit(category)} aria-label={`Edit ${category.name}`} title="Edit category" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Edit3 className="h-4 w-4" /></button>
                    <button type="button" onClick={() => deleteCategory(category)} aria-label={`Delete ${category.name}`} title="Delete category" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                {children.map((child) => <div key={child._id} className="grid grid-cols-[minmax(0,1fr)_130px_120px] items-center gap-2 border-t border-slate-100/80 bg-slate-50/60 px-5 py-3">
                  <div className="flex min-w-0 items-center gap-2 pl-6"><ChevronRight className="h-4 w-4 shrink-0 text-slate-300" /><span className="truncate text-sm text-slate-700">{child.name}</span></div>
                  <span className="text-xs text-slate-500">Subcategory</span>
                  <div className="flex justify-end gap-1">
                    <button type="button" onClick={() => openEdit(child)} aria-label={`Edit ${child.name}`} title="Edit subcategory" className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700"><Edit3 className="h-4 w-4" /></button>
                    <button type="button" onClick={() => deleteCategory(child)} aria-label={`Delete ${child.name}`} title="Delete subcategory" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>)}
              </div>;
            })}
          </div>
        ) : <div className="px-6 py-16 text-center"><Layers3 className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-800">No categories yet</p><p className="mt-1 text-sm text-slate-500">Create a category to organize your product catalogue.</p></div>}
      </section>

      {formOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
        <form onSubmit={saveCategory} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="text-xl font-bold text-slate-900">{editingId ? "Edit category" : form.parentCategoryId ? "Add subcategory" : "Add category"}</h2><p className="mt-1 text-sm text-slate-500">Product assignments update when a category is renamed.</p></div>
            <button type="button" onClick={() => setFormOpen(false)} aria-label="Close category form" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
          <label className="mt-5 block text-sm font-medium text-slate-700">Category name<input autoFocus required minLength={2} maxLength={80} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
          {!editingId && <label className="mt-4 block text-sm font-medium text-slate-700">Parent category <span className="font-normal text-slate-400">(optional)</span><select value={form.parentCategoryId} onChange={(event) => setForm((current) => ({ ...current, parentCategoryId: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-primary"><option value="">Main category</option>{rootCategories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>}
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-5"><button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">{saving ? "Saving..." : editingId ? "Save changes" : "Create category"}</button></div>
        </form>
      </div>}
    </div>
  );
};

export default AdminCategories;