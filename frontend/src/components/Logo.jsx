import { useState, useEffect, useRef } from "react";
import { auth } from "../firebase";
import {
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [mounted, setMounted] = useState(false);

    const navigate = useNavigate();

    useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

    const fi = (delay = 0) => ({
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(18px)",
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
    });

    // Friendly Firebase error messages
    const friendlyError = (code) => {
        switch (code) {
            case "auth/user-not-found": return "No account found with this email.";
            case "auth/wrong-password": return "Incorrect password. Please try again.";
            case "auth/invalid-email": return "Please enter a valid email address.";
            case "auth/too-many-requests": return "Too many attempts. Please wait a moment.";
            case "auth/user-disabled": return "This account has been disabled.";
            case "auth/popup-closed-by-user": return "Google sign-in was cancelled.";
            case "auth/network-request-failed": return "Network error. Check your connection.";
            default: return "Something went wrong. Please try again.";
        }
    };

    const loginEmail = async () => {
        if (!email || !password) { setError("Please enter your email and password."); return; }
        try {
            setError("");
            setLoading(true);
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/dashboard");
        } catch (err) {
            setError(friendlyError(err.code));
        } finally {
            setLoading(false);
        }
    };

    const loginGoogle = async () => {
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
        <div style={{ minHeight: "100vh", background: "#060810", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", color: "white", overflow: "hidden" }}>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::placeholder{color:#374151!important}
        input:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px #0d111e inset!important;-webkit-text-fill-color:white!important}
        .g-btn{width:100%;padding:13px;border-radius:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:white;font-family:'Inter',sans-serif;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:background .2s,border-color .2s,transform .15s,box-shadow .2s}
        .g-btn:hover{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.22);transform:translateY(-1px);box-shadow:0 8px 20px rgba(0,0,0,0.3)}
        .g-btn:active{transform:translateY(0)}
        .inp{width:100%;padding:13px 16px;border-radius:10px;background:#0d111e;border:1px solid rgba(255,255,255,0.08);color:white;font-family:'Inter',sans-serif;font-size:14px;outline:none;transition:border-color .2s,box-shadow .2s}
        .inp:hover{border-color:rgba(255,255,255,0.18)}
        .inp:focus{border-color:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,0.12)}
        .p-btn{width:100%;padding:14px;border-radius:10px;background:#22c55e;border:none;color:#030a04;font-family:'Inter',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:background .2s,transform .15s,box-shadow .2s}
        .p-btn:hover{background:#16a34a;transform:translateY(-1px);box-shadow:0 8px 28px rgba(34,197,94,0.35)}
        .p-btn:active{transform:translateY(0)}
        .p-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spin{width:15px;height:15px;border:2px solid rgba(0,0,0,0.25);border-top-color:#030a04;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
        @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        .float{animation:floatY 4s ease-in-out infinite}
        @keyframes tkr{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .tkr{animation:tkr 20s linear infinite;white-space:nowrap;display:flex;gap:0}
        .tkr:hover{animation-play-state:paused}
        .nav-btn{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#9ca3af;padding:7px 18px;border-radius:8px;cursor:pointer;font-family:'Inter',sans-serif;font-size:13px;font-weight:600;transition:all .2s}
        .nav-btn:hover{background:rgba(255,255,255,0.1);color:white}
        a{text-decoration:none}
      `}</style>

            {/* NAVBAR */}
            <nav style={{
                position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
                padding: "0 32px", height: "62px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "rgba(6,8,16,0.75)", backdropFilter: "blur(20px)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                ...fi(0),
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                        width: "32px", height: "32px", borderRadius: "9px",
                        background: "linear-gradient(135deg,#22c55e,#16a34a)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 0 20px rgba(34,197,94,0.35)",
                    }}>
                        <span style={{ color: "#030a04", fontWeight: "900", fontSize: "15px" }}>S</span>
                    </div>
                    <span style={{ fontWeight: "800", fontSize: "17px", letterSpacing: "-0.5px" }}>
                        Stock<span style={{ color: "#22c55e" }}> Analysis</span>
                    </span>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button className="nav-btn">Log in</button>
                    <button className="p-btn" style={{ width: "auto", padding: "8px 20px", fontSize: "13px" }}>
                        Sign up free
                    </button>
                </div>
            </nav>

            {/* SPLIT LAYOUT */}
            <div style={{ flex: 1, display: "flex", minHeight: "100vh", paddingTop: "62px" }}>

                {/* LEFT */}
                <div style={{
                    width: "480px", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "40px 52px",
                    position: "relative", zIndex: 2,
                    borderRight: "1px solid rgba(255,255,255,0.04)",
                }}>
                    {/* left glow */}
                    <div style={{
                        position: "absolute", bottom: "25%", left: "-60px",
                        width: "280px", height: "280px",
                        background: "radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)",
                        pointerEvents: "none",
                    }} />

                    <div style={{ width: "100%" }}>
                        {/* badge */}
                        <div style={{
                            ...fi(80),
                            display: "inline-flex", alignItems: "center", gap: "6px",
                            background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)",
                            borderRadius: "20px", padding: "4px 12px", marginBottom: "22px",
                        }}>
                            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
                            <span style={{ color: "#22c55e", fontSize: "11px", fontWeight: "600" }}>Live · NSE / BSE</span>
                        </div>

                        <h1 style={{ ...fi(130), fontSize: "29px", fontWeight: "800", letterSpacing: "-1px", lineHeight: "1.2", marginBottom: "8px" }}>
                            Welcome back
                        </h1>
                        <p style={{ ...fi(180), color: "#6b7280", fontSize: "14px", marginBottom: "28px", lineHeight: "1.65" }}>
                            Sign in to your Stock Analysis dashboard — real-time market insights await.
                        </p>

                        {/* Google */}
                        <div style={{ ...fi(230), marginBottom: "14px" }}>
                            <button className="g-btn" onClick={loginGoogle}>
                                <svg width="18" height="18" viewBox="0 0 48 48">
                                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.332 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                                    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                                    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                                    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
                                </svg>
                                Continue with Google
                            </button>
                        </div>

                        {/* Divider */}
                        <div style={{ ...fi(260), display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
                            <span style={{ color: "#374151", fontSize: "12px" }}>or continue with email</span>
                            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
                        </div>

                        {/* Inputs */}
                        <div style={{ ...fi(300), display: "flex", flexDirection: "column", gap: "10px", marginBottom: "8px" }}>
                            <input className="inp" type="email" placeholder="Email address" value={email}
                                onChange={e => { setEmail(e.target.value); setError(""); }}
                                onKeyDown={e => e.key === "Enter" && document.getElementById("pwd-inp").focus()} />
                            <input id="pwd-inp" className="inp" type="password" placeholder="Password" value={password}
                                onChange={e => { setPassword(e.target.value); setError(""); }}
                                onKeyDown={e => e.key === "Enter" && loginEmail()} />
                        </div>
                        <div style={{ ...fi(320), textAlign: "right", marginBottom: "16px" }}>
                            <a href="#" style={{
                                color: "#22c55e", fontSize: "12px", opacity: 0.8,
                                transition: "opacity .2s"
                            }}
                                onMouseEnter={e => e.target.style.opacity = 1}
                                onMouseLeave={e => e.target.style.opacity = 0.8}>
                                Forgot password?
                            </a>
                        </div>

                        {/* Error banner */}
                        {error && (
                            <div style={{
                                ...fi(0),
                                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                                borderRadius: "8px", padding: "10px 14px", marginBottom: "12px",
                                display: "flex", alignItems: "center", gap: "8px",
                            }}>
                                <span style={{ color: "#ef4444", fontSize: "16px" }}>⚠</span>
                                <span style={{ color: "#fca5a5", fontSize: "13px" }}>{error}</span>
                            </div>
                        )}

                        {/* Sign in */}
                        <div style={{ ...fi(350), marginBottom: "18px" }}>
                            <button className="p-btn" onClick={loginEmail} disabled={loading}>
                                {loading
                                    ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                        <span className="spin" /> Signing in…
                                    </span>
                                    : "Sign In →"}
                            </button>
                        </div>

                        <p style={{ ...fi(390), textAlign: "center", color: "#4b5563", fontSize: "13px" }}>
                            Don't have an account?{" "}
                            <a href="#" style={{ color: "#22c55e", fontWeight: "600" }}
                                onMouseEnter={e => e.target.style.textDecoration = "underline"}
                                onMouseLeave={e => e.target.style.textDecoration = "none"}>
                                Sign up free
                            </a>
                        </p>
                    </div>
                </div>

                {/* RIGHT */}
                <div style={{
                    flex: 1, position: "relative",
                    background: "linear-gradient(140deg, #06080f 0%, #0a1525 45%, #060810 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden",
                }}>
                    {/* Glow orbs */}
                    <div style={{ position: "absolute", top: "10%", right: "10%", width: "520px", height: "520px", background: "radial-gradient(circle, rgba(34,197,94,0.14) 0%, transparent 60%)", pointerEvents: "none" }} />
                    <div style={{ position: "absolute", bottom: "5%", left: "5%", width: "380px", height: "380px", background: "radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 65%)", pointerEvents: "none" }} />
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(34,197,94,0.05) 0%, transparent 55%)", pointerEvents: "none" }} />

                    {/* Grid */}
                    <div style={{
                        position: "absolute", inset: 0, opacity: 0.5,
                        backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
                        backgroundSize: "52px 52px", pointerEvents: "none",
                    }} />

                    {/* Content */}
                    <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: "520px", padding: "0 48px", ...fi(200) }}>
                        {/* headline */}
                        <div style={{ marginBottom: "36px" }}>
                            <div style={{
                                display: "inline-flex", alignItems: "center", gap: "6px",
                                background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)",
                                borderRadius: "20px", padding: "4px 12px", marginBottom: "18px",
                            }}>
                                <span style={{ color: "#22c55e", fontSize: "11px", fontWeight: "600", letterSpacing: "0.06em" }}>▲ MARKETS OPEN</span>
                            </div>
                            <h2 style={{ fontSize: "38px", fontWeight: "800", letterSpacing: "-1.5px", lineHeight: "1.12", marginBottom: "12px" }}>
                                Real-time Market<br />
                                <span style={{ color: "#22c55e" }}>Intelligence</span>
                            </h2>
                            <p style={{ color: "#6b7280", fontSize: "14px", lineHeight: "1.7" }}>
                                AI-powered signals · Live technical indicators · Smart alerts for NSE & BSE
                            </p>
                        </div>

                        {/* Chart card */}
                        <div className="float" style={{
                            background: "rgba(10,14,26,0.88)", backdropFilter: "blur(24px)",
                            border: "1px solid rgba(34,197,94,0.15)", borderRadius: "18px",
                            padding: "22px 22px 16px",
                            boxShadow: "0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(34,197,94,0.04) inset",
                            marginBottom: "14px",
                        }}>
                            <LiveChart />
                        </div>

                        {/* Ticker */}
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

                        {/* Stats */}
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
            </div>
        </div>
    );
}