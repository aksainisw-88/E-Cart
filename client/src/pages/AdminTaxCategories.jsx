import { useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Search, Trash2, X } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";
const emptyForm = {
  appliedOn: "Both", supplyType: "Any", taxType: "GST", taxRate: "0", form: "", state: "", forVat: false,
  taxCode: "", description: "", taxRatePostingAccount: "", salesPurchasePostingAccount: "", returnsPostingAccount: "", claimsPostingAccount: "", active: true,
};
const labelClass = "block text-sm font-medium text-slate-700";
const inputClass = "mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary";

const AdminTaxCategories = () => {
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const response = await fetch(`${API_URL}/api/tax-categories`, { credentials: "include" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Unable to load tax categories.");
    setCategories(result.data || []);
  };

  useEffect(() => {
    load().catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, []);

  const filteredCategories = useMemo(() => categories.filter((category) => (
    `${category.taxCode} ${category.description} ${category.appliedOn} ${category.taxType} ${category.state}`.toLowerCase().includes(query.trim().toLowerCase())
  )), [categories, query]);

  const openNew = () => {
    setEditingId("");
    setForm(emptyForm);
    setError("");
    setFormOpen(true);
  };

  const openEdit = (category) => {
    setEditingId(category._id);
    setForm({ ...emptyForm, ...category, taxRate: String(category.taxRate ?? 0) });
    setError("");
    setFormOpen(true);
  };

  const updateField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/tax-categories${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, taxRate: Number(form.taxRate), taxCode: form.taxCode.trim().toUpperCase() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save tax category.");
      setMessage(editingId ? "Tax category updated." : "Tax category created.");
      setFormOpen(false);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (category) => {
    if (!window.confirm(`Delete tax code ${category.taxCode}?`)) return;
    setError("");
    const response = await fetch(`${API_URL}/api/tax-categories/${category._id}`, { method: "DELETE", credentials: "include" });
    const result = await response.json();
    if (!response.ok) { setError(result.message || "Unable to delete tax category."); return; }
    setMessage(`${category.taxCode} deleted.`);
    await load();
  };

  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-medium text-primary">Admin workspace</p><h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Tax categories</h1><p className="mt-2 text-sm text-slate-500">Maintain tax codes and rates, then assign them to products for automatic purchase and sales tax.</p></div>
        <button type="button" onClick={openNew} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark"><Plus className="h-4 w-4" />New tax category</button>
      </div>

      {(message || error) && <div role="status" className={`mt-5 rounded-lg px-4 py-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{error || message}<button type="button" onClick={() => { setError(""); setMessage(""); }} className="float-right"><X className="h-4 w-4" /></button></div>}

      <section className="mt-7 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h2 className="font-semibold text-slate-900">Tax code register</h2><p className="mt-1 text-xs text-slate-500">{filteredCategories.length} of {categories.length} tax categories</p></div><label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 sm:w-80"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search code, description, state..." className="w-full bg-transparent text-sm outline-none" /></label></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1900px] border-collapse text-left text-xs">
            <thead className="bg-primary text-[11px] font-semibold uppercase tracking-wide text-white"><tr>{["Applied on", "Within / interstate", "Tax type", "Tax rate", "Form", "State", "For VAT", "Tax code", "Description", "Tax rate posting A/C", "Sales / purchase posting A/C", "Returns posting A/C", "Claims posting A/C", "Status", "Actions"].map((heading) => <th key={heading} className="border-r border-white/15 px-3 py-3 last:border-r-0">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{filteredCategories.map((category) => <tr key={category._id} className="text-slate-700 hover:bg-sky-50">
              <td className="whitespace-nowrap px-3 py-3">{category.appliedOn}</td><td className="whitespace-nowrap px-3 py-3">{category.supplyType}</td><td className="whitespace-nowrap px-3 py-3">{category.taxType}</td><td className="whitespace-nowrap px-3 py-3 font-semibold tabular-nums">{Number(category.taxRate).toLocaleString()}%</td><td className="px-3 py-3">{category.form || "—"}</td><td className="px-3 py-3">{category.state || "—"}</td><td className="px-3 py-3">{category.forVat ? "Yes" : "No"}</td><td className="whitespace-nowrap px-3 py-3 font-bold text-primary">{category.taxCode}</td><td className="px-3 py-3">{category.description || "—"}</td><td className="px-3 py-3">{category.taxRatePostingAccount || "—"}</td><td className="px-3 py-3">{category.salesPurchasePostingAccount || "—"}</td><td className="px-3 py-3">{category.returnsPostingAccount || "—"}</td><td className="px-3 py-3">{category.claimsPostingAccount || "—"}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 font-semibold ${category.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{category.active ? "Active" : "Inactive"}</span></td><td className="px-3 py-2"><div className="flex gap-1"><button type="button" onClick={() => openEdit(category)} title={`Edit ${category.taxCode}`} className="rounded-md p-2 text-slate-500 hover:bg-amber-100 hover:text-amber-700"><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => remove(category)} title={`Delete ${category.taxCode}`} className="rounded-md p-2 text-slate-500 hover:bg-red-100 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div></td>
            </tr>)}</tbody>
          </table>
          {loading ? <p className="px-5 py-12 text-center text-sm text-slate-500">Loading tax categories...</p> : !filteredCategories.length && <p className="px-5 py-12 text-center text-sm text-slate-500">{categories.length ? "No tax codes match your search." : "No tax categories yet. Create a code to assign it to products."}</p>}
        </div>
      </section>

      {formOpen && <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/40 p-3 sm:p-6"><form onSubmit={save} className="mx-auto my-5 max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Tax setup</p><h2 className="mt-1 text-lg font-bold text-slate-900">{editingId ? "Edit tax category" : "New tax category"}</h2></div><button type="button" onClick={() => setFormOpen(false)} aria-label="Close tax category form" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7">
          <label className={labelClass}>Applied on<select required value={form.appliedOn} onChange={updateField("appliedOn")} className={inputClass}><option>Both</option><option>Sales</option><option>Purchase</option></select></label>
          <label className={labelClass}>Within / interstate<select value={form.supplyType} onChange={updateField("supplyType")} className={inputClass}><option>Any</option><option>Within State</option><option>Interstate</option></select></label>
          <label className={labelClass}>Tax type<select value={form.taxType} onChange={updateField("taxType")} className={inputClass}><option>GST</option><option>VAT</option><option>Other</option><option>Stock Transfer</option></select></label>
          <label className={labelClass}>Tax rate (%)<input required type="number" min="0" max="100" step="0.01" value={form.taxRate} onChange={updateField("taxRate")} className={inputClass} /></label>
          <label className={labelClass}>Tax code<input required maxLength="30" value={form.taxCode} onChange={updateField("taxCode")} placeholder="e.g. GST18" className={inputClass} /></label>
          <label className={labelClass}>Description<input maxLength="180" value={form.description} onChange={updateField("description")} placeholder="Tax category description" className={inputClass} /></label>
          <label className={labelClass}>Form<input maxLength="80" value={form.form} onChange={updateField("form")} className={inputClass} /></label>
          <label className={labelClass}>State<input maxLength="80" value={form.state} onChange={updateField("state")} placeholder="Optional state" className={inputClass} /></label>
          <label className={`${labelClass} flex items-center gap-3 rounded-lg border border-slate-200 p-3`}><input type="checkbox" checked={form.forVat} onChange={(event) => setForm((current) => ({ ...current, forVat: event.target.checked }))} className="h-4 w-4 accent-primary" /><span>For VAT</span></label>
          <label className={`${labelClass} flex items-center gap-3 rounded-lg border border-slate-200 p-3`}><input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} className="h-4 w-4 accent-primary" /><span>Active and available for products</span></label>
          <div className="border-t border-slate-100 pt-4 sm:col-span-2"><h3 className="text-sm font-semibold text-slate-900">Posting accounts</h3><p className="mt-1 text-xs text-slate-500">Optional ledger references for your accounting workflow.</p></div>
          <label className={labelClass}>Tax rate posting A/C<input value={form.taxRatePostingAccount} onChange={updateField("taxRatePostingAccount")} className={inputClass} /></label>
          <label className={labelClass}>Sales / purchase posting A/C<input value={form.salesPurchasePostingAccount} onChange={updateField("salesPurchasePostingAccount")} className={inputClass} /></label>
          <label className={labelClass}>Returns posting A/C<input value={form.returnsPostingAccount} onChange={updateField("returnsPostingAccount")} className={inputClass} /></label>
          <label className={labelClass}>Claims posting A/C<input value={form.claimsPostingAccount} onChange={updateField("claimsPostingAccount")} className={inputClass} /></label>
        </div>
        {error && <p role="alert" className="mx-5 mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-7">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-7"><button type="button" onClick={() => setFormOpen(false)} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600">Cancel</button><button type="submit" disabled={saving} className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : editingId ? "Save changes" : "Create category"}</button></div>
      </form></div>}
    </div>
  );
};

export default AdminTaxCategories;
