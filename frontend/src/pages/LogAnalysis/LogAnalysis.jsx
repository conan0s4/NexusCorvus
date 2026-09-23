import { useEffect, useState } from "react";
import "./LogAnalysis.css";
import { useNavigate } from "react-router-dom";

import { analyzeLogs, stopChainsawAnalyze } from "../../api/analyze.js";
import {
  getEvidenceFiles,
  createEvidenceFile,
} from "../../api/evidenceApi.js";
import { createEventFile } from "../../api/eventApi.js";
import apiRequest from "../../api/apiClient.js";

function LogAnalysis() {
  const navigate = useNavigate();

  /* =========================
     Evidence
  ========================= */

  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [cases, setCases] = useState([]);
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadCase, setUploadCase] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  /* =========================
     Chainsaw
  ========================= */

  const [pattern, setPattern] = useState("");
  const [eventId, setEventId] = useState("all");
  const [host, setHost] = useState("all");
  const [user, setUser] = useState("all");
  const [timerange, setTimerange] = useState("all");
  const [ignoreCase, setIgnoreCase] = useState(false);

  const [events, setEvents] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  /* =========================
     Save Analysis Results
  ========================= */

  const [showSaveForm, setShowSaveForm] = useState(false);
  const [selectedCase, setSelectedCase] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  /* =========================
     Load Evidence + Cases
  ========================= */

  const loadEvidence = async () => {
    try {
      const data = await getEvidenceFiles();

      const evtxFiles = (data || []).filter(
        (file) =>
          file.file_name &&
          file.file_name.toLowerCase().endsWith(".evtx")
      );

      setEvidenceFiles(evtxFiles);
    } catch (err) {
      setError(
        err.message || "Failed to load evidence files."
      );
    }
  };

  const loadCases = async () => {
    try {
      const data = await apiRequest("/cases/");
      setCases(data || []);
    } catch (err) {
      setError(
        err.message || "Failed to load cases."
      );
    }
  };

  useEffect(() => {
    loadEvidence();
    loadCases();
  }, []);

  /* =========================
     Select Existing Evidence
  ========================= */

  const handleSelectEvidence = (file) => {
    setSelectedEvidence(file);
    setEvents([]);
    setError("");
    setNotice("");
  };

  /* =========================
     Upload New EVTX
  ========================= */

  const handleOpenUpload = () => {
    setShowUploadForm(true);
    setUploadFile(null);
    setUploadCase("");
    setUploadError("");
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    setUploadError("");

    if (!uploadFile) {
      setUploadError("Please select an EVTX file.");
      return;
    }

    if (
      !uploadFile.name
        .toLowerCase()
        .endsWith(".evtx")
    ) {
      setUploadError(
        "Only EVTX files are allowed."
      );
      return;
    }

    if (!uploadCase) {
      setUploadError(
        "Please select a case."
      );
      return;
    }

    setIsUploading(true);

    try {
      const data = await createEvidenceFile(
        uploadCase,
        uploadFile
      );

      setEvidenceFiles((previous) => [
        data,
        ...previous,
      ]);

      setSelectedEvidence(data);

      setShowUploadForm(false);

      setUploadFile(null);
      setUploadCase("");
    } catch (err) {
      setUploadError(
        err.message ||
          "Failed to upload EVTX file."
      );
    } finally {
      setIsUploading(false);
    }
  };

  /* =========================
     Chainsaw Analysis
  ========================= */

  const handleAnalyze = async () => {
    if (!selectedEvidence) {
      setError(
        "Please select an EVTX evidence file first."
      );
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setNotice("");
    setEvents([]);

    try {
      const data = await analyzeLogs({
        evidence_file_id: selectedEvidence.id,
        pattern,
        event_id: eventId,
        host,
        user,
        timerange,
        ignore_case: ignoreCase,
      });

      if (data.status === "success") {
        setEvents(data.events || []);
        if (!data.events || data.events.length === 0) {
          setError("Chainsaw returned no matching events.");
        }
      } else if (data.status === "stopped") {
        setNotice(data.detail || "Chainsaw analysis was stopped.");
      } else {
        setError(
          data.error ||
            "Chainsaw analysis failed."
        );
      }
    } catch (err) {
      setError(
        err.message ||
          "Failed to run Chainsaw analysis."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  /* =========================
     Stop Chainsaw Analysis
  ========================= */

  const handleStop = async () => {
    if (!selectedEvidence || !isAnalyzing) {
      return;
    }

    setIsStopping(true);
    setError("");

    try {
      await stopChainsawAnalyze(selectedEvidence.id);
    } catch (err) {
      setError(
        err.message || "Failed to stop the running analysis."
      );
    } finally {
      setIsStopping(false);
    }
  };

  /* =========================
     Save Chainsaw Results
  ========================= */

  const handleSave = async (e) => {
    e.preventDefault();

    setSaveError("");

    if (!selectedCase) {
      setSaveError("Please select a case.");
      return;
    }

    if (!events || events.length === 0) {
      setSaveError("No analysis results to save.");
      return;
    }

    const jsonContent = JSON.stringify(events, null, 2);

    let fileName = "output.json";

    if (selectedEvidence && selectedEvidence.file_name) {
      const baseName = selectedEvidence.file_name.replace(/\.evtx$/i, "");
      fileName = `${baseName}.json`;
    }

    setIsSaving(true);

    try {
      await createEventFile(
        selectedCase,
        fileName,
        jsonContent
      );

      setShowSaveForm(false);
      setSelectedCase("");
      setSaveError("");
    } catch (err) {
      setSaveError(
        err.message ||
          "Failed to save analysis results."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="log-analysis-page">

      {/* Header */}
      <header className="page-header">
        <div>
          <h1 className="page-title">Log Analysis</h1>
          <p className="page-subtitle">
            Run Chainsaw against EVTX artifacts and inspect matching events
          </p>
        </div>

        <div className="page-header-actions">
          <button className="nc-btn nc-btn-primary">
            ANALYZE LOGS
          </button>

          <button
            className="nc-btn"
            onClick={() => navigate("/sigma-detection")}
          >
            DETECT WITH SIGMA
          </button>
        </div>
      </header>

      {/* =========================
          Evidence
      ========================= */}

      <section className="nc-panel section-block">

        <div className="panel-header">
          <div>
            <div className="panel-eyebrow">
              INPUT / EVIDENCE
            </div>
            <h2 className="panel-title">
              FORENSIC LOG FILES
            </h2>
          </div>

          <button
            className="nc-btn nc-btn-sm"
            onClick={handleOpenUpload}
          >
            + UPLOAD EVTX
          </button>
        </div>

        <div className="evidence-list">

          {evidenceFiles.length === 0 ? (
            <div className="nc-empty">
              <div className="nc-empty-title">
                No EVTX evidence files found
              </div>
              <div className="nc-empty-hint">
                Upload an EVTX artifact to begin analysis.
              </div>
            </div>
          ) : (
            evidenceFiles.map((file) => (
              <button
                key={file.id}
                className={
                  selectedEvidence?.id === file.id
                    ? "evidence-file selected"
                    : "evidence-file"
                }
                onClick={() =>
                  handleSelectEvidence(file)
                }
              >
                <span className="file-icon">▫</span>
                <span className="evidence-file-name mono">
                  {file.file_name}
                </span>
                <span className="file-type">
                  EVTX
                </span>
              </button>
            ))
          )}

        </div>

        {selectedEvidence && (
          <div className="nc-selected-bar evidence-selected">
            <span className="nc-label">SELECTED</span>
            <span className="mono">{selectedEvidence.file_name}</span>
            <span className="nc-selected-meta">
              ID {selectedEvidence.id}
            </span>
          </div>
        )}

      </section>

      {/* =========================
          Upload New EVTX
      ========================= */}

      {showUploadForm && (
        <section className="nc-panel section-block">

          <div className="panel-header">
            <div>
              <div className="panel-eyebrow">
                INPUT / EVIDENCE
              </div>
              <h2 className="panel-title">
                UPLOAD NEW EVIDENCE
              </h2>
            </div>
          </div>

          <form className="upload-panel" onSubmit={handleUpload}>

            <div className="nc-field">
              <label className="nc-field-label">
                EVTX FILE
              </label>
              <input
                className="nc-input nc-input-file"
                type="file"
                accept=".evtx"
                onChange={(e) =>
                  setUploadFile(e.target.files[0] || null)
                }
              />
              {uploadFile && (
                <div className="nc-selected-bar">
                  <span className="nc-label">SELECTED</span>
                  <span className="mono">{uploadFile.name}</span>
                </div>
              )}
            </div>

            <div className="nc-field">
              <label className="nc-field-label">
                CASE
              </label>
              <select
                className="nc-select"
                value={uploadCase}
                onChange={(e) =>
                  setUploadCase(e.target.value)
                }
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

            {uploadError && (
              <div className="nc-error-banner">
                {uploadError}
              </div>
            )}

            <div className="upload-actions">
              <button
                type="button"
                className="nc-btn"
                onClick={() => setShowUploadForm(false)}
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="nc-btn nc-btn-primary"
                disabled={isUploading}
              >
                {isUploading ? "UPLOADING..." : "UPLOAD EVTX"}
              </button>
            </div>

          </form>

        </section>
      )}

      {/* =========================
          Chainsaw Analysis
      ========================= */}

      <section className="nc-panel section-block">

        <div className="panel-header">
          <div>
            <div className="panel-eyebrow">
              ANALYSIS ENGINE
            </div>
            <h2 className="panel-title">
              CHAINSAW ANALYSIS
            </h2>
          </div>
        </div>

        <div className="analysis-panel">

          <div className="analysis-grid">

            <div className="nc-field">
              <label className="nc-field-label">
                PATTERN
              </label>
              <input
                className="nc-input"
                type="text"
                placeholder="keyword or regex (empty = all)"
                value={pattern}
                onChange={(e) =>
                  setPattern(e.target.value)
                }
              />
            </div>

            <div className="nc-field">
              <label className="nc-field-label">
                EVENT ID
              </label>
              <input
                className="nc-input"
                type="text"
                placeholder="e.g. 4624 (empty = all)"
                value={eventId}
                onChange={(e) =>
                  setEventId(e.target.value)
                }
              />
            </div>

            <div className="nc-field">
              <label className="nc-field-label">
                HOST
              </label>
              <input
                className="nc-input"
                type="text"
                placeholder="computer name (empty = all)"
                value={host}
                onChange={(e) =>
                  setHost(e.target.value)
                }
              />
            </div>

            <div className="nc-field">
              <label className="nc-field-label">
                USER
              </label>
              <input
                className="nc-input"
                type="text"
                placeholder="username (empty = all)"
                value={user}
                onChange={(e) =>
                  setUser(e.target.value)
                }
              />
            </div>

            <div className="nc-field">
              <label className="nc-field-label">
                TIME RANGE START
              </label>
              <input
                className="nc-input"
                type="text"
                placeholder="YYYY-MM-ddTHH:mm:SS"
                value={timerange === "all" ? "" : (timerange.start || "")}
                onChange={(e) => {
                  const v = e.target.value;
                  setTimerange(v
                    ? { start: v, end: timerange === "all" ? "" : (timerange.end || "") }
                    : "all"
                  );
                }}
              />
            </div>

            <div className="nc-field">
              <label className="nc-field-label">
                TIME RANGE END
              </label>
              <input
                className="nc-input"
                type="text"
                placeholder="YYYY-MM-ddTHH:mm:SS"
                value={timerange === "all" ? "" : (timerange.end || "")}
                onChange={(e) => {
                  const v = e.target.value;
                  setTimerange(prev => {
                    const cur = prev === "all" ? {} : prev;
                    return { ...cur, end: v };
                  });
                }}
              />
            </div>

          </div>

          <div className="analysis-footer">

            <label className="ignore-case-control">
              <input
                type="checkbox"
                checked={ignoreCase}
                disabled={isAnalyzing}
                onChange={(e) =>
                  setIgnoreCase(e.target.checked)
                }
              />
              <span>IGNORE CASE</span>
            </label>

            <div className="analysis-actions">
              <button
                className="nc-btn nc-btn-primary"
                onClick={handleAnalyze}
                disabled={isAnalyzing || !selectedEvidence}
              >
                {isAnalyzing ? "ANALYZING..." : "ANALYZE LOGS"}
              </button>

              {isAnalyzing && (
                <button
                  className="nc-btn nc-btn-danger"
                  onClick={handleStop}
                  disabled={isStopping}
                >
                  {isStopping ? "STOPPING..." : "STOP"}
                </button>
              )}
            </div>

          </div>

        </div>

      </section>

      {/* Error */}

      {error && (
        <div className="nc-error-banner analysis-error">
          {error}
        </div>
      )}

      {notice && (
        <div className="nc-success-banner analysis-error">
          {notice}
        </div>
      )}

      {/* Chainsaw Results */}

      {events.length > 0 && (
        <section className="nc-panel section-block">

          <div className="panel-header">
            <div>
              <div className="panel-eyebrow">
                ANALYSIS OUTPUT
              </div>
              <h2 className="panel-title">
                CHAINSAW RESULTS ({events.length})
              </h2>
            </div>
          </div>

          <pre className="chainsaw-output">
            {JSON.stringify(events, null, 2)}
          </pre>

        </section>
      )}

      {/* Save Analysis Results */}

      {events.length > 0 && (
        <div className="save-results-row">
          <button
            className="nc-btn nc-btn-primary nc-btn-lg"
            onClick={() => setShowSaveForm(true)}
          >
            SAVE ANALYSIS RESULTS
          </button>
        </div>
      )}

      {/* =========================
          Save Results Modal
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
                  ANALYSIS OUTPUT / SAVE
                </div>
                <h2 className="nc-modal-title">
                  Save Analysis Results
                </h2>
              </div>
              <button
                className="nc-modal-close"
                onClick={() => setShowSaveForm(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="nc-modal-body">

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

export default LogAnalysis;