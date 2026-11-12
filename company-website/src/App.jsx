import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Check,
  ChevronDown,
  CircleHelp,
  Code2,
  HeartPulse,
  Layers3,
  Menu,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Store,
  X,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";
const businessTypes = ["E-Commerce", "Pharmacy", "Supermart / Grocery", "Garments", "Other"];
const products = [
  { title: "E-Commerce", category: "ONLINE STORES", icon: ShoppingBag, text: "A customer-ready storefront with product discovery, cart, checkout, and order management.", tint: "violet" },
  { title: "Pharmacy", category: "HEALTHCARE RETAIL", icon: HeartPulse, text: "A practical retail workspace for medicine catalogues, inventory, billing, and daily operations.", tint: "mint" },
  { title: "Supermart", category: "GROCERY & RETAIL", icon: Store, text: "Bring products, stock, sales, customers, and reports together for your store team.", tint: "amber" },
  { title: "Garments", category: "FASHION RETAIL", icon: Layers3, text: "Manage apparel collections, product variants, stock, and customer orders in one place.", tint: "blue" },
];

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
}).format(Number(value) || 0);

function App() {
  const [plans, setPlans] = useState([]);
  const [plansState, setPlansState] = useState("loading");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inquiryType, setInquiryType] = useState("General");
  const [form, setForm] = useState({
    companyName: "",
    contactPerson: "",
    mobile: "",
    email: "",
    businessType: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [submittedLeadId, setSubmittedLeadId] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/leads/public/plans`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Subscription plans could not be loaded.");
        if (active) {
          setPlans(result.data || []);
          setPlansState("ready");
        }
      })
      .catch(() => {
        if (active) setPlansState("error");
      });
    return () => { active = false; };
  }, []);

  const startInquiry = (type = "General", businessType = "") => {
    setInquiryType(type);
    if (businessType) setForm((current) => ({ ...current, businessType }));
    setSubmittedLeadId("");
    setFormError("");
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
    window.setTimeout(() => document.getElementById("company-name")?.focus(), 350);
  };

  const updateForm = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setFormError("");
  };

  const submitInquiry = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    setSubmittedLeadId("");
    try {
      const response = await fetch(`${API_URL}/api/leads/public/inquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, inquiryType }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Your inquiry could not be submitted. Please try again.");
      setSubmittedLeadId(result.data.leadId);
      setForm({ companyName: "", contactPerson: "", mobile: "", email: "", businessType: "", description: "" });
    } catch (error) {
      setFormError(error instanceof TypeError ? "Unable to connect right now. Please try again in a moment." : error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#home" aria-label="E-Cart Infotech home">
          <span className="brand-icon"><ShoppingBag size={21} strokeWidth={2.2} /></span>
          <span><strong>E-Cart</strong><small>INFOTECH</small></span>
        </a>
        <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}>
          {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav className={mobileMenuOpen ? "main-nav main-nav-open" : "main-nav"} aria-label="Main navigation">
          <a onClick={closeMenu} href="#about">About</a>
          <a onClick={closeMenu} href="#solutions">Solutions</a>
          <a onClick={closeMenu} href="#products">Products</a>
          <a onClick={closeMenu} href="#plans">Plans</a>
          <a onClick={closeMenu} href="#contact">Contact</a>
        </nav>
        <button className="header-cta" onClick={() => startInquiry("Demo")}>Request a demo <ArrowUpRight size={15} /></button>
      </header>

      <main>
        <section className="hero-section" id="home">
          <div className="hero-grid">
            <div className="hero-copy">
              <span className="eyebrow"><span /> SOFTWARE FOR AMBITIOUS BUSINESSES</span>
              <h1>Good business runs on <em>better systems.</em></h1>
              <p className="hero-description">E-Cart Infotech creates connected software for commerce, retail, and the teams behind them. Start with what you need today. Grow at your own pace.</p>
              <div className="hero-actions">
                <button className="button button-dark" onClick={() => startInquiry("Demo")}>Explore a solution <ArrowRight size={16} /></button>
                <a className="text-button" href="#products">See our products <ArrowDownRight size={16} /></a>
              </div>
              <div className="hero-trust"><ShieldCheck size={16} /><span>Designed for your business. Supported by our team.</span></div>
            </div>
            <div className="hero-visual" aria-label="Business software dashboard illustration">
              <div className="visual-topbar"><div className="visual-brand"><span /> STORE OVERVIEW</div><div className="visual-period">This month <ChevronDown size={12} /></div></div>
              <div className="visual-welcome"><div><small>GOOD MORNING</small><strong>Your business, at a glance.</strong></div><div className="visual-avatar">EC</div></div>
              <div className="visual-metrics">
                <div><span>ORDERS</span><strong>In one place</strong><small><i /> Track activity</small></div>
                <div><span>INVENTORY</span><strong>Stay in control</strong><small><i /> View stock</small></div>
              </div>
              <div className="visual-chart"><div className="chart-heading"><span>Business activity</span><small>Connected tools</small></div><div className="chart-bars"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><div className="chart-base" /></div>
              <div className="visual-bottom"><span><span className="status-dot" /> WORKSPACE READY</span><span>Built around your business</span></div>
              <div className="floating-chip floating-orders"><PackageCheck size={15} /><span><strong>Orders</strong><small>Keep things moving</small></span></div>
              <div className="floating-chip floating-stock"><Boxes size={15} /><span><strong>Stock</strong><small>Know what is on hand</small></span></div>
            </div>
          </div>
          <div className="hero-footer"><span>SOFTWARE THAT WORKS WITH YOUR BUSINESS</span><div><span>Retail</span><span>Pharmacy</span><span>Online commerce</span><span>Growing teams</span></div></div>
        </section>

        <section className="intro-section section-wrap" id="about">
          <div className="section-kicker">01 / WHO WE ARE</div>
          <div className="intro-content"><h2>Technology should make the day <em>easier.</em></h2><div><p>We build business software with a practical goal: help teams serve customers, manage their work, and make confident decisions without unnecessary complexity.</p><p>From a new online store to a busy retail operation, E-Cart brings the essential tools into a workspace that can grow with you.</p><a className="inline-link" href="#contact">Tell us what you are building <ArrowUpRight size={15} /></a></div></div>
        </section>

        <section className="solutions-section" id="solutions">
          <div className="section-wrap">
            <div className="section-heading"><div><div className="section-kicker">02 / WHAT WE DO</div><h2>Useful tools. <em>Real work.</em></h2></div><p>From your first product listing to everyday operations, bring the important parts of your business closer together.</p></div>
            <div className="solution-grid">
              <article className="solution-card solution-featured"><div className="solution-icon"><ShoppingBag size={20} /></div><span>01 — COMMERCE</span><h3>Sell online with confidence.</h3><p>Build a storefront where customers can discover products, place orders, and stay connected to your business.</p><button onClick={() => startInquiry("Demo", "E-Commerce")}>Explore e-commerce <ArrowUpRight size={15} /></button><div className="solution-art"><div /><div /><div /></div></article>
              <article className="solution-card"><div className="solution-icon"><Store size={20} /></div><span>02 — RETAIL</span><h3>Bring store operations together.</h3><p>Manage products, customers, sales, and reporting from an organized admin workspace.</p><button onClick={() => startInquiry("Demo", "Supermart / Grocery")}>Explore retail tools <ArrowUpRight size={15} /></button></article>
              <article className="solution-card"><div className="solution-icon"><Code2 size={20} /></div><span>03 — IT SOLUTIONS</span><h3>Software shaped around your needs.</h3><p>Discuss integrations, setup, and software requirements with a team that understands your workflow.</p><button onClick={() => startInquiry("General")}>Talk to our team <ArrowUpRight size={15} /></button></article>
            </div>
          </div>
        </section>

        <section className="products-section section-wrap" id="products">
          <div className="section-heading"><div><div className="section-kicker">03 / OUR PRODUCTS</div><h2>Made for the way <em>you work.</em></h2></div><p>Start with a solution that fits your business. Our team can help you choose the right setup.</p></div>
          <div className="product-grid">
            {products.map(({ title, category, icon: Icon, text, tint }) => (
              <article className="product-card" key={title}>
                <div className={`product-icon product-icon-${tint}`}><Icon size={20} /></div>
                <span className="product-category">{category}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                <button onClick={() => startInquiry("Demo", title === "Supermart" ? "Supermart / Grocery" : title)}>Request a demo <ArrowUpRight size={14} /></button>
              </article>
            ))}
          </div>
          <div className="product-note"><CircleHelp size={17} /><span>Have a different business? <button onClick={() => startInquiry("General", "Other")}>Tell us what you need</button> and we will help find a fit.</span></div>
        </section>

        <section className="plans-section" id="plans">
          <div className="section-wrap">
            <div className="section-heading"><div><div className="section-kicker">04 / SUBSCRIPTION PLANS</div><h2>Clear plans. <em>Room to grow.</em></h2></div><p>Review the available subscription options and ask our team to help you choose the right one.</p></div>
            {plansState === "loading" && <div className="plans-message">Loading current plans...</div>}
            {plansState === "error" && <div className="plans-message plans-error" role="status">Current plans could not be loaded. Contact us for the latest pricing.</div>}
            {plansState === "ready" && plans.length === 0 && <div className="plans-message">Plans are being updated. Contact us to discuss a subscription for your business.</div>}
            {plans.length > 0 && <div className="plans-grid">{plans.map((plan) => (
              <article className={`plan-card ${plan.featured ? "plan-card-featured" : ""}`} key={plan.id}>
                {plan.featured && <span className="plan-tag">POPULAR</span>}
                <div className="plan-name">{plan.name}</div>
                <div className="plan-price">{money(plan.price)}<small> / {plan.billingInterval === "monthly" ? "month" : "year"}</small></div>
                <p>{plan.description || "A subscription to help your business get started."}</p>
                <div className="plan-includes"><span><Check size={15} /> Business software access</span><span><Check size={15} /> Pricing reviewed with you</span><span><Check size={15} /> License after approval</span></div>
                <button className={plan.featured ? "button button-dark" : "button button-outline"} onClick={() => startInquiry("Purchase")}>Discuss this plan <ArrowRight size={15} /></button>
              </article>
            ))}</div>}
            <p className="plan-disclaimer">Final pricing and access are confirmed with our team. New accounts remain pending until Super Admin review and license activation.</p>
          </div>
        </section>

        <section className="contact-section section-wrap" id="contact">
          <div className="contact-copy">
            <div className="section-kicker">05 / LET'S TALK</div>
            <h2>Tell us what your business <em>needs next.</em></h2>
            <p>Request a demo, ask about a product, or share a challenge you want to solve. Our team will follow up with you.</p>
            <div className="contact-promise"><MessageCircle size={18} /><span><strong>A real conversation, not a sales maze.</strong><small>Your inquiry is routed to our Super Admin team for follow-up.</small></span></div>
            <div className="contact-decoration"><div><span>E-CART</span><strong>Built for business.</strong></div><ArrowDownRight size={23} /></div>
          </div>
          <div className="contact-form-wrap">
            {submittedLeadId ? (
              <div className="success-panel" role="status"><div className="success-icon"><Check size={25} /></div><span className="section-kicker">INQUIRY RECEIVED</span><h3>Thank you for reaching out.</h3><p>Your details are with our team. Keep this reference for your records:</p><strong className="lead-reference">{submittedLeadId}</strong><button className="text-button" onClick={() => setSubmittedLeadId("")}>Send another inquiry <ArrowRight size={15} /></button></div>
            ) : (
              <form className="inquiry-form" onSubmit={submitInquiry}>
                <div className="form-heading"><strong>Start a conversation</strong><span>Fields marked * are required</span></div>
                <div className="inquiry-type-picker" aria-label="Inquiry type">
                  {["General", "Demo", "Purchase"].map((type) => <button key={type} type="button" className={inquiryType === type ? "inquiry-type inquiry-type-active" : "inquiry-type"} onClick={() => setInquiryType(type)}>{type === "Demo" ? "Request demo" : type === "Purchase" ? "Purchase" : "General inquiry"}</button>)}
                </div>
                <div className="form-grid">
                  <label>Company name *<input id="company-name" name="companyName" required minLength={2} maxLength={120} value={form.companyName} onChange={updateForm} placeholder="Your business name" /></label>
                  <label>Contact person *<input name="contactPerson" required minLength={2} maxLength={80} value={form.contactPerson} onChange={updateForm} placeholder="Your full name" /></label>
                  <label>Mobile number *<input name="mobile" type="tel" required minLength={5} maxLength={30} value={form.mobile} onChange={updateForm} placeholder="+91 98765 43210" /></label>
                  <label>Email address *<input name="email" type="email" required maxLength={254} value={form.email} onChange={updateForm} placeholder="you@company.com" /></label>
                  <label className="full-width">Business type *<select name="businessType" required value={form.businessType} onChange={updateForm}><option value="">Select your business</option>{businessTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
                  <label className="full-width">How can we help? *<textarea name="description" required minLength={10} maxLength={2000} rows="4" value={form.description} onChange={updateForm} placeholder="Tell us what you would like to explore..." /></label>
                </div>
                {formError && <p className="form-error" role="alert">{formError}</p>}
                <button className="button button-dark submit-button" type="submit" disabled={submitting}>{submitting ? "Sending your inquiry..." : "Send inquiry"}<ArrowRight size={16} /></button>
                <small className="privacy-note"><ShieldCheck size={13} /> Your details are shared with E-Cart Infotech to respond to your inquiry.</small>
              </form>
            )}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#home"><span className="brand-icon"><ShoppingBag size={20} /></span><span><strong>E-Cart</strong><small>INFOTECH</small></span></a>
        <p>Business software, built to move you forward.</p>
        <div><a href="#about">About</a><a href="#products">Products</a><a href="#plans">Plans</a><a href="#contact">Contact</a></div>
        <small>© {new Date().getFullYear()} E-Cart Infotech</small>
      </footer>
      <a className="back-to-top" href="#home" aria-label="Back to top"><ArrowDownRight size={17} /></a>
    </div>
  );
}

export default App;
