import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Events.css";
import apiRequest from "../../api/apiClient";
import { getEvents, deleteEvent } from "../../api/eventApi";

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

function Events() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [cases, setCases] = useState([]);

  const [search, setSearch] = useState("");
  const [caseFilter, setCaseFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        setError("");

        const [eventsResponse, casesResponse] = await Promise.all([
          getEvents(),
          apiRequest("/cases/"),
        ]);

        setEvents(extractList(eventsResponse));
        setCases(extractList(casesResponse));
      } catch (err) {
        setError(err.message || "Failed to load events.");
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

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return events.filter((item) => {
      const matchesSearch =
        !query ||
        String(item.file_name || "").toLowerCase().includes(query) ||
        String(item.file_path || "").toLowerCase().includes(query);

      const matchesCase =
        caseFilter === "All" ||
        caseIdOf(item) === caseFilter;

      return matchesSearch && matchesCase;
    });
  }, [events, search, caseFilter]);

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    setDeleting(true);

    try {
      await deleteEvent(pendingDelete.id);

      setEvents((previous) =>
        previous.filter((item) => item.id !== pendingDelete.id)
      );
      setPendingDelete(null);
    } catch (err) {
      setError(err.message || "Failed to delete event.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="events-page">

      <header className="page-header">
        <div>
          <h1 className="page-title">Events</h1>
          <p className="page-subtitle">
            Generated investigation output stored per case
          </p>
        </div>
      </header>

      {error && (
        <div className="nc-error-banner events-error">
          {error}
        </div>
      )}

      <div className="events-toolbar">

        <div className="nc-input-wrap">
          <input
            className="nc-input"
            type="text"
            placeholder="Search output files or paths..."
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

        <span className="events-count">
          {filteredEvents.length}{" "}
          {filteredEvents.length === 1 ? "EVENT" : "EVENTS"}
        </span>

      </div>

      <div className="nc-panel events-table-panel">

        <div className="events-table artifact-table">

          <div className="artifact-row artifact-head events-head">
            <div>FILE</div>
            <div>TYPE</div>
            <div className="col-size">SIZE</div>
            <div className="col-case">CASE</div>
            <div className="col-time">CREATED</div>
            <div className="col-path">STORAGE PATH</div>
            <div className="col-action">STATUS</div>
          </div>

          {loading ? (
            <div className="nc-empty">
              <div className="nc-empty-title">Loading event records...</div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="nc-empty">
              <div className="nc-empty-title">
                {search || caseFilter !== "All"
                  ? "No events match the current filters"
                  : "No saved events"}
              </div>
              <div className="nc-empty-hint">
                {search || caseFilter !== "All"
                  ? "Adjust the search terms or case filter."
                  : "Run Log Analysis against an EVTX artifact and save the resulting output to a case."}
              </div>
            </div>
          ) : (
            filteredEvents.map((item) => {
              const caseId = caseIdOf(item);
              const caseRef = caseById.get(caseId);

              return (
                <div className="artifact-row artifact-item events-row" key={item.id}>
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
                    {formatDate(item.created_at)}
                  </div>
                  <div className="col-path mono dim">
                    {item.file_path || "—"}
                  </div>
                  <div className="col-action">
                    <div className="row-actions">
                      <span className="nc-badge plain">
                        SAVED
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

      {pendingDelete && (
        <div className="nc-modal-overlay" onClick={() => setPendingDelete(null)}>
          <div className="nc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="nc-modal-header">
              <div>
                <div className="nc-modal-eyebrow">
                  DESTRUCTIVE ACTION
                </div>
                <h2 className="nc-modal-title">
                  Remove Event Record
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
                This removes the saved event record and its association with
                the case. The underlying evidence artifact is not affected.
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
                {deleting ? "REMOVING..." : "REMOVE EVENT"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Events;