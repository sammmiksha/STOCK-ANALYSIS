import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { ANALYZE_API } from "../lib/api";
import SearchBar from "../components/SearchBar";
import PriceChart from "../components/PriceChart";
import Skeleton from "../components/Skeleton";

const PERIODS = [
    { label: "1D", val: "1d" },
    { label: "1W", val: "5d" },
    { label: "1M", val: "1mo" },
    { label: "3M", val: "3mo" },
    { label: "1Y", val: "1y" },
];

export default function Dashboard() {
    const [params] = useSearchParams();
    const [symbol, setSymbol] = useState(params.get("symbol") || "");
    const [period, setPeriod] = useState("1mo");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Auto-run if URL has ?symbol=
    useEffect(() => {
        const s = params.get("symbol");
        if (s) fetchStock(s);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        fetch("https://stockai-ts48.onrender.com/");
    }, []);
    // Re-fetch when period changes (only if we already have data)
    useEffect(() => {
        if (data?.symbol) fetchStock(data.symbol);
    }, [period]);

    const fetchStock = async (sym) => {
        const target = (sym || symbol).trim();
        if (!target) return;

        try {
            setLoading(true);
            setError("");
            setData(null);

            const data = await fetchWithRetry(
                `${ANALYZE_API}?symbol=${target}&period=${period}`
            );

            if (!data || data.error) {
                throw new Error("Invalid symbol or backend issue");
            }

            setData(data);

        } catch (err) {
            if (err.code === "ECONNABORTED") {
                setError("Server is waking up... try again in 30 seconds");

                // retry automatically
                setTimeout(() => {
                    fetchStock(target);
                }, 30000);

            } else {
                setError(err.response?.data?.error || "Failed to fetch data");
            }

        } finally {
            setLoading(false);
        }
    };
    export function formatSymbol(s) {
        s = s.toUpperCase().trim();

        // If already has exchange → keep it
        if (s.includes(".")) return s;

        // Known Indian stocks (you can expand this)
        const indianStocks = ["RELIANCE", "TCS", "INFY", "HDFC", "WIPRO"];

        if (indianStocks.includes(s)) {
            return s + ".NS";
        }

        // Otherwise assume global (US)
        return s;
    }

    const positive = data ? data.signal === "BUY" : true;
    const rsi = parseFloat(data?.summary?.rsi) || 0;
    const rsiLabel = rsi >= 70 ? "Overbought" : rsi <= 30 ? "Oversold" : "Neutral";
    const rsiColor = rsi >= 70 ? "var(--red)" : rsi <= 30 ? "var(--blue)" : "var(--green)";
    const trendBull = (data?.summary?.trend || "").toLowerCase().includes("bull");
    const trendColor = trendBull ? "var(--green)" : "var(--red)";
    const conf = parseInt(data?.summary?.confidence) || 0;
    const confColor = conf >= 70 ? "var(--green)" : conf >= 50 ? "var(--amber)" : "var(--red)";
    const vol = parseFloat(data?.summary?.volatility) || 0;
    const volColor = vol > 25 ? "var(--red)" : vol > 15 ? "var(--amber)" : "var(--green)";
    const displaySymbol = data?.symbol?.includes(".")
        ? data.symbol.split(".")[0]
        : data?.symbol;

    const target = formatSymbol(sym || symbol);
    return (
        <div style={{ padding: "32px 32px 60px" }}>
            {/* ── Header ── */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 4 }}>
                    Stock Dashboard
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                    Search any listed symbol for real-time AI analysis.
                </p>
            </div>

            {/* ── Search row ── */}
            <div style={{
                display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap",
            }}>
                <SearchBar
                    value={symbol}
                    onChange={setSymbol}
                    onSelect={(s) => { setSymbol(s); fetchStock(s); }}
                    onEnter={() => fetchStock()}
                />

                <div style={{
                    display: "flex", gap: 2, padding: 3,
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: 8,
                }}>
                    {PERIODS.map(({ label, val }) => (
                        <button key={val}
                            onClick={() => setPeriod(val)}
                            style={{
                                background: period === val ? "rgba(34,197,94,0.12)" : "transparent",
                                color: period === val ? "var(--green)" : "var(--text-secondary)",
                                border: "none", padding: "6px 12px", borderRadius: 6,
                                fontSize: 12, fontWeight: 600, cursor: "pointer",
                                transition: "all 0.15s",
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <button className="btn-primary" onClick={() => fetchStock()} disabled={loading || !symbol.trim()}>
                    {loading ? <><span className="spinner" /> Analyzing</> : "Analyze →"}
                </button>
            </div>

            {/* ── Error ── */}
            {error && (
                <div style={{
                    background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)",
                    borderRadius: 10, padding: "12px 16px", marginBottom: 20,
                    color: "#fbbf24", fontSize: 13,
                }}>
                    ⚠ {error}
                </div>
            )}

            {/* ── Loading skeleton ── */}
            {loading && (
                <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, marginTop: 20 }}>
                    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                        <Skeleton h={28} w="60%" />
                        <Skeleton h={36} w="40%" />
                        {[...Array(5)].map((_, i) => <Skeleton key={i} h={16} />)}
                        <Skeleton h={70} />
                    </div>
                    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                        <Skeleton h={24} w="30%" />
                        <Skeleton h={300} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                            <Skeleton h={80} /><Skeleton h={80} /><Skeleton h={80} />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Result ── */}
            {data && !data.error && !loading && (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(280px, 340px) 1fr",
                    gap: 16, alignItems: "start",
                    animation: "fadeUp 0.35s ease",
                }} className="dash-grid">
                    {/* Left column */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div className="card" style={{ padding: 20 }}>
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" }}>

                                    <div style={{ fontSize: 22, fontWeight: 800 }}>
                                        {displaySymbol}
                                    </div>
                                </div>
                                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                                    {data.symbol?.includes(".NS") ? "NSE" : data.symbol?.includes(".") ? data.symbol.split(".")[1] : "Listed"}
                                </div>
                            </div>

                            <SignalBadge signal={data.signal} />

                            <div style={{ marginTop: 18 }}>
                                <Row label="Price" value={`₹${parseFloat(data.summary?.price || 0).toFixed(2)}`} />
                                <Row label="RSI (14)" value={`${data.summary?.rsi} · ${rsiLabel}`} color={rsiColor} />
                                <Row label="Trend" value={data.summary?.trend} color={trendColor} />
                                <Row label="Confidence" value={`${conf}%`} color={confColor} />
                                <Row label="Volatility" value={`${data.summary?.volatility}%`} color={volColor} last />
                            </div>
                        </div>

                        <div className="card" style={{
                            padding: 16,
                            borderLeft: `3px solid ${positive ? "var(--green)" : "var(--red)"}`,
                        }}>
                            <div style={{
                                fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
                                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
                            }}>
                                AI analysis
                            </div>
                            <p style={{ fontSize: 13, color: "#d1d5db", lineHeight: 1.7 }}>
                                {data.analysis}
                            </p>
                        </div>
                    </div>

                    {/* Right column */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div className="card" style={{ padding: 20 }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 18 }}>
                                <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-1px" }}>
                                    ₹{parseFloat(data.summary?.price || 0).toFixed(2)}
                                </span>
                                <span style={{
                                    background: positive ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                                    border: `1px solid ${positive ? "var(--green-border)" : "rgba(239,68,68,0.3)"}`,
                                    color: positive ? "var(--green)" : "var(--red)",
                                    padding: "3px 10px", borderRadius: 6, fontSize: 13, fontWeight: 700,
                                }}>
                                    {positive ? "▲" : "▼"} {data.summary?.change ?? "—"}%
                                </span>
                                <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
                                    {PERIODS.find(p => p.val === period)?.label}
                                </span>
                            </div>

                            <PriceChart history={data.history} positive={positive} />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }} className="metric-grid">
                            <Metric label="RSI (14)" value={data.summary?.rsi} sub={rsiLabel} accent={rsiColor}>
                                <RSIGauge value={rsi} color={rsiColor.replace("var(--green)", "#22c55e").replace("var(--red)", "#ef4444").replace("var(--blue)", "#3b82f6")} />
                            </Metric>
                            <Metric label="Trend" value={trendBull ? "Bullish" : "Bearish"}
                                sub={`EMA: ₹${data.summary?.ema ?? "—"}`} accent={trendColor}>
                                <div style={{ fontSize: 26 }}>{trendBull ? "📈" : "📉"}</div>
                            </Metric>
                            <Metric label="Volatility" value={`${data.summary?.volatility}%`}
                                sub={vol > 25 ? "High" : vol > 15 ? "Moderate" : "Low"} accent={volColor}>
                                <div style={{ fontSize: 26 }}>⚡</div>
                            </Metric>
                        </div>

                        <div className="card" style={{ padding: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                    Signal confidence
                                </span>
                                <span style={{ fontSize: 13, fontWeight: 700 }}>{conf}%</span>
                            </div>
                            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 8, overflow: "hidden" }}>
                                <div style={{
                                    height: "100%", width: `${conf}%`,
                                    background: conf >= 70 ? "linear-gradient(90deg,#22c55e,#4ade80)"
                                        : conf >= 50 ? "linear-gradient(90deg,#f59e0b,#fbbf24)"
                                            : "linear-gradient(90deg,#ef4444,#f87171)",
                                    transition: "width 0.6s ease",
                                }} />
                            </div>
                        </div>
                    </div>

                    <style>{`
            @media (max-width: 900px) {
              .dash-grid { grid-template-columns: 1fr !important; }
              .metric-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
                </div>
            )}

            {/* ── Empty state ── */}
            {!data && !loading && !error && (
                <div style={{
                    marginTop: 64, textAlign: "center", animation: "fadeUp 0.4s ease",
                    padding: "0 16px",
                }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
                        Search a stock to begin analysis
                    </h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: 13, maxWidth: 360, margin: "0 auto 24px", lineHeight: 1.6 }}>
                        Enter any listed symbol above and hit Analyze to get real-time AI insights.
                    </p>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                        {["RELIANCE", "TCS", "INFY", "HDFC", "WIPRO"].map(s => (
                            <button key={s}
                                onClick={() => { setSymbol(s); fetchStock(s); }}
                                style={{
                                    background: "var(--bg-card)", border: "1px solid var(--border)",
                                    color: "var(--text-secondary)", padding: "6px 14px",
                                    borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer",
                                    fontFamily: "'JetBrains Mono', monospace",
                                    transition: "all 0.15s",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--green-border)"; e.currentTarget.style.color = "var(--green)"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Sub-components ──
function SignalBadge({ signal }) {
    const cfg = {
        BUY: { bg: "rgba(34,197,94,0.12)", border: "var(--green-border)", color: "var(--green)", icon: "▲" },
        SELL: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", color: "var(--red)", icon: "▼" },
        HOLD: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", color: "var(--amber)", icon: "◆" },
    }[signal] || { bg: "rgba(255,255,255,0.05)", border: "var(--border)", color: "var(--text-secondary)", icon: "—" };

    return (
        <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
            padding: "8px 18px", borderRadius: 8, fontSize: 18, fontWeight: 800, letterSpacing: "-0.3px",
        }}>
            {cfg.icon} {signal || "—"}
        </div>
    );
}

function Row({ label, value, color, last }) {
    return (
        <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 0",
            borderBottom: last ? "none" : "1px solid var(--border)",
        }}>
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{label}</span>
            <span style={{ color: color || "var(--text-primary)", fontSize: 13, fontWeight: 600 }}>{value}</span>
        </div>
    );
}

function Metric({ label, value, sub, accent, children }) {
    return (
        <div className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
            {children}
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
                    {label}
                </div>
                <div style={{ color: accent, fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px" }}>{value}</div>
                {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
            </div>
        </div>
    );
}

function RSIGauge({ value, color }) {
    const v = Math.max(0, Math.min(100, value || 0));
    const r = 26, cx = 32, cy = 32, circ = 2 * Math.PI * r;
    return (
        <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1f2937" strokeWidth="5" />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="5"
                strokeDasharray={`${(v / 100) * circ} ${circ}`}
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`} />
            <text x={cx} y={cy + 4} textAnchor="middle" fill="var(--text-primary)" fontSize="12" fontWeight="700">
                {Math.round(v)}
            </text>
        </svg>
    );
}
