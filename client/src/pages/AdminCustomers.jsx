import { useEffect, useState } from "react";
import { Pencil, Plus, Search, Trash2, UserCheck, UserX, X } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";
const emptyCustomerForm = { name: "", email: "", phone: "", address: "", locality: "", pincode: "", district: "", state: "", gstin: "", panNumber: "", gender: "" };

const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyCustomerForm);
  const [saving, setSaving] = useState(false);
  const load = () =>
    fetch(`${API_URL}/api/customers`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        setCustomers(result.data);
      })
      .catch((requestError) => setError(requestError.message));
  useEffect(() => {
    load();
  }, []);
  const toggleStatus = async (customer) => {
    const status = customer.status === "Blocked" ? "Active" : "Blocked";
    const response = await fetch(
      `${API_URL}/api/customers/${customer._id}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      },
    );
    const result = await response.json();
    if (!response.ok) setError(result.message);
    else
      setCustomers((items) =>
        items.map((item) =>
          item._id === customer._id
            ? { ...item, status: result.data.status }
            : item,
        ),
      );
  };
  const openCreate = () => {
    setEditingId("");
    setForm(emptyCustomerForm);
    setFormOpen(true);
    setError("");
  };
  const openEdit = (customer) => {
    setEditingId(customer._id);
    setForm({ ...emptyCustomerForm, ...customer, email: customer.email || "" });
    setFormOpen(true);
    setError("");
  };
  const saveCustomer = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/customers${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save customer.");
      setCustomers((items) => editingId
        ? items.map((item) => item._id === editingId ? { ...item, ...result.data } : item)
        : [result.data, ...items]);
      setFormOpen(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };
  const deleteCustomer = async (customer) => {
    if (!window.confirm(`Delete ${customer.name}? Customers with transaction history cannot be deleted.`)) return;
    const response = await fetch(`${API_URL}/api/customers/${customer._id}`, { method: "DELETE", credentials: "include" });
    const result = await response.json();
    if (!response.ok) setError(result.message || "Unable to delete customer.");
    else setCustomers((items) => items.filter((item) => item._id !== customer._id));
  };
  const visible = customers.filter((customer) => {
    const matchesQuery = `${customer.name} ${customer.email}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === "All" || customer.status === status);
  });
  return (
    <div className="mx-auto max-w-375">
      <div>
        <p className="text-sm font-medium text-primary">Admin workspace</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          Customers
        </h1>
        <div className="flex flex-wrap items-end justify-between gap-4"><p className="mt-2 text-sm text-slate-500">Manage customer details, account status, and customer source.</p><button type="button" onClick={openCreate} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark"><Plus className="h-4 w-4" />Add customer</button></div>
      </div>
      {error && (
        <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <section className="mt-8 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:w-80">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search customers..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="flex items-center gap-3"><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"><option value="All">All statuses</option><option value="Active">Active</option><option value="Blocked">Blocked</option></select><span className="text-sm text-slate-500">{visible.length} customers</span></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-190 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                {[
                  "Customer",
                  "Email",
                  "Phone",
                  "Source",
                  "Orders",
                  "Total spent",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th key={heading} className="px-5 py-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((customer) => (
                <tr key={customer._id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 font-bold text-primary">
                        {customer.name.charAt(0)}
                      </span>
                      <span className="font-semibold text-slate-700">
                        {customer.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{customer.email}</td>
                  <td className="px-5 py-4 text-slate-500">{customer.phone || "-"}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${customer.customerSource === "Offline" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}>{customer.customerSource || "Online"}</span></td>
                  <td className="px-5 py-4 text-slate-500">
                    {customer.orderCount}
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-700">
                    ₹{customer.totalSpent}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${customer.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                    >
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => openEdit(customer)} title="Edit customer" aria-label={`Edit ${customer.name}`} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-primary"><Pencil className="h-4 w-4" /></button>
                      <button type="button" onClick={() => toggleStatus(customer)} title={customer.status === "Active" ? "Block customer" : "Activate customer"} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark">{customer.status === "Active" ? <><UserX className="h-4 w-4" />Block</> : <><UserCheck className="h-4 w-4" />Activate</>}</button>
                      <button type="button" onClick={() => deleteCustomer(customer)} title="Delete customer" aria-label={`Delete ${customer.name}`} className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              No customers found.
            </div>
          )}
        </div>
      </section>
      {formOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
        <form onSubmit={saveCustomer} role="dialog" aria-modal="true" aria-labelledby="customer-form-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-primary">Offline customer</p><h2 id="customer-form-title" className="mt-1 text-xl font-bold text-slate-900">{editingId ? "Edit customer" : "Add customer"}</h2></div><button type="button" onClick={() => setFormOpen(false)} aria-label="Close customer form" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Full name<input required minLength={2} maxLength={80} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" /></label>
            <label className="text-sm font-semibold text-slate-700">Phone<input type="tel" maxLength={30} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" /></label>
            <label className="text-sm font-semibold text-slate-700">Email <span className="font-normal text-slate-400">(optional)</span><input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" /></label>
            <label className="text-sm font-semibold text-slate-700">Gender<select value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary"><option value="">Not specified</option><option>Female</option><option>Male</option><option>Other</option><option>Prefer not to say</option></select></label>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Address<textarea maxLength={300} rows={2} value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} className="mt-2 w-full resize-y rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-primary" /></label>
            <label className="text-sm font-semibold text-slate-700">Locality<input maxLength={120} value={form.locality} onChange={(event) => setForm((current) => ({ ...current, locality: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" /></label>
            <label className="text-sm font-semibold text-slate-700">PIN code<input inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={form.pincode} onChange={(event) => setForm((current) => ({ ...current, pincode: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" /></label>
            <label className="text-sm font-semibold text-slate-700">District<input maxLength={120} value={form.district} onChange={(event) => setForm((current) => ({ ...current, district: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" /></label>
            <label className="text-sm font-semibold text-slate-700">State<input maxLength={120} value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" /></label>
            <label className="text-sm font-semibold text-slate-700">GST number<input maxLength={15} value={form.gstin} onChange={(event) => setForm((current) => ({ ...current, gstin: event.target.value.toUpperCase() }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm uppercase outline-none focus:border-primary" /></label>
            <label className="text-sm font-semibold text-slate-700">PAN number<input maxLength={10} value={form.panNumber} onChange={(event) => setForm((current) => ({ ...current, panNumber: event.target.value.toUpperCase() }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm uppercase outline-none focus:border-primary" /></label>
          </div>
          {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">{saving ? "Saving..." : "Save customer"}</button></div>
        </form>
      </div>}
    </div>
  );
};

export default AdminCustomers;
