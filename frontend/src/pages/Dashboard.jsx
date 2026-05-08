import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

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

const NSE_STOCKS = new Set([
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
    "HDFC", "BAJAJ", "L&T", "HINDPETRO", "MRPL", "CHENNPETRO",
]);

const US_STOCKS = new Set([
    "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "META", "TSLA", "BRK.B", "BRK.A",
    "JPM", "V", "UNH", "XOM", "WMT", "JNJ", "MA", "PG", "HD", "CVX", "MRK", "ABBV", "PFE",
    "BAC", "KO", "AVGO", "PEP", "TMO", "COST", "MCD", "ACN", "LLY", "NFLX", "AMD", "QCOM",
    "DIS", "INTC", "CMCSA", "VZ", "T", "CRM", "ADBE", "PYPL", "ORCL", "IBM", "TXN", "HON",
    "UNP", "GE", "CAT", "BA", "MMM", "RTX", "LMT", "GD", "NOC", "SPY", "QQQ", "IWM",
    "DIA", "GLD", "SLV", "USO", "TLT", "HYG", "VTI", "VOO", "ARKK", "ARKG", "ARKF",
    "BITO", "GBTC", "ETHE",
]);

export function formatSymbol(raw) {
    const s = raw.toUpperCase().trim();
    if (s.includes(".")) return s;
    if (s.startsWith("^")) return s;
    if (NSE_STOCKS.has(s)) {
        const ALIAS = { "HDFC": "HDFCBANK.NS", "L&T": "LT.NS", "M&M": "M&M.NS", "BAJAJ": "BAJAJ-AUTO.NS" };
        return ALIAS[s] ?? (s + ".NS");
    }
    if (US_STOCKS.has(s)) return s;
    if (/^[A-Z]{1,4}$/.test(s)) return s;
    return s + ".NS";
}

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

function exchangeLabel(symbol) {
    if (!symbol) return "Listed";
    if (symbol.includes(".NS")) return "NSE";
    if (symbol.includes(".BO")) return "BSE";
    if (symbol.includes(".")) return symbol.split(".")[1];
    return "NYSE / NASDAQ";
}

function priceStr(symbol, price) {
    const isIndian = symbol?.includes(".NS") || symbol?.includes(".BO");
    const formatted = parseFloat(price || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return isIndian ? `₹${formatted}` : `$${formatted}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SignalBadge({ signal }) {
    const map = {
        BUY: { bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.3)", color: "#22c55e", icon: "▲", glow: "0 0 16px rgba(34,197,94,0.25)" },
        SELL: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", color: "#ef4444", icon: "▼", glow: "0 0 16px rgba(239,68,68,0.25)" },
        HOLD: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", color: "#f59e0b", icon: "◆", glow: "0 0 16px rgba(245,158,11,0.25)" },
    };
    const c = map[signal] ?? { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", color: "#6b7280", icon: "—", glow: "none" };
    return (
        <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: c.bg, border: `1px solid ${c.border}`, color: c.color,
            padding: "8px 20px", borderRadius: 10, fontSize: 15, fontWeight: 800,
            letterSpacing: "0.08em", boxShadow: c.glow,
        }}>
            <span style={{ fontSize: 10 }}>{c.icon}</span> {signal || "—"}
        </div>
    );
}

function DataRow({ label, value, color, last }) {
    return (
        <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 0",
            borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.05)",
        }}>
            <span style={{ color: "#6b7280", fontSize: 12, fontWeight: 500, letterSpacing: "0.01em" }}>{label}</span>
            <span style={{ color: color || "#e5e7eb", fontSize: 13, fontWeight: 600 }}>{value}</span>
        </div>
    );
}

function RSIGauge({ value, color }) {
    const v = Math.max(0, Math.min(100, value || 0));
    const r = 24, cx = 32, cy = 32, circ = 2 * Math.PI * r;
    return (
        <svg width="64" height="64" viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="5"
                strokeDasharray={`${(v / 100) * circ} ${circ}`}
                strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: "stroke-dasharray 0.6s ease", filter: `drop-shadow(0 0 4px ${color}80)` }} />
            <text x={cx} y={cy + 5} textAnchor="middle" fill="white" fontSize="13" fontWeight="800">{Math.round(v)}</text>
        </svg>
    );
}

function Skeleton({ h = 16, w = "100%", radius = 6 }) {
    return (
        <div style={{
            height: h, width: w, borderRadius: radius,
            background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.6s infinite",
        }} />
    );
}

function PriceChart({ history, positive }) {
    const [hov, setHov] = useState(null);
    if (!history || history.length < 2) {
        return (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563", fontSize: 13 }}>
                No chart data available
            </div>
        );
    }
    const W = 740, H = 210, pL = 56, pR = 16, pT = 12, pB = 28;
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
    const xLabels = [0, ...Array.from({ length: 4 }, (_, i) => Math.round((i + 1) * (vals.length - 1) / 5)), vals.length - 1].filter((v, i, a) => a.indexOf(v) === i);

    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setHov(null)}>
            <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
                <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            {Array.from({ length: 5 }).map((_, i) => {
                const y = pT + (i / 4) * iH, v = max - (i / 4) * range;
                return <g key={i}>
                    <line x1={pL} y1={y} x2={W - pR} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <text x={pL - 8} y={y + 4} textAnchor="end" fill="#374151" fontSize="10">₹{Math.round(v).toLocaleString("en-IN")}</text>
                </g>;
            })}
            <path d={area} fill="url(#cg)" />
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" filter="url(#glow)" />
            {vals.map((_, i) => <rect key={i} x={xS(i) - iW / vals.length / 2} y={pT} width={iW / vals.length} height={iH} fill="transparent" style={{ cursor: "crosshair" }} onMouseEnter={() => setHov(i)} />)}
            {hov !== null && <g>
                <line x1={xS(hov)} y1={pT} x2={xS(hov)} y2={H - pB} stroke={`${color}40`} strokeWidth="1" strokeDasharray="4,3" />
                <circle cx={xS(hov)} cy={yS(vals[hov])} r="4.5" fill={color} filter="url(#glow)" />
                <rect x={Math.min(xS(hov) - 42, W - 90)} y={yS(vals[hov]) - 30} width="88" height="22" rx="6" fill="#0a0d1a" stroke={`${color}30`} strokeWidth="1" />
                <text x={Math.min(xS(hov) + 2, W - 46)} y={yS(vals[hov]) - 15} textAnchor="middle" fill={color} fontSize="11" fontWeight="700">
                    ₹{vals[hov].toLocaleString("en-IN")}
                </text>
            </g>}
            <circle cx={lx} cy={ly} r="5" fill={color} filter="url(#glow)" />
            <circle cx={lx} cy={ly} r="5" fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="1.5">
                <animate attributeName="r" values="5;14;5" dur="2.2s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.4;0;0.4" dur="2.2s" repeatCount="indefinite" />
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
            <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#4b5563", pointerEvents: "none", display: "flex" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
            </div>
            <input
                style={{
                    width: "100%", boxSizing: "border-box",
                    paddingLeft: 40, paddingRight: 16, paddingTop: 11, paddingBottom: 11,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10, color: "#e5e7eb", fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: "0.4px", outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                placeholder="RELIANCE, TCS, AAPL, NVDA…"
                value={value}
                onChange={e => onChange(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === "Enter") { setOpen(false); onEnter(); } }}
                onFocus={e => { e.target.style.borderColor = "rgba(34,197,94,0.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.08)"; if (suggestions.length) setOpen(true); }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
            />
            {fetching && <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", display: "flex" }}>
                <svg style={{ animation: "spin 0.8s linear infinite" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
            </div>}
            {open && suggestions.length > 0 && (
                <div style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                    background: "#0c0f1a", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10, overflow: "hidden", zIndex: 200,
                    boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
                }}>
                    {suggestions.map((item, i) => (
                        <div key={i} onClick={() => { onSelect(item.symbol); setOpen(false); }}
                            style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 13, transition: "background 0.12s" }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#e5e7eb" }}>{item.symbol}</span>
                            <span style={{ color: "#6b7280", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
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
        const target = formatSymbol(raw);
        setLoad(true); setError(""); setData(null);
        try {
            const result = await fetchWithRetry(`${API_BASE}/analyze?symbol=${target}&period=${period}`);
            if (!result || result.error) throw new Error(result?.error || "Invalid symbol or no data available");
            setData(result);
        } catch (err) {
            if (err.code === "ECONNABORTED") {
                setError("Server is waking up (cold start)… retrying in 30s");
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

    return (
        <div style={{ padding: "36px 40px 80px", maxWidth: 1320, margin: "0 auto" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        body { background: #080b14; color: #e5e7eb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
        .card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          backdrop-filter: blur(8px);
        }
        .card:hover { border-color: rgba(255,255,255,0.11); }
        .metric-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: border-color 0.2s;
        }
        .metric-card:hover { border-color: rgba(255,255,255,0.12); }
        .analyze-btn {
          background: #22c55e; color: #030712;
          border: none; padding: 0 22px; height: 42px;
          border-radius: 10px; font-size: 13px; font-weight: 800;
          cursor: pointer; white-space: nowrap;
          display: inline-flex; align-items: center; gap: 8px;
          letter-spacing: 0.02em; transition: all 0.2s;
          box-shadow: 0 0 20px rgba(34,197,94,0.25);
        }
        .analyze-btn:hover:not(:disabled) { background: #16a34a; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(34,197,94,0.35); }
        .analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
        .period-btn {
          border: none; padding: 6px 14px; border-radius: 7px;
          font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s;
          letter-spacing: 0.02em;
        }
        @media (max-width:960px) { .main-grid { grid-template-columns: 1fr !important; } .metric-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width:560px) { .metric-grid { grid-template-columns: 1fr !important; } }
      `}</style>

            {/* ── Page Header ── */}
            <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.6px", margin: 0, marginBottom: 4, fontFamily: "'Syne', sans-serif" }}>
                        Stock Dashboard
                    </h1>
                    <p style={{ color: "#6b7280", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                        Search any NSE, BSE, or US-listed symbol for real-time AI analysis
                    </p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                    {["🇮🇳 NSE / BSE", "🇺🇸 NYSE / NASDAQ"].map(l => (
                        <span key={l} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "#6b7280", fontWeight: 500 }}>{l}</span>
                    ))}
                </div>
            </div>

            {/* ── Search Row ── */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
                <SearchBar
                    value={symbol}
                    onChange={setSymbol}
                    onSelect={s => { setSymbol(s); fetchStock(s); }}
                    onEnter={() => fetchStock()}
                />

                <div style={{ display: "flex", gap: 2, padding: 3, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, flexShrink: 0 }}>
                    {PERIODS.map(({ label, val }) => (
                        <button key={val} className="period-btn" onClick={() => setPeriod(val)} style={{
                            background: period === val ? "rgba(34,197,94,0.12)" : "transparent",
                            color: period === val ? "#22c55e" : "#9ca3af",
                            boxShadow: period === val ? "inset 0 0 0 1px rgba(34,197,94,0.2)" : "none",
                        }}>{label}</button>
                    ))}
                </div>

                <button className="analyze-btn" onClick={() => fetchStock()} disabled={loading || !symbol.trim()}>
                    {loading ? (
                        <>
                            <svg style={{ animation: "spin 0.8s linear infinite" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                            </svg>
                            Analyzing…
                        </>
                    ) : "Analyze →"}
                </button>
            </div>

            {/* ── Error Banner ── */}
            {error && (
                <div style={{
                    background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.22)",
                    borderRadius: 10, padding: "12px 16px", marginBottom: 20,
                    color: "#fbbf24", fontSize: 13, display: "flex", gap: 10, alignItems: "flex-start",
                }}>
                    <span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span> {error}
                </div>
            )}

            {/* ── Skeleton ── */}
            {loading && (
                <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, marginTop: 8 }}>
                    <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
                        <Skeleton h={24} w="55%" />
                        <Skeleton h={32} w="35%" />
                        <Skeleton h={38} w="60%" />
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                            {[...Array(5)].map((_, i) => <Skeleton key={i} h={14} />)}
                        </div>
                        <Skeleton h={80} radius={10} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                            <Skeleton h={36} w="28%" />
                            <Skeleton h={220} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }} className="metric-grid">
                            <Skeleton h={90} radius={12} />
                            <Skeleton h={90} radius={12} />
                            <Skeleton h={90} radius={12} />
                        </div>
                        <Skeleton h={60} radius={12} />
                    </div>
                </div>
            )}

            {/* ── Result ── */}
            {data && !data.error && !loading && (
                <div className="main-grid" style={{
                    display: "grid", gridTemplateColumns: "300px 1fr",
                    gap: 16, alignItems: "start",
                    animation: "fadeUp 0.4s ease",
                }}>

                    {/* Left panel */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                        {/* Symbol card */}
                        <div className="card" style={{ padding: 22 }}>
                            <div style={{ marginBottom: 6 }}>
                                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.6px", fontFamily: "'Syne',sans-serif" }}>
                                    {displaySym}
                                </div>
                                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                    {exchangeLabel(data.symbol)}
                                </div>
                            </div>

                            <div style={{ marginBottom: 20, marginTop: 16 }}>
                                <SignalBadge signal={data.signal} />
                            </div>

                            <div>
                                <DataRow label="Current Price" value={priceStr(data.symbol, data.summary?.price)} />
                                <DataRow label="RSI (14)" value={`${data.summary?.rsi} · ${rsiLabel}`} color={rsiColor} />
                                <DataRow label="Trend" value={data.summary?.trend} color={trendColor} />
                                <DataRow label="Confidence" value={`${conf}%`} color={confColor} />
                                <DataRow label="Volatility" value={`${data.summary?.volatility}%`} color={volColor} last />
                            </div>
                        </div>

                        {/* AI Analysis card */}
                        <div className="card" style={{
                            padding: 18,
                            borderLeft: `3px solid ${positive ? "#22c55e" : "#ef4444"}`,
                            borderRadius: "0 14px 14px 0",
                        }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                                AI Analysis
                            </div>
                            <p style={{ fontSize: 13, color: "#d1d5db", lineHeight: 1.8, margin: 0 }}>
                                {data.analysis}
                            </p>
                        </div>
                    </div>

                    {/* Right panel */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                        {/* Price + Chart */}
                        <div className="card" style={{ padding: 24 }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-1.5px", fontFamily: "'Syne',sans-serif" }}>
                                    {priceStr(data.symbol, data.summary?.price)}
                                </span>
                                <span style={{
                                    background: positive ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                                    border: `1px solid ${positive ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                                    color: positive ? "#22c55e" : "#ef4444",
                                    padding: "4px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                                }}>
                                    {positive ? "▲" : "▼"} {data.summary?.change ?? "—"}%
                                </span>
                                <span style={{ marginLeft: "auto", fontSize: 11, color: "#6b7280", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                    {PERIODS.find(p => p.val === period)?.label} chart
                                </span>
                            </div>
                            <PriceChart history={data.chart ?? data.history} positive={positive} />
                        </div>

                        {/* Metric cards */}
                        <div className="metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                            <div className="metric-card">
                                <RSIGauge value={rsi} color={rsiColor} />
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, fontWeight: 600 }}>RSI (14)</div>
                                    <div style={{ color: rsiColor, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{data.summary?.rsi}</div>
                                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{rsiLabel}</div>
                                </div>
                            </div>

                            <div className="metric-card">
                                <div style={{ fontSize: 28, flexShrink: 0 }}>{trendBull ? "📈" : "📉"}</div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, fontWeight: 600 }}>Trend</div>
                                    <div style={{ color: trendColor, fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{trendBull ? "Bullish" : "Bearish"}</div>
                                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.summary?.trend}</div>
                                </div>
                            </div>

                            <div className="metric-card">
                                <div style={{ fontSize: 28, flexShrink: 0 }}>⚡</div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, fontWeight: 600 }}>Volatility</div>
                                    <div style={{ color: volColor, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{data.summary?.volatility}%</div>
                                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{vol > 25 ? "High" : vol > 15 ? "Moderate" : "Low"}</div>
                                </div>
                            </div>
                        </div>

                        {/* Confidence bar */}
                        <div className="card" style={{ padding: "16px 20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Signal Confidence</span>
                                <span style={{ fontSize: 14, fontWeight: 800, color: confColor, fontFamily: "'JetBrains Mono',monospace" }}>{conf}%</span>
                            </div>
                            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 6, height: 8, overflow: "hidden" }}>
                                <div style={{
                                    height: "100%",
                                    width: `${conf}%`,
                                    background: conf >= 70
                                        ? "linear-gradient(90deg,#22c55e,#4ade80)"
                                        : conf >= 50
                                            ? "linear-gradient(90deg,#f59e0b,#fbbf24)"
                                            : "linear-gradient(90deg,#ef4444,#f87171)",
                                    borderRadius: 6,
                                    transition: "width 0.7s ease",
                                    boxShadow: conf >= 70 ? "0 0 8px rgba(34,197,94,0.4)" : conf >= 50 ? "0 0 8px rgba(245,158,11,0.4)" : "0 0 8px rgba(239,68,68,0.4)",
                                }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Empty state ── */}
            {!data && !loading && !error && (
                <div style={{ marginTop: 64, textAlign: "center", animation: "fadeUp 0.4s ease", padding: "0 16px" }}>
                    <div style={{ fontSize: 44, marginBottom: 14, filter: "drop-shadow(0 0 20px rgba(34,197,94,0.3))" }}>📊</div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.3px", fontFamily: "'Syne',sans-serif" }}>
                        Search a stock to begin
                    </h3>
                    <p style={{ color: "#6b7280", fontSize: 13, maxWidth: 360, margin: "0 auto 24px", lineHeight: 1.7 }}>
                        Enter a ticker symbol above to get real-time AI-powered analysis, RSI, trend signals, and more.
                    </p>

                    <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                        {QUICK_PICKS.map(({ sym, label, exchange }) => (
                            <button key={sym} onClick={() => { setSymbol(sym); fetchStock(sym); }}
                                style={{
                                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                                    color: "#9ca3af", padding: "6px 14px", borderRadius: 999,
                                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                                    fontFamily: "'JetBrains Mono',monospace", transition: "all 0.15s",
                                    display: "inline-flex", alignItems: "center", gap: 6,
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(34,197,94,0.4)"; e.currentTarget.style.color = "#22c55e"; e.currentTarget.style.background = "rgba(34,197,94,0.06)"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#9ca3af"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}>
                                <span style={{ fontSize: 9, opacity: 0.6 }}>{exchange === "US" ? "🇺🇸" : "🇮🇳"}</span>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
