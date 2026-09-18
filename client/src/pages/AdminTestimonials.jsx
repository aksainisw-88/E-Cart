import { useEffect, useState } from "react";
import { MessageSquareQuote, Save } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";
const defaultTestimonials = [
  { name: "10 minute grocery now", message: "Get your essentials delivered quickly from stores near you." },
  { name: "Best prices & offers", message: "Great value, honest prices and offers you can count on." },
  { name: "Wide assortment", message: "Explore medicines, personal care, wellness and more." },
  { name: "Genuine products", message: "Every order is packed with care and delivered with confidence." },
];

const AdminTestimonials = () => {
  const [testimonials, setTestimonials] = useState(defaultTestimonials);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/store`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load testimonials.");
        setTestimonials(result.data.testimonials?.length ? result.data.testimonials : defaultTestimonials);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  const update = (index, field) => (event) => {
    setTestimonials((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: event.target.value } : item));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/store/testimonials`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ testimonials }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save testimonials.");
      setTestimonials(result.data);
      setMessage("Customer panel testimonials updated successfully.");
      window.dispatchEvent(new Event("store-settings-updated"));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px]">
      <div>
        <p className="text-sm font-medium text-primary">Customer panel</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Testimonials</h1>
        <p className="mt-2 text-sm text-slate-500">Update the four customer-facing slides shown on the home page.</p>
      </div>
      {(error || message) && <div className={`mt-5 rounded-lg p-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-700"}`}>{error || message}</div>}
      <form onSubmit={save} className="mt-8 space-y-5">
        {testimonials.map((testimonial, index) => (
          <section key={index} className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <MessageSquareQuote className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-slate-900">Slide {index + 1}</h2>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Title<input required maxLength="80" value={testimonial.name} onChange={update(index, "name")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
              <label className="text-sm font-medium text-slate-700">Message<input required maxLength="180" value={testimonial.message} onChange={update(index, "message")} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
            </div>
          </section>
        ))}
        <div className="flex justify-end"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save testimonials"}</button></div>
      </form>
    </div>
  );
};

export default AdminTestimonials;
