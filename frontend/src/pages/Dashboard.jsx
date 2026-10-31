import {
  AlertTriangle,
  CircleAlert,
  ShieldAlert,
  Waves,
  Activity,
} from "lucide-react";
import { Link } from "react-router-dom";

import AppSidebar from "../components/layout/AppSidebar";
import AppTopbar from "../components/layout/AppTopbar";
import { useSecurity } from "../context/SecurityContext";
import "./Dashboard.css";

function Dashboard() {
  const {
    events,
    incidents,
    metrics,
    summary,
    riskSummary,
    loading,
    error,
  } = useSecurity();

  const metricCards = [
    [
      "SECURITY EVENTS",
      metrics.totalEvents,
      Waves,
      "blue",
    ],
    [
      "TOTAL INCIDENTS",
      summary?.total_incidents ?? 0,
      Activity,
      "amber",
    ],
    [
      "OPEN INCIDENTS",
      metrics.openIncidents,
      CircleAlert,
      "orange",
    ],
    [
      "HIGH SEVERITY",
      summary?.high_severity ?? 0,
      AlertTriangle,
      "red",
    ],
  ];

  if (loading) {
    return (
      <div className="app-shell">
        <AppSidebar />

        <div className="app-workspace">
          <AppTopbar />

          <main className="dashboard-page">
            <div className="dashboard-loading">
              <Activity size={30} />
              <h2>Loading Security Command Center...</h2>
              <p>Connecting to CyberGuard backend.</p>
            </div>
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

        <main className="dashboard-page">

          {/* HEADER */}
          <section className="dashboard-heading">
            <div>
              <p className="eyebrow">
                LIVE SECURITY OVERVIEW
              </p>

              <h1>Command Center</h1>

              <span>
                CyberGuard AI security monitoring and
                incident intelligence.
              </span>
            </div>

            <Link
              to="/incidents"
              className="generate-event"
            >
              <ShieldAlert size={15} />
              VIEW INCIDENTS
            </Link>
          </section>

          {/* ERROR */}
          {error && (
            <div className="dashboard-error">
              <ShieldAlert size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* METRICS */}
          <section className="metric-grid">
            {metricCards.map(
              ([label, value, Icon, tone]) => (
                <article
                  className={`metric-card ${tone}`}
                  key={label}
                >
                  <Icon size={19} />

                  <p>{label}</p>

                  <strong>{value}</strong>

                  <small>
                    Live backend data
                  </small>
                </article>
              ),
            )}
          </section>

          {/* ANALYTICS ROW */}
          <section className="dashboard-panels">

            {/* INCIDENTS */}
            <article className="incident-panel">
              <header>
                <div>
                  <p className="eyebrow">
                    PRIORITY QUEUE
                  </p>

                  <h2>Recent Incidents</h2>
                </div>

                <Link to="/incidents">
                  View all
                </Link>
              </header>

              {incidents.length === 0 ? (
                <div className="empty-state">
                  <ShieldAlert size={28} />

                  <strong>
                    No security incidents
                  </strong>

                  <span>
                    CyberGuard has not detected any
                    incidents yet.
                  </span>
                </div>
              ) : (
                incidents
                  .slice(0, 5)
                  .map((incident) => (
                    <Link
                      to={`/incidents/${incident.id}`}
                      className="incident-row"
                      key={incident.id}
                    >
                      <i
                        className={
                          incident.severity
                        }
                      />

                      <div>
                        <strong>
                          {incident.title}
                        </strong>

                        <span>
                          {incident.incident_number}
                          {" · "}
                          {incident.description ||
                            "Security incident detected"}
                        </span>
                      </div>

                      <b>
                        {incident.riskScore}
                        <small>
                          RISK
                        </small>
                      </b>

                      <em
                        className={
                          incident.severity
                        }
                      >
                        {incident.severity.toUpperCase()}
                      </em>
                    </Link>
                  ))
              )}
            </article>

            {/* RISK SUMMARY */}
            <article className="activity-panel">
              <p className="eyebrow">
                RISK INTELLIGENCE
              </p>

              <h2>Risk Overview</h2>

              <div className="dataset-summary">

                <div>
                  <span>
                    AVERAGE RISK
                  </span>

                  <strong>
                    {riskSummary
                      ?.average_risk_score ?? 0}
                  </strong>
                </div>

                <div>
                  <span>
                    MAXIMUM RISK
                  </span>

                  <strong>
                    {riskSummary
                      ?.maximum_risk_score ?? 0}
                  </strong>
                </div>

                <div>
                  <span>
                    MINIMUM RISK
                  </span>

                  <strong>
                    {riskSummary
                      ?.minimum_risk_score ?? 0}
                  </strong>
                </div>

                <div>
                  <span>
                    INVESTIGATING
                  </span>

                  <strong>
                    {summary
                      ?.investigating_incidents ?? 0}
                  </strong>
                </div>

              </div>
            </article>

          </section>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;