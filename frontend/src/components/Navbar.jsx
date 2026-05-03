import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const isActive = (path) => location.pathname === path;

    const handleSignOut = async () => {
        await signOut(auth);
        navigate("/");
        setDropdownOpen(false);
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const initials = user?.displayName
        ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
        : user?.email?.[0]?.toUpperCase() ?? "U";

    return (
        <nav style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            height: "var(--navbar-h)",
            background: "rgba(6,8,16,0.88)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            gap: "16px",
        }}>

            {/* ── Logo ── */}
            <div
                onClick={() => navigate("/")}
                style={{ display: "flex", alignItems: "center", gap: "9px", cursor: "pointer", flexShrink: 0 }}
            >
                <div style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "7px",
                    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 14px rgba(34,197,94,0.28)",
                    flexShrink: 0,
                }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="#030a04" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <polyline points="16 7 22 7 22 13" stroke="#030a04" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <span style={{ fontWeight: "800", fontSize: "16px", letterSpacing: "-0.3px" }}>
                    Stock<span style={{ color: "var(--green)" }}>AI</span>
                </span>
            </div>

            {/* ── Center nav links ── */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <NavLink to="/" label="Home" active={isActive("/")} />
                {user && <NavLink to="/dashboard" label="Dashboard" active={isActive("/dashboard")} />}
            </div>

            {/* ── Right: auth actions ── */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                {user ? (
                    <div ref={dropdownRef} style={{ position: "relative" }}>
                        <button
                            onClick={() => setDropdownOpen((v) => !v)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid var(--border)",
                                borderRadius: "8px",
                                padding: "5px 10px 5px 6px",
                                cursor: "pointer",
                                color: "var(--text-primary)",
                                transition: "all 0.2s",
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = "rgba(255,255,255,0.09)";
                                e.currentTarget.style.borderColor = "var(--border-hover)";
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                                e.currentTarget.style.borderColor = "var(--border)";
                            }}
                        >
                            {/* Avatar */}
                            <div style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "6px",
                                background: "linear-gradient(135deg, #22c55e40, #16a34a60)",
                                border: "1px solid rgba(34,197,94,0.3)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "11px",
                                fontWeight: "700",
                                color: "var(--green)",
                            }}>
                                {initials}
                            </div>
                            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {user.displayName || user.email?.split("@")[0]}
                            </span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ color: "var(--text-secondary)", transition: "transform 0.2s", transform: dropdownOpen ? "rotate(180deg)" : "none" }}>
                                <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>

                        {dropdownOpen && (
                            <div style={{
                                position: "absolute",
                                top: "calc(100% + 8px)",
                                right: 0,
                                minWidth: "180px",
                                background: "var(--bg-elevated)",
                                border: "1px solid var(--border)",
                                borderRadius: "10px",
                                padding: "6px",
                                boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
                                animation: "fadeUp 0.15s ease",
                                zIndex: 200,
                            }}>
                                <DropdownItem label="Profile" icon="👤" onClick={() => { navigate("/profile"); setDropdownOpen(false); }} />
                                <DropdownItem label="Dashboard" icon="📊" onClick={() => { navigate("/dashboard"); setDropdownOpen(false); }} />
                                <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }} />
                                <DropdownItem label="Sign out" icon="↩" onClick={handleSignOut} danger />
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <Link to="/login" style={{
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "var(--text-secondary)",
                            textDecoration: "none",
                            padding: "7px 12px",
                            borderRadius: "7px",
                            transition: "color 0.2s",
                        }}
                            onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
                            onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}
                        >
                            Sign in
                        </Link>
                        <Link to="/login" className="btn-primary" style={{ padding: "7px 16px", fontSize: "13px", textDecoration: "none" }}>
                            Get Started
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
}

function NavLink({ to, label, active }) {
    return (
        <Link
            to={to}
            style={{
                fontSize: "13px",
                fontWeight: "600",
                color: active ? "var(--green)" : "var(--text-secondary)",
                textDecoration: "none",
                padding: "6px 12px",
                borderRadius: "7px",
                background: active ? "var(--green-dim)" : "transparent",
                transition: "all 0.2s",
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "transparent"; } }}
        >
            {label}
        </Link>
    );
}

function DropdownItem({ label, icon, onClick, danger }) {
    return (
        <button
            onClick={onClick}
            style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 10px",
                borderRadius: "7px",
                background: "none",
                border: "none",
                color: danger ? "var(--red)" : "var(--text-primary)",
                fontSize: "13px",
                fontWeight: "500",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = danger ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.06)"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
        >
            <span style={{ fontSize: "14px" }}>{icon}</span>
            {label}
        </button>
    );
}