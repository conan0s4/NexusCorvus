import { useState } from "react";
import "./Cases.css";

function Cases() {
  const [showCreateCase, setShowCreateCase] = useState(false);

  const handleCreateCase = (e) => {
    e.preventDefault();

    // Django API connection will be added later.
    console.log("Create case");
  };

  return (
    <div className="cases-page">

      {/* Page Header */}
      <header className="cases-header">
        <div>
          <h1>Cases</h1>
          <p>Manage and investigate forensic cases</p>
        </div>

        <button
          className="new-case-button"
          onClick={() => setShowCreateCase(true)}
        >
          <span>+</span>
          New Case
        </button>
      </header>

      {/* Filters */}
      <div className="cases-toolbar">

        <div className="search-box">
          <span className="search-icon">⌕</span>

          <input
            type="text"
            placeholder="Search cases..."
          />
        </div>

        <div className="filter-group">
          <button className="filter active">All</button>
          <button className="filter">Investigating</button>
          <button className="filter">Open</button>
          <button className="filter">Reviewing</button>
          <button className="filter">Closed</button>
        </div>

        <div className="filter-divider" />

        <div className="filter-group">
          <button className="filter active">All</button>
          <button className="filter">Critical</button>
          <button className="filter">High</button>
          <button className="filter">Medium</button>
          <button className="filter">Low</button>
        </div>

        <div className="case-count">
          0 cases
        </div>

      </div>

      {/* Cases Table */}
      <div className="cases-table">

        <div className="table-header">
          <div>CASE ID</div>
          <div>CASE NAME</div>
          <div>SEVERITY</div>
          <div>EVENTS</div>
          <div>LAST ACTIVITY</div>
          <div>STATUS</div>
          <div>UPDATED</div>
        </div>

        <div className="cases-empty">
          <p>No cases found</p>
        </div>

      </div>

      {/* Create Case Modal */}
      {showCreateCase && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreateCase(false)}
        >
          <div
            className="create-case-modal"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Modal Header */}
            <div className="modal-header">
              <h2>Create New Case</h2>

              <button
                className="modal-close"
                onClick={() => setShowCreateCase(false)}
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateCase}>

              <div className="modal-body">

                {/* Case Name */}
                <div className="modal-form-group">
                  <label htmlFor="case-name">
                    CASE NAME
                  </label>

                  <input
                    id="case-name"
                    type="text"
                    placeholder="Suspicious PowerShell Activity"
                  />
                </div>

                {/* Description */}
                <div className="modal-form-group">
                  <label htmlFor="case-description">
                    DESCRIPTION
                  </label>

                  <textarea
                    id="case-description"
                    placeholder="Brief description of the incident..."
                  />
                </div>

                {/* Severity */}
                <div className="modal-form-group">
                  <label>SEVERITY</label>

                  <div className="severity-options">

                    <button
                      type="button"
                      className="severity-option"
                    >
                      Critical
                    </button>

                    <button
                      type="button"
                      className="severity-option"
                    >
                      High
                    </button>

                    <button
                      type="button"
                      className="severity-option selected"
                    >
                      Medium
                    </button>

                    <button
                      type="button"
                      className="severity-option"
                    >
                      Low
                    </button>

                  </div>
                </div>

                {/* Tags */}
                <div className="modal-form-group">
                  <label htmlFor="case-tags">
                    TAGS
                  </label>

                  <input
                    id="case-tags"
                    type="text"
                    placeholder="powershell, lateral-movement, endpoint"
                  />

                  <span className="field-hint">
                    Comma-separated
                  </span>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="modal-footer">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowCreateCase(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="create-button"
                >
                  Create Case
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default Cases;