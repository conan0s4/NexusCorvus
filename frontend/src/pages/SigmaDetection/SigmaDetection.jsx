import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SigmaDetection.css";

import {
  getEvidenceFiles,
} from "../../api/evidenceApi.js";

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
     Sigma Detection
  ========================= */

  const [output, setOutput] = useState("");
  const [detectionError, setDetectionError] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);

  /* =========================
     Save
  ========================= */

  const [showSaveForm, setShowSaveForm] = useState(false);
  const [caseName, setCaseName] = useState("");

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
  }, []);

  /* =========================
     Select Evidence
  ========================= */

  const handleSelectEvidence = (file) => {
    setSelectedEvidence(file);

    setOutput("");
    setDetectionError("");
  };

  /* =========================
     Clear Evidence
  ========================= */

  const handleClearEvidence = () => {
    setSelectedEvidence(null);

    setOutput("");
    setDetectionError("");
  };

  /* =========================
     Sigma Detection
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
    setOutput("");

    try {
      console.log(
        "Sigma detection evidence:",
        selectedEvidence.id
      );

      setOutput(
        `Selected evidence:\n${selectedEvidence.file_name}\n\n` +
        `Evidence ID: ${selectedEvidence.id}\n\n` +
        `Sigma detection API is not connected yet.`
      );
    } catch (err) {
      setDetectionError(
        err.message ||
          "Failed to run Sigma detection."
      );
    } finally {
      setIsDetecting(false);
    }
  };

  /* =========================
     Save Detection Results
  ========================= */

  const handleSave = (e) => {
    e.preventDefault();

    console.log(
      "Saving detection results to case:",
      caseName
    );

    console.log(
      "Detection output:",
      output
    );

    setShowSaveForm(false);
    setCaseName("");
  };

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
          </div>

        </div>

        {detectionError && (
          <div className="nc-error-banner sigma-error-banner">
            {detectionError}
          </div>
        )}

        {output && (
          <pre className="sigma-output">
            {output}
          </pre>
        )}

        {output && (
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
                  DETECTION OUTPUT / SAVE
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

                <div className="nc-field">
                  <label className="nc-field-label" htmlFor="caseName">
                    CASE NAME
                  </label>
                  <input
                    id="caseName"
                    className="nc-input"
                    type="text"
                    value={caseName}
                    onChange={(e) =>
                      setCaseName(e.target.value)
                    }
                    placeholder="Enter case name"
                    required
                  />
                </div>

              </div>

              <div className="nc-modal-footer">
                <button
                  type="button"
                  className="nc-btn"
                  onClick={() => setShowSaveForm(false)}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="nc-btn nc-btn-primary"
                >
                  SAVE RESULTS
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