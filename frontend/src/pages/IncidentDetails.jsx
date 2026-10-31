
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldAlert,
  Sparkles,
  UserRound,
  XCircle,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";

import AppSidebar from "../components/layout/AppSidebar";
import AppTopbar from "../components/layout/AppTopbar";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./IncidentDetails.css";

function IncidentDetails() {
  const { id } = useParams();
  const { operator } = useAuth();

  const [incident, setIncident] = useState(null);
  const [relatedEvents, setRelatedEvents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState("");

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignedTo, setAssignedTo] = useState("");

  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [aiError, setAiError] = useState("");

  const canUpdate =
    operator?.role === "admin" ||
    operator?.role === "security_analyst";

  const loadIncident = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await api.getIncident(id);

      setIncident(data);
      setAssignedTo(
        data.assigned_to ? String(data.assigned_to) : ""
      );
    } catch (err) {
      console.error("Failed to load incident:", err);
      setError(err.message || "Failed to load incident.");
      setIncident(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadRelatedEvents = useCallback(async () => {
    try {
      setEventsLoading(true);

      const data = await api.getIncidentEvents(id);

      setRelatedEvents(
        Array.isArray(data) ? data : data.items || []
      );
    } catch (err) {
      console.error("Failed to load related events:", err);
      setRelatedEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadIncident();
    loadRelatedEvents();
  }, [loadIncident, loadRelatedEvents]);

  const updateStatus = async (newStatus) => {
    if (!canUpdate || !incident || incident.status === newStatus) {
      return;
    }

    try {
      setUpdatingStatus(true);
      setError("");

      const updatedIncident = await api.updateIncidentStatus(
        incident.id,
        newStatus
      );

      setIncident(updatedIncident);
    } catch (err) {
      console.error("Failed to update incident status:", err);
      setError(err.message || "Failed to update incident status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const assignIncident = async () => {
    if (!canUpdate || !incident) {
      return;
    }

    if (!assignedTo || !Number.isInteger(Number(assignedTo)) ||
        Number(assignedTo) < 1) {
      setError("Enter a valid user ID to assign this incident.");
      return;
    }

    try {
      setAssigning(true);
      setError("");

      const updatedIncident = await api.assignIncident(
        incident.id,
        Number(assignedTo)
      );

      setIncident(updatedIncident);
      setAssignedTo(
        updatedIncident.assigned_to
          ? String(updatedIncident.assigned_to)
          : ""
      );
    } catch (err) {
      console.error("Failed to assign incident:", err);
      setError(err.message || "Failed to assign incident.");
    } finally {
      setAssigning(false);
    }
  };

  const analyzeIncidentWithAI = async () => {
    if (!canUpdate || analyzingAI || !incident) {
      return;
    }

    try {
      setAnalyzingAI(true);
      setAiError("");

      const updatedIncident = await api.analyzeIncident(incident.id);

      setIncident(updatedIncident);
    } catch (err) {
      console.error("Failed to analyze incident with AI:", err);
      setAiError(
        err.message || "AI analysis failed. Please try again."
      );
    } finally {
      setAnalyzingAI(false);
    }
  };

  const formatDate = (value) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleString();
  };

  const statusSteps = [
    { value: "open", label: "OPEN", icon: Clock3 },
    {
      value: "investigating",
      label: "INVESTIGATING",
      icon: ShieldAlert,
    },
    { value: "resolved", label: "RESOLVED", icon: CheckCircle2 },
    { value: "closed", label: "CLOSED", icon: XCircle },
  ];

  const recommendations = incident?.ai_recommendations
    ? incident.ai_recommendations
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.replace(/^\d+[.)]\s*/, ""))
    : [];

  if (loading) {
    return (
      <div className="app-shell">
        <AppSidebar />

        <div className="app-workspace">
          <AppTopbar />

          <main className="incident-details-page">
            <section className="incident-loading">
              <Loader2 className="spin" size={30} />
              <h2>Loading incident intelligence...</h2>
              <p>Retrieving incident #{id} from CyberGuard.</p>
            </section>
          </main>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="app-shell">
        <AppSidebar />

        <div className="app-workspace">
          <AppTopbar />

          <main className="incident-details-page">
            <section className="incident-not-found">
              <ShieldAlert size={36} />
              <h1>Incident not found</h1>
              <p>
                {error ||
                  `Incident #${id} does not exist in the CyberGuard database.`}
              </p>
              <Link to="/incidents">RETURN TO INCIDENTS</Link>
            </section>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AppSidebar />

      <div className="app-workspace">
        <AppTopbar />

        <main className="incident-details-page">
          <Link className="back-link" to="/incidents">
            <ArrowLeft size={15} />
            ALL INCIDENTS
          </Link>

          {error && (
            <div className="incident-error" role="alert">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          )}

          {/* INCIDENT HEADER */}
          <section className="incident-details-heading">
            <div>
              <p className="eyebrow">{incident.incident_number}</p>
              <h1>{incident.title}</h1>
              <span>
                {incident.description ||
                  "Security incident detected by CyberGuard."}
              </span>
            </div>

            <div className="incident-heading-meta">
              <em className={incident.severity}>
                {incident.severity?.toUpperCase()}
              </em>
              <span className="attack-type">
                {incident.attack_type || "SECURITY EVENT"}
              </span>
            </div>
          </section>

          {/* OVERVIEW AND RESPONSE WORKFLOW */}
          <section className="incident-detail-grid">
            <article className="incident-detail-card">
              <p className="eyebrow">INCIDENT INTELLIGENCE</p>

              <dl>
                <div>
                  <dt>Incident ID</dt>
                  <dd>#{incident.id}</dd>
                </div>

                <div>
                  <dt>Incident Number</dt>
                  <dd className="mono-value">
                    {incident.incident_number}
                  </dd>
                </div>

                <div>
                  <dt>Risk Score</dt>
                  <dd>
                    <strong className="risk-value">
                      {incident.risk_score ?? "—"}
                    </strong>
                    <span className="risk-total">/100</span>
                  </dd>
                </div>

                <div>
                  <dt>Severity</dt>
                  <dd>
                    <span
                      className={`severity-text ${incident.severity || ""}`}
                    >
                      {incident.severity?.toUpperCase() || "UNKNOWN"}
                    </span>
                  </dd>
                </div>

                <div>
                  <dt>Attack Type</dt>
                  <dd>{incident.attack_type || "—"}</dd>
                </div>

                <div>
                  <dt>Current Status</dt>
                  <dd>
                    <span
                      className={`incident-status ${incident.status || ""}`}
                    >
                      {incident.status?.toUpperCase() || "UNKNOWN"}
                    </span>
                  </dd>
                </div>

                <div>
                  <dt>Assigned To</dt>
                  <dd>
                    {incident.assigned_to
                      ? `User ${incident.assigned_to}`
                      : "UNASSIGNED"}
                  </dd>
                </div>

                <div>
                  <dt>Created</dt>
                  <dd>{formatDate(incident.created_at)}</dd>
                </div>

                <div>
                  <dt>Last Updated</dt>
                  <dd>{formatDate(incident.updated_at)}</dd>
                </div>
              </dl>
            </article>

            <article className="incident-detail-card actions-card">
              <p className="eyebrow">INCIDENT WORKFLOW</p>
              <h2>Response lifecycle</h2>
              <p className="action-description">
                Move this incident through the security response lifecycle.
              </p>

              <div className="status-workflow">
                {statusSteps.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    className={incident.status === value ? "active" : ""}
                    disabled={!canUpdate || updatingStatus}
                    onClick={() => updateStatus(value)}
                  >
                    <Icon size={14} />
                    <span>{label}</span>

                    {incident.status === value && (
                      <small>CURRENT</small>
                    )}
                  </button>
                ))}
              </div>

              {!canUpdate && (
                <p className="permission-note">
                  Your role has read-only access to incident workflow controls.
                </p>
              )}

              <div className="assignment-section">
                <p className="eyebrow">INCIDENT ASSIGNMENT</p>

                <div className="assignment-control">
                  <div className="assignment-input">
                    <UserRound size={15} />

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={assignedTo}
                      disabled={!canUpdate || assigning}
                      onChange={(event) =>
                        setAssignedTo(event.target.value)
                      }
                      placeholder="Operator user ID"
                      aria-label="Operator user ID"
                    />
                  </div>

                  <button
                    type="button"
                    className="assign-button"
                    disabled={!canUpdate || assigning || !assignedTo}
                    onClick={assignIncident}
                  >
                    {assigning ? "ASSIGNING..." : "ASSIGN"}
                  </button>
                </div>
              </div>
            </article>
          </section>

          {/* RELATED SECURITY EVENTS */}
          <section className="related-events-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">EVIDENCE</p>
                <h2>Related Security Events</h2>
                <span>
                  Security telemetry linked to this specific incident.
                </span>
              </div>

              <strong>
                {eventsLoading ? "..." : relatedEvents.length} EVENTS
              </strong>
            </div>

            {eventsLoading ? (
              <div className="events-loading">
                <Loader2 size={20} className="spin" />
                <span>Loading related telemetry...</span>
              </div>
            ) : relatedEvents.length === 0 ? (
              <div className="events-empty">
                <ShieldAlert size={24} />
                <span>
                  No security events are linked to this incident.
                </span>
              </div>
            ) : (
              <div className="related-events-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>TIMESTAMP</th>
                      <th>EVENT TYPE</th>
                      <th>SEVERITY</th>
                      <th>USERNAME</th>
                      <th>SOURCE IP</th>
                      <th>FAILED</th>
                      <th>BYTES</th>
                    </tr>
                  </thead>

                  <tbody>
                    {relatedEvents.map((event) => (
                      <tr key={event.id}>
                        <td>#{event.id}</td>
                        <td>{formatDate(event.timestamp)}</td>
                        <td>
                          <span className="event-type">
                            {event.event_type || "UNKNOWN"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`severity-badge ${
                              event.severity || "low"
                            }`}
                          >
                            {(event.severity || "LOW").toUpperCase()}
                          </span>
                        </td>
                        <td>{event.username || "—"}</td>
                        <td className="mono-cell">
                          {event.source_ip || "—"}
                        </td>
                        <td>{event.failed_attempts ?? 0}</td>
                        <td>{event.bytes_transferred ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* GROQ AI INTELLIGENCE */}
          <section className="ai-intelligence-card">
            <div className="ai-intelligence-header">
              <div className="ai-title-group">
                <div className="ai-icon">
                  <Sparkles size={21} />
                </div>

                <div>
                  <p className="eyebrow">AI INTELLIGENCE</p>
                  <h2>CyberGuard AI Analysis</h2>
                  <p className="ai-subtitle">
                    Analysis for {incident.incident_number}
                  </p>
                </div>
              </div>

              <div className="ai-status">
                GROQ
                <span>
                  {incident.ai_summary ? "ANALYSIS SAVED" : "READY"}
                </span>
              </div>
            </div>

            {aiError && (
              <div className="ai-error" role="alert">
                <AlertTriangle size={17} />
                <span>{aiError}</span>
              </div>
            )}

            <div className="ai-action-row">
              <p>
                {incident.ai_summary
                  ? "Review the saved analysis or regenerate it using the linked incident evidence."
                  : "Generate an AI-assisted incident summary and prioritized defensive recommendations."}
              </p>

              {canUpdate && (
                <button
                  type="button"
                  className="ai-analyze-button"
                  onClick={analyzeIncidentWithAI}
                  disabled={analyzingAI}
                >
                  {analyzingAI ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      ANALYZING...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      {incident.ai_summary
                        ? "REGENERATE ANALYSIS"
                        : "GENERATE AI ANALYSIS"}
                    </>
                  )}
                </button>
              )}
            </div>

            {analyzingAI && (
              <div className="ai-loading">
                <Loader2 size={22} className="spin" />
                <div>
                  <strong>Analyzing incident evidence</strong>
                  <p>
                    Groq is processing the incident context. This may take
                    a few seconds.
                  </p>
                </div>
              </div>
            )}

            {!analyzingAI && incident.ai_summary ? (
              <div className="ai-results">
                <article className="ai-result-block">
                  <p className="eyebrow">INCIDENT SUMMARY</p>
                  <p className="ai-summary-text">
                    {incident.ai_summary}
                  </p>
                </article>

                <article className="ai-result-block">
                  <p className="eyebrow">
                    PRIORITIZED RECOMMENDATIONS
                  </p>

                  {recommendations.length > 0 ? (
                    <ol className="ai-recommendations">
                      {recommendations.map((item, index) => (
                        <li key={`${index}-${item}`}>{item}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="ai-no-recommendations">
                      No recommendations are available for this analysis.
                    </p>
                  )}
                </article>

                <p className="ai-disclaimer">
                  AI-generated guidance only. Verify findings against
                  security logs and review recommendations before taking
                  action. This analysis does not automatically execute
                  defensive actions.
                </p>
              </div>
            ) : !analyzingAI ? (
              <div className="ai-empty">
                <ShieldAlert size={25} />
                <div>
                  <strong>No AI analysis generated yet</strong>
                  <p>
                    Generate an analysis to view this incident's summary
                    and recommended response.
                  </p>
                </div>
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}

export default IncidentDetails;
