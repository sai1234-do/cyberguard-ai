import { BarChart3, FileUp, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

import AppSidebar from "../components/layout/AppSidebar";
import AppTopbar from "../components/layout/AppTopbar";
import { useSecurity } from "../context/SecurityContext";
import "./Analytics.css";

const severities = ["critical", "high", "medium", "low"];

function Analytics() {
  const { events, incidents, fileName } = useSecurity();
  const total = Math.max(incidents.length, 1);
  const distribution = severities.map((severity) => ({
    severity,
    count: incidents.filter((incident) => incident.severity === severity).length,
  }));
  const eventTypes = Object.entries(
    events.reduce((counts, event) => {
      const type = event.event_type || "unknown";
      counts[type] = (counts[type] || 0) + 1;
      return counts;
    }, {}),
  )
    .sort(([, first], [, second]) => second - first)
    .slice(0, 5);

  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-workspace">
        <AppTopbar />
        <main className="analytics-page">
          <section className="analytics-heading">
            <div>
              <p className="eyebrow">THREAT INTELLIGENCE</p>
              <h1>Security Analytics</h1>
              <span>{fileName ? `Analysis for: ${fileName}` : "Upload a dataset to generate threat insights."}</span>
            </div>
            <Link to="/upload" className="analytics-upload"><FileUp size={15} /> UPLOAD DATA</Link>
          </section>

          {events.length === 0 ? (
            <section className="analytics-empty">
              <ShieldAlert size={36} />
              <h2>No analytics available</h2>
              <p>Load a security-events CSV to see incident severity and event-type distribution.</p>
              <Link to="/upload">UPLOAD SECURITY DATA</Link>
            </section>
          ) : (
            <div className="analytics-grid">
              <section className="analytics-card severity-card">
                <header><BarChart3 size={18} /><div><p className="eyebrow">RISK DISTRIBUTION</p><h2>Incidents by Severity</h2></div></header>
                <div className="severity-bars">
                  {distribution.map(({ severity, count }) => (
                    <div className="severity-bar" key={severity}>
                      <div><span>{severity}</span><strong>{count}</strong></div>
                      <i><b className={severity} style={{ width: `${(count / total) * 100}%` }} /></i>
                    </div>
                  ))}
                </div>
              </section>
              <section className="analytics-card event-types-card">
                <header><BarChart3 size={18} /><div><p className="eyebrow">EVENT PATTERNS</p><h2>Most Frequent Events</h2></div></header>
                <div className="event-type-list">
                  {eventTypes.map(([type, count]) => <div key={type}><span>{type.replaceAll("_", " ")}</span><strong>{count}</strong></div>)}
                </div>
              </section>
              <section className="analytics-card exposure-card">
                <p className="eyebrow">EXPOSURE SNAPSHOT</p>
                <div><span>EVENTS INGESTED</span><strong>{events.length}</strong></div>
                <div><span>INCIDENT RATE</span><strong>{Math.round((incidents.length / events.length) * 100)}%</strong></div>
                <div><span>CRITICAL FINDINGS</span><strong>{distribution[0].count}</strong></div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Analytics;
