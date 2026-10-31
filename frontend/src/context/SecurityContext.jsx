
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api } from "../services/api";
import { useAuth } from "./AuthContext";

const SecurityContext = createContext();

export function SecurityProvider({ children }) {
  const { operator } = useAuth();

  const [events, setEvents] = useState([]);
  const [incidents, setIncidents] = useState([]);

  const [summary, setSummary] = useState(null);
  const [attackTypes, setAttackTypes] = useState({});
  const [severitySummary, setSeveritySummary] = useState({});
  const [riskSummary, setRiskSummary] = useState(null);

  const [eventTotal, setEventTotal] = useState(0);
  const [eventPage, setEventPage] = useState(1);
  const [eventPageSize] = useState(20);
  const [eventTotalPages, setEventTotalPages] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [fileName, setFileName] = useState("");

  const loadDashboardData = useCallback(async () => {
    // Never request protected dashboard data before login.
    if (!operator) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [
        summaryData,
        attackTypeData,
        severityData,
        riskData,
        incidentData,
        eventData,
      ] = await Promise.all([
        api.getReportSummary(),
        api.getAttackTypes(),
        api.getSeveritySummary(),
        api.getRiskSummary(),
        api.getIncidents(),
        api.getSecurityEvents(),
      ]);

      setSummary(summaryData);
      setAttackTypes(attackTypeData);
      setSeveritySummary(severityData);
      setRiskSummary(riskData);

      setIncidents(incidentData);

      setEvents(eventData.items || []);
      setEventTotal(eventData.total || 0);
      setEventPage(eventData.page || 1);
      setEventTotalPages(eventData.total_pages || 0);
    } catch (err) {
      console.error(
        "Failed to load CyberGuard data:",
        err
      );

      setError(
        err.message || "Failed to load security data."
      );
    } finally {
      setLoading(false);
    }
  }, [operator]);

  // Load data immediately after login.
  // Clear protected data immediately after logout.
  useEffect(() => {
    if (operator) {
      loadDashboardData();
      return;
    }

    setEvents([]);
    setIncidents([]);
    setSummary(null);
    setAttackTypes({});
    setSeveritySummary({});
    setRiskSummary(null);

    setEventTotal(0);
    setEventPage(1);
    setEventTotalPages(0);

    setFileName("");
    setError("");
    setLoading(false);
  }, [operator, loadDashboardData]);

  /*
   * Convert backend incident data into the structure
   * used by the existing dashboard.
   */
  const dashboardIncidents = useMemo(() => {
    return incidents.map((incident) => ({
      ...incident,

      riskScore: incident.risk_score,

      sourceIp: "Backend Event",

      asset: "CyberGuard",

      user: incident.assigned_to
        ? `User ${incident.assigned_to}`
        : "Unassigned",

      timestamp: incident.created_at,

      title: incident.title,

      description:
        incident.description ||
        "Security incident detected.",

      severity: incident.severity,

      status: incident.status,
    }));
  }, [incidents]);

  const metrics = {
    totalEvents: eventTotal,

    openIncidents:
      summary?.open_incidents ?? 0,

    critical:
      summary?.high_severity ?? 0,

    high:
      summary?.high_severity ?? 0,
  };

  const setIncidentStatus = async (
    incidentId,
    status
  ) => {
    try {
      const updatedIncident =
        await api.updateIncidentStatus(
          incidentId,
          status
        );

      setIncidents((current) =>
        current.map((incident) =>
          incident.id === incidentId
            ? updatedIncident
            : incident
        )
      );

      await loadDashboardData();
    } catch (err) {
      console.error(
        "Failed to update incident status:",
        err
      );

      throw err;
    }
  };

  const uploadCsv = async (file) => {
    try {
      setError("");

      const result =
        await api.uploadSecurityCsv(file);

      setFileName(result.filename);

      await loadDashboardData();

      return result;
    } catch (err) {
      console.error(
        "Failed to upload security CSV:",
        err
      );

      setError(
        err.message || "Failed to upload CSV."
      );

      throw err;
    }
  };

  /*
   * Frontend-only clear.
   * This does NOT delete database records.
   */
  const clearData = () => {
    setEvents([]);
    setIncidents([]);
    setSummary(null);
    setAttackTypes({});
    setSeveritySummary({});
    setRiskSummary(null);

    setEventTotal(0);
    setEventPage(1);
    setEventTotalPages(0);

    setFileName("");
    setError("");
  };

  return (
    <SecurityContext.Provider
      value={{
        events,
        incidents: dashboardIncidents,

        metrics,

        summary,
        attackTypes,
        severitySummary,
        riskSummary,

        eventTotal,
        eventPage,
        eventPageSize,
        eventTotalPages,

        loading,
        error,

        fileName,

        uploadCsv,
        clearData,

        setIncidentStatus,

        refreshData: loadDashboardData,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);

  if (!context) {
    throw new Error(
      "useSecurity must be used inside SecurityProvider."
    );
  }

  return context;
}
