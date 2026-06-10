const BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000"
    : "https://stockai-ts48.onrender.com";

export const ANALYZE_API = `${BASE_URL}/analyze`
export const SEARCH_API = `${BASE_URL}/search`

export function formatSymbol(s) {
    s = s.toUpperCase().trim();
    if (s.includes(".") || s.includes("=") || s.includes("-") || s.startsWith("^")) {
        return s;
    }
    if (s === "HDFC") return "HDFCBANK.NS";
    if (/^[A-Z]{1,5}$/.test(s)) return s;
    if (/^[A-Z]{6}$/.test(s)) return s;
    return s + ".NS";
}
