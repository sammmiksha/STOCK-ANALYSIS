import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider 
} from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

// ── Animated SVG Line Chart ───────────────────────────────────────────────────
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
        const tick = () => { setOffset(o => (o + 0.3) % 40); frame = requestAnimationFrame(tick); };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, []);

    const lastX = xS(vals.length - 1);
    const lastY = yS(vals[vals.length - 1]);

    return (
        <div style={{ position: "relative", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div>
                    <div style={{ color: "#6b7280", fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase" }}>RELIANCE · NSE</div>
                    <div style={{ color: "white", fontSize: "22px", fontWeight: "700", letterSpacing: "-0.5px" }}>₹2,847.35</div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{
                        background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
                        color: "#22c55e", padding: "3px 10px", borderRadius: "6px", fontSize: "13px", fontWeight: "700",
                    }}>▲ +1.84%</div>
                    <div style={{ color: "#4b5563", fontSize: "11px", marginTop: "3px" }}>Today</div>
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
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <pattern id="shimmer" x={offset} y="0" width="40" height={H} patternUnits="userSpaceOnUse">
                        <rect width="20" height={H} fill="rgba(255,255,255,0.012)" />
                    </pattern>
                </defs>
                {[0.25, 0.5, 0.75].map((f, i) => (
                    <line key={i} x1={padL} y1={padT + innerH * f} x2={W - padR} y2={padT + innerH * f}
                        stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                ))}
                <path d={area} fill="url(#areaGrad)" />
                <path d={area} fill="url(#shimmer)" />
                <polyline points={pts} fill="none" stroke="#22c55e" strokeWidth="2"
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
                        <circle cx={xS(hoverIdx)} cy={yS(vals[hoverIdx])} r="4" fill="#22c55e" filter="url(#lineGlow)" />
                        <rect x={Math.min(xS(hoverIdx) - 36, W - 80)} y={yS(vals[hoverIdx]) - 28}
                            width="76" height="22" rx="5" fill="#1a2235" stroke="rgba(34,197,94,0.35)" strokeWidth="1" />
                        <text x={Math.min(xS(hoverIdx), W - 42) + 2} y={yS(vals[hoverIdx]) - 13}
                            textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="600">
                            ₹{vals[hoverIdx].toLocaleString("en-IN")}
                        </text>
                    </g>
                )}
                <circle cx={lastX} cy={lastY} r="5" fill="#22c55e" filter="url(#lineGlow)" />
                <circle cx={lastX} cy={lastY} r="9" fill="none" stroke="#22c55e" strokeOpacity="0.4" strokeWidth="1.5">
                    <animate attributeName="r" values="6;13;6" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                </circle>
                {[0, 3, 6, 9, 12].map(i => (
                    <text key={i} x={xS(i)} y={H - 4} textAnchor="middle" fill="#374151" fontSize="9">
                        {priceData[i].t}
                    </text>
                ))}
            </svg>
        </div>
    );
}

export default function Login() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => { 
        setTimeout(() => setMounted(true), 50); 
    }, []);

    if (!authLoading && user) return <Navigate to="/dashboard" replace />;

    const fi = (delay = 0) => ({
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(18px)",
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
    });

    const friendlyError = (code) => {
        switch (code) {
            case "auth/user-not-found": return "No account found with this email.";
            case "auth/wrong-password": return "Incorrect password. Please try again.";
            case "auth/invalid-email": return "Please enter a valid email address.";
            case "auth/email-already-in-use": return "This email is already registered. Please sign in.";
            case "auth/weak-password": return "Password should be at least 6 characters long.";
            case "auth/too-many-requests": return "Too many attempts. Please wait a moment.";
            case "auth/user-disabled": return "This account has been disabled.";
            case "auth/popup-closed-by-user": return "Google sign-in was cancelled.";
            case "auth/network-request-failed": return "Network error. Check your connection.";
            default: return "Authentication failed. Please try again.";
        }
    };

    const handleEmailAuth = async () => {
        if (!email || !password) { 
            setError("Please fill in all fields."); 
            return; 
        }
        if (isSignUp && password !== confirmPassword) {
            setError("Passwords do not match.");
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
        } catch (err) {
            setError(friendlyError(err.code));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        try {
            setError("");
            setLoading(true);
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            navigate("/dashboard");
        } catch (err) {
            setError(friendlyError(err.code));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "#060810", fontFamily: "'Inter', sans-serif", display: "flex", color: "white", overflow: "hidden" }}>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <style>{`
                *{box-sizing:border-box;margin:0;padding:0}
                ::placeholder{color:#4b5563!important}
                input:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px #0a0d18 inset!important;-webkit-text-fill-color:white!important}
                
                .auth-tabs {
                    display: flex;
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.06);
                    padding: 3px;
                    border-radius: 10px;
                    margin-bottom: 24px;
                }
                .auth-tab {
                    flex: 1;
                    padding: 8px 12px;
                    border: none;
                    background: transparent;
                    color: #9ca3af;
                    font-size: 13px;
                    font-weight: 600;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .auth-tab.active {
                    background: rgba(34,197,94,0.1);
                    color: #22c55e;
                    box-shadow: inset 0 0 0 1px rgba(34,197,94,0.15);
                }
                
                .g-btn{width:100%;padding:12px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:white;font-family:'Inter',sans-serif;font-size:13.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all .2s}
                .g-btn:hover{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.18);transform:translateY(-1px);box-shadow:0 8px 20px rgba(0,0,0,0.3)}
                .g-btn:active{transform:translateY(0)}
                
                .inp-wrapper {
                    position: relative;
                    width: 100%;
                }
                .inp-icon {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #4b5563;
                    pointer-events: none;
                    display: flex;
                    align-items: center;
                }
                .inp{width:100%;padding:13px 16px 13px 40px;border-radius:10px;background:#0d111e;border:1px solid rgba(255,255,255,0.08);color:white;font-family:'Inter',sans-serif;font-size:14px;outline:none;transition:border-color .2s,box-shadow .2s}
                .inp:hover{border-color:rgba(255,255,255,0.18)}
                .inp:focus{border-color:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,0.1)}
                
                .p-btn{width:100%;padding:14px;border-radius:10px;background:#22c55e;border:none;color:#030a04;font-family:'Inter',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:background .2s,transform .15s,box-shadow .2s}
                .p-btn:hover{background:#16a34a;transform:translateY(-1px);box-shadow:0 8px 28px rgba(34,197,94,0.3)}
                .p-btn:active{transform:translateY(0)}
                .p-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
                
                @keyframes spin{to{transform:rotate(360deg)}}
                .spin{width:14px;height:14px;border:2px solid rgba(0,0,0,0.15);border-top-color:#030a04;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
                @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
                .float{animation:floatY 4s ease-in-out infinite}
                @keyframes tkr{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
                .tkr{animation:tkr 20s linear infinite;white-space:nowrap;display:flex;gap:0}
                .tkr:hover{animation-play-state:paused}
                a{text-decoration:none}
            `}</style>

            {/* ── Left: Auth Form Column ── */}
            <div style={{
                width: "min(480px, 100%)", flexShrink: 0,
                display: "flex", flexDirection: "column",
                justifyContent: "space-between",
                padding: "40px 48px",
                borderRight: "1px solid rgba(255,255,255,0.06)",
                position: "relative", zIndex: 10,
                background: "#060810",
            }}>
                <div>
                    <div style={{ marginBottom: 40 }}><Logo /></div>

                    {/* Tabs */}
                    <div className="auth-tabs" style={fi(50)}>
                        <button className={`auth-tab ${!isSignUp ? "active" : ""}`} onClick={() => { setIsSignUp(false); setError(""); }}>Sign In</button>
                        <button className={`auth-tab ${isSignUp ? "active" : ""}`} onClick={() => { setIsSignUp(true); setError(""); }}>Create Account</button>
                    </div>

                    <h1 style={{ ...fi(100), fontSize: "26px", fontWeight: "800", letterSpacing: "-0.8px", lineHeight: "1.2", marginBottom: "8px" }}>
                        {isSignUp ? "Get started today" : "Welcome back"}
                    </h1>
                    <p style={{ ...fi(130), color: "#6b7280", fontSize: "13.5px", marginBottom: "24px", lineHeight: "1.6" }}>
                        {isSignUp ? "Create a free account to track watchlist indicators." : "Sign in to access your real-time stock dashboard."}
                    </p>

                    {/* Google OAuth Button */}
                    <div style={{ ...fi(160), marginBottom: "16px" }}>
                        <button className="g-btn" onClick={handleGoogleAuth}>
                            <GoogleIcon /> Continue with Google
                        </button>
                    </div>

                    {/* Divider */}
                    <div style={{ ...fi(190), display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
                        <span style={{ color: "#4b5563", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>or email</span>
                        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
                    </div>

                    {/* Form Inputs */}
                    <div style={{ ...fi(220), display: "flex", flexDirection: "column", gap: "12px", marginBottom: "14px" }}>
                        <div className="inp-wrapper">
                            <span className="inp-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                                </svg>
                            </span>
                            <input className="inp" type="email" placeholder="Email address" value={email}
                                onChange={e => { setEmail(e.target.value); setError(""); }}
                                onKeyDown={e => e.key === "Enter" && document.getElementById("pwd-inp").focus()} />
                        </div>
                        
                        <div className="inp-wrapper">
                            <span className="inp-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                            </span>
                            <input id="pwd-inp" className="inp" type="password" placeholder="Password" value={password}
                                onChange={e => { setPassword(e.target.value); setError(""); }}
                                onKeyDown={e => e.key === "Enter" && (isSignUp ? document.getElementById("confirm-pwd-inp").focus() : handleEmailAuth())} />
                        </div>

                        {isSignUp && (
                            <div className="inp-wrapper" style={{ animation: "fadeUp 0.2s ease" }}>
                                <span className="inp-icon">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                </span>
                                <input id="confirm-pwd-inp" className="inp" type="password" placeholder="Confirm password" value={confirmPassword}
                                    onChange={e => { setConfirmPassword(e.target.value); setError(""); }}
                                    onKeyDown={e => e.key === "Enter" && handleEmailAuth()} />
                            </div>
                        )}
                    </div>

                    {!isSignUp && (
                        <div style={{ ...fi(240), textAlign: "right", marginBottom: "16px" }}>
                            <a href="#" style={{
                                color: "#22c55e", fontSize: "12px", opacity: 0.8,
                                transition: "opacity .2s"
                            }}
                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                onMouseLeave={e => e.currentTarget.style.opacity = 0.8}>
                                Forgot password?
                            </a>
                        </div>
                    )}

                    {/* Error Banner */}
                    {error && (
                        <div style={{
                            ...fi(0),
                            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                            borderRadius: "8px", padding: "10px 14px", marginBottom: "16px",
                            display: "flex", alignItems: "center", gap: "8px",
                            animation: "shake 0.3s ease"
                        }}>
                            <span style={{ color: "#ef4444", fontSize: "14px" }}>⚠</span>
                            <span style={{ color: "#fca5a5", fontSize: "12.5px" }}>{error}</span>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div style={{ ...fi(270), marginBottom: "20px" }}>
                        <button className="p-btn" onClick={handleEmailAuth} disabled={loading}>
                            {loading
                                ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                    <span className="spin" /> Please wait…
                                  </span>
                                : (isSignUp ? "Sign Up →" : "Sign In →")}
                        </button>
                    </div>

                    <p style={{ ...fi(300), textAlign: "center", color: "#4b5563", fontSize: "13px" }}>
                        {isSignUp ? "Already have an account? " : "Don't have an account? "}
                        <button 
                            onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
                            style={{ background: "none", border: "none", color: "#22c55e", fontWeight: "600", cursor: "pointer", fontSize: "13px", padding: 0 }}
                            onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                        >
                            {isSignUp ? "Sign In" : "Sign up free"}
                        </button>
                    </p>
                </div>

                <div style={{ fontSize: 11, color: "var(--text-faint)", textAlign: "center", marginTop: 24 }}>
                    © {new Date().getFullYear()} Stock Analysis
                </div>
            </div>

            {/* ── Right: Visual SaaS Branding Panels (hidden on mobile) ── */}
            <div style={{
                flex: 1, position: "relative",
                background: "linear-gradient(140deg, #06080f 0%, #0a1525 45%, #060810 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden",
                borderLeft: "1px solid rgba(255,255,255,0.06)",
            }} className="login-visual">
                {/* Glow orbs */}
                <div style={{ position: "absolute", top: "10%", right: "10%", width: "520px", height: "520px", background: "radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 60%)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: "5%", left: "5%", width: "380px", height: "380px", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 65%)", pointerEvents: "none" }} />
                
                {/* Grid Overlay */}
                <div style={{
                    position: "absolute", inset: 0, opacity: 0.4,
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
                    backgroundSize: "52px 52px", pointerEvents: "none",
                }} />

                {/* Main Visual Panel Content */}
                <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: "520px", padding: "0 48px", ...fi(200) }}>
                    <div style={{ marginBottom: "36px" }}>
                        <div style={{
                            display: "inline-flex", alignItems: "center", gap: "6px",
                            background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)",
                            borderRadius: "20px", padding: "4px 12px", marginBottom: "18px",
                        }}>
                            <span style={{ color: "#22c55e", fontSize: "11px", fontWeight: "600", letterSpacing: "0.06em" }}>▲ MARKETS LIVE</span>
                        </div>
                        <h2 style={{ fontSize: "36px", fontWeight: "800", letterSpacing: "-1.5px", lineHeight: "1.12", marginBottom: "12px" }}>
                            Real-time Market<br />
                            <span style={{ color: "#22c55e" }}>Intelligence</span>
                        </h2>
                        <p style={{ color: "#6b7280", fontSize: "14px", lineHeight: "1.7" }}>
                            AI-powered signals · Live technical indicators · Smart alerts for NSE & BSE
                        </p>
                    </div>

                    {/* Floating chart widget */}
                    <div className="float" style={{
                        background: "rgba(10,14,26,0.85)", backdropFilter: "blur(24px)",
                        border: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px",
                        padding: "22px 22px 16px",
                        boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
                        marginBottom: "14px",
                    }}>
                        <LiveChart />
                    </div>

                    {/* Stock marquee ticker */}
                    <div style={{
                        background: "rgba(10,14,26,0.6)", border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: "10px", padding: "9px 14px", overflow: "hidden", marginBottom: "14px",
                    }}>
                        <div className="tkr">
                            {[
                                { s: "TCS", p: "3,512", c: -0.67 }, { s: "INFY", p: "1,624", c: 2.31 },
                                { s: "HDFC", p: "1,721", c: -1.12 }, { s: "WIPRO", p: "498", c: 0.42 },
                                { s: "NIFTY 50", p: "24,812", c: 0.85 }, { s: "SENSEX", p: "81,543", c: 0.72 },
                                { s: "TCS", p: "3,512", c: -0.67 }, { s: "INFY", p: "1,624", c: 2.31 },
                                { s: "HDFC", p: "1,721", c: -1.12 }, { s: "WIPRO", p: "498", c: 0.42 },
                                { s: "NIFTY 50", p: "24,812", c: 0.85 }, { s: "SENSEX", p: "81,543", c: 0.72 },
                            ].map((t, i) => (
                                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", paddingRight: "24px" }}>
                                    <span style={{ color: "#6b7280", fontWeight: "600" }}>{t.s}</span>
                                    <span style={{ color: "white" }}>₹{t.p}</span>
                                    <span style={{ color: t.c >= 0 ? "#22c55e" : "#ef4444", fontWeight: "700" }}>
                                        {t.c >= 0 ? "+" : ""}{t.c}%
                                    </span>
                                    <span style={{ color: "#1f2937" }}>|</span>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Stats metrics */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                        {[
                            { label: "Stocks Tracked", value: "2,400+" },
                            { label: "AI Signals / Day", value: "18K+" },
                            { label: "Active Users", value: "42K+" },
                        ].map(({ label, value }) => (
                            <div key={label} style={{
                                background: "rgba(10,14,26,0.6)", border: "1px solid rgba(255,255,255,0.06)",
                                borderRadius: "10px", padding: "12px", textAlign: "center",
                            }}>
                                <div style={{ color: "white", fontWeight: "700", fontSize: "16px" }}>{value}</div>
                                <div style={{ color: "#4b5563", fontSize: "11px", marginTop: "2px" }}>{label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                .login-visual { display: none; }
                @media (min-width: 980px) {
                    .login-visual { display: flex !important; }
                }
            `}</style>
        </div>
    );
}

function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z" />
        </svg>
    );
}
