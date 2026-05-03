import { Link } from "react-router-dom";

export default function Logo({ size = 30 }) {
    return (
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
                width: size, height: size, borderRadius: 8,
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 12px rgba(34,197,94,0.25)",
            }}>
                <span style={{ color: "#03110a", fontWeight: 900, fontSize: size * 0.5 }}>S</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.5px" }}>
                Stock<span style={{ color: "var(--green)" }}>AI</span>
            </span>
        </Link>
    );
}
