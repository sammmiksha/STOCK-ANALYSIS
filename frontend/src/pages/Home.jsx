import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_BASE = "https://stockai-ts48.onrender.com";

const TICKER_SYMBOLS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "AMD", "NFLX", "INTC",
    "ORCL", "AVGO", "RELIANCE", "TCS", "INFY", "HDFCBANK", "WIPRO", "BAJFINANCE",
];

const FEATURES = [
    {
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
        title: "RSI-Based Signals",
        desc: "Relative Strength Index computed in real time. Get overbought / oversold signals with actionable thresholds.",
    },
    {
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><polyline points="17 6 23 6 23 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
        title: "Trend Detection",
        desc: "Moving average crossovers and momentum analysis identify bullish/bearish trends before they become obvious.",
    },
    {
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 20V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M12 20V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M6 20v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
        title: "Volatility Analysis",
        desc: "Historical volatility metrics help you understand risk exposure before entering any position.",
    },
    {
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
        title: "AI Summary",
        desc: "Plain-language summary of every signal, trend, and indicator so you spend less time interpreting data.",
    },
    {
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M3 9h18M9 21V9" stroke="currentColor" strokeWidth="2" /></svg>,
        title: "Multi-Timeframe",
        desc: "Switch between 1D, 1W, 1M, and 3M views. The same analysis adapts to your trading horizon.",
    },
    {
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
        title: "Confidence Score",
        desc: "Every signal comes with a confidence percentage derived from the convergence of multiple indicators.",
    },
];

// Deterministic avatar color from name
const AVATAR_COLORS = ["#7c3aed", "#0891b2", "#b45309", "#059669", "#dc2626", "#d97706", "#0e7490", "#4f46e5", "#be185d", "#065f46"];
function avatarColor(name = "") {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name = "") {
    return name.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

// ── Star Rating ───────────────────────────────────────────────────────────────
function StarRating({ count, interactive = false, onChange }) {
    const [hov, setHov] = useState(0);
    return (
        <div style={{ display: "flex", gap: 3, cursor: interactive ? "pointer" : "default" }}>
            {Array.from({ length: 5 }).map((_, i) => {
                const filled = interactive ? (hov || count) > i : count > i;
                return (
                    <svg key={i}
                        width={interactive ? 22 : 12} height={interactive ? 22 : 12}
                        viewBox="0 0 24 24"
                        fill={filled ? "#f59e0b" : "none"}
                        stroke={filled ? "#f59e0b" : "#374151"} strokeWidth="2"
                        onMouseEnter={() => interactive && setHov(i + 1)}
                        onMouseLeave={() => interactive && setHov(0)}
                        onClick={() => interactive && onChange && onChange(i + 1)}
                        style={{ transition: "all 0.1s" }}
                    >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                );
            })}
        </div>
    );
}

// ── Review Card ───────────────────────────────────────────────────────────────
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
                background: hov ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.025)",
                border: `1px solid ${hov ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: 14, padding: "20px 22px",
                display: "flex", flexDirection: "column", gap: 12,
                transition: "all 0.2s ease", cursor: "default", breakInside: "avoid",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div style={{
                    width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                    background: `${color}22`, border: `1px solid ${color}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 800, color, fontFamily: "'JetBrains Mono',monospace",
                }}>
                    {initials(review.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#e5e7eb" }}>{review.name}</span>
                        {review.role && <span style={{ fontSize: 10, color: "#4b5563" }}>· {review.role}</span>}
                    </div>
                    {dateStr && <div style={{ fontSize: 10, color: "#374151", marginTop: 2 }}>{dateStr}</div>}
                </div>
                <StarRating count={review.rating || 5} />
            </div>

            <p style={{
                fontSize: 13, color: "#9ca3af", lineHeight: 1.75, margin: 0,
                borderLeft: "2px solid rgba(255,255,255,0.07)", paddingLeft: 12,
            }}>
                "{review.text}"
            </p>

            {review.tag && (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <span style={{
                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 999, padding: "2px 10px",
                        fontSize: 10, color: "#6b7280", fontWeight: 600, letterSpacing: "0.04em",
                    }}>{review.tag}</span>
                </div>
            )}
        </div>
    );
}

// ── Shared input style ─────────────────────────────────────────────────────────
const INP = {
    width: "100%", padding: "10px 12px", boxSizing: "border-box",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 9, color: "#e5e7eb", fontSize: 13, outline: "none",
    fontFamily: "inherit", transition: "border-color 0.2s, box-shadow 0.2s",
};

// ── Submit Review Modal ───────────────────────────────────────────────────────
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
        "Options Trader", "Fundamental + Technical", "Tech-savvy User", "Beginner Investor",
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
            setError("Failed to submit. Please try again.");
        } finally { setLoading(false); }
    };

    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 1000,
                background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)",
                display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
            }}
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div style={{
                background: "#0c0f1a", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 18, padding: "32px 28px", width: "100%", maxWidth: 480,
                boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
                animation: "fadeUp 0.25s ease",
            }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                    <div>
                        <h3 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.4px", fontFamily: "'Syne',sans-serif", margin: 0, marginBottom: 4 }}>
                            Write a Review
                        </h3>
                        <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Share your experience with other traders</p>
                    </div>
                    <button onClick={onClose} style={{
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
                        borderRadius: 8, width: 32, height: 32, color: "#9ca3af", cursor: "pointer",
                        fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
                    }}>×</button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* Name + Role */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                            <label style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.09em", fontWeight: 700, display: "block", marginBottom: 7 }}>Name *</label>
                            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Arjun Mehta" style={INP} onFocus={e => { e.target.style.borderColor = "rgba(34,197,94,0.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.08)"; }} onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; e.target.style.boxShadow = "none"; }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.09em", fontWeight: 700, display: "block", marginBottom: 7 }}>Role / City</label>
                            <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Trader · Mumbai" style={INP} onFocus={e => { e.target.style.borderColor = "rgba(34,197,94,0.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.08)"; }} onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; e.target.style.boxShadow = "none"; }} />
                        </div>
                    </div>

                    {/* Rating */}
                    <div>
                        <label style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.09em", fontWeight: 700, display: "block", marginBottom: 9 }}>Rating *</label>
                        <StarRating count={form.rating} interactive onChange={r => setForm(f => ({ ...f, rating: r }))} />
                    </div>

                    {/* Tag pills */}
                    <div>
                        <label style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.09em", fontWeight: 700, display: "block", marginBottom: 9 }}>Category</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {TAGS.map(t => (
                                <button key={t} onClick={() => setForm(f => ({ ...f, tag: f.tag === t ? "" : t }))}
                                    style={{
                                        background: form.tag === t ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
                                        border: `1px solid ${form.tag === t ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
                                        color: form.tag === t ? "#22c55e" : "#6b7280",
                                        borderRadius: 999, padding: "4px 12px", fontSize: 11, fontWeight: 600,
                                        cursor: "pointer", transition: "all 0.15s",
                                    }}
                                >{t}</button>
                            ))}
                        </div>
                    </div>

                    {/* Review text */}
                    <div>
                        <label style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.09em", fontWeight: 700, display: "block", marginBottom: 7 }}>Your Review *</label>
                        <textarea
                            value={form.text}
                            onChange={e => setForm(f => ({ ...f, text: e.target.value.slice(0, 500) }))}
                            placeholder="What did you find useful? Which signals helped? How does it compare to other tools you've used?"
                            rows={4}
                            style={{ ...INP, resize: "vertical", minHeight: 100, lineHeight: 1.65 }}
                            onFocus={e => { e.target.style.borderColor = "rgba(34,197,94,0.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.08)"; }}
                            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; e.target.style.boxShadow = "none"; }}
                        />
                        <div style={{ fontSize: 10, color: form.text.length < 20 ? "#ef4444" : "#374151", marginTop: 4, textAlign: "right" }}>
                            {form.text.length} / 500
                        </div>
                    </div>

                    {error && (
                        <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#f87171" }}>
                            {error}
                        </div>
                    )}

                    <button onClick={submit} disabled={loading} style={{
                        background: "#22c55e", color: "#030712", border: "none",
                        borderRadius: 10, padding: "12px", fontSize: 13, fontWeight: 800,
                        cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
                        transition: "all 0.15s", boxShadow: "0 0 20px rgba(34,197,94,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}>
                        {loading
                            ? <><span style={{ width: 13, height: 13, border: "2px solid rgba(0,0,0,0.2)", borderTopColor: "#030712", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} /> Submitting…</>
                            : "Submit Review →"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Feature Card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc }) {
    const [hov, setHov] = useState(false);
    return (
        <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{
                background: hov ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.025)",
                border: `1px solid ${hov ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: 14, padding: "22px", transition: "all 0.2s ease", cursor: "default",
            }}
        >
            <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#22c55e", marginBottom: 14,
                boxShadow: hov ? "0 0 14px rgba(34,197,94,0.15)" : "none", transition: "box-shadow 0.2s",
            }}>{icon}</div>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 7, color: "#e5e7eb" }}>{title}</h3>
            <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.7, margin: 0 }}>{desc}</p>
        </div>
    );
}

// ── Home ──────────────────────────────────────────────────────────────────────
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

    useEffect(() => { fetchReviews(); }, []);

    const handleAnalyze = () => {
        const s = symbol.trim().toUpperCase();
        if (!s) return;
        navigate(user ? `/dashboard?symbol=${s}` : "/login");
    };

    const handleReviewSubmitted = () => {
        fetchReviews();
        setToast("Review submitted — thank you! 🎉");
        setTimeout(() => setToast(""), 4000);
    };

    const avgRating = reviews.length
        ? (reviews.reduce((a, r) => a + (r.rating || 5), 0) / reviews.length).toFixed(1)
        : "5.0";

    return (
        <div style={{ minHeight: "calc(100vh - 62px)", background: "#080b14", color: "#e5e7eb" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes tkr    { from { transform:translateX(0); } to { transform:translateX(-50%); } }
        @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin   { to { transform:rotate(360deg); } }
        @keyframes shimmer { from{background-position:-200% 0} to{background-position:200% 0} }
        @keyframes toastIn { from{opacity:0;transform:translate(-50%,12px)} to{opacity:1;transform:translate(-50%,0)} }
        .hero-input {
          flex:1; padding:11px 16px;
          background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
          border-radius:10px; color:#e5e7eb; font-size:13px;
          font-family:'JetBrains Mono',monospace; letter-spacing:0.5px; outline:none;
          transition:border-color 0.2s,box-shadow 0.2s;
        }
        .hero-input:focus { border-color:rgba(34,197,94,0.4); box-shadow:0 0 0 3px rgba(34,197,94,0.08); }
        .hero-input::placeholder { color:#4b5563; }
        .cta-btn {
          background:#22c55e; color:#030712; border:none; padding:11px 22px; border-radius:10px;
          font-size:13px; font-weight:800; cursor:pointer; white-space:nowrap;
          flex-shrink:0; letter-spacing:0.02em; transition:all 0.2s;
          box-shadow:0 0 20px rgba(34,197,94,0.25);
        }
        .cta-btn:hover { background:#16a34a; transform:translateY(-1px); box-shadow:0 4px 20px rgba(34,197,94,0.35); }
        .write-btn {
          display:inline-flex; align-items:center; gap:7px;
          background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1);
          color:#e5e7eb; padding:9px 18px; border-radius:10px;
          font-size:12px; font-weight:700; cursor:pointer; transition:all 0.15s;
        }
        .write-btn:hover { background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.18); }
        .skel {
          background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.04) 75%);
          background-size:200% 100%; animation:shimmer 1.6s infinite; border-radius:8px;
        }
      `}</style>

            {/* ── Toast ── */}
            {toast && (
                <div style={{
                    position: "fixed", bottom: 28, left: "50%",
                    background: "#0c0f1a", border: "1px solid rgba(34,197,94,0.3)",
                    borderRadius: 12, padding: "12px 24px",
                    color: "#22c55e", fontSize: 13, fontWeight: 600,
                    zIndex: 2000, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    animation: "toastIn 0.3s ease", whiteSpace: "nowrap",
                }}>
                    {toast}
                </div>
            )}

            {/* ── Modal ── */}
            {showModal && <ReviewModal user={user} onClose={() => setShowModal(false)} onSubmitted={handleReviewSubmitted} />}

            {/* ── Ticker Strip ── */}
            <div style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)", overflow: "hidden", padding: "9px 0" }}>
                <div style={{ display: "flex", gap: 36, animation: "tkr 40s linear infinite", width: "max-content" }}>
                    {[...TICKER_SYMBOLS, ...TICKER_SYMBOLS].map((s, i) => (
                        <span key={i} style={{ fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace", color: "#374151", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{s}</span>
                    ))}
                </div>
            </div>

            {/* ── Hero ── */}
            <section style={{ padding: "90px 24px 80px", textAlign: "center", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 800, height: 500, background: "radial-gradient(ellipse,rgba(34,197,94,0.07) 0%,transparent 65%)", pointerEvents: "none" }} />
                <div style={{ position: "relative", maxWidth: 680, margin: "0 auto", animation: "fadeUp 0.5s ease" }}>

                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.18)", borderRadius: 100, padding: "5px 16px", marginBottom: 32, fontSize: 11, fontWeight: 700, color: "#22c55e", letterSpacing: "0.05em" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
                        AI-POWERED · NSE · BSE · NYSE · NASDAQ
                    </div>

                    <h1 style={{ fontSize: "clamp(34px,6vw,58px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-1.5px", marginBottom: 20, fontFamily: "'Syne',sans-serif" }}>
                        Analyze any stock<br /><span style={{ color: "#22c55e" }}>in seconds</span>
                    </h1>

                    <p style={{ fontSize: 16, color: "#6b7280", lineHeight: 1.7, maxWidth: 440, margin: "0 auto 36px" }}>
                        RSI signals, trend detection, volatility analysis, and AI-generated summaries — all from a single ticker symbol.
                    </p>

                    <div style={{ display: "flex", gap: 8, maxWidth: 440, margin: "0 auto 14px" }}>
                        <input className="hero-input" placeholder="AAPL, TSLA, RELIANCE, NVDA…" value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && handleAnalyze()} />
                        <button className="cta-btn" onClick={handleAnalyze}>Analyze →</button>
                    </div>

                    <p style={{ fontSize: 11, color: "#374151", letterSpacing: "0.02em" }}>
                        {user ? "Enter any ticker symbol above to begin" : "Free account required to run analysis"}
                    </p>

                    {/* Live social proof */}
                    {reviews.length > 0 && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginTop: 28, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 100, padding: "8px 18px" }}>
                            <div style={{ display: "flex" }}>
                                {reviews.slice(0, 5).map((r, i) => {
                                    const c = avatarColor(r.name);
                                    return <div key={i} style={{ width: 24, height: 24, borderRadius: "50%", background: `${c}33`, border: "2px solid #080b14", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color: c, marginLeft: i === 0 ? 0 : -8, fontFamily: "'JetBrains Mono',monospace" }}>{initials(r.name)}</div>;
                                })}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <StarRating count={Math.round(parseFloat(avgRating))} />
                                <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{avgRating} · {reviews.length} {reviews.length === 1 ? "review" : "reviews"}</span>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ── Features ── */}
            <section style={{ padding: "60px 24px", maxWidth: 1200, margin: "0 auto" }}>
                <div style={{ marginBottom: 40 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Capabilities</p>
                    <h2 style={{ fontSize: "clamp(22px,4vw,34px)", fontWeight: 800, letterSpacing: "-0.6px", fontFamily: "'Syne',sans-serif" }}>What gets analyzed</h2>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 14 }}>
                    {FEATURES.map((f, i) => <FeatureCard key={i} {...f} />)}
                </div>
            </section>

            {/* ── Reviews ── */}
            <section style={{ padding: "60px 24px 80px", maxWidth: 1200, margin: "0 auto" }}>

                {/* Header row */}
                <div style={{ marginBottom: 36, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                    <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>User Reviews</p>
                        <h2 style={{ fontSize: "clamp(22px,4vw,34px)", fontWeight: 800, letterSpacing: "-0.6px", fontFamily: "'Syne',sans-serif" }}>What traders are saying</h2>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        {reviews.length > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 10, padding: "10px 16px" }}>
                                <div>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b", fontFamily: "'Syne',sans-serif", lineHeight: 1 }}>{avgRating}</div>
                                    <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>avg rating</div>
                                </div>
                                <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.06)" }} />
                                <div>
                                    <StarRating count={Math.round(parseFloat(avgRating))} />
                                    <div style={{ fontSize: 10, color: "#6b7280", marginTop: 3 }}>{reviews.length} real {reviews.length === 1 ? "user" : "users"}</div>
                                </div>
                            </div>
                        )}
                        <button className="write-btn" onClick={() => user ? setShowModal(true) : navigate("/login")}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                            Write a Review
                        </button>
                    </div>
                </div>

                {/* Loading state */}
                {reviewsLoading && (
                    <div style={{ columns: "3 280px", columnGap: 14 }}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} style={{ marginBottom: 14, breakInside: "avoid" }}>
                                <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                                        <div className="skel" style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0 }} />
                                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                                            <div className="skel" style={{ height: 12, width: "55%" }} />
                                            <div className="skel" style={{ height: 10, width: "35%" }} />
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                        <div className="skel" style={{ height: 11, width: "100%" }} />
                                        <div className="skel" style={{ height: 11, width: "88%" }} />
                                        <div className="skel" style={{ height: 11, width: "70%" }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!reviewsLoading && reviews.length === 0 && (
                    <div style={{ textAlign: "center", padding: "60px 24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
                        <div style={{ fontSize: 40, marginBottom: 14 }}>💬</div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, fontFamily: "'Syne',sans-serif" }}>No reviews yet</h3>
                        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20, lineHeight: 1.6 }}>Be the first to share your experience with StockAI.</p>
                        <button className="cta-btn" style={{ fontSize: 12, padding: "9px 20px" }} onClick={() => user ? setShowModal(true) : navigate("/login")}>
                            Write the first review →
                        </button>
                    </div>
                )}

                {/* Live reviews */}
                {!reviewsLoading && reviews.length > 0 && (
                    <div style={{ columns: "3 280px", columnGap: 14 }}>
                        {reviews.map((r, i) => (
                            <div key={i} style={{ marginBottom: 14, breakInside: "avoid" }}>
                                <ReviewCard review={r} />
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ── CTA ── */}
            <section style={{ padding: "0 24px 80px" }}>
                <div style={{ maxWidth: 760, margin: "0 auto", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "48px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: -80, right: -80, width: 280, height: 280, background: "radial-gradient(circle,rgba(34,197,94,0.06) 0%,transparent 70%)", pointerEvents: "none" }} />
                    <h2 style={{ fontSize: "clamp(20px,3.5vw,30px)", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 12, fontFamily: "'Syne',sans-serif" }}>
                        Ready to analyze your first stock?
                    </h2>
                    <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 28, lineHeight: 1.7 }}>
                        {user ? "Head to the dashboard and enter any ticker to get started." : "Create a free account and run your first analysis in under a minute."}
                    </p>
                    <button className="cta-btn" onClick={() => navigate(user ? "/dashboard" : "/login")} style={{ fontSize: 14, padding: "12px 28px" }}>
                        {user ? "Go to Dashboard" : "Get Started — it's free"}
                    </button>
                </div>
            </section>
        </div>
    );
}