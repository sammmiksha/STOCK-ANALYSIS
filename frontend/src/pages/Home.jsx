import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* ── Ticker symbols shown in strip ─ these are real tickers, no fake data ── */
const TICKER_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "AMD", "NFLX", "INTC", "ORCL", "AVGO"];

/* ── Real features the backend actually supports ── */
const FEATURES = [
    {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        title: "RSI-Based Signals",
        desc: "Relative Strength Index computed in real time. Get overbought / oversold signals with actionable thresholds.",
    },
    {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="17 6 23 6 23 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        title: "Trend Detection",
        desc: "Moving average crossovers and momentum analysis identify bullish/bearish trends before they become obvious.",
    },
    {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 20V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 20V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M6 20v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
        ),
        title: "Volatility Analysis",
        desc: "Historical volatility metrics help you understand risk exposure before entering any position.",
    },
    {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
        ),
        title: "AI Summary",
        desc: "Plain-language summary of every signal, trend, and indicator so you spend less time interpreting data.",
    },
    {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M3 9h18M9 21V9" stroke="currentColor" strokeWidth="2" />
            </svg>
        ),
        title: "Multi-Timeframe",
        desc: "Switch between 1D, 1W, 1M, and 3M views. The same analysis adapts to your trading horizon.",
    },
    {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        title: "Confidence Score",
        desc: "Every signal comes with a confidence percentage derived from the convergence of multiple indicators.",
    },
];

export default function Home() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [symbol, setSymbol] = useState("");
    const featuresRef = useRef(null);

    const handleAnalyze = () => {
        const s = symbol.trim().toUpperCase();
        if (!s) return;
        if (!user) {
            navigate("/login");
            return;
        }
        navigate(`/dashboard?symbol=${s}`);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") handleAnalyze();
    };

    return (
        <div style={{ minHeight: "calc(100vh - var(--navbar-h))" }}>

            {/* ── Ticker Strip ── */}
            <div style={{
                background: "var(--bg-surface)",
                borderBottom: "1px solid var(--border)",
                overflow: "hidden",
                padding: "9px 0",
            }}>
                <div style={{
                    display: "flex",
                    gap: "32px",
                    animation: "tkr 30s linear infinite",
                    width: "max-content",
                }}>
                    {[...TICKER_SYMBOLS, ...TICKER_SYMBOLS].map((s, i) => (
                        <span key={i} style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            fontFamily: "'JetBrains Mono', monospace",
                            color: "var(--text-secondary)",
                            letterSpacing: "0.5px",
                            whiteSpace: "nowrap",
                        }}>
                            {s}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── Hero ── */}
            <section style={{
                padding: "80px 24px 72px",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
            }}>
                {/* Subtle radial glow */}
                <div style={{
                    position: "absolute",
                    top: "-120px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "700px",
                    height: "500px",
                    background: "radial-gradient(ellipse, rgba(34,197,94,0.08) 0%, transparent 70%)",
                    pointerEvents: "none",
                }} />

                <div style={{ position: "relative", maxWidth: "720px", margin: "0 auto" }}>
                    <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "7px",
                        background: "rgba(34,197,94,0.08)",
                        border: "1px solid rgba(34,197,94,0.2)",
                        borderRadius: "100px",
                        padding: "5px 14px",
                        marginBottom: "28px",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "var(--green)",
                        letterSpacing: "0.3px",
                    }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s infinite" }} />
                        AI-Powered Stock Analysis
                    </div>

                    <h1 style={{
                        fontSize: "clamp(36px, 6vw, 60px)",
                        fontWeight: "800",
                        lineHeight: 1.1,
                        letterSpacing: "-1.5px",
                        marginBottom: "20px",
                        color: "var(--text-primary)",
                    }}>
                        Analyze any stock<br />
                        <span style={{ color: "var(--green)" }}>in seconds</span>
                    </h1>

                    <p style={{
                        fontSize: "17px",
                        color: "var(--text-secondary)",
                        lineHeight: 1.6,
                        marginBottom: "36px",
                        maxWidth: "480px",
                        margin: "0 auto 36px",
                    }}>
                        RSI signals, trend detection, volatility analysis, and AI-generated summaries — all from a single ticker symbol.
                    </p>

                    {/* Input + CTA */}
                    <div style={{
                        display: "flex",
                        gap: "8px",
                        maxWidth: "460px",
                        margin: "0 auto",
                    }}>
                        <input
                            className="inp"
                            placeholder="Enter symbol — AAPL, TSLA, NVDA…"
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                            onKeyDown={handleKeyDown}
                            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", letterSpacing: "0.5px" }}
                        />
                        <button
                            className="btn-primary"
                            onClick={handleAnalyze}
                            style={{ flexShrink: 0, whiteSpace: "nowrap" }}
                        >
                            Analyze
                        </button>
                    </div>

                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "14px" }}>
                        {user ? "Enter any US-listed ticker symbol above" : "Sign in required to run analysis"}
                    </p>
                </div>
            </section>

            {/* ── Features ── */}
            <section
                id="features"
                ref={featuresRef}
                style={{ padding: "64px 24px", maxWidth: "1200px", margin: "0 auto" }}
            >
                <div style={{ marginBottom: "44px" }}>
                    <p style={{ fontSize: "12px", fontWeight: "700", color: "var(--green)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "10px" }}>
                        Capabilities
                    </p>
                    <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: "800", letterSpacing: "-0.8px", color: "var(--text-primary)" }}>
                        What gets analyzed
                    </h2>
                </div>

                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "16px",
                }}>
                    {FEATURES.map((f, i) => (
                        <FeatureCard key={i} {...f} />
                    ))}
                </div>
            </section>

            {/* ── CTA Banner ── */}
            <section style={{ padding: "64px 24px" }}>
                <div style={{
                    maxWidth: "800px",
                    margin: "0 auto",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "20px",
                    padding: "48px 40px",
                    textAlign: "center",
                    position: "relative",
                    overflow: "hidden",
                }}>
                    <div style={{
                        position: "absolute",
                        top: "-80px",
                        right: "-80px",
                        width: "300px",
                        height: "300px",
                        background: "radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)",
                        pointerEvents: "none",
                    }} />
                    <h2 style={{ fontSize: "clamp(22px, 3.5vw, 32px)", fontWeight: "800", letterSpacing: "-0.6px", marginBottom: "14px" }}>
                        Ready to analyze your first stock?
                    </h2>
                    <p style={{ fontSize: "15px", color: "var(--text-secondary)", marginBottom: "28px", lineHeight: 1.6 }}>
                        {user
                            ? "Head to the dashboard and enter any ticker to get started."
                            : "Create a free account and run your first analysis in under a minute."}
                    </p>
                    <button
                        className="btn-primary"
                        onClick={() => navigate(user ? "/dashboard" : "/login")}
                        style={{ padding: "12px 28px", fontSize: "15px" }}
                    >
                        {user ? "Go to Dashboard" : "Get Started — it's free"}
                    </button>
                </div>
            </section>

        </div>
    );
}

function FeatureCard({ icon, title, desc }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: hovered ? "rgba(15,20,32,0.95)" : "var(--bg-card)",
                border: `1px solid ${hovered ? "rgba(34,197,94,0.2)" : "var(--border)"}`,
                borderRadius: "var(--radius-lg)",
                padding: "22px",
                transition: "all 0.2s ease",
                cursor: "default",
            }}
        >
            <div style={{
                width: "38px",
                height: "38px",
                borderRadius: "9px",
                background: "var(--green-dim)",
                border: "1px solid rgba(34,197,94,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--green)",
                marginBottom: "14px",
                transition: "all 0.2s",
                boxShadow: hovered ? "0 0 16px rgba(34,197,94,0.15)" : "none",
            }}>
                {icon}
            </div>
            <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "7px", color: "var(--text-primary)" }}>{title}</h3>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{desc}</p>
        </div>
    );
}