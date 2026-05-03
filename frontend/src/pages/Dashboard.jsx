import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

// ── Constants ─────────────────────────────────────────────────────────────────
const API_BASE = "https://stockai-ts48.onrender.com";

const PERIODS = [
    { label: "1D", val: "1d" },
    { label: "1W", val: "5d" },
    { label: "1M", val: "1mo" },
    { label: "3M", val: "3mo" },
    { label: "1Y", val: "1y" },
];

const QUICK_PICKS = [
    { sym: "RELIANCE", label: "RELIANCE", exchange: "NSE" },
    { sym: "TCS", label: "TCS", exchange: "NSE" },
    { sym: "INFY", label: "INFY", exchange: "NSE" },
    { sym: "HDFCBANK", label: "HDFC", exchange: "NSE" },
    { sym: "WIPRO", label: "WIPRO", exchange: "NSE" },
    { sym: "AAPL", label: "AAPL", exchange: "US" },
    { sym: "NVDA", label: "NVDA", exchange: "US" },
    { sym: "TSLA", label: "TSLA", exchange: "US" },
];

// ─────────────────────────────────────────────────────────────────────────────
//  KNOWN INDIAN NSE STOCKS
//  When a user types one of these (no suffix), append .NS automatically.
//  Everything else is sent as-is (US/global tickers don't need a suffix).
// ─────────────────────────────────────────────────────────────────────────────
const NSE_STOCKS = new Set([
    // Blue-chip / Nifty 50
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "HINDUNILVR", "SBIN", "BAJFINANCE",
    "BHARTIARTL", "KOTAKBANK", "LT", "AXISBANK", "ASIANPAINT", "MARUTI", "SUNPHARMA",
    "TITAN", "NTPC", "ONGC", "POWERGRID", "ULTRACEMCO", "WIPRO", "NESTLEIND", "TECHM",
    "DIVISLAB", "HCLTECH", "DRREDDY", "CIPLA", "COALINDIA", "BPCL", "IOC", "GRASIM",
    "ADANIENT", "ADANIPORTS", "TATAMOTORS", "TATASTEEL", "JSWSTEEL", "HINDALCO",
    "INDUSINDBK", "EICHERMOT", "BAJAJ-AUTO", "BAJAJFINSV", "HEROMOTOCO", "BRITANNIA",
    "M&M", "SBILIFE", "HDFCLIFE", "UPL", "SHREECEM", "APOLLOHOSP", "DMART", "TATACONSUM",
    "LTIM", "LTTS", "PERSISTENT", "MPHASIS", "COFORGE", "NAUKRI", "POLICYBZR", "PAYTM",
    "ZOMATO", "NYKAA", "IRCTC", "HAL", "BEL", "BHEL", "RVNL", "IRFC", "PFC", "REC",
    "CANBK", "BANKBARODA", "PNB", "IDFCFIRSTB", "FEDERALBNK", "RBLBANK", "BANDHANBNK",
    "OFSS", "INFOEDGE", "JUSTDIAL", "TANLA", "ROUTE", "SYNGENE", "AUROPHARMA", "GLAND",
    "ALKEM", "IPCALAB", "LALPATHLAB", "METROPOLIS", "FORTIS", "MAXHEALTH", "YESBANK",
    "IDEA", "TATACOMM", "MTNL", "HFCL", "TEJASNET", "RAILTEL", "MAZAGON", "COCHINSHIP",
    "TITAGARH", "IRCON", "NBCC", "NCC", "KEC", "KALPATPOWR", "TORNTPOWER", "ADANIGREEN",
    "TATAPOWER", "CESC", "SJVN", "NHPC", "GAIL", "PETRONET", "MGL", "IGL", "ATGL",
    "CONCOR", "GATEWAYDI", "BLUEDART", "MAHLOG", "VRL", "GVK", "INOX", "PVRINOX",
    "MCDOWELL-N", "RADICO", "UNITEDSPIRITS", "ITC", "GODFRYPHLP", "VST", "EMAMILTD",
    "DABUR", "MARICO", "COLPAL", "PGHH", "GILLETTE", "WHIRLPOOL", "VOLTAS", "HAVELLS",
    "CROMPTON", "ORIENT", "BLUESTAR", "SYMPHONY", "AMBER", "DIXON", "GOLDBEES", "JUNIORBEES",
    // Common aliases
    "HDFC", "BAJAJ", "L&T", "HINDPETRO", "MRPL", "CHENNPETRO",
]);

// ─────────────────────────────────────────────────────────────────────────────
//  KNOWN US/GLOBAL TICKERS  (never append .NS)
//  This is a safety net — the main logic is "if not in NSE_STOCKS → send raw"
// ─────────────────────────────────────────────────────────────────────────────
const US_STOCKS = new Set([
    "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "META", "TSLA", "BRK.B", "BRK.A",
    "JPM", "V", "UNH", "XOM", "WMT", "JNJ", "MA", "PG", "HD", "CVX", "MRK", "ABBV", "PFE",
    "BAC", "KO", "AVGO", "PEP", "TMO", "COST", "MCD", "ACN", "LLY", "NFLX", "AMD", "QCOM",
    "DIS", "INTC", "CMCSA", "VZ", "T", "CRM", "ADBE", "PYPL", "ORCL", "IBM", "TXN", "HON",
    "UNP", "GE", "CAT", "BA", "MMM", "RTX", "LMT", "GD", "NOC", "SPY", "QQQ", "IWM",
    "DIA", "GLD", "SLV", "USO", "TLT", "HYG", "VTI", "VOO", "ARKK", "ARKG", "ARKF",
    // Crypto ETFs / others
    "BITO", "GBTC", "ETHE",
]);

// ─────────────────────────────────────────────────────────────────────────────
/**
 * formatSymbol — the single source of truth for exchange routing.
 *
 * Rules (in order):
 *  1. Already has a "." suffix  → send as-is          (e.g. RELIANCE.NS, BRK.B)
 *  2. Starts with "^"           → index, send as-is   (e.g. ^NSEI)
 *  3. Known NSE stock           → append .NS
 *  4. Known US stock            → send as-is (no suffix)
 *  5. Common Indian aliases     → map to canonical .NS symbol
 *  6. Fallback heuristic:
 *       – all alpha AND len ≤ 4 chars  → likely US ticker, send raw
 *       – otherwise                    → assume NSE, append .NS
 */
export function formatSymbol(raw) {
    const s = raw.toUpperCase().trim();

    // Rule 1 — already has exchange suffix
    if (s.includes(".")) return s;

    // Rule 2 — market index
    if (s.startsWith("^")) return s;

    // Rule 3 — known Indian NSE stock
    if (NSE_STOCKS.has(s)) {
        // Special aliases that map to a different yfinance ticker
        const ALIAS = {
            "HDFC": "HDFCBANK.NS",
            "L&T": "LT.NS",
            "M&M": "M&M.NS",
            "BAJAJ": "BAJAJ-AUTO.NS",
        };
        return ALIAS[s] ?? (s + ".NS");
    }

    // Rule 4 — known US stock
    if (US_STOCKS.has(s)) return s;

    // Rule 5 — fallback heuristic
    // Short all-alpha tickers (1–4 chars) are almost certainly US NYSE/NASDAQ
    if (/^[A-Z]{1,4}$/.test(s)) return s;

    // Longer or mixed tickers default to NSE
    return s + ".NS";
}
// ─────────────────────────────────────────────────────────────────────────────

/** Retry with exponential back-off */
async function fetchWithRetry(url, retries = 3, baseDelay = 1200) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const res = await axios.get(url, { timeout: 30_000 });
            return res.data;
        } catch (err) {
            if (attempt === retries - 1) throw err;
            await new Promise(r => setTimeout(r, baseDelay * 2 ** attempt));
        }
    }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SignalBadge({ signal }) {
    const map = {
        BUY: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.35)", color: "var(--green)", icon: "▲" },
        SELL: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)", color: "var(--red)", icon: "▼" },
        HOLD: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)", color: "var(--amber)", icon: "◆" },
    };
    const c = map[signal] ?? { bg: "rgba(255,255,255,0.06)", border: "var(--border)", color: "var(--text-secondary)", icon: "—" };
    return (
        <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: c.bg, border: `1px solid ${c.border}`, color: c.color,
            padding: "8px 18px", borderRadius: 8, fontSize: 18, fontWeight: 800,
        }}>
            {c.icon} {signal || "—"}
        </div>
    );
}

function Row({ label, value, color, last }) {
    return (
        <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "9px 0",
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
                <div style={{ color: accent, fontSize: 20, fontWeight: 700 }}>{value}</div>
                {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
            </div>
        </div>
    );
}

function RSIGauge({ value, color }) {
    const v = Math.max(0, Math.min(100, value || 0));
    const r = 26, cx = 32, cy = 32, circ = 2 * Math.PI * r;
    return (
        <svg width="64" height="64" viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1f2937" strokeWidth="5" />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="5"
                strokeDasharray={`${(v / 100) * circ} ${circ}`}
                strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: "stroke-dasharray 0.5s ease" }} />
            <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize="12" fontWeight="700">
                {Math.round(v)}
            </text>
        </svg>
    );
}

function Skeleton({ h = 16, w = "100%" }) {
    return <div className="skeleton" style={{ height: h, width: w }} />;
}

function PriceChart({ history, positive }) {
    const [hov, setHov] = useState(null);
    if (!history || history.length < 2) {
        return (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
                No chart data available
            </div>
        );
    }
    const W = 740, H = 210, pL = 52, pR = 12, pT = 10, pB = 26;
    const iW = W - pL - pR, iH = H - pT - pB;
    const vals = history.map(d => d.Close ?? d.close ?? d);
    const dates = history.map(d => d.Date ?? d.date ?? null);
    const min = Math.min(...vals) * 0.998, max = Math.max(...vals) * 1.002, range = max - min;
    const xS = i => pL + (i / (vals.length - 1)) * iW;
    const yS = v => pT + iH - ((v - min) / range) * iH;
    const pts = vals.map((v, i) => `${xS(i)},${yS(v)}`).join(" ");
    const area = `M ${xS(0)},${yS(vals[0])} ` + vals.map((v, i) => `L ${xS(i)},${yS(v)}`).join(" ") + ` L ${xS(vals.length - 1)},${H - pB} L ${xS(0)},${H - pB} Z`;
    const color = positive ? "#22c55e" : "#ef4444";
    const lx = xS(vals.length - 1), ly = yS(vals[vals.length - 1]);
    const xLabels = [0, ...Array.from({ length: 4 }, (_, i) => Math.round((i + 1) * (vals.length - 1) / 5)), vals.length - 1]
        .filter((v, i, a) => a.indexOf(v) === i);
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setHov(null)}>
            <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.18" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
                <filter id="glow"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            {Array.from({ length: 5 }).map((_, i) => {
                const y = pT + (i / 4) * iH, v = max - (i / 4) * range;
                return <g key={i}><line x1={pL} y1={y} x2={W - pR} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" /><text x={pL - 6} y={y + 4} textAnchor="end" fill="#374151" fontSize="10">₹{Math.round(v).toLocaleString("en-IN")}</text></g>;
            })}
            <path d={area} fill="url(#cg)" />
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" filter="url(#glow)" />
            {vals.map((_, i) => <rect key={i} x={xS(i) - iW / vals.length / 2} y={pT} width={iW / vals.length} height={iH} fill="transparent" style={{ cursor: "crosshair" }} onMouseEnter={() => setHov(i)} />)}
            {hov !== null && <g>
                <line x1={xS(hov)} y1={pT} x2={xS(hov)} y2={H - pB} stroke={`${color}50`} strokeWidth="1" strokeDasharray="4,3" />
                <circle cx={xS(hov)} cy={yS(vals[hov])} r="4" fill={color} filter="url(#glow)" />
                <rect x={Math.min(xS(hov) - 38, W - 84)} y={yS(vals[hov]) - 28} width="82" height="22" rx="5" fill="#0c0f1a" stroke={`${color}40`} strokeWidth="1" />
                <text x={Math.min(xS(hov) + 2, W - 42)} y={yS(vals[hov]) - 13} textAnchor="middle" fill={color} fontSize="11" fontWeight="700">₹{vals[hov].toLocaleString("en-IN")}</text>
            </g>}
            <circle cx={lx} cy={ly} r="4.5" fill={color} filter="url(#glow)" />
            <circle cx={lx} cy={ly} r="4.5" fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="1.5">
                <animate attributeName="r" values="5;12;5" dur="2s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
            </circle>
            {xLabels.map(i => <text key={i} x={xS(i)} y={H - 6} textAnchor="middle" fill="#374151" fontSize="9">{dates[i] ? String(dates[i]).slice(0, 10) : `D${i}`}</text>)}
        </svg>
    );
}

function SearchBar({ value, onChange, onSelect, onEnter }) {
    const [suggestions, setSuggestions] = useState([]);
    const [fetching, setFetching] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!value || value.length < 1) { setSuggestions([]); return; }
        const t = setTimeout(async () => {
            try {
                setFetching(true);
                const res = await axios.get(`${API_BASE}/search?q=${value}`, { timeout: 8000 });
                setSuggestions(res.data.results || []);
                setOpen(true);
            } catch { setSuggestions([]); }
            finally { setFetching(false); }
        }, 350);
        return () => clearTimeout(t);
    }, [value]);

    useEffect(() => {
        const fn = e => { if (!e.target.closest(".srch-wrap")) setOpen(false); };
        document.addEventListener("mousedown", fn);
        return () => document.removeEventListener("mousedown", fn);
    }, []);

    return (
        <div className="srch-wrap" style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 480 }}>
            <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
            </div>
            <input
                className="inp"
                style={{ paddingLeft: 36, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: "0.4px" }}
                placeholder="RELIANCE, TCS, AAPL, NVDA…"
                value={value}
                onChange={e => onChange(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === "Enter") { setOpen(false); onEnter(); } }}
                onFocus={() => { if (suggestions.length) setOpen(true); }}
            />
            {fetching && <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
                <span className="spinner" style={{ width: 12, height: 12 }} />
            </div>}
            {open && suggestions.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#0c0f1a", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", zIndex: 200, boxShadow: "0 12px 32px rgba(0,0,0,0.55)" }}>
                    {suggestions.map((item, i) => (
                        <div key={i} onClick={() => { onSelect(item.symbol); setOpen(false); }}
                            style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 13, transition: "background 0.12s" }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "var(--text-primary)" }}>{item.symbol}</span>
                            <span style={{ color: "var(--text-muted)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Exchange badge helper ──────────────────────────────────────────────────────
function exchangeLabel(symbol) {
    if (!symbol) return "Listed";
    if (symbol.includes(".NS")) return "NSE";
    if (symbol.includes(".BO")) return "BSE";
    if (symbol.includes(".")) return symbol.split(".")[1];
    // No suffix → US market
    return "NYSE / NASDAQ";
}

// ── Price formatter — US stocks show $ not ₹ ─────────────────────────────────
function priceStr(symbol, price) {
    const isIndian = symbol?.includes(".NS") || symbol?.includes(".BO");
    const formatted = parseFloat(price || 0).toFixed(2);
    return isIndian ? `₹${formatted}` : `$${formatted}`;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
    const [params] = useSearchParams();
    const [symbol, setSymbol] = useState(params.get("symbol") || "");
    const [period, setPeriod] = useState("1mo");
    const [data, setData] = useState(null);
    const [loading, setLoad] = useState(false);
    const [error, setError] = useState("");

    const fetchStock = useCallback(async (sym) => {
        const raw = (sym ?? symbol).trim();
        if (!raw) return;

        // ← formatSymbol now correctly handles Indian vs global
        const target = formatSymbol(raw);

        setLoad(true); setError(""); setData(null);

        try {
            const result = await fetchWithRetry(`${API_BASE}/analyze?symbol=${target}&period=${period}`);
            if (!result || result.error) throw new Error(result?.error || "Invalid symbol or no data available");
            setData(result);
        } catch (err) {
            if (err.code === "ECONNABORTED") {
                setError("Server is waking up (cold start)… retrying in 30 s");
                setTimeout(() => fetchStock(raw), 30_000);
            } else {
                setError(err.response?.data?.error || err.response?.data?.detail || err.message || "Failed to fetch.");
            }
        } finally { setLoad(false); }
    }, [symbol, period]);

    useEffect(() => {
        const s = params.get("symbol");
        if (s) { setSymbol(s); fetchStock(s); }
    }, []);

    useEffect(() => {
        if (data?.symbol) fetchStock(data.symbol);
    }, [period]); // eslint-disable-line

    useEffect(() => { fetch(`${API_BASE}/`).catch(() => { }); }, []);

    const positive = data?.signal === "BUY";
    const rsi = parseFloat(data?.summary?.rsi) || 0;
    const rsiLabel = rsi >= 70 ? "Overbought" : rsi <= 30 ? "Oversold" : "Neutral";
    const rsiColor = rsi >= 70 ? "#ef4444" : rsi <= 30 ? "#3b82f6" : "#22c55e";
    const trendBull = (data?.summary?.trend || "").toLowerCase().includes("bull");
    const trendColor = trendBull ? "#22c55e" : "#ef4444";
    const conf = parseInt(data?.summary?.confidence, 10) || 0;
    const confColor = conf >= 70 ? "#22c55e" : conf >= 50 ? "#f59e0b" : "#ef4444";
    const vol = parseFloat(data?.summary?.volatility) || 0;
    const volColor = vol > 25 ? "#ef4444" : vol > 15 ? "#f59e0b" : "#22c55e";
    const displaySym = data?.symbol?.split(".")[0] ?? data?.symbol;
    const isIndian = data?.symbol?.includes(".NS") || data?.symbol?.includes(".BO");

    return (
        <div style={{ padding: "32px 32px 60px" }}>
            <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @media (max-width:900px)  { .dash-grid   { grid-template-columns: 1fr !important; } .metric-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width:580px)  { .metric-grid { grid-template-columns: 1fr !important; } }
      `}</style>

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 4 }}>Stock Dashboard</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Search any NSE, BSE, or US-listed symbol for real-time AI analysis.</p>
            </div>

            {/* Search row */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
                <SearchBar value={symbol} onChange={setSymbol} onSelect={s => { setSymbol(s); fetchStock(s); }} onEnter={() => fetchStock()} />

                <div style={{ display: "flex", gap: 2, padding: 3, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 }}>
                    {PERIODS.map(({ label, val }) => (
                        <button key={val} onClick={() => setPeriod(val)} style={{
                            background: period === val ? "rgba(34,197,94,0.12)" : "transparent",
                            color: period === val ? "var(--green)" : "var(--text-secondary)",
                            border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                        }}>{label}</button>
                    ))}
                </div>

                <button className="btn-primary" onClick={() => fetchStock()} disabled={loading || !symbol.trim()}>
                    {loading ? <><span className="spinner" style={{ marginRight: 7 }} />Analyzing</> : "Analyze →"}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.28)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#fbbf24", fontSize: 13, display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ flexShrink: 0 }}>⚠</span> {error}
                </div>
            )}

            {/* Skeleton */}
            {loading && (
                <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, marginTop: 20 }} className="dash-grid">
                    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                        <Skeleton h={28} w="60%" /><Skeleton h={36} w="40%" />
                        {[...Array(5)].map((_, i) => <Skeleton key={i} h={16} />)}
                        <Skeleton h={70} />
                    </div>
                    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                        <Skeleton h={24} w="30%" /><Skeleton h={300} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                            <Skeleton h={80} /><Skeleton h={80} /><Skeleton h={80} />
                        </div>
                    </div>
                </div>
            )}

            {/* Result */}
            {data && !data.error && !loading && (
                <div className="dash-grid" style={{ display: "grid", gridTemplateColumns: "minmax(280px,340px) 1fr", gap: 16, alignItems: "start", animation: "fadeUp 0.35s ease" }}>

                    {/* Left */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div className="card" style={{ padding: 20 }}>
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" }}>{displaySym}</div>
                                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{exchangeLabel(data.symbol)}</div>
                            </div>
                            <SignalBadge signal={data.signal} />
                            <div style={{ marginTop: 18 }}>
                                <Row label="Price" value={priceStr(data.symbol, data.summary?.price)} />
                                <Row label="RSI (14)" value={`${data.summary?.rsi} · ${rsiLabel}`} color={rsiColor} />
                                <Row label="Trend" value={data.summary?.trend} color={trendColor} />
                                <Row label="Confidence" value={`${conf}%`} color={confColor} />
                                <Row label="Volatility" value={`${data.summary?.volatility}%`} color={volColor} last />
                            </div>
                        </div>

                        <div className="card" style={{ padding: 16, borderLeft: `3px solid ${positive ? "#22c55e" : "#ef4444"}` }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>AI Analysis</div>
                            <p style={{ fontSize: 13, color: "#d1d5db", lineHeight: 1.75 }}>{data.analysis}</p>
                        </div>
                    </div>

                    {/* Right */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div className="card" style={{ padding: 20 }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-1px" }}>
                                    {priceStr(data.symbol, data.summary?.price)}
                                </span>
                                <span style={{ background: positive ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", border: `1px solid ${positive ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, color: positive ? "#22c55e" : "#ef4444", padding: "3px 10px", borderRadius: 6, fontSize: 13, fontWeight: 700 }}>
                                    {positive ? "▲" : "▼"} {data.summary?.change ?? "—"}%
                                </span>
                                <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
                                    {PERIODS.find(p => p.val === period)?.label}
                                </span>
                            </div>
                            <PriceChart history={data.chart ?? data.history} positive={positive} />
                        </div>

                        <div className="metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                            <Metric label="RSI (14)" value={data.summary?.rsi} sub={rsiLabel} accent={rsiColor}>
                                <RSIGauge value={rsi} color={rsiColor} />
                            </Metric>
                            <Metric label="Trend" value={trendBull ? "Bullish" : "Bearish"} sub={data.summary?.trend} accent={trendColor}>
                                <div style={{ fontSize: 26 }}>{trendBull ? "📈" : "📉"}</div>
                            </Metric>
                            <Metric label="Volatility" value={`${data.summary?.volatility}%`} sub={vol > 25 ? "High" : vol > 15 ? "Moderate" : "Low"} accent={volColor}>
                                <div style={{ fontSize: 26 }}>⚡</div>
                            </Metric>
                        </div>

                        <div className="card" style={{ padding: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Signal confidence</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: confColor }}>{conf}%</span>
                            </div>
                            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 7, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${conf}%`, background: conf >= 70 ? "linear-gradient(90deg,#22c55e,#4ade80)" : conf >= 50 ? "linear-gradient(90deg,#f59e0b,#fbbf24)" : "linear-gradient(90deg,#ef4444,#f87171)", transition: "width 0.6s ease" }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!data && !loading && !error && (
                <div style={{ marginTop: 56, textAlign: "center", animation: "fadeUp 0.4s ease", padding: "0 16px" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Search a stock to begin</h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: 13, maxWidth: 380, margin: "0 auto 10px", lineHeight: 1.6 }}>
                        Supports NSE / BSE Indian stocks and US-listed stocks.
                    </p>

                    {/* Exchange labels */}
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
                        {["🇮🇳 Indian (NSE/BSE)", "🇺🇸 US (NYSE/NASDAQ)"].map(l => (
                            <span key={l} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "var(--text-muted)" }}>{l}</span>
                        ))}
                    </div>

                    {/* Quick picks grouped */}
                    <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                        {QUICK_PICKS.map(({ sym, label, exchange }) => (
                            <button key={sym} onClick={() => { setSymbol(sym); fetchStock(sym); }}
                                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "5px 13px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5 }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(34,197,94,0.4)"; e.currentTarget.style.color = "#22c55e"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
                                <span style={{ fontSize: 9, opacity: 0.5 }}>{exchange === "US" ? "🇺🇸" : "🇮🇳"}</span>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}