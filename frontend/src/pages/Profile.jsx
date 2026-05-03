import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { useNavigate } from "react-router-dom";

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent }) {
    return (
        <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "12px", padding: "16px",
            display: "flex", flexDirection: "column", gap: "4px",
        }}>
            <span style={{ color: "#4b5563", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {label}
            </span>
            <span style={{ color: accent || "white", fontSize: "14px", fontWeight: "600", wordBreak: "break-all" }}>
                {value}
            </span>
        </div>
    );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ user }) {
    const initials = (user.displayName || user.email || "U")
        .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

    if (user.photoURL) {
        return (
            <div style={{ position: "relative", display: "inline-block" }}>
                <div style={{
                    width: "88px", height: "88px", borderRadius: "50%",
                    padding: "3px",
                    background: "linear-gradient(135deg, #22c55e, #16a34a, #15803d)",
                    boxShadow: "0 0 32px rgba(34,197,94,0.3)",
                }}>
                    <img
                        src={user.photoURL}
                        alt="avatar"
                        style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", display: "block" }}
                        onError={e => { e.target.style.display = "none"; }}
                    />
                </div>
                <div style={{
                    position: "absolute", bottom: "2px", right: "2px",
                    width: "14px", height: "14px", borderRadius: "50%",
                    background: "#22c55e", border: "2px solid #060810",
                    boxShadow: "0 0 8px rgba(34,197,94,0.6)",
                }} />
            </div>
        );
    }

    return (
        <div style={{ position: "relative", display: "inline-block" }}>
            <div style={{
                width: "88px", height: "88px", borderRadius: "50%",
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "28px", fontWeight: "800", color: "#030a04",
                boxShadow: "0 0 32px rgba(34,197,94,0.3)",
            }}>
                {initials}
            </div>
            <div style={{
                position: "absolute", bottom: "2px", right: "2px",
                width: "14px", height: "14px", borderRadius: "50%",
                background: "#22c55e", border: "2px solid #060810",
            }} />
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
    const navigate = useNavigate();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            if (!u) navigate("/login");
            else { setUser(u); setTimeout(() => setMounted(true), 60); }
        });
        return () => unsub();
    }, [navigate]);
    const [stats, setStats] = useState(null);
    useEffect(() => {
        if (!user) return;

        fetch(`http://127.0.0.1:8000/user-stats?uid=${user.uid}`)
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(() => console.log("Stats fetch failed"));

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
        transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
    });

    const providerLabel = {
        "google.com": "Google",
        "password": "Email / Password",
        "github.com": "GitHub",
        "twitter.com": "Twitter",
    };

    const joinDate = user?.metadata?.creationTime
        ? new Date(user.metadata.creationTime).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
        : "—";

    const lastLogin = user?.metadata?.lastSignInTime
        ? new Date(user.metadata.lastSignInTime).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : "—";

    if (!user) {
        return (
            <div style={{
                minHeight: "100vh", background: "#060810",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Sora', sans-serif",
            }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                    <div style={{
                        width: "40px", height: "40px", borderRadius: "50%",
                        border: "3px solid rgba(34,197,94,0.2)",
                        borderTopColor: "#22c55e",
                        animation: "spin 0.8s linear infinite",
                    }} />
                    <span style={{ color: "#4b5563", fontSize: "14px" }}>Authenticating…</span>
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
            </div>
        );
    }

    const provider = providerLabel[user.providerData[0]?.providerId] || user.providerData[0]?.providerId || "—";

    return (
        <div style={{
            minHeight: "100vh", background: "#060810",
            fontFamily: "'Sora', 'DM Sans', sans-serif",
            color: "white", position: "relative", overflow: "hidden",
        }}>
            <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .tab-btn{background:transparent;border:none;cursor:pointer;font-family:'Sora',sans-serif;font-size:13px;font-weight:600;padding:8px 18px;border-radius:8px;transition:all .2s;color:#6b7280}
        .tab-btn.active{background:rgba(34,197,94,0.12);color:#22c55e}
        .tab-btn:hover:not(.active){background:rgba(255,255,255,0.05);color:#9ca3af}
        .action-btn{width:100%;padding:13px;border-radius:10px;font-family:'Sora',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;border:none}
        .action-btn:hover{transform:translateY(-1px)}
        .action-btn:active{transform:translateY(0)}
        .action-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}
        .copy-btn{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#9ca3af;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-family:'Sora',sans-serif;font-weight:600;transition:all .2s;white-space:nowrap}
        .copy-btn:hover{background:rgba(34,197,94,0.1);border-color:rgba(34,197,94,0.3);color:#22c55e}
        .nav-link{background:transparent;border:none;color:#9ca3af;cursor:pointer;font-family:'Sora',sans-serif;font-size:13px;font-weight:600;padding:6px 14px;border-radius:8px;transition:all .2s}
        .nav-link:hover{background:rgba(255,255,255,0.05);color:white}
      `}</style>

            {/* Glow bg */}
            <div style={{ position: "fixed", top: "10%", left: "50%", transform: "translateX(-50%)", width: "600px", height: "400px", background: "radial-gradient(ellipse, rgba(34,197,94,0.07) 0%, transparent 65%)", pointerEvents: "none", zIndex: 0 }} />
            <div style={{ position: "fixed", bottom: "5%", right: "10%", width: "350px", height: "350px", background: "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 65%)", pointerEvents: "none", zIndex: 0 }} />
            {/* Grid */}
            <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)", backgroundSize: "52px 52px", opacity: 0.5, pointerEvents: "none", zIndex: 0 }} />

            {/* Navbar */}
            <nav style={{
                position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
                padding: "0 32px", height: "62px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "rgba(6,8,16,0.8)", backdropFilter: "blur(20px)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                    onClick={() => navigate("/dashboard")}>
                    <div style={{
                        width: "30px", height: "30px", borderRadius: "8px",
                        background: "linear-gradient(135deg,#22c55e,#16a34a)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 0 16px rgba(34,197,94,0.3)",
                    }}>
                        <span style={{ color: "#030a04", fontWeight: "900", fontSize: "14px" }}>S</span>
                    </div>
                    <span style={{ fontWeight: "800", fontSize: "17px", letterSpacing: "-0.5px" }}>
                        Stock<span style={{ color: "#22c55e" }}>AI</span>
                    </span>
                </div>
                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    <button className="nav-link" onClick={() => navigate("/dashboard")}>← Dashboard</button>
                    <button className="nav-link" onClick={handleLogout} style={{ color: "#ef4444" }}>Sign Out</button>
                </div>
            </nav>

            {/* Content */}
            <div style={{ position: "relative", zIndex: 1, padding: "100px 24px 48px", maxWidth: "640px", margin: "0 auto" }}>

                {/* Profile header */}
                <div style={{ ...fi(0), display: "flex", alignItems: "center", gap: "24px", marginBottom: "32px", flexWrap: "wrap" }}>
                    <Avatar user={user} />
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <h1 style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-0.5px" }}>
                                {user.displayName || "User"}
                            </h1>
                            {user.emailVerified && (
                                <span style={{
                                    background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
                                    color: "#22c55e", fontSize: "11px", fontWeight: "700",
                                    padding: "2px 8px", borderRadius: "20px", letterSpacing: "0.04em",
                                }}>✓ Verified</span>
                            )}
                        </div>
                        <p style={{ color: "#6b7280", fontSize: "14px", marginTop: "4px" }}>{user.email}</p>
                        <p style={{ color: "#374151", fontSize: "12px", marginTop: "6px" }}>
                            Member since {joinDate}
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{
                    ...fi(80),
                    display: "flex", gap: "4px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "10px", padding: "4px",
                    marginBottom: "20px",
                }}>
                    {["account", "security", "activity"].map(t => (
                        <button key={t} className={`tab-btn${tab === t ? " active" : ""}`}
                            onClick={() => setTab(t)} style={{ flex: 1, textTransform: "capitalize" }}>
                            {t}
                        </button>
                    ))}
                </div>

                {/* ── ACCOUNT TAB ── */}
                {tab === "account" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", ...fi(120) }}>

                        {/* UID row */}
                        <div style={{
                            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                            borderRadius: "12px", padding: "16px",
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ color: "#4b5563", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>User ID</div>
                                    <div style={{ color: "#9ca3af", fontSize: "12px", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {user.uid}
                                    </div>
                                </div>
                                <button className="copy-btn" onClick={copyUID}>
                                    {copyFeedback ? "✓ Copied" : "Copy"}
                                </button>
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <StatCard label="Provider" value={provider} />
                            <StatCard label="Plan" value="Free Tier" accent="#f59e0b" />
                            <StatCard
                                label="Watchlist"
                                value={stats ? `${stats.stocks_viewed} stocks` : "—"}
                            />
                            <StatCard label="Last Login" value={lastLogin} />
                        </div>

                        {/* Account actions */}
                        <div style={{
                            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                            borderRadius: "12px", padding: "16px",
                        }}>
                            <div style={{ color: "#4b5563", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "12px" }}>
                                Quick Actions
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {[
                                    { label: "View Dashboard", icon: "📊", action: () => navigate("/dashboard") },
                                    { label: "View Watchlist", icon: "⭐", action: () => navigate("/watchlist") },
                                ].map(({ label, icon, action }) => (
                                    <button key={label} onClick={action} style={{
                                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                                        borderRadius: "8px", padding: "10px 14px",
                                        display: "flex", alignItems: "center", gap: "10px",
                                        color: "#9ca3af", fontSize: "13px", fontWeight: "600",
                                        cursor: "pointer", fontFamily: "'Sora',sans-serif",
                                        transition: "all .2s", textAlign: "left", width: "100%",
                                    }}
                                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "white"; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "#9ca3af"; }}
                                    >
                                        <span style={{ fontSize: "16px" }}>{icon}</span> {label}
                                        <span style={{ marginLeft: "auto", color: "#374151" }}>→</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── SECURITY TAB ── */}
                {tab === "security" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", ...fi(120) }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <StatCard
                                label="Email Verified"
                                value={user.emailVerified ? "✓ Verified" : "✗ Not Verified"}
                                accent={user.emailVerified ? "#22c55e" : "#ef4444"}
                            />
                            <StatCard label="Auth Method" value={provider} />
                        </div>

                        {/* Sessions */}
                        <div style={{
                            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                            borderRadius: "12px", padding: "16px",
                        }}>
                            <div style={{ color: "#4b5563", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "12px" }}>
                                Active Sessions
                            </div>
                            <div style={{
                                display: "flex", alignItems: "center", gap: "12px",
                                padding: "10px 12px", background: "rgba(34,197,94,0.05)",
                                border: "1px solid rgba(34,197,94,0.12)", borderRadius: "8px",
                            }}>
                                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e", animation: "pulse 2s infinite" }} />
                                <div>
                                    <div style={{ color: "white", fontSize: "13px", fontWeight: "600" }}>Current session</div>
                                    <div style={{ color: "#6b7280", fontSize: "11px" }}>This browser · {new Date().toLocaleDateString("en-IN")}</div>
                                </div>
                            </div>
                        </div>

                        {/* Danger zone */}
                        <div style={{
                            background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)",
                            borderRadius: "12px", padding: "16px",
                        }}>
                            <div style={{ color: "#ef4444", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>
                                Danger Zone
                            </div>
                            <p style={{ color: "#6b7280", fontSize: "13px", lineHeight: "1.6", marginBottom: "12px" }}>
                                Signing out will end your current session across this device.
                            </p>
                            <button
                                className="action-btn"
                                onClick={handleLogout}
                                disabled={loggingOut}
                                style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}
                                onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.2)"}
                                onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.12)"}
                            >
                                {loggingOut
                                    ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                        <span style={{ width: "14px", height: "14px", border: "2px solid rgba(239,68,68,0.3)", borderTopColor: "#ef4444", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
                                        Signing out…
                                    </span>
                                    : "Sign Out"}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── ACTIVITY TAB ── */}
                {tab === "activity" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", ...fi(120) }}>
                        <div style={{
                            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                            borderRadius: "12px", padding: "16px",
                        }}>
                            <div style={{ color: "#4b5563", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "12px" }}>
                                Recent Activity
                            </div>
                            {[
                                { icon: "🔑", label: "Signed in", time: lastLogin, color: "#22c55e" },
                                { icon: "📊", label: "Viewed RELIANCE dashboard", time: "Today", color: "#818cf8" },
                                { icon: "⭐", label: "Added TCS to watchlist", time: "Today", color: "#f59e0b" },
                                { icon: "🤖", label: "Generated AI analysis", time: "Yesterday", color: "#22d3ee" },
                                { icon: "👤", label: "Account created", time: joinDate, color: "#9ca3af" },
                            ].map(({ icon, label, time, color }, i) => (
                                <div key={i} style={{
                                    display: "flex", alignItems: "center", gap: "12px",
                                    padding: "10px 0",
                                    borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none",
                                }}>
                                    <div style={{
                                        width: "32px", height: "32px", borderRadius: "8px",
                                        background: `${color}18`, border: `1px solid ${color}25`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: "15px", flexShrink: 0,
                                    }}>{icon}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ color: "#d1d5db", fontSize: "13px", fontWeight: "500" }}>{label}</div>
                                        <div style={{ color: "#4b5563", fontSize: "11px", marginTop: "1px" }}>{time}</div>
                                    </div>
                                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, opacity: 0.6, flexShrink: 0 }} />
                                </div>
                            ))}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>


                            <StatCard
                                label="Days Active"
                                value={stats ? stats.days_active : "—"}
                                accent="#22c55e"
                            />

                            <StatCard
                                label="Stocks Viewed"
                                value={stats ? stats.stocks_viewed : "—"}
                                accent="#818cf8"
                            />

                            <StatCard
                                label="AI Queries"
                                value={stats ? stats.ai_queries : "—"}
                                accent="#22d3ee"
                            />
                        </div>
                    </div>
                )}

                {/* Sign out — always visible at bottom */}
                <div style={{ ...fi(300), marginTop: "24px" }}>
                    <button
                        className="action-btn"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        style={{ background: "#22c55e", color: "#030a04", boxShadow: loggingOut ? "none" : "0 8px 24px rgba(34,197,94,0.25)" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#16a34a"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#22c55e"; e.currentTarget.style.transform = "translateY(0)"; }}
                    >
                        {loggingOut
                            ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                <span style={{ width: "15px", height: "15px", border: "2px solid rgba(0,0,0,0.25)", borderTopColor: "#030a04", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
                                Signing out…
                            </span>
                            : "Sign Out"}
                    </button>
                </div>

            </div>
        </div>
    );
}