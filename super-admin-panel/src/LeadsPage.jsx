import { useMemo, useState } from "react";
import { CalendarDays, Mail, MessageSquareText, Phone, Search, Send, UserRound, Users } from "lucide-react";

const statuses = ["New", "Contacted", "Follow-up", "Interested", "Converted", "Rejected"];

const displayDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(String(value).includes("T") ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
};

const LeadsPage = ({ leads, onSave, onInvite, loading }) => {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [remark, setRemark] = useState("");
  const [developmentInvitationUrl, setDevelopmentInvitationUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);

  const filteredLeads = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return leads.filter((lead) => !normalized || [
      lead.leadId,
      lead.companyName,
      lead.contactPerson,
      lead.email,
      lead.mobile,
      lead.businessType,
    ].some((value) => value?.toLowerCase().includes(normalized)));
  }, [leads, query]);

  const selectedLead = filteredLeads.find((lead) => lead.id === selectedId) || filteredLeads[0];
  const draftStatus = status && selectedLead?.id === selectedId ? status : selectedLead?.status || "New";
  const draftFollowUp = selectedLead?.id === selectedId ? followUpAt : selectedLead?.followUpAt || "";

  const selectLead = (lead) => {
    setSelectedId(lead.id);
    setStatus(lead.status);
    setFollowUpAt(lead.followUpAt || "");
    setRemark("");
    setDevelopmentInvitationUrl("");
  };

  const save = async (event) => {
    event.preventDefault();
    if (!selectedLead) return;
    setSaving(true);
    try {
      const updated = await onSave(selectedLead, {
        status: draftStatus,
        followUpAt: draftFollowUp,
        remark: remark.trim(),
      });
      if (!updated) return;
      setStatus(draftStatus);
      setFollowUpAt(draftFollowUp);
      setRemark("");
    } finally {
      setSaving(false);
    }
  };

  const invite = async () => {
    if (!selectedLead) return;
    setInviting(true);
    try {
      const result = await onInvite(selectedLead);
      if (!result) return;
      setDevelopmentInvitationUrl(result.developmentInvitationUrl || "");
    } finally {
      setInviting(false);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div><div className="eyebrow">BUSINESS DEVELOPMENT</div><h1>Lead management</h1><p>Review website inquiries, track follow-ups, and invite interested prospects to signup.</p></div>
        <div className="lead-total"><Users size={17} />{leads.length} total leads</div>
      </div>
      <section className="panel lead-panel">
        <div className="lead-list-column">
          <label className="lead-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search leads..." /></label>
          {loading ? <div className="empty-state"><strong>Loading leads...</strong></div> : filteredLeads.length === 0 ? <div className="empty-state"><div><Users size={20} /></div><strong>No leads found</strong><p>Website inquiries will appear here.</p></div> : (
            <div className="lead-list">
              {filteredLeads.map((lead) => (
                <button key={lead.id} className={`lead-list-item ${selectedLead?.id === lead.id ? "lead-list-item-active" : ""}`} onClick={() => selectLead(lead)}>
                  <span className="lead-avatar">{lead.companyName?.slice(0, 1) || "L"}</span>
                  <span className="lead-list-info"><strong>{lead.companyName}</strong><small>{lead.contactPerson} · {lead.businessType}</small><small>{lead.leadId}</small></span>
                  <span className={`lead-status lead-status-${lead.status.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{lead.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedLead && (
          <div className="lead-detail-column">
            <div className="lead-detail-heading">
              <div><div className="eyebrow">{selectedLead.leadId}</div><h2>{selectedLead.companyName}</h2><p>{selectedLead.inquiryType} inquiry · Received {displayDate(selectedLead.createdAt)}</p></div>
              <span className={`lead-status lead-status-${selectedLead.status.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{selectedLead.status}</span>
            </div>
            <div className="lead-contact-grid">
              <div><UserRound size={15} /><span><small>Contact</small><strong>{selectedLead.contactPerson}</strong></span></div>
              <div><Mail size={15} /><span><small>Email</small><a href={`mailto:${selectedLead.email}`}>{selectedLead.email}</a></span></div>
              <div><Phone size={15} /><span><small>Phone</small><a href={`tel:${selectedLead.mobile}`}>{selectedLead.mobile}</a></span></div>
              <div><CalendarDays size={15} /><span><small>Business type</small><strong>{selectedLead.businessType}</strong></span></div>
            </div>
            <div className="lead-description"><strong>Inquiry details</strong><p>{selectedLead.description}</p></div>
            {selectedLead.status !== "Converted" && (
              <form className="lead-update-form" onSubmit={save}>
                <label>Status<select value={draftStatus} onChange={(event) => setStatus(event.target.value)}>{statuses.filter((item) => item !== "Converted").map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Follow-up date<input type="date" value={draftFollowUp} onChange={(event) => setFollowUpAt(event.target.value)} /></label>
                <label className="lead-remark"><span><MessageSquareText size={14} /> Add discussion / remark</span><textarea rows="2" maxLength="2000" value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="Record the latest discussion or next action..." /></label>
                <div className="lead-actions">
                  <button className="button button-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save updates"}</button>
                  {selectedLead.status === "Interested" && <button className="button button-secondary" type="button" disabled={inviting} onClick={invite}><Send size={14} />{inviting ? "Sending..." : "Send signup invitation"}</button>}
                </div>
                {developmentInvitationUrl && <p className="lead-dev-invitation">Development invite: <a href={developmentInvitationUrl} target="_blank" rel="noreferrer">Open signup link</a></p>}
              </form>
            )}
            {selectedLead.status === "Converted" && <div className="lead-converted-note">Converted to tenant{selectedLead.tenantId ? ` ${selectedLead.tenantId}` : ""}{selectedLead.storeSlug ? ` · Store URL slug: ${selectedLead.storeSlug}` : ""}.</div>}
            <section className="lead-history">
              <h3>Lead history <span>{selectedLead.history?.length || 0}</span></h3>
              {!selectedLead.history?.length ? <p className="lead-history-empty">No communication history recorded.</p> : [...selectedLead.history].reverse().map((entry, index) => (
                <article className="lead-history-item" key={`${entry.createdAt}-${index}`}>
                  <span className="lead-history-dot" />
                  <div><div className="lead-history-meta"><strong>{entry.type}{entry.status ? ` · ${entry.status}` : ""}</strong><time>{displayDate(entry.createdAt)}</time></div><p>{entry.details}</p><small>{entry.createdBy}</small></div>
                </article>
              ))}
            </section>
          </div>
        )}
      </section>
    </>
  );
};

export default LeadsPage;
