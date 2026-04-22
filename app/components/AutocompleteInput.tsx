"use client";

import { useState, useRef, useEffect } from "react";

type Props = {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
};

export default function AutocompleteInput({ value, onChange, options, placeholder }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    if (val.trim().length > 0) {
      const filtered = options.filter(o =>
        o.toLowerCase().includes(val.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelect = (option: string) => {
    onChange(option);
    setShowSuggestions(false);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        className="input-field"
        value={value}
        onChange={handleChange}
        placeholder={placeholder || "Start typing..."}
        onFocus={() => {
          if (value.trim().length > 0 && suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        autoComplete="off"
      />
      {showSuggestions && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          background: "#fff",
          border: "1.5px solid #e2e8f0",
          borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          zIndex: 200,
          maxHeight: 220,
          overflowY: "auto",
          marginTop: 4,
        }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onClick={() => handleSelect(s)}
              style={{
                padding: "10px 14px",
                fontSize: "0.88rem",
                color: "#0f172a",
                cursor: "pointer",
                borderBottom: i < suggestions.length - 1 ? "1px solid #f1f5f9" : "none",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f5f3ff")}
              onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}