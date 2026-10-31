
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  Eye,
  FileUp,
  Fingerprint,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import AppSidebar from "../components/layout/AppSidebar";
import AppTopbar from "../components/layout/AppTopbar";
import { api } from "../services/api";
import "./SecurityEvents.css";

function formatTimestamp(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
}

function formatLabel(value) {
  if (!value) return "Unknown";

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatNumber(value, digits = 1) {
  const number = Number(value);

  return Number.isFinite(number) ? number.toFixed(digits) : "—";
}

function getSeverityClass(severity) {
  const value = String(severity || "low").toLowerCase();

  if (["critical", "high", "medium", "low"].includes(value)) {
    return value;
  }

  return "low";
}

function getRiskClass(value) {
  const score = Number(value);

  if (!Number.isFinite(score)) return "risk-unknown";
  if (score >= 80) return "risk-critical";
  if (score >= 60) return "risk-high";
  if (score >= 30) return "risk-medium";

  return "risk-low";
}

function DetailField({ label, value, mono = false }) {
  return (
    <div className="event-detail-field">
      <span>{label}</span>
      <strong className={mono ? "detail-mono" : ""}>
        {value === null || value === undefined || value === ""
          ? "—"
          : String(value)}
      </strong>
    </div>
  );
}

function SecurityEvents() {
  const [searchParams] = useSearchParams();

  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(
    searchParams.get("q") || ""
  );

  const [severity, setSeverity] = useState("");
  const [eventType, setEventType] = useState("");
  const [isSuspicious, setIsSuspicious] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const pageSize = 20;

  const loadEvents = useCallback(
    async ({ showRefresh = false } = {}) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const data = await api.getSecurityEvents({
          page,
          pageSize,
          search: debouncedSearch,
          severity,
          eventType,
          isSuspicious,
        });

        const items = Array.isArray(data.items) ? data.items : [];

        setEvents(items);
        setTotal(Number(data.total) || 0);
        setTotalPages(Number(data.total_pages) || 0);
        setLastRefreshed(new Date());
      } catch (err) {
        console.error("Failed to load security events:", err);
        setError(err.message || "Failed to load security events.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, debouncedSearch, severity, eventType, isSuspicious]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (!selectedEvent) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedEvent(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEvent]);

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSeverity("");
    setEventType("");
    setIsSuspicious("");
    setPage(1);
  };

  const pageStats = useMemo(() => {
    const suspicious = events.filter((event) => event.is_suspicious).length;

    const highRisk = events.filter((event) => {
      const score = Number(event.risk_score);
      const level = String(event.severity || "").toLowerCase();

      return (
        level === "critical" ||
        level === "high" ||
        (Number.isFinite(score) && score >= 70)
      );
    }).length;

    const riskScores = events
      .map((event) => event.risk_score)
      .filter((score) => score !== null && score !== undefined && score !== "")
      .map(Number)
      .filter(Number.isFinite);

    const averageRisk = riskScores.length
      ? riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length
      : null;

    return {
      count: events.length,
      suspicious,
      highRisk,
      averageRisk,
    };
  }, [events]);

  const hasFilters = Boolean(
    search || debouncedSearch || severity || eventType || isSuspicious
  );

  return (
    <div className="app-shell">
      <AppSidebar />

      <div className="app-workspace">
        <AppTopbar />

        <main className="events-page">
          <section className="events-heading">
            <div>
              <p className="eyebrow">SECURITY OPERATIONS / TELEMETRY</p>
              <h1>
                Security <span>Events</span>
              </h1>
              <p className="events-subtitle">
                Investigate security signals, inspect event evidence, and
                identify suspicious activity.
              </p>
            </div>

            <div className="events-heading-actions">
              <button
                type="button"
                className="events-refresh-button"
                onClick={() => loadEvents({ showRefresh: true })}
                disabled={loading || refreshing}
              >
                <RefreshCw
                  size={15}
                  className={refreshing ? "refresh-spinning" : ""}
                />
                {refreshing ? "REFRESHING" : "REFRESH"}
              </button>

              <Link to="/upload" className="events-upload-link">
                <FileUp size={15} />
                UPLOAD CSV
              </Link>
            </div>
          </section>

          <section className="events-status-strip">
            <div className="events-status-left">
              <span className="events-status-dot" />
              <span>EVENT STORE</span>
              <span className="events-status-divider">/</span>
              <span className="events-status-muted">
                {loading ? "SYNCING RECORDS" : "QUERY COMPLETE"}
              </span>
            </div>

            <div className="events-last-updated">
              <Clock3 size={13} />
              <span>
                {lastRefreshed
                  ? `UPDATED ${lastRefreshed.toLocaleTimeString()}`
                  : "NOT YET UPDATED"}
              </span>
            </div>
          </section>

          {error && (
            <div className="events-error">
              <ShieldAlert size={17} />
              <span>{error}</span>
              <button
                type="button"
                onClick={() => loadEvents({ showRefresh: true })}
              >
                RETRY
              </button>
            </div>
          )}

          <section className="events-kpi-grid">
            <article className="events-kpi-card">
              <div className="events-kpi-top">
                <span>EVENTS ON PAGE</span>
                <div className="events-kpi-icon neutral">
                  <Database size={17} />
                </div>
              </div>
              <strong>{loading ? "—" : pageStats.count}</strong>
              <span className="events-kpi-foot">
                {total.toLocaleString()} matching records in total
              </span>
            </article>

            <article className="events-kpi-card">
              <div className="events-kpi-top">
                <span>SUSPICIOUS</span>
                <div className="events-kpi-icon danger">
                  <ShieldAlert size={17} />
                </div>
              </div>
              <strong className="kpi-danger">
                {loading ? "—" : pageStats.suspicious}
              </strong>
              <span className="events-kpi-foot">
                Flagged records on this page
              </span>
            </article>

            <article className="events-kpi-card">
              <div className="events-kpi-top">
                <span>HIGH RISK</span>
                <div className="events-kpi-icon warning">
                  <AlertTriangle size={17} />
                </div>
              </div>
              <strong className="kpi-warning">
                {loading ? "—" : pageStats.highRisk}
              </strong>
              <span className="events-kpi-foot">
                High / critical severity or risk score ≥ 70
              </span>
            </article>

            <article className="events-kpi-card">
              <div className="events-kpi-top">
                <span>AVERAGE RISK</span>
                <div className="events-kpi-icon success">
                  <Activity size={17} />
                </div>
              </div>
              <strong>
                {loading || pageStats.averageRisk === null
                  ? "—"
                  : formatNumber(pageStats.averageRisk)}
                {!loading && pageStats.averageRisk !== null && (
                  <small className="events-kpi-unit">/ 100</small>
                )}
              </strong>
              <span className="events-kpi-foot">
                Based on available scores on this page
              </span>
            </article>
          </section>

          <section className="events-toolbar">
            <div className="events-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search IP, username, event type, country..."
                aria-label="Search security events"
              />
              {search && (
                <button
                  type="button"
                  className="search-clear"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <select
              value={severity}
              onChange={(event) => {
                setSeverity(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by severity"
            >
              <option value="">ALL SEVERITIES</option>
              <option value="critical">CRITICAL</option>
              <option value="high">HIGH</option>
              <option value="medium">MEDIUM</option>
              <option value="low">LOW</option>
            </select>

            <select
              value={eventType}
              onChange={(event) => {
                setEventType(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by event type"
            >
              <option value="">ALL EVENT TYPES</option>
              <option value="login_failed">LOGIN FAILED</option>
              <option value="login_success">LOGIN SUCCESS</option>
              <option value="data_transfer">DATA TRANSFER</option>
              <option value="port_scan">PORT SCAN</option>
            </select>

            <select
              value={isSuspicious}
              onChange={(event) => {
                setIsSuspicious(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by suspicious status"
            >
              <option value="">ALL EVENTS</option>
              <option value="true">SUSPICIOUS</option>
              <option value="false">NORMAL</option>
            </select>

            {hasFilters && (
              <button
                type="button"
                className="clear-filters"
                onClick={clearFilters}
              >
                <X size={13} />
                CLEAR
              </button>
            )}
          </section>

          <div className="events-meta">
            <div>
              <span className="events-meta-strong">
                {loading ? "LOADING EVENTS..." : `${total.toLocaleString()} EVENTS`}
              </span>
              {hasFilters && <span className="filter-active-label">FILTERS ACTIVE</span>}
            </div>

            <span>
              PAGE {page}
              {totalPages > 0 ? ` OF ${totalPages}` : ""}
            </span>
          </div>

          {loading ? (
            <section className="events-loading">
              <RefreshCw size={25} className="refresh-spinning" />
              <strong>Loading security telemetry</strong>
              <span>Retrieving matching records from CyberGuard.</span>
            </section>
          ) : events.length === 0 ? (
            <section className="events-empty">
              <div className="events-empty-icon">
                <ShieldAlert size={30} />
              </div>
              <h2>No events found</h2>
              <p>
                {hasFilters
                  ? "No events match your current filters. Try adjusting your search."
                  : "There are no event records to display yet."}
              </p>
              {hasFilters && (
                <button type="button" onClick={clearFilters}>
                  CLEAR FILTERS
                </button>
              )}
            </section>
          ) : (
            <section className="events-table-card">
              <div className="events-table-header">
                <div>
                  <span className="table-live-dot" />
                  <strong>EVENT STREAM</strong>
                  <span className="table-header-muted">PAGE RESULTS</span>
                </div>
                <span className="table-record-count">
                  SHOWING {events.length} OF {total.toLocaleString()}
                </span>
              </div>

              <div className="events-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>TIMESTAMP</th>
                      <th>EVENT TYPE</th>
                      <th>SEVERITY</th>
                      <th>USERNAME</th>
                      <th>SOURCE IP</th>
                      <th>COUNTRY</th>
                      <th>RISK</th>
                      <th>STATUS</th>
                      <th>INSPECT</th>
                    </tr>
                  </thead>

                  <tbody>
                    {events.map((event) => (
                      <tr
                        key={event.id}
                        className={event.is_suspicious ? "suspicious-row" : ""}
                      >
                        <td className="event-time">
                          {formatTimestamp(event.timestamp)}
                        </td>

                        <td>
                          <span className="event-type">
                            {formatLabel(event.event_type)}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`severity-badge ${getSeverityClass(event.severity)}`}
                          >
                            <span className="severity-dot" />
                            {formatLabel(event.severity || "low").toUpperCase()}
                          </span>
                        </td>

                        <td className="event-username">
                          {event.username || "—"}
                        </td>

                        <td className="mono-cell">
                          {event.source_ip || "—"}
                        </td>

                        <td>{event.country || "—"}</td>

                        <td>
                          <span
                            className={`risk-value ${getRiskClass(event.risk_score)}`}
                          >
                            {event.risk_score !== null &&
                            event.risk_score !== undefined
                              ? event.risk_score
                              : "—"}
                          </span>
                        </td>

                        <td>
                          {event.is_suspicious ? (
                            <span className="status-badge suspicious">
                              FLAGGED
                            </span>
                          ) : (
                            <span className="status-badge normal">
                              NORMAL
                            </span>
                          )}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="inspect-event-button"
                            onClick={() => setSelectedEvent(event)}
                            aria-label={`Inspect event ${event.id}`}
                          >
                            <Eye size={14} />
                            VIEW
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="events-pagination">
                <span className="pagination-summary">
                  PAGE {page} OF {totalPages || 1}
                </span>

                <div className="pagination-controls">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                  >
                    <ChevronLeft size={15} />
                    PREVIOUS
                  </button>

                  <button
                    type="button"
                    disabled={page >= totalPages || loading || totalPages === 0}
                    onClick={() =>
                      setPage((current) =>
                        Math.min(totalPages, current + 1)
                      )
                    }
                  >
                    NEXT
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </section>
          )}

          <div className="events-page-footnote">
            <Fingerprint size={14} />
            <span>
              Risk indicators are based on stored event fields. Investigate
              flagged records before treating them as confirmed attacks.
            </span>
          </div>
        </main>
      </div>

      {selectedEvent && (
        <div
          className="event-drawer-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedEvent(null);
            }
          }}
        >
          <aside
            className="event-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-drawer-title"
          >
            <div className="event-drawer-header">
              <div>
                <span className="drawer-eyebrow">EVENT INVESTIGATION</span>
                <h2 id="event-drawer-title">Event details</h2>
                <span className="drawer-event-id">
                  RECORD ID: {selectedEvent.id ?? "UNKNOWN"}
                </span>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={() => setSelectedEvent(null)}
                aria-label="Close event details"
              >
                <X size={19} />
              </button>
            </div>

            <div className="event-drawer-content">
              <div className="drawer-event-status">
                <span
                  className={`severity-badge ${getSeverityClass(selectedEvent.severity)}`}
                >
                  <span className="severity-dot" />
                  {formatLabel(selectedEvent.severity || "low").toUpperCase()}
                </span>

                <span
                  className={`status-badge ${
                    selectedEvent.is_suspicious ? "suspicious" : "normal"
                  }`}
                >
                  {selectedEvent.is_suspicious ? "FLAGGED" : "NORMAL"}
                </span>
              </div>

              <div className="drawer-event-title">
                <span>EVENT TYPE</span>
                <h3>{formatLabel(selectedEvent.event_type)}</h3>
                <p>{selectedEvent.description || "No description was provided for this event."}</p>
              </div>

              <div className="drawer-risk-panel">
                <div>
                  <span>RISK SCORE</span>
                  <strong className={getRiskClass(selectedEvent.risk_score)}>
                    {selectedEvent.risk_score ?? "—"}
                    {selectedEvent.risk_score !== null &&
                      selectedEvent.risk_score !== undefined && (
                        <small> / 100</small>
                      )}
                  </strong>
                </div>

                <div className="drawer-risk-divider" />

                <div>
                  <span>ANOMALY SCORE</span>
                  <strong>
                    {selectedEvent.anomaly_score === null ||
                    selectedEvent.anomaly_score === undefined
                      ? "—"
                      : formatNumber(selectedEvent.anomaly_score, 3)}
                  </strong>
                </div>
              </div>

              <section className="drawer-section">
                <h4>
                  <Activity size={15} />
                  EVENT CONTEXT
                </h4>
                <div className="event-detail-grid">
                  <DetailField
                    label="Timestamp"
                    value={formatTimestamp(selectedEvent.timestamp)}
                  />
                  <DetailField
                    label="Event type"
                    value={formatLabel(selectedEvent.event_type)}
                  />
                  <DetailField label="Username" value={selectedEvent.username} />
                  <DetailField label="Country" value={selectedEvent.country} />
                  <DetailField label="Device" value={selectedEvent.device} />
                  <DetailField
                    label="Failed attempts"
                    value={selectedEvent.failed_attempts}
                  />
                  <DetailField
                    label="Bytes transferred"
                    value={
                      selectedEvent.bytes_transferred === null ||
                      selectedEvent.bytes_transferred === undefined
                        ? "—"
                        : Number(selectedEvent.bytes_transferred).toLocaleString()
                    }
                  />
                  <DetailField label="Record ID" value={selectedEvent.id} mono />
                </div>
              </section>

              <section className="drawer-section">
                <h4>
                  <Database size={15} />
                  NETWORK EVIDENCE
                </h4>
                <div className="event-detail-grid">
                  <DetailField
                    label="Source IP"
                    value={selectedEvent.source_ip}
                    mono
                  />
                  <DetailField
                    label="Destination IP"
                    value={selectedEvent.destination_ip}
                    mono
                  />
                </div>
              </section>

              <div className="drawer-investigation-note">
                <ShieldAlert size={16} />
                <p>
                  This panel displays stored event evidence. A suspicious flag
                  or elevated score is a signal for investigation, not proof
                  that an attack succeeded.
                </p>
              </div>
            </div>

            <div className="event-drawer-footer">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
              >
                CLOSE INVESTIGATION
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default SecurityEvents;
