import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import "./CaseDetail.css";

import {
  getCase,
  updateCase,
  deleteCase,
  downloadCaseReport,
} from "../../../api/caseApi";

import {
  getDetections,
} from "../../../api/detectionApi";

import {
  getEvents,
} from "../../../api/eventApi";

import EventJsonViewer from "../../../components/EventJsonViewer/EventJsonViewer";

import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
} from "../../../api/noteApi";


const REPORT_FORMATS = [
  {
    value: "pdf",
    label: "PDF",
    hint: "Portable document",
  },
  {
    value: "md",
    label: "Markdown",
    hint: "Text document (.md)",
  },
  {
    value: "json",
    label: "JSON",
    hint: "Structured data (.json)",
  },
];


function parseDispositionFilename(disposition) {
  const match = disposition.match(
    /filename="([^"]+)"|filename=([^;\s]+)/i
  );

  if (!match) {
    return null;
  }

  return match[1] || match[2];
}


function CaseDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [detections, setDetections] = useState([]);
  const [events, setEvents] = useState([]);
  const [notes, setNotes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportFormat, setReportFormat] = useState("pdf");
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportError, setReportError] = useState("");

  const [selectedDetection, setSelectedDetection] = useState(null);
  const [viewingEvent, setViewingEvent] = useState(null);

  const [detectionSearch, setDetectionSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");

  const [editForm, setEditForm] = useState({
    case_name: "",
    description: "",
    status: "",
  });

  const [noteContent, setNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");


  /*
   * =========================================
   * HELPERS
   * =========================================
   */

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
    if (
      bytes === null ||
      bytes === undefined ||
      bytes === ""
    ) {
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


  const getSeverityClass = (severity) => {
    const value = String(severity || "").trim().toLowerCase();
    if (value === "critical" || value === "high") {
      return "nc-badge crit";
    }
    if (value === "medium") {
      return "nc-badge warn";
    }
    return "nc-badge";
  };


  const getCaseStatusClass = (status) => {
    const value = String(status || "").toLowerCase();
    if (value === "closed") {
      return "nc-badge";
    }
    if (value === "reviewing") {
      return "nc-badge warn";
    }
    return "nc-badge info";
  };


  /*
   * =========================================
   * LOAD CASE DATA
   * =========================================
   */

  const loadCaseData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        caseResponse,
        detectionsResponse,
        eventsResponse,
        notesResponse,
      ] = await Promise.all([
        getCase(caseId),
        getDetections(),
        getEvents(),
        getNotes(),
      ]);

      const currentCase = caseResponse;

      setCaseData(currentCase);

      setEditForm({
        case_name: currentCase.case_name || "",
        description: currentCase.description || "",
        status: currentCase.status || "",
      });


      const detectionList =
        extractList(detectionsResponse);

      const eventList =
        extractList(eventsResponse);

      const noteList =
        extractList(notesResponse);


      setDetections(
        detectionList.filter(
          (detection) =>
            String(detection.case) === String(caseId) ||
            String(detection.case_id) === String(caseId) ||
            String(detection.case?.id) === String(caseId)
        )
      );


      setEvents(
        eventList.filter(
          (event) =>
            String(event.case) === String(caseId) ||
            String(event.case_id) === String(caseId) ||
            String(event.case?.id) === String(caseId)
        )
      );


      setNotes(
        noteList.filter(
          (note) =>
            String(note.case) === String(caseId) ||
            String(note.case_id) === String(caseId) ||
            String(note.case?.id) === String(caseId)
        )
      );

    } catch (err) {
      console.error(err);
      setError(
        err.message ||
        "Failed to fetch case data."
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadCaseData();
  }, [caseId]);


  /*
   * =========================================
   * SEARCH
   * =========================================
   */

  const filteredDetections = useMemo(() => {
    const query =
      detectionSearch.trim().toLowerCase();

    if (!query) {
      return detections;
    }

    return detections.filter((detection) => {
      return Object.values(detection).some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [detections, detectionSearch]);


  const filteredEvents = useMemo(() => {
    const query =
      eventSearch.trim().toLowerCase();

    if (!query) {
      return events;
    }

    return events.filter((event) => {
      return Object.values(event).some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [events, eventSearch]);


  /*
   * =========================================
   * CASE EDIT
   * =========================================
   */

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };


  const handleUpdateCase = async (e) => {
    e.preventDefault();

    try {
      setError("");

      const updatedCase = await updateCase(
        caseId,
        {
          case_name: editForm.case_name,
          description: editForm.description,
          status: editForm.status,
        }
      );

      setCaseData(updatedCase);

      setEditForm({
        case_name:
          updatedCase.case_name || "",
        description:
          updatedCase.description || "",
        status:
          updatedCase.status || "",
      });

      setShowEdit(false);

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "Failed to update case."
      );
    }
  };


  /*
   * =========================================
   * DELETE CASE
   * =========================================
   */

  const handleDeleteCase = async () => {
    try {
      setError("");

      await deleteCase(caseId);

      navigate("/cases");

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "Failed to delete case."
      );
    }
  };


  /*
   * =========================================
   * CASE REPORT
   * =========================================
   */

  const buildFallbackFilename = (reportFormatValue) => {
    const extension =
      reportFormatValue === "md" ? "md" : reportFormatValue;
    const id = String(caseData?.id ?? "000").padStart(3, "0");
    const slug = String(caseData?.case_name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return `CASE-${id}${slug ? `_${slug}` : ""}_report.${extension}`;
  };


  const handleGenerateReport = async () => {
    try {
      setReportGenerating(true);
      setReportError("");

      const result = await downloadCaseReport(
        caseId,
        reportFormat
      );

      if (!result) {
        return;
      }

      const filename =
        parseDispositionFilename(result.disposition) ||
        buildFallbackFilename(reportFormat);

      const url = URL.createObjectURL(result.blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      setShowReportModal(false);

    } catch (err) {
      console.error(err);

      setReportError(
        err.message ||
        "Failed to generate report."
      );
    } finally {
      setReportGenerating(false);
    }
  };


  /*
   * =========================================
   * NOTES
   * =========================================
   */

  const handleCreateNote = async (e) => {
    e.preventDefault();

    if (!noteContent.trim()) {
      return;
    }

    try {
      setError("");

      const newNote = await createNote({
        case_id: Number(caseId),
        content: noteContent.trim(),
      });

      setNotes((previous) => [
        ...previous,
        newNote,
      ]);

      setNoteContent("");

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "Failed to create note."
      );
    }
  };


  const startEditingNote = (note) => {
    setEditingNoteId(note.id);
    setEditingNoteContent(
      note.content || ""
    );
  };


  const cancelEditingNote = () => {
    setEditingNoteId(null);
    setEditingNoteContent("");
  };


  const handleUpdateNote = async (noteId) => {
    if (!editingNoteContent.trim()) {
      return;
    }

    try {
      setError("");

      const updatedNote = await updateNote(
        noteId,
        {
          content:
            editingNoteContent.trim(),
        }
      );

      setNotes((previous) =>
        previous.map((note) =>
          note.id === noteId
            ? updatedNote
            : note
        )
      );

      cancelEditingNote();

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "Failed to update note."
      );
    }
  };


  const handleDeleteNote = async (noteId) => {
    try {
      setError("");

      await deleteNote(noteId);

      setNotes((previous) =>
        previous.filter(
          (note) => note.id !== noteId
        )
      );

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "Failed to delete note."
      );
    }
  };


  /*
   * =========================================
   * LOADING
   * =========================================
   */

  if (loading) {
    return (
      <div className="case-detail-page">
        <div className="nc-empty">
          <div className="nc-empty-title">
            Loading investigation case...
          </div>
        </div>
      </div>
    );
  }


  if (!caseData) {
    return (
      <div className="case-detail-page">
        <div className="nc-empty">
          <div className="nc-empty-title">
            Case could not be found.
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="case-detail-page">

      {error && (
        <div className="nc-error-banner case-detail-error">
          {error}
        </div>
      )}

      {/* =========================================
          HEADER
          ========================================= */}

      <header className="page-header case-header-block">

        <div>
          <h1 className="page-title">
            <span className="mono case-id-prefix">
              CASE-{String(caseData.id).padStart(3, "0")}
            </span>
            <span className="case-title-sep">/</span>
            {caseData.case_name}
          </h1>

          <div className="case-meta-row">
            <span className={getCaseStatusClass(caseData.status)}>
              {caseData.status || "—"}
            </span>

            <span className="meta-divider">•</span>

            <span className="meta-label">CREATED</span>
            <span className="meta-value mono">
              {formatDate(caseData.created_at)}
            </span>

            <span className="meta-divider">•</span>

            <span className="meta-label">UPDATED</span>
            <span className="meta-value mono">
              {formatDate(caseData.updated_at)}
            </span>
          </div>
        </div>

        <div className="page-header-actions">
          <button
            className="nc-btn nc-btn-primary"
            onClick={() => setShowReportModal(true)}
          >
            GENERATE REPORT
          </button>

          <button
            className="nc-btn"
            onClick={() => setShowEdit(true)}
          >
            EDIT CASE
          </button>

          <button
            className="nc-btn nc-btn-danger"
            onClick={() => setShowDeleteConfirm(true)}
          >
            DELETE CASE
          </button>
        </div>

      </header>

      {/* =========================================
          CASE OVERVIEW
          ========================================= */}

      <section className="nc-panel section-block">

        <div className="panel-header">
          <div>
            <div className="panel-eyebrow">
              INVESTIGATION
            </div>
            <h2 className="panel-title">
              CASE OVERVIEW
            </h2>
          </div>
        </div>

        <div className="overview-body">

          <div className="overview-description">
            <div className="nc-field-label">
              CASE DESCRIPTION
            </div>
            <div className="description-text">
              {caseData.description ||
                "No description provided for this investigation."}
            </div>
          </div>

          <div className="investigation-stats">

            <div className="stat-block">
              <span className="stat-label">
                EVENT FILES
              </span>
              <strong className="stat-value">
                {events.length}
              </strong>
              <span className="stat-foot">
                evidence records
              </span>
            </div>

            <div className="stat-block">
              <span className="stat-label">
                DETECTIONS
              </span>
              <strong className="stat-value">
                {detections.length}
              </strong>
              <span className="stat-foot">
                detection records
              </span>
            </div>

            <div className="stat-block">
              <span className="stat-label">
                NOTES
              </span>
              <strong className="stat-value">
                {notes.length}
              </strong>
              <span className="stat-foot">
                analyst observations
              </span>
            </div>

          </div>

        </div>

      </section>

      {/* =========================================
          DETECTIONS
          ========================================= */}

      <section className="nc-panel section-block">

        <div className="panel-header">
          <div>
            <div className="panel-eyebrow">
              ANALYSIS RESULTS
            </div>
            <h2 className="panel-title">
              DETECTIONS
            </h2>
          </div>

          <span className="panel-count">
            {filteredDetections.length}{" "}
            {filteredDetections.length === 1
              ? "DETECTION"
              : "DETECTIONS"}
          </span>
        </div>

        <div className="case-section-toolbar">
          <div className="nc-input-wrap">
            <input
              className="nc-input"
              type="text"
              placeholder="Search detections..."
              value={detectionSearch}
              onChange={(e) =>
                setDetectionSearch(e.target.value)
              }
            />
          </div>
        </div>

        <div className="case-table artifact-table">

          <div className="artifact-row artifact-head detection-head">
            <div className="col-time">TIME</div>
            <div>EVENT TYPE</div>
            <div>HOST</div>
            <div>USER</div>
            <div className="col-status">SEVERITY</div>
            <div>RULE</div>
            <div>MITRE TECHNIQUE</div>
          </div>

          {filteredDetections.length === 0 ? (
            <div className="nc-empty">
              <div className="nc-empty-title">
                {detectionSearch
                  ? "No detections match your search."
                  : "No detections for this case."}
              </div>
              <div className="nc-empty-hint">
                Run detection against EVTX evidence and save the results
                into this case.
              </div>
            </div>
          ) : (
            filteredDetections.map((detection) => (
              <div
                className="artifact-row artifact-item detection-row"
                key={detection.id}
                onClick={() => setSelectedDetection(detection)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setSelectedDetection(detection);
                  }
                }}
              >
                <div className="col-time mono dim">
                  {formatDate(detection.time)}
                </div>
                <div className="row-name">
                  {detection.event_type || "—"}
                </div>
                <div className="mono dim">
                  {detection.host || "—"}
                </div>
                <div>
                  {detection.user || "—"}
                </div>
                <div className="col-status">
                  <span className={getSeverityClass(detection.severity)}>
                    {detection.severity || "—"}
                  </span>
                </div>
                <div className="mono dim">
                  {detection.detection_rule || "—"}
                </div>
                <div className="mono">
                  {detection.mitre_technique || "—"}
                </div>
              </div>
            ))
          )}

        </div>

      </section>

      {/* =========================================
          EVENTS
          ========================================= */}

      <section className="nc-panel section-block">

        <div className="panel-header">
          <div>
            <div className="panel-eyebrow">
              CASE EVIDENCE
            </div>
            <h2 className="panel-title">
              EVENTS
            </h2>
          </div>

          <span className="panel-count">
            {filteredEvents.length}{" "}
            {filteredEvents.length === 1
              ? "EVENT"
              : "EVENTS"}
          </span>
        </div>

        <div className="case-section-toolbar">
          <div className="nc-input-wrap">
            <input
              className="nc-input"
              type="text"
              placeholder="Search event files..."
              value={eventSearch}
              onChange={(e) =>
                setEventSearch(e.target.value)
              }
            />
          </div>
        </div>

        <div className="case-table artifact-table">

          <div className="artifact-row artifact-head event-head">
            <div>FILE</div>
            <div>TYPE</div>
            <div className="col-path">LOCATION</div>
            <div className="col-size">SIZE</div>
            <div className="col-time">ADDED</div>
            <div className="col-action">STATUS</div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="nc-empty">
              <div className="nc-empty-title">
                {eventSearch
                  ? "No events match your search."
                  : "No event records associated with this case."}
              </div>
              <div className="nc-empty-hint">
                Save analysis output from Log Analysis into a case to
                associate event records here.
              </div>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div
                className="artifact-row artifact-item event-row"
                key={event.id}
              >
                <div className="row-name mono">
                  {event.file_name || "—"}
                </div>
                <div>
                  <span className="file-type">
                    {event.file_type || "—"}
                  </span>
                </div>
                <div className="col-path mono dim">
                  {event.file_path || "—"}
                </div>
                <div className="col-size mono dim">
                  {formatFileSize(event.file_size)}
                </div>
                <div className="col-time mono dim">
                  {formatDate(event.created_at)}
                </div>
                <div className="col-action">
                  <div className="row-actions">
                    <span className="nc-badge plain">
                      SAVED
                    </span>
                    <button
                      className="nc-btn nc-btn-sm"
                      onClick={() => setViewingEvent(event)}
                    >
                      VIEW JSON
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

        </div>

      </section>

      {/* =========================================
          NOTES
          ========================================= */}

      <section className="nc-panel section-block">

        <div className="panel-header">
          <div>
            <div className="panel-eyebrow">
              ANALYST WORKSPACE
            </div>
            <h2 className="panel-title">
              INVESTIGATION NOTES
            </h2>
          </div>

          <span className="panel-count">
            {notes.length}{" "}
            {notes.length === 1 ? "NOTE" : "NOTES"}
          </span>
        </div>

        <div className="notes-body">

          {notes.length === 0 ? (
            <div className="nc-empty">
              <div className="nc-empty-title">
                No investigation notes
              </div>
              <div className="nc-empty-hint">
                Add observations, findings, or investigative context below.
              </div>
            </div>
          ) : (
            notes.map((note, index) => (
              <article
                className="note-card"
                key={note.id}
              >
                <div className="note-card-header">
                  <div className="note-identity">
                    <span className="mono note-number">
                      #{String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="note-label">
                      INVESTIGATION NOTE
                    </span>
                  </div>
                  <span className="note-date mono dim">
                    {formatDate(
                      note.updated_at ||
                      note.created_at
                    )}
                  </span>
                </div>

                {editingNoteId === note.id ? (
                  <div className="note-edit-area">
                    <textarea
                      className="nc-textarea"
                      value={editingNoteContent}
                      onChange={(e) =>
                        setEditingNoteContent(
                          e.target.value
                        )
                      }
                    />

                    <div className="note-edit-actions">
                      <button
                        className="nc-btn nc-btn-primary nc-btn-sm"
                        onClick={() =>
                          handleUpdateNote(note.id)
                        }
                      >
                        SAVE
                      </button>
                      <button
                        className="nc-btn nc-btn-sm"
                        onClick={cancelEditingNote}
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="note-content">
                      {note.content}
                    </div>

                    <div className="note-card-footer">
                      <span className="note-created mono dim">
                        CREATED {formatDate(note.created_at)}
                      </span>

                      <div className="note-actions">
                        <button
                          className="nc-btn nc-btn-sm"
                          onClick={() => startEditingNote(note)}
                        >
                          EDIT
                        </button>
                        <button
                          className="nc-btn nc-btn-sm nc-btn-danger"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          DELETE
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </article>
            ))
          )}

          <form
            className="add-note-box"
            onSubmit={handleCreateNote}
          >
            <div>
              <div className="nc-field-label">
                ADD INVESTIGATION NOTE
              </div>
              <div className="add-note-description">
                Record an observation, finding, or investigative thought.
              </div>
            </div>

            <textarea
              className="nc-textarea"
              value={noteContent}
              onChange={(e) =>
                setNoteContent(e.target.value)
              }
              placeholder="Write an investigation note..."
            />

            <div className="add-note-actions">
              <span className="mono dim short-hint">
                ASSOCIATED WITH CASE-{caseData.id}
              </span>

              <button
                type="submit"
                className="nc-btn nc-btn-primary"
              >
                ADD NOTE
              </button>
            </div>
          </form>

        </div>

      </section>

      {/* =========================================
          DETECTION DETAIL MODAL
          ========================================= */}

      {selectedDetection && (
        <div
          className="nc-modal-overlay"
          onClick={() => setSelectedDetection(null)}
        >
          <div
            className="nc-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nc-modal-header">
              <div>
                <div className="nc-modal-eyebrow">
                  DETECTION RECORD
                </div>
                <h2 className="nc-modal-title">
                  Detection #{selectedDetection.id}
                </h2>
              </div>
              <button
                className="nc-modal-close"
                onClick={() => setSelectedDetection(null)}
              >
                ×
              </button>
            </div>

            <div className="nc-modal-body">
              <div className="record-grid">
                {Object.entries(
                  selectedDetection
                ).map(([key, value]) => (
                  <div
                    className="record-field"
                    key={key}
                  >
                    <div className="nc-field-label">
                      {key
                        .replaceAll("_", " ")
                        .toUpperCase()}
                    </div>
                    <div className="record-value">
                      {value === null ||
                      value === undefined ||
                      value === ""
                        ? "—"
                        : typeof value === "object"
                        ? JSON.stringify(
                            value,
                            null,
                            2
                          )
                        : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="nc-modal-footer">
              <span className="mono dim">
                DETECTION ASSOCIATED WITH CASE-{caseData.id}
              </span>
              <button
                className="nc-btn"
                onClick={() => setSelectedDetection(null)}
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          GENERATE REPORT MODAL
          ========================================= */}

      {showReportModal && (
        <div
          className="nc-modal-overlay"
          onClick={() => setShowReportModal(false)}
        >
          <div
            className="nc-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nc-modal-header">
              <div>
                <div className="nc-modal-eyebrow">
                  CASE EXPORT
                </div>
                <h2 className="nc-modal-title">
                  Generate Report
                </h2>
              </div>
              <button
                className="nc-modal-close"
                onClick={() => setShowReportModal(false)}
              >
                ×
              </button>
            </div>

            <div className="nc-modal-body">

              {reportError && (
                <div className="nc-error-banner">
                  {reportError}
                </div>
              )}

              <p className="nc-modal-text">
                Generate a report containing the evidence, events,
                detections, notes and investigation metadata for{" "}
                <strong>{caseData.case_name}</strong>.
              </p>

              <div className="nc-field">
                <label className="nc-field-label" htmlFor="report-format">
                  REPORT FORMAT
                </label>

                <div className="report-format-grid" id="report-format">
                  {REPORT_FORMATS.map((format) => (
                    <button
                      type="button"
                      key={format.value}
                      className={
                        "report-format-option" +
                        (reportFormat === format.value
                          ? " selected"
                          : "")
                      }
                      onClick={() =>
                        setReportFormat(format.value)
                      }
                    >
                      <span className="report-format-name">
                        {format.label}
                      </span>
                      <span className="report-format-hint">
                        {format.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div className="nc-modal-footer">
              <span className="report-footer-hint mono dim">
                CASE-{String(caseData.id).padStart(3, "0")}
                {" · "}
                {events.length + detections.length + notes.length}
                {" "}ARTIFACTS
              </span>

              <button
                className="nc-btn"
                onClick={() => setShowReportModal(false)}
                disabled={reportGenerating}
              >
                CANCEL
              </button>

              <button
                className="nc-btn nc-btn-primary"
                onClick={handleGenerateReport}
                disabled={reportGenerating}
              >
                {reportGenerating
                  ? "GENERATING..."
                  : "GENERATE REPORT"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          EDIT CASE MODAL
          ========================================= */}

      {showEdit && (
        <div
          className="nc-modal-overlay"
          onClick={() => setShowEdit(false)}
        >
          <div
            className="nc-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nc-modal-header">
              <div>
                <div className="nc-modal-eyebrow">
                  CASE MANAGEMENT
                </div>
                <h2 className="nc-modal-title">
                  Edit Case
                </h2>
              </div>
              <button
                className="nc-modal-close"
                onClick={() => setShowEdit(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateCase}>
              <div className="nc-modal-body">

                <div className="nc-field">
                  <label className="nc-field-label" htmlFor="edit-case-name">
                    CASE NAME
                  </label>
                  <input
                    id="edit-case-name"
                    name="case_name"
                    className="nc-input"
                    type="text"
                    value={editForm.case_name}
                    onChange={handleEditChange}
                    required
                  />
                </div>

                <div className="nc-field">
                  <label className="nc-field-label" htmlFor="edit-case-description">
                    DESCRIPTION
                  </label>
                  <textarea
                    id="edit-case-description"
                    name="description"
                    className="nc-textarea"
                    value={editForm.description}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="nc-field">
                  <label className="nc-field-label" htmlFor="edit-case-status">
                    STATUS
                  </label>
                  <select
                    id="edit-case-status"
                    name="status"
                    className="nc-select"
                    value={editForm.status}
                    onChange={handleEditChange}
                  >
                    <option value="Open">Open</option>
                    <option value="Investigating">Investigating</option>
                    <option value="Reviewing">Reviewing</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

              </div>

              <div className="nc-modal-footer">
                <button
                  type="button"
                  className="nc-btn"
                  onClick={() => setShowEdit(false)}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="nc-btn nc-btn-primary"
                >
                  SAVE CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          DELETE CONFIRMATION
          ========================================= */}

      {showDeleteConfirm && (
        <div
          className="nc-modal-overlay"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="nc-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nc-modal-header">
              <div>
                <div className="nc-modal-eyebrow">
                  DESTRUCTIVE ACTION
                </div>
                <h2 className="nc-modal-title">
                  Delete Case
                </h2>
              </div>
              <button
                className="nc-modal-close"
                onClick={() => setShowDeleteConfirm(false)}
              >
                ×
              </button>
            </div>

            <div className="nc-modal-body">
              <p className="nc-modal-text">
                Are you sure you want to delete{" "}
                <strong>{caseData.case_name}</strong>?
              </p>
              <p className="nc-modal-detail">
                This will permanently delete the case and its related
                detections, events, notes, and evidence files.
              </p>
            </div>

            <div className="nc-modal-footer">
              <button
                className="nc-btn"
                onClick={() => setShowDeleteConfirm(false)}
              >
                CANCEL
              </button>
              <button
                className="nc-btn nc-btn-danger"
                onClick={handleDeleteCase}
              >
                DELETE CASE
              </button>
            </div>
          </div>
        </div>
      )}

    {/* =========================================
          EVENT JSON VIEWER
          ========================================= */}

      {viewingEvent && (
        <EventJsonViewer
          event={viewingEvent}
          onClose={() => setViewingEvent(null)}
        />
      )}

    </div>
  );
}


export default CaseDetail;