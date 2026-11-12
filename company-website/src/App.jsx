import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  CreditCard,
  HeartPulse,
  Layers3,
  Menu,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  Users,
  X,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";
const businessTypes = ["E-Commerce", "Pharmacy", "Supermart / Grocery", "Garments", "Other"];
const marqueeItems = ["E-Commerce", "Pharmacy", "Grocery", "Garments", "Inventory", "Billing", "Orders", "Reports", "Delivery"];

const products = [
  {
    title: "E-Commerce",
    category: "Online stores",
    icon: ShoppingBag,
    text: "A customer-ready storefront with discovery, cart, checkout, and order management.",
    accent: "violet",
  },
  {
    title: "Pharmacy",
    category: "Healthcare retail",
    icon: HeartPulse,
    text: "Catalogues, inventory, billing, and daily operations in one practical workspace.",
    accent: "mint",
  },
  {
    title: "Supermart",
    category: "Grocery & retail",
    icon: Store,
    text: "Products, stock, sales, customers, and reports together for your store team.",
    accent: "amber",
  },
  {
    title: "Garments",
    category: "Fashion retail",
    icon: Layers3,
    text: "Collections, variants, stock, and customer orders managed in one place.",
    accent: "blue",
  },
];

const stats = [
  { value: "4", label: "Industry-ready products" },
  { value: "1", label: "Connected workspace" },
  { value: "24/7", label: "Storefront availability" },
  { value: "7-day", label: "Signup invitation window" },
];

const steps = [
  { number: "01", title: "Share your needs", text: "Tell us about your store, products, and the operations you want to simplify." },
  { number: "02", title: "See a working setup", text: "We walk you through a demo tailored to e-commerce, pharmacy, grocery, or garments." },
  { number: "03", title: "Go live with support", text: "After subscription review and license activation, your team starts selling with confidence." },
];

const capabilities = [
  { icon: PackageCheck, title: "Orders in one place", text: "Track storefront and counter sales without switching tools." },
  { icon: Boxes, title: "Inventory you can trust", text: "Know what is on hand before you promise it to a customer." },
  { icon: Users, title: "Customer records", text: "Keep contacts, orders, and follow-ups close to the team that needs them." },
  { icon: BarChart3, title: "Clear reporting", text: "See activity, stock, and sales in a workspace built for daily decisions." },
  { icon: CreditCard, title: "Checkout & billing", text: "Give customers a smooth path to pay, and staff a reliable way to bill." },
  { icon: Truck, title: "Delivery areas", text: "Define where you serve and keep fulfillment aligned with your store." },
];

const testimonials = [
  {
    quote: "We needed a storefront and a back office that our team could actually use. E-Cart made that feel simple.",
    name: "Priya Mehra",
    role: "Founder, neighbourhood grocery",
  },
  {
    quote: "Pharmacy operations used to live in three places. Now catalogues, stock, and billing sit in one workspace.",
    name: "Dr. Rohan Iyer",
    role: "Retail pharmacy owner",
  },
  {
    quote: "The demo was practical. We saw our own workflow instead of a generic pitch deck.",
    name: "Ananya Kapoor",
    role: "Apparel brand lead",
  },
];

const faqs = [
  {
    question: "Who is E-Cart Infotech for?",
    answer: "Growing retailers and online sellers who want connected software for commerce, pharmacy, grocery, or garments — without a maze of disconnected tools.",
  },
  {
    question: "How do I get started?",
    answer: "Send an inquiry from this site. Our Super Admin team follows up, helps you choose a plan, and invites you to create an account when you are ready.",
  },
  {
    question: "When can we start using the software?",
    answer: "New accounts stay pending until subscription review and license activation. We confirm pricing and access with you before go-live.",
  },
  {
    question: "Can you support a different kind of business?",
    answer: "Yes. Choose Other on the inquiry form and describe your workflow. We will help you find a fit or discuss a tailored setup.",
  },
];

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

function App() {
  const [plans, setPlans] = useState([]);
  const [plansState, setPlansState] = useState("loading");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
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
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
    return () => {
      active = false;
    };
  }, []);

  const startInquiry = (type = "General", businessType = "") => {
    setInquiryType(type);
    if (businessType) setForm((current) => ({ ...current, businessType }));
    setSubmittedLeadId("");
    setFormError("");
    setMobileMenuOpen(false);
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
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Your inquiry could not be submitted. Please try again.");
      setSubmittedLeadId(result.data.leadId);
      setForm({
        companyName: "",
        contactPerson: "",
        mobile: "",
        email: "",
        businessType: "",
        description: "",
      });
    } catch (error) {
      setFormError(
        error instanceof TypeError || error instanceof SyntaxError
          ? "Unable to connect right now. Please try again in a moment."
          : error.message
      );
    } finally {
      setSubmitting(false);
    }
  };

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <div className="site">
      <div className="ambient" aria-hidden="true" />
      <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
        <a className="brand" href="#home" aria-label="E-Cart Infotech home">
          <span className="brand-mark">
            <ShoppingBag size={18} strokeWidth={2.4} />
          </span>
          <span className="brand-text">
            <strong>E-Cart</strong>
            <small>Infotech</small>
          </span>
        </a>
        <nav className={mobileMenuOpen ? "main-nav is-open" : "main-nav"} aria-label="Main navigation">
          <a onClick={closeMenu} href="#about">About</a>
          <a onClick={closeMenu} href="#solutions">Solutions</a>
          <a onClick={closeMenu} href="#products">Products</a>
          <a onClick={closeMenu} href="#plans">Plans</a>
          <a onClick={closeMenu} href="#faq">FAQ</a>
          <a onClick={closeMenu} href="#contact">Contact</a>
        </nav>
        <div className="header-actions">
          <button className="ghost-cta" onClick={() => startInquiry("Demo")}>
            Request a demo
          </button>
          <button className="primary-cta" onClick={() => startInquiry("Purchase")}>
            Get started <ArrowRight size={16} />
          </button>
          <button
            className="menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-copy">
            <p className="eyebrow">
              <Sparkles size={14} />
              Software for ambitious businesses
            </p>
            <h1>
              Run your store with
              <span> systems that stay out of the way.</span>
            </h1>
            <p className="lede">
              E-Cart Infotech builds connected software for commerce, pharmacy, grocery, and fashion retail.
              Start with what you need today. Grow at your own pace.
            </p>
            <div className="hero-actions">
              <button className="primary-cta large" onClick={() => startInquiry("Demo")}>
                Explore a solution <ArrowRight size={18} />
              </button>
              <a className="text-link" href="#products">
                See our products <ArrowUpRight size={16} />
              </a>
            </div>
            <div className="trust-row">
              <span><ShieldCheck size={16} /> Designed for your business</span>
              <span><Clock3 size={16} /> Supported by our team</span>
            </div>
            <ul className="hero-pills">
              {["E-Commerce", "Pharmacy", "Grocery", "Garments"].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="hero-stage" aria-label="Store overview illustration">
            <div className="hero-glow" aria-hidden="true" />
            <div className="dashboard">
              <div className="dash-top">
                <div className="dash-brand">
                  <span className="live-dot" />
                  Store overview
                </div>
                <div className="dash-chip">
                  This month <ChevronDown size={14} />
                </div>
              </div>
              <div className="dash-welcome">
                <div>
                  <small>Good morning</small>
                  <strong>Your business, at a glance.</strong>
                </div>
                <div className="avatar">EC</div>
              </div>
              <div className="metric-grid">
                <article>
                  <span>Orders</span>
                  <strong>In one place</strong>
                  <small>Track activity as it happens</small>
                </article>
                <article>
                  <span>Inventory</span>
                  <strong>Stay in control</strong>
                  <small>Know what is on hand</small>
                </article>
              </div>
              <div className="chart-card">
                <div className="chart-head">
                  <span>Business activity</span>
                  <small>Connected tools</small>
                </div>
                <div className="bars" aria-hidden="true">
                  {["35%", "49%", "40%", "68%", "55%", "76%", "60%", "90%", "67%", "78%", "58%", "96%"].map((height, index) => (
                    <i key={index} style={{ height }} />
                  ))}
                </div>
              </div>
              <div className="dash-foot">
                <span><span className="live-dot" /> Workspace ready</span>
                <span>Built around your business</span>
              </div>
            </div>
            <div className="float-card float-orders">
              <PackageCheck size={18} />
              <span>
                <strong>Orders</strong>
                <small>Keep things moving</small>
              </span>
            </div>
            <div className="float-card float-stock">
              <Boxes size={18} />
              <span>
                <strong>Stock</strong>
                <small>Know what is on hand</small>
              </span>
            </div>
          </div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[...marqueeItems, ...marqueeItems].map((item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ))}
          </div>
        </div>

        <section className="stats-bar" aria-label="Company highlights">
          {stats.map((item) => (
            <div key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </section>

        <section className="about section" id="about">
          <p className="kicker">Who we are</p>
          <div className="about-grid">
            <h2>Technology should make the day easier — not louder.</h2>
            <div>
              <p>
                We build business software with a practical goal: help teams serve customers, manage work,
                and make confident decisions without unnecessary complexity.
              </p>
              <p>
                From a new online store to a busy retail counter, E-Cart brings essential tools into a workspace
                that can grow with you.
              </p>
              <button className="text-link" onClick={() => startInquiry("General")}>
                Tell us what you are building <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        </section>

        <section className="section solutions" id="solutions">
          <div className="section-head">
            <div>
              <p className="kicker">What we do</p>
              <h2>Useful tools for real work.</h2>
            </div>
            <p>From the first product listing to everyday operations, keep the important parts of your business closer together.</p>
          </div>
          <div className="bento">
            <article className="bento-card featured">
              <ShoppingBag size={22} />
              <span>01 — Commerce</span>
              <h3>Sell online with confidence.</h3>
              <p>Build a storefront where customers discover products, place orders, and stay connected to your brand.</p>
              <button onClick={() => startInquiry("Demo", "E-Commerce")}>
                Explore e-commerce <ArrowUpRight size={16} />
              </button>
            </article>
            <article className="bento-card">
              <Store size={22} />
              <span>02 — Retail</span>
              <h3>Bring store operations together.</h3>
              <p>Manage products, customers, sales, and reporting from an organized admin workspace.</p>
              <button onClick={() => startInquiry("Demo", "Supermart / Grocery")}>
                Explore retail tools <ArrowUpRight size={16} />
              </button>
            </article>
            <article className="bento-card">
              <ShieldCheck size={22} />
              <span>03 — IT solutions</span>
              <h3>Software shaped around your needs.</h3>
              <p>Discuss integrations, setup, and software requirements with a team that understands your workflow.</p>
              <button onClick={() => startInquiry("General")}>
                Talk to our team <ArrowUpRight size={16} />
              </button>
            </article>
          </div>
        </section>

        <section className="section products" id="products">
          <div className="section-head">
            <div>
              <p className="kicker">Our products</p>
              <h2>Made for the way you work.</h2>
            </div>
            <p>Start with a solution that fits your business. Our team can help you choose the right setup.</p>
          </div>
          <div className="product-grid">
            {products.map(({ title, category, icon: Icon, text, accent }) => (
              <article className="product-card" key={title}>
                <div className={`icon-pill ${accent}`}>
                  <Icon size={20} />
                </div>
                <span>{category}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                <button onClick={() => startInquiry("Demo", title === "Supermart" ? "Supermart / Grocery" : title)}>
                  Request a demo <ArrowUpRight size={15} />
                </button>
              </article>
            ))}
          </div>
          <div className="note">
            <CircleHelp size={18} />
            <p>
              Have a different business?{" "}
              <button onClick={() => startInquiry("General", "Other")}>Tell us what you need</button>
              {" "}and we will help find a fit.
            </p>
          </div>
        </section>

        <section className="section capabilities">
          <div className="section-head">
            <div>
              <p className="kicker">Platform</p>
              <h2>Everything your team touches, in one workspace.</h2>
            </div>
            <p>Commerce, inventory, customers, and reports stay connected so staff are not chasing information across tools.</p>
          </div>
          <div className="cap-grid">
            {capabilities.map(({ icon: Icon, title, text }) => (
              <article key={title}>
                <Icon size={20} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section process">
          <div className="section-head">
            <div>
              <p className="kicker">How it works</p>
              <h2>From first conversation to a live store.</h2>
            </div>
          </div>
          <ol className="steps">
            {steps.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="section plans" id="plans">
          <div className="section-head">
            <div>
              <p className="kicker">Subscription plans</p>
              <h2>Clear plans. Room to grow.</h2>
            </div>
            <p>Review current options and ask our team to help you choose the right one.</p>
          </div>
          {plansState === "loading" && <div className="status-card">Loading current plans…</div>}
          {plansState === "error" && (
            <div className="status-card warning" role="status">
              Current plans could not be loaded. Contact us for the latest pricing.
            </div>
          )}
          {plansState === "ready" && plans.length === 0 && (
            <div className="status-card">Plans are being updated. Contact us to discuss a subscription for your business.</div>
          )}
          {plans.length > 0 && (
            <div className="plans-grid">
              {plans.map((plan) => (
                <article className={`plan-card ${plan.featured ? "featured" : ""}`} key={plan.id}>
                  {plan.featured && <span className="tag">Popular</span>}
                  <h3>{plan.name}</h3>
                  <div className="price">
                    {money(plan.price)}
                    <small> / {plan.billingInterval === "monthly" ? "month" : "year"}</small>
                  </div>
                  <p>{plan.description || "A subscription to help your business get started."}</p>
                  <ul>
                    <li><Check size={16} /> Business software access</li>
                    <li><Check size={16} /> Pricing reviewed with you</li>
                    <li><Check size={16} /> License after approval</li>
                  </ul>
                  <button className={plan.featured ? "primary-cta" : "outline-cta"} onClick={() => startInquiry("Purchase")}>
                    Discuss this plan <ArrowRight size={16} />
                  </button>
                </article>
              ))}
            </div>
          )}
          <p className="disclaimer">
            Final pricing and access are confirmed with our team. New accounts remain pending until Super Admin review and license activation.
          </p>
        </section>

        <section className="section quotes">
          <div className="section-head">
            <div>
              <p className="kicker">What teams say</p>
              <h2>Built with operators, not just checklists.</h2>
            </div>
          </div>
          <div className="quote-grid">
            {testimonials.map((item) => (
              <blockquote key={item.name}>
                <p>“{item.quote}”</p>
                <footer>
                  <strong>{item.name}</strong>
                  <span>{item.role}</span>
                </footer>
              </blockquote>
            ))}
          </div>
        </section>

        <section className="section faq" id="faq">
          <div className="section-head">
            <div>
              <p className="kicker">FAQ</p>
              <h2>Questions we hear first.</h2>
            </div>
          </div>
          <div className="faq-list">
            {faqs.map((item, index) => (
              <div className={`faq-item ${openFaq === index ? "open" : ""}`} key={item.question}>
                <button type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}>
                  {item.question}
                  <ChevronDown size={18} />
                </button>
                {openFaq === index && <p>{item.answer}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="section contact" id="contact">
          <div className="contact-copy">
            <p className="kicker">Let’s talk</p>
            <h2>Tell us what your business needs next.</h2>
            <p>
              Request a demo, ask about a product, or share a challenge you want to solve. Our team will follow up with you.
            </p>
            <div className="promise">
              <MessageCircle size={20} />
              <div>
                <strong>A real conversation, not a sales maze.</strong>
                <span>Your inquiry is routed to our Super Admin team for follow-up.</span>
              </div>
            </div>
            <div className="contact-badge">
              <span>E-Cart Infotech</span>
              <strong>Built for business.</strong>
            </div>
          </div>

          <div className="form-card">
            {submittedLeadId ? (
              <div className="success" role="status">
                <div className="success-icon">
                  <Check size={26} />
                </div>
                <p className="kicker">Inquiry received</p>
                <h3>Thank you for reaching out.</h3>
                <p>Your details are with our team. Keep this reference for your records:</p>
                <strong className="lead-id">{submittedLeadId}</strong>
                <button className="text-link" onClick={() => setSubmittedLeadId("")}>
                  Send another inquiry <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <form onSubmit={submitInquiry}>
                <div className="form-top">
                  <strong>Start a conversation</strong>
                  <span>Fields marked * are required</span>
                </div>
                <div className="type-picker" aria-label="Inquiry type">
                  {["General", "Demo", "Purchase"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={inquiryType === type ? "active" : ""}
                      onClick={() => setInquiryType(type)}
                    >
                      {type === "Demo" ? "Request demo" : type === "Purchase" ? "Purchase" : "General inquiry"}
                    </button>
                  ))}
                </div>
                <div className="fields">
                  <label>
                    Company name *
                    <input
                      id="company-name"
                      name="companyName"
                      required
                      minLength={2}
                      maxLength={120}
                      value={form.companyName}
                      onChange={updateForm}
                      placeholder="Your business name"
                    />
                  </label>
                  <label>
                    Contact person *
                    <input
                      name="contactPerson"
                      required
                      minLength={2}
                      maxLength={80}
                      value={form.contactPerson}
                      onChange={updateForm}
                      placeholder="Your full name"
                    />
                  </label>
                  <label>
                    Mobile number *
                    <input
                      name="mobile"
                      type="tel"
                      required
                      minLength={5}
                      maxLength={30}
                      value={form.mobile}
                      onChange={updateForm}
                      placeholder="+91 98765 43210"
                    />
                  </label>
                  <label>
                    Email address *
                    <input
                      name="email"
                      type="email"
                      required
                      maxLength={254}
                      value={form.email}
                      onChange={updateForm}
                      placeholder="you@company.com"
                    />
                  </label>
                  <label className="wide">
                    Business type *
                    <select name="businessType" required value={form.businessType} onChange={updateForm}>
                      <option value="">Select your business</option>
                      {businessTypes.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                  <label className="wide">
                    How can we help? *
                    <textarea
                      name="description"
                      required
                      minLength={10}
                      maxLength={2000}
                      rows="4"
                      value={form.description}
                      onChange={updateForm}
                      placeholder="Tell us what you would like to explore..."
                    />
                  </label>
                </div>
                {formError && <p className="error" role="alert">{formError}</p>}
                <button className="primary-cta large submit" type="submit" disabled={submitting}>
                  {submitting ? "Sending your inquiry..." : "Send inquiry"}
                  <ArrowRight size={18} />
                </button>
                <p className="privacy">
                  <ShieldCheck size={14} />
                  Your details are shared with E-Cart Infotech to respond to your inquiry.
                </p>
              </form>
            )}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-brand">
          <a className="brand" href="#home">
            <span className="brand-mark">
              <ShoppingBag size={18} />
            </span>
            <span className="brand-text">
              <strong>E-Cart</strong>
              <small>Infotech</small>
            </span>
          </a>
          <p>Business software, built to move you forward.</p>
        </div>
        <nav aria-label="Footer">
          <a href="#about">About</a>
          <a href="#products">Products</a>
          <a href="#plans">Plans</a>
          <a href="#faq">FAQ</a>
          <a href="#contact">Contact</a>
        </nav>
        <small>© {new Date().getFullYear()} E-Cart Infotech. All rights reserved.</small>
      </footer>
    </div>
  );
}

export default App;
