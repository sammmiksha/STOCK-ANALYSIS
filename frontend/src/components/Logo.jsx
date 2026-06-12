import React from "react";
import { useNavigate } from "react-router-dom";

export default function Logo() {
    const navigate = useNavigate();
    return (
        <div 
            onClick={() => navigate("/")}
            style={{ display: "flex", alignItems: "center", gap: "9px", cursor: "pointer", userSelect: "none" }}
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
            <span style={{ fontWeight: "800", fontSize: "16px", letterSpacing: "-0.3px", color: "#f3f4f6", fontFamily: "'Inter', sans-serif" }}>
                Stock <span style={{ color: "#22c55e" }}>Analysis</span>
            </span>
        </div>
    );
}