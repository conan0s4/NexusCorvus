import { useState } from "react";
import "./LogAnalysis.css";
import { useNavigate } from "react-router-dom";

function LogAnalysis() {
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [caseName, setCaseName] = useState("");

  const navigate = useNavigate();

  const handleSave = (e) => {
    e.preventDefault();

    // Database connection will be added through Django later.
    console.log("Case:", caseName);

    setShowSaveForm(false);
    setCaseName("");
  };

  return (
    <div className="log-analysis-page">

      {/* Header */}
      <header className="log-analysis-header">
        <div>
          <h1>Log Analysis</h1>
          <p>Analyze forensic logs and run Sigma-based detections</p>
        </div>

        <div className="analysis-actions">
          <button className="analysis-button active">
            Analyze Logs
          </button>

          <button className="analysis-button"
            onClick={() => navigate("/sigma-detection")}>
            Detect with Sigma
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="log-analysis-content">

        {/* File Upload */}
        <section className="log-section">

          <div className="section-label">
            FORENSIC LOG FILES
          </div>

          <div className="upload-area">

            <div className="upload-icon">
              ↑
            </div>

            <div className="upload-text">
              Drop files here or click to browse
            </div>

            <div className="upload-formats">
              EVTX
            </div>

          </div>

          <div className="log-files">
          </div>

        </section>

        {/* Chainsaw Analysis */}
        <section className="log-section">

          <div className="section-label">
            CHAINSAW ANALYSIS
          </div>

          <div className="analysis-panel">

            <div className="analysis-grid">

              {/* Time Range */}
              <div className="analysis-field">
                <label>TIME RANGE</label>

                <select defaultValue="all">
                  <option value="all">All time</option>
                </select>
              </div>

              {/* Event ID */}
              <div className="analysis-field">
                <label>EVENT ID</label>

                <select defaultValue="all">
                  <option value="all">All</option>
                </select>
              </div>

              {/* Source */}
              <div className="analysis-field">
                <label>SOURCE</label>

                <select defaultValue="all">
                  <option value="all">All Sources</option>
                </select>
              </div>

              {/* Host */}
              <div className="analysis-field">
                <label>HOST</label>

                <select defaultValue="all">
                  <option value="all">All Hosts</option>
                </select>
              </div>

              {/* User */}
              <div className="analysis-field">
                <label>USER</label>

                <select defaultValue="all">
                  <option value="all">All Users</option>
                </select>
              </div>

              {/* Analyze */}
              <div className="analysis-submit">
                <button>
                  <span>▷</span>
                  Analyze Logs
                </button>
              </div>

            </div>

          </div>

        </section>

        {/* Save Results */}
        <section className="save-results-section">

          <button
            className="save-results-button"
            onClick={() => setShowSaveForm(true)}
          >
            Save Analysis Results
          </button>

        </section>

      </div>

      {/* Save Results Modal */}
      {showSaveForm && (
        <div className="save-modal-overlay">

          <div className="save-modal">

            <div className="save-modal-header">
              <div>
                <h2>Save Analysis Results</h2>
                <p>Associate this analysis with a case.</p>
              </div>

              <button
                className="modal-close"
                onClick={() => setShowSaveForm(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave}>

              <div className="save-form-group">
                <label htmlFor="caseName">
                  CASE NAME
                </label>

                <input
                  id="caseName"
                  type="text"
                  value={caseName}
                  onChange={(e) => setCaseName(e.target.value)}
                  placeholder="Enter case name"
                  required
                />
              </div>

              <div className="save-modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowSaveForm(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="confirm-save-button"
                >
                  Save Results
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