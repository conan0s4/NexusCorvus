import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Evidence.css";
import apiRequest from "../../api/apiClient";
import {
  getEvidenceFiles,
  createEvidenceFile,
  deleteEvidenceFile,
} from "../../api/evidenceApi";

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

const typeOf = (item) => {
  if (item.file_type) {
    return item.file_type;
  }
  const ext = String(item.file_name || "").split(".").pop();
  return ext ? ext.toUpperCase() : "FILE";
};

const caseIdOf = (item) => String(item.case ?? item.case_id ?? "");

function Evidence() {
  const navigate = useNavigate();

  const [evidence, setEvidence] = useState([]);
  const [cases, setCases] = useState([]);

  const [search, setSearch] = useState("");
  const [caseFilter, setCaseFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadCase, setUploadCase] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        setError("");

        const [evidenceResponse, casesResponse] = await Promise.all([
          getEvidenceFiles(),
          apiRequest("/cases/"),
        ]);

        setEvidence(extractList(evidenceResponse));
        setCases(extractList(casesResponse));
      } catch (err) {
        setError(err.message || "Failed to load evidence.");
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  const caseById = useMemo(() => {
    const map = new Map();
    cases.forEach((item) => map.set(String(item.id), item));
    return map;
  }, [cases]);

  const filteredEvidence = useMemo(() => {
    const query = search.trim().toLowerCase();

    return evidence.filter((item) => {
      const matchesSearch =
        !query ||
        String(item.file_name || "").toLowerCase().includes(query) ||
        String(item.file_path || "").toLowerCase().includes(query);

      const matchesCase =
        caseFilter === "All" ||
        caseIdOf(item) === caseFilter;

      return matchesSearch && matchesCase;
    });
  }, [evidence, search, caseFilter]);

  const handleUpload = async (e) => {
    e.preventDefault();

    setUploadError("");

    if (!uploadFile) {
      setUploadError("Select an evidence file to upload.");
      return;
    }

    if (!uploadCase) {
      setUploadError("Select the case this artifact belongs to.");
      return;
    }

    setIsUploading(true);

    try {
      const created = await createEvidenceFile(uploadCase, uploadFile);

      setEvidence((previous) => [created, ...previous]);
      setUploadFile(null);
      setUploadCase("");
      setShowUpload(false);
    } catch (err) {
      setUploadError(err.message || "Failed to upload evidence.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    setDeleting(true);

    try {
      await deleteEvidenceFile(pendingDelete.id);

      setEvidence((previous) =>
        previous.filter((item) => item.id !== pendingDelete.id)
      );
      setPendingDelete(null);
    } catch (err) {
      setError(err.message || "Failed to delete evidence.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="evidence-page">

      <header className="page-header">
        <div>
          <h1 className="page-title">Evidence</h1>
          <p className="page-subtitle">
            Registered forensic artifacts and their case association
          </p>
        </div>

        <div className="page-header-actions">
          <button
            className="nc-btn nc-btn-primary"
            onClick={() => {
              setUploadError("");
              setUploadFile(null);
              setUploadCase("");
              setShowUpload(true);
            }}
          >
            + UPLOAD EVIDENCE
          </button>
        </div>
      </header>

      {error && (
        <div className="nc-error-banner evidence-error">
          {error}
        </div>
      )}

      <div className="evidence-toolbar">

        <div className="nc-input-wrap">
          <input
            className="nc-input"
            type="text"
            placeholder="Search artifacts or paths..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="nc-select nc-select-compact"
          value={caseFilter}
          onChange={(e) => setCaseFilter(e.target.value)}
        >
          <option value="All">ALL CASES</option>
          {cases.map((item) => (
            <option key={item.id} value={String(item.id)}>
              #{String(item.id).padStart(3, "0")} — {item.case_name}
            </option>
          ))}
        </select>

        <span className="evidence-count">
          {filteredEvidence.length}{" "}
          {filteredEvidence.length === 1 ? "ARTIFACT" : "ARTIFACTS"}
        </span>

      </div>

      <div className="nc-panel evidence-table-panel">

        <div className="evidence-table artifact-table">

          <div className="artifact-row artifact-head evidence-head">
            <div>FILE</div>
            <div>TYPE</div>
            <div className="col-size">SIZE</div>
            <div className="col-case">CASE</div>
            <div className="col-time">UPLOADED</div>
            <div className="col-path">STORAGE PATH</div>
            <div className="col-action">STATUS</div>
          </div>

          {loading ? (
            <div className="nc-empty">
              <div className="nc-empty-title">Loading evidence files...</div>
            </div>
          ) : filteredEvidence.length === 0 ? (
            <div className="nc-empty">
              <div className="nc-empty-title">
                {search || caseFilter !== "All"
                  ? "No artifacts match the current filters"
                  : "No evidence files registered"}
              </div>
              <div className="nc-empty-hint">
                {search || caseFilter !== "All"
                  ? "Adjust the search terms or case filter."
                  : "Upload a forensic artifact (EVTX, memory image, disk image) and associate it with a case."}
              </div>
            </div>
          ) : (
            filteredEvidence.map((item) => {
              const caseId = caseIdOf(item);
              const caseRef = caseById.get(caseId);

              return (
                <div className="artifact-row artifact-item evidence-row" key={item.id}>
                  <div className="row-name mono">
                    {item.file_name || "—"}
                  </div>
                  <div>
                    <span className="file-type">
                      {typeOf(item)}
                    </span>
                  </div>
                  <div className="col-size mono dim">
                    {formatFileSize(item.file_size)}
                  </div>
                  <div className="col-case">
                    <button
                      className="case-link"
                      onClick={() => navigate(`/cases/${caseId}`)}
                    >
                      #{String(caseId || "?").padStart(3, "0")}
                    </button>
                    {caseRef && (
                      <span className="case-ref-name">
                        {caseRef.case_name}
                      </span>
                    )}
                  </div>
                  <div className="col-time mono dim">
                    {formatDate(item.uploaded_at || item.created_at)}
                  </div>
                  <div className="col-path mono dim">
                    {item.file_path || "—"}
                  </div>
                  <div className="col-action">
                    <div className="row-actions">
                      <span className="nc-badge plain">
                        REGISTERED
                      </span>
                      <button
                        className="nc-btn nc-btn-sm nc-btn-danger"
                        onClick={() => setPendingDelete(item)}
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

        </div>

      </div>

      {showUpload && (
        <div className="nc-modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="nc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="nc-modal-header">
              <div>
                <div className="nc-modal-eyebrow">
                  EVIDENCE REGISTRATION
                </div>
                <h2 className="nc-modal-title">
                  Upload Evidence Artifact
                </h2>
              </div>
              <button
                className="nc-modal-close"
                onClick={() => setShowUpload(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpload}>
              <div className="nc-modal-body">

                <div className="nc-field">
                  <label className="nc-field-label">
                    ARTIFACT FILE
                  </label>
                  <input
                    className="nc-input nc-input-file"
                    type="file"
                    onChange={(e) =>
                      setUploadFile(e.target.files[0] || null)
                    }
                  />
                  {uploadFile && (
                    <div className="nc-selected-bar">
                      <span className="nc-label">SELECTED</span>
                      <span className="mono">{uploadFile.name}</span>
                      <span className="nc-selected-meta">
                        {formatFileSize(uploadFile.size)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="nc-field">
                  <label className="nc-field-label">
                    ASSOCIATED CASE
                  </label>
                  <select
                    className="nc-select"
                    value={uploadCase}
                    onChange={(e) => setUploadCase(e.target.value)}
                  >
                    <option value="">
                      Select case
                    </option>
                    {cases.map((item) => (
                      <option key={item.id} value={item.id}>
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

              </div>

              <div className="nc-modal-footer">
                <button
                  type="button"
                  className="nc-btn"
                  onClick={() => setShowUpload(false)}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="nc-btn nc-btn-primary"
                  disabled={isUploading}
                >
                  {isUploading ? "UPLOADING..." : "REGISTER EVIDENCE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="nc-modal-overlay" onClick={() => setPendingDelete(null)}>
          <div className="nc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="nc-modal-header">
              <div>
                <div className="nc-modal-eyebrow">
                  DESTRUCTIVE ACTION
                </div>
                <h2 className="nc-modal-title">
                  Remove Evidence
                </h2>
              </div>
              <button
                className="nc-modal-close"
                onClick={() => setPendingDelete(null)}
              >
                ×
              </button>
            </div>

            <div className="nc-modal-body">
              <p className="nc-modal-text">
                Are you sure you want to remove{" "}
                <strong className="mono">
                  {pendingDelete.file_name}
                </strong>?
              </p>
              <p className="nc-modal-detail">
                This removes the artifact from the workspace and its
                association with the case.
              </p>
            </div>

            <div className="nc-modal-footer">
              <button
                className="nc-btn"
                onClick={() => setPendingDelete(null)}
              >
                CANCEL
              </button>
              <button
                className="nc-btn nc-btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "REMOVING..." : "REMOVE EVIDENCE"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Evidence;