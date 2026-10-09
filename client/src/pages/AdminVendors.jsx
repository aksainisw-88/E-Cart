import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

const apiUrl = import.meta.env.VITE_API_URL || "";
const emptyVendor = { name: "", phone: "", email: "", address: "" };
const emptyPayment = { purchase: "", amount: "", paymentMode: "Cash", paymentDate: new Date().toISOString().slice(0, 10), notes: "" };
const formatCurrency = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);

const AdminVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [form, setForm] = useState(emptyVendor);
  const [payment, setPayment] = useState(emptyPayment);
  const [editingId, setEditingId] = useState(null);
  const [paymentVendor, setPaymentVendor] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const [vendorResponse, purchaseResponse] = await Promise.all([
      fetch(`${apiUrl}/api/vendors`, { credentials: "include" }),
      fetch(`${apiUrl}/api/purchases`, { credentials: "include" }),
    ]);
    const [vendorResult, purchaseResult] = await Promise.all([vendorResponse.json(), purchaseResponse.json()]);
    if (!vendorResponse.ok || !purchaseResponse.ok) throw new Error(vendorResult.message || purchaseResult.message || "Unable to load vendor data.");
    setVendors(vendorResult.data || []);
    setPurchases(purchaseResult.data || []);
  };

  useEffect(() => { load().catch((requestError) => setError(requestError.message)); }, []);

  const update = (setter, field) => (event) => setter((current) => ({ ...current, [field]: event.target.value }));
  const vendorPurchases = paymentVendor ? purchases.filter((purchase) => (purchase.vendor?._id || purchase.vendor) === paymentVendor._id && Number(purchase.total) > Number(purchase.paidAmount || 0)) : [];
  const selectedPurchase = vendorPurchases.find((purchase) => purchase._id === payment.purchase);
  const selectedBalance = selectedPurchase ? Math.max(0, Number(selectedPurchase.total) - Number(selectedPurchase.paidAmount || 0)) : Number(paymentVendor?.pendingAmount || 0);
  const noBalance = Number(paymentVendor?.pendingAmount || 0) <= 0;

  const saveVendor = async (event) => {
    event.preventDefault();
    const response = await fetch(`${apiUrl}/api/vendors${editingId ? `/${editingId}` : ""}`, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(form) });
    const result = await response.json();
    if (!response.ok) { setError(result.message || "Unable to save vendor."); return; }
    setMessage(editingId ? "Vendor updated." : "Vendor created."); setForm(emptyVendor); setEditingId(null); await load();
  };

  const deleteVendor = async (vendor) => {
    if (!window.confirm(`Delete ${vendor.name}?`)) return;
    const response = await fetch(`${apiUrl}/api/vendors/${vendor._id}`, { method: "DELETE", credentials: "include" });
    const result = await response.json();
    if (!response.ok) { setError(result.message || "Unable to delete vendor."); return; }
    setMessage("Vendor deleted."); await load();
  };

  const openPayment = (vendor) => {
    if (Number(vendor.pendingAmount) <= 0) return;
    setPayment(emptyPayment);
    setPaymentVendor(vendor);
  };

  const selectPurchase = (event) => {
    const purchase = vendorPurchases.find((entry) => entry._id === event.target.value);
    setPayment((current) => ({ ...current, purchase: event.target.value, amount: purchase ? Math.max(0, purchase.total - (purchase.paidAmount || 0)) : "" }));
  };

  const savePayment = async (event) => {
    event.preventDefault();
    if (!paymentVendor || noBalance) return;
    const response = await fetch(`${apiUrl}/api/vendors/${paymentVendor._id}/payments`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payment) });
    const result = await response.json();
    if (!response.ok) { setError(result.message || "Unable to save vendor payment."); return; }
    setMessage(`Payment recorded. Remaining balance: ${formatCurrency(result.vendor.pendingAmount)}.`); setPaymentVendor(null); setPayment(emptyPayment); await load();
  };

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-primary">Inventory management</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Vendors</h1><p className="mt-2 text-sm text-slate-500">Manage suppliers and settle their pending purchase balances.</p></div><button type="button" onClick={() => { setEditingId(null); setForm(emptyVendor); }} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" />New vendor</button></div>
      {(message || error) && <div className={`mt-5 rounded-xl p-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{error || message}<button type="button" onClick={() => { setError(""); setMessage(""); }} className="float-right"><X className="h-4 w-4" /></button></div>}
      <div className="mt-8 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <form onSubmit={saveVendor} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold text-slate-900">{editingId ? "Edit vendor" : "Create vendor"}</h2><div className="mt-5 space-y-4"><label className="block text-sm font-medium text-slate-700">Vendor name<input required value={form.name} onChange={update(setForm, "name")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label><label className="block text-sm font-medium text-slate-700">Phone<input value={form.phone} onChange={update(setForm, "phone")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label><label className="block text-sm font-medium text-slate-700">Email<input type="email" value={form.email} onChange={update(setForm, "email")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label><label className="block text-sm font-medium text-slate-700">Address<textarea value={form.address} onChange={update(setForm, "address")} rows="3" className="mt-2 w-full rounded-xl border border-slate-200 p-3" /></label><div className="flex gap-2"><button type="submit" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-white"><Check className="h-4 w-4" />{editingId ? "Update vendor" : "Create vendor"}</button><button type="button" onClick={() => { setEditingId(null); setForm(emptyVendor); }} className="rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-600">Cancel</button></div></div></form>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold text-slate-900">Vendor balances</h2><div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-400"><tr><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Pending amount</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{vendors.map((vendor) => <tr key={vendor._id} className="hover:bg-slate-50"><td className="px-4 py-4 font-semibold text-slate-700">{vendor.name}</td><td className="px-4 py-4 text-slate-500">{vendor.phone || vendor.email || "-"}</td><td className="px-4 py-4 font-semibold text-amber-700">{formatCurrency(vendor.pendingAmount)}</td><td className="px-4 py-4"><div className="flex items-center gap-1"><button type="button" onClick={() => { setEditingId(vendor._id); setForm({ name: vendor.name, phone: vendor.phone, email: vendor.email, address: vendor.address }); }} title="Edit vendor" className="rounded-lg p-2 text-slate-500 hover:bg-teal-50 hover:text-primary"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => openPayment(vendor)} disabled={Number(vendor.pendingAmount) <= 0} className="rounded-lg px-3 py-2 text-xs font-semibold text-primary hover:bg-pink-50 disabled:cursor-not-allowed disabled:text-slate-300">{Number(vendor.pendingAmount) <= 0 ? "No payment due" : "Add payment"}</button><button type="button" onClick={() => deleteVendor(vendor)} title="Delete vendor" className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table>{!vendors.length && <p className="px-4 py-12 text-center text-sm text-slate-500">No vendors created yet.</p>}</div></section>
      </div>
      {paymentVendor && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><form onSubmit={savePayment} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between"><div><p className="text-sm text-slate-500">Vendor payment</p><h2 className="text-xl font-bold text-slate-900">{paymentVendor.name}</h2><p className="mt-1 text-sm text-amber-700">Pending: {formatCurrency(paymentVendor.pendingAmount)}</p></div><button type="button" onClick={() => setPaymentVendor(null)}><X className="h-5 w-5 text-slate-400" /></button></div><div className="mt-5 space-y-4"><label className="block text-sm font-medium text-slate-700">Purchase invoice<select value={payment.purchase} onChange={selectPurchase} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3"><option value="">General vendor payment</option>{vendorPurchases.map((purchase) => <option key={purchase._id} value={purchase._id}>{purchase.invoiceNumber} · due {formatCurrency(purchase.total - (purchase.paidAmount || 0))}</option>)}</select></label><label className="block text-sm font-medium text-slate-700">Amount<input required disabled={noBalance} type="number" min="0.01" max={Math.max(selectedBalance, 0.01)} step="0.01" value={payment.amount} onChange={update(setPayment, "amount")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 disabled:cursor-not-allowed disabled:bg-slate-100" /></label>{noBalance && <p className="text-sm text-slate-500">No pending balance is available for this vendor.</p>}<label className="block text-sm font-medium text-slate-700">Payment mode<select disabled={noBalance} value={payment.paymentMode} onChange={update(setPayment, "paymentMode")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 disabled:bg-slate-100"><option>Cash</option><option>UPI</option><option>Card</option><option>Bank transfer</option><option>Cheque</option></select></label><label className="block text-sm font-medium text-slate-700">Payment date<input required type="date" value={payment.paymentDate} onChange={update(setPayment, "paymentDate")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label><label className="block text-sm font-medium text-slate-700">Notes<textarea value={payment.notes} onChange={update(setPayment, "notes")} rows="2" className="mt-2 w-full rounded-xl border border-slate-200 p-3" /></label><button type="submit" disabled={noBalance} className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{noBalance ? "No payment due" : "Save payment"}</button></div></form></div>}
    </div>
  );
};

export default AdminVendors;
