import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { doc, getDoc, setDoc } from "firebase/firestore";

const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000"
    : "https://stockai-ts48.onrender.com";

const withTimeout = (promise, ms = 2000) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))
    ]);
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(str, opts = { day: "numeric", month: "long", year: "numeric" }) {
    return str ? new Date(str).toLocaleDateString("en-IN", opts) : "—";
}

function priceStr(symbol, price) {
    if (price === undefined || price === null) return "—";
    const isIndian = symbol?.includes(".NS") || symbol?.includes(".BO");
    const formatted = parseFloat(price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return isIndian ? `₹${formatted}` : `$${formatted}`;
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent, sub }) {
    return (
        <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 12, padding: "16px 18px",
        }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.09em", fontWeight: 600, marginBottom: 8 }}>
                {label}
            </div>
            <div style={{ color: accent || "#e5e7eb", fontSize: 18, fontWeight: 800, lineHeight: 1, fontFamily: "'Inter', sans-serif" }}>
                {value}
            </div>
            {sub && <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>{sub}</div>}
        </div>
    );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ user }) {
    const initials = (user.displayName || user.email || "U")
        .split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

    return (
        <div style={{ position: "relative", display: "inline-block" }}>
            <div style={{
                width: 80, height: 80, borderRadius: "50%",
                background: user.photoURL ? "transparent" : "linear-gradient(135deg,#22c55e,#16a34a)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, fontWeight: 800, color: "#030a04",
                boxShadow: "0 0 28px rgba(34,197,94,0.25)",
                border: "2px solid rgba(34,197,94,0.3)",
                overflow: "hidden",
            }}>
                {user.photoURL
                    ? <img src={user.photoURL} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
                    : <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{initials}</span>
                }
            </div>
            <div style={{
                position: "absolute", bottom: 2, right: 2,
                width: 14, height: 14, borderRadius: "50%",
                background: "#22c55e", border: "2px solid #080b14",
                boxShadow: "0 0 8px rgba(34,197,94,0.6)",
            }} />
        </div>
    );
}

// ── Tab Button ────────────────────────────────────────────────────────────────
function TabBtn({ label, active, onClick }) {
    return (
        <button onClick={onClick} style={{
            flex: 1, background: active ? "rgba(34,197,94,0.08)" : "transparent",
            border: "none", color: active ? "#22c55e" : "var(--text-secondary)",
            padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700,
            cursor: "pointer", transition: "all 0.15s",
            textTransform: "capitalize", letterSpacing: "0.03em",
            boxShadow: active ? "inset 0 0 0 1px rgba(34,197,94,0.15)" : "none",
        }}>
            {label}
        </button>
    );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ children, style = {} }) {
    return (
        <div style={{
            background: "rgba(255,255,255,0.015)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 14, padding: "18px 20px",
            ...style,
        }}>
            {children}
        </div>
    );
}

function SectionLabel({ children }) {
    return (
        <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 14 }}>
            {children}
        </div>
    );
}

// ── DataRow ───────────────────────────────────────────────────────────────────
function DataRow({ label, value, color, last }) {
    return (
        <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 0",
            borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.04)",
        }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: 13, color: color || "#e5e7eb", fontWeight: 600 }}>{value}</span>
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Profile() {
    const [user, setUser] = useState(null);
    const [mounted, setMounted] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState(false);
    const [tab, setTab] = useState("account");

    const [watchlist, setWatchlist] = useState([]);
    const [watchlistLoading, setWatchlistLoading] = useState(false);

    const [alerts, setAlerts] = useState([]);
    const [alertsLoading, setAlertsLoading] = useState(false);

    const navigate = useNavigate();

    const fetchWatchlist = async (uid) => {
        try {
            setWatchlistLoading(true);
            let loadedFromFirestore = false;
            try {
                const docRef = doc(db, "watchlists", uid);
                const docSnap = await withTimeout(getDoc(docRef), 2000);
                if (docSnap.exists()) {
                    setWatchlist(docSnap.data().symbols || []);
                    loadedFromFirestore = true;
                }
            } catch (err) {
                console.warn("Firestore fetchWatchlist in profile failed, trying backend fallback:", err);
            }
            
            if (!loadedFromFirestore) {
                const res = await axios.get(`${API_BASE}/watchlist?user=${uid}`);
                setWatchlist(res.data.symbols || []);
            }
        } catch (err) {
            console.error("Failed to fetch watchlist in profile:", err);
        } finally {
            setWatchlistLoading(false);
        }
    };

    const fetchAlerts = async (uid) => {
        try {
            setAlertsLoading(true);
            let loadedFromFirestore = false;
            try {
                const docRef = doc(db, "alerts", uid);
                const docSnap = await withTimeout(getDoc(docRef), 2000);
                if (docSnap.exists()) {
                    setAlerts(docSnap.data().alerts || []);
                    loadedFromFirestore = true;
                }
            } catch (err) {
                console.warn("Firestore fetchAlerts in profile failed, trying backend fallback:", err);
            }
            
            if (!loadedFromFirestore) {
                const res = await axios.get(`${API_BASE}/alerts?user=${uid}`);
                setAlerts(res.data.alerts || []);
            }
        } catch (err) {
            console.error("Failed to fetch alerts in profile:", err);
        } finally {
            setAlertsLoading(false);
        }
    };

    const handleRemoveWatchlist = async (sym) => {
        if (!user?.uid) return;
        const updatedSymbols = watchlist.filter(s => s !== sym);
        setWatchlist(updatedSymbols);
        
        try {
            const docRef = doc(db, "watchlists", user.uid);
            await withTimeout(setDoc(docRef, { symbols: updatedSymbols }, { merge: true }), 2000);
        } catch (err) {
            console.warn("Firestore watchlist remove in profile failed:", err);
        }
        
        try {
            await axios.post(`${API_BASE}/watchlist/remove`, {
                user: user.uid,
                symbol: sym
            });
        } catch (err) {
            console.error("Failed to remove watchlist item:", err);
        }
    };

    const handleRemoveAlert = async (sym) => {
        if (!user?.uid) return;
        const updatedAlerts = alerts.filter(a => a.symbol !== sym);
        setAlerts(updatedAlerts);
        
        try {
            const docRef = doc(db, "alerts", user.uid);
            await withTimeout(setDoc(docRef, { alerts: updatedAlerts }, { merge: true }), 2000);
        } catch (err) {
            console.warn("Firestore alerts remove in profile failed:", err);
        }
        
        try {
            await axios.post(`${API_BASE}/alerts/remove`, {
                user: user.uid,
                symbol: sym
            });
        } catch (err) {
            console.error("Failed to remove alert:", err);
        }
    };

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, u => {
            if (!u) {
                navigate("/login");
            } else {
                setUser(u);
                fetchWatchlist(u.uid);
                fetchAlerts(u.uid);
                setTimeout(() => setMounted(true), 60);
            }
        });
        return () => unsub();
    }, [navigate]);

    const handleLogout = async () => {
        setLoggingOut(true);
        await signOut(auth);
        navigate("/login");
    };

    const copyUID = () => {
        if (!user?.uid) return;
        navigator.clipboard.writeText(user.uid);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 1800);
    };

    const fi = (delay = 0) => ({
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(14px)",
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
    });

    const PROVIDER_LABEL = { "google.com": "Google", "password": "Email / Password", "github.com": "GitHub", "twitter.com": "Twitter" };

    if (!user) return (
        <div style={{ minHeight: "100vh", background: "#060810", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(34,197,94,0.15)", borderTopColor: "#22c55e", animation: "spin 0.8s linear infinite" }} />
                <span style={{ color: "#4b5563", fontSize: 13 }}>Authenticating…</span>
            </div>
        </div>
    );

    const provider = PROVIDER_LABEL[user.providerData[0]?.providerId] || user.providerData[0]?.providerId || "—";
    const joinDate = fmtDate(user.metadata?.creationTime);
    
    // Real dynamic days active calculation
    const daysActive = user.metadata?.creationTime
        ? Math.max(1, Math.ceil((new Date() - new Date(user.metadata.creationTime)) / (1000 * 60 * 60 * 24)))
        : 1;

    return (
        <div style={{ minHeight: "100vh", background: "#060810", color: "#e5e7eb", fontFamily: "'Inter', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                
                .action-row-btn {
                    width: 100%; display: flex; align-items: center; gap: 10px;
                    background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 10px; padding: 11px 14px;
                    color: var(--text-secondary); font-size: 13px; font-weight: 600;
                    cursor: pointer; text-align: left;
                    transition: all 0.15s;
                }
                .action-row-btn:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); border-color: rgba(255,255,255,0.1); }
                
                .signout-primary {
                    width: 100%; padding: 13px; border-radius: 10px;
                    background: #22c55e; color: #030712; border: none;
                    font-size: 13px; font-weight: 800; cursor: pointer;
                    letter-spacing: 0.02em; transition: all 0.2s;
                    box-shadow: 0 0 20px rgba(34,197,94,0.2);
                }
                .signout-primary:hover:not(:disabled) { background: #16a34a; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(34,197,94,0.3); }
                .signout-primary:disabled { opacity: 0.55; cursor: not-allowed; }
                
                .copy-btn {
                    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
                    color: var(--text-secondary); padding: 4px 12px; border-radius: 7px;
                    cursor: pointer; font-size: 11px; font-weight: 700;
                    transition: all 0.15s; white-space: nowrap; flex-shrink: 0;
                }
                .copy-btn:hover { background: rgba(34,197,94,0.08); border-color: rgba(34,197,94,0.22); color: #22c55e; }

                .profile-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                    margin-bottom: 20px;
                }

                .alert-details-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                    background: rgba(0,0,0,0.15);
                    padding: 12px;
                    border-radius: 8px;
                    border: 1px solid rgba(255,255,255,0.03);
                }

                @media (max-width: 540px) {
                    .profile-stats-grid {
                        grid-template-columns: 1fr;
                        gap: 8px;
                    }
                    .alert-details-grid {
                        grid-template-columns: 1fr;
                        gap: 8px;
                    }
                }
            `}</style>

            {/* Ambient glows */}
            <div style={{ position: "fixed", top: "5%", left: "50%", transform: "translateX(-50%)", width: 700, height: 400, background: "radial-gradient(ellipse, rgba(34,197,94,0.04) 0%, transparent 65%)", pointerEvents: "none", zIndex: 0 }} />
            <div style={{ position: "fixed", bottom: "10%", right: "5%", width: 400, height: 400, background: "radial-gradient(circle, rgba(59,130,246,0.03) 0%, transparent 65%)", pointerEvents: "none", zIndex: 0 }} />

            {/* Content */}
            <div style={{ position: "relative", zIndex: 1, maxWidth: 620, margin: "0 auto", padding: "40px 24px 80px" }}>

                {/* ── Profile Header ── */}
                <div style={{ ...fi(0), display: "flex", alignItems: "center", gap: 20, marginBottom: 28, flexWrap: "wrap" }}>
                    <Avatar user={user} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", fontFamily: "'Inter', sans-serif" }}>
                                {user.displayName || user.email?.split("@")[0] || "Trader"}
                            </h1>
                            {user.emailVerified && (
                                <span style={{
                                    background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.22)",
                                    color: "#22c55e", fontSize: 10, fontWeight: 700,
                                    padding: "2px 9px", borderRadius: 100, letterSpacing: "0.06em",
                                }}>✓ Verified</span>
                            )}
                        </div>
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>{user.email}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Member since {joinDate}</p>
                    </div>
                    <button onClick={handleLogout} style={{
                        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)",
                        color: "#ef4444", padding: "8px 16px", borderRadius: 9,
                        fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                        flexShrink: 0,
                    }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.15)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
                    >
                        Sign Out
                    </button>
                </div>

                {/* ── Real Quick Stats Row ── */}
                <div className="profile-stats-grid" style={fi(80)}>
                    <StatCard label="Days Active" value={daysActive} accent="#22c55e" sub="since joining" />
                    <StatCard label="Watchlist" value={watchlistLoading ? "…" : watchlist.length} accent="#818cf8" sub="stocks saved" />
                    <StatCard label="Active Alerts" value={alertsLoading ? "…" : alerts.length} accent="#22d3ee" sub="alert pins set" />
                </div>

                {/* ── Tabs ── */}
                <div style={{
                    ...fi(120),
                    display: "flex", gap: 4,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 10, padding: 4,
                    marginBottom: 16,
                }}>
                    {["account", "watchlist", "alerts"].map(t => (
                        <TabBtn key={t} label={t} active={tab === t} onClick={() => setTab(t)} />
                    ))}
                </div>

                {/* ── ACCOUNT TAB ── */}
                {tab === "account" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, ...fi(140) }}>

                        {/* UID */}
                        <Section>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.09em", fontWeight: 600, marginBottom: 6 }}>User ID</div>
                                    <div style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono',monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {user.uid}
                                    </div>
                                </div>
                                <button className="copy-btn" onClick={copyUID}>
                                    {copyFeedback ? "✓ Copied" : "Copy"}
                                </button>
                            </div>
                        </Section>

                        {/* Account details */}
                        <Section>
                            <SectionLabel>Account Details</SectionLabel>
                            <DataRow label="Display Name" value={user.displayName || "—"} />
                            <DataRow label="Email Address" value={user.email || "—"} />
                            <DataRow label="Auth Provider" value={provider} />
                            <DataRow label="Subscription Plan" value="Free Tier" color="#f59e0b" />
                            <DataRow label="Member Since" value={joinDate} last />
                        </Section>

                        {/* Quick actions */}
                        <Section>
                            <SectionLabel>Quick Actions</SectionLabel>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <button className="action-row-btn" onClick={() => navigate("/dashboard")}>
                                    <span style={{ fontSize: 16 }}>📊</span>
                                    Go to Dashboard
                                    <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 13 }}>→</span>
                                </button>
                                <button className="action-row-btn" onClick={() => setTab("watchlist")}>
                                    <span style={{ fontSize: 16 }}>⭐</span>
                                    View Watchlist
                                    <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 13 }}>→</span>
                                </button>
                            </div>
                        </Section>
                    </div>
                )}

                {/* ── WATCHLIST TAB ── */}
                {tab === "watchlist" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, ...fi(140) }}>
                        <Section>
                            <SectionLabel>My Watchlist</SectionLabel>
                            
                            {watchlistLoading && (
                                <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-secondary)" }}>
                                    Loading watchlist…
                                </div>
                            )}

                            {!watchlistLoading && watchlist.length === 0 && (
                                <div style={{ padding: "30px 10px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 10 }}>
                                    <span style={{ fontSize: 24, display: "block", marginBottom: 8, color: "var(--text-muted)" }}>☆</span>
                                    <span style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5, display: "block" }}>
                                        Your watchlist is empty. Search a stock on the dashboard and click the star to watch it.
                                    </span>
                                </div>
                            )}

                            {!watchlistLoading && watchlist.length > 0 && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {watchlist.map(sym => (
                                        <div key={sym} style={{
                                            display: "flex", justifyContent: "space-between", alignItems: "center",
                                            padding: "12px 16px", background: "rgba(255,255,255,0.015)",
                                            border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10,
                                        }}>
                                            <div>
                                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: "#e5e7eb" }}>
                                                    {sym.split(".")[0]}
                                                </span>
                                                <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 8, textTransform: "uppercase", background: "rgba(255,255,255,0.03)", padding: "2px 6px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.04)" }}>
                                                    {sym.includes(".NS") ? "NSE" : sym.includes(".BO") ? "BSE" : "US"}
                                                </span>
                                            </div>
                                            <div style={{ display: "flex", gap: 10 }}>
                                                <button onClick={() => navigate(`/dashboard?symbol=${sym}`)} style={{
                                                    background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
                                                    color: "#22c55e", padding: "6px 12px", borderRadius: 6, fontSize: 11.5, fontWeight: 700,
                                                    cursor: "pointer", transition: "all 0.15s"
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = "rgba(34,197,94,0.18)"}
                                                onMouseLeave={e => e.currentTarget.style.background = "rgba(34,197,94,0.1)"}
                                                >
                                                    Dashboard
                                                </button>
                                                <button onClick={() => handleRemoveWatchlist(sym)} style={{
                                                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)",
                                                    color: "#ef4444", padding: "6px 12px", borderRadius: 6, fontSize: 11.5, fontWeight: 700,
                                                    cursor: "pointer", transition: "all 0.15s"
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.15)"}
                                                onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Section>
                    </div>
                )}

                {/* ── ALERTS TAB ── */}
                {tab === "alerts" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, ...fi(140) }}>
                        <Section>
                            <SectionLabel>Portfolio Pin Alerts</SectionLabel>

                            {alertsLoading && (
                                <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-secondary)" }}>
                                    Loading alerts…
                                </div>
                            )}

                            {!alertsLoading && alerts.length === 0 && (
                                <div style={{ padding: "30px 10px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 10 }}>
                                    <span style={{ fontSize: 24, display: "block", marginBottom: 8, color: "var(--text-muted)" }}>🛑</span>
                                    <span style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5, display: "block" }}>
                                        No active price alerts. Pin your purchase price on the dashboard to receive warning emails on drops.
                                    </span>
                                </div>
                            )}

                            {!alertsLoading && alerts.length > 0 && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {alerts.map(alert => {
                                        const triggerVal = alert.buy_price * (1 - alert.threshold / 100);
                                        return (
                                            <div key={alert.symbol} style={{
                                                background: "rgba(255,255,255,0.01)",
                                                border: "1px solid rgba(255,255,255,0.04)",
                                                borderRadius: 12, padding: "16px",
                                                display: "flex", flexDirection: "column", gap: 12,
                                            }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <div>
                                                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: "#e5e7eb" }}>
                                                            {alert.symbol.split(".")[0]}
                                                        </span>
                                                        <span style={{
                                                            fontSize: 10,
                                                            color: alert.triggered ? "#ef4444" : "#22c55e",
                                                            fontWeight: 700,
                                                            textTransform: "uppercase",
                                                            background: alert.triggered ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.06)",
                                                            border: `1px solid ${alert.triggered ? "rgba(239,68,68,0.18)" : "rgba(34,197,94,0.18)"}`,
                                                            padding: "2px 8px", borderRadius: 4, marginLeft: 10
                                                        }}>
                                                            {alert.triggered ? "Triggered (Crashed)" : "Active"}
                                                        </span>
                                                    </div>
                                                    <button onClick={() => handleRemoveAlert(alert.symbol)} style={{
                                                        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)",
                                                        color: "#ef4444", padding: "6px 12px", borderRadius: 6, fontSize: 11.5, fontWeight: 700,
                                                        cursor: "pointer", transition: "all 0.15s"
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.15)"}
                                                    onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
                                                    >
                                                        Remove Pin
                                                    </button>
                                                </div>
                                                <div className="alert-details-grid">
                                                    <div>
                                                        <div style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.02em", marginBottom: 2 }}>Buy Price</div>
                                                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#f3f4f6", fontFamily: "'JetBrains Mono', monospace" }}>{priceStr(alert.symbol, alert.buy_price)}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.02em", marginBottom: 2 }}>Threshold</div>
                                                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>-{alert.threshold}%</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.02em", marginBottom: 2 }}>Trigger Price</div>
                                                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>{priceStr(alert.symbol, triggerVal)}</div>
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                                    Alert email: <span style={{ color: "var(--text-secondary)" }}>{alert.email}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Section>
                    </div>
                )}

                {/* ── Bottom sign out button ── */}
                <div style={{ ...fi(300), marginTop: 20 }}>
                    <button className="signout-primary" onClick={handleLogout} disabled={loggingOut}>
                        {loggingOut
                            ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                <span style={{ width: 14, height: 14, border: "2px solid rgba(0,0,0,0.25)", borderTopColor: "#030712", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                                Signing out…
                            </span>
                            : "Sign Out"}
                    </button>
                </div>

            </div>
        </div>
    );
}