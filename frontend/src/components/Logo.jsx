export default function Logo() {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", userSelect: "none" }}>
            <div style={{
                width: "32px", height: "32px", borderRadius: "9px",
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 20px rgba(34,197,94,0.35)",
            }}>
                <span style={{ color: "#030a04", fontWeight: "900", fontSize: "15px", fontFamily: "'Inter', sans-serif" }}>S</span>
            </div>
            <span style={{ fontWeight: "800", fontSize: "17px", letterSpacing: "-0.5px", color: "white", fontFamily: "'Inter', sans-serif" }}>
                Stock<span style={{ color: "#22c55e" }}> Analysis</span>
            </span>
        </div>
    );
}