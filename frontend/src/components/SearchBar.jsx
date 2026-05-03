import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { SEARCH_API } from "../lib/api";

export default function SearchBar({ value, onChange, onSelect, onEnter, placeholder = "Search a stock symbol…" }) {
    const [suggestions, setSuggestions] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        if (!value || value.length < 1) { setSuggestions([]); return; }
        const t = setTimeout(async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${SEARCH_API}?q=${encodeURIComponent(value)}`);
                setSuggestions(res.data.results || []);
                setOpen(true);
            } catch { setSuggestions([]); }
            finally { setLoading(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [value]);

    useEffect(() => {
        const onClick = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    return (
        <div ref={wrapRef} style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <div style={{ position: "relative" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                    className="inp"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onFocus={() => suggestions.length && setOpen(true)}
                    onKeyDown={e => { if (e.key === "Enter") { setOpen(false); onEnter(); } }}
                    placeholder={placeholder}
                    style={{ paddingLeft: 38, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: "0.4px" }}
                />
            </div>

            {open && suggestions.length > 0 && (
                <div style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                    background: "var(--bg-elevated)", border: "1px solid var(--border-strong)",
                    borderRadius: 10, maxHeight: 280, overflowY: "auto",
                    zIndex: 30, boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
                }}>
                    {suggestions.map((s, i) => (
                        <button key={i}
                            onClick={() => { onSelect(s.symbol); setOpen(false); }}
                            style={{
                                width: "100%", textAlign: "left", background: "transparent", border: "none",
                                padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center",
                                cursor: "pointer", color: "var(--text-primary)", borderBottom: i < suggestions.length - 1 ? "1px solid var(--border)" : "none",
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{s.symbol}</span>
                            <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {s.name}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {loading && (
                <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 11 }}>
                    …
                </span>
            )}
        </div>
    );
}
