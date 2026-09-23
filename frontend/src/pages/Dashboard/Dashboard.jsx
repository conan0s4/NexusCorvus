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

const activityBadgeClass = (kind) => {
  if (kind === "case") {
    return "nc-badge info";
  }
  if (kind === "event") {
    return "nc-badge warn";
  }
  return "nc-badge";
};

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

  const recentActivities = useMemo(() => {
    const activities = [];

    cases.forEach((item) =>
      activities.push({
        key: `case-${item.id}`,
        kind: "case",
        name: item.case_name || `Case #${item.id}`,
        status: item.status || "—",
        caseId: String(item.id),
        caseName: "",
        time: new Date(item.updated_at || item.created_at || 0).getTime(),
      })
    );

    evidence.forEach((item) => {
      const caseId = String(item.case ?? item.case_id ?? "");
      activities.push({
        key: `evidence-${item.id}`,
        kind: "evidence",
        name: item.file_name || `Evidence #${item.id}`,
        status: "",
        caseId,
        caseName: caseNameById.get(caseId)?.case_name || "",
        time: new Date(item.uploaded_at || item.created_at || 0).getTime(),
      });
    });

    events.forEach((item) => {
      const caseId = String(item.case ?? item.case_id ?? "");
      activities.push({
        key: `event-${item.id}`,
        kind: "event",
        name: item.file_name || `Event #${item.id}`,
        status: "",
        caseId,
        caseName: caseNameById.get(caseId)?.case_name || "",
        time: new Date(item.created_at || 0).getTime(),
      });
    });

    return activities
      .sort((a, b) => b.time - a.time)
      .slice(0, 12);
  }, [cases, evidence, events, caseNameById]);

  const handleActivityOpen = (activity) => {
    if (activity.kind === "case") {
      navigate(`/cases/${activity.caseId}`);
    } else if (activity.kind === "event") {
      navigate("/events");
    } else {
      navigate("/evidence");
    }
  };

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

          <section className="nc-panel dashboard-list-panel">

            <div className="panel-header">
              <div>
                <div className="panel-eyebrow">
                  WORKSPACE / ACTIVITY
                </div>
                <h2 className="panel-title">
                  RECENT ACTIVITIES
                </h2>
              </div>
              <button
                className="nc-btn nc-btn-sm"
                onClick={() => navigate("/cases")}
              >
                VIEW ALL
              </button>
            </div>

            {recentActivities.length === 0 ? (
              <div className="nc-empty">
                <div className="nc-empty-title">
                  No recent workspace activity
                </div>
                <div className="nc-empty-hint">
                  Cases, evidence, and saved event records will appear here
                  as your investigation workspace grows.
                </div>
              </div>
            ) : (
              <div className="artifact-table">

                <div className="artifact-row artifact-head activity-head">
                  <div>TYPE</div>
                  <div>NAME</div>
                  <div className="col-case">CASE</div>
                  <div className="col-time">WHEN</div>
                </div>

                {recentActivities.map((activity) => (
                  <div
                    key={activity.key}
                    className="artifact-row artifact-item activity-row"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleActivityOpen(activity)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleActivityOpen(activity);
                      }
                    }}
                  >
                    <div className="col-activity-type">
                      <span className={activityBadgeClass(activity.kind)}>
                        {activity.kind}
                      </span>
                    </div>
                    <div className="row-name">
                      {activity.name}
                    </div>
                    <div className="col-case">
                      {activity.caseId ? (
                        <>
                          <span className="case-ref-dim">
                            #{String(activity.caseId).padStart(3, "0")}
                          </span>
                          {activity.caseName && (
                            <span className="case-ref-name">
                              {activity.caseName}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="dim">—</span>
                      )}
                    </div>
                    <div className="col-time mono dim">
                      {formatDate(new Date(activity.time))}
                    </div>
                  </div>
                ))}

              </div>
            )}

          </section>

        </>
      )}

    </div>
  );
}

export default Dashboard;