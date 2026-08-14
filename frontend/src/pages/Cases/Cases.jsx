import { useEffect, useState } from "react";
import "./Cases.css";
import { getCases, createCase } from "../../api/caseApi";

function Cases() {
  const [cases, setCases] = useState([]);
  const [showCreateCase, setShowCreateCase] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [caseName, setCaseName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Open");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await getCases();

      const caseList = Array.isArray(result)
        ? result
        : result.results || [];

      setCases(caseList);
    } catch (error) {
      setError(error.message || "Failed to load cases.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async (e) => {
    e.preventDefault();

    if (!caseName.trim()) {
      setError("Case name is required.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const newCase = await createCase({
        case_name: caseName,
        description,
        status,
      });

      setCases((currentCases) => [
        newCase,
        ...currentCases,
      ]);

      setCaseName("");
      setDescription("");
      setStatus("Open");
      setShowCreateCase(false);
    } catch (error) {
      setError(error.message || "Failed to create case.");
    } finally {
      setCreating(false);
    }
  };

  const filteredCases = cases.filter((caseItem) => {
    const searchValue = search.toLowerCase();

    const matchesSearch =
      caseItem.case_name
        ?.toLowerCase()
        .includes(searchValue) ||
      String(caseItem.id)
        .toLowerCase()
        .includes(searchValue);

    const matchesStatus =
      statusFilter === "All" ||
      caseItem.status?.toLowerCase() ===
        statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

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
          onClick={() => {
            setError("");
            setShowCreateCase(true);
          }}
        >
          <span>+</span>
          New Case
        </button>
      </header>

      {/* Error */}
      {error && (
        <div className="cases-error">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="cases-toolbar">

        <div className="search-box">
          <span className="search-icon">⌕</span>

          <input
            type="text"
            placeholder="Search cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <button
            className={`filter ${
              statusFilter === "All" ? "active" : ""
            }`}
            onClick={() => setStatusFilter("All")}
          >
            All
          </button>

          <button
            className={`filter ${
              statusFilter === "Investigating" ? "active" : ""
            }`}
            onClick={() => setStatusFilter("Investigating")}
          >
            Investigating
          </button>

          <button
            className={`filter ${
              statusFilter === "Open" ? "active" : ""
            }`}
            onClick={() => setStatusFilter("Open")}
          >
            Open
          </button>

          <button
            className={`filter ${
              statusFilter === "Reviewing" ? "active" : ""
            }`}
            onClick={() => setStatusFilter("Reviewing")}
          >
            Reviewing
          </button>

          <button
            className={`filter ${
              statusFilter === "Closed" ? "active" : ""
            }`}
            onClick={() => setStatusFilter("Closed")}
          >
            Closed
          </button>
        </div>

        <div className="case-count">
          {filteredCases.length}{" "}
          {filteredCases.length === 1 ? "case" : "cases"}
        </div>

      </div>

      {/* Cases Table */}
      <div className="cases-table">

        <div className="table-header">
          <div>CASE ID</div>
          <div>CASE NAME</div>
          <div>STATUS</div>
          <div>CREATED</div>
          <div>UPDATED</div>
        </div>

        {loading ? (
          <div className="cases-empty">
            <p>Loading cases...</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="cases-empty">
            <p>No cases found</p>
          </div>
        ) : (
          filteredCases.map((caseItem) => (
            <div
              className="case-row"
              key={caseItem.id}
            >
              <div className="case-id-cell">
                CASE-{caseItem.id}
              </div>

              <div className="case-name-cell">
                {caseItem.case_name}
              </div>

              <div>
                <span className="case-status">
                  {caseItem.status}
                </span>
              </div>

              <div className="case-date">
                {caseItem.created_at
                  ? new Date(
                      caseItem.created_at
                    ).toLocaleString()
                  : "-"}
              </div>

              <div className="case-date">
                {caseItem.updated_at
                  ? new Date(
                      caseItem.updated_at
                    ).toLocaleString()
                  : "-"}
              </div>
            </div>
          ))
        )}

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
                    value={caseName}
                    onChange={(e) =>
                      setCaseName(e.target.value)
                    }
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
                    value={description}
                    onChange={(e) =>
                      setDescription(e.target.value)
                    }
                  />
                </div>

                {/* Status */}
                <div className="modal-form-group">
                  <label htmlFor="case-status">
                    STATUS
                  </label>

                  <select
                    id="case-status"
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value)
                    }
                  >
                    <option value="Investigating">
                      Investigating
                    </option>

                    <option value="Open">
                      Open
                    </option>

                    <option value="Reviewing">
                      Reviewing
                    </option>

                    <option value="Closed">
                      Closed
                    </option>
                  </select>
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
                  disabled={creating}
                >
                  {creating
                    ? "Creating..."
                    : "Create Case"}
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