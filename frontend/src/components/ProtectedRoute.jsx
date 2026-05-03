import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        height: "calc(100vh - var(--navbar-h))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span className="spinner" style={{ width: "24px", height: "24px", color: "var(--green)" }} />
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}