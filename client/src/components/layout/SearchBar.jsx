import { ImageUp, Search } from "lucide-react";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";

const SearchBar = () => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [searchingImage, setSearchingImage] = useState(false);
  const [imageSearchError, setImageSearchError] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const submit = (event) => { event.preventDefault(); navigate(`/products?search=${encodeURIComponent(query)}`); };
  const searchImage = async (event) => {
    const image = event.target.files?.[0];
    event.target.value = "";
    if (!image) return;
    setSearchingImage(true);
    setImageSearchError("");
    setSelectedImage(image);
    setImagePreview(URL.createObjectURL(image));
    const body = new FormData();
    body.append("image", image);
    try {
      const response = await fetch(`${API_URL}/api/catalog/image-search`, { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to search this image.");
      navigate("/products", { state: { imageSearchResults: result.data || [], imageSearchLabel: image.name } });
    } catch (requestError) {
      setImageSearchError(requestError instanceof TypeError ? "Unable to reach the server." : requestError.message);
    } finally {
      setSearchingImage(false);
    }
  };
  const clearSelectedImage = () => {
    setSelectedImage(null);
    setImageSearchError("");
  };
  return (
    <div className="mx-auto max-w-[560px]">
      <form onSubmit={submit} className="flex h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 transition focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search products, categories or brands..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
        <input type="file" accept="image/*" onChange={searchImage} className="hidden" id="global-image-search" />
        <label htmlFor="global-image-search" title="Search by product image" className="cursor-pointer rounded p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-primary">{searchingImage ? <span className="block h-[18px] w-[18px] animate-spin rounded-full border-2 border-slate-300 border-t-primary" /> : <ImageUp size={18} />}</label>
        <button type="submit" aria-label="Search" className="rounded p-1.5 text-primary hover:bg-emerald-50"><Search size={18} /></button>
      </form>
      {selectedImage && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          <img src={imagePreview} alt="Selected image" className="h-10 w-10 rounded-md object-cover" />
          <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{selectedImage.name}</span>
          {searchingImage && <span className="text-xs text-primary">Searching...</span>}
          <button type="button" onClick={clearSelectedImage} aria-label="Remove selected image" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={15} />
          </button>
        </div>
      )}
      {imageSearchError && <p className="mt-1 text-xs text-red-600" role="alert">{imageSearchError}</p>}
    </div>
  );
};

export default SearchBar;