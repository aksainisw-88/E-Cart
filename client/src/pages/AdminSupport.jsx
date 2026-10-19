import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock3,
  Inbox,
  Mail,
  MessageCircle,
  MessageSquareText,
  PackageCheck,
  RefreshCw,
  Search,
  Send,
  UserRound,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";

const statusMeta = {
  open: {
    label: "Open",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    dotClassName: "bg-amber-500",
  },
  in_progress: {
    label: "In progress",
    className: "border-blue-200 bg-blue-50 text-blue-700",
    dotClassName: "bg-blue-500",
  },
  resolved: {
    label: "Resolved",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClassName: "bg-emerald-500",
  },
};

const normalizeStatus = (status) => String(status || "open").trim().toLowerCase().replace(/\s+/g, "_");
const getStatus = (status) => statusMeta[normalizeStatus(status)] || statusMeta.open;

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
};

const AdminSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({});
  const [expandedReplies, setExpandedReplies] = useState({});
  const [replySavingId, setReplySavingId] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTickets = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);

    try {
      const response = await fetch(`${API_URL}/api/admin/support`, { credentials: "include" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to load support tickets.");
      setTickets(result.data || []);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Unable to load support tickets.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTickets(true);
  }, [loadTickets]);

  const counts = useMemo(() => tickets.reduce((total, ticket) => {
    const status = normalizeStatus(ticket.status);
    total.all += 1;
    if (status === "open") total.open += 1;
    if (status === "in_progress") total.in_progress += 1;
    if (status === "resolved") total.resolved += 1;
    return total;
  }, { all: 0, open: 0, in_progress: 0, resolved: 0 }), [tickets]);

  const visibleTickets = useMemo(() => tickets.filter((ticket) => {
    const customerName = ticket.name || ticket.customer?.name || "";
    const customerEmail = ticket.email || ticket.customer?.email || "";
    const searchable = `${customerName} ${customerEmail} ${ticket.orderNumber || ""} ${ticket.subject || ""} ${ticket.message || ""}`;
    const matchesSearch = searchable.toLowerCase().includes(query.trim().toLowerCase());
    return matchesSearch && (filter === "all" || normalizeStatus(ticket.status) === filter);
  }), [tickets, query, filter]);

  const updateStatus = async (ticket, status) => {
    setUpdatingId(ticket._id);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/admin/support/${ticket._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to update ticket.");
      setTickets((items) => items.map((item) => (item._id === ticket._id ? result.data : item)));
    } catch (requestError) {
      setError(requestError.message || "Unable to update ticket.");
    } finally {
      setUpdatingId("");
    }
  };

  const saveReply = async (event, ticket) => {
    event.preventDefault();
    const adminReply = String(replyDrafts[ticket._id] ?? ticket.adminReply ?? "").trim();
    if (!adminReply) {
      setError("Write a reply before sending it to the customer.");
      return;
    }

    setReplySavingId(ticket._id);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/admin/support/${ticket._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ adminReply }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to send your reply.");
      setTickets((items) => items.map((item) => (item._id === ticket._id ? result.data : item)));
      setReplyDrafts((items) => ({ ...items, [ticket._id]: result.data.adminReply || adminReply }));
    } catch (requestError) {
      setError(requestError.message || "Unable to send your reply.");
    } finally {
      setReplySavingId("");
    }
  };

  const filterOptions = [
    { value: "all", label: "All tickets", count: counts.all },
    { value: "open", label: "Open", count: counts.open },
    { value: "in_progress", label: "In progress", count: counts.in_progress },
    { value: "resolved", label: "Resolved", count: counts.resolved },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-primary sm:flex">
            <MessageSquareText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">Admin workspace</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Support inbox</h1>
            <p className="mt-2 text-sm text-slate-500">Keep customer conversations moving and close the loop on order issues.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => loadTickets(false)}
          disabled={refreshing}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-primary disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh inbox
        </button>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section aria-label="Ticket summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">All conversations</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Inbox className="h-4 w-4" /></span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{counts.all}</p>
          <p className="mt-1 text-xs text-slate-400">Customer requests received</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Needs attention</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><MessageCircle className="h-4 w-4" /></span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{counts.open}</p>
          <p className="mt-1 text-xs text-slate-400">Waiting to be picked up</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">In progress</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Clock3 className="h-4 w-4" /></span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{counts.in_progress}</p>
          <p className="mt-1 text-xs text-slate-400">Being handled by your team</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Resolved</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-primary"><CheckCircle2 className="h-4 w-4" /></span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{counts.resolved}</p>
          <p className="mt-1 text-xs text-slate-400">Customer issues closed</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Customer conversations</h2>
              <p className="mt-1 text-xs text-slate-500">Search, filter, and reply to support requests.</p>
            </div>
            <label className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus-within:border-emerald-400 focus-within:bg-white xl:max-w-sm">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, order, or message..."
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>
          </div>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-0.5">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${filter === option.value ? "bg-emerald-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {option.label}
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${filter === option.value ? "bg-white/15 text-white" : "bg-white text-slate-500"}`}>{option.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
              <p className="mt-4 text-sm font-medium text-slate-700">Loading support inbox</p>
              <p className="mt-1 text-xs text-slate-400">Getting the latest customer messages.</p>
            </div>
          ) : visibleTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Inbox className="h-5 w-5" /></span>
              <p className="mt-4 font-semibold text-slate-800">{tickets.length ? "No matching conversations" : "Your inbox is clear"}</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">{tickets.length ? "Try a different search or ticket status filter." : "New customer support requests will appear here."}</p>
            </div>
          ) : visibleTickets.map((ticket) => {
            const status = getStatus(ticket.status);
            const normalizedStatus = normalizeStatus(ticket.status);
            const customerName = ticket.name || ticket.customer?.name || "Customer";
            const customerEmail = ticket.email || ticket.customer?.email || "No email provided";
            const replyOpen = Boolean(expandedReplies[ticket._id]);
            const isUpdating = updatingId === ticket._id;

            return (
              <article key={ticket._id} className="p-4 transition hover:bg-slate-50/60 sm:p-5 lg:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-primary"><MessageCircle className="h-4 w-4" /></span>
                      <h3 className="min-w-0 text-base font-semibold text-slate-900">{ticket.subject || "Customer support request"}</h3>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dotClassName}`} />
                        {status.label}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-700"><UserRound className="h-3.5 w-3.5 text-slate-400" />{customerName}</span>
                      <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" />{customerEmail}</span>
                      <span>{formatDate(ticket.createdAt)}</span>
                      {ticket.orderNumber && <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1 font-semibold text-violet-700"><PackageCheck className="h-3.5 w-3.5" />Order #{ticket.orderNumber}</span>}
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{ticket.message}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                    {normalizedStatus === "open" && (
                      <button type="button" onClick={() => updateStatus(ticket, "in_progress")} disabled={isUpdating} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50">
                        {isUpdating ? "Updating..." : "Start working"}
                      </button>
                    )}
                    {normalizedStatus !== "resolved" ? (
                      <button type="button" onClick={() => updateStatus(ticket, "resolved")} disabled={isUpdating} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50">
                        <Check className="h-3.5 w-3.5" />Resolve
                      </button>
                    ) : (
                      <button type="button" onClick={() => updateStatus(ticket, "open")} disabled={isUpdating} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50">
                        Reopen
                      </button>
                    )}
                  </div>
                </div>

                {ticket.adminReply && !replyOpen && (
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <p className="min-w-0"><span className="font-semibold">Latest reply: </span>{ticket.adminReply}</p>
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setExpandedReplies((items) => ({ ...items, [ticket._id]: !items[ticket._id] }))}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-primary transition hover:bg-emerald-50"
                  >
                    <MessageSquareText className="h-4 w-4" />
                    {replyOpen ? "Close reply" : ticket.adminReply ? "Edit reply" : "Reply to customer"}
                  </button>
                </div>

                {replyOpen && (
                  <form onSubmit={(event) => saveReply(event, ticket)} className="mt-2 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 sm:p-5">
                    <label htmlFor={`support-reply-${ticket._id}`} className="block text-sm font-semibold text-slate-800">Your reply</label>
                    <p className="mt-1 text-xs text-slate-500">This message will be visible to the customer in their order support history.</p>
                    <textarea
                      id={`support-reply-${ticket._id}`}
                      value={replyDrafts[ticket._id] ?? ticket.adminReply ?? ""}
                      onChange={(event) => setReplyDrafts((items) => ({ ...items, [ticket._id]: event.target.value }))}
                      maxLength={2000}
                      rows={3}
                      placeholder="Write a helpful update or answer..."
                      className="mt-3 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-slate-400">{(replyDrafts[ticket._id] ?? ticket.adminReply ?? "").length}/2000 characters</span>
                      <button type="submit" disabled={replySavingId === ticket._id} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">
                        <Send className="h-3.5 w-3.5" />
                        {replySavingId === ticket._id ? "Sending reply..." : ticket.adminReply ? "Update reply" : "Send reply"}
                      </button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </div>

        {!loading && visibleTickets.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-xs text-slate-500 sm:px-6">
            Showing <span className="font-semibold text-slate-700">{visibleTickets.length}</span> of <span className="font-semibold text-slate-700">{tickets.length}</span> conversations
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminSupport;
