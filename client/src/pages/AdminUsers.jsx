import { useEffect, useState } from "react";
import {
  Edit3,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";
const emptyForm = { name: "", email: "", password: "", role: "user" };

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = () =>
    fetch(`${API_URL}/api/users`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        setUsers(result.data);
      })
      .catch((requestError) => setError(requestError.message));
  useEffect(() => {
    load();
  }, []);
  const updateForm = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setFormOpen(true);
  };
  const openEdit = (user) => {
    setEditingId(user._id);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
    });
    setError("");
    setFormOpen(true);
  };
  const saveUser = async (event) => {
    event.preventDefault();
    const payload = editingId
      ? { name: form.name, email: form.email, role: form.role }
      : form;
    const response = await fetch(
      `${API_URL}/api/users${editingId ? `/${editingId}` : ""}`,
      {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      },
    );
    const result = await response.json();
    if (!response.ok) {
      setError(result.message);
      return;
    }
    setUsers((current) =>
      editingId
        ? current.map((item) => (item._id === editingId ? result.data : item))
        : [result.data, ...current],
    );
    setFormOpen(false);
    setMessage(
      editingId ? "User updated successfully." : "User created successfully.",
    );
  };
  const toggleStatus = async (user) => {
    const status = user.status === "Blocked" ? "Active" : "Blocked";
    const response = await fetch(`${API_URL}/api/users/${user._id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    });
    const result = await response.json();
    if (!response.ok) setError(result.message);
    else
      setUsers((current) =>
        current.map((item) =>
          item._id === user._id ? { ...item, status } : item,
        ),
      );
  };
  const removeUser = async (user) => {
    if (!window.confirm(`Delete ${user.name}?`)) return;
    const response = await fetch(`${API_URL}/api/users/${user._id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const result = await response.json();
    if (!response.ok) setError(result.message);
    else setUsers((current) => current.filter((item) => item._id !== user._id));
  };
  const visible = users.filter((user) => {
    const matchesQuery = `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (roleFilter === "All" || user.role === roleFilter) && (statusFilter === "All" || user.status === statusFilter);
  });
  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Admin workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Users
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage staff access and role permissions.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Add user
        </button>
      </div>
      {(error || message) && (
        <div
          className={`mt-5 rounded-lg p-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-700"}`}
        >
          {error || message}
        </div>
      )}
      <section className="mt-8 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:w-80">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3"><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"><option value="All">All roles</option><option value="admin">Admin</option><option value="manager">Manager</option><option value="user">User</option></select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"><option value="All">All statuses</option><option value="Active">Active</option><option value="Blocked">Blocked</option></select><span className="text-sm text-slate-500">{visible.length} users</span></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                {["User", "Role", "Status", "Last updated", "Actions"].map(
                  (heading) => (
                    <th key={heading} className="px-5 py-3 font-semibold">
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((user) => (
                <tr key={user._id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 font-bold text-primary">
                        {user.name.charAt(0)}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-700">
                          {user.name}
                        </p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1 capitalize text-slate-500">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    {new Date(
                      user.updatedAt || user.createdAt,
                    ).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        aria-label={`Edit ${user.name}`}
                        className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-primary"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStatus(user)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-primary"
                        aria-label={
                          user.status === "Active"
                            ? `Block ${user.name}`
                            : `Activate ${user.name}`
                        }
                      >
                        {user.status === "Active" ? (
                          <UserX className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeUser(user)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete ${user.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form
            onSubmit={saveUser}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl sm:p-8"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId ? "Edit user" : "Add user"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Assign staff access for your store team.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Close form"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className="mt-6 space-y-5">
              <label className="block text-sm font-medium text-slate-700">
                Full name
                <input
                  required
                  value={form.name}
                  onChange={updateForm("name")}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Email
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={updateForm("email")}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Role
                <select
                  required
                  value={form.role}
                  onChange={updateForm("role")}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 capitalize outline-none focus:border-primary"
                >
                  <option value="user">User</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              {!editingId && (
                <label className="block text-sm font-medium text-slate-700">
                  Temporary password
                  <input
                    required
                    minLength="8"
                    type="password"
                    value={form.password}
                    onChange={updateForm("password")}
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary"
                  />
                </label>
              )}
            </div>
            <button
              type="submit"
              className="mt-7 h-11 w-full rounded-lg bg-primary font-semibold text-white hover:bg-primary-dark"
            >
              {editingId ? "Save changes" : "Create user"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
