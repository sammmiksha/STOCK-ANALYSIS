const BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000"
    : "https://stockai-ts48.onrender.com";

export const ANALYZE_API = `${BASE_URL}/analyze`
export const SEARCH_API = `${BASE_URL}/search`

export function formatSymbol(s) {
    s = s.toUpperCase().trim();
    if (s.includes(".")) return s;
    if (s === "HDFC") return "HDFCBANK.NS";
    return s + ".NS";
}
