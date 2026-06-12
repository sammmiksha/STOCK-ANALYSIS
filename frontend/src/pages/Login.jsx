import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

// ── Animated SVG Line Chart for the Hero Panel ────────────────────────────────
function LiveChart() {
    const [hoverIdx, setHoverIdx] = useState(null);
    const [offset, setOffset] = useState(0);

    const priceData = [
        { t: "9:15", v: 2710 }, { t: "9:45", v: 2728 }, { t: "10:15", v: 2719 },
        { t: "10:45", v: 2755 }, { t: "11:15", v: 2742 }, { t: "11:45", v: 2768 },
        { t: "12:15", v: 2780 }, { t: "12:45", v: 2771 }, { t: "13:15", v: 2795 },
        { t: "13:45", v: 2812 }, { t: "14:15", v: 2803 }, { t: "14:45", v: 2831 },
        { t: "15:00", v: 2847 },
    ];

    const W = 420, H = 180, padL = 8, padR = 8, padT = 12, padB = 24;
    const vals = priceData.map(d => d.v);
    const min = Math.min(...vals) - 10, max = Math.max(...vals) + 10;
    const range = max - min;
    const innerW = W - padL - padR, innerH = H - padT - padB;

    const xS = i => padL + (i / (vals.length - 1)) * innerW;
    const yS = v => padT + innerH - ((v - min) / range) * innerH;

    const pts = vals.map((v, i) => `${xS(i)},${yS(v)}`).join(" ");
    const area = `M ${xS(0)},${yS(vals[0])} ` +
        vals.map((v, i) => `L ${xS(i)},${yS(v)}`).join(" ") +
        ` L ${xS(vals.length - 1)},${H - padB} L ${xS(0)},${H - padB} Z`;

    useEffect(() => {
        let frame;
        const tick = () => { setOffset(o => (o + 0.25) % 40); frame = requestAnimationFrame(tick); };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, []);

    return (
        <div style={{
            position: "relative",
            width: "100%",
            background: "rgba(10, 15, 30, 0.45)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            borderRadius: "16px",
            padding: "20px 24px",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(12px)",
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                    <div style={{ color: "#9ca3af", fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>RELIANCE · NSE</div>
                    <div style={{ color: "white", fontSize: "24px", fontWeight: "800", letterSpacing: "-0.5px" }}>₹2,847.35</div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{
                        background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)",
                        color: "#22c55e", padding: "4px 10px", borderRadius: "6px", fontSize: "12.5px", fontWeight: "700",
                    }}>▲ +1.84%</div>
                    <div style={{ color: "#6b7280", fontSize: "10.5px", marginTop: "4px" }}>Today</div>
                </div>
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}
                onMouseLeave={() => setHoverIdx(null)}>
                <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                    </linearGradient>
                    <filter id="lineGlow">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <pattern id="shimmer" x={offset} y="0" width="40" height={H} patternUnits="userSpaceOnUse">
                        <rect width="20" height={H} fill="rgba(255,255,255,0.012)" />
                    </pattern>
                </defs>
                {[0.25, 0.5, 0.75].map((f, i) => (
                    <line key={i} x1={padL} y1={padT + innerH * f} x2={W - padR} y2={padT + innerH * f}
                        stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                ))}
                <path d={area} fill="url(#areaGrad)" />
                <path d={area} fill="url(#shimmer)" />
                <polyline points={pts} fill="none" stroke="#22c55e" strokeWidth="2.5"
                    strokeLinejoin="round" filter="url(#lineGlow)" />
                {vals.map((v, i) => (
                    <rect key={i} x={xS(i) - innerW / vals.length / 2} y={padT}
                        width={innerW / vals.length} height={innerH}
                        fill="transparent" style={{ cursor: "crosshair" }}
                        onMouseEnter={() => setHoverIdx(i)} />
                ))}
                {hoverIdx !== null && (
                    <g>
                        <line x1={xS(hoverIdx)} y1={padT} x2={xS(hoverIdx)} y2={H - padB}
                            stroke="rgba(34,197,94,0.4)" strokeWidth="1" strokeDasharray="3,3" />
                        <circle cx={xS(hoverIdx)} cy={yS(vals[hoverIdx])} r="5" fill="#22c55e" filter="url(#lineGlow)" />
                        <rect x={Math.min(xS(hoverIdx) - 36, W - 80)} y={yS(vals[hoverIdx]) - 32}
                            width="76" height="22" rx="5" fill="#0c0f1d" stroke="rgba(34,197,94,0.35)" strokeWidth="1" />
                        <text x={Math.min(xS(hoverIdx), W - 42) + 2} y={yS(vals[hoverIdx]) - 17}
                            textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="700" fontFamily="'JetBrains Mono', monospace">
                            ₹{vals[hoverIdx]}
                        </text>
                    </g>
                )}
            </svg>
        </div>
    );
}

export default function Login() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        // Clear error when switching tabs
        setError("");
    }, [isSignUp]);

    if (!authLoading && user) return <Navigate to="/dashboard" replace />;

    const friendly = (code) => {
        const messages = {
            "auth/user-not-found": "No account found with this email.",
            "auth/wrong-password": "Incorrect password.",
            "auth/invalid-email": "Please enter a valid email address.",
            "auth/email-already-in-use": "An account already exists with this email address.",
            "auth/weak-password": "Password must be at least 6 characters.",
            "auth/invalid-credential": "Invalid email or password.",
            "auth/too-many-requests": "Too many attempts. Try again later.",
            "auth/user-disabled": "This account is disabled.",
            "auth/popup-closed-by-user": "Google sign-in was cancelled.",
            "auth/network-request-failed": "Network error — check your connection.",
        };
        return messages[code] || "Authentication failed. Please try again.";
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) { 
            setError("Please fill in all fields."); 
            return; 
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        try {
            setError(""); 
            setLoading(true);
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            navigate("/dashboard");
        } catch (e) { 
            setError(friendly(e.code)); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setError(""); 
            setLoading(true);
            await signInWithPopup(auth, new GoogleAuthProvider());
            navigate("/dashboard");
        } catch (e) { 
            setError(friendly(e.code)); 
        } finally { 
            setLoading(false); 
        }
    };

    return (
        <div style={{ 
            minHeight: "100vh", 
            display: "flex", 
            background: "#030712",
            color: "#f3f4f6",
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* ── Left Side: Auth Form ── */}
            <div style={{
                width: "min(500px, 100%)", 
                flexShrink: 0,
                display: "flex", 
                flexDirection: "column",
                padding: "36px 44px",
                borderRight: "1px solid rgba(255, 255, 255, 0.04)",
                justifyContent: "space-between",
                background: "linear-gradient(180deg, #030712 0%, #050b18 100%)"
            }}>
                <div>
                    <Logo />
                </div>

                <div style={{ 
                    maxWidth: 360, 
                    width: "100%", 
                    margin: "40px auto"
                }}>
                    <h1 style={{ 
                        fontSize: 26, 
                        fontWeight: 800, 
                        letterSpacing: "-0.6px", 
                        marginBottom: 6,
                        color: "#f3f4f6"
                    }}>
                        {isSignUp ? "Create your account" : "Welcome back"}
                    </h1>
                    <p style={{ 
                        color: "#9ca3af", 
                        fontSize: 13.5, 
                        marginBottom: 24,
                        lineHeight: 1.5
                    }}>
                        {isSignUp 
                            ? "Start monitoring indicators and pinning alerts." 
                            : "Sign in to access your real-time dashboard."}
                    </p>

                    {/* Tabs Segmented Selector */}
                    <div style={{
                        display: "flex",
                        padding: 3,
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 10,
                        marginBottom: 20
                    }}>
                        <button 
                            onClick={() => setIsSignUp(false)}
                            style={{
                                flex: 1,
                                padding: "8px 12px",
                                border: "none",
                                borderRadius: 8,
                                background: !isSignUp ? "rgba(255,255,255,0.06)" : "transparent",
                                color: !isSignUp ? "#ffffff" : "#9ca3af",
                                fontSize: 12.5,
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.18s ease"
                            }}
                        >
                            Sign In
                        </button>
                        <button 
                            onClick={() => setIsSignUp(true)}
                            style={{
                                flex: 1,
                                padding: "8px 12px",
                                border: "none",
                                borderRadius: 8,
                                background: isSignUp ? "rgba(255,255,255,0.06)" : "transparent",
                                color: isSignUp ? "#ffffff" : "#9ca3af",
                                fontSize: 12.5,
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.18s ease"
                            }}
                        >
                            Create Account
                        </button>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        style={{
                            width: "100%", 
                            padding: "10px 16px",
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center", 
                            gap: 10,
                            marginBottom: 20,
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            borderRadius: 10,
                            color: "#e5e7eb",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                        }}
                        className="google-signin-btn"
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.045)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
                    >
                        <GoogleIcon /> Continue with Google
                    </button>

                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                        <span style={{ fontSize: 10.5, color: "#4b5563", fontWeight: 700, letterSpacing: "0.05em" }}>OR</span>
                        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                    </div>

                    <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                        <input
                            className="inp" 
                            type="email" 
                            placeholder="Email address" 
                            value={email}
                            onChange={e => { setEmail(e.target.value); setError(""); }}
                            style={{
                                width: "100%",
                                boxSizing: "border-box",
                                padding: "11px 14px",
                                background: "rgba(255,255,255,0.015)",
                                border: "1px solid rgba(255,255,255,0.06)",
                                borderRadius: 10,
                                color: "#f3f4f6",
                                fontSize: 13,
                                outline: "none",
                                transition: "all 0.15s ease"
                            }}
                            onFocus={e => { e.target.style.borderColor = "rgba(34,197,94,0.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.08)"; }}
                            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.06)"; e.target.style.boxShadow = "none"; }}
                        />
                        <input
                            className="inp" 
                            type="password" 
                            placeholder="Password" 
                            value={password}
                            onChange={e => { setPassword(e.target.value); setError(""); }}
                            style={{
                                width: "100%",
                                boxSizing: "border-box",
                                padding: "11px 14px",
                                background: "rgba(255,255,255,0.015)",
                                border: "1px solid rgba(255,255,255,0.06)",
                                borderRadius: 10,
                                color: "#f3f4f6",
                                fontSize: 13,
                                outline: "none",
                                transition: "all 0.15s ease"
                            }}
                            onFocus={e => { e.target.style.borderColor = "rgba(34,197,94,0.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.08)"; }}
                            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.06)"; e.target.style.boxShadow = "none"; }}
                        />

                        {error && (
                            <div style={{
                                background: "rgba(239, 68, 68, 0.08)",
                                border: "1px solid rgba(239, 68, 68, 0.18)",
                                borderRadius: 10,
                                padding: "10px 14px",
                                color: "#ef4444",
                                fontSize: 12.5,
                                lineHeight: 1.4
                            }}>
                                ⚠ {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading} 
                            style={{ 
                                width: "100%", 
                                padding: "12px 16px", 
                                fontSize: 13,
                                fontWeight: 700,
                                background: "#22c55e",
                                color: "#030712",
                                border: "none",
                                borderRadius: 10,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                marginTop: 6
                            }}
                            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#16a34a"; }}
                            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#22c55e"; }}
                        >
                            {loading ? (
                                <>
                                    <svg style={{ animation: "spin 0.8s linear infinite" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                    </svg>
                                    {isSignUp ? "Creating Account…" : "Signing in…"}
                                </>
                            ) : (
                                isSignUp ? "Create Account →" : "Sign In →"
                            )}
                        </button>
                    </form>

                    <p style={{ marginTop: 24, textAlign: "center", fontSize: 12.5, color: "#6b7280" }}>
                        {isSignUp ? "Already have an account? " : "Don't have an account? "}
                        <span 
                            onClick={() => setIsSignUp(!isSignUp)}
                            style={{ color: "#22c55e", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
                        >
                            {isSignUp ? "Sign In" : "Create one free"}
                        </span>
                    </p>
                </div>

                <div style={{ fontSize: 11, color: "#4b5563", textAlign: "center", letterSpacing: "0.02em" }}>
                    © {new Date().getFullYear()} Stock Analysis. All rights reserved.
                </div>
            </div>

            {/* ── Right Side: SaaS Graphic Panel ── */}
            <div style={{
                flex: 1, 
                position: "relative", 
                overflow: "hidden",
                background: "linear-gradient(135deg, #090e1a 0%, #03050a 100%)",
                display: "none",
                flexDirection: "column",
                justifyContent: "center",
                padding: "0 64px"
            }} className="login-visual">
                {/* Visual glows */}
                <div style={{
                    position: "absolute", 
                    top: "15%", 
                    right: "10%",
                    width: 500, 
                    height: 500,
                    background: "radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 65%)",
                    pointerEvents: "none"
                }} />
                <div style={{
                    position: "absolute", 
                    bottom: "10%", 
                    left: "5%",
                    width: 400, 
                    height: 400,
                    background: "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 60%)",
                    pointerEvents: "none"
                }} />
                
                {/* Dotted grid pattern overlay */}
                <div style={{
                    position: "absolute", 
                    inset: 0, 
                    opacity: 0.18,
                    backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)",
                    backgroundSize: "24px 24px"
                }} />

                <div style={{ position: "relative", zIndex: 2, maxWidth: 460 }}>
                    <div style={{ marginBottom: 32 }}>
                        <LiveChart />
                    </div>

                    <h2 style={{ 
                        fontSize: 32, 
                        fontWeight: 800, 
                        letterSpacing: "-0.8px", 
                        lineHeight: 1.25, 
                        marginBottom: 16,
                        color: "#f3f4f6"
                    }}>
                        Real-time market <br />
                        <span style={{ 
                            background: "linear-gradient(90deg, #22c55e 0%, #4ade80 100%)", 
                            WebkitBackgroundClip: "text", 
                            WebkitTextFillColor: "transparent" 
                        }}>
                            intelligence
                        </span>
                    </h2>
                    
                    <p style={{ 
                        color: "#9ca3af", 
                        fontSize: 14.5, 
                        lineHeight: 1.6, 
                        margin: 0 
                    }}>
                        Unlock AI-powered trading signals, technical indicator mapping, and automated portfolio crash alerts in one unified workspace.
                    </p>
                </div>
            </div>

            <style>{`
                @media (min-width: 980px) {
                    .login-visual { display: flex !important; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

function GoogleIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 48 48" style={{ display: "block" }}>
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.332 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z" />
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z" />
        </svg>
    );
}
