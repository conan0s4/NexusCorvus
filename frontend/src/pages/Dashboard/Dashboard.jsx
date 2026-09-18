import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import { getCases } from "../../api/caseApi";
import { getEvidenceFiles } from "../../api/evidenceApi";
import { getEvents } from "../../api/eventApi";
import { getDetections } from "../../api/detectionApi";

const extractList = (response) => {
  if (Array.isArray(response)) {
    return response;
  }
  if (Array.isArray(response?.results)) {
    return response.results;
  }
  return [];
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString();
};

const formatFileSize = (bytes) => {
  if (bytes === null || bytes === undefined || bytes === "") {
    return "—";
  }
  const size = Number(bytes);
  if (Number.isNaN(size)) {
    return String(bytes);
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const severityClass = (severity) =>
  String(severity || "").trim().toLowerCase();

function Dashboard() {
  const navigate = useNavigate();

  const [cases, setCases] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [events, setEvents] = useState([]);
  const [detections, setDetections] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          casesResponse,
          evidenceResponse,
          eventsResponse,
          detectionsResponse,
        ] = await Promise.all([
          getCases(),
          getEvidenceFiles(),
          getEvents(),
          getDetections(),
        ]);

        setCases(extractList(casesResponse));
        setEvidence(extractList(evidenceResponse));
        setEvents(extractList(eventsResponse));
        setDetections(extractList(detectionsResponse));
      } catch (err) {
        setError(err.message || "Failed to load workspace data.");
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  const caseNameById = useMemo(() => {
    const map = new Map();
    cases.forEach((item) => map.set(String(item.id), item));
    return map;
  }, [cases]);

  const metrics = useMemo(() => {
    const activeStatuses = ["open", "investigating", "reviewing"];

    const activeCases = cases.filter((item) =>
      activeStatuses.includes(String(item.status || "").toLowerCase())
    );

    const criticalDetections = detections.filter((item) => {
      const severity = severityClass(item.severity);
      return severity === "critical" || severity === "high";
    });

    return {
      totalCases: cases.length,
      activeCases: activeCases.length,
      evidenceCount: evidence.length,
      eventCount: events.length,
      detectionCount: detections.length,
      criticalCount: criticalDetections.length,
    };
  }, [cases, evidence, events, detections]);

  const recentCases = useMemo(() => {
    return [...cases]
      .sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
        const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
        return bTime - aTime;
      })
      .slice(0, 6);
  }, [cases]);

  const recentEvidence = useMemo(() => {
    return [...evidence]
      .sort((a, b) => {
        const aTime = new Date(a.uploaded_at || a.created_at || 0).getTime();
        const bTime = new Date(b.uploaded_at || b.created_at || 0).getTime();
        return bTime - aTime;
      })
      .slice(0, 6);
  }, [evidence]);

  const recentEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => {
        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();
        return bTime - aTime;
      })
      .slice(0, 6);
  }, [events]);

  const openCaseIds = useMemo(() => {
    const activeStatuses = ["open", "investigating", "reviewing"];
    return new Set(
      cases
        .filter((item) =>
          activeStatuses.includes(String(item.status || "").toLowerCase())
        )
        .map((item) => String(item.id))
    );
  }, [cases]);

  return (
    <div className="dashboard-page">

      <header className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Investigation workspace overview
          </p>
        </div>

        <div className="page-header-actions">
          <button
            className="nc-btn nc-btn-primary"
            onClick={() => navigate("/cases")}
          >
            NEW CASE
          </button>
        </div>
      </header>

      {error && (
        <div className="nc-error-banner">
          {error}
        </div>
      )}

      {loading ? (
        <div className="nc-empty">
          <div className="nc-empty-title">Loading workspace data...</div>
        </div>
      ) : (
        <>

          <section className="metric-grid">

            <div className="metric-panel">
              <span className="metric-label">TOTAL CASES</span>
              <span className="metric-value">
                {metrics.totalCases}
              </span>
              <span className="metric-foot">
                {metrics.activeCases} currently active
              </span>
            </div>

            <div className="metric-panel">
              <span className="metric-label">ACTIVE CASES</span>
              <span className="metric-value accent">
                {metrics.activeCases}
              </span>
              <span className="metric-foot">
                open / investigating / reviewing
              </span>
            </div>

            <div className="metric-panel">
              <span className="metric-label">EVIDENCE FILES</span>
              <span className="metric-value">
                {metrics.evidenceCount}
              </span>
              <span className="metric-foot">
                registered artifacts
              </span>
            </div>

            <div className="metric-panel">
              <span className="metric-label">EVENT RECORDS</span>
              <span className="metric-value">
                {metrics.eventCount}
              </span>
              <span className="metric-foot">
                generated investigation output
              </span>
            </div>

            <div className="metric-panel">
              <span className="metric-label">DETECTIONS</span>
              <span className={
                metrics.criticalCount > 0
                  ? "metric-value crit"
                  : "metric-value"
              }>
                {metrics.detectionCount}
              </span>
              <span className="metric-foot">
                {metrics.criticalCount > 0
                  ? `${metrics.criticalCount} critical / high`
                  : "no critical findings"}
              </span>
            </div>

          </section>

          <section className="dashboard-grid">

            <div className="nc-panel dashboard-list-panel">

              <div className="panel-header">
                <div>
                  <div className="panel-eyebrow">
                    WORKSPACE / CASES
                  </div>
                  <h2 className="panel-title">
                    RECENT INVESTIGATIONS
                  </h2>
                </div>
                <button
                  className="nc-btn nc-btn-sm"
                  onClick={() => navigate("/cases")}
                >
                  VIEW ALL
                </button>
              </div>

              {recentCases.length === 0 ? (
                <div className="nc-empty">
                  <div className="nc-empty-title">
                    No cases exist yet
                  </div>
                  <div className="nc-empty-hint">
                    Create an investigation case to begin organizing
                    evidence, events, and findings.
                  </div>
                </div>
              ) : (
                <div className="artifact-table">
                  <div className="artifact-row artifact-head">
                    <div>ID</div>
                    <div>NAME</div>
                    <div className="col-status">STATUS</div>
                    <div className="col-time">UPDATED</div>
                  </div>

                  {recentCases.map((item) => (
                    <div
                      key={item.id}
                      className="artifact-row artifact-item"
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/cases/${item.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          navigate(`/cases/${item.id}`);
                        }
                      }}
                    >
                      <div className="mono dim">
                        #{String(item.id).padStart(3, "0")}
                      </div>
                      <div className="row-name">
                        {item.case_name}
                      </div>
                      <div className="col-status">
                        <span className={
                          openCaseIds.has(String(item.id))
                            ? "nc-badge info"
                            : String(item.status || "").toLowerCase() === "closed"
                              ? "nc-badge"
                              : "nc-badge warn"
                        }>
                          {item.status || "—"}
                        </span>
                      </div>
                      <div className="col-time mono dim">
                        {formatDate(item.updated_at || item.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

            <div className="nc-panel dashboard-list-panel">

              <div className="panel-header">
                <div>
                  <div className="panel-eyebrow">
                    ARTIFACTS / EVIDENCE
                  </div>
                  <h2 className="panel-title">
                    RECENT EVIDENCE
                  </h2>
                </div>
                <button
                  className="nc-btn nc-btn-sm"
                  onClick={() => navigate("/evidence")}
                >
                  VIEW ALL
                </button>
              </div>

              {recentEvidence.length === 0 ? (
                <div className="nc-empty">
                  <div className="nc-empty-title">
                    No evidence files registered
                  </div>
                  <div className="nc-empty-hint">
                    Upload forensic artifacts (EVTX, memory images, disk
                    images) and associate them with a case.
                  </div>
                </div>
              ) : (
                <div className="artifact-table">
                  <div className="artifact-row artifact-head">
                    <div>FILE</div>
                    <div>TYPE</div>
                    <div className="col-size">SIZE</div>
                    <div className="col-case">CASE</div>
                  </div>

                  {recentEvidence.map((item) => (
                    <div className="artifact-row artifact-item" key={item.id}>
                      <div className="row-name mono">
                        {item.file_name || "—"}
                      </div>
                      <div>
                        <span className="file-type">
                          {item.file_type ||
                            String(item.file_name || "")
                              .split(".")
                              .pop()
                              .toUpperCase()}
                        </span>
                      </div>
                      <div className="col-size mono dim">
                        {formatFileSize(item.file_size)}
                      </div>
                      <div className="col-case mono dim">
                        #{String(item.case || item.case_id || "?").padStart(3, "0")}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

          </section>

          <section className="nc-panel dashboard-list-panel">

            <div className="panel-header">
              <div>
                <div className="panel-eyebrow">
                  ARTIFACTS / EVENTS
                </div>
                <h2 className="panel-title">
                  RECENT EVENTS
                </h2>
              </div>
              <button
                className="nc-btn nc-btn-sm"
                onClick={() => navigate("/events")}
              >
                VIEW ALL
              </button>
            </div>

            {recentEvents.length === 0 ? (
              <div className="nc-empty">
                <div className="nc-empty-title">
                  No saved events
                </div>
                <div className="nc-empty-hint">
                  Run ChainSaw Log Analysis against an EVTX artifact and
                  save the resulting event to a case.
                </div>
              </div>
            ) : (
              <div className="artifact-table">
                <div className="artifact-row artifact-head">
                  <div>FILE</div>
                  <div>TYPE</div>
                  <div className="col-size">SIZE</div>
                  <div className="col-case">CASE</div>
                  <div className="col-time">CREATED</div>
                </div>

                {recentEvents.map((item) => {
                  const caseId =
                    String(item.case || item.case_id || "");
                  const caseRef = caseNameById.get(caseId);

                  return (
                    <div className="artifact-row artifact-item" key={item.id}>
                      <div className="row-name mono">
                        {item.file_name || "—"}
                      </div>
                      <div>
                        <span className="file-type">
                          {item.file_type || "JSON"}
                        </span>
                      </div>
                      <div className="col-size mono dim">
                        {formatFileSize(item.file_size)}
                      </div>
                      <div className="col-case">
                        <span className="case-ref-dim">
                          #{String(caseId || "?").padStart(3, "0")}
                        </span>
                        {caseRef && (
                          <span className="case-ref-name">
                            {caseRef.case_name}
                          </span>
                        )}
                      </div>
                      <div className="col-time mono dim">
                        {formatDate(item.created_at)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </section>

        </>
      )}

    </div>
  );
}

export default Dashboard;