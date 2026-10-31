import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import DataUpload from "../pages/DataUpload";
import Incidents from "../pages/Incidents";
import IncidentDetails from "../pages/IncidentDetails";
import SecurityEvents from "../pages/SecurityEvents";
import Analytics from "../pages/Analytics";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute() {
  const { operator } = useAuth();
  return operator ? <Outlet /> : <Navigate to="/login" replace />;
}

function EntryRoute() {
  const { operator } = useAuth();
  return <Navigate to={operator ? "/dashboard" : "/login"} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/upload" element={<DataUpload />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/incidents/:id" element={<IncidentDetails />} />
        <Route path="/events" element={<SecurityEvents />} />
        <Route path="/analytics" element={<Analytics />} />
      </Route>
      <Route path="/" element={<EntryRoute />} />
      <Route path="*" element={<EntryRoute />} />
    </Routes>
  );
}

export default AppRoutes;
