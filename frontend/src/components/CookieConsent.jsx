import { useState, useEffect } from "react";

export default function CookieConsent() {
    const [visible, setVisible] = useState(false);
    const [showPreferences, setShowPreferences] = useState(false);
    const [closing, setClosing] = useState(false);
    const [preferences, setPreferences] = useState({
        essential: true,
        analytics: false,
        marketing: false
    });

    useEffect(() => {
        const consent = localStorage.getItem("cookieConsentSettings");
        if (!consent) {
            const timer = setTimeout(() => setVisible(true), 1200);
            return () => clearTimeout(timer);
        } else {
            try {
                const parsed = JSON.parse(consent);
                setPreferences(parsed);
                dispatchConsentEvent(parsed);
            } catch (e) {
                console.error("Error reading cookie preferences:", e);
            }
        }
    }, []);

    const dispatchConsentEvent = (settings) => {
        // Set standard window flags for third-party trackers or tag managers
        window.cookieConsentSettings = settings;
        window.dispatchEvent(new CustomEvent("cookieConsentUpdated", { detail: settings }));
        
        // Real-world standard: update google tag manager consent if available
        if (window.gtag) {
            window.gtag("consent", "update", {
                analytics_storage: settings.analytics ? "granted" : "denied",
                ad_storage: settings.marketing ? "granted" : "denied"
            });
        }
    };

    const handleSave = (newPrefs) => {
        setClosing(true);
        localStorage.setItem("cookieConsentSettings", JSON.stringify(newPrefs));
        dispatchConsentEvent(newPrefs);
        
        setTimeout(() => {
            setVisible(false);
            setClosing(false);
        }, 350);
    };

    const handleAcceptAll = () => {
        const allPrefs = { essential: true, analytics: true, marketing: true };
        setPreferences(allPrefs);
        handleSave(allPrefs);
    };

    const handleRejectAll = () => {
        const essentialOnly = { essential: true, analytics: false, marketing: false };
        setPreferences(essentialOnly);
        handleSave(essentialOnly);
    };

    const handleSavePreferences = () => {
        handleSave(preferences);
    };

    const togglePref = (key) => {
        if (key === "essential") return;
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (!visible) return null;

    return (
        <div style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            width: "calc(100% - 48px)",
            maxWidth: 680,
            background: "rgba(10, 14, 26, 0.96)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.65), 0 0 40px rgba(34, 197, 94, 0.02)",
            borderRadius: 16,
            padding: "24px 28px",
            zIndex: 9999,
            animation: closing ? "slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards" : "slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            fontFamily: "var(--font-inter, 'Inter', sans-serif)",
            color: "#e5e7eb",
        }}>
            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translate(-50%, 24px) scale(0.97); }
                    to { opacity: 1; transform: translate(-50%, 0) scale(1); }
                }
                @keyframes slideDown {
                    from { opacity: 1; transform: translate(-50%, 0) scale(1); }
                    to { opacity: 0; transform: translate(-50%, 24px) scale(0.97); }
                }
                .cookie-btn {
                    padding: 9px 18px;
                    font-size: 12.5px;
                    font-weight: 700;
                    border-radius: 8px;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .btn-accept {
                    background: #22c55e;
                    color: #030712;
                    border: none;
                    box-shadow: 0 4px 14px rgba(34, 197, 94, 0.22);
                }
                .btn-accept:hover {
                    background: #16a34a;
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(34, 197, 94, 0.35);
                }
                .btn-reject {
                    background: rgba(255, 255, 255, 0.03);
                    color: #9ca3af;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                }
                .btn-reject:hover {
                    background: rgba(255, 255, 255, 0.06);
                    color: #f3f4f6;
                    border-color: rgba(255, 255, 255, 0.15);
                }
                .btn-pref {
                    background: transparent;
                    color: #9ca3af;
                    border: none;
                    font-weight: 600;
                    text-decoration: underline;
                    cursor: pointer;
                    font-size: 12.5px;
                    transition: color 0.15s;
                }
                .btn-pref:hover {
                    color: #f3f4f6;
                }
                
                /* Switch styles */
                .switch-label {
                    display: inline-flex;
                    align-items: center;
                    cursor: pointer;
                }
                .switch-input {
                    display: none;
                }
                .switch-slider {
                    position: relative;
                    width: 38px;
                    height: 20px;
                    background-color: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 20px;
                    transition: all 0.2s ease;
                }
                .switch-slider:before {
                    position: absolute;
                    content: "";
                    height: 14px;
                    width: 14px;
                    left: 2px;
                    bottom: 2px;
                    background-color: #9ca3af;
                    border-radius: 50%;
                    transition: all 0.2s ease;
                }
                .switch-input:checked + .switch-slider {
                    background-color: rgba(34, 197, 94, 0.15);
                    border-color: rgba(34, 197, 94, 0.4);
                }
                .switch-input:checked + .switch-slider:before {
                    transform: translateX(18px);
                    background-color: #22c55e;
                }
                .switch-input:disabled + .switch-slider {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .switch-input:disabled + .switch-slider:before {
                    background-color: #4b5563;
                }
                
                @media (max-width: 600px) {
                    .cookie-row {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 16px !important;
                    }
                    .cookie-actions {
                        width: 100% !important;
                        justify-content: flex-end !important;
                    }
                }
            `}</style>

            {!showPreferences ? (
                <div className="cookie-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <div style={{
                            fontSize: 24,
                            background: "rgba(34, 197, 94, 0.06)",
                            border: "1px solid rgba(34, 197, 94, 0.18)",
                            borderRadius: 12,
                            width: 44, height: 44,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#22c55e", flexShrink: 0
                        }}>
                            🛡️
                        </div>
                        <div>
                            <h4 style={{ margin: "0 0 6px 0", fontSize: 14, fontWeight: 700, color: "#f3f4f6", letterSpacing: "-0.2px" }}>
                                Security & Privacy Consent
                            </h4>
                            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af", lineHeight: 1.6 }}>
                                We use secure cookies to authenticate sessions, remember watchlist symbols, and analyze platform load speeds. Manage your preferences below.
                            </p>
                        </div>
                    </div>
                    
                    <div className="cookie-actions" style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                        <button className="btn-pref" onClick={() => setShowPreferences(true)}>
                            Customize
                        </button>
                        <button className="cookie-btn btn-reject" onClick={handleRejectAll}>
                            Reject
                        </button>
                        <button className="cookie-btn btn-accept" onClick={handleAcceptAll}>
                            Accept All
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: 14 }}>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f3f4f6" }}>
                            Customize Consent Preferences
                        </h4>
                        <button className="btn-pref" style={{ fontSize: 12 }} onClick={() => setShowPreferences(false)}>
                            ← Back
                        </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {/* Essential Category */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: "#f3f4f6" }}>Strictly Necessary Cookies</span>
                                    <span style={{ fontSize: 10, background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4, color: "#9ca3af", fontWeight: 700 }}>Required</span>
                                </div>
                                <p style={{ margin: 0, fontSize: 11.5, color: "#9ca3af", lineHeight: 1.5 }}>
                                    Secures user login sessions, stores local watchlists, and remembers your cookie preferences. These cookies cannot be disabled.
                                </p>
                            </div>
                            <label className="switch-label" style={{ marginTop: 2 }}>
                                <input type="checkbox" className="switch-input" checked disabled />
                                <span className="switch-slider"></span>
                            </label>
                        </div>

                        {/* Analytics Category */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: "#f3f4f6" }}>Performance & Analytics</span>
                                </div>
                                <p style={{ margin: 0, fontSize: 11.5, color: "#9ca3af", lineHeight: 1.5 }}>
                                    Measures page load response times, API usage rates, and search symbol query performance to help optimize dashboard speeds.
                                </p>
                            </div>
                            <label className="switch-label" style={{ marginTop: 2 }}>
                                <input type="checkbox" className="switch-input" checked={preferences.analytics} onChange={() => togglePref("analytics")} />
                                <span className="switch-slider"></span>
                            </label>
                        </div>

                        {/* Marketing Category */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: "#f3f4f6" }}>Targeting & Customization</span>
                                </div>
                                <p style={{ margin: 0, fontSize: 11.5, color: "#9ca3af", lineHeight: 1.5 }}>
                                    Enables interactive feedback widgets, customized layout parameters, and social integration functionalities.
                                </p>
                            </div>
                            <label className="switch-label" style={{ marginTop: 2 }}>
                                <input type="checkbox" className="switch-input" checked={preferences.marketing} onChange={() => togglePref("marketing")} />
                                <span className="switch-slider"></span>
                            </label>
                        </div>
                    </div>

                    {/* Cookie Table Details */}
                    <details style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 10, padding: "8px 12px", cursor: "pointer" }}>
                        <summary style={{ fontSize: 11, fontWeight: 700, color: "var(--green)", outline: "none" }}>View Stored Cookies Details</summary>
                        <div style={{ marginTop: 10, overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, textAlign: "left", color: "#9ca3af" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                        <th style={{ padding: "4px 8px", fontWeight: 700, color: "#f3f4f6" }}>Key</th>
                                        <th style={{ padding: "4px 8px", fontWeight: 700, color: "#f3f4f6" }}>Type</th>
                                        <th style={{ padding: "4px 8px", fontWeight: 700, color: "#f3f4f6" }}>Retention</th>
                                        <th style={{ padding: "4px 8px", fontWeight: 700, color: "#f3f4f6" }}>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                        <td style={{ padding: "6px 8px", fontFamily: "monospace", color: "#f3f4f6" }}>cookieConsentSettings</td>
                                        <td style={{ padding: "6px 8px" }}>Local Storage</td>
                                        <td style={{ padding: "6px 8px" }}>Persistent</td>
                                        <td style={{ padding: "6px 8px" }}>Saves granular consent settings.</td>
                                    </tr>
                                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                        <td style={{ padding: "6px 8px", fontFamily: "monospace", color: "#f3f4f6" }}>firebase:authUser:...</td>
                                        <td style={{ padding: "6px 8px" }}>Local Storage</td>
                                        <td style={{ padding: "6px 8px" }}>Persistent</td>
                                        <td style={{ padding: "6px 8px" }}>Stores credentials for secure profile session.</td>
                                    </tr>
                                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                        <td style={{ padding: "6px 8px", fontFamily: "monospace", color: "#f3f4f6" }}>watchlist</td>
                                        <td style={{ padding: "6px 8px" }}>Local Storage</td>
                                        <td style={{ padding: "6px 8px" }}>Persistent</td>
                                        <td style={{ padding: "6px 8px" }}>Caches your favorite ticker symbol lists locally.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </details>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: 14 }}>
                        <button className="cookie-btn btn-reject" onClick={handleRejectAll}>
                            Reject All
                        </button>
                        <button className="cookie-btn btn-accept" onClick={handleSavePreferences}>
                            Save Preferences
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
