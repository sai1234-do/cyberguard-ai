import { useMemo, useState } from "react";
import { FileUp, Search, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

import AppSidebar from "../components/layout/AppSidebar";
import AppTopbar from "../components/layout/AppTopbar";
import { useSecurity } from "../context/SecurityContext";
import "./Incidents.css";

const severityFilters = ["all", "critical", "high", "medium", "low"];

function Incidents() {
  const { incidents, fileName } = useSecurity();

  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");

  const filteredIncidents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return incidents.filter((incident) => {
      const matchesSeverity =
        severity === "all" || incident.severity === severity;

      const matchesSearch =
        !query ||
        Object.values(incident).some((value) =>
          String(value).toLowerCase().includes(query),
        );

      return matchesSeverity && matchesSearch;
    });
  }, [incidents, search, severity]);

  return (
    <div className="app-shell">
      <AppSidebar />

      <div className="app-workspace">
        <AppTopbar />

        <main className="incidents-page">
          <section className="incidents-heading">
            <div>
              <p className="eyebrow">INCIDENT MANAGEMENT</p>
              <h1>Detected Incidents</h1>
              <span>
                {fileName
                  ? `Detected from uploaded dataset: ${fileName}`
                  : "Upload a security-events CSV before investigating incidents."}
              </span>
            </div>

            <Link to="/upload" className="incidents-upload-link">
              <FileUp size={15} />
              UPLOAD DATA
            </Link>
          </section>

          {incidents.length === 0 ? (
            <section className="incidents-empty">
              <ShieldAlert size={36} />
              <h2>No incidents detected</h2>
              <p>
                Upload data containing suspicious activity such as failed
                logins, unusual IP access, malware-like alerts, or privilege
                escalation.
              </p>

              <Link to="/upload">UPLOAD SECURITY DATA</Link>
            </section>
          ) : (
            <>
              <section className="incidents-toolbar">
                <div className="incidents-search">
                  <Search size={16} />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search incident, user, IP, asset..."
                  />
                </div>

                <div className="severity-filters">
                  {severityFilters.map((filter) => (
                    <button
                      key={filter}
                      className={severity === filter ? "active" : ""}
                      onClick={() => setSeverity(filter)}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </section>

              <section className="incidents-list">
                <div className="incident-list-header">
                  <span>INCIDENT</span>
                  <span>RISK SCORE</span>
                  <span>SEVERITY</span>
                  <span>STATUS</span>
                  <span>DETECTED</span>
                </div>

                {filteredIncidents.map((incident) => (
                  <Link
                    to={`/incidents/${incident.id}`}
                    className="incident-list-row"
                    key={incident.id}
                  >
                    <i className={incident.severity} />

                    <div className="incident-list-title">
                      <strong>{incident.title}</strong>

                      <span>
                        {incident.id} · {incident.asset} · {incident.sourceIp}
                      </span>
                    </div>

                    <b>{incident.riskScore}</b>

                    <em className={incident.severity}>
                      {incident.severity.toUpperCase()}
                    </em>

                    <span className="incident-status">
                      {incident.status.toUpperCase()}
                    </span>

                    <time>{incident.timestamp}</time>
                  </Link>
                ))}

                {filteredIncidents.length === 0 && (
                  <div className="incidents-no-results">
                    No incidents match the selected filter.
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Incidents;