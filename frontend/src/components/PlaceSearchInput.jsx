import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Building, GraduationCap, LandPlot, X, Loader2 } from 'lucide-react';
import { api } from '../services/api';

export function PlaceSearchInput({
  value,
  onChange,
  onSelectPlace,
  placeholder = "Search places, buildings, universities, or PIN...",
  className = "",
  inputClassName = "",
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search as user types
  useEffect(() => {
    const q = (value || '').trim();
    if (q.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.searchLocation(q);
        if (res && res.results && res.results.length > 0) {
          setSuggestions(res.results);
          setIsOpen(true);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.warn("Place search error:", err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [value]);

  function handleSelect(place) {
    if (onChange) onChange(place.name);
    if (onSelectPlace) onSelectPlace(place);
    setIsOpen(false);
  }

  function handleClear() {
    if (onChange) onChange('');
    setSuggestions([]);
    setIsOpen(false);
  }

  const getTypeIcon = (type = '') => {
    const t = type.toLowerCase();
    if (t.includes('university') || t.includes('college') || t.includes('institute') || t.includes('school')) {
      return GraduationCap;
    }
    if (t.includes('monument') || t.includes('heritage') || t.includes('temple')) {
      return LandPlot;
    }
    if (t.includes('tech') || t.includes('hub') || t.includes('business') || t.includes('commercial')) {
      return Building;
    }
    return MapPin;
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => {
            if (onChange) onChange(e.target.value);
            if (!isOpen && e.target.value.length >= 2) setIsOpen(true);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full pl-10 pr-9 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400 ${inputClassName}`}
        />

        {loading ? (
          <div className="absolute right-3">
            <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
          </div>
        ) : value ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 p-0.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Autocomplete Dropdown Menu */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-[600] overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center justify-between">
            <span>Places & Building Suggestions</span>
            <span className="text-sky-600 font-semibold">{suggestions.length} Found</span>
          </div>

          {suggestions.map((place, idx) => {
            const Icon = getTypeIcon(place.type);
            const mainName = place.name.split(',')[0];
            const subName = place.name.includes(',') ? place.name.split(',').slice(1).join(',').trim() : (place.city || place.state);

            return (
              <div
                key={idx}
                onClick={() => handleSelect(place)}
                className="p-3 text-xs hover:bg-sky-50/80 cursor-pointer flex items-start gap-2.5 transition-colors group"
              >
                <div className="w-6 h-6 rounded-lg bg-sky-100/70 text-sky-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 group-hover:text-sky-950 truncate">{mainName}</span>
                    {place.type && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-600 shrink-0">
                        {place.type}
                      </span>
                    )}
                  </div>
                  {subName && (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{subName}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
