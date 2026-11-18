
import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  Database,
  Eye,
  Radar,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Target,
  Waves,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import AppSidebar from "../components/layout/AppSidebar";
import AppTopbar from "../components/layout/AppTopbar";
import { useSecurity } from "../context/SecurityContext";
import "./Dashboard.css";

const SEVERITY_COLORS = {
  critical: "#ff526b",
  high: "#ff9f55",
  medium: "#f5ca65",
  low: "#45a6ff",
};

const number = (value) =>
  new Intl.NumberFormat("en-IN").format(Number(value) || 0);

const severityOf = (value) =>
  String(value || "low").toLowerCase();

const dateOf = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTimestamp = (value) => {
  const date = dateOf(value);
  if (!date) return "Unknown time";

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function DashboardTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="dashboard-chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <div key={item.dataKey}>
          <i style={{ background: item.color || item.fill }} />
          <span>{item.name || item.dataKey}</span>
          <b>{number(item.value)}</b>
        </div>
      ))}
    </div>
  );
}

function Dashboard() {
  const {
    events,
    incidents,
    metrics,
    summary,
    riskSummary,
    loading,
    error,
    refreshData,
  } = useSecurity();

  const severityData = useMemo(() => {
    const counts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    incidents.forEach((incident) => {
      const severity = severityOf(incident.severity);
      if (counts[severity] !== undefined) counts[severity] += 1;
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: SEVERITY_COLORS[name],
    }));
  }, [incidents]);

  const eventTimeline = useMemo(() => {
    const buckets = {};

    events.forEach((event) => {
      const date = dateOf(event.timestamp || event.created_at);
      if (!date) return;

      const key = date.toLocaleDateString([], {
        day: "2-digit",
        month: "short",
      });

      buckets[key] = (buckets[key] || 0) + 1;
    });

    return Object.entries(buckets)
      .map(([date, count]) => ({ date, count }))
      .reverse();
  }, [events]);

  const recentIncidents = useMemo(() => {
    return [...incidents]
      .sort((a, b) => {
        const first = dateOf(a.created_at)?.getTime() || 0;
        const second = dateOf(b.created_at)?.getTime() || 0;
        return second - first;
      })
      .slice(0, 5);
  }, [incidents]);

  const criticalCount =
    severityData.find((item) => item.name === "critical")?.value || 0;

  const highCount =
    severityData.find((item) => item.name === "high")?.value || 0;

  const openCount = Number(
    summary?.open_incidents ?? metrics.openIncidents ?? 0,
  );

  const averageRisk = Number(
    riskSummary?.average_risk_score ?? 0,
  );

  const maximumRisk = Number(
    riskSummary?.maximum_risk_score ?? 0,
  );

  const minimumRisk = Number(
    riskSummary?.minimum_risk_score ?? 0,
  );

  const investigatingCount = Number(
    summary?.investigating_incidents ?? 0,
  );

  const totalIncidents = Number(
    summary?.total_incidents ?? incidents.length,
  );

  const totalEvents = Number(metrics.totalEvents ?? 0);

  const statusCounts = useMemo(() => {
    const counts = {
      open: 0,
      investigating: 0,
      resolved: 0,
      closed: 0,
    };

    incidents.forEach((incident) => {
      const status = String(incident.status || "open").toLowerCase();
      if (counts[status] !== undefined) counts[status] += 1;
    });

    return counts;
  }, [incidents]);

  const handleRefresh = async () => {
    try {
      await refreshData();
    } catch (err) {
      console.error("Dashboard refresh failed:", err);
    }
  };

  if (loading && incidents.length === 0 && events.length === 0) {
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
          {/* Command center header */}
          <section className="dashboard-hero">
            <div className="dashboard-hero-grid" />

            <div className="dashboard-hero-content">
              <div className="dashboard-hero-copy">
                <div className="dashboard-eyebrow">
                  <span className="dashboard-live-dot" />
                  LIVE SECURITY OVERVIEW
                  <span className="dashboard-eyebrow-divider">/</span>
                  COMMAND CENTER
                </div>

                <h1>
                  Security <span>Command Center</span>
                </h1>

                <p>
                  Monitor your security posture, track active threats and
                  investigate incidents across your environment.
                </p>

                <div className="dashboard-hero-meta">
                  <span>
                    <ShieldCheck size={13} />
                    Detection engine operational
                  </span>
                  <span>
                    <Database size={13} />
                    Live backend data
                  </span>
                </div>
              </div>

              <div className="dashboard-hero-actions">
                <button
                  className="dashboard-refresh"
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  <RefreshCw
                    size={15}
                    className={loading ? "dashboard-spin" : ""}
                  />
                  REFRESH
                </button>

                <Link to="/incidents" className="dashboard-primary-action">
                  <Eye size={15} />
                  VIEW INCIDENTS
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>

            <div className="dashboard-hero-bottom">
              <div>
                <span className="hero-bottom-label">SECURITY STATUS</span>
                <strong>
                  <i />
                  MONITORING ACTIVE
                </strong>
              </div>

              <div>
                <span className="hero-bottom-label">TOTAL EVENT RECORDS</span>
                <strong>{number(totalEvents)}</strong>
              </div>

              <div>
                <span className="hero-bottom-label">INCIDENTS DETECTED</span>
                <strong>{number(totalIncidents)}</strong>
              </div>

              <div>
                <span className="hero-bottom-label">INVESTIGATIONS</span>
                <strong>{number(investigatingCount)}</strong>
              </div>
            </div>
          </section>

          {error && (
            <div className="dashboard-error">
              <ShieldAlert size={17} />
              <span>{error}</span>
            </div>
          )}

          {/* KPI cards */}
          <section className="dashboard-section">
            <div className="dashboard-section-heading">
              <div>
                <p className="dashboard-section-kicker">SYSTEM TELEMETRY</p>
                <h2>Security at a glance</h2>
              </div>
              <span className="dashboard-section-note">
                Current backend metrics
              </span>
            </div>

            <div className="dashboard-metric-grid">
              <article className="dashboard-metric-card metric-cyan">
                <div className="dashboard-metric-top">
                  <span>SECURITY EVENTS</span>
                  <div><Waves size={18} /></div>
                </div>
                <strong>{number(totalEvents)}</strong>
                <small>Ingested event records</small>
                <div className="dashboard-metric-footer">
                  <span>EVENT TELEMETRY</span>
                  <Activity size={14} />
                </div>
              </article>

              <article className="dashboard-metric-card metric-purple">
                <div className="dashboard-metric-top">
                  <span>TOTAL INCIDENTS</span>
                  <div><ShieldAlert size={18} /></div>
                </div>
                <strong>{number(totalIncidents)}</strong>
                <small>Detection records created</small>
                <div className="dashboard-metric-footer">
                  <span>THREAT DETECTIONS</span>
                  <Target size={14} />
                </div>
              </article>

              <article className="dashboard-metric-card metric-amber">
                <div className="dashboard-metric-top">
                  <span>OPEN INCIDENTS</span>
                  <div><AlertTriangle size={18} /></div>
                </div>
                <strong>{number(openCount)}</strong>
                <small>Awaiting investigation or response</small>
                <div className="dashboard-metric-footer">
                  <span>RESPONSE QUEUE</span>
                  <Clock3 size={14} />
                </div>
              </article>

              <article className="dashboard-metric-card metric-red">
                <div className="dashboard-metric-top">
                  <span>HIGH SEVERITY</span>
                  <div><Shield size={18} /></div>
                </div>
                <strong>{number(summary?.high_severity ?? 0)}</strong>
                <small>
                  {number(criticalCount)} critical · {number(highCount)} high
                </small>
                <div className="dashboard-metric-footer">
                  <span>PRIORITY FINDINGS</span>
                  <ArrowUpRight size={14} />
                </div>
              </article>
            </div>
          </section>

          {/* Activity and severity charts */}
          <section className="dashboard-chart-grid">
            <article className="dashboard-panel dashboard-activity-panel">
              <header className="dashboard-panel-header">
                <div>
                  <p className="dashboard-section-kicker">EVENT TELEMETRY</p>
                  <h2>Security Activity</h2>
                  <span>Activity trend from currently loaded event records</span>
                </div>
                <div className="dashboard-panel-icon cyan">
                  <Activity size={18} />
                </div>
              </header>

              <div className="dashboard-activity-chart">
                {eventTimeline.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={eventTimeline}
                      margin={{ top: 12, right: 12, left: -18, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="dashboardEventGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#35d9c0" stopOpacity={0.32} />
                          <stop offset="95%" stopColor="#35d9c0" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        stroke="rgba(148,163,184,0.10)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#7d929e", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "#7d929e", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<DashboardTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="Events"
                        stroke="#35d9c0"
                        strokeWidth={2.5}
                        fill="url(#dashboardEventGradient)"
                        activeDot={{ r: 5, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="dashboard-chart-empty">
                    <Activity size={24} />
                    <span>No event timestamps available.</span>
                  </div>
                )}
              </div>

              <div className="dashboard-chart-foot">
                <span><i className="dashboard-legend-dot cyan" /> Recorded events</span>
                <span>{number(events.length)} loaded records</span>
              </div>
            </article>

            <article className="dashboard-panel dashboard-severity-panel">
              <header className="dashboard-panel-header">
                <div>
                  <p className="dashboard-section-kicker">RISK DISTRIBUTION</p>
                  <h2>Incident Severity</h2>
                  <span>Detected incidents by severity</span>
                </div>
                <div className="dashboard-panel-icon red">
                  <ShieldAlert size={18} />
                </div>
              </header>

              <div className="dashboard-severity-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="66%"
                      outerRadius="88%"
                      paddingAngle={4}
                      stroke="none"
                    >
                      {severityData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<DashboardTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="dashboard-severity-center">
                  <strong>{number(totalIncidents)}</strong>
                  <span>INCIDENTS</span>
                </div>
              </div>

              <div className="dashboard-severity-legend">
                {severityData.map((item) => (
                  <div key={item.name}>
                    <span>
                      <i style={{ background: item.color }} />
                      {item.name}
                    </span>
                    <strong>{number(item.value)}</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>

          {/* Incident queue and risk posture */}
          <section className="dashboard-bottom-grid">
            <article className="dashboard-panel dashboard-incidents-panel">
              <header className="dashboard-panel-header">
                <div>
                  <p className="dashboard-section-kicker">PRIORITY QUEUE</p>
                  <h2>Recent Incidents</h2>
                  <span>Latest detected security findings</span>
                </div>

                <Link to="/incidents" className="dashboard-view-all">
                  VIEW ALL <ArrowUpRight size={14} />
                </Link>
              </header>

              {recentIncidents.length === 0 ? (
                <div className="dashboard-empty">
                  <ShieldCheck size={28} />
                  <strong>No security incidents</strong>
                  <span>
                    CyberGuard has not detected any incidents yet.
                  </span>
                </div>
              ) : (
                <div className="dashboard-incident-list">
                  {recentIncidents.map((incident) => {
                    const severity = severityOf(incident.severity);
                    const score = incident.riskScore ?? incident.risk_score ?? 0;

                    return (
                      <Link
                        to={`/incidents/${incident.id}`}
                        className="dashboard-incident-row"
                        key={incident.id}
                      >
                        <i className={`incident-severity-line ${severity}`} />

                        <div className="dashboard-incident-main">
                          <strong>{incident.title || "Security incident"}</strong>
                          <span>
                            {incident.incident_number || `INC-${incident.id}`}
                            {" · "}
                            {incident.description || "Security incident detected"}
                          </span>
                          <small>
                            <Clock3 size={11} />
                            {formatTimestamp(incident.created_at)}
                          </small>
                        </div>

                        <div className="dashboard-incident-risk">
                          <strong>{number(score)}</strong>
                          <span>RISK</span>
                        </div>

                        <div className="dashboard-incident-tags">
                          <em className={severity}>{severity}</em>
                          <small>{String(incident.status || "open").replaceAll("_", " ")}</small>
                        </div>

                        <ArrowUpRight className="dashboard-incident-arrow" size={15} />
                      </Link>
                    );
                  })}
                </div>
              )}
            </article>

            <article className="dashboard-panel dashboard-risk-panel">
              <header className="dashboard-panel-header">
                <div>
                  <p className="dashboard-section-kicker">RISK INTELLIGENCE</p>
                  <h2>Risk Posture</h2>
                  <span>Risk score summary across incidents</span>
                </div>
                <div className="dashboard-panel-icon amber">
                  <Radar size={18} />
                </div>
              </header>

              <div className="dashboard-risk-score">
                <div>
                  <span>AVERAGE RISK SCORE</span>
                  <strong>{averageRisk.toFixed(1)}</strong>
                </div>
                <div className="dashboard-risk-score-label">
                  <span>OUT OF 100</span>
                  <i style={{ width: `${Math.max(0, Math.min(100, averageRisk))}%` }} />
                </div>
              </div>

              <div className="dashboard-risk-stats">
                <div>
                  <span>MAXIMUM RISK</span>
                  <strong>{number(maximumRisk)}</strong>
                </div>
                <div>
                  <span>MINIMUM RISK</span>
                  <strong>{number(minimumRisk)}</strong>
                </div>
              </div>

              <div className="dashboard-workflow">
                <div className="dashboard-workflow-heading">
                  <span>INCIDENT WORKFLOW</span>
                  <Link to="/incidents">MANAGE <ArrowUpRight size={12} /></Link>
                </div>

                {[
                  { label: "Open", value: statusCounts.open, color: "#ff9f55" },
                  { label: "Investigating", value: statusCounts.investigating, color: "#5aa8ff" },
                  { label: "Resolved", value: statusCounts.resolved, color: "#35d6a0" },
                  { label: "Closed", value: statusCounts.closed, color: "#8798a6" },
                ].map((item) => (
                  <div className="dashboard-workflow-row" key={item.label}>
                    <span><i style={{ background: item.color }} />{item.label}</span>
                    <strong>{number(item.value)}</strong>
                    <div>
                      <i
                        style={{
                          width: `${totalIncidents ? (item.value / totalIncidents) * 100 : 0}%`,
                          background: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="dashboard-investigating">
                <div>
                  <Target size={16} />
                  <span>Currently investigating</span>
                </div>
                <strong>{number(investigatingCount)}</strong>
              </div>
            </article>
          </section>

          {/* Quick access */}
          <section className="dashboard-quick-links">
            <Link to="/attack-intelligence">
              <div className="quick-link-icon purple"><Radar size={19} /></div>
              <div>
                <strong>Attack Intelligence</strong>
                <span>Correlate events and investigate campaigns</span>
              </div>
              <ArrowUpRight size={16} />
            </Link>

            <Link to="/analytics">
              <div className="quick-link-icon cyan"><Activity size={19} /></div>
              <div>
                <strong>Security Analytics</strong>
                <span>Explore security trends and risk distribution</span>
              </div>
              <ArrowUpRight size={16} />
            </Link>

            <Link to="/events">
              <div className="quick-link-icon amber"><Database size={19} /></div>
              <div>
                <strong>Security Events</strong>
                <span>Inspect ingested event records</span>
              </div>
              <ArrowUpRight size={16} />
            </Link>
          </section>

          <footer className="dashboard-disclaimer">
            <ShieldCheck size={14} />
            Metrics reflect the records returned by the CyberGuard backend.
            Event activity is based on the currently loaded event page.
          </footer>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
