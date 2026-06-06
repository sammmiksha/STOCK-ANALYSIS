import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000"
    : "https://stockai-ts48.onrender.com";

const TICKER_SYMBOLS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "AMD", "NFLX", "INTC",
    "ORCL", "AVGO", "RELIANCE", "TCS", "INFY", "HDFCBANK", "WIPRO", "BAJFINANCE"
];

const TRENDING_CHIPS = [
    { sym: "NVDA", name: "Nvidia", change: "+2.4%" },
    { sym: "AAPL", name: "Apple", change: "-0.8%" },
    { sym: "RELIANCE", name: "Reliance", change: "+1.2%" },
    { sym: "TSLA", name: "Tesla", change: "+4.7%" }
];

const FEATURES = [
    {
        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
        title: "RSI Momentum Scanner",
        desc: "View Relative Strength Index (RSI) parameters to instantly identify if a stock is technically overbought or oversold.",
    },
    {
        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><polyline points="17 6 23 6 23 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
        title: "Moving Average Tracking",
        desc: "Monitor standard moving average crossovers (20-day, 50-day, 200-day) to see immediate market direction and trend changes.",
    },
    {
        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 20V10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /><path d="M12 20V4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /><path d="M6 20v-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>,
        title: "Session Volatility Limits",
        desc: "Review daily standard deviation ranges, key support levels, and resistance boundaries to help manage trade boundaries.",
    },
    {
        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" /><path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>,
        title: "Crash Protection Alerts",
        desc: "Pin your average buy price and set drop thresholds (e.g. 5%) to receive automated warnings if the price drops below target.",
    },
    {
        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2.5" /><path d="M3 9h18M9 21V9" stroke="currentColor" strokeWidth="2.5" /></svg>,
        title: "Multi-Timeframe Charts",
        desc: "Easily toggle historical price charts from a single day up to five years to map short-term swings or long-term trends.",
    },
    {
        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
        title: "Watchlists & Symbol Lookup",
        desc: "Save key stock symbols from global markets (NSE, BSE, US) to monitor technical suggestions and current prices in one place.",
    },
];

const AVATAR_COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#ef4444", "#ec4899", "#3b82f6", "#6366f1"];
function avatarColor(name = "") {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name = "") {
    return name.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function StarRating({ count, interactive = false, onChange }) {
    const [hov, setHov] = useState(0);
    return (
        <div style={{ display: "flex", gap: 4, cursor: interactive ? "pointer" : "default" }}>
            {Array.from({ length: 5 }).map((_, i) => {
                const filled = interactive ? (hov || count) > i : count > i;
                return (
                    <svg key={i}
                        width={interactive ? 24 : 14} height={interactive ? 24 : 14}
                        viewBox="0 0 24 24"
                        fill={filled ? "#fbbf24" : "none"}
                        stroke={filled ? "#fbbf24" : "rgba(255,255,255,0.25)"} strokeWidth="2"
                        onMouseEnter={() => interactive && setHov(i + 1)}
                        onMouseLeave={() => interactive && setHov(0)}
                        onClick={() => interactive && onChange && onChange(i + 1)}
                        style={{ transition: "transform 0.1s ease, fill 0.1s", transform: (hov || count) > i && interactive ? "scale(1.15)" : "none" }}
                    >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                );
            })}
        </div>
    );
}

function ReviewCard({ review }) {
    const [hov, setHov] = useState(false);
    const color = avatarColor(review.name);
    const dateStr = review.created_at
        ? new Date(review.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : null;

    return (
        <div
            onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{
                background: hov ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.015)",
                border: `1px solid ${hov ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.05)"}`,
                borderRadius: 16, padding: "22px 24px",
                display: "flex", flexDirection: "column", gap: 14,
                transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)", cursor: "default", 
                breakInside: "avoid",
                boxShadow: hov ? "0 10px 30px rgba(0,0,0,0.4)" : "none",
                transform: hov ? "translateY(-2px)" : "none",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                    width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                    background: `${color}18`, border: `1px solid ${color}35`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace",
                }}>
                    {initials(review.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: "#f3f4f6" }}>{review.name}</span>
                        {review.role && <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>· {review.role}</span>}
                    </div>
                    {dateStr && <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 2, fontWeight: 500 }}>{dateStr}</div>}
                </div>
                <StarRating count={review.rating || 5} />
            </div>

            <p style={{
                fontSize: 12.5, color: "#9ca3af", lineHeight: 1.7, margin: 0,
                borderLeft: "2px solid rgba(34,197,94,0.3)", paddingLeft: 12,
                fontStyle: "italic",
            }}>
                "{review.text}"
            </p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "#22c55e", fontWeight: 700, letterSpacing: "0.02em" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg> Verified Trader
                </span>
                {review.tag && (
                    <span style={{
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 999, padding: "2px 8px",
                        fontSize: 9.5, color: "var(--text-muted)", fontWeight: 600,
                    }}>{review.tag}</span>
                )}
            </div>
        </div>
    );
}

const INP_STYLE = {
    width: "100%", padding: "12px 14px", boxSizing: "border-box",
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 10, color: "#f3f4f6", fontSize: 13.5, outline: "none",
    fontFamily: "inherit", transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
};

function ReviewModal({ user, onClose, onSubmitted }) {
    const [form, setForm] = useState({
        name: user?.displayName || "",
        role: "",
        text: "",
        rating: 5,
        tag: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const TAGS = [
        "NSE Trader", "US Markets", "Intraday Focus", "Long-term SIP",
        "Options Focus", "Technical Investor", "Beginner Trader"
    ];

    const submit = async () => {
        if (!form.name.trim()) { setError("Please enter your name."); return; }
        if (form.text.trim().length < 20) { setError("Review must be at least 20 characters."); return; }
        setLoading(true); setError("");
        try {
            const res = await fetch(`${API_BASE}/reviews`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name.trim(),
                    role: form.role.trim(),
                    text: form.text.trim(),
                    rating: form.rating,
                    tag: form.tag,
                    created_at: new Date().toISOString(),
                    uid: user?.uid || null,
                }),
            });
            if (!res.ok) throw new Error();
            onSubmitted();
            onClose();
        } catch {
            setError("Failed to submit review. Please try again later.");
        } finally { setLoading(false); }
    };

    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 10000,
                background: "rgba(0,0,0,0.78)", backdropFilter: "blur(12px)",
                display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
            }}
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div style={{
                background: "#0a0c16", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 20, padding: "30px 28px", width: "100%", maxWidth: 460,
                boxShadow: "0 30px 70px rgba(0,0,0,0.8), 0 0 40px rgba(34,197,94,0.03)",
                animation: "fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div>
                        <h3 style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-inter, 'Inter', sans-serif)", letterSpacing: "-0.4px", margin: 0, marginBottom: 4 }}>
                            Write a Review
                        </h3>
                        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Provide feedback on our signals and charts.</p>
                    </div>
                    <button onClick={onClose} style={{
                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 8, width: 30, height: 30, color: "#9ca3af", cursor: "pointer",
                        fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                    >×</button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                            <label style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, display: "block", marginBottom: 6 }}>Name *</label>
                            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Alex Carter" style={INP_STYLE} onFocus={e => { e.target.style.borderColor = "var(--green)"; e.target.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.08)"; }} onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; e.target.style.boxShadow = "none"; }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, display: "block", marginBottom: 6 }}>Role / Location</label>
                            <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="SIP Investor · Pune" style={INP_STYLE} onFocus={e => { e.target.style.borderColor = "var(--green)"; e.target.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.08)"; }} onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; e.target.style.boxShadow = "none"; }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, display: "block", marginBottom: 6 }}>Rating *</label>
                        <StarRating count={form.rating} interactive onChange={r => setForm(f => ({ ...f, rating: r }))} />
                    </div>

                    <div>
                        <label style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, display: "block", marginBottom: 6 }}>Trading Style Tag</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                            {TAGS.map(t => (
                                <button key={t} onClick={() => setForm(f => ({ ...f, tag: f.tag === t ? "" : t }))}
                                    style={{
                                        background: form.tag === t ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)",
                                        border: `1px solid ${form.tag === t ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.06)"}`,
                                        color: form.tag === t ? "#22c55e" : "#888",
                                        borderRadius: 999, padding: "4px 10px", fontSize: 10.5, fontWeight: 600,
                                        cursor: "pointer", transition: "all 0.15s",
                                    }}
                                >{t}</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, display: "block", marginBottom: 6 }}>Review text *</label>
                        <textarea
                            value={form.text}
                            onChange={e => setForm(f => ({ ...f, text: e.target.value.slice(0, 500) }))}
                            placeholder="What do you find useful about the technical analysis, charts, or signal scoring?"
                            rows={3}
                            style={{ ...INP_STYLE, resize: "vertical", minHeight: 90, lineHeight: 1.6 }}
                            onFocus={e => { e.target.style.borderColor = "var(--green)"; e.target.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.08)"; }}
                            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; e.target.style.boxShadow = "none"; }}
                        />
                        <div style={{ fontSize: 10, color: form.text.length < 20 ? "#ef4444" : "#4b5563", marginTop: 4, textAlign: "right" }}>
                            {form.text.length} / 500 (min 20 chars)
                        </div>
                    </div>

                    {error && (
                        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#fca5a5" }}>
                            {error}
                        </div>
                    )}

                    <button onClick={submit} disabled={loading} style={{
                        background: "#22c55e", color: "#030712", border: "none",
                        borderRadius: 10, padding: "12px", fontSize: 13.5, fontWeight: 700,
                        cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.75 : 1,
                        transition: "all 0.2s", boxShadow: "0 4px 16px rgba(34,197,94,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}>
                        {loading ? <span className="spinner" /> : "Submit Review"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function FeatureCard({ icon, title, desc }) {
    const [hov, setHov] = useState(false);
    return (
        <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{
                background: hov ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.012)",
                border: `1px solid ${hov ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.05)"}`,
                borderRadius: 16, padding: "24px", transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)", cursor: "default",
                transform: hov ? "translateY(-2px)" : "none",
                boxShadow: hov ? "0 12px 30px rgba(0,0,0,0.4), 0 0 15px rgba(34,197,94,0.03)" : "none"
            }}
        >
            <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#22c55e", marginBottom: 16,
                boxShadow: hov ? "0 0 16px rgba(34,197,94,0.15)" : "none", transition: "all 0.3s"
            }}>{icon}</div>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "#f3f4f6" }}>{title}</h3>
            <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.6, margin: 0 }}>{desc}</p>
        </div>
    );
}

export default function Home() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [symbol, setSymbol] = useState("");
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [toast, setToast] = useState("");

    const fetchReviews = async () => {
        try {
            const res = await fetch(`${API_BASE}/reviews`);
            const data = await res.json();
            setReviews(Array.isArray(data) ? [...data].reverse() : []);
        } catch { setReviews([]); }
        finally { setReviewsLoading(false); }
    };

    useEffect(() => { 
        fetchReviews();
        
        const keyHandler = (e) => {
            if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
                e.preventDefault();
                const searchBar = document.getElementById("hero-search");
                if (searchBar) searchBar.focus();
            }
        };
        document.addEventListener("keydown", keyHandler);
        return () => document.removeEventListener("keydown", keyHandler);
    }, []);

    const handleAnalyze = (sym) => {
        const targetSymbol = (sym || symbol).trim().toUpperCase();
        if (!targetSymbol) return;
        navigate(user ? `/dashboard?symbol=${targetSymbol}` : "/login");
    };

    const handleReviewSubmitted = () => {
        fetchReviews();
        setToast("Review published. Thank you! 🎉");
        setTimeout(() => setToast(""), 4000);
    };

    const avgRating = reviews.length
        ? (reviews.reduce((a, r) => a + (r.rating || 5), 0) / reviews.length).toFixed(1)
        : "5.0";

    return (
        <div style={{ minHeight: "calc(100vh - var(--navbar-h))", background: "#060810", color: "#f3f4f6", overflowX: "hidden" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
                
                body {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                }
                * { box-sizing: border-box; }
                
                .hero-input {
                    flex: 1; padding: 14px 18px;
                    background: rgba(255,255,255,0.02); 
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 12px; color: #f3f4f6; font-size: 14px;
                    font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px; outline: none;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .hero-input:focus { 
                    border-color: rgba(34,197,94,0.45); 
                    box-shadow: 0 0 0 4px rgba(34,197,94,0.08);
                    background: rgba(255,255,255,0.04);
                }
                .hero-input::placeholder { color: rgba(255,255,255,0.18); }
                
                .cta-btn {
                    background: #22c55e; color: #030712; border: none; padding: 14px 26px; border-radius: 12px;
                    font-size: 14px; font-weight: 700; cursor: pointer; white-space: nowrap;
                    flex-shrink: 0; letter-spacing: 0.01em; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                    box-shadow: 0 4px 20px rgba(34,197,94,0.22);
                    display: inline-flex; align-items: center; gap: 6px;
                }
                .cta-btn:hover { 
                    background: #16a34a; 
                    transform: translateY(-1px); 
                    box-shadow: 0 6px 24px rgba(34,197,94,0.32); 
                }
                
                .chip-badge {
                    background: rgba(255,255,255,0.015);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 20px;
                    padding: 5px 12px;
                    font-size: 11.5px;
                    font-weight: 500;
                    color: #9ca3af;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }
                .chip-badge:hover {
                    background: rgba(34,197,94,0.05);
                    border-color: rgba(34,197,94,0.25);
                    color: #22c55e;
                    transform: translateY(-1px);
                }
                
                .write-btn {
                    display: inline-flex; align-items: center; gap: 8px;
                    background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);
                    color: #f3f4f6; padding: 10px 20px; border-radius: 11px;
                    font-size: 12.5px; font-weight: 600; cursor: pointer; transition: all 0.2s;
                }
                .write-btn:hover { 
                    background: rgba(255,255,255,0.05); 
                    border-color: rgba(255,255,255,0.18); 
                }
                
                .skel {
                    background: linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 75%);
                    background-size: 200% 100%; animation: shimmer 1.6s infinite; border-radius: 10px;
                }
                
                .hero-grid-overlay {
                    position: absolute; inset: 0;
                    background-image: 
                        linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px);
                    background-size: 40px 40px;
                    background-position: center top;
                    mask-image: radial-gradient(circle at center, black 40%, transparent 80%);
                    -webkit-mask-image: radial-gradient(circle at center, black 40%, transparent 80%);
                    pointer-events: none;
                }

                .hero-grid {
                    position: relative;
                    max-width: 760px;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                }

                .hero-search-wrap {
                    display: flex;
                    gap: 10px;
                    width: 100%;
                    max-width: 520px;
                    margin: 0 auto 16px;
                    position: relative;
                }

                .trust-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 40px;
                    align-items: center;
                }

                @media (max-width: 820px) {
                    .trust-grid {
                        grid-template-columns: 1fr;
                        gap: 24px;
                    }
                }

                @media (max-width: 480px) {
                    .hero-search-wrap {
                        flex-direction: column;
                    }
                    .hero-search-wrap .cta-btn {
                        width: 100%;
                        justify-content: center;
                    }
                    .hero-search-wrap .hero-input {
                        width: 100%;
                    }
                    .hero-search-slash {
                        display: none !important;
                    }
                }
            `}</style>

            {toast && (
                <div style={{
                    position: "fixed", bottom: 28, left: "50%",
                    transform: "translateX(-50%)",
                    background: "#0c0f1a", border: "1px solid rgba(34,197,94,0.3)",
                    borderRadius: 12, padding: "12px 24px",
                    color: "#22c55e", fontSize: 13, fontWeight: 600,
                    zIndex: 20000, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    animation: "toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)", whiteSpace: "nowrap",
                }}>
                    {toast}
                </div>
            )}

            {showModal && <ReviewModal user={user} onClose={() => setShowModal(false)} onSubmitted={handleReviewSubmitted} />}

            <div style={{ background: "rgba(255,255,255,0.01)", borderBottom: "1px solid rgba(255,255,255,0.04)", overflow: "hidden", padding: "10px 0" }}>
                <div style={{ display: "flex", gap: 40, animation: "tkr 45s linear infinite", width: "max-content" }}>
                    {[...TICKER_SYMBOLS, ...TICKER_SYMBOLS].map((s, i) => (
                        <span key={i} style={{ fontSize: 11.5, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.18)", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
                            {s} <span style={{ color: "#22c55e", marginLeft: 4 }}>•</span>
                        </span>
                    ))}
                </div>
            </div>

            <section style={{ padding: "85px 24px 70px", textAlign: "center", position: "relative", overflow: "hidden" }}>
                <div className="hero-grid-overlay" />
                <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 900, height: 500, background: "radial-gradient(ellipse, rgba(34,197,94,0.05) 0%, transparent 60%)", pointerEvents: "none" }} />
                
                <div className="hero-grid">
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.18)", borderRadius: 100, padding: "5px 14px", marginBottom: 24, fontSize: 11.5, fontWeight: 700, color: "#22c55e", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
                        Technical Scanners & Portfolio Pin Alerts
                    </div>

                    <h1 style={{ fontSize: "clamp(34px, 5.2vw, 54px)", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-1.2px", marginBottom: 20, fontFamily: "var(--font-inter, 'Inter', sans-serif)", color: "#f3f4f6" }}>
                        Analyze any stock<br /><span style={{ background: "linear-gradient(90deg, #22c55e, #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>in seconds</span>
                    </h1>

                    <p style={{ fontSize: 15, color: "#9ca3af", lineHeight: 1.65, maxWidth: 520, margin: "0 auto 30px" }}>
                        RSI momentum tracking, dynamic moving average crossovers, and volatility metrics synthesized with automated email crash-alert warnings.
                    </p>

                    <div className="hero-search-wrap">
                        <input 
                            id="hero-search"
                            className="hero-input" 
                            placeholder="Search symbol (AAPL, NVDA, RELIANCE...)" 
                            value={symbol} 
                            onChange={e => setSymbol(e.target.value.toUpperCase())} 
                            onKeyDown={e => e.key === "Enter" && handleAnalyze()} 
                        />
                        <div className="hero-search-slash" style={{ position: "absolute", right: 140, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, color: "#6b7280", pointerEvents: "none" }}>/</div>
                        <button className="cta-btn" onClick={() => handleAnalyze()}>Analyze →</button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em" }}>Trending:</span>
                        {TRENDING_CHIPS.map(c => (
                            <button key={c.sym} className="chip-badge" onClick={() => { setSymbol(c.sym); handleAnalyze(c.sym); }}>
                                <span style={{ color: "#f3f4f6", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{c.sym}</span>
                                <span style={{ color: c.change.startsWith("+") ? "#22c55e" : "#ef4444", fontSize: 10, fontWeight: 700 }}>{c.change}</span>
                            </button>
                        ))}
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", margin: "0 4px" }}>|</span>
                        <a href="https://finance.yahoo.com/lookup" target="_blank" rel="noopener noreferrer" style={{ color: "#22c55e", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em", textDecoration: "none", transition: "color 0.15s" }}
                           onMouseEnter={e => e.currentTarget.style.color = "#16a34a"}
                           onMouseLeave={e => e.currentTarget.style.color = "#22c55e"}>
                            Lookup Symbols ↗
                        </a>
                    </div>

                    {reviews.length > 0 && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 100, padding: "6px 16px" }}>
                            <div style={{ display: "flex" }}>
                                {reviews.slice(0, 4).map((r, i) => {
                                    const c = avatarColor(r.name);
                                    return <div key={i} style={{ width: 22, height: 22, borderRadius: "50%", background: `${c}22`, border: "2px solid #060810", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: c, marginLeft: i === 0 ? 0 : -6, fontFamily: "'JetBrains Mono', monospace" }}>{initials(r.name)}</div>;
                                })}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <StarRating count={Math.round(parseFloat(avgRating))} />
                                <span style={{ fontSize: 11.5, color: "#9ca3af", fontWeight: 600 }}>{avgRating} · {reviews.length} {reviews.length === 1 ? "review" : "reviews"}</span>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <section style={{ padding: "60px 24px", maxWidth: 1200, margin: "0 auto" }}>
                <div style={{ marginBottom: 36, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>What You Can Do</p>
                        <h2 style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 800, letterSpacing: "-0.6px", fontFamily: "var(--font-inter, 'Inter', sans-serif)", margin: 0 }}>Core Features & Utilities</h2>
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--text-muted)", maxWidth: 380, margin: 0, lineHeight: 1.6 }}>
                        Stock Analysis provides a direct, technical dashboard to track stock performance, calculate safety ranges, and set automated warnings without the noise.
                    </p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16 }}>
                    {FEATURES.map((f, i) => <FeatureCard key={i} {...f} />)}
                </div>
            </section>

            <section style={{ padding: "40px 24px 60px", maxWidth: 1200, margin: "0 auto" }}>
                <div className="trust-grid" style={{ 
                    background: "linear-gradient(135deg, rgba(11, 15, 26, 0.4) 0%, rgba(6, 8, 16, 0.8) 100%)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    borderRadius: 20,
                    padding: "36px 40px",
                    alignItems: "center"
                }}>
                    <div>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(3b, 130, 246, 0.08)", border: "1px solid rgba(3b, 130, 246, 0.22)", borderRadius: 100, padding: "4px 12px", marginBottom: 16, fontSize: 10.5, fontWeight: 700, color: "#3b82f6", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                            🔒 Enterprise Security
                        </div>
                        <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", fontFamily: "var(--font-inter, 'Inter', sans-serif)", margin: 0, marginBottom: 12 }}>
                            Engineered for Safety & Data Integrity
                        </h2>
                        <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.65, margin: 0 }}>
                            Platform protection is active across both the client application and computing layer. We prioritize secure authentication, input sanitization, and structured API queries.
                        </p>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 14, padding: 20 }}>
                            <div style={{ fontSize: 18, marginBottom: 8 }}>🔑</div>
                            <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 6px 0", color: "#f3f4f6" }}>Secure Auth</h4>
                            <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>Firebase secure tokens protect access to user accounts, metrics, and profiles.</p>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 14, padding: 20 }}>
                            <div style={{ fontSize: 18, marginBottom: 8 }}>🛡️</div>
                            <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 6px 0", color: "#f3f4f6" }}>XSS Shield</h4>
                            <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>Backend Pydantic constraints and string escaping prevent stored scripts in public reviews.</p>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 14, padding: 20 }}>
                            <div style={{ fontSize: 18, marginBottom: 8 }}>⚡</div>
                            <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 6px 0", color: "#f3f4f6" }}>Rate Limiter</h4>
                            <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>Sliding-window IP limit thresholds defend computations against scraping or resource depletion.</p>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 14, padding: 20 }}>
                            <div style={{ fontSize: 18, marginBottom: 8 }}>📦</div>
                            <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 6px 0", color: "#f3f4f6" }}>Persisted State</h4>
                            <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>Safe file-based storage ensures your user configurations survive service updates.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section style={{ padding: "40px 24px 70px", maxWidth: 1200, margin: "0 auto" }}>
                
                <div style={{ marginBottom: 36, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                    <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Community Feedback</p>
                        <h2 style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 800, letterSpacing: "-0.6px", fontFamily: "var(--font-inter, 'Inter', sans-serif)", margin: 0 }}>Verified Trader Reviews</h2>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        {reviews.length > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)", borderRadius: 12, padding: "8px 14px" }}>
                                <div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: "#fbbf24", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{avgRating}</div>
                                    <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2, fontWeight: 600 }}>rating</div>
                                </div>
                                <div style={{ width: 1, height: 26, background: "rgba(255,255,255,0.06)" }} />
                                <div>
                                    <StarRating count={Math.round(parseFloat(avgRating))} />
                                    <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 3, fontWeight: 600 }}>{reviews.length} total reviews</div>
                                </div>
                            </div>
                        )}
                        <button className="write-btn" onClick={() => user ? setShowModal(true) : navigate("/login")}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                            Write a Review
                        </button>
                    </div>
                </div>

                {reviewsLoading && (
                    <div style={{ columns: "3 280px", columnGap: 16 }}>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} style={{ marginBottom: 16, breakInside: "avoid" }}>
                                <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <div className="skel" style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0 }} />
                                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                                            <div className="skel" style={{ height: 12, width: "60%" }} />
                                            <div className="skel" style={{ height: 10, width: "40%" }} />
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                                        <div className="skel" style={{ height: 11, width: "100%" }} />
                                        <div className="skel" style={{ height: 11, width: "90%" }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!reviewsLoading && reviews.length === 0 && (
                    <div style={{ textAlign: "center", padding: "50px 24px", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20 }}>
                        <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-inter, 'Inter', sans-serif)" }}>No reviews yet</h3>
                        <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 18, lineHeight: 1.5 }}>Be the first to share your experience with Stock Analysis.</p>
                        <button className="cta-btn" style={{ fontSize: 12, padding: "8px 18px" }} onClick={() => user ? setShowModal(true) : navigate("/login")}>
                            Write the first review
                        </button>
                    </div>
                )}

                {!reviewsLoading && reviews.length > 0 && (
                    <div style={{ columns: "3 280px", columnGap: 16 }}>
                        {reviews.map((r, i) => (
                            <div key={i} style={{ marginBottom: 16, breakInside: "avoid" }}>
                                <ReviewCard review={r} />
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section style={{ padding: "0 24px 80px" }}>
                <div style={{ 
                    maxWidth: 860, margin: "0 auto", 
                    background: "linear-gradient(135deg, rgba(12, 15, 26, 0.7) 0%, rgba(6, 8, 16, 0.9) 100%)", 
                    border: "1px solid rgba(255,255,255,0.06)", borderRadius: 24, padding: "48px 40px", 
                    textAlign: "center", position: "relative", overflow: "hidden",
                    boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
                }}>
                    <div style={{ position: "absolute", top: -80, right: -80, width: 280, height: 280, background: "radial-gradient(circle, rgba(34,197,94,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />
                    <h2 style={{ fontSize: "clamp(20px, 3.5vw, 28px)", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 12, fontFamily: "var(--font-inter, 'Inter', sans-serif)", color: "#f3f4f6" }}>
                        Ready to analyze your first stock?
                    </h2>
                    <p style={{ fontSize: 13.5, color: "#9ca3af", marginBottom: 28, lineHeight: 1.6, maxWidth: 460, margin: "0 auto 28px" }}>
                        {user ? "Navigate to the analysis dashboard to begin searching symbols." : "Create your account today and gain immediate access to technical indicator signals."}
                    </p>
                    <button className="cta-btn" onClick={() => navigate(user ? "/dashboard" : "/login")} style={{ fontSize: 13.5, padding: "12px 28px" }}>
                        {user ? "Go to Dashboard" : "Get Started — it's free"}
                    </button>
                </div>
            </section>
        </div>
    );
}