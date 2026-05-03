export default function Skeleton({ h = 20, w = "100%", r = 6 }) {
    return (
        <div style={{
            height: h, width: w, borderRadius: r,
            background: "linear-gradient(90deg, #1a2030 25%, #232a3d 50%, #1a2030 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s infinite",
        }} />
    );
}
