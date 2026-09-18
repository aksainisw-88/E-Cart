import { useEffect, useState } from "react";
import { ImagePlus, Save } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";
const defaultSlides = [
  { eyebrow: "Fresh care for every day", title: "Good health starts with better choices.", description: "Quality medicines, wellness essentials and personal care delivered to your doorstep.", button: "Shop now", to: "/products", image: "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=1400&q=85" },
  { eyebrow: "Everything in one place", title: "Your everyday wellness, made simple.", description: "Everything you need for your health and wellness in one place.", button: "Explore Products", to: "/products", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80" },
  { eyebrow: "Small steps, big difference", title: "Feel your best, every single day.", description: "Discover our collection of wellness and personal care products.", button: "View Collection", to: "/products", image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1200&q=80" },
];

const AdminHeroSlider = () => {
  const [slides, setSlides] = useState(defaultSlides);
  const [files, setFiles] = useState({});
  const [previews, setPreviews] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/store?updated=${Date.now()}`, { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load hero slides.");
        if (result.data.heroSlides?.length === 3) setSlides(result.data.heroSlides);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  const update = (index, field) => (event) => setSlides((current) => current.map((slide, slideIndex) => slideIndex === index ? { ...slide, [field]: event.target.value } : slide));
  const chooseImage = (index, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setError("Images must be JPG, PNG, WEBP, or GIF files smaller than 5 MB.");
      return;
    }
    setFiles((current) => ({ ...current, [index]: file }));
    setPreviews((current) => ({ ...current, [index]: URL.createObjectURL(file) }));
    setError("");
  };
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const body = new FormData();
      body.append("slides", JSON.stringify(slides));
      Object.entries(files).forEach(([index, file]) => body.append(`image${index}`, file));
      const response = await fetch(`${API_URL}/api/store/hero-slides`, { method: "PUT", credentials: "include", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save hero slides.");
      setSlides(result.data);
      setFiles({});
      setPreviews({});
      setMessage("Hero slider updated successfully.");
      window.dispatchEvent(new Event("store-settings-updated"));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px]">
      <div><p className="text-sm font-medium text-primary">Customer panel</p><h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Hero slider</h1><p className="mt-2 text-sm text-slate-500">Change the three images and messages shown at the top of the home page.</p></div>
      {(error || message) && <div className={`mt-5 rounded-lg p-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-700"}`}>{error || message}</div>}
      <form onSubmit={save} className="mt-8 space-y-6">
        {slides.map((slide, index) => (
          <section key={index} className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">Slide {index + 1}</h2>
            <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr]">
              <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-xs text-slate-500">
                {previews[index] || slide.image ? <img src={previews[index] || slide.image} alt="Slide preview" className="h-32 w-full rounded object-cover" /> : <ImagePlus className="h-7 w-7 text-primary" />}
                <span className="mt-2">Choose image, max 2 MB</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => chooseImage(index, event)} className="hidden" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">Eyebrow<input value={slide.eyebrow} onChange={update(index, "eyebrow")} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
                <label className="text-sm font-medium text-slate-700">Button label<input value={slide.button} onChange={update(index, "button")} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Title<input required value={slide.title} onChange={update(index, "title")} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Description<textarea required rows="2" value={slide.description} onChange={update(index, "description")} className="mt-2 w-full rounded-lg border border-slate-200 p-3 outline-none focus:border-primary" /></label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Button link<input value={slide.to} onChange={update(index, "to")} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary" /></label>
              </div>
            </div>
          </section>
        ))}
        <div className="flex justify-end"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save slider"}</button></div>
      </form>
    </div>
  );
};

export default AdminHeroSlider;
