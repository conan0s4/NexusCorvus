import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SigmaDetection.css";

function SigmaDetection() {
  const navigate = useNavigate();

  const [showSaveForm, setShowSaveForm] = useState(false);
  const [caseName, setCaseName] = useState("");

  const handleSave = (e) => {
    e.preventDefault();

    // Django/MySQL will be connected later.
    console.log("Saving detection results to case:", caseName);

    setShowSaveForm(false);
    setCaseName("");
  };

  return (
    <div className="sigma-page">

      {/* Header */}
      <header className="sigma-header">

        <div>
          <h1>Log Analysis</h1>
          <p>Analyze forensic logs and run Sigma-based detections</p>
        </div>

        <div className="analysis-actions">

          <button
            className="analysis-button"
            onClick={() => navigate("/log-analysis")}
          >
            Analyze Logs
          </button>

          <button className="analysis-button active">
            Detect with Sigma
          </button>

        </div>

      </header>


      {/* Main Content */}
      <div className="sigma-content">

        {/* Log Files */}
        <section className="sigma-section">

          <div className="sigma-section-label">
            FORENSIC LOG FILES
          </div>

          <div className="sigma-upload-area">

            <div className="sigma-upload-icon">
              ↑
            </div>

            <div className="sigma-upload-text">
              Drop files here or click to browse
            </div>

            <div className="sigma-upload-formats">
              EVTX · JSON · CSV · LOG
            </div>

          </div>

          {/* Uploaded files will appear here later */}
          <div className="sigma-files">
          </div>

        </section>


        {/* Detection Engine */}
        <section className="sigma-section">

          <div className="sigma-section-label">
            DETECTION ENGINE
          </div>

          <div className="sigma-detection-panel">

            <div className="sigma-detection-description">
              Sigma rules will be matched against all loaded log files
            </div>

            <button className="sigma-run-button">
              <span>♢</span>
              Run Detection
            </button>

          </div>

        </section>


        {/* Save Results */}
        <section className="sigma-save-section">

          <button
            className="sigma-save-button"
            onClick={() => setShowSaveForm(true)}
          >
            Save Detection Results
          </button>

        </section>

      </div>


      {/* Save Modal */}
      {showSaveForm && (
        <div className="sigma-modal-overlay">

          <div className="sigma-modal">

            <div className="sigma-modal-header">

              <div>
                <h2>Save Detection Results</h2>

                <p>
                  Associate these detection results with a case.
                </p>
              </div>

              <button
                className="sigma-modal-close"
                onClick={() => setShowSaveForm(false)}
              >
                ×
              </button>

            </div>


            <form onSubmit={handleSave}>

              <div className="sigma-form-group">

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


              <div className="sigma-modal-actions">

                <button
                  type="button"
                  className="sigma-cancel-button"
                  onClick={() => setShowSaveForm(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="sigma-confirm-button"
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

export default SigmaDetection;