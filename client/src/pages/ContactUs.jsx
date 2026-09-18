import { useState } from "react";
import { Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import Footer from "../components/home/Footer";
import { useStore } from "../context/storeContext";

const ContactUs = () => {
  const store = useStore();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "Order support",
    message: "",
  });
  const update = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    const response = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.message || "Unable to send message.");
      return;
    }
    setSent(true);
  };
  return (
    <>
      <main className="bg-gray-50 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            We are here to help
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            Contact our care team
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-gray-500">
            Send a message and our support team will receive it in the admin
            panel.
          </p>
          <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
            {sent ? (
              <div className="py-14 text-center">
                <MessageCircle className="mx-auto h-12 w-12 text-primary" />
                <h2 className="mt-5 text-xl font-bold">Message received</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Our support team will review your request shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="text-sm font-medium text-gray-700">
                    Name
                    <input
                      required
                      value={form.name}
                      onChange={update("name")}
                      className="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3"
                    />
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Email
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={update("email")}
                      className="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3"
                    />
                  </label>
                </div>
                <label className="block text-sm font-medium text-gray-700">
                  Subject
                  <select
                    value={form.subject}
                    onChange={update("subject")}
                    className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3"
                  >
                    <option>Order support</option>
                    <option>Product information</option>
                    <option>Returns and refunds</option>
                    <option>Account help</option>
                    <option>Something else</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Message
                  <textarea
                    required
                    minLength="10"
                    value={form.message}
                    onChange={update("message")}
                    rows="6"
                    className="mt-2 w-full resize-none rounded-lg border border-gray-200 p-3"
                    placeholder="Tell us how we can help..."
                  />
                </label>
                {error && (
                  <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  className="flex h-11 items-center gap-2 rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary-dark"
                >
                  <Send className="h-4 w-4" />
                  Send message
                </button>
              </form>
            )}
          </section>
          <div className="mt-5 grid gap-3 text-sm text-gray-500 sm:grid-cols-3">
            <a href={`mailto:${store.email}`} className="flex items-center gap-2 hover:text-primary">
              <Mail className="h-4 w-4 text-primary" />
              {store.email || "-"}
            </a>
            <a href={`tel:${store.phone}`} className="flex items-center gap-2 hover:text-primary">
              <Phone className="h-4 w-4 text-primary" />
              {store.phone || "-"}
            </a>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {store.address || "-"}
            </span>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default ContactUs;
