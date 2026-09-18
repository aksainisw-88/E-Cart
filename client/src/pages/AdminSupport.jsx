import { useEffect, useState } from "react";
import { CheckCircle2, MessageCircle, Search } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";

const statusClassMap = {
  open: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  in_progress: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  resolved: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};

const normalizeStatus = (status) => String(status || "open").trim().toLowerCase().replace(/\s+/g, "_");
const formatStatus = (status) => {
  const normalized = normalizeStatus(status);
  const labels = { open: "Open", in_progress: "In progress", resolved: "Resolved" };
  return labels[normalized] || normalized;
};

const AdminSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    fetch(`${API_URL}/api/admin/support`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load support tickets.");
        setTickets(result.data || []);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (ticket, status) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/support/${ticket._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to update ticket.");

      setTickets((items) =>
        items.map((item) => (item._id === ticket._id ? result.data : item))
      );
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };

  const visibleTickets = tickets.filter((ticket) => {
    const searchable = `${ticket.name || ""} ${ticket.email || ""} ${ticket.subject || ""} ${ticket.message || ""}`;
    return searchable.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="mx-auto max-w-[1500px]">
      <div>
        <p className="text-sm font-medium text-primary">Admin workspace</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Support inbox</h1>
        <p className="mt-2 text-sm text-slate-500">Review and resolve customer messages.</p>
      </div>

      {error && (
        <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <section className="mt-8 rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:w-80">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search messages..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          <span className="text-sm text-slate-500">{visibleTickets.length} tickets</span>
        </div>

        <div className="divide-y divide-slate-100">
          {visibleTickets.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No support tickets matched your search.</div>
          ) : (
            visibleTickets.map((ticket) => (
              <article key={ticket._id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-primary" />
                      <p className="font-semibold text-slate-800">{ticket.subject}</p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>{ticket.name || "Customer"}</span>
                      <span>{ticket.email || "No email"}</span>
                      <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-600">{ticket.message}</p>
                  </div>

                  <div className="min-w-[180px] lg:text-right">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassMap[normalizeStatus(ticket.status)] || "bg-slate-100 text-slate-700"}`}
                    >
                      {formatStatus(ticket.status)}
                    </span>

                    <div className="mt-3 flex flex-col gap-2 lg:items-end">
                      <button
                        type="button"
                        onClick={() => updateStatus(ticket, "in_progress")}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        In progress
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(ticket, "resolved")}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                </div>

                {ticket.adminReply && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                    <div className="mb-1 flex items-center gap-2 font-semibold text-slate-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Admin reply
                    </div>
                    {ticket.adminReply}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminSupport;
