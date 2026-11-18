import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  Clock3,
  Crosshair,
  Database,
  Fingerprint,
  GitBranch,
  Globe,
  LoaderCircle,
  Network,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Workflow,
  Zap,
} from "lucide-react";

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import AppSidebar from "../components/layout/AppSidebar";
import AppTopbar from "../components/layout/AppTopbar";
import { api } from "../services/api";

import "./AttackIntelligence.css";


function formatDate(value) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}


function riskTone(value) {
  if (value >= 85) return "critical";
  if (value >= 65) return "high";
  if (value >= 40) return "medium";
  return "low";
}


function formatDuration(value) {
  if (value < 1) return "Less than 1 min";
  if (value < 60) return `${Math.round(value)} min`;

  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);

  return `${hours}h ${minutes}m`;
}


// Custom React Flow node used for IPs, users, devices,
// security events, and generated incidents.
function IntelligenceNode({ data }) {
  const isEntity = data.kind === "SOURCE IP"
    || data.kind === "USER ACCOUNT"
    || data.kind === "DEVICE";

  const isIncident = data.kind === "DETECTED INCIDENT";

  const Icon = isEntity
    ? data.kind === "SOURCE IP"
      ? Globe
      : data.kind === "USER ACCOUNT"
        ? UserRound
        : Database
    : isIncident
      ? ShieldAlert
      : Activity;

  const tone = riskTone(data.risk_score || 0);

  return (
    <div
      className={[
        "intel-node",
        isEntity ? "intel-node-entity" : "",
        isIncident ? "intel-node-incident" : "",
        !isEntity && !isIncident ? "intel-node-event" : "",
        data.severity ? `node-${data.severity.toLowerCase()}` : "",
      ].join(" ")}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="intel-handle"
      />

      <div className="intel-node-icon">
        <Icon size={16} />
      </div>

      <div className="intel-node-copy">
        <small>{data.kind}</small>
        <strong>{data.label}</strong>
        <span>{data.detail}</span>
      </div>

      {data.risk_score != null && (
        <div className={`intel-node-score ${tone}`}>
          {Math.round(data.risk_score)}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="intel-handle"
      />
    </div>
  );
}


const nodeTypes = {
  entity: IntelligenceNode,
  event: IntelligenceNode,
  incident: IntelligenceNode,
};


function StatCard({ label, value, icon: Icon, tone, note }) {
  return (
    <article className={`intel-stat ${tone || ""}`}>
      <div className="intel-stat-top">
        <span>{label}</span>
        <Icon size={17} />
      </div>

      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}


function AttackIntelligence() {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [campaign, setCampaign] = useState(null);

  const [windowMinutes, setWindowMinutes] = useState(30);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [error, setError] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [analysis, setAnalysis] = useState(null);

  const [selectedNode, setSelectedNode] = useState(null);

  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result = await api.getAttackCampaigns(
        windowMinutes
      );

      const nextCampaigns = result.campaigns || [];

      setCampaigns(nextCampaigns);

      setSelectedId((current) => {
        if (
          current &&
          nextCampaigns.some((item) => item.id === current)
        ) {
          return current;
        }

        return nextCampaigns[0]?.id || "";
      });
    } catch (err) {
      setError(
        err.message || "Unable to load attack campaigns."
      );
    } finally {
      setLoading(false);
    }
  }, [windowMinutes]);


  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);


  useEffect(() => {
    if (!selectedId) {
      setCampaign(null);
      setAnalysis(null);
      setSelectedNode(null);
      return;
    }

    let active = true;

    async function loadDetails() {
      try {
        setDetailLoading(true);
        setAnalysis(null);
        setAnalysisError("");
        setSelectedNode(null);

        const result = await api.getAttackCampaign(
          selectedId,
          windowMinutes
        );

        if (active) {
          setCampaign(result);
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || "Unable to load campaign details."
          );
        }
      } finally {
        if (active) {
          setDetailLoading(false);
        }
      }
    }

    loadDetails();

    return () => {
      active = false;
    };
  }, [selectedId, windowMinutes]);


  const stats = useMemo(() => {
    const totalEvents = campaigns.reduce(
      (sum, item) => sum + item.event_count,
      0
    );

    const totalIncidents = campaigns.reduce(
      (sum, item) => sum + item.incident_count,
      0
    );

    const critical = campaigns.filter(
      (item) => item.risk_label === "critical"
    ).length;

    const highest = campaigns.reduce(
      (max, item) => Math.max(max, item.risk_score),
      0
    );

    return {
      campaigns: campaigns.length,
      events: totalEvents,
      incidents: totalIncidents,
      critical,
      highest,
    };
  }, [campaigns]);


  const graphNodes = useMemo(
    () =>
      (campaign?.graph?.nodes || []).map((node) => ({
        ...node,
        selected: node.id === selectedNode?.id,
      })),
    [campaign, selectedNode]
  );


  const graphEdges = useMemo(
    () =>
      (campaign?.graph?.edges || []).map((edge) => ({
        ...edge,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#4c9bb8",
        },
        style: {
          stroke: edge.animated ? "#19d9b2" : "#4c9bb8",
          strokeWidth: edge.animated ? 2 : 1.5,
        },
        labelStyle: {
          fill: "#8ca8b4",
          fontSize: 9,
        },
        labelBgStyle: {
          fill: "#0b1520",
          fillOpacity: 0.95,
        },
      })),
    [campaign]
  );


  const handleNodeClick = useCallback((event, node) => {
    setSelectedNode({
      id: node.id,
      ...node.data,
    });
  }, []);


  const selectTimelineEvent = (event) => {
    setSelectedNode({
      id: `event:${event.event_id}`,
      kind: event.is_suspicious
        ? "SUSPICIOUS EVENT"
        : "SECURITY EVENT",
      label: event.event_type,
      detail: event.description || event.event_type,
      event_id: event.event_id,
      severity: event.severity,
      timestamp: event.timestamp,
      risk_score: event.risk_score,
    });
  };


  const runAIAnalysis = async () => {
    if (!selectedId) return;

    try {
      setAnalyzing(true);
      setAnalysisError("");
      setAnalysis(null);

      const result = await api.analyzeAttackCampaign(
        selectedId,
        windowMinutes
      );

      setAnalysis(result.analysis);
    } catch (err) {
      setAnalysisError(
        err.message || "AI investigation failed."
      );
    } finally {
      setAnalyzing(false);
    }
  };


  const selectedSummary = campaigns.find(
    (item) => item.id === selectedId
  );


  return (
    <div className="app-shell">
      <AppSidebar />

      <div className="app-workspace">
        <AppTopbar />

        <main className="attack-intel-page">

          {/* PAGE HEADING */}
          <section className="intel-heading">
            <div>
              <div className="intel-eyebrow">
                <span className="intel-pulse" />
                CYBERGUARD // THREAT INVESTIGATION
              </div>

              <h1>
                Attack Intelligence
                <span> Center</span>
              </h1>

              <p>
                Correlate suspicious activity, explore evidence
                relationships and investigate potential attack campaigns.
              </p>
            </div>

            <div className="intel-heading-actions">
              <label className="intel-window-select">
                <Clock3 size={15} />

                <select
                  value={windowMinutes}
                  onChange={(event) =>
                    setWindowMinutes(Number(event.target.value))
                  }
                >
                  <option value={15}>15 min correlation</option>
                  <option value={30}>30 min correlation</option>
                  <option value={60}>1 hour correlation</option>
                  <option value={180}>3 hour correlation</option>
                  <option value={360}>6 hour correlation</option>
                  <option value={1440}>24 hour correlation</option>
                </select>
              </label>

              <button
                className="intel-refresh"
                onClick={loadCampaigns}
                disabled={loading}
              >
                <RefreshCw
                  size={15}
                  className={loading ? "spin" : ""}
                />
                Refresh
              </button>
            </div>
          </section>


          {/* METRICS */}
          <section className="intel-stats-grid">
            <StatCard
              label="CORRELATED CAMPAIGNS"
              value={stats.campaigns}
              icon={GitBranch}
              tone="cyan"
              note="Evidence-linked groups"
            />

            <StatCard
              label="RELATED EVENTS"
              value={stats.events}
              icon={Activity}
              tone="blue"
              note="Events across campaigns"
            />

            <StatCard
              label="LINKED INCIDENTS"
              value={stats.incidents}
              icon={ShieldAlert}
              tone="purple"
              note="Existing detection records"
            />

            <StatCard
              label="CRITICAL CAMPAIGNS"
              value={stats.critical}
              icon={AlertTriangle}
              tone="red"
              note="Heuristic risk score ≥ 85"
            />

            <StatCard
              label="HIGHEST RISK"
              value={`${stats.highest}/100`}
              icon={Crosshair}
              tone="amber"
              note="Campaign triage score"
            />
          </section>


          {error && (
            <div className="intel-error">
              <AlertTriangle size={17} />
              <span>{error}</span>
              <button onClick={loadCampaigns}>Retry</button>
            </div>
          )}


          {/* MAIN INVESTIGATION WORKSPACE */}
          <section className="intel-workspace">

            {/* CAMPAIGN LIST */}
            <aside className="intel-campaign-panel">
              <header>
                <div>
                  <span className="intel-eyebrow">INVESTIGATION QUEUE</span>
                  <h2>Campaigns</h2>
                </div>

                <span className="intel-count">
                  {campaigns.length}
                </span>
              </header>

              {loading ? (
                <div className="intel-list-loading">
                  <LoaderCircle className="spin" size={22} />
                  <span>Correlating security events...</span>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="intel-empty-small">
                  <Network size={28} />
                  <strong>No campaigns found</strong>
                  <span>
                    Upload events containing related suspicious
                    activity to generate an investigation.
                  </span>
                  <Link to="/upload">Upload security data</Link>
                </div>
              ) : (
                <div className="intel-campaign-list">
                  {campaigns.map((item) => (
                    <button
                      key={item.id}
                      className={[
                        "intel-campaign-item",
                        selectedId === item.id ? "active" : "",
                      ].join(" ")}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <div className="intel-campaign-item-top">
                        <span className={`intel-risk-dot ${item.risk_label}`} />
                        <span>{item.risk_label.toUpperCase()}</span>
                        <strong>{item.risk_score}</strong>
                      </div>

                      <b>{item.title}</b>

                      <div className="intel-campaign-meta">
                        <span>
                          <Activity size={12} />
                          {item.event_count} events
                        </span>

                        <span>
                          <ShieldAlert size={12} />
                          {item.incident_count} incidents
                        </span>
                      </div>

                      <small>{formatDate(item.start_time)}</small>
                    </button>
                  ))}
                </div>
              )}
            </aside>


            {/* SELECTED CAMPAIGN */}
            <div className="intel-investigation">

              {!loading && campaigns.length === 0 ? (
                <div className="intel-empty-main">
                  <div className="intel-empty-icon">
                    <Workflow size={38} />
                  </div>

                  <h2>Investigation workspace ready</h2>

                  <p>
                    Campaigns will appear here when the correlation
                    engine finds related security activity.
                  </p>

                  <Link to="/upload">Upload security events</Link>
                </div>
              ) : (
                <>
                  {/* CAMPAIGN HEADER */}
                  <div className="intel-campaign-heading">
                    <div>
                      <span className="intel-eyebrow">
                        SELECTED INVESTIGATION
                      </span>

                      <h2>
                        {selectedSummary?.title || "Loading campaign..."}
                      </h2>

                      <p>
                        {selectedSummary?.id || "Resolving campaign evidence"}
                      </p>
                    </div>

                    {selectedSummary && (
                      <div
                        className={`intel-risk-badge ${riskTone(selectedSummary.risk_score)}`}
                      >
                        <span>CAMPAIGN RISK</span>
                        <strong>{selectedSummary.risk_score}</strong>
                        <small>
                          {selectedSummary.risk_label.toUpperCase()}
                        </small>
                      </div>
                    )}
                  </div>


                  {detailLoading ? (
                    <div className="intel-detail-loading">
                      <LoaderCircle className="spin" size={28} />
                      <span>Building evidence graph...</span>
                    </div>
                  ) : campaign ? (
                    <>
                      {/* CAMPAIGN FACTS */}
                      <div className="intel-facts">
                        <div>
                          <span>FIRST OBSERVED</span>
                          <strong>{formatDate(campaign.start_time)}</strong>
                        </div>

                        <div>
                          <span>LAST OBSERVED</span>
                          <strong>{formatDate(campaign.end_time)}</strong>
                        </div>

                        <div>
                          <span>DURATION</span>
                          <strong>
                            {formatDuration(campaign.duration_minutes)}
                          </strong>
                        </div>

                        <div>
                          <span>SUSPICIOUS EVENTS</span>
                          <strong>
                            {campaign.suspicious_event_count}
                            <small> / {campaign.event_count}</small>
                          </strong>
                        </div>
                      </div>


                      {/* ATTACK GRAPH */}
                      <section className="intel-graph-panel">
                        <header className="intel-section-heading">
                          <div>
                            <span className="intel-eyebrow">
                              RELATIONSHIP MAPPING
                            </span>
                            <h3>
                              <Network size={17} />
                              Attack Graph
                            </h3>
                            <p>
                              Explore observed relationships between
                              entities, events and incidents.
                            </p>
                          </div>

                          <div className="intel-graph-legend">
                            <span><i className="legend-entity" /> Entity</span>
                            <span><i className="legend-event" /> Event</span>
                            <span><i className="legend-incident" /> Incident</span>
                          </div>
                        </header>

                        <div className="intel-graph-canvas">
                          {campaign.graph.nodes.length === 0 ? (
                            <div className="intel-empty-small">
                              No graph nodes available.
                            </div>
                          ) : (
                            <ReactFlow
                              nodes={graphNodes}
                              edges={graphEdges}
                              nodeTypes={nodeTypes}
                              onNodeClick={handleNodeClick}
                              fitView
                              fitViewOptions={{ padding: 0.2 }}
                              minZoom={0.25}
                              maxZoom={1.7}
                              nodesConnectable={false}
                              elementsSelectable
                              proOptions={{ hideAttribution: false }}
                            >
                              <Background
                                variant={BackgroundVariant.Dots}
                                gap={22}
                                size={1}
                                color="#243847"
                              />

                              <Controls
                                showInteractive={false}
                              />

                              <MiniMap
                                pannable
                                zoomable
                                nodeColor={(node) => {
                                  if (node.type === "incident") return "#e75c70";
                                  if (node.type === "event") return "#28b9a0";
                                  return "#4b9de2";
                                }}
                                maskColor="rgba(4, 10, 17, 0.72)"
                              />

                              <Panel position="top-right">
                                <div className="intel-graph-hint">
                                  DRAG · PAN · ZOOM
                                </div>
                              </Panel>
                            </ReactFlow>
                          )}
                        </div>

                        <div className="intel-graph-footnote">
                          <span>
                            <Zap size={13} />
                            {campaign.graph.nodes.length} nodes
                            {" · "}
                            {campaign.graph.edges.length} relationships
                          </span>

                          <span>
                            Relationships indicate shared identifiers,
                            not proof of a coordinated attack.
                          </span>
                        </div>
                      </section>


                      {/* NODE INSPECTOR */}
                      {selectedNode && (
                        <section className="intel-node-inspector">
                          <div>
                            <span className="intel-eyebrow">
                              SELECTED GRAPH NODE
                            </span>
                            <h3>{selectedNode.label}</h3>
                            <p>{selectedNode.kind}</p>
                          </div>

                          <div className="intel-node-inspector-detail">
                            {selectedNode.detail}
                          </div>

                          {selectedNode.timestamp && (
                            <span>
                              {formatDate(selectedNode.timestamp)}
                            </span>
                          )}

                          {selectedNode.incident_id && (
                            <Link to={`/incidents/${selectedNode.incident_id}`}>
                              Open incident
                              <ArrowUpRight size={14} />
                            </Link>
                          )}

                          {selectedNode.event_id && (
                            <Link to={`/events?search=${selectedNode.event_id}`}>
                              Event #{selectedNode.event_id}
                              <ArrowUpRight size={14} />
                            </Link>
                          )}
                        </section>
                      )}


                      {/* CORRELATION EVIDENCE */}
                      <section className="intel-evidence-panel">
                        <header className="intel-section-heading">
                          <div>
                            <span className="intel-eyebrow">
                              WHY THESE EVENTS ARE CONNECTED
                            </span>
                            <h3>
                              <Fingerprint size={17} />
                              Correlation Evidence
                            </h3>
                          </div>
                        </header>

                        <div className="intel-evidence-grid">
                          {campaign.correlation_basis.map((reason) => (
                            <div key={reason}>
                              <ShieldCheck size={16} />
                              {reason}
                            </div>
                          ))}

                          {campaign.source_ips.length > 0 && (
                            <div>
                              <Globe size={16} />
                              Source IPs: {campaign.source_ips.join(", ")}
                            </div>
                          )}

                          {campaign.usernames.length > 0 && (
                            <div>
                              <UserRound size={16} />
                              Users: {campaign.usernames.join(", ")}
                            </div>
                          )}

                          {campaign.devices.length > 0 && (
                            <div>
                              <Database size={16} />
                              Devices: {campaign.devices.join(", ")}
                            </div>
                          )}
                        </div>
                      </section>


                      {/* TIMELINE */}
                      <section className="intel-timeline-panel">
                        <header className="intel-section-heading">
                          <div>
                            <span className="intel-eyebrow">
                              CHRONOLOGICAL EVIDENCE
                            </span>
                            <h3>
                              <Clock3 size={17} />
                              Investigation Timeline
                            </h3>
                            <p>
                              Select an event to locate it in the graph.
                            </p>
                          </div>

                          <span className="intel-count">
                            {campaign.timeline.length}
                          </span>
                        </header>

                        <div className="intel-timeline">
                          {campaign.timeline.map((item) => (
                            <button
                              key={item.event_id}
                              className={[
                                "intel-timeline-item",
                                selectedNode?.id === `event:${item.event_id}`
                                  ? "active"
                                  : "",
                              ].join(" ")}
                              onClick={() => selectTimelineEvent(item)}
                            >
                              <span
                                className={[
                                  "intel-timeline-marker",
                                  item.is_suspicious ? "suspicious" : "",
                                ].join(" ")}
                              />

                              <time>{formatDate(item.timestamp)}</time>

                              <div>
                                <strong>
                                  {item.event_type.replaceAll("_", " ")}
                                </strong>

                                <span>
                                  {item.description || "Security event recorded"}
                                </span>

                                <small>
                                  Event #{item.event_id}
                                  {item.source_ip
                                    ? ` · ${item.source_ip}`
                                    : ""}
                                  {item.username
                                    ? ` · ${item.username}`
                                    : ""}
                                </small>
                              </div>

                              <em
                                className={`intel-severity ${item.severity?.toLowerCase()}`}
                              >
                                {item.severity}
                              </em>

                              {item.incident_ids.length > 0 && (
                                <span className="intel-linked-count">
                                  {item.incident_ids.length} incident(s)
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </section>


                      {/* AI INVESTIGATION */}
                      <section className="intel-ai-panel">
                        <header>
                          <div className="intel-ai-icon">
                            <BrainCircuit size={22} />
                          </div>

                          <div>
                            <span className="intel-eyebrow">
                              GROQ // AI INVESTIGATION
                            </span>
                            <h3>Campaign Intelligence</h3>
                            <p>
                              Evidence-grounded investigation and defensive
                              recommendations.
                            </p>
                          </div>

                          <button
                            onClick={runAIAnalysis}
                            disabled={analyzing}
                          >
                            {analyzing ? (
                              <LoaderCircle size={15} className="spin" />
                            ) : (
                              <Sparkles size={15} />
                            )}

                            {analyzing
                              ? "Investigating..."
                              : "Analyze campaign"}
                          </button>
                        </header>

                        {analysisError && (
                          <div className="intel-error">
                            <AlertTriangle size={16} />
                            {analysisError}
                          </div>
                        )}

                        {!analysis && !analyzing && (
                          <div className="intel-ai-empty">
                            <Sparkles size={19} />
                            <span>
                              Run an AI investigation to receive a
                              campaign explanation, observations and
                              prioritized defensive recommendations.
                            </span>
                          </div>
                        )}

                        {analyzing && (
                          <div className="intel-ai-loading">
                            <LoaderCircle size={22} className="spin" />
                            <span>
                              Analyzing {campaign.event_count} events
                              and {campaign.incident_count} linked incidents...
                            </span>
                          </div>
                        )}

                        {analysis && (
                          <div className="intel-ai-results">
                            <div className="intel-ai-summary">
                              <span>INVESTIGATION SUMMARY</span>
                              <p>{analysis.summary}</p>
                            </div>

                            <div className="intel-ai-observations">
                              <h4>Key observations</h4>

                              {analysis.key_observations.map((item, index) => (
                                <div key={index}>
                                  <span>{String(index + 1).padStart(2, "0")}</span>
                                  {item}
                                </div>
                              ))}
                            </div>

                            <div className="intel-ai-narrative">
                              <h4>Possible attack narrative</h4>
                              <p>{analysis.possible_attack_narrative}</p>
                            </div>

                            <div className="intel-ai-recommendations">
                              <h4>Recommended defensive actions</h4>

                              {analysis.recommendations.map((item, index) => (
                                <div key={index}>
                                  <ArrowDownRight size={15} />
                                  {item}
                                </div>
                              ))}
                            </div>

                            <div className="intel-ai-confidence">
                              <ShieldCheck size={15} />
                              <span>{analysis.confidence_note}</span>
                            </div>
                          </div>
                        )}
                      </section>
                    </>
                  ) : null}
                </>
              )}
            </div>
          </section>


          <footer className="intel-footer">
            <span>
              <ShieldCheck size={14} />
              CYBERGUARD AI · ATTACK INTELLIGENCE ENGINE
            </span>

            <span>
              Risk score is a heuristic triage indicator, not a probability
              of compromise.
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}


export default AttackIntelligence;
