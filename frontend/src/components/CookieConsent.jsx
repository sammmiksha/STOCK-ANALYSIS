import { useState, useEffect } from "react";

export default function CookieConsent() {
    const [visible, setVisible] = useState(false);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem("cookieConsent");
        if (!consent) {
            // Show banner after a slight delay for transition effect
            const timer = setTimeout(() => setVisible(true), 1200);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleConsent = (preference) => {
        setClosing(true);
        localStorage.setItem("cookieConsent", preference);
        // Wait for slide-down animation to complete before removing from DOM
        setTimeout(() => {
            setVisible(false);
            setClosing(false);
        }, 350);
    };

    if (!visible) return null;

    return (
        <div style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            width: "calc(100% - 48px)",
            maxWidth: 780,
            background: "rgba(12, 15, 26, 0.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(34, 197, 94, 0.03)",
            borderRadius: 16,
            padding: "20px 24px",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            animation: closing ? "slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards" : "slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            fontFamily: "var(--font-inter, 'Inter', sans-serif)",
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
                .cookie-btn-accept {
                    background: #22c55e;
                    color: #030712;
                    border: none;
                    border-radius: 9px;
                    padding: 8px 18px;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all 0.2s;
                    box-shadow: 0 0 12px rgba(34, 197, 94, 0.2);
                }
                .cookie-btn-accept:hover {
                    background: #16a34a;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 16px rgba(34, 197, 94, 0.3);
                }
                .cookie-btn-reject {
                    background: rgba(255, 255, 255, 0.03);
                    color: #9ca3af;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 9px;
                    padding: 7px 16px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all 0.15s;
                }
                .cookie-btn-reject:hover {
                    background: rgba(255, 255, 255, 0.06);
                    color: #f3f4f6;
                    border-color: rgba(255, 255, 255, 0.15);
                }
                @media (max-width: 720px) {
                    .cookie-banner-wrap {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 16px !important;
                        padding: 18px 20px !important;
                    }
                    .cookie-actions {
                        width: 100% !important;
                        justify-content: flex-end !important;
                    }
                }
            `}</style>

            <div className="cookie-banner-wrap" style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
                <div style={{
                    fontSize: 22,
                    background: "rgba(34, 197, 94, 0.08)",
                    border: "1px solid rgba(34, 197, 94, 0.15)",
                    borderRadius: 10,
                    width: 40,
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#22c55e",
                    flexShrink: 0
                }}>
                    🍪
                </div>
                <div style={{ flex: 1 }}>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: 13, fontWeight: 700, color: "#f3f4f6", letterSpacing: "-0.2px" }}>
                        We value your privacy
                    </h4>
                    <p style={{ margin: 0, fontSize: 11.5, color: "#9ca3af", lineHeight: 1.6 }}>
                        Stock Analysis uses cookies to store watchlists, remember your session, and analyze performance. By clicking "Accept All", you agree to our secure privacy practices.
                    </p>
                </div>
            </div>

            <div className="cookie-actions" style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <button className="cookie-btn-reject" onClick={() => handleConsent("rejected")}>
                    Reject
                </button>
                <button className="cookie-btn-accept" onClick={() => handleConsent("accepted")}>
                    Accept All
                </button>
            </div>
        </div>
    );
}
