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
    ComposedChart,
    ReferenceLine,
    Line
} from "recharts";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

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

const METAL_ALIASES = new Set([
    "XAUUSD", "XAU", "GOLD",
    "XAGUSD", "XAG", "SILVER",
    "XPTUSD", "XPT", "PLATINUM",
    "XPDUSD", "XPD", "PALLADIUM"
]);

export function formatSymbol(raw) {
    const s = raw.toUpperCase().trim();
    if (s.includes(".") || s.includes("=") || s.includes("-") || s.startsWith("^")) {
        return s;
    }
    if (METAL_ALIASES.has(s)) {
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

function calculateFallbackEntryZones(history, signal) {
    if (!history || history.length < 10) return null;
    
    let trs = [];
    for (let i = 1; i < history.length; i++) {
        const high = history[i].high;
        const low = history[i].low;
        const prevClose = history[i-1].close;
        const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
        trs.push(tr);
    }
    
    const period = Math.min(14, trs.length);
    const lastN = trs.slice(-period);
    const atr = lastN.reduce((sum, val) => sum + val, 0) / lastN.length;
    
    const latest = history[history.length - 1];
    const price = latest.close;
    
    const range = Math.min(30, history.length);
    const lastRange = history.slice(-range);
    const support = Math.min(...lastRange.map(d => d.low));
    const resistance = Math.max(...lastRange.map(d => d.high));
    
    let entry, stop_loss, take_profit;
    if (signal === "BUY") {
        entry = Math.max(support, price - 0.3 * atr);
        stop_loss = entry - 1.5 * atr;
        take_profit = entry + 3.0 * atr;
    } else if (signal === "SELL") {
        entry = Math.min(resistance, price + 0.3 * atr);
        stop_loss = entry + 1.5 * atr;
        take_profit = entry - 3.0 * atr;
    } else {
        entry = price;
        stop_loss = price - 1.5 * atr;
        take_profit = price + 1.5 * atr;
    }
    
    const risk = Math.abs(entry - stop_loss);
    const reward = Math.abs(take_profit - entry);
    const rr = risk > 0 ? (reward / risk).toFixed(2) : 0;
    
    return {
        entry: parseFloat(entry.toFixed(4)),
        take_profit: parseFloat(take_profit.toFixed(4)),
        stop_loss: parseFloat(stop_loss.toFixed(4)),
        risk_reward: parseFloat(rr),
        atr: parseFloat(atr.toFixed(4))
    };
}

function generateFallbackRealtimePrediction(signal, weeklySignal, intradaySignal) {
    let action = "NEUTRAL";
    let advice = "No clear directional momentum across timeframes. Market is ranging. Wait for breakout confirmation.";
    
    const dSig = signal || "HOLD";
    const iSig = intradaySignal || "HOLD";
    
    if (dSig === "BUY" && iSig === "BUY") {
        action = "STRONG BUY";
        advice = "Bullish momentum is aligned on both daily trend and short-term intraday charts. Ideal entry is active.";
    } else if (dSig === "BUY" && iSig === "SELL") {
        action = "BUY ON DIP";
        advice = "Daily trend is bullish, but short-term intraday momentum indicates a pullback. Wait for intraday consolidation or a bullish trigger.";
    } else if (dSig === "SELL" && iSig === "SELL") {
        action = "STRONG SELL";
        advice = "Bearish pressure dominates on both daily trend and short-term intraday charts. Avoid buying.";
    } else if (dSig === "SELL" && iSig === "BUY") {
        action = "SHORT-TERM RALLY";
        advice = "Daily trend is bearish, but short-term intraday buying is pushing prices up. High risk counter-trend rally.";
    } else if (dSig === "BUY" && iSig === "HOLD") {
        action = "BUY / WAIT";
        advice = "Daily trend is bullish, but intraday charts show consolidation. Monitor for a short-term breakout.";
    } else if (dSig === "SELL" && iSig === "HOLD") {
        action = "SELL / WAIT";
        advice = "Daily trend is bearish, intraday is ranging. Momentum favors selling on resistance tests.";
    }
    
    return {
        action,
        advice,
        intraday_signal: iSig,
        intraday_confidence: 45
    };
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

const calculateAgreementConfidence = (summary, action) => {
    if (summary?.confidence) return summary.confidence;
    
    let totalIndicators = 0;
    let matchingIndicators = 0;
    const isBullish = action.includes("BUY");
    const isBearish = action.includes("SELL");
    
    if (!summary) return 75;
    
    if (summary.rsi !== undefined) {
        totalIndicators++;
        if (isBullish && summary.rsi < 45) matchingIndicators++;
        else if (isBearish && summary.rsi > 55) matchingIndicators++;
        else if (!isBullish && !isBearish) matchingIndicators++;
    }
    
    if (summary.macd !== undefined && summary.macd_signal !== undefined) {
        totalIndicators++;
        if (isBullish && summary.macd > summary.macd_signal) matchingIndicators++;
        else if (isBearish && summary.macd < summary.macd_signal) matchingIndicators++;
        else if (!isBullish && !isBearish) matchingIndicators++;
    }
    
    if (summary.ema_fast !== undefined && summary.ema_slow !== undefined) {
        totalIndicators++;
        if (isBullish && summary.ema_fast > summary.ema_slow) matchingIndicators++;
        else if (isBearish && summary.ema_fast < summary.ema_slow) matchingIndicators++;
        else if (!isBullish && !isBearish) matchingIndicators++;
    }
    
    if (summary.ma_20 !== undefined && summary.price !== undefined) {
        totalIndicators++;
        if (isBullish && summary.price > summary.ma_20) matchingIndicators++;
        else if (isBearish && summary.price < summary.ma_20) matchingIndicators++;
        else if (!isBullish && !isBearish) matchingIndicators++;
    }
    
    if (totalIndicators === 0) return 75;
    const ratio = matchingIndicators / totalIndicators;
    return Math.round(55 + ratio * 40);
};

const fallbackAiInsight = (symbol, signal) => {
    const sym = symbol ? symbol.split(".")[0] : "Asset";
    if (signal === "BUY") {
        return `AI Models detect bullish momentum alignment for ${sym}. Technical trend indicators favor buying on dips towards key support levels.`;
    } else if (signal === "SELL") {
        return `AI Analysis warns of severe bearish pressure for ${sym}. Moving averages suggest trading with a downward bias; hold tight stop-losses.`;
    } else {
        return `AI Models classify ${sym} in a ranging, low-volatility consolidation phase. Wait for a volume breakout before entry.`;
    }
};

function MetricItem({ label, value, color }) {
    return (
        <div 
            title={`${label}: ${value}`}
            style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.04)",
                borderRadius: 10,
                padding: "8px 12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                overflow: "hidden"
            }}
        >
            <span style={{ 
                fontSize: 10.5, 
                color: "var(--text-muted)", 
                textTransform: "uppercase", 
                letterSpacing: "0.03em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                flexShrink: 1
            }}>
                {label}
            </span>
            <span style={{ 
                fontSize: 13, 
                fontWeight: 700, 
                color: color || "#f3f4f6", 
                fontFamily: "'JetBrains Mono', monospace",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                textAlign: "right",
                flexShrink: 0
            }}>
                {value}
            </span>
        </div>
    );
}

function InteractiveChart({ history, positive, symbol, entryZones, realtimePrediction, compareSymbol }) {
    const [overlayCompare, setOverlayCompare] = useState(false);

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
        volume: d.volume,
        compare_close: d.compare_close
    }));

    const isGoldAsset = symbol && (symbol.toUpperCase().includes("GC=F") || symbol.toUpperCase().includes("GOLD") || symbol.toUpperCase().includes("XAU"));
    const chartColor = isGoldAsset ? "#fbbf24" : (positive ? "#10b981" : "#ef4444");
    const volumeColor = "rgba(255, 255, 255, 0.08)";

    const firstPrice = chartData[0]?.price || 1;
    const firstComparePrice = chartData[0]?.compare_close || 1;

    const normalizedData = chartData.map(d => ({
        ...d,
        percentChange: firstPrice > 0 ? parseFloat((((d.price - firstPrice) / firstPrice) * 100).toFixed(2)) : 0,
        comparePercentChange: firstComparePrice > 0 && d.compare_close 
            ? parseFloat((((d.compare_close - firstComparePrice) / firstComparePrice) * 100).toFixed(2)) 
            : 0
    }));

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
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
                    <p style={{ margin: "0 0 6px 0", fontWeight: 700, color: "#9ca3af" }}>{dataPoint.date}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                            <span style={{ color: "var(--text-muted)" }}>Close:</span>
                            <span style={{ fontWeight: 800, color: "#f3f4f6", fontFamily: "'JetBrains Mono', monospace" }}>
                                {priceStr(symbol, dataPoint.price)}
                            </span>
                        </div>
                        {overlayCompare && (
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                                <span style={{ color: "var(--text-muted)" }}>Return:</span>
                                <span style={{ fontWeight: 800, color: chartColor, fontFamily: "'JetBrains Mono', monospace" }}>
                                    {dataPoint.percentChange >= 0 ? "+" : ""}{dataPoint.percentChange}%
                                </span>
                            </div>
                        )}
                        {overlayCompare && compareSymbol && dataPoint.compare_close && (
                            <>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 4, marginTop: 4 }}>
                                    <span style={{ color: "var(--text-muted)" }}>{compareSymbol} Price:</span>
                                    <span style={{ fontWeight: 600, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
                                        {priceStr(compareSymbol, dataPoint.compare_close)}
                                    </span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                                    <span style={{ color: "var(--text-muted)" }}>{compareSymbol} Return:</span>
                                    <span style={{ fontWeight: 800, color: "#3b82f6", fontFamily: "'JetBrains Mono', monospace" }}>
                                        {dataPoint.comparePercentChange >= 0 ? "+" : ""}{dataPoint.comparePercentChange}%
                                    </span>
                                </div>
                            </>
                        )}
                        {!overlayCompare && (
                            <>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                                    <span style={{ color: "var(--text-muted)" }}>Open:</span>
                                    <span style={{ fontWeight: 600, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
                                        {priceStr(symbol, dataPoint.open)}
                                    </span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                                    <span style={{ color: "var(--text-muted)" }}>Range:</span>
                                    <span style={{ fontWeight: 600, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
                                        {priceStr(symbol, dataPoint.low)} - {priceStr(symbol, dataPoint.high)}
                                    </span>
                                </div>
                            </>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginTop: 4, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 4 }}>
                            <span style={{ color: "var(--text-muted)" }}>Volume:</span>
                            <span style={{ fontWeight: 600, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
                                {dataPoint.volume.toLocaleString("en-IN")}
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    let buyTarget = null;
    let sellTarget = null;
    let stopLoss = null;
    let isBearish = false;

    if (entryZones && !overlayCompare) {
        isBearish = realtimePrediction?.action?.includes("SELL") || false;
        buyTarget = isBearish ? entryZones.take_profit : entryZones.entry;
        sellTarget = isBearish ? entryZones.entry : entryZones.take_profit;
        stopLoss = entryZones.stop_loss;
    }

    const prices = chartData.map(d => d.price);
    const allYValues = [...prices];
    if (buyTarget) allYValues.push(buyTarget);
    if (sellTarget) allYValues.push(sellTarget);
    if (stopLoss) allYValues.push(stopLoss);

    const minPrice = Math.min(...allYValues) * 0.995;
    const maxPrice = Math.max(...allYValues) * 1.005;
    const volumes = chartData.map(d => d.volume);
    const maxVolume = Math.max(...volumes) || 1;

    const allPercentValues = normalizedData.map(d => d.percentChange);
    if (compareSymbol) {
        normalizedData.forEach(d => {
            if (d.comparePercentChange !== undefined) {
                allPercentValues.push(d.comparePercentChange);
            }
        });
    }
    const minPercent = Math.min(...allPercentValues) - 2;
    const maxPercent = Math.max(...allPercentValues) + 2;

    return (
        <div style={{ width: "100%" }}>
            {compareSymbol && (
                <div className="print-hide" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                    <label style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                        fontWeight: 600,
                        background: "rgba(255,255,255,0.015)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        padding: "4px 10px",
                        borderRadius: 8,
                        userSelect: "none"
                    }}>
                        <input 
                            type="checkbox" 
                            checked={overlayCompare} 
                            onChange={(e) => setOverlayCompare(e.target.checked)}
                            style={{ accentColor: "#fbbf24" }}
                        />
                        Overlay Benchmark ({compareSymbol})
                    </label>
                </div>
            )}

            <div style={{ width: "100%", height: 260, position: "relative" }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={overlayCompare ? normalizedData : chartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={chartColor} stopOpacity={0.25} />
                                <stop offset="95%" stopColor={chartColor} stopOpacity={0.0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                        <XAxis 
                            dataKey="date" 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{ fill: "#9ca3af", fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace" }} 
                            dy={6}
                        />
                        <YAxis 
                            yAxisId="price"
                            domain={overlayCompare ? [minPercent, maxPercent] : [minPrice, maxPrice]}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#9ca3af", fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace" }}
                            orientation="left"
                            tickFormatter={(v) => overlayCompare ? `${v >= 0 ? "+" : ""}${v}%` : v}
                        />
                        <YAxis 
                            yAxisId="volume"
                            domain={[0, maxVolume * 4.5]}
                            tickLine={false}
                            axisLine={false}
                            hide={true}
                            orientation="right"
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.18)", strokeWidth: 1.5, strokeDasharray: "3 3" }} />
                        
                        {overlayCompare ? (
                            <>
                                <Line
                                    yAxisId="price"
                                    type="monotone"
                                    dataKey="percentChange"
                                    stroke={chartColor}
                                    strokeWidth={2.5}
                                    dot={false}
                                    name={symbol.split(".")[0]}
                                />
                                {compareSymbol && (
                                    <Line
                                        yAxisId="price"
                                        type="monotone"
                                        dataKey="comparePercentChange"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        strokeDasharray="4 4"
                                        dot={false}
                                        name={compareSymbol}
                                    />
                                )}
                            </>
                        ) : (
                            <Area 
                                yAxisId="price"
                                type="monotone" 
                                dataKey="price" 
                                stroke={chartColor} 
                                strokeWidth={2.5}
                                fillOpacity={1} 
                                fill="url(#chartGrad)"
                            />
                        )}

                        {buyTarget && (
                            <ReferenceLine 
                                yAxisId="price" 
                                y={buyTarget} 
                                stroke={isBearish ? "#3b82f6" : "#22c55e"} 
                                strokeDasharray="3 3" 
                                strokeWidth={1.5}
                                label={{ 
                                    value: isBearish ? `Cover: ${buyTarget}` : `Buy: ${buyTarget}`, 
                                    fill: isBearish ? "#3b82f6" : "#22c55e", 
                                    fontSize: 9.5, 
                                    fontWeight: 700,
                                    position: "insideBottomLeft",
                                    offset: 6
                                }} 
                            />
                        )}
                        {sellTarget && (
                            <ReferenceLine 
                                yAxisId="price" 
                                y={sellTarget} 
                                stroke="#ef4444" 
                                strokeDasharray="3 3" 
                                strokeWidth={1.5}
                                label={{ 
                                    value: isBearish ? `Short: ${sellTarget}` : `Sell: ${sellTarget}`, 
                                    fill: "#ef4444", 
                                    fontSize: 9.5, 
                                    fontWeight: 700,
                                    position: "insideTopLeft",
                                    offset: 6
                                }} 
                            />
                        )}
                        {stopLoss && (
                            <ReferenceLine 
                                yAxisId="price" 
                                y={stopLoss} 
                                stroke="#f59e0b" 
                                strokeDasharray="3 3" 
                                strokeWidth={1}
                                label={{ 
                                    value: `SL: ${stopLoss}`, 
                                    fill: "#f59e0b", 
                                    fontSize: 8.5, 
                                    fontWeight: 600,
                                    position: "insideBottomRight",
                                    offset: 6
                                }} 
                            />
                        )}
                        <Bar 
                            yAxisId="volume"
                            dataKey="volume" 
                            fill={volumeColor} 
                            radius={[2, 2, 0, 0]}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
            
            {overlayCompare && compareSymbol && (
                <div style={{ display: "flex", justifyContent: "center", gap: 16, fontSize: 10, color: "var(--text-muted)", marginTop: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ display: "inline-block", width: 12, height: 3, background: chartColor }} />
                        <span>{symbol.split(".")[0]} (%)</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ display: "inline-block", width: 12, height: 3, borderTop: "2px dashed #3b82f6" }} />
                        <span>{compareSymbol} (%)</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function IndicatorsTable({ summary, symbol }) {
    const indicators = [
        {
            name: "RSI (14) Momentum",
            value: typeof summary.rsi === "number" ? summary.rsi.toFixed(2) : (summary.rsi ?? "—"),
            status: summary.rsi >= 70 ? "Overbought" : summary.rsi <= 30 ? "Oversold" : "Neutral",
            color: summary.rsi >= 70 ? "#ef4444" : summary.rsi <= 30 ? "#3b82f6" : "#22c55e",
            desc: "Identifies momentum speed and overextended levels."
        },
        {
            name: "MACD Crossover",
            value: typeof summary.macd_hist === "number" ? `Hist: ${summary.macd_hist.toFixed(4)}` : `Hist: ${summary.macd_hist ?? "—"}`,
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

    const [backtestStrategy, setBacktestStrategy] = useState("RSI_REVERSION");
    const [backtestData, setBacktestData] = useState(null);
    const [backtestLoading, setBacktestLoading] = useState(false);
    const [backtestError, setBacktestError] = useState("");

    const [watchlist, setWatchlist] = useState([]);
    const [watchlistLoading, setWatchlistLoading] = useState(false);

    const [alerts, setAlerts] = useState([]);
    const [alertBuyPrice, setAlertBuyPrice] = useState("");
    const [alertThreshold, setAlertThreshold] = useState("5.0");
    const [alertEmail, setAlertEmail] = useState(user?.email || "");
    const [alertSaving, setAlertSaving] = useState(false);
    const [alertType, setAlertType] = useState("drop");
    const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState(
        typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted"
    );

    const fetchWatchlist = useCallback(async () => {
        if (!user?.uid) return;
        try {
            setWatchlistLoading(true);
            let loadedFromFirestore = false;
            try {
                const docRef = doc(db, "watchlists", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setWatchlist(docSnap.data().symbols || []);
                    loadedFromFirestore = true;
                }
            } catch (err) {
                console.warn("Firestore fetchWatchlist failed, trying backend fallback:", err);
            }
            
            if (!loadedFromFirestore) {
                const res = await axios.get(`${API_BASE}/watchlist?user=${user.uid}`);
                setWatchlist(res.data.symbols || []);
            }
        } catch (err) {
            console.error("Failed to fetch watchlist:", err);
        } finally {
            setWatchlistLoading(false);
        }
    }, [user]);

    const fetchAlerts = useCallback(async () => {
        if (!user?.uid) return;
        try {
            let loadedFromFirestore = false;
            try {
                const docRef = doc(db, "alerts", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setAlerts(docSnap.data().alerts || []);
                    loadedFromFirestore = true;
                }
            } catch (err) {
                console.warn("Firestore fetchAlerts failed, trying backend fallback:", err);
            }
            
            if (!loadedFromFirestore) {
                const res = await axios.get(`${API_BASE}/alerts?user=${user.uid}`);
                setAlerts(res.data.alerts || []);
            }
        } catch (err) {
            console.error("Failed to fetch alerts:", err);
        }
    }, [user]);

    const handleWatchlistToggle = async () => {
        if (!user?.uid || !data?.symbol) return;
        const sym = data.symbol;
        const isWatched = watchlist.includes(sym);
        const updatedSymbols = isWatched 
            ? watchlist.filter(s => s !== sym) 
            : [...watchlist, sym];
            
        setWatchlist(updatedSymbols);
        
        try {
            const docRef = doc(db, "watchlists", user.uid);
            await setDoc(docRef, { symbols: updatedSymbols }, { merge: true });
        } catch (err) {
            console.warn("Firestore watchlist toggle failed:", err);
        }
        
        try {
            if (isWatched) {
                await axios.post(`${API_BASE}/watchlist/remove`, { user: user.uid, symbol: sym });
            } else {
                await axios.post(`${API_BASE}/watchlist/add`, { user: user.uid, symbol: sym });
            }
        } catch (err) {
            console.error("Backend watchlist toggle failed:", err);
        }
    };

    const handleWatchlistRemove = async (sym) => {
        if (!user?.uid) return;
        const updatedSymbols = watchlist.filter(s => s !== sym);
        setWatchlist(updatedSymbols);
        
        try {
            const docRef = doc(db, "watchlists", user.uid);
            await setDoc(docRef, { symbols: updatedSymbols }, { merge: true });
        } catch (err) {
            console.warn("Firestore watchlist remove failed:", err);
        }
        
        try {
            await axios.post(`${API_BASE}/watchlist/remove`, { user: user.uid, symbol: sym });
        } catch (err) {
            console.error("Backend watchlist remove failed:", err);
        }
    };

    const handleSetAlert = async () => {
        if (!user?.uid || !data?.symbol || !alertBuyPrice || !alertThreshold || !alertEmail) return;
        const newAlert = {
            symbol: data.symbol,
            buy_price: parseFloat(alertBuyPrice),
            threshold: parseFloat(alertThreshold),
            email: alertEmail,
            alert_type: alertType,
            created_at: new Date().toISOString()
        };
        
        const updatedAlerts = [...alerts.filter(a => a.symbol !== data.symbol), newAlert];
        setAlerts(updatedAlerts);
        setAlertSaving(true);
        
        try {
            const docRef = doc(db, "alerts", user.uid);
            await setDoc(docRef, { alerts: updatedAlerts }, { merge: true });
        } catch (err) {
            console.warn("Firestore set alert failed:", err);
        }
        
        try {
            const res = await axios.post(`${API_BASE}/alerts/set`, {
                user: user.uid,
                symbol: data.symbol,
                buy_price: parseFloat(alertBuyPrice),
                threshold: parseFloat(alertThreshold),
                email: alertEmail,
                alert_type: alertType
            });
            if (res.data && res.data.alerts) {
                setAlerts(res.data.alerts);
            }
        } catch (err) {
            console.error("Backend set alert failed:", err);
        } finally {
            setAlertSaving(false);
        }
    };

    const handleRemoveAlert = async () => {
        if (!user?.uid || !data?.symbol) return;
        const updatedAlerts = alerts.filter(a => a.symbol !== data.symbol);
        setAlerts(updatedAlerts);
        setAlertSaving(true);
        
        try {
            const docRef = doc(db, "alerts", user.uid);
            await setDoc(docRef, { alerts: updatedAlerts }, { merge: true });
        } catch (err) {
            console.warn("Firestore remove alert failed:", err);
        }
        
        try {
            const res = await axios.post(`${API_BASE}/alerts/remove`, {
                user: user.uid,
                symbol: data.symbol
            });
            if (res.data && res.data.alerts) {
                setAlerts(res.data.alerts);
            }
        } catch (err) {
            console.error("Backend remove alert failed:", err);
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
            
            // Client-side fallbacks for older API backend versions
            if (result.history) {
                if (!result.entry_zones) {
                    result.entry_zones = calculateFallbackEntryZones(result.history, result.signal);
                }
                if (!result.realtime_prediction) {
                    result.realtime_prediction = generateFallbackRealtimePrediction(result.signal, "HOLD", result.signal);
                }
            }
            
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

    const handleRunBacktest = async () => {
        if (!data?.symbol) return;
        try {
            setBacktestLoading(true);
            setBacktestError("");
            setBacktestData(null);
            const res = await axios.get(`${API_BASE}/backtest?symbol=${encodeURIComponent(data.symbol)}&strategy=${backtestStrategy}`);
            if (res.data.error) {
                setBacktestError(res.data.error);
            } else {
                setBacktestData(res.data);
            }
        } catch (err) {
            setBacktestError("Failed to run backtest simulation.");
        } finally {
            setBacktestLoading(false);
        }
    };

    useEffect(() => {
        setBacktestData(null);
        setBacktestError("");
    }, [data]);

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

    const toggleNotifications = async () => {
        if (!("Notification" in window)) {
            alert("This browser does not support desktop notifications.");
            return;
        }
        if (Notification.permission === "default") {
            const res = await Notification.requestPermission();
            setDesktopNotificationsEnabled(res === "granted");
        } else if (Notification.permission === "granted") {
            setDesktopNotificationsEnabled(true);
        } else {
            alert("Notification permission has been blocked by your browser settings. Please reset permission in browser site settings.");
        }
    };

    // WebSocket listener for real-time alerts
    useEffect(() => {
        if (!user?.uid) return;

        const notifiedKeys = new Set(JSON.parse(sessionStorage.getItem("notified_alerts") || "[]"));
        
        const wsUrl = API_BASE.replace(/^http/, "ws") + `/ws/alerts?user=${user.uid}`;
        let ws;
        let reconnectTimeout;

        const connect = () => {
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log("WebSocket alerts channel connected.");
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === "alert_triggered") {
                        fetchAlerts();
                        
                        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                            const alert = data.alert;
                            const isGrowth = alert.alert_type === "growth";
                            const key = `${alert.symbol}-${alert.buy_price}-${alert.threshold}-${alert.alert_type || "drop"}`;
                            
                            if (!notifiedKeys.has(key)) {
                                notifiedKeys.add(key);
                                sessionStorage.setItem("notified_alerts", JSON.stringify(Array.from(notifiedKeys)));
                                
                                const title = isGrowth ? "📈 TARGET MET (Live)" : "🛑 CRITICAL DROP ALERT (Live)";
                                const body = isGrowth
                                    ? `Great news! ${alert.symbol} has risen beyond your growth target of +${alert.threshold}%! Pinned price: ${alert.buy_price}.`
                                    : `Warning! ${alert.symbol} has dropped below your threshold of -${alert.threshold}%! Pinned price: ${alert.buy_price}.`;
                                
                                new Notification(title, {
                                    body: body,
                                    icon: "/favicon.svg"
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.error("Error parsing WebSocket message:", err);
                }
            };

            ws.onerror = (err) => {
                console.error("WebSocket error:", err);
            };

            ws.onclose = () => {
                console.log("WebSocket disconnected. Retrying in 5s...");
                reconnectTimeout = setTimeout(connect, 5000);
            };
        };

        connect();

        return () => {
            if (ws) ws.close();
            clearTimeout(reconnectTimeout);
        };
    }, [user, API_BASE, fetchAlerts]);

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

    const ambientGlowColor = data?.realtime_prediction?.action?.includes("BUY")
        ? "rgba(34, 197, 94, 0.12)"
        : data?.realtime_prediction?.action?.includes("SELL")
            ? "rgba(239, 68, 68, 0.12)"
            : "rgba(245, 158, 11, 0.08)";

    return (
        <div style={{ padding: "30px 24px 80px", maxWidth: 1280, margin: "0 auto", position: "relative" }}>
            {data && (
                <div style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "100%",
                    maxWidth: 1000,
                    height: 400,
                    background: `radial-gradient(circle, ${ambientGlowColor} 0%, rgba(6,8,16,0) 70%)`,
                    pointerEvents: "none",
                    zIndex: 0
                }} />
            )}

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
                
                body { background: #060810; color: #e5e7eb; font-family: 'Inter', sans-serif; margin: 0; }
                * { box-sizing: border-box; }
                
                @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
                @keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
                @keyframes spin { to { transform: rotate(360deg); } }
                
                @keyframes pulseGold {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.5); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(251, 191, 36, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
                }
                .pulse-gold-dot {
                    animation: pulseGold 2s infinite;
                }
                
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
                            
                            {/* Desktop Notifications Toggle */}
                            <div style={{ 
                                display: "flex", 
                                justifyContent: "space-between", 
                                alignItems: "center", 
                                background: "rgba(255,255,255,0.015)", 
                                border: "1px solid rgba(255,255,255,0.05)", 
                                borderRadius: 8, 
                                padding: "8px 10px", 
                                marginBottom: 12,
                                fontSize: 11.5
                            }}>
                                <span style={{ color: "var(--text-muted)" }}>Desktop Alerts:</span>
                                <button 
                                    onClick={toggleNotifications} 
                                    style={{
                                        background: desktopNotificationsEnabled ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
                                        border: `1px solid ${desktopNotificationsEnabled ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)"}`,
                                        color: desktopNotificationsEnabled ? "#22c55e" : "var(--text-muted)",
                                        padding: "4px 8px",
                                        borderRadius: 6,
                                        fontSize: 10.5,
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        transition: "all 0.15s"
                                    }}
                                >
                                    {desktopNotificationsEnabled ? "🔔 ENABLED" : "🔕 DISABLED"}
                                </button>
                            </div>

                            {(() => {
                                const activeAlert = alerts.find(a => a.symbol === data.symbol);
                                if (activeAlert) {
                                    const isGrowth = activeAlert.alert_type === "growth";
                                    const triggerVal = isGrowth 
                                        ? activeAlert.buy_price * (1 + activeAlert.threshold / 100)
                                        : activeAlert.buy_price * (1 - activeAlert.threshold / 100);
                                    return (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                            <div style={{ 
                                                background: activeAlert.triggered ? (isGrowth ? "rgba(34, 197, 94, 0.08)" : "rgba(239, 68, 68, 0.08)") : "rgba(59, 130, 246, 0.06)",
                                                border: `1px solid ${activeAlert.triggered ? (isGrowth ? "rgba(34, 197, 94, 0.18)" : "rgba(239, 68, 68, 0.18)") : "rgba(59, 130, 246, 0.18)"}`,
                                                borderRadius: 10,
                                                padding: "10px 12px",
                                                fontSize: 11.5
                                            }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                                    <span style={{ color: "var(--text-muted)" }}>Pinned Buy Price:</span>
                                                    <span style={{ fontWeight: 700 }}>{priceStr(data.symbol, activeAlert.buy_price)}</span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                                    <span style={{ color: "var(--text-muted)" }}>{isGrowth ? "Growth Target:" : "Drop Threshold:"}</span>
                                                    <span style={{ fontWeight: 700, color: isGrowth ? "var(--green)" : "var(--red)" }}>
                                                        {isGrowth ? "+" : "-"}{activeAlert.threshold}%
                                                    </span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                                    <span style={{ color: "var(--text-muted)" }}>Trigger Level:</span>
                                                    <span style={{ fontWeight: 700, color: isGrowth ? "var(--green)" : "var(--red)" }}>{priceStr(data.symbol, triggerVal)}</span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 4, marginTop: 4 }}>
                                                    <span style={{ color: "var(--text-muted)" }}>Status:</span>
                                                    <span style={{ fontWeight: 800, color: activeAlert.triggered ? (isGrowth ? "var(--green)" : "var(--red)") : "var(--blue)" }}>
                                                        {activeAlert.triggered ? (isGrowth ? "🎉 TARGET MET" : "🛑 TRIGGERED (Crashed)") : "🟢 ACTIVE"}
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
                                                <label style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.02em" }}>Alert Type</label>
                                                <select 
                                                    className="inp" 
                                                    style={{ padding: "8px 10px", fontSize: 12.5, background: "#0c0f1d", color: "#f3f4f6", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }} 
                                                    value={alertType} 
                                                    onChange={e => setAlertType(e.target.value)}
                                                >
                                                    <option value="drop">Drop Warning (Stop Loss)</option>
                                                    <option value="growth">Growth Target (Take Profit)</option>
                                                </select>
                                            </div>
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
                                                <label style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                                                    {alertType === "growth" ? "Growth Target (%)" : "Drop Threshold (%)"}
                                                </label>
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
                                                Pin Alert Target
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
                                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 6, height: 6, overflow: "hidden", marginBottom: 10 }}>
                                    <div style={{ height: "100%", width: `${conf}%`, background: confColor, borderRadius: 6, transition: "width 0.5s ease" }} />
                                </div>
                                
                                {data.weekly_signal && (
                                    <div style={{ 
                                        display: "flex", 
                                        justifyContent: "space-between", 
                                        alignItems: "center", 
                                        background: "rgba(255,255,255,0.02)", 
                                        border: "1px solid rgba(255,255,255,0.05)",
                                        borderRadius: 8, 
                                        padding: "6px 10px", 
                                        marginTop: 8,
                                        fontSize: 11
                                    }}>
                                        <span style={{ color: "var(--text-muted)" }}>Weekly Trend:</span>
                                        <span style={{ 
                                            fontWeight: 700, 
                                            color: data.weekly_signal === "BUY" ? "var(--green)" : data.weekly_signal === "SELL" ? "var(--red)" : "var(--text-muted)"
                                        }}>
                                            {data.weekly_signal}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Position Planner & Target Zones */}
                        {data.entry_zones && (
                            <div className="card" style={{ padding: 20 }}>
                                <h3 style={{ fontSize: 13.5, fontWeight: 800, margin: "0 0 16px 0", fontFamily: "'Inter', sans-serif" }}>
                                    Target Zones & Position Planner
                                </h3>
                                
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Ideal Entry:</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                                            {priceStr(data.symbol, data.entry_zones.entry)}
                                        </span>
                                    </div>
                                    
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Take Profit (Target):</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", fontFamily: "'JetBrains Mono', monospace" }}>
                                            {priceStr(data.symbol, data.entry_zones.take_profit)}
                                        </span>
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Stop Loss:</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--red)", fontFamily: "'JetBrains Mono', monospace" }}>
                                            {priceStr(data.symbol, data.entry_zones.stop_loss)}
                                        </span>
                                    </div>

                                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10, marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Risk/Reward Ratio:</span>
                                        <span style={{ 
                                            fontSize: 12, 
                                            fontWeight: 800, 
                                            background: data.entry_zones.risk_reward >= 2 ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
                                            color: data.entry_zones.risk_reward >= 2 ? "#22c55e" : "#ef4444",
                                            padding: "2px 8px", 
                                            borderRadius: 6,
                                            fontFamily: "'JetBrains Mono', monospace"
                                        }}>
                                            1 : {data.entry_zones.risk_reward}
                                        </span>
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10 }}>
                                        <span style={{ color: "var(--text-muted)" }}>Volatility (ATR 14):</span>
                                        <span style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                                            {priceStr(data.symbol, data.entry_zones.atr)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button className="export-btn print-hide" onClick={() => window.print()}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                            Export Report
                        </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="right-grid">
                        
                        {data.realtime_prediction && (
                            <div className="card" style={{ 
                                padding: "22px 24px", 
                                background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)",
                                border: "1px solid rgba(255,255,255,0.06)",
                                position: "relative",
                                overflow: "hidden",
                                zIndex: 1
                            }}>
                                <div style={{
                                    position: "absolute",
                                    top: -40,
                                    right: -40,
                                    width: 120,
                                    height: 120,
                                    borderRadius: "50%",
                                    background: data.realtime_prediction.action.includes("BUY") ? "rgba(34, 197, 94, 0.08)" : data.realtime_prediction.action.includes("SELL") ? "rgba(239, 68, 68, 0.08)" : "rgba(245, 158, 11, 0.08)",
                                    filter: "blur(40px)",
                                    pointerEvents: "none"
                                }} />
                                
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                                    <div>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                            ⚡ Real-Time Trading Advisor
                                        </span>
                                        <h3 style={{ fontSize: 18, fontWeight: 800, margin: "6px 0 0 0", letterSpacing: "-0.3px", color: "#f3f4f6" }}>
                                            Live Execution Status
                                        </h3>
                                    </div>
                                    {(() => {
                                        const action = data.realtime_prediction.action;
                                        let bg = "rgba(255,255,255,0.04)";
                                        let border = "rgba(255,255,255,0.08)";
                                        let color = "#9ca3af";
                                        let glow = "none";
                                        
                                        if (action === "STRONG BUY") {
                                            bg = "rgba(34, 197, 94, 0.12)";
                                            border = "rgba(34, 197, 94, 0.3)";
                                            color = "#22c55e";
                                            glow = "0 0 16px rgba(34, 197, 94, 0.25)";
                                        } else if (action === "BUY ON DIP") {
                                            bg = "rgba(59, 130, 246, 0.12)";
                                            border = "rgba(59, 130, 246, 0.3)";
                                            color = "#3b82f6";
                                            glow = "0 0 16px rgba(59, 130, 246, 0.25)";
                                        } else if (action === "STRONG SELL") {
                                            bg = "rgba(239, 68, 68, 0.12)";
                                            border = "rgba(239, 68, 68, 0.3)";
                                            color = "#ef4444";
                                            glow = "0 0 16px rgba(239, 68, 68, 0.25)";
                                        } else if (action === "SHORT-TERM RALLY") {
                                            bg = "rgba(168, 85, 247, 0.12)";
                                            border = "rgba(168, 85, 247, 0.3)";
                                            color = "#a855f7";
                                            glow = "0 0 16px rgba(168, 85, 247, 0.25)";
                                        } else if (action === "BUY / WAIT" || action === "SELL / WAIT") {
                                            bg = "rgba(245, 158, 11, 0.1)";
                                            border = "rgba(245, 158, 11, 0.25)";
                                            color = "#f59e0b";
                                            glow = "0 0 12px rgba(245, 158, 11, 0.15)";
                                        }
                                        
                                        const confScore = calculateAgreementConfidence(data.summary, action);
                                        
                                        return (
                                            <div style={{
                                                padding: "6px 14px",
                                                borderRadius: 8,
                                                background: bg,
                                                border: `1px solid ${border}`,
                                                color: color,
                                                fontSize: 11.5,
                                                fontWeight: 800,
                                                letterSpacing: "0.05em",
                                                boxShadow: glow
                                            }}>
                                                {action} — {confScore}% CONFIDENCE
                                            </div>
                                        );
                                    })()}
                                </div>
                                
                                <p style={{ fontSize: 13, color: "#d1d5db", lineHeight: 1.6, margin: "0 0 20px 0" }}>
                                    {data.realtime_prediction.advice}
                                </p>
                                
                                {data.entry_zones && (() => {
                                    const action = data.realtime_prediction.action;
                                    const isBearish = action.includes("SELL");
                                    
                                    const buyLabel = isBearish ? "🔵 Cover Target" : "🟢 Suggested Buy";
                                    const sellLabel = isBearish ? "🔴 Short Entry" : "🔴 Suggested Sell";
                                    
                                    const buyVal = isBearish ? data.entry_zones.take_profit : data.entry_zones.entry;
                                    const sellVal = isBearish ? data.entry_zones.entry : data.entry_zones.take_profit;
                                    
                                    return (
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                                            <div style={{
                                                background: isBearish ? "rgba(59, 130, 246, 0.03)" : "rgba(34, 197, 94, 0.03)",
                                                border: `1px solid ${isBearish ? "rgba(59, 130, 246, 0.15)" : "rgba(34, 197, 94, 0.15)"}`,
                                                borderRadius: 12,
                                                padding: "12px 14px",
                                                textAlign: "center"
                                            }}>
                                                <span style={{ 
                                                    fontSize: 9.5, 
                                                    color: isBearish ? "#3b82f6" : "#22c55e", 
                                                    fontWeight: 700, 
                                                    textTransform: "uppercase", 
                                                    letterSpacing: "0.06em", 
                                                    display: "block", 
                                                    marginBottom: 4 
                                                }}>
                                                    {buyLabel}
                                                </span>
                                                <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "#f3f4f6" }}>
                                                    {priceStr(data.symbol, buyVal)}
                                                </span>
                                            </div>

                                            <div style={{
                                                background: "rgba(239, 68, 68, 0.03)",
                                                border: "1px solid rgba(239, 68, 68, 0.15)",
                                                borderRadius: 12,
                                                padding: "12px 14px",
                                                textAlign: "center"
                                            }}>
                                                <span style={{ 
                                                    fontSize: 9.5, 
                                                    color: "#ef4444", 
                                                    fontWeight: 700, 
                                                    textTransform: "uppercase", 
                                                    letterSpacing: "0.06em", 
                                                    display: "block", 
                                                    marginBottom: 4 
                                                }}>
                                                    {sellLabel}
                                                </span>
                                                <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "#f3f4f6" }}>
                                                    {priceStr(data.symbol, sellVal)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}
                                
                                <div style={{ 
                                    display: "grid", 
                                    gridTemplateColumns: "repeat(3, 1fr)", 
                                    gap: 10,
                                    borderTop: "1px solid rgba(255,255,255,0.05)",
                                    paddingTop: 16
                                }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        <span style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.02em" }}>Weekly Trend</span>
                                        <div style={{ 
                                            padding: "6px 8px", 
                                            borderRadius: 6,
                                            background: "rgba(255,255,255,0.015)",
                                            border: "1px solid rgba(255,255,255,0.04)",
                                            fontSize: 11.5,
                                            fontWeight: 700,
                                            textAlign: "center",
                                            color: data.weekly_signal === "BUY" ? "#22c55e" : data.weekly_signal === "SELL" ? "#ef4444" : "#f59e0b"
                                        }}>
                                            {data.weekly_signal || "NEUTRAL"}
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        <span style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.02em" }}>Daily Signal</span>
                                        <div style={{ 
                                            padding: "6px 8px", 
                                            borderRadius: 6,
                                            background: "rgba(255,255,255,0.015)",
                                            border: "1px solid rgba(255,255,255,0.04)",
                                            fontSize: 11.5,
                                            fontWeight: 700,
                                            textAlign: "center",
                                            color: data.signal === "BUY" ? "#22c55e" : data.signal === "SELL" ? "#ef4444" : "#f59e0b"
                                        }}>
                                            {data.signal || "NEUTRAL"}
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        <span style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.02em" }}>Intraday (15m)</span>
                                        <div style={{ 
                                            padding: "6px 8px", 
                                            borderRadius: 6,
                                            background: "rgba(255,255,255,0.015)",
                                            border: "1px solid rgba(255,255,255,0.04)",
                                            fontSize: 11.5,
                                            fontWeight: 700,
                                            textAlign: "center",
                                            color: data.realtime_prediction.intraday_signal === "BUY" ? "#22c55e" : data.realtime_prediction.intraday_signal === "SELL" ? "#ef4444" : "#f59e0b"
                                        }}>
                                            {data.realtime_prediction.intraday_signal || "NEUTRAL"}
                                        </div>
                                    </div>
                                </div>
                                
                                <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
                                    <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>
                                        Intraday Momentum Strength:
                                    </span>
                                    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 6, height: 4, flex: 1, overflow: "hidden" }}>
                                        <div style={{ 
                                            height: "100%", 
                                            width: `${data.realtime_prediction.intraday_confidence}%`, 
                                            background: data.realtime_prediction.intraday_signal === "BUY" ? "#22c55e" : data.realtime_prediction.intraday_signal === "SELL" ? "#ef4444" : "#f59e0b",
                                            borderRadius: 6, 
                                            transition: "width 0.5s ease" 
                                        }} />
                                    </div>
                                    <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "var(--text-secondary)" }}>
                                        {data.realtime_prediction.intraday_confidence}%
                                    </span>
                                </div>
                            </div>
                        )}

                        {data.realtime_prediction && (
                            <div className="card" style={{
                                padding: "16px 20px",
                                background: "rgba(197, 168, 76, 0.03)",
                                border: "1px solid rgba(197, 168, 76, 0.15)",
                                borderRadius: 14,
                                position: "relative",
                                overflow: "hidden",
                                marginTop: -8,
                                zIndex: 1
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                    <span className="pulse-gold-dot" style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: "50%",
                                        background: "#fbbf24",
                                        display: "inline-block"
                                    }} />
                                    <span style={{ fontSize: 10, fontWeight: 800, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                        AI quant advisor
                                    </span>
                                </div>
                                <p style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0, fontFamily: "var(--font-inter, 'Inter', sans-serif)" }}>
                                    {data.ai_insight || fallbackAiInsight(data.symbol, data.realtime_prediction.action)}
                                </p>
                            </div>
                        )}
                        
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
                                <InteractiveChart 
                                    history={data.history} 
                                    positive={positive} 
                                    symbol={data.symbol} 
                                    entryZones={data.entry_zones}
                                    realtimePrediction={data.realtime_prediction}
                                />
                            </div>
                        </div>

                        {data.news && (
                            <div className="card" style={{ padding: "20px 24px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                                    <div>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                            📰 Live Accuracy Check
                                        </span>
                                        <h3 style={{ fontSize: 15, fontWeight: 800, margin: "4px 0 0 0", fontFamily: "'Inter', sans-serif" }}>
                                            Market Sentiment & News Feed
                                        </h3>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Overall Sentiment:</span>
                                        <span style={{
                                            fontSize: 11,
                                            fontWeight: 800,
                                            padding: "3px 8px",
                                            borderRadius: 6,
                                            background: data.sentiment === "BULLISH" ? "rgba(34,197,94,0.12)" : data.sentiment === "BEARISH" ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)",
                                            color: data.sentiment === "BULLISH" ? "#22c55e" : data.sentiment === "BEARISH" ? "#ef4444" : "#9ca3af",
                                            letterSpacing: "0.02em"
                                        }}>
                                            {data.sentiment || "NEUTRAL"}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ marginBottom: 20 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11.5 }}>
                                        <span style={{ color: "var(--text-muted)" }}>News Sentiment Score</span>
                                        <span style={{ fontWeight: 700, color: data.sentiment_score > 0.15 ? "#22c55e" : data.sentiment_score < -0.15 ? "#ef4444" : "#9ca3af" }}>
                                            {data.sentiment_score > 0 ? "+" : ""}{data.sentiment_score}
                                        </span>
                                    </div>
                                    <div style={{ position: "relative", height: 8, background: "rgba(255,255,255,0.04)", borderRadius: 4, overflow: "hidden" }}>
                                        <div style={{
                                            position: "absolute",
                                            left: `${((data.sentiment_score + 1.0) / 2.0) * 100}%`,
                                            top: 0,
                                            width: 8,
                                            height: 8,
                                            background: "#fff",
                                            borderRadius: "50%",
                                            boxShadow: "0 0 8px rgba(255,255,255,0.6)",
                                            transform: "translateX(-50%)",
                                            zIndex: 2
                                        }} />
                                        <div style={{
                                            position: "absolute",
                                            left: 0,
                                            top: 0,
                                            width: "100%",
                                            height: "100%",
                                            background: "linear-gradient(90deg, #ef4444 0%, #4b5563 50%, #22c55e 100%)",
                                            opacity: 0.6
                                        }} />
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9.5, color: "var(--text-muted)" }}>
                                        <span>Bearish (-1.0)</span>
                                        <span>Neutral (0.0)</span>
                                        <span>Bullish (+1.0)</span>
                                    </div>
                                </div>

                                {data.news.length === 0 ? (
                                    <div style={{ padding: "20px 10px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 10 }}>
                                        <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block" }}>
                                            No recent news articles found for this ticker.
                                        </span>
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 350, overflowY: "auto", paddingRight: 4 }}>
                                        {data.news.map((item, i) => (
                                            <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 6,
                                                padding: 12,
                                                borderRadius: 10,
                                                background: "rgba(255,255,255,0.015)",
                                                border: "1px solid rgba(255,255,255,0.04)",
                                                textDecoration: "none",
                                                transition: "all 0.15s ease"
                                            }}
                                            className="news-card-link"
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = "rgba(255,255,255,0.035)";
                                                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = "rgba(255,255,255,0.015)";
                                                e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
                                            }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                                                    <span style={{ fontSize: 12.5, fontWeight: 700, color: "#f3f4f6", lineHeight: 1.4 }}>
                                                        {item.title}
                                                    </span>
                                                    <span style={{
                                                        fontSize: 9,
                                                        fontWeight: 800,
                                                        textTransform: "uppercase",
                                                        padding: "2px 6px",
                                                        borderRadius: 4,
                                                        background: item.sentiment === "positive" ? "rgba(34,197,94,0.12)" : item.sentiment === "negative" ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)",
                                                        color: item.sentiment === "positive" ? "#22c55e" : item.sentiment === "negative" ? "#ef4444" : "#9ca3af",
                                                        flexShrink: 0
                                                    }}>
                                                        {item.sentiment}
                                                    </span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--text-muted)" }}>
                                                    <span>{item.publisher || "Market Source"}</span>
                                                    <span>{item.pubDate ? new Date(item.pubDate).toLocaleDateString() : ""}</span>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", margin: "0 0 12px 6px" }}>Key Market Statistics</h3>
                            <div className="metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                                <MetricItem label="Open" value={priceStr(data.symbol, data.summary?.open)} />
                                <MetricItem label="Session Range" value={`${priceStr(data.symbol, data.summary?.low)} - ${priceStr(data.symbol, data.summary?.high)}`} />
                                <MetricItem 
                                    label="RSI Value" 
                                    value={`${typeof data.summary?.rsi === "number" ? data.summary.rsi.toFixed(2) : (data.summary?.rsi ?? "—")} (${rsiLabel})`} 
                                    color={rsiColor} 
                                />
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

                        {/* Strategy Backtester Widget */}
                        <div className="card" style={{ padding: "20px 24px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                <div>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                        🧪 No-Code Strategy Tester
                                    </span>
                                    <h3 style={{ fontSize: 15, fontWeight: 800, margin: "4px 0 0 0", fontFamily: "'Inter', sans-serif" }}>
                                        Historical Backtester
                                    </h3>
                                </div>
                                
                                <div style={{ display: "flex", gap: 8 }}>
                                    <select 
                                        value={backtestStrategy}
                                        onChange={e => setBacktestStrategy(e.target.value)}
                                        style={{
                                            background: "#0c0f1d",
                                            color: "#f3f4f6",
                                            border: "1px solid rgba(255,255,255,0.08)",
                                            borderRadius: 8,
                                            padding: "4px 8px",
                                            fontSize: 12,
                                            fontWeight: 600,
                                            outline: "none"
                                        }}
                                    >
                                        <option value="RSI_REVERSION">RSI Reversion</option>
                                        <option value="EMA_CROSSOVER">EMA Crossover</option>
                                    </select>
                                    
                                    <button 
                                        onClick={handleRunBacktest}
                                        disabled={backtestLoading}
                                        style={{
                                            background: "#22c55e",
                                            color: "#030712",
                                            border: "none",
                                            borderRadius: 8,
                                            padding: "6px 14px",
                                            fontSize: 11.5,
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            opacity: backtestLoading ? 0.7 : 1,
                                            transition: "all 0.15s"
                                        }}
                                        onMouseEnter={e => { if (!backtestLoading) e.currentTarget.style.background = "#16a34a"; }}
                                        onMouseLeave={e => { if (!backtestLoading) e.currentTarget.style.background = "#22c55e"; }}
                                    >
                                        {backtestLoading ? "Running..." : "Simulate"}
                                    </button>
                                </div>
                            </div>
                            
                            {backtestError && (
                                <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.18)", borderRadius: 10, padding: "10px 12px", color: "#ef4444", fontSize: 12, marginBottom: 12 }}>
                                    {backtestError}
                                </div>
                            )}
                            
                            {!backtestData && !backtestLoading && !backtestError && (
                                <div style={{ padding: "20px 10px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 10 }}>
                                    <span style={{ fontSize: 18, display: "block", marginBottom: 6 }}>🧪</span>
                                    <span style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5, display: "block" }}>
                                        Select a strategy rule from the dropdown and click "Simulate" to run a 1-year historical backtest.
                                    </span>
                                </div>
                            )}
                            
                            {backtestLoading && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "10px 0" }}>
                                    <div className="skel" style={{ height: 12, width: "60%" }} />
                                    <div className="skel" style={{ height: 35, width: "100%" }} />
                                    <div className="skel" style={{ height: 60, width: "100%" }} />
                                </div>
                            )}
                            
                            {backtestData && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeUp 0.3s ease" }}>
                                    {/* Key Summary Badges */}
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                                        <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 10, padding: 10, textAlign: "center" }}>
                                            <span style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Win Rate</span>
                                            <span style={{ fontSize: 16, fontWeight: 800, color: backtestData.win_rate >= 50 ? "#22c55e" : "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>
                                                {backtestData.win_rate}%
                                            </span>
                                        </div>
                                        <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 10, padding: 10, textAlign: "center" }}>
                                            <span style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Strategy Return</span>
                                            <span style={{ fontSize: 16, fontWeight: 800, color: backtestData.strategy_return >= 0 ? "#22c55e" : "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>
                                                {backtestData.strategy_return >= 0 ? "+" : ""}{backtestData.strategy_return}%
                                            </span>
                                        </div>
                                        <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 10, padding: 10, textAlign: "center" }}>
                                            <span style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Buy & Hold</span>
                                            <span style={{ fontSize: 16, fontWeight: 800, color: backtestData.buy_and_hold_return >= 0 ? "#22c55e" : "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>
                                                {backtestData.buy_and_hold_return >= 0 ? "+" : ""}{backtestData.buy_and_hold_return}%
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Visual Performance Meter */}
                                    <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px 14px" }}>
                                        <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 8 }}>
                                            Performance vs Buy & Hold
                                        </span>
                                        
                                        {/* Strategy Bar */}
                                        <div style={{ marginBottom: 10 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                                                <span style={{ color: "var(--text-secondary)" }}>Strategy Return</span>
                                                <span style={{ fontWeight: 700, color: backtestData.strategy_return >= 0 ? "#22c55e" : "#ef4444" }}>{backtestData.strategy_return}%</span>
                                            </div>
                                            <div style={{ background: "rgba(255,255,255,0.04)", height: 6, borderRadius: 3, overflow: "hidden" }}>
                                                <div style={{
                                                    height: "100%",
                                                    width: `${Math.min(Math.max(5, Math.abs(backtestData.strategy_return)), 100)}%`,
                                                    background: backtestData.strategy_return >= 0 ? "#22c55e" : "#ef4444",
                                                    borderRadius: 3
                                                }} />
                                            </div>
                                        </div>

                                        {/* Buy & Hold Bar */}
                                        <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                                                <span style={{ color: "var(--text-secondary)" }}>Buy & Hold Return</span>
                                                <span style={{ fontWeight: 700, color: backtestData.buy_and_hold_return >= 0 ? "#22c55e" : "#ef4444" }}>{backtestData.buy_and_hold_return}%</span>
                                            </div>
                                            <div style={{ background: "rgba(255,255,255,0.04)", height: 6, borderRadius: 3, overflow: "hidden" }}>
                                                <div style={{
                                                    height: "100%",
                                                    width: `${Math.min(Math.max(5, Math.abs(backtestData.buy_and_hold_return)), 100)}%`,
                                                    background: backtestData.buy_and_hold_return >= 0 ? "#22c55e" : "#ef4444",
                                                    borderRadius: 3
                                                }} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Trades History Table */}
                                    <div>
                                        <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 8 }}>
                                            Simulated Trades ({backtestData.total_trades})
                                        </span>
                                        {backtestData.trades.length === 0 ? (
                                            <div style={{ fontSize: 11, color: "var(--text-faint)", textAlign: "center", padding: "10px 0" }}>
                                                No trades executed under current market condition.
                                            </div>
                                        ) : (
                                            <div style={{ maxHeight: 150, overflowY: "auto", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8 }}>
                                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, textAlign: "left" }}>
                                                    <thead>
                                                        <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "var(--text-muted)" }}>
                                                            <th style={{ padding: "6px 8px" }}>Entry</th>
                                                            <th style={{ padding: "6px 8px" }}>Exit</th>
                                                            <th style={{ padding: "6px 8px" }}>Buy</th>
                                                            <th style={{ padding: "6px 8px" }}>Sell</th>
                                                            <th style={{ padding: "6px 8px", textAlign: "right" }}>Return</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {backtestData.trades.map((t, idx) => (
                                                            <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                                                <td style={{ padding: "6px 8px" }}>{t.entry_date}</td>
                                                                <td style={{ padding: "6px 8px" }}>{t.exit_date}</td>
                                                                <td style={{ padding: "6px 8px", fontFamily: "'JetBrains Mono', monospace" }}>{t.entry_price}</td>
                                                                <td style={{ padding: "6px 8px", fontFamily: "'JetBrains Mono', monospace" }}>{t.exit_price}</td>
                                                                <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: t.return >= 0 ? "#22c55e" : "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>
                                                                    {t.return >= 0 ? "+" : ""}{t.return}%
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {data.engine_details && (
                            <div className="card" style={{ padding: "20px 24px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                    <h3 style={{ fontSize: 13.5, fontWeight: 800, margin: 0, fontFamily: "'Inter', sans-serif" }}>Quantitative Diagnostics</h3>
                                    <span style={{ 
                                        fontSize: 10, 
                                        fontWeight: 700, 
                                        background: data.engine_details.market_state === "Trending" ? "rgba(34, 197, 94, 0.12)" : "rgba(59, 130, 246, 0.12)",
                                        color: data.engine_details.market_state === "Trending" ? "#22c55e" : "#3b82f6",
                                        padding: "2px 8px", 
                                        borderRadius: 12,
                                        textTransform: "uppercase"
                                    }}>
                                        {data.engine_details.market_state} Market
                                    </span>
                                </div>
                                
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
                                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 10, padding: 12 }}>
                                        <span style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Efficiency Ratio</span>
                                        <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#f3f4f6" }}>
                                            {(data.engine_details.efficiency_ratio * 100).toFixed(0)}%
                                        </span>
                                        <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
                                            <div style={{ width: `${data.engine_details.efficiency_ratio * 100}%`, height: "100%", background: "#22c55e" }} />
                                        </div>
                                    </div>

                                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 10, padding: 12 }}>
                                        <span style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Trend Score</span>
                                        <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: data.engine_details.trend_contribution >= 0 ? "var(--green)" : "var(--red)" }}>
                                            {data.engine_details.trend_contribution >= 0 ? "+" : ""}{data.engine_details.trend_contribution.toFixed(1)}
                                        </span>
                                        <span style={{ fontSize: 8.5, color: "var(--text-muted)", display: "block", marginTop: 4, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                            {data.engine_details.macd_signal || "Neutral"}
                                        </span>
                                    </div>

                                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 10, padding: 12 }}>
                                        <span style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Range Reversion</span>
                                        <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: data.engine_details.range_contribution >= 0 ? "var(--green)" : "var(--red)" }}>
                                            {data.engine_details.range_contribution >= 0 ? "+" : ""}{data.engine_details.range_contribution.toFixed(1)}
                                        </span>
                                        <span style={{ fontSize: 8.5, color: "var(--text-muted)", display: "block", marginTop: 4, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                            {data.engine_details.rsi_state || "Neutral"}
                                        </span>
                                    </div>

                                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 10, padding: 12 }}>
                                        <span style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Volume Conf.</span>
                                        <span style={{ fontSize: 12, fontWeight: 700, display: "block", margin: "2px 0 4px 0", color: data.engine_details.volume_ratio > 1.2 ? "var(--green)" : data.engine_details.volume_ratio < 0.6 ? "var(--red)" : "#f3f4f6", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                            {data.engine_details.volume_confirm}
                                        </span>
                                        <span style={{ fontSize: 8.5, color: "var(--text-muted)", display: "block" }}>
                                            Ratio: {data.engine_details.volume_ratio ? `${data.engine_details.volume_ratio.toFixed(2)}x` : "N/A"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

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
