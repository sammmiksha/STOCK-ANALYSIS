import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Bar,
    ComposedChart
} from "recharts";

const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000"
    : "https://stockai-ts48.onrender.com";

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
    if (s.includes(".") || s.includes("=") || s.includes("-") || s.startsWith("^")) {
        return s;
    }
    if (NSE_STOCKS.has(s)) {
        const ALIAS = { "HDFC": "HDFCBANK.NS", "L&T": "LT.NS", "M&M": "M&M.NS", "BAJAJ": "BAJAJ-AUTO.NS" };
        return ALIAS[s] ?? (s + ".NS");
    }
    if (US_STOCKS.has(s)) return s;
    // US tickers are typically 1-5 letters
    if (/^[A-Z]{1,5}$/.test(s)) return s;
    // Forex / Crypto / other instruments are typically 6 characters (e.g. EURUSD, BTCUSD)
    if (/^[A-Z]{6}$/.test(s)) return s;
    
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
    if (price === undefined || price === null) return "—";
    const isIndian = symbol?.includes(".NS") || symbol?.includes(".BO");
    const formatted = parseFloat(price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return isIndian ? `₹${formatted}` : `$${formatted}`;
}

function SignalBadge({ signal }) {
    const map = {
        BUY: { bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.3)", color: "#22c55e", icon: "▲", glow: "0 0 16px rgba(34,197,94,0.2)" },
        SELL: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", color: "#ef4444", icon: "▼", glow: "0 0 16px rgba(239,68,68,0.2)" },
        HOLD: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", color: "#f59e0b", icon: "◆", glow: "0 0 16px rgba(245,158,11,0.2)" },
    };
    const c = map[signal] ?? { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", color: "#6b7280", icon: "—", glow: "none" };
    return (
        <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: c.bg, border: `1px solid ${c.border}`, color: c.color,
            padding: "8px 20px", borderRadius: 10, fontSize: 14, fontWeight: 800,
            letterSpacing: "0.06em", boxShadow: c.glow,
        }}>
            <span style={{ fontSize: 10 }}>{c.icon}</span> {signal || "—"}
        </div>
    );
}

function MetricItem({ label, value, color }) {
    return (
        <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12,
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 4
        }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: color || "#f3f4f6", fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
        </div>
    );
}

function InteractiveChart({ history, positive, symbol }) {
    if (!history || history.length < 2) {
        return (
            <div style={{ height: 250, display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563", fontSize: 13 }}>
                No chart data available
            </div>
        );
    }

    const chartData = history.map(d => ({
        date: d.date,
        price: d.close,
        open: d.open,
        high: d.high,
        low: d.low,
        volume: d.volume
    }));

    const color = positive ? "#22c55e" : "#ef4444";
    const volumeColor = "rgba(255, 255, 255, 0.08)";

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div style={{
                    background: "rgba(10, 13, 26, 0.95)",
                    border: `1px solid rgba(255,255,255,0.08)`,
                    borderRadius: 10,
                    padding: "12px 14px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    fontSize: 12,
                    fontFamily: "var(--font-inter, 'Inter', sans-serif)"
                }}>
                    <p style={{ margin: "0 0 6px 0", fontWeight: 700, color: "#9ca3af" }}>{data.date}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                            <span style={{ color: "var(--text-muted)" }}>Close:</span>
                            <span style={{ fontWeight: 800, color: "#f3f4f6" }}>{priceStr(symbol, data.price)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                            <span style={{ color: "var(--text-muted)" }}>Open:</span>
                            <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{priceStr(symbol, data.open)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                            <span style={{ color: "var(--text-muted)" }}>Range:</span>
                            <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{priceStr(symbol, data.low)} - {priceStr(symbol, data.high)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginTop: 4, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 4 }}>
                            <span style={{ color: "var(--text-muted)" }}>Volume:</span>
                            <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{data.volume.toLocaleString("en-IN")}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    const prices = chartData.map(d => d.price);
    const minPrice = Math.min(...prices) * 0.99;
    const maxPrice = Math.max(...prices) * 1.01;
    const volumes = chartData.map(d => d.volume);
    const maxVolume = Math.max(...volumes) || 1;

    return (
        <div style={{ width: "100%", height: 260, position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.16} />
                            <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis 
                        dataKey="date" 
                        tickLine={false} 
                        axisLine={false} 
                        tick={{ fill: "#4b5563", fontSize: 9 }} 
                        dy={6}
                    />
                    <YAxis 
                        yAxisId="price"
                        domain={[minPrice, maxPrice]}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#4b5563", fontSize: 9 }}
                        orientation="left"
                    />
                    <YAxis 
                        yAxisId="volume"
                        domain={[0, maxVolume * 4.5]}
                        tickLine={false}
                        axisLine={false}
                        hide={true}
                        orientation="right"
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1, strokeDasharray: "3 3" }} />
                    <Area 
                        yAxisId="price"
                        type="monotone" 
                        dataKey="price" 
                        stroke={color} 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#chartGrad)"
                    />
                    <Bar 
                        yAxisId="volume"
                        dataKey="volume" 
                        fill={volumeColor} 
                        radius={[2, 2, 0, 0]}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

function IndicatorsTable({ summary, symbol }) {
    const indicators = [
        {
            name: "RSI (14) Momentum",
            value: summary.rsi,
            status: summary.rsi >= 70 ? "Overbought" : summary.rsi <= 30 ? "Oversold" : "Neutral",
            color: summary.rsi >= 70 ? "#ef4444" : summary.rsi <= 30 ? "#3b82f6" : "#22c55e",
            desc: "Identifies momentum speed and overextended levels."
        },
        {
            name: "MACD Crossover",
            value: `Hist: ${summary.macd_hist}`,
            status: summary.macd > summary.macd_signal ? "Bullish Alignment" : "Bearish Trend",
            color: summary.macd > summary.macd_signal ? "#22c55e" : "#ef4444",
            desc: "Signals trend direction shifts via moving average crossovers."
        },
        {
            name: "Moving Averages Crossover",
            value: `20 MA: ${priceStr(symbol, summary.ma_20)}`,
            status: summary.ma_20 > summary.ma_50 ? "MA_20 > MA_50 (Bullish)" : "MA_20 < MA_50 (Bearish)",
            color: summary.ma_20 > summary.ma_50 ? "#22c55e" : "#ef4444",
            desc: "Evaluates trend alignment across short and medium horizons."
        },
        {
            name: "Bollinger Bands Boundaries",
            value: `Middle: ${priceStr(symbol, summary.bb_middle)}`,
            status: summary.price >= summary.bb_upper ? "Upper Band Touched" : summary.price <= summary.bb_lower ? "Lower Band Touched" : "Inside Bands (Normal)",
            color: (summary.price >= summary.bb_upper || summary.price <= summary.bb_lower) ? "#fbbf24" : "#22c55e",
            desc: "Measures statistical price deviation compared to volatility."
        }
    ];

    return (
        <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12.5 }}>
                <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
                        <th style={{ padding: "10px 8px", fontWeight: 600 }}>Indicator</th>
                        <th style={{ padding: "10px 8px", fontWeight: 600 }}>Value</th>
                        <th style={{ padding: "10px 8px", fontWeight: 600 }}>Status</th>
                        <th style={{ padding: "10px 8px", fontWeight: 600 }} className="print-hide">Details</th>
                    </tr>
                </thead>
                <tbody>
                    {indicators.map((ind, idx) => (
                        <tr key={idx} style={{ borderBottom: idx === indicators.length - 1 ? "none" : "1px solid rgba(255,255,255,0.04)" }}>
                            <td style={{ padding: "12px 8px", fontWeight: 700, color: "#f3f4f6" }}>{ind.name}</td>
                            <td style={{ padding: "12px 8px", fontFamily: "'JetBrains Mono', monospace" }}>{ind.value}</td>
                            <td style={{ padding: "12px 8px", fontWeight: 700, color: ind.color }}>{ind.status}</td>
                            <td style={{ padding: "12px 8px", color: "var(--text-muted)", fontSize: 11.5 }} className="print-hide">{ind.desc}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function WatchlistWidget({ symbols, activeSym, onSelect, onRemove, loading }) {
    return (
        <div className="card print-hide" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 13.5, fontWeight: 800, fontFamily: "'Inter', sans-serif", margin: 0 }}>My Watchlist</h3>
                <span style={{ fontSize: 10, background: "rgba(255,255,255,0.04)", padding: "2px 8px", borderRadius: 999, color: "var(--text-muted)", fontWeight: 700 }}>{symbols.length}</span>
            </div>
            
            {loading && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{
                        height: 36, borderRadius: 8,
                        background: "linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 75%)",
                        backgroundSize: "200% 100%", animation: "shimmer 1.6s infinite"
                    }} />
                </div>
            )}
            
            {!loading && symbols.length === 0 && (
                <div style={{ padding: "22px 10px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 10 }}>
                    <span style={{ fontSize: 20, display: "block", marginBottom: 6, color: "var(--text-muted)" }}>☆</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5, display: "block" }}>
                        Your watchlist is empty. Toggle the star on any stock dashboard to save it.
                    </span>
                </div>
            )}
            
            {!loading && symbols.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                    {symbols.map(sym => {
                        const isActive = sym === activeSym;
                        return (
                            <div key={sym} 
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "9px 12px",
                                    background: isActive ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.015)",
                                    border: `1px solid ${isActive ? "rgba(34,197,94,0.22)" : "rgba(255,255,255,0.05)"}`,
                                    borderRadius: 9,
                                    cursor: "pointer",
                                    transition: "all 0.15s"
                                }}
                                onClick={() => onSelect(sym)}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}
                            >
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: isActive ? "#22c55e" : "#e5e7eb" }}>
                                    {sym.split(".")[0]}
                                </span>
                                
                                <button 
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "rgba(239, 68, 68, 0.45)",
                                        fontSize: 14,
                                        cursor: "pointer",
                                        padding: "0 4px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        transition: "color 0.15s"
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.color = "rgba(239, 68, 68, 1)"}
                                    onMouseLeave={e => e.currentTarget.style.color = "rgba(239, 68, 68, 0.45)"}
                                    onClick={(e) => { e.stopPropagation(); onRemove(sym); }}
                                    title="Remove from watchlist"
                                >
                                    ×
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function Skeleton({ h = 16, w = "100%", radius = 6 }) {
    return (
        <div style={{
            height: h, width: w, borderRadius: radius,
            background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.6s infinite",
        }} />
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
        <div className="srch-wrap" style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 440 }}>
            <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#4b5563", pointerEvents: "none", display: "flex" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
            </div>
            <input
                style={{
                    width: "100%", boxSizing: "border-box",
                    paddingLeft: 40, paddingRight: 16, paddingTop: 11, paddingBottom: 11,
                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 10, color: "#e5e7eb", fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: "0.4px", outline: "none", transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                placeholder="RELIANCE, TCS, AAPL, NVDA…"
                value={value}
                onChange={e => onChange(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === "Enter") { setOpen(false); onEnter(); } }}
                onFocus={e => { e.target.style.borderColor = "rgba(34,197,94,0.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.08)"; if (suggestions.length) setOpen(true); }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; e.target.style.boxShadow = "none"; }}
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

export default function Dashboard() {
    const { user } = useAuth();
    const [params] = useSearchParams();
    const [symbol, setSymbol] = useState(params.get("symbol") || "");
    const [period, setPeriod] = useState("1mo");
    const [data, setData] = useState(null);
    const [loading, setLoad] = useState(false);
    const [error, setError] = useState("");

    const [watchlist, setWatchlist] = useState([]);
    const [watchlistLoading, setWatchlistLoading] = useState(false);

    const [alerts, setAlerts] = useState([]);
    const [alertBuyPrice, setAlertBuyPrice] = useState("");
    const [alertThreshold, setAlertThreshold] = useState("5.0");
    const [alertEmail, setAlertEmail] = useState(user?.email || "");
    const [alertSaving, setAlertSaving] = useState(false);

    const fetchWatchlist = useCallback(async () => {
        if (!user?.uid) return;
        try {
            setWatchlistLoading(true);
            const res = await axios.get(`${API_BASE}/watchlist?user=${user.uid}`);
            setWatchlist(res.data.symbols || []);
        } catch (err) {
            console.error("Failed to fetch watchlist:", err);
        } finally {
            setWatchlistLoading(false);
        }
    }, [user]);

    const fetchAlerts = useCallback(async () => {
        if (!user?.uid) return;
        try {
            const res = await axios.get(`${API_BASE}/alerts?user=${user.uid}`);
            setAlerts(res.data.alerts || []);
        } catch (err) {
            console.error("Failed to fetch alerts:", err);
        }
    }, [user]);

    const handleWatchlistToggle = async () => {
        if (!user?.uid || !data?.symbol) return;
        const sym = data.symbol;
        const isWatched = watchlist.includes(sym);
        
        try {
            if (isWatched) {
                const res = await axios.post(`${API_BASE}/watchlist/remove`, {
                    user: user.uid,
                    symbol: sym
                });
                setWatchlist(res.data.symbols || []);
            } else {
                const res = await axios.post(`${API_BASE}/watchlist/add`, {
                    user: user.uid,
                    symbol: sym
                });
                setWatchlist(res.data.symbols || []);
            }
        } catch (err) {
            console.error("Watchlist action failed:", err);
        }
    };

    const handleWatchlistRemove = async (sym) => {
        if (!user?.uid) return;
        try {
            const res = await axios.post(`${API_BASE}/watchlist/remove`, {
                user: user.uid,
                symbol: sym
            });
            setWatchlist(res.data.symbols || []);
        } catch (err) {
            console.error("Watchlist remove failed:", err);
        }
    };

    const handleSetAlert = async () => {
        if (!user?.uid || !data?.symbol || !alertBuyPrice || !alertThreshold || !alertEmail) return;
        try {
            setAlertSaving(true);
            const res = await axios.post(`${API_BASE}/alerts/set`, {
                user: user.uid,
                symbol: data.symbol,
                buy_price: parseFloat(alertBuyPrice),
                threshold: parseFloat(alertThreshold),
                email: alertEmail
            });
            setAlerts(res.data.alerts || []);
        } catch (err) {
            console.error("Failed to set alert:", err);
        } finally {
            setAlertSaving(false);
        }
    };

    const handleRemoveAlert = async () => {
        if (!user?.uid || !data?.symbol) return;
        try {
            setAlertSaving(true);
            const res = await axios.post(`${API_BASE}/alerts/remove`, {
                user: user.uid,
                symbol: data.symbol
            });
            setAlerts(res.data.alerts || []);
        } catch (err) {
            console.error("Failed to remove alert:", err);
        } finally {
            setAlertSaving(false);
        }
    };

    const fetchStock = useCallback(async (sym) => {
        const raw = (sym ?? symbol).trim();
        if (!raw) return;
        const target = formatSymbol(raw);
        setLoad(true); setError(""); setData(null);
        try {
            const result = await fetchWithRetry(`${API_BASE}/analyze?symbol=${encodeURIComponent(target)}&period=${period}`);
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
        fetchWatchlist();
        fetchAlerts();
        const s = params.get("symbol");
        if (s) { setSymbol(s); fetchStock(s); }
    }, [user, fetchWatchlist, fetchAlerts]);

    useEffect(() => {
        if (data?.symbol) fetchStock(data.symbol);
    }, [period]); // eslint-disable-line

    useEffect(() => {
        if (data?.summary?.price) {
            setAlertBuyPrice(String(data.summary.price));
        }
    }, [data]);

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
    
    const isWatched = data?.symbol ? watchlist.includes(data.symbol) : false;

    return (
        <div style={{ padding: "30px 24px 80px", maxWidth: 1280, margin: "0 auto" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
                
                body { background: #060810; color: #e5e7eb; font-family: 'Inter', sans-serif; margin: 0; }
                * { box-sizing: border-box; }
                
                @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
                @keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
                @keyframes spin { to { transform: rotate(360deg); } }
                
                .card {
                    background: rgba(255,255,255,0.015);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 16px;
                    backdrop-filter: blur(8px);
                    transition: border-color 0.2s;
                }
                .card:hover { border-color: rgba(255,255,255,0.08); }
                
                .metric-card {
                    background: rgba(255,255,255,0.015);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 14px;
                    padding: 18px;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    transition: border-color 0.2s;
                }
                .metric-card:hover { border-color: rgba(255,255,255,0.08); }
                
                .analyze-btn {
                    background: #22c55e; color: #030712;
                    border: none; padding: 0 20px; height: 40px;
                    border-radius: 10px; font-size: 13px; font-weight: 700;
                    cursor: pointer; white-space: nowrap;
                    display: inline-flex; align-items: center; gap: 8px;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    box-shadow: 0 4px 14px rgba(34,197,94,0.18);
                }
                .analyze-btn:hover:not(:disabled) { 
                    background: #16a34a; 
                    transform: translateY(-1px); 
                    box-shadow: 0 6px 18px rgba(34,197,94,0.28); 
                }
                .analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
                
                .period-btn {
                    border: none; padding: 6px 12px; border-radius: 7px;
                    font-size: 11.5px; font-weight: 600; cursor: pointer; transition: all 0.15s;
                }
                
                .star-btn {
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.06);
                    color: #4b5563;
                    border-radius: 8px;
                    width: 34px;
                    height: 34px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 16px;
                    transition: all 0.2s;
                }
                .star-btn:hover {
                    border-color: rgba(251,191,36,0.3);
                    color: #fbbf24;
                    background: rgba(251,191,36,0.04);
                }
                .star-btn.active {
                    color: #fbbf24;
                    background: rgba(251,191,36,0.08);
                    border-color: rgba(251,191,36,0.35);
                }
                
                .export-btn {
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.06);
                    color: #f3f4f6;
                    border-radius: 9px;
                    padding: 8px 16px;
                    font-size: 12.5px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.15s;
                }
                .export-btn:hover {
                    background: rgba(255,255,255,0.05);
                    border-color: rgba(255,255,255,0.12);
                }
                
                @media (max-width: 980px) {
                    .dashboard-grid { grid-template-columns: 1fr !important; }
                    .right-grid { order: 1; }
                    .left-grid { order: 2; }
                    .metric-grid { grid-template-columns: 1fr 1fr !important; }
                }
                @media (max-width: 560px) {
                    .metric-grid { grid-template-columns: 1fr !important; }
                }
                
                @media print {
                    body { background: white !important; color: black !important; }
                    .print-hide { display: none !important; }
                    nav { display: none !important; }
                    .dashboard-grid { grid-template-columns: 1fr !important; }
                    .card { background: white !important; border: 1px solid #ddd !important; box-shadow: none !important; color: black !important; }
                    .metric-card { background: white !important; border: 1px solid #ddd !important; color: black !important; }
                    text { fill: #333 !important; }
                }
            `}</style>

            <div className="print-hide" style={{ marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.6px", margin: 0, marginBottom: 4, fontFamily: "'Inter', sans-serif" }}>
                        Stock Dashboard
                    </h1>
                    <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                        Search any NSE, BSE, or US stock for real-time indicator mapping. Need help?{" "}
                        <a href="https://finance.yahoo.com/lookup" target="_blank" rel="noopener noreferrer" style={{ color: "#22c55e", fontWeight: 600, textDecoration: "none" }}
                           onMouseEnter={e => e.currentTarget.style.color = "#16a34a"}
                           onMouseLeave={e => e.currentTarget.style.color = "#22c55e"}>
                            Look up symbols ↗
                        </a>
                    </p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                    {["🇮🇳 NSE / BSE", "🇺🇸 NYSE / NASDAQ"].map(l => (
                        <span key={l} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>{l}</span>
                    ))}
                </div>
            </div>

            <div className="print-hide" style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
                <SearchBar
                    value={symbol}
                    onChange={setSymbol}
                    onSelect={s => { setSymbol(s); fetchStock(s); }}
                    onEnter={() => fetchStock()}
                />

                <div style={{ display: "flex", gap: 2, padding: 3, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, flexShrink: 0 }}>
                    {PERIODS.map(({ label, val }) => (
                        <button key={val} className="period-btn" onClick={() => setPeriod(val)} style={{
                            background: period === val ? "rgba(34,197,94,0.1)" : "transparent",
                            color: period === val ? "#22c55e" : "var(--text-secondary)",
                            boxShadow: period === val ? "inset 0 0 0 1px rgba(34,197,94,0.15)" : "none",
                        }}>{label}</button>
                    ))}
                </div>

                <button className="analyze-btn" onClick={() => fetchStock()} disabled={loading || !symbol.trim()}>
                    {loading ? (
                        <>
                            <svg style={{ animation: "spin 0.8s linear infinite" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                            </svg>
                            Analyzing…
                        </>
                    ) : "Analyze →"}
                </button>
            </div>

            {error && (
                <div className="print-hide" style={{
                    background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.18)",
                    borderRadius: 10, padding: "12px 16px", marginBottom: 24,
                    color: "#fbbf24", fontSize: 13, display: "flex", gap: 10, alignItems: "flex-start",
                }}>
                    <span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span> {error}
                </div>
            )}

            {loading && (
                <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, marginTop: 8 }} className="dashboard-grid">
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="left-grid">
                        <Skeleton h={180} radius={16} />
                        <Skeleton h={120} radius={16} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="right-grid">
                        <Skeleton h={300} radius={16} />
                        <Skeleton h={150} radius={16} />
                    </div>
                </div>
            )}

            {data && !data.error && !loading && (
                <div style={{
                    display: "grid", gridTemplateColumns: "280px 1fr",
                    gap: 20, alignItems: "start",
                    animation: "fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                }} className="dashboard-grid">

                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="left-grid">
                        
                        <WatchlistWidget 
                            symbols={watchlist}
                            activeSym={data.symbol}
                            onSelect={(sym) => { setSymbol(sym); fetchStock(sym); }}
                            onRemove={handleWatchlistRemove}
                            loading={watchlistLoading}
                        />

                        {/* Buy alerts card */}
                        <div className="card print-hide" style={{ padding: 20 }}>
                            <h3 style={{ fontSize: 13.5, fontWeight: 800, margin: "0 0 12px 0", fontFamily: "'Inter', sans-serif" }}>Portfolio Pin Alert</h3>
                            
                            {(() => {
                                const activeAlert = alerts.find(a => a.symbol === data.symbol);
                                if (activeAlert) {
                                    const triggerVal = activeAlert.buy_price * (1 - activeAlert.threshold / 100);
                                    return (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                            <div style={{ 
                                                background: activeAlert.triggered ? "rgba(239, 68, 68, 0.08)" : "rgba(34, 197, 94, 0.06)",
                                                border: `1px solid ${activeAlert.triggered ? "rgba(239, 68, 68, 0.18)" : "rgba(34, 197, 94, 0.18)"}`,
                                                borderRadius: 10,
                                                padding: "10px 12px",
                                                fontSize: 11.5
                                            }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                                    <span style={{ color: "var(--text-muted)" }}>Pinned Buy Price:</span>
                                                    <span style={{ fontWeight: 700 }}>{priceStr(data.symbol, activeAlert.buy_price)}</span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                                    <span style={{ color: "var(--text-muted)" }}>Drop Threshold:</span>
                                                    <span style={{ fontWeight: 700, color: "var(--red)" }}>-{activeAlert.threshold}%</span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                                    <span style={{ color: "var(--text-muted)" }}>Trigger Level:</span>
                                                    <span style={{ fontWeight: 700, color: "var(--red)" }}>{priceStr(data.symbol, triggerVal)}</span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 4, marginTop: 4 }}>
                                                    <span style={{ color: "var(--text-muted)" }}>Status:</span>
                                                    <span style={{ fontWeight: 800, color: activeAlert.triggered ? "var(--red)" : "var(--green)" }}>
                                                        {activeAlert.triggered ? "🛑 TRIGGERED (Crashed)" : "🟢 ACTIVE"}
                                                    </span>
                                                </div>
                                            </div>
                                            <button className="btn-secondary" onClick={handleRemoveAlert} disabled={alertSaving} style={{ padding: "8px 12px", fontSize: 11.5, width: "100%" }}>
                                                Remove Alert Pin
                                            </button>
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                <label style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.02em" }}>My Purchase Price</label>
                                                <input 
                                                    className="inp" 
                                                    style={{ padding: "8px 10px", fontSize: 12.5 }} 
                                                    type="number" 
                                                    value={alertBuyPrice} 
                                                    onChange={e => setAlertBuyPrice(e.target.value)} 
                                                />
                                            </div>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                <label style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.02em" }}>Drop Threshold (%)</label>
                                                <input 
                                                    className="inp" 
                                                    style={{ padding: "8px 10px", fontSize: 12.5 }} 
                                                    type="number" 
                                                    step="0.5"
                                                    value={alertThreshold} 
                                                    onChange={e => setAlertThreshold(e.target.value)} 
                                                />
                                            </div>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                <label style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.02em" }}>Alert Email Address</label>
                                                <input 
                                                    className="inp" 
                                                    style={{ padding: "8px 10px", fontSize: 12.5 }} 
                                                    type="email" 
                                                    value={alertEmail} 
                                                    onChange={e => setAlertEmail(e.target.value)} 
                                                />
                                            </div>
                                            <button className="btn-primary" onClick={handleSetAlert} disabled={alertSaving || !alertBuyPrice || !alertThreshold || !alertEmail} style={{ padding: "10px 14px", fontSize: 12.5, width: "100%", marginTop: 4 }}>
                                                Pin Buy Alert Price
                                            </button>
                                        </div>
                                    );
                                }
                            })()}
                        </div>

                        <div className="card" style={{ padding: 20 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Recommendation</div>
                                    <h3 style={{ fontSize: 16, fontWeight: 800, margin: "6px 0 0 0", fontFamily: "'Inter', sans-serif" }}>Signal Score</h3>
                                </div>
                                <SignalBadge signal={data.signal} />
                            </div>
                            <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12, marginTop: 12 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
                                    <span style={{ color: "var(--text-muted)" }}>Confidence</span>
                                    <span style={{ fontWeight: 700, color: confColor }}>{conf}%</span>
                                </div>
                                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 6, height: 6, overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${conf}%`, background: confColor, borderRadius: 6, transition: "width 0.5s ease" }} />
                                </div>
                            </div>
                        </div>

                        <button className="export-btn print-hide" onClick={() => window.print()}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                            Export Report
                        </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="right-grid">
                        
                        <div className="card" style={{ padding: "20px 24px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.6px", margin: 0, fontFamily: "'Inter', sans-serif" }}>
                                            {displaySym}
                                        </h2>
                                        <span style={{ fontSize: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 6, padding: "2px 8px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                                            {exchangeLabel(data.symbol)}
                                        </span>
                                        <button 
                                            className={`star-btn print-hide ${isWatched ? "active" : ""}`} 
                                            onClick={handleWatchlistToggle}
                                            title={isWatched ? "Remove from Watchlist" : "Add to Watchlist"}
                                        >
                                            {isWatched ? "★" : "☆"}
                                        </button>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
                                        <span style={{ fontSize: 28, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "#f3f4f6" }}>
                                            {priceStr(data.symbol, data.summary?.price)}
                                        </span>
                                        <span style={{
                                            color: positive ? "#22c55e" : "#ef4444",
                                            fontWeight: 700, fontSize: 13.5
                                        }}>
                                            {positive ? "▲" : "▼"} {data.summary?.change ?? "—"}%
                                        </span>
                                    </div>
                                </div>

                                <div className="print-hide" style={{ display: "flex", gap: 2, padding: 3, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8 }}>
                                    {PERIODS.map(({ label, val }) => (
                                        <button key={val} className="period-btn" onClick={() => setPeriod(val)} style={{
                                            background: period === val ? "rgba(34,197,94,0.08)" : "transparent",
                                            color: period === val ? "#22c55e" : "var(--text-muted)",
                                            fontSize: 10.5
                                        }}>{label}</button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginTop: 24, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 18 }}>
                                <InteractiveChart history={data.history} positive={positive} symbol={data.symbol} />
                            </div>
                        </div>

                        <div>
                            <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", margin: "0 0 12px 6px" }}>Key Market Statistics</h3>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
                                <MetricItem label="Open" value={priceStr(data.symbol, data.summary?.open)} />
                                <MetricItem label="Session Range" value={`${priceStr(data.symbol, data.summary?.low)} - ${priceStr(data.symbol, data.summary?.high)}`} />
                                <MetricItem label="RSI Value" value={`${data.summary?.rsi} (${rsiLabel})`} color={rsiColor} />
                                <MetricItem label="52-Week High" value={priceStr(data.symbol, data.summary?.fifty_two_week_high)} />
                                <MetricItem label="52-Week Low" value={priceStr(data.symbol, data.summary?.fifty_two_week_low)} />
                                <MetricItem label="Volume" value={data.summary?.volume?.toLocaleString("en-IN") || "—"} />
                                <MetricItem label="Avg Volume" value={data.summary?.avg_volume?.toLocaleString("en-IN") || "—"} />
                                <MetricItem label="Support" value={priceStr(data.symbol, data.summary?.support)} color="#22c55e" />
                                <MetricItem label="Resistance" value={priceStr(data.symbol, data.summary?.resistance)} color="#ef4444" />
                            </div>
                        </div>

                        <div className="card" style={{ padding: "20px 24px" }}>
                            <h3 style={{ fontSize: 13.5, fontWeight: 800, margin: "0 0 16px 0", fontFamily: "'Inter', sans-serif" }}>Technical Analysis Grid</h3>
                            <IndicatorsTable summary={data.summary} symbol={data.symbol} />
                        </div>

                        <div className="card" style={{ 
                            padding: "20px 24px",
                            borderLeft: `4px solid ${positive ? "#22c55e" : "#ef4444"}`,
                            borderRadius: "0 16px 16px 0"
                        }}>
                            <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", margin: "0 0 10px 0" }}>AI Synthesis Report</h3>
                            <p style={{ fontSize: 13, color: "#d1d5db", lineHeight: 1.8, margin: 0 }}>
                                {data.analysis}
                            </p>
                        </div>

                    </div>
                </div>
            )}

            {!data && !loading && !error && (
                <div style={{ marginTop: 64, textAlign: "center", animation: "fadeUp 0.4s ease", padding: "0 16px" }}>
                    <div style={{ fontSize: 44, marginBottom: 14, filter: "drop-shadow(0 0 20px rgba(34,197,94,0.25))" }}>📊</div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.3px", fontFamily: "'Inter', sans-serif" }}>
                        Search a stock to begin
                    </h3>
                    <p style={{ color: "var(--text-muted)", fontSize: 13, maxWidth: 360, margin: "0 auto 24px", lineHeight: 1.7 }}>
                        Enter a ticker symbol above to get real-time technical indicators, sparklines, and watchlists.
                    </p>

                    <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                        {QUICK_PICKS.map(({ sym, label, exchange }) => (
                            <button key={sym} onClick={() => { setSymbol(sym); fetchStock(sym); }}
                                style={{
                                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                                    color: "var(--text-secondary)", padding: "6px 14px", borderRadius: 999,
                                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                                    fontFamily: "'JetBrains Mono',monospace", transition: "all 0.15s",
                                    display: "inline-flex", alignItems: "center", gap: 6,
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(34,197,94,0.4)"; e.currentTarget.style.color = "#22c55e"; e.currentTarget.style.background = "rgba(34,197,94,0.04)"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}>
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
