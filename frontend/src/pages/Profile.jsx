import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(str, opts = { day: "numeric", month: "long", year: "numeric" }) {
    return str ? new Date(str).toLocaleDateString("en-IN", opts) : "—";
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent, sub }) {
    return (
        <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12, padding: "16px 18px",
        }}>
            <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.09em", fontWeight: 600, marginBottom: 8 }}>
                {label}
            </div>
            <div style={{ color: accent || "#e5e7eb", fontSize: 18, fontWeight: 800, lineHeight: 1, fontFamily: "'Syne', sans-serif" }}>
                {value}
            </div>
            {sub && <div style={{ fontSize: 11, color: "#4b5563", marginTop: 6 }}>{sub}</div>}
        </div>
    );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ user }) {
    const initials = (user.displayName || user.email || "U")
        .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

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
            flex: 1, background: active ? "rgba(34,197,94,0.1)" : "transparent",
            border: "none", color: active ? "#22c55e" : "#6b7280",
            padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700,
            cursor: "pointer", transition: "all 0.15s",
            textTransform: "capitalize", letterSpacing: "0.03em",
            boxShadow: active ? "inset 0 0 0 1px rgba(34,197,94,0.2)" : "none",
        }}>
            {label}
        </button>
    );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ children, style = {} }) {
    return (
        <div style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14, padding: "18px 20px",
            ...style,
        }}>
            {children}
        </div>
    );
}

function SectionLabel({ children }) {
    return (
        <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 14 }}>
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
            borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.05)",
        }}>
            <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: 13, color: color || "#e5e7eb", fontWeight: 600 }}>{value}</span>
        </div>
    );
}

// ── Activity feed ─────────────────────────────────────────────────────────────
const ACTIVITY_ITEMS = [
    { icon: "🔑", label: "Signed in", color: "#22c55e" },
    { icon: "📊", label: "Viewed RELIANCE analysis", color: "#818cf8" },
    { icon: "⭐", label: "Added TCS to watchlist", color: "#f59e0b" },
    { icon: "🤖", label: "Generated AI analysis for NVDA", color: "#22d3ee" },
    { icon: "👤", label: "Account created", color: "#9ca3af" },
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Profile() {
    const [user, setUser] = useState(null);
    const [mounted, setMounted] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState(false);
    const [tab, setTab] = useState("account");
    const [stats, setStats] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, u => {
            if (!u) navigate("/login");
            else { setUser(u); setTimeout(() => setMounted(true), 60); }
        });
        return () => unsub();
    }, [navigate]);

    useEffect(() => {
        if (!user) return;
        fetch(`http://127.0.0.1:8000/user-stats?uid=${user.uid}`)
            .then(r => r.json())
            .then(setStats)
            .catch(() => { });
    }, [user]);

    const handleLogout = async () => {
        setLoggingOut(true);
        await signOut(auth);
        navigate("/login");
    };

    const copyUID = () => {
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
        <div style={{ minHeight: "100vh", background: "#080b14", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(34,197,94,0.15)", borderTopColor: "#22c55e", animation: "spin 0.8s linear infinite" }} />
                <span style={{ color: "#4b5563", fontSize: 13 }}>Authenticating…</span>
            </div>
        </div>
    );

    const provider = PROVIDER_LABEL[user.providerData[0]?.providerId] || user.providerData[0]?.providerId || "—";
    const joinDate = fmtDate(user.metadata?.creationTime);
    const lastLogin = fmtDate(user.metadata?.lastSignInTime, { day: "numeric", month: "short", year: "numeric" });

    return (
        <div style={{ minHeight: "100vh", background: "#080b14", color: "#e5e7eb", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .action-row-btn {
          width: 100%; display: flex; align-items: center; gap: 10px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px; padding: 11px 14px;
          color: #9ca3af; font-size: 13px; font-weight: 600;
          cursor: pointer; text-align: left;
          transition: all 0.15s;
        }
        .action-row-btn:hover { background: rgba(255,255,255,0.06); color: #e5e7eb; border-color: rgba(255,255,255,0.12); }
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
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
          color: #9ca3af; padding: 4px 12px; border-radius: 7px;
          cursor: pointer; font-size: 11px; font-weight: 700;
          transition: all 0.15s; white-space: nowrap; flex-shrink: 0;
        }
        .copy-btn:hover { background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.25); color: #22c55e; }
      `}</style>

            {/* Ambient glows */}
            <div style={{ position: "fixed", top: "5%", left: "50%", transform: "translateX(-50%)", width: 700, height: 400, background: "radial-gradient(ellipse, rgba(34,197,94,0.06) 0%, transparent 65%)", pointerEvents: "none", zIndex: 0 }} />
            <div style={{ position: "fixed", bottom: "10%", right: "5%", width: 400, height: 400, background: "radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 65%)", pointerEvents: "none", zIndex: 0 }} />

            {/* Content */}
            <div style={{ position: "relative", zIndex: 1, maxWidth: 620, margin: "0 auto", padding: "40px 24px 80px" }}>

                {/* ── Profile Header ── */}
                <div style={{ ...fi(0), display: "flex", alignItems: "center", gap: 20, marginBottom: 28, flexWrap: "wrap" }}>
                    <Avatar user={user} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", fontFamily: "'Syne', sans-serif" }}>
                                {user.displayName || "User"}
                            </h1>
                            {user.emailVerified && (
                                <span style={{
                                    background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.22)",
                                    color: "#22c55e", fontSize: 10, fontWeight: 700,
                                    padding: "2px 9px", borderRadius: 100, letterSpacing: "0.06em",
                                }}>✓ Verified</span>
                            )}
                        </div>
                        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>{user.email}</p>
                        <p style={{ fontSize: 11, color: "#374151" }}>Member since {joinDate}</p>
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

                {/* ── Quick Stats Row ── */}
                <div style={{ ...fi(80), display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
                    <StatCard label="Days Active" value={stats ? stats.days_active : "—"} accent="#22c55e" sub="since joining" />
                    <StatCard label="Stocks Viewed" value={stats ? stats.stocks_viewed : "—"} accent="#818cf8" sub="unique tickers" />
                    <StatCard label="AI Queries" value={stats ? stats.ai_queries : "—"} accent="#22d3ee" sub="analyses run" />
                </div>

                {/* ── Tabs ── */}
                <div style={{
                    ...fi(120),
                    display: "flex", gap: 4,
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 10, padding: 4,
                    marginBottom: 16,
                }}>
                    {["account", "security", "activity"].map(t => (
                        <TabBtn key={t} label={t} active={tab === t} onClick={() => setTab(t)} />
                    ))}
                </div>

                {/* ── ACCOUNT TAB ── */}
                {tab === "account" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, ...fi(140) }}>

                        {/* UID */}
                        <Section>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.09em", fontWeight: 600, marginBottom: 6 }}>User ID</div>
                                    <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: "'JetBrains Mono',monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                            <DataRow label="Email" value={user.email || "—"} />
                            <DataRow label="Auth Provider" value={provider} />
                            <DataRow label="Plan" value="Free Tier" color="#f59e0b" />
                            <DataRow label="Member Since" value={joinDate} last />
                        </Section>

                        {/* Quick actions */}
                        <Section>
                            <SectionLabel>Quick Actions</SectionLabel>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {[
                                    { label: "Go to Dashboard", icon: "📊", to: "/dashboard" },
                                    { label: "View Watchlist", icon: "⭐", to: "/watchlist" },
                                ].map(({ label, icon, to }) => (
                                    <button key={label} className="action-row-btn" onClick={() => navigate(to)}>
                                        <span style={{ fontSize: 16 }}>{icon}</span>
                                        {label}
                                        <span style={{ marginLeft: "auto", color: "#374151", fontSize: 13 }}>→</span>
                                    </button>
                                ))}
                            </div>
                        </Section>
                    </div>
                )}

                {/* ── SECURITY TAB ── */}
                {tab === "security" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, ...fi(140) }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <StatCard
                                label="Email Verified"
                                value={user.emailVerified ? "✓ Verified" : "✗ Not Verified"}
                                accent={user.emailVerified ? "#22c55e" : "#ef4444"}
                            />
                            <StatCard label="Auth Method" value={provider} />
                        </div>

                        <Section>
                            <SectionLabel>Session Info</SectionLabel>
                            <DataRow label="Last Sign-In" value={lastLogin} />
                            <DataRow label="Account Created" value={joinDate} last />
                        </Section>

                        {/* Active session */}
                        <Section>
                            <SectionLabel>Active Sessions</SectionLabel>
                            <div style={{
                                display: "flex", alignItems: "center", gap: 12,
                                background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.12)",
                                borderRadius: 9, padding: "10px 14px",
                            }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e", animation: "pulse 2s infinite", flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb" }}>Current session</div>
                                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                                        This browser · {new Date().toLocaleDateString("en-IN")}
                                    </div>
                                </div>
                            </div>
                        </Section>

                        {/* Danger */}
                        <Section style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.14)" }}>
                            <div style={{ fontSize: 10, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 6 }}>Danger Zone</div>
                            <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.7, marginBottom: 14 }}>
                                Signing out will end your current session on this device.
                            </p>
                            <button
                                style={{
                                    width: "100%", padding: "11px", borderRadius: 9,
                                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.22)",
                                    color: "#ef4444", fontSize: 13, fontWeight: 700, cursor: "pointer",
                                    transition: "all 0.15s",
                                }}
                                onClick={handleLogout} disabled={loggingOut}
                                onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.18)"}
                                onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.1)"}
                            >
                                {loggingOut ? "Signing out…" : "Sign Out"}
                            </button>
                        </Section>
                    </div>
                )}

                {/* ── ACTIVITY TAB ── */}
                {tab === "activity" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, ...fi(140) }}>
                        <Section>
                            <SectionLabel>Recent Activity</SectionLabel>
                            {ACTIVITY_ITEMS.map(({ icon, label, color }, i) => {
                                const times = [lastLogin, "Today", "Today", "Yesterday", joinDate];
                                return (
                                    <div key={i} style={{
                                        display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                                        borderBottom: i < ACTIVITY_ITEMS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                                    }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                            background: `${color}18`, border: `1px solid ${color}25`,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 15,
                                        }}>{icon}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 13, color: "#d1d5db", fontWeight: 500 }}>{label}</div>
                                            <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>{times[i]}</div>
                                        </div>
                                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, opacity: 0.5, flexShrink: 0 }} />
                                    </div>
                                );
                            })}
                        </Section>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                            <StatCard label="Days Active" value={stats ? stats.days_active : "—"} accent="#22c55e" />
                            <StatCard label="Stocks Viewed" value={stats ? stats.stocks_viewed : "—"} accent="#818cf8" />
                            <StatCard label="AI Queries" value={stats ? stats.ai_queries : "—"} accent="#22d3ee" />
                        </div>
                    </div>
                )}

                {/* ── Sign Out ── */}
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