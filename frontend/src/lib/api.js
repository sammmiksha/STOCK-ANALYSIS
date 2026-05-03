const BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const ANALYZE_API = `${BASE}/analyze`;
export const SEARCH_API = `${BASE}/search`;

// Map common Indian-market shortcuts
export function formatSymbol(s) {
    s = s.toUpperCase().trim();
    if (s.includes(".")) return s;
    if (s === "HDFC") return "HDFCBANK.NS";
    // Default to NSE listing
    return s + ".NS";
}
