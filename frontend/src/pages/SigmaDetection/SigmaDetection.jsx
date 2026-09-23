import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SigmaDetection.css";

import { getEvidenceFiles } from "../../api/evidenceApi.js";
import { getCases } from "../../api/caseApi.js";
import { detectWithSigma, getSigmaMeta, stopSigmaDetection } from "../../api/sigmaApi.js";
import { createDetection } from "../../api/detectionApi.js";

function SigmaDetection() {
  const navigate = useNavigate();

  /* =========================
     Evidence
  ========================= */

  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  const [evidenceError, setEvidenceError] = useState("");
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(true);

  /* =========================
     Rule Meta (filters)
  ========================= */

  const [meta, setMeta] = useState({
    levels: [],
    categories: [],
  });

  const [levelFilter, setLevelFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  /* =========================
     Sigma Detection
  ========================= */

  const [result, setResult] = useState(null);
  const [detectionError, setDetectionError] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [stopNotice, setStopNotice] = useState("");
  const [expanded, setExpanded] = useState(new Set());

  /* =========================
     Save to Case
  ========================= */

  const [cases, setCases] = useState([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [selectedCase, setSelectedCase] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  /* =========================
     Load Evidence
  ========================= */

  const loadEvidence = async () => {
    setIsLoadingEvidence(true);
    setEvidenceError("");

    try {
      const data = await getEvidenceFiles();

      const evtxFiles = (data || []).filter(
        (file) =>
          file.file_name &&
          file.file_name
            .toLowerCase()
            .endsWith(".evtx")
      );

      setEvidenceFiles(evtxFiles);
    } catch (err) {
      setEvidenceError(
        err.message ||
          "Failed to load evidence files."
      );
    } finally {
      setIsLoadingEvidence(false);
    }
  };

  useEffect(() => {
    loadEvidence();

    getSigmaMeta()
      .then((data) =>
        setMeta({
          levels: data.levels || [],
          categories: data.categories || [],
        })
      )
      .catch(() => {});

    getCases()
      .then((data) => setCases(data || []))
      .catch(() => {});
  }, []);

  /* =========================
     Select Evidence
  ========================= */

  const handleSelectEvidence = (file) => {
    setSelectedEvidence(file);

    setResult(null);
    setDetectionError("");
    setStopNotice("");
  };

  const handleClearEvidence = () => {
    setSelectedEvidence(null);

    setResult(null);
    setDetectionError("");
    setStopNotice("");
  };

  /* =========================
     Stop Sigma Detection
  ========================= */

  const handleStop = async () => {
    if (!selectedEvidence || !isDetecting) {
      return;
    }

    setIsStopping(true);
    setDetectionError("");

    try {
      await stopSigmaDetection(selectedEvidence.id);
    } catch (err) {
      setDetectionError(
        err.message || "Failed to stop Sigma detection."
      );
    } finally {
      setIsStopping(false);
    }
  };

  /* =========================
     Run Sigma Detection
  ========================= */

  const handleRunDetection = async () => {
    if (!selectedEvidence) {
      setDetectionError(
        "Please select an EVTX evidence file first."
      );
      return;
    }

    setIsDetecting(true);
    setDetectionError("");
    setStopNotice("");
    setResult(null);
    setExpanded(new Set());

    try {
      const data = await detectWithSigma({
        evidence_file_id: selectedEvidence.id,
        level: levelFilter || null,
        category: categoryFilter || null,
      });

      if (data && data.status === "success") {
        setResult(data);
        if (data.stopped) {
          setStopNotice(
            data.detail ||
              "Scan stopped — showing partial results."
          );
        }
      } else {
        setDetectionError(
          data?.error || "Sigma detection failed."
        );
      }
    } catch (err) {
      setDetectionError(
        err.message || "Failed to run Sigma detection."
      );
    } finally {
      setIsDetecting(false);
    }
  };

  /* =========================
     Results Expand/Collapse
  ========================= */

  const toggleMatch = (index) => {
    setExpanded((prev) => {
      const next = new Set(prev);

      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }

      return next;
    });
  };

  /* =========================
     Save Matches as Detections
  ========================= */

  const buildDetectionPayload = (match, caseId) => {
    const rule = match.rule || {};
    const first = (match.matches && match.matches[0]) || {};
    const data = first.data || {};
    const logsource = rule.logsource || {};

    const join = (values) =>
      Array.isArray(values) ? values.join(", ") : "";

    return {
      case_id: Number(caseId),
      time: first.time || new Date().toISOString(),
      event_type: String(
        logsource.category || logsource.service || "sigma"
      ).slice(0, 100),
      description:
        `${rule.title || ""}\n\n${rule.description || ""}` +
        `\n\nRule: ${rule.rule_file || ""}`,
      host: first.computer || data.Computer || "",
      user:
        first.user ||
        data.TargetUserName ||
        data.SubjectUserName ||
        data.User ||
        "",
      severity: String(rule.level || "informational").slice(0, 50),
      detection_rule: String(
        rule.title || rule.rule_file || "Sigma match"
      ).slice(0, 255),
      rule_id: String(rule.id || "").slice(0, 255),
      mitre_tactic: join(rule.mitre_tactics).slice(0, 255),
      mitre_technique: join(rule.mitre_techniques).slice(0, 255),
    };
  };

  const handleSave = async (e) => {
    e.preventDefault();

    setSaveError("");
    setSaveSuccess("");

    if (!selectedCase) {
      setSaveError("Please select a case.");
      return;
    }

    if (!result || !result.matches || result.matches.length === 0) {
      setSaveError("No detection results to save.");
      return;
    }

    setIsSaving(true);

    let saved = 0;
    let failed = 0;

    try {
      for (const match of result.matches) {
        try {
          await createDetection(
            buildDetectionPayload(match, selectedCase)
          );
          saved += 1;
        } catch {
          failed += 1;
        }
      }
    } finally {
      setIsSaving(false);
    }

    if (failed === 0) {
      setSaveSuccess(
        `Saved ${saved} detection${saved === 1 ? "" : "s"} to the case.`
      );
      setShowSaveForm(false);
      setSelectedCase("");
    } else {
      setSaveError(
        `Saved ${saved} detection${saved === 1 ? "" : "s"}, ` +
        `${failed} failed. You can retry from Detections.`
      );
    }
  };

  /* =========================
     Render Helpers
  ========================= */

  const renderMatch = (match, index) => {
    const rule = match.rule || {};
    const isOpen = expanded.has(index);

    return (
      <div className="sigma-match" key={index}>
        <button
          type="button"
          className="sigma-match-header"
          onClick={() => toggleMatch(index)}
        >
          <span
            className={`sigma-sev sev-${rule.level || "informational"}`}
          >
            {rule.level || "info"}
          </span>
          <span className="sigma-match-title">
            {rule.title || "Untitled rule"}
          </span>
          <span className="sigma-match-count">
            {match.match_count}{" "}
            hit{match.match_count === 1 ? "" : "s"}
            {match.truncated ? " (truncated)" : ""}
          </span>
          <span className="sigma-match-toggle">
            {isOpen ? "▾" : "▸"}
          </span>
        </button>

        {isOpen && (
          <div className="sigma-match-body">
            {rule.description && (
              <p className="sigma-match-desc">
                {rule.description}
              </p>
            )}

            <div className="sigma-match-meta">
              {rule.rule_file && (
                <span className="sigma-meta-chip mono">
                  {rule.rule_file}
                </span>
              )}

              {rule.mitre_techniques &&
                rule.mitre_techniques.map((t) => (
                  <span key={t} className="sigma-meta-chip mitre">
                    {t}
                  </span>
                ))}

              {rule.mitre_tactics &&
                rule.mitre_tactics.map((t) => (
                  <span key={t} className="sigma-meta-chip tactic">
                    {t}
                  </span>
                ))}
            </div>

            {rule.references &&
              rule.references.length > 0 && (
                <ul className="sigma-references">
                  {rule.references.map((ref, idx) => (
                    <li key={idx}>
                      <span className="mono">{ref}</span>
                    </li>
                  ))}
                </ul>
              )}

            {match.matches && match.matches.length > 0 && (
              <table className="sigma-events-table">
                <thead>
                  <tr>
                    <th>TIME</th>
                    <th>EVENT ID</th>
                    <th>CHANNEL</th>
                    <th>COMPUTER</th>
                    <th>USER</th>
                  </tr>
                </thead>
                <tbody>
                  {match.matches.map((m, idx) => (
                    <tr key={idx}>
                      <td className="mono">
                        {m.time || "—"}
                      </td>
                      <td>{m.event_id ?? "—"}</td>
                      <td>{m.channel || "—"}</td>
                      <td>{m.computer || "—"}</td>
                      <td>{m.user || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {match.matches && match.matches.length > 0 && (
              <details className="sigma-event-details">
                <summary>Show matched event fields</summary>
                <pre className="sigma-event-json">
                  {JSON.stringify(
                    match.matches[0].data || {},
                    null,
                    2
                  )}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    );
  };

  /* =========================
     Render
  ========================= */

  return (
    <div className="sigma-page">

      {/* Header */}
      <header className="page-header">
        <div>
          <h1 className="page-title">Sigma Detection</h1>
          <p className="page-subtitle">
            Run Sigma rules against EVTX artifacts
          </p>
        </div>

        <div className="page-header-actions">
          <button
            className="nc-btn"
            onClick={() =>
              navigate("/log-analysis")
            }
          >
            ANALYZE LOGS
          </button>

          <button className="nc-btn nc-btn-primary">
            DETECT WITH SIGMA
          </button>
        </div>
      </header>

      {/* =========================
          Evidence
      ========================= */}

      <section className="nc-panel sigma-section">

        <div className="panel-header">
          <div>
            <div className="panel-eyebrow">
              INPUT / EVIDENCE
            </div>
            <h2 className="panel-title">
              FORENSIC LOG FILES
            </h2>
          </div>
        </div>

        <div className="sigma-evidence-list">

          {isLoadingEvidence ? (
            <div className="nc-empty">
              <div className="nc-empty-title">
                Loading evidence files...
              </div>
            </div>
          ) : evidenceFiles.length === 0 ? (
            <div className="nc-empty">
              <div className="nc-empty-title">
                No EVTX evidence files found
              </div>
              <div className="nc-empty-hint">
                Upload an EVTX artifact from Log Analysis to run detection.
              </div>
            </div>
          ) : (
            evidenceFiles.map((file) => (
              <button
                key={file.id}
                type="button"
                className={
                  selectedEvidence?.id === file.id
                    ? "sigma-evidence-file selected"
                    : "sigma-evidence-file"
                }
                onClick={() =>
                  handleSelectEvidence(file)
                }
              >
                <span className="file-icon">▫</span>
                <span className="sigma-evidence-name mono">
                  {file.file_name}
                </span>
                <span className="file-type">
                  EVTX
                </span>
              </button>
            ))
          )}

        </div>

        {evidenceError && (
          <div className="nc-error-banner sigma-error-banner">
            {evidenceError}
          </div>
        )}

        {selectedEvidence && (
          <div className="nc-selected-bar sigma-selected">
            <span className="nc-label">SELECTED</span>
            <span className="mono">{selectedEvidence.file_name}</span>
            <span className="nc-selected-meta">
              ID {selectedEvidence.id}
            </span>

            <button
              type="button"
              className="nc-btn nc-btn-sm"
              onClick={handleClearEvidence}
            >
              CLEAR
            </button>
          </div>
        )}

      </section>

      {/* =========================
          Detection Engine
      ========================= */}

      <section className="nc-panel sigma-section">

        <div className="panel-header">
          <div>
            <div className="panel-eyebrow">
              DETECTION ENGINE
            </div>
            <h2 className="panel-title">
              SIGMA RULES
            </h2>
          </div>
        </div>

        <div className="sigma-detection-panel">

          <div className="sigma-filters">
            <div className="nc-field">
              <label className="nc-field-label" htmlFor="sigmaLevel">
                MINIMUM LEVEL
              </label>
              <select
                id="sigmaLevel"
                className="nc-select"
                value={levelFilter}
                onChange={(e) =>
                  setLevelFilter(e.target.value)
                }
              >
                <option value="">All levels</option>
                {meta.levels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div className="nc-field">
              <label className="nc-field-label" htmlFor="sigmaCategory">
                CATEGORY
              </label>
              <select
                id="sigmaCategory"
                className="nc-select"
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value)
                }
              >
                <option value="">All categories</option>
                {meta.categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sigma-detection-description">
            {selectedEvidence
              ? `Run Sigma rules against ${selectedEvidence.file_name}`
              : "Select an EVTX evidence file to run Sigma detection."}
          </div>

          <div className="sigma-run-row">
            <button
              type="button"
              className="nc-btn nc-btn-primary"
              onClick={handleRunDetection}
              disabled={isDetecting || !selectedEvidence}
            >
              {isDetecting ? "RUNNING..." : "RUN DETECTION"}
            </button>

            {isDetecting && (
              <button
                type="button"
                className="nc-btn nc-btn-danger"
                onClick={handleStop}
                disabled={isStopping}
              >
                {isStopping ? "STOPPING..." : "STOP"}
              </button>
            )}
          </div>

        </div>

        {detectionError && (
          <div className="nc-error-banner sigma-error-banner">
            {detectionError}
          </div>
        )}

      </section>

      {stopNotice && (
        <div className="nc-success-banner sigma-error-banner">
          {stopNotice}
        </div>
      )}

      {/* =========================
          Results
      ========================= */}

      {result && result.status === "success" && (
        <section className="nc-panel sigma-section">

          <div className="panel-header">
            <div>
              <div className="panel-eyebrow">
                SCAN COMPLETE
              </div>
              <h2 className="panel-title">
                DETECTION RESULTS ({result.matches.length})
              </h2>
            </div>
          </div>

          <div className="sigma-stats">
            <div className="sigma-stat">
              <span className="sigma-stat-value">
                {result.events_processed}
              </span>
              <span className="sigma-stat-label">
                EVENTS
              </span>
            </div>
            <div className="sigma-stat">
              <span className="sigma-stat-value">
                {result.rules_evaluated}
              </span>
              <span className="sigma-stat-label">
                RULES
              </span>
            </div>
            <div className="sigma-stat">
              <span className="sigma-stat-value">
                {result.rules_skipped}
              </span>
              <span className="sigma-stat-label">
                SKIPPED
              </span>
            </div>
            <div className="sigma-stat">
              <span className="sigma-stat-value">
                {result.duration_seconds}s
              </span>
              <span className="sigma-stat-label">
                DURATION
              </span>
            </div>
            <div className="sigma-stat">
              <span className="sigma-stat-value">
                {result.events_malformed}
              </span>
              <span className="sigma-stat-label">
                MALFORMED
              </span>
            </div>
          </div>

          {result.matches.length === 0 ? (
            <div className="nc-empty sigma-empty">
              <div className="nc-empty-title">
                No Sigma rules matched
              </div>
              <div className="nc-empty-hint">
                Try relaxing the level/category filters or use a different
                evidence file.
              </div>
            </div>
          ) : (
            <div className="sigma-matches-list">
              {result.matches.map(renderMatch)}
            </div>
          )}

          {result.matches.length > 0 && (
            <div className="sigma-save-row">
              <button
                type="button"
                className="nc-btn nc-btn-lg"
                onClick={() => setShowSaveForm(true)}
              >
                SAVE DETECTION RESULTS
              </button>
            </div>
          )}

        </section>
      )}

      {/* =========================
          Save Modal
      ========================= */}

      {showSaveForm && (
        <div
          className="nc-modal-overlay"
          onClick={() => setShowSaveForm(false)}
        >
          <div
            className="nc-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nc-modal-header">
              <div>
                <div className="nc-modal-eyebrow">
                  DETECTION RESULTS / SAVE
                </div>
                <h2 className="nc-modal-title">
                  Save Detection Results
                </h2>
              </div>
              <button
                type="button"
                className="nc-modal-close"
                onClick={() => setShowSaveForm(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="nc-modal-body">

                <div className="nc-empty-hint nc-modal-hint">
                  Saves {result?.matches?.length || 0} matched rule
                  {result?.matches?.length === 1 ? "" : "s"} as Detections
                  on the selected case.
                </div>

                <div className="nc-field">
                  <label className="nc-field-label" htmlFor="saveCase">
                    CASE
                  </label>
                  <select
                    id="saveCase"
                    className="nc-select"
                    value={selectedCase}
                    onChange={(e) =>
                      setSelectedCase(e.target.value)
                    }
                    required
                  >
                    <option value="">
                      Select case
                    </option>
                    {cases.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        #{String(item.id).padStart(3, "0")} — {item.case_name}
                      </option>
                    ))}
                  </select>
                </div>

                {saveError && (
                  <div className="nc-error-banner">
                    {saveError}
                  </div>
                )}

                {saveSuccess && (
                  <div className="nc-success-banner">
                    {saveSuccess}
                  </div>
                )}

              </div>

              <div className="nc-modal-footer">
                <button
                  type="button"
                  className="nc-btn"
                  onClick={() => setShowSaveForm(false)}
                  disabled={isSaving}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="nc-btn nc-btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? "SAVING..." : "SAVE RESULTS"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default SigmaDetection;