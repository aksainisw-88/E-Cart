import { useEffect, useRef, useState } from "react";
import {
  Edit3,
  FileDown,
  FileUp,
  ImagePlus,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { productCategories } from "../data/products";

const emptyProduct = {
  name: "",
  brand: "",
  category: "",
  price: "",
  costPrice: "",
  originalPrice: "",
  discount: "0",
  stock: "0",
  rating: "0",
  reviews: "0",
  status: "Published",
  description: "",
};
const apiUrl = import.meta.env.VITE_API_URL || "";

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");
  const [form, setForm] = useState(emptyProduct);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const imageInput = useRef(null);
  const csvInput = useRef(null);

  const loadProducts = async () => {
    const response = await fetch(`${apiUrl}/api/products`, {
      credentials: "include",
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.message || "Unable to load products.");
    setProducts(result.data);
  };

  useEffect(() => {
    let active = true;
    fetch(`${apiUrl}/api/products`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.message || "Unable to load products.");
        return result;
      })
      .then((result) => {
        if (active) setProducts(result.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });

    return () => {
      active = false;
    };
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyProduct);
    setImages([]);
    setImagePreviews([]);
    setError("");
    setFormOpen(true);
  };

  const openEdit = (product) => {
    setEditingId(product._id);
    setForm({
      name: product.name,
      brand: product.brand || "",
      category: product.category,
      price: product.price,
      costPrice: product.costPrice || "",
      originalPrice: product.originalPrice || "",
      discount: product.discount || 0,
      stock: product.stock,
      rating: product.rating || 0,
      reviews: product.reviews || 0,
      status: product.status,
      description: product.description || "",
    });
    setImages([]);
    setImagePreviews((product.images?.length ? product.images : product.image ? [product.image] : []).map((image) => `${apiUrl}${image}`));
    setError("");
    setFormOpen(true);
  };

  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const selectImage = (event) => {
    const selectedImages = Array.from(event.target.files || []).slice(0, 6);
    if (!selectedImages.length) return;
    if (selectedImages.some((selectedImage) => selectedImage.size > 5 * 1024 * 1024)) {
      setError("Image must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }
    setError("");
    setImages(selectedImages);
    setImagePreviews(selectedImages.map((selectedImage) => URL.createObjectURL(selectedImage)));
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    setError("");
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    images.forEach((file) => body.append("images", file));
    try {
      const response = await fetch(
        `${apiUrl}/api/products${editingId ? `/${editingId}` : ""}`,
        { method: editingId ? "PUT" : "POST", credentials: "include", body },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Unable to save product.");
      setMessage(
        editingId
          ? "Product updated successfully."
          : "Product created successfully.",
      );
      setFormOpen(false);
      await loadProducts();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    const response = await fetch(`${apiUrl}/api/products/${product._id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.message || "Unable to delete product.");
      return;
    }
    setProducts((current) =>
      current.filter((item) => item._id !== product._id),
    );
    setMessage("Product deleted successfully.");
  };

  const importCsv = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    const response = await fetch(`${apiUrl}/api/products/import`, {
      method: "POST",
      credentials: "include",
      body,
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.message || "Unable to import CSV.");
      return;
    }
    setMessage(`${result.imported} products imported successfully.`);
    await loadProducts();
  };

  const downloadSampleCsv = () => {
    const rows = [
      ["name", "brand", "category", "price", "costPrice", "originalPrice", "discount", "stock", "rating", "reviews", "status", "description"],
      ["Paracetamol 500mg", "Example Pharma", "Medicines", "55", "35", "70", "10", "100", "4.5", "25", "Published", "Pain relief tablets"],
      ["Digital Thermometer", "Example Health", "Medical Devices", "249", "150", "299", "17", "20", "4", "10", "Published", "Fast and accurate temperature readings"],
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    const downloadUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.href = downloadUrl;
    link.download = "products-sample.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
  };

  const visibleProducts = products.filter((product) => {
    const matchesQuery = `${product.name} ${product.brand || ""} ${product.category}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = categoryFilter === "All" || product.category === categoryFilter;
    const matchesStatus = statusFilter === "All" || product.status === statusFilter;
    const matchesStock = stockFilter === "All" || (stockFilter === "In stock" ? Number(product.stock) > 0 : Number(product.stock) === 0);
    return matchesQuery && matchesCategory && matchesStatus && matchesStock;
  });

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Admin workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Products
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Create, edit, import, and organize your store catalogue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={csvInput}
            type="file"
            accept=".csv,text/csv"
            onChange={importCsv}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => csvInput.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FileUp className="h-4 w-4" />
            Import CSV
          </button>
          <button
            type="button"
            onClick={downloadSampleCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FileDown className="h-4 w-4" />
            Download sample CSV
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" />
            Add product
          </button>
        </div>
      </div>
      {(message || error) && (
        <div
          role="status"
          className={`mt-5 rounded-lg px-4 py-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-700"}`}
        >
          {error || message}
          <button
            type="button"
            onClick={() => {
              setError("");
              setMessage("");
            }}
            className="float-right"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <section className="mt-8 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:w-80">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3"><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"><option value="All">All categories</option>{productCategories.filter((category) => category !== "All Products").map((category) => <option key={category}>{category}</option>)}</select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"><option value="All">All statuses</option><option>Published</option><option>Draft</option></select><select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"><option value="All">All stock</option><option>In stock</option><option>Out of stock</option></select><span className="text-sm text-slate-500">{visibleProducts.length} products</span></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                {[
                  "Product",
                  "Category",
                  "Price",
                  "Stock",
                  "Rating",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th key={heading} className="px-5 py-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleProducts.map((product) => (
                <tr key={product._id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-50">
                        {product.image ? (
                          <img
                            src={`${apiUrl}${product.image}`}
                            alt=""
                            className="h-full w-full rounded-lg object-contain p-1"
                          />
                        ) : (
                          <ImagePlus className="h-4 w-4 text-slate-300" />
                        )}
                      </div>
                      <div>
                        <span className="block font-semibold text-slate-700">{product.name}</span>
                        {product.brand && <span className="mt-1 block text-xs text-slate-400">{product.brand}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    {product.category}
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-700">
                    ₹{product.price}
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    {product.stock === 0 ? (
                      <span className="text-red-600">Out of stock</span>
                    ) : (
                      `${product.stock} in stock`
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    {Number(product.rating || 0).toFixed(1)} / 5 (
                    {product.reviews || 0})
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.status === "Published" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(product)}
                        aria-label={`Edit ${product.name}`}
                        className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-primary"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProduct(product)}
                        aria-label={`Delete ${product.name}`}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleProducts.length === 0 && (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              No products found. Add a product or import a CSV.
            </div>
          )}
        </div>
      </section>
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form
            onSubmit={saveProduct}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId ? "Edit product" : "Add product"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Product details shown in your storefront.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Close product form"
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Product name
                <input
                  required
                  value={form.name}
                  onChange={updateField("name")}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Brand
                <input
                  value={form.brand}
                  onChange={updateField("brand")}
                  placeholder="e.g. Philips"
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Category
                <select
                  required
                  value={form.category}
                  onChange={updateField("category")}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-primary"
                >
                  <option value="">Select a category</option>
                  {productCategories
                    .filter((category) => category !== "All Products")
                    .map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Status
                <select
                  value={form.status}
                  onChange={updateField("status")}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-primary"
                >
                  <option>Published</option>
                  <option>Draft</option>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Selling price
                <input
                  required
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={updateField("price")}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Original price
                <input
                  type="number"
                  min="0"
                  value={form.originalPrice}
                  onChange={updateField("originalPrice")}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Cost price
                <input
                  type="number"
                  min="0"
                  value={form.costPrice}
                  onChange={updateField("costPrice")}
                  placeholder="Used for profit reports"
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Discount %
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.discount}
                  onChange={updateField("discount")}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Stock quantity
                <input
                  required
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={updateField("stock")}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Rating (0-5)
                <input
                  required
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={form.rating}
                  onChange={updateField("rating")}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Review count
                <input
                  required
                  type="number"
                  min="0"
                  value={form.reviews}
                  onChange={updateField("reviews")}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary"
                />
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Description
                <textarea
                  value={form.description}
                  onChange={updateField("description")}
                  rows="3"
                  className="mt-2 w-full resize-none rounded-lg border border-slate-200 p-3 outline-none focus:border-primary"
                />
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 sm:col-span-2">
                {imagePreviews.length ? <div className="flex gap-2">{imagePreviews.slice(0, 4).map((preview) => <img key={preview} src={preview} alt="Product preview" className="h-14 w-14 rounded-lg object-contain" />)}</div> : (
                  <ImagePlus className="h-5 w-5 text-primary" />
                )}
                <span>
                  {images.length ? `${images.length} images selected` : imagePreviews.length ? "Current images (choose new files to replace them)" : "Upload up to 6 product images (JPG, PNG, WEBP, max 5 MB each)"}
                </span>
                <input
                  ref={imageInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={selectImage}
                  className="hidden"
                />
              </label>
            </div>
            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
              >
                {editingId ? "Update product" : "Create product"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
