const BASE_URL = "https://stockai-ts48.onrender.com"

export const ANALYZE_API = `${BASE_URL}/analyze`
export const SEARCH_API = `${BASE_URL}/search`

// Map common Indian-market shortcuts
export function formatSymbol(s) {
    s = s.toUpperCase().trim();
    if (s.includes(".")) return s;
    if (s === "HDFC") return "HDFCBANK.NS";
    // Default to NSE listing
    return s + ".NS";
}
