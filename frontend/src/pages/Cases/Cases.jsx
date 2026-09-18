import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Cases.css";
import { getCases, createCase } from "../../api/caseApi";

const STATUS_ORDER = ["Investigating", "Open", "Reviewing", "Closed"];

const statusClass = (status) => {
  const value = String(status || "").toLowerCase();
  if (value === "closed") {
    return "nc-badge";
  }
  if (value === "reviewing") {
    return "nc-badge warn";
  }
  return "nc-badge info";
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

function Cases() {
  const navigate = useNavigate();

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

  useEffect(() => {
    loadCases();
  }, []);

  const handleOpenCase = (caseId) => {
    navigate(`/cases/${caseId}`);
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

  const filteredCases = useMemo(() => {
    const query = search.trim().toLowerCase();

    return cases.filter((caseItem) => {
      const matchesSearch =
        !query ||
        String(caseItem.case_name || "")
          .toLowerCase()
          .includes(query) ||
        String(caseItem.id)
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        String(caseItem.status || "")
          .toLowerCase() ===
          statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [cases, search, statusFilter]);

  return (
    <div className="cases-page">

      <header className="page-header">
        <div>
          <h1 className="page-title">Cases</h1>
          <p className="page-subtitle">
            Investigation cases and their lifecycle state
          </p>
        </div>

        <div className="page-header-actions">
          <button
            className="nc-btn nc-btn-primary"
            onClick={() => {
              setError("");
              setShowCreateCase(true);
            }}
          >
            + NEW CASE
          </button>
        </div>
      </header>

      {error && (
        <div className="nc-error-banner cases-error">
          {error}
        </div>
      )}

      <div className="cases-toolbar">

        <div className="nc-input-wrap">
          <input
            className="nc-input"
            type="text"
            placeholder="Search case names or IDs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="status-filter-group">
          <button
            className={`status-filter ${
              statusFilter === "All" ? "active" : ""
            }`}
            onClick={() => setStatusFilter("All")}
          >
            ALL
          </button>
          {STATUS_ORDER.map((item) => (
            <button
              key={item}
              className={`status-filter ${
                statusFilter === item ? "active" : ""
              }`}
              onClick={() => setStatusFilter(item)}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>

        <span className="case-count">
          {filteredCases.length}{" "}
          {filteredCases.length === 1 ? "CASE" : "CASES"}
        </span>

      </div>

      <div className="nc-panel cases-table-panel">

        <div className="cases-table artifact-table">

          <div className="artifact-row artifact-head cases-head">
            <div>ID</div>
            <div>NAME</div>
            <div className="col-status">STATUS</div>
            <div className="col-time">CREATED</div>
            <div className="col-time">UPDATED</div>
          </div>

          {loading ? (
            <div className="nc-empty">
              <div className="nc-empty-title">Loading cases...</div>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="nc-empty">
              <div className="nc-empty-title">
                {search || statusFilter !== "All"
                  ? "No cases match the current filters"
                  : "No cases registered"}
              </div>
              <div className="nc-empty-hint">
                {search || statusFilter !== "All"
                  ? "Adjust the search terms or status filter."
                  : "Create an investigation case to begin organizing evidence, events, and findings."}
              </div>
            </div>
          ) : (
            filteredCases.map((caseItem) => (
              <div
                className="artifact-row artifact-item case-row"
                key={caseItem.id}
                onClick={() => handleOpenCase(caseItem.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleOpenCase(caseItem.id);
                  }
                }}
              >
                <div className="mono dim">
                  #{String(caseItem.id).padStart(3, "0")}
                </div>
                <div className="row-name case-name-cell">
                  {caseItem.case_name}
                </div>
                <div className="col-status">
                  <span className={statusClass(caseItem.status)}>
                    {caseItem.status || "—"}
                  </span>
                </div>
                <div className="col-time mono dim">
                  {formatDate(caseItem.created_at)}
                </div>
                <div className="col-time mono dim">
                  {formatDate(caseItem.updated_at)}
                </div>
              </div>
            ))
          )}

        </div>

      </div>

      {showCreateCase && (
        <div
          className="nc-modal-overlay"
          onClick={() => setShowCreateCase(false)}
        >
          <div
            className="nc-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nc-modal-header">
              <div>
                <div className="nc-modal-eyebrow">
                  CASE REGISTRATION
                </div>
                <h2 className="nc-modal-title">
                  Create New Case
                </h2>
              </div>
              <button
                className="nc-modal-close"
                onClick={() => setShowCreateCase(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateCase}>
              <div className="nc-modal-body">

                <div className="nc-field">
                  <label className="nc-field-label" htmlFor="case-name">
                    CASE NAME
                  </label>
                  <input
                    id="case-name"
                    className="nc-input"
                    type="text"
                    placeholder="Suspicious PowerShell Activity"
                    value={caseName}
                    onChange={(e) => setCaseName(e.target.value)}
                  />
                </div>

                <div className="nc-field">
                  <label className="nc-field-label" htmlFor="case-description">
                    DESCRIPTION
                  </label>
                  <textarea
                    id="case-description"
                    className="nc-textarea"
                    placeholder="Brief description of the incident..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="nc-field">
                  <label className="nc-field-label" htmlFor="case-status">
                    STATUS
                  </label>
                  <select
                    id="case-status"
                    className="nc-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {STATUS_ORDER.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                {error && showCreateCase && (
                  <div className="nc-error-banner">
                    {error}
                  </div>
                )}

              </div>

              <div className="nc-modal-footer">
                <button
                  type="button"
                  className="nc-btn"
                  onClick={() => setShowCreateCase(false)}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="nc-btn nc-btn-primary"
                  disabled={creating}
                >
                  {creating ? "CREATING..." : "CREATE CASE"}
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