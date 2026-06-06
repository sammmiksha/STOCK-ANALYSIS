import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

export default function Login() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (!authLoading && user) return <Navigate to="/dashboard" replace />;

    const friendly = (code) => ({
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/invalid-email": "Please enter a valid email.",
        "auth/invalid-credential": "Invalid email or password.",
        "auth/too-many-requests": "Too many attempts. Try again later.",
        "auth/user-disabled": "This account is disabled.",
        "auth/popup-closed-by-user": "Google sign-in was cancelled.",
        "auth/network-request-failed": "Network error — check your connection.",
    }[code] || "Something went wrong. Please try again.");

    const loginEmail = async () => {
        if (!email || !password) { setError("Please enter your email and password."); return; }
        try {
            setError(""); setLoading(true);
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/dashboard");
        } catch (e) { setError(friendly(e.code)); }
        finally { setLoading(false); }
    };

    const loginGoogle = async () => {
        try {
            setError(""); setLoading(true);
            await signInWithPopup(auth, new GoogleAuthProvider());
            navigate("/dashboard");
        } catch (e) { setError(friendly(e.code)); }
        finally { setLoading(false); }
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg-base)" }}>
            {/* ── Left: form ── */}
            <div style={{
                width: "min(520px, 100%)", flexShrink: 0,
                display: "flex", flexDirection: "column",
                padding: "32px 48px",
            }}>
                <div style={{ marginBottom: 48 }}><Logo /></div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 380, width: "100%", margin: "0 auto" }}>
                    <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.8px", marginBottom: 8 }}>
                        Welcome back
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 28 }}>
                        Sign in to access your Stock Analysis dashboard.
                    </p>

                    <button
                        className="btn-secondary"
                        onClick={loginGoogle}
                        disabled={loading}
                        style={{
                            width: "100%", padding: "11px 16px",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                            marginBottom: 16,
                        }}
                    >
                        <GoogleIcon /> Continue with Google
                    </button>

                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>OR</span>
                        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                        <input
                            className="inp" type="email" placeholder="Email" value={email}
                            onChange={e => { setEmail(e.target.value); setError(""); }}
                        />
                        <input
                            className="inp" type="password" placeholder="Password" value={password}
                            onChange={e => { setPassword(e.target.value); setError(""); }}
                            onKeyDown={e => e.key === "Enter" && loginEmail()}
                        />
                    </div>

                    {error && (
                        <div style={{
                            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                            borderRadius: 8, padding: "10px 14px", marginBottom: 14,
                            color: "#fca5a5", fontSize: 13,
                        }}>
                            {error}
                        </div>
                    )}

                    <button className="btn-primary" onClick={loginEmail} disabled={loading} style={{ width: "100%", padding: "12px 16px", fontSize: 14 }}>
                        {loading ? <><span className="spinner" /> Signing in…</> : "Sign in"}
                    </button>

                    <p style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
                        Don't have an account? Use the same form to create one.
                    </p>
                </div>

                <div style={{ fontSize: 11, color: "var(--text-faint)", textAlign: "center" }}>
                    © {new Date().getFullYear()} Stock Analysis
                </div>
            </div>

            {/* ── Right: visual panel (hidden on small screens) ── */}
            <div style={{
                flex: 1, position: "relative", overflow: "hidden",
                background: "linear-gradient(135deg, #0a1525 0%, #060810 60%)",
                borderLeft: "1px solid var(--border)",
                display: "none",
            }} className="login-visual">
                <div style={{
                    position: "absolute", top: "20%", right: "10%",
                    width: 480, height: 480,
                    background: "radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 65%)",
                }} />
                <div style={{
                    position: "absolute", inset: 0, opacity: 0.3,
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)",
                    backgroundSize: "48px 48px",
                }} />
                <div style={{
                    position: "relative", zIndex: 2, height: "100%",
                    display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 64px",
                }}>
                    <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-1px", lineHeight: 1.15, marginBottom: 16 }}>
                        Real-time market<br />
                        <span style={{ color: "var(--green)" }}>intelligence</span>
                    </h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.6, maxWidth: 380 }}>
                        AI-powered signals, technical indicators, and multi-timeframe analysis — for any listed symbol.
                    </p>
                </div>
            </div>

            <style>{`
        @media (min-width: 980px) {
          .login-visual { display: block !important; }
        }
      `}</style>
        </div>
    );
}

function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z" />
        </svg>
    );
}
