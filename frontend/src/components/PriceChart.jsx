import { useState } from "react";

export default function PriceChart({ history, positive, height = 320 }) {
    const [hover, setHover] = useState(null);

    if (!history || history.length < 2) {
        return (
            <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-faint)", fontSize: 13 }}>
                No chart data available
            </div>
        );
    }

    const W = 1000, H = height, pL = 56, pR = 16, pT = 16, pB = 32;
    const iW = W - pL - pR, iH = H - pT - pB;
    const vals = history.map(d => d.close ?? d);
    const min = Math.min(...vals) * 0.998, max = Math.max(...vals) * 1.002, range = max - min || 1;
    const xS = i => pL + (i / (vals.length - 1)) * iW;
    const yS = v => pT + iH - ((v - min) / range) * iH;
    const pts = vals.map((v, i) => `${xS(i)},${yS(v)}`).join(" ");
    const area = `M ${xS(0)},${yS(vals[0])} ${vals.map((v, i) => `L ${xS(i)},${yS(v)}`).join(" ")} L ${xS(vals.length - 1)},${H - pB} L ${xS(0)},${H - pB} Z`;
    const color = positive ? "#22c55e" : "#ef4444";

    const yTicks = 5;
    const xLabels = history.map((d, i) => ({ i, label: d.date ?? `${i}` }))
        .filter((_, i, a) => i === 0 || i === a.length - 1 || i % Math.max(1, Math.floor(a.length / 5)) === 0);

    return (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" style={{ display: "block", height }}
            onMouseLeave={() => setHover(null)}>
            <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>

            {Array.from({ length: yTicks }).map((_, i) => {
                const y = pT + (i / (yTicks - 1)) * iH;
                const v = max - (i / (yTicks - 1)) * range;
                return (
                    <g key={i}>
                        <line x1={pL} y1={y} x2={W - pR} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                        <text x={pL - 8} y={y + 4} textAnchor="end" fill="var(--text-faint)" fontSize="10">
                            ₹{Math.round(v).toLocaleString("en-IN")}
                        </text>
                    </g>
                );
            })}

            <path d={area} fill="url(#cg)" />
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />

            {vals.map((v, i) => (
                <rect key={i}
                    x={xS(i) - iW / vals.length / 2} y={pT}
                    width={iW / vals.length} height={iH}
                    fill="transparent" style={{ cursor: "crosshair" }}
                    onMouseEnter={() => setHover(i)} />
            ))}

            {hover !== null && (
                <g>
                    <line x1={xS(hover)} y1={pT} x2={xS(hover)} y2={H - pB} stroke={color} strokeOpacity="0.4" strokeWidth="1" strokeDasharray="3,3" />
                    <circle cx={xS(hover)} cy={yS(vals[hover])} r="4" fill={color} />
                    <rect x={Math.min(xS(hover) - 44, W - 96)} y={Math.max(yS(vals[hover]) - 32, 4)}
                        width="92" height="26" rx="6" fill="var(--bg-elevated)" stroke={color} strokeOpacity="0.4" strokeWidth="1" />
                    <text x={Math.min(xS(hover), W - 50)} y={Math.max(yS(vals[hover]) - 14, 22)}
                        textAnchor="middle" fill={color} fontSize="11" fontWeight="700">
                        ₹{vals[hover].toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </text>
                </g>
            )}

            {xLabels.map(({ i, label }) => (
                <text key={i} x={xS(i)} y={H - 8} textAnchor="middle" fill="var(--text-faint)" fontSize="9">
                    {String(label).slice(0, 10)}
                </text>
            ))}
        </svg>
    );
}
