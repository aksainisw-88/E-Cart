import { useEffect, useState } from "react";
import { Search, UserCheck, UserX } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";

const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [error, setError] = useState("");
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
  const visible = customers.filter((customer) => {
    const matchesQuery = `${customer.name} ${customer.email}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === "All" || customer.status === status);
  });
  return (
    <div className="mx-auto max-w-[1500px]">
      <div>
        <p className="text-sm font-medium text-primary">Admin workspace</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          Customers
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Search customers, review their order history, and control account
          access.
        </p>
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
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                {[
                  "Customer",
                  "Email",
                  "Orders",
                  "Total spent",
                  "Status",
                  "Action",
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
                    <button
                      type="button"
                      onClick={() => toggleStatus(customer)}
                      className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark"
                    >
                      {customer.status === "Active" ? (
                        <UserX className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                      {customer.status === "Active" ? "Block" : "Activate"}
                    </button>
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
    </div>
  );
};

export default AdminCustomers;
