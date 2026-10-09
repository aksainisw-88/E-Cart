import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

const SearchableSelect = ({ label, options, value, onChange, placeholder, className = "" }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const inputId = useId();
  const listId = useId();
  const selected = options.find((option) => String(option.value) === String(value));
  const filteredOptions = options.filter((option) => `${option.label} ${option.description || ""}`.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    const closeWhenOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("pointerdown", closeWhenOutside);
    return () => document.removeEventListener("pointerdown", closeWhenOutside);
  }, []);

  const choose = (option) => {
    onChange(option.value);
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => open ? Math.min(index + 1, filteredOptions.length - 1) : 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open && filteredOptions.length) {
      event.preventDefault();
      choose(filteredOptions[activeIndex] || filteredOptions[0]);
    }
  };

  return (
    <div ref={containerRef} className={`relative min-w-0 ${className}`}>
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id={inputId}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && filteredOptions.length && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
          value={open ? query : selected?.label || ""}
          onFocus={() => { setOpen(true); setQuery(""); setActiveIndex(-1); }}
          onChange={(event) => { setQuery(event.target.value); onChange(""); setOpen(true); setActiveIndex(0); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || `Search ${label.toLowerCase()}...`}
          autoComplete="off"
          className="h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
        <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {open && (
        <div id={listId} role="listbox" aria-label={`${label} results`} className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
          {filteredOptions.length ? filteredOptions.map((option, index) => (
            <button
              key={option.value}
              id={`${listId}-option-${index}`}
              type="button"
              role="option"
              aria-selected={String(option.value) === String(value)}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option)}
              className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left ${index === activeIndex ? "bg-slate-50" : "hover:bg-slate-50"}`}
            >
              <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-800">{option.label}</span>{option.description && <span className="mt-0.5 block truncate text-xs text-slate-500">{option.description}</span>}</span>
              {String(option.value) === String(value) && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </button>
          )) : <p className="px-3 py-4 text-center text-sm text-slate-500">No matching {label.toLowerCase()}.</p>}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;