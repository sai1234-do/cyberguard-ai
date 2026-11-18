
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock3,
  Database,
  FileUp,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Target,
  TrendingUp,
  Waves,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
import "./Analytics.css";

const SEVERITY_COLORS = {
  critical: "#ff526b",
  high: "#ff9f55",
  medium: "#f5ca65",
  low: "#45a6ff",
};

const RANGE_OPTIONS = [
  { label: "All records", value: "all" },
  { label: "24 hours", value: "24h" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
];

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN").format(value || 0);

const normalizeSeverity = (value) =>
  String(value || "low").toLowerCase();

const formatDate = (value) => {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getRangeStart = (range) => {
  if (range === "all") return null;

  const now = Date.now();
  const durations = {
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };

  return now - durations[range];
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="analytics-tooltip">
      {label && <strong>{label}</strong>}

      {payload.map((item, index) => (
        <div key={`${item.dataKey}-${index}`}>
          <i style={{ background: item.color || item.fill }} />
          <span>{item.name || item.dataKey}</span>
          <b>{formatNumber(item.value)}</b>
        </div>
      ))}
    </div>
  );
}

function Analytics() {
  const {
    events,
    incidents,
    summary,
    attackTypes,
    severitySummary,
    riskSummary,
    eventTotal,
    loading,
    error,
    fileName,
    refreshData,
  } = useSecurity();

  const [range, setRange] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState("all");

  const rangeStart = getRangeStart(range);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (!rangeStart) return true;

      const timestamp = new Date(
        event.timestamp || event.created_at,
      ).getTime();

      return Number.isFinite(timestamp) && timestamp >= rangeStart;
    });
  }, [events, rangeStart]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      if (!rangeStart) return true;

      const timestamp = new Date(
        incident.created_at || incident.timestamp,
      ).getTime();

      return Number.isFinite(timestamp) && timestamp >= rangeStart;
    });
  }, [incidents, rangeStart]);

  const severityData = useMemo(() => {
    const counts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    filteredIncidents.forEach((incident) => {
      const severity = normalizeSeverity(incident.severity);

      if (counts[severity] !== undefined) {
        counts[severity] += 1;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: SEVERITY_COLORS[name],
    }));
  }, [filteredIncidents]);

  const attackTypeData = useMemo(() => {
    const counts = {};

    filteredIncidents.forEach((incident) => {
      const type =
        incident.attack_type ||
        incident.title ||
        "Unclassified";

      counts[type] = (counts[type] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filteredIncidents]);

  const eventTimeline = useMemo(() => {
    const counts = {};

    filteredEvents.forEach((event) => {
      const rawDate = event.timestamp || event.created_at;
      const date = new Date(rawDate);

      if (Number.isNaN(date.getTime())) return;

      const key = date.toLocaleDateString([], {
        day: "2-digit",
        month: "short",
      });

      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .reverse();
  }, [filteredEvents]);

  const incidentStatusData = useMemo(() => {
    const counts = {
      open: 0,
      investigating: 0,
      resolved: 0,
      closed: 0,
    };

    filteredIncidents.forEach((incident) => {
      const status = String(incident.status || "open").toLowerCase();

      if (counts[status] !== undefined) {
        counts[status] += 1;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [filteredIncidents]);

  const filteredRecentEvents = useMemo(() => {
    return [...filteredEvents]
      .filter((event) => {
        if (selectedSeverity === "all") return true;

        return (
          normalizeSeverity(event.severity) === selectedSeverity
        );
      })
      .sort(
        (a, b) =>
          new Date(b.timestamp || b.created_at).getTime() -
          new Date(a.timestamp || a.created_at).getTime(),
      )
      .slice(0, 8);
  }, [filteredEvents, selectedSeverity]);

  const criticalCount =
    severityData.find((item) => item.name === "critical")?.value || 0;

  const highCount =
    severityData.find((item) => item.name === "high")?.value || 0;

  const totalFilteredIncidents = filteredIncidents.length;
  const totalFilteredEvents = filteredEvents.length;

  const incidentRatio = totalFilteredEvents
    ? totalFilteredIncidents / totalFilteredEvents
    : 0;

  const averageRisk = riskSummary?.average_risk_score ?? 0;

  const totalAttackTypes = Object.keys(attackTypes || {}).length;

  const handleRefresh = async () => {
    if (refreshing) return;

    try {
      setRefreshing(true);
      await refreshData();
    } catch (err) {
      console.error("Analytics refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="app-shell">
      <AppSidebar />

      <div className="app-workspace">
        <AppTopbar />

        <main className="analytics-page">
          <section className="analytics-hero">
            <div className="analytics-heading">
              <div>
                <div className="analytics-kicker">
                  <span className="analytics-live-dot" />
                  THREAT INTELLIGENCE / ANALYTICS
                </div>

                <h1>Security Analytics</h1>

                <p>
                  Deep visibility into security events, incident severity,
                  attack patterns and organizational exposure.
                </p>

                {fileName && (
                  <div className="analytics-source">
                    <Database size={13} />
                    Dataset: {fileName}
                  </div>
                )}
              </div>

              <div className="analytics-actions">
                <Link to="/upload" className="analytics-upload">
                  <FileUp size={15} />
                  UPLOAD DATA
                </Link>

                <button
                  className="analytics-refresh"
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                >
                  <RefreshCw
                    size={15}
                    className={refreshing ? "analytics-spinning" : ""}
                  />
                  {refreshing ? "REFRESHING" : "REFRESH"}
                </button>
              </div>
            </div>

            <div className="analytics-toolbar">
              <div>
                <span className="toolbar-label">ANALYSIS WINDOW</span>

                <div className="analytics-range">
                  {RANGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      className={range === option.value ? "active" : ""}
                      onClick={() => setRange(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="analytics-updated">
                <span className="analytics-live-dot" />
                BACKEND CONNECTED
              </div>
            </div>
          </section>

          {error && (
            <div className="analytics-error">
              <AlertTriangle size={17} />
              {error}
            </div>
          )}

          {loading && (
            <div className="analytics-loading">
              <Activity size={20} />
              Refreshing security intelligence...
            </div>
          )}

          {events.length === 0 && incidents.length === 0 ? (
            <section className="analytics-empty">
              <ShieldAlert size={42} />

              <p className="analytics-kicker">NO SECURITY DATA</p>

              <h2>Your analytics workspace is waiting</h2>

              <p>
                Upload a security-event CSV to populate threat
                distribution, attack patterns and investigation insights.
              </p>

              <Link to="/upload" className="analytics-upload">
                <FileUp size={15} />
                UPLOAD SECURITY DATA
              </Link>
            </section>
          ) : (
            <>
              <section className="analytics-metrics">
                <article className="analytics-metric metric-cyan">
                  <div className="metric-top">
                    <span>SECURITY EVENTS</span>
                    <Waves size={18} />
                  </div>

                  <strong>{formatNumber(eventTotal)}</strong>

                  <small>
                    {formatNumber(totalFilteredEvents)} loaded in selected window
                  </small>

                  <div className="metric-foot">
                    <span>INGESTED ACTIVITY</span>
                    <ArrowUpRight size={14} />
                  </div>
                </article>

                <article className="analytics-metric metric-purple">
                  <div className="metric-top">
                    <span>TOTAL INCIDENTS</span>
                    <ShieldAlert size={18} />
                  </div>

                  <strong>
                    {formatNumber(summary?.total_incidents ?? incidents.length)}
                  </strong>

                  <small>
                    {formatNumber(totalFilteredIncidents)} in selected window
                  </small>

                  <div className="metric-foot">
                    <span>DETECTION RECORDS</span>
                    <Activity size={14} />
                  </div>
                </article>

                <article className="analytics-metric metric-red">
                  <div className="metric-top">
                    <span>CRITICAL + HIGH</span>
                    <AlertTriangle size={18} />
                  </div>

                  <strong>{formatNumber(criticalCount + highCount)}</strong>

                  <small>
                    {formatNumber(criticalCount)} critical · {formatNumber(highCount)} high
                  </small>

                  <div className="metric-foot">
                    <span>PRIORITY FINDINGS</span>
                    <ArrowUpRight size={14} />
                  </div>
                </article>

                <article className="analytics-metric metric-green">
                  <div className="metric-top">
                    <span>AVERAGE RISK</span>
                    <Target size={18} />
                  </div>

                  <strong>{Number(averageRisk).toFixed(1)}</strong>

                  <small>Average incident risk score</small>

                  <div className="metric-foot">
                    <span>RISK INTELLIGENCE</span>
                    <TrendingUp size={14} />
                  </div>
                </article>
              </section>

              <section className="analytics-main-grid">
                <article className="analytics-panel analytics-trend-panel">
                  <header className="analytics-panel-header">
                    <div>
                      <p className="analytics-kicker">ACTIVITY MONITOR</p>
                      <h2>Security Event Activity</h2>
                      <span>Event volume across the selected analysis window</span>
                    </div>

                    <div className="panel-icon cyan">
                      <Activity size={18} />
                    </div>
                  </header>

                  <div className="analytics-chart trend-chart">
                    {eventTimeline.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={eventTimeline}
                          margin={{ top: 12, right: 12, left: -18, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="eventGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#26d9c0" stopOpacity={0.32} />
                              <stop offset="95%" stopColor="#26d9c0" stopOpacity={0} />
                            </linearGradient>
                          </defs>

                          <CartesianGrid
                            stroke="rgba(148,163,184,0.10)"
                            vertical={false}
                          />

                          <XAxis
                            dataKey="date"
                            tick={{ fill: "#788b98", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />

                          <YAxis
                            allowDecimals={false}
                            tick={{ fill: "#788b98", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />

                          <Tooltip content={<ChartTooltip />} />

                          <Area
                            type="monotone"
                            dataKey="count"
                            name="Events"
                            stroke="#26d9c0"
                            strokeWidth={2.5}
                            fill="url(#eventGradient)"
                            activeDot={{ r: 5, strokeWidth: 0 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="analytics-no-chart">
                        <Clock3 size={25} />
                        <span>No event timestamps in this window.</span>
                      </div>
                    )}
                  </div>

                  <div className="chart-footnote">
                    <span><i className="legend-dot cyan-dot" /> Recorded events</span>
                    <span>{formatNumber(totalFilteredEvents)} loaded records</span>
                  </div>
                </article>

                <article className="analytics-panel analytics-severity-panel">
                  <header className="analytics-panel-header">
                    <div>
                      <p className="analytics-kicker">RISK DISTRIBUTION</p>
                      <h2>Incident Severity</h2>
                      <span>Distribution of detected incidents</span>
                    </div>

                    <div className="panel-icon red">
                      <ShieldAlert size={18} />
                    </div>
                  </header>

                  <div className="severity-chart-wrap">
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
                          onClick={(entry) =>
                            setSelectedSeverity(
                              selectedSeverity === entry.name ? "all" : entry.name,
                            )
                          }
                          style={{ cursor: "pointer" }}
                        >
                          {severityData.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={entry.color}
                              opacity={
                                selectedSeverity === "all" ||
                                selectedSeverity === entry.name
                                  ? 1
                                  : 0.35
                              }
                            />
                          ))}
                        </Pie>

                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="severity-center">
                      <strong>{formatNumber(totalFilteredIncidents)}</strong>
                      <span>INCIDENTS</span>
                    </div>
                  </div>

                  <div className="severity-legend">
                    {severityData.map((item) => (
                      <button
                        key={item.name}
                        className={
                          selectedSeverity === item.name ? "selected" : ""
                        }
                        onClick={() =>
                          setSelectedSeverity(
                            selectedSeverity === item.name ? "all" : item.name,
                          )
                        }
                      >
                        <i style={{ background: item.color }} />
                        <span>{item.name}</span>
                        <strong>{formatNumber(item.value)}</strong>
                      </button>
                    ))}
                  </div>

                  <p className="chart-footnote">
                    Select a severity to filter the recent activity table.
                  </p>
                </article>
              </section>

              <section className="analytics-secondary-grid">
                <article className="analytics-panel">
                  <header className="analytics-panel-header">
                    <div>
                      <p className="analytics-kicker">THREAT LANDSCAPE</p>
                      <h2>Most Detected Attack Types</h2>
                      <span>Incident distribution by attack classification</span>
                    </div>

                    <div className="panel-icon purple">
                      <BarChart3 size={18} />
                    </div>
                  </header>

                  <div className="analytics-chart attack-chart">
                    {attackTypeData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={attackTypeData}
                          layout="vertical"
                          margin={{ top: 8, right: 18, left: 12, bottom: 4 }}
                        >
                          <CartesianGrid
                            stroke="rgba(148,163,184,0.10)"
                            horizontal={false}
                          />

                          <XAxis
                            type="number"
                            allowDecimals={false}
                            tick={{ fill: "#788b98", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                          />

                          <YAxis
                            type="category"
                            dataKey="name"
                            width={145}
                            tick={{ fill: "#a7b7c2", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                          />

                          <Tooltip content={<ChartTooltip />} />

                          <Bar
                            dataKey="count"
                            name="Incidents"
                            fill="#9877ff"
                            radius={[0, 5, 5, 0]}
                            barSize={17}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="analytics-no-chart">
                        No classified incidents available.
                      </div>
                    )}
                  </div>

                  <div className="chart-footnote">
                    <span><i className="legend-dot purple-dot" /> Incident count</span>
                    <span>{totalAttackTypes} types in backend summary</span>
                  </div>
                </article>

                <article className="analytics-panel">
                  <header className="analytics-panel-header">
                    <div>
                      <p className="analytics-kicker">RESPONSE TRACKING</p>
                      <h2>Incident Lifecycle</h2>
                      <span>Current workflow status of incidents</span>
                    </div>

                    <div className="panel-icon green">
                      <ShieldCheck size={18} />
                    </div>
                  </header>

                  <div className="status-chart">
                    {incidentStatusData.map((item) => {
                      const colors = {
                        open: "#ff9f55",
                        investigating: "#5aa8ff",
                        resolved: "#27d9a5",
                        closed: "#8998a8",
                      };

                      const percentage = totalFilteredIncidents
                        ? (item.value / totalFilteredIncidents) * 100
                        : 0;

                      return (
                        <div className="status-row" key={item.name}>
                          <div className="status-row-label">
                            <span>
                              <i style={{ background: colors[item.name] }} />
                              {item.name}
                            </span>

                            <strong>{formatNumber(item.value)}</strong>
                          </div>

                          <div className="status-track">
                            <i
                              style={{
                                width: `${percentage}%`,
                                background: colors[item.name],
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="status-summary">
                    <div>
                      <span>OPEN + INVESTIGATING</span>
                      <strong>
                        {formatNumber(
                          incidentStatusData
                            .filter((item) =>
                              ["open", "investigating"].includes(item.name),
                            )
                            .reduce((sum, item) => sum + item.value, 0),
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>RESOLVED + CLOSED</span>
                      <strong>
                        {formatNumber(
                          incidentStatusData
                            .filter((item) =>
                              ["resolved", "closed"].includes(item.name),
                            )
                            .reduce((sum, item) => sum + item.value, 0),
                        )}
                      </strong>
                    </div>
                  </div>
                </article>
              </section>

              <section className="analytics-insight-grid">
                <article className="analytics-insight">
                  <div className="insight-icon cyan">
                    <Database size={19} />
                  </div>

                  <div>
                    <p className="analytics-kicker">DATA COVERAGE</p>
                    <h3>{formatNumber(totalFilteredEvents)} events loaded</h3>
                    <span>
                      {formatNumber(eventTotal)} total events reported by the backend.
                      The event chart uses the currently loaded event records.
                    </span>
                  </div>
                </article>

                <article className="analytics-insight">
                  <div className="insight-icon amber">
                    <TrendingUp size={19} />
                  </div>

                  <div>
                    <p className="analytics-kicker">DETECTION DENSITY</p>
                    <h3>
                      {incidentRatio.toFixed(2)} incidents per event
                    </h3>
                    <span>
                      {formatNumber(totalFilteredIncidents)} incidents across{" "}
                      {formatNumber(totalFilteredEvents)} loaded events.
                      Multiple detection rules can create multiple incidents
                      from one event, so this ratio can exceed 1.
                    </span>
                  </div>
                </article>
              </section>

              <section className="analytics-panel analytics-table-panel">
                <header className="analytics-panel-header">
                  <div>
                    <p className="analytics-kicker">LIVE EVIDENCE</p>
                    <h2>Recent Security Activity</h2>
                    <span>Latest loaded security events and their severity</span>
                  </div>

                  <Link to="/events" className="analytics-view-all">
                    VIEW ALL EVENTS
                    <ArrowUpRight size={14} />
                  </Link>
                </header>

                <div className="analytics-table-wrap">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>EVENT</th>
                        <th>TYPE</th>
                        <th>SOURCE IP</th>
                        <th>USER</th>
                        <th>SEVERITY</th>
                        <th>TIMESTAMP</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRecentEvents.length ? (
                        filteredRecentEvents.map((event, index) => {
                          const severity = normalizeSeverity(event.severity);

                          return (
                            <tr key={event.id || `${event.event_type}-${index}`}>
                              <td>
                                <span className="event-id">
                                  #{event.id ?? "—"}
                                </span>
                              </td>

                              <td className="event-name">
                                {String(event.event_type || "Unknown").replaceAll("_", " ")}
                              </td>

                              <td>{event.source_ip || "—"}</td>

                              <td>{event.username || "—"}</td>

                              <td>
                                <span className={`analytics-severity-tag ${severity}`}>
                                  {severity}
                                </span>
                              </td>

                              <td>{formatDate(event.timestamp || event.created_at)}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" className="analytics-table-empty">
                            No events match this severity and time filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="analytics-table-footer">
                  <span>
                    Showing {filteredRecentEvents.length} of{" "}
                    {filteredEvents.length} loaded events
                  </span>

                  <button
                    onClick={() => setSelectedSeverity("all")}
                    disabled={selectedSeverity === "all"}
                  >
                    CLEAR SEVERITY FILTER
                  </button>
                </div>
              </section>

              <footer className="analytics-disclaimer">
                <ShieldCheck size={15} />
                <span>
                  Analytics are calculated from available CyberGuard backend
                  records. Risk scores and classifications are triage indicators,
                  not proof of compromise.
                </span>
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Analytics;
