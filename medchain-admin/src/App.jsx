import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./context/AuthContext";
import AdminLayout from "./components/layout/AdminLayout";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./components/dashboard/Dashboard";
import DoctorsPage from "./components/doctors/DoctorsPage";
import PatientsPage from "./components/patients/PatientsPage";
import RecordsPage from "./components/records/RecordsPage";
import AccessPage from "./components/access/AccessPage";
import AIAnalyticsPage from "./components/ai/AIAnalyticsPage";
import AuditPage from "./components/audit/AuditPage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: "12px", fontSize: "14px" } }} />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <AdminLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/doctors" element={<DoctorsPage />} />
                <Route path="/patients" element={<PatientsPage />} />
                <Route path="/records" element={<RecordsPage />} />
                <Route path="/access" element={<AccessPage />} />
                <Route path="/ai-analytics" element={<AIAnalyticsPage />} />
                <Route path="/audit" element={<AuditPage />} />
              </Routes>
            </AdminLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
}
