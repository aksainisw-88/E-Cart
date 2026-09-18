import { useState } from "react";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { products } from "../data/products";
import AdminProducts from "./AdminProducts";
import AdminCustomers from "./AdminCustomers";
import AdminOrders from "./AdminOrders";
import AdminPayments from "./AdminPayments";
import AdminUsers from "./AdminUsers";
import AdminStore from "./AdminStore";
import AdminOffers from "./AdminOffers";
import AdminSupport from "./AdminSupport";
import AdminSettings from "./AdminSettings";

const sectionConfig = {
  products: {
    title: "Products",
    description: "Create, edit, and organize your store catalogue.",
    action: "Add product",
    columns: ["Product", "Category", "Price", "Stock", "Status"],
    rows: products.slice(0, 5).map((product, index) => [
      product.name,
      product.category,
      `₹${product.price}`,
      index === 1 ? "12 left" : index === 3 ? "Out of stock" : "In stock",
      index === 3 ? "Draft" : "Published",
    ]),
  },
  users: {
    title: "Users",
    description: "Manage staff accounts and access permissions.",
    action: "Add user",
    columns: ["Name", "Email", "Role", "Last active", "Status"],
    rows: [
      ["Ankit Saini", "ankit@medicalstore.com", "Super admin", "Just now", "Active"],
      ["Neha Kapoor", "neha@medicalstore.com", "Store manager", "2 hours ago", "Active"],
      ["Vikram Rao", "vikram@medicalstore.com", "Support agent", "Yesterday", "Active"],
    ],
  },
  customers: {
    title: "Customers",
    description: "Understand and support the people who shop with you.",
    action: "Export list",
    columns: ["Customer", "Email", "Orders", "Total spent", "Joined"],
    rows: [
      ["Priya Sharma", "priya@email.com", "14", "₹18,420", "Mar 12, 2026"],
      ["Rahul Mehta", "rahul@email.com", "8", "₹7,890", "Feb 28, 2026"],
      ["Anita Verma", "anita@email.com", "6", "₹5,240", "Jan 18, 2026"],
    ],
  },
  orders: {
    title: "Orders",
    description: "Review, process, and track every customer order.",
    action: "Export orders",
    columns: ["Order", "Customer", "Items", "Amount", "Status"],
    rows: [
      ["#EM-10482", "Priya Sharma", "2 items", "₹1,698", "Processing"],
      ["#EM-10481", "Rahul Mehta", "1 item", "₹399", "Shipped"],
      ["#EM-10480", "Anita Verma", "3 items", "₹2,347", "Delivered"],
      ["#EM-10479", "Karan Singh", "1 item", "₹1,299", "Processing"],
    ],
  },
  payments: {
    title: "Payments received",
    description: "View customer payments and transaction details.",
    action: "Refresh",
    columns: [],
    rows: [],
  },
  store: {
    title: "Store management",
    description: "Keep your storefront details, delivery, and policies up to date.",
    action: "Save changes",
    columns: [],
    rows: [],
  },
  settings: {
    title: "Settings",
    description: "Configure account preferences and admin access.",
    action: "Save settings",
    columns: [],
    rows: [],
  },
  offers: {
    title: "Offers & promotions",
    description: "Create campaigns and coupons for customers.",
    action: "Create offer",
    columns: [],
    rows: [],
  },
  support: {
    title: "Support inbox",
    description: "Review and resolve customer messages.",
    action: "Refresh",
    columns: [],
    rows: [],
  },
};

const AdminSection = ({ section }) => {
  const config = sectionConfig[section];
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState(false);

  if (!config) return null;

  const filteredRows = (config.rows || []).filter((row) =>
    row.join(" ").toLowerCase().includes(query.toLowerCase())
  );

  if (section === "products") return <AdminProducts />;
  if (section === "customers") return <AdminCustomers />;
  if (section === "orders") return <AdminOrders />;
  if (section === "payments") return <AdminPayments />;
  if (section === "users") return <AdminUsers />;
  if (section === "store") return <AdminStore />;
  if (section === "offers") return <AdminOffers />;
  if (section === "support") return <AdminSupport />;
  if (section === "settings") return <AdminSettings />;

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Admin workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{config.title}</h1>
          <p className="mt-2 text-sm text-slate-500">{config.description}</p>
        </div>

        <button
          type="button"
          onClick={() => setSaved(true)}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          {section === "products" || section === "users" ? <Plus className="h-4 w-4" /> : null}
          {saved ? "Saved" : config.action}
        </button>
      </div>

      {config.columns.length > 0 ? (
        <section className="mt-8 rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:w-72">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${config.title.toLowerCase()}...`}
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>

            <button type="button" className="flex w-fit items-center gap-2 text-sm font-medium text-slate-500">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  {config.columns.map((column) => (
                    <th key={column} className="px-5 py-3 font-semibold">
                      {column}
                    </th>
                  ))}
                  <th className="px-5 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr key={row[0]} className="hover:bg-slate-50">
                    {row.map((cell, index) => (
                      <td
                        key={`${row[0]}-${cell}`}
                        className={`px-5 py-4 ${index === 0 ? "font-semibold text-slate-700" : "text-slate-500"}`}
                      >
                        {cell}
                      </td>
                    ))}
                    <td className="px-5 py-4">
                      <button type="button" className="text-sm font-medium text-primary">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default AdminSection;
