import { Edit3, Eye, Search } from "lucide-react";
import { useMemo, useState } from "react";

const formatDate = (date) => {
  if (!date) return "—";
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
};

const normalized = (value) => String(value || "").trim().toLowerCase();

export default function ClientDetailsModule({ clients, onView, onEdit }) {
  const [query, setQuery] = useState("");
  const visibleClients = useMemo(() => {
    const search = normalized(query);
    if (!search) return clients;
    return clients.filter((client) => [
      client.name,
      client.business,
      client.email,
      client.phone,
      client.registrationNumber,
      client.tenantId,
    ].some((value) => normalized(value).includes(search)));
  }, [clients, query]);

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CLIENT RECORDS</span>
          <h1>Client Details</h1>
          <p>Search client contact and license information, open a record, or edit its details.</p>
        </div>
      </div>
      <section className="panel data-panel client-records-panel">
        <div className="list-toolbar">
          <div>
            <h2>All client records <span className="table-count">{visibleClients.length}</span></h2>
            <p>Search by client, company, email, phone, registration number, or tenant ID.</p>
          </div>
          <label className="search-field client-records-search">
            <Search size={16} />
            <input
              aria-label="Search client details"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search client details..."
            />
          </label>
        </div>
        {visibleClients.length === 0 ? (
          <div className="empty-state">
            <div><Search size={20} /></div>
            <strong>{clients.length ? "No matching clients" : "No client records yet"}</strong>
            <p>{clients.length ? "Try a different name, email, phone, or license value." : "Approved client records will appear here."}</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table client-records-table">
              <thead>
                <tr>
                  <th>CLIENT / COMPANY</th>
                  <th>EMAIL</th>
                  <th>PHONE</th>
                  <th>REGISTRATION NO.</th>
                  <th>VALID UNTIL</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {visibleClients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <div className="client-record-identity">
                        <strong>{client.name || "—"}</strong>
                        <span>{client.business || "—"}</span>
                      </div>
                    </td>
                    <td>{client.email || "—"}</td>
                    <td>{client.phone || "—"}</td>
                    <td className="mono">{client.registrationNumber || "Not issued"}</td>
                    <td className="date-cell">{formatDate(client.validTill)}</td>
                    <td><span className={`client-record-status ${normalized(client.status)}`}>{client.status || "Unknown"}</span></td>
                    <td>
                      <div className="client-record-actions">
                        <button className="button button-secondary button-small" onClick={() => onView(client)}><Eye size={14} /> View</button>
                        <button className="button button-primary button-small" onClick={() => onEdit(client)}><Edit3 size={14} /> Edit</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
