import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import "./CaseDetail.css";

import {
  getCase,
  updateCase,
  deleteCase,
} from "../../../api/caseApi";

import {
  getDetections,
} from "../../../api/detectionApi";

import {
  getEvents,
} from "../../../api/eventApi";

import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
} from "../../../api/noteApi";


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

  const [selectedDetection, setSelectedDetection] = useState(null);

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
    return String(severity || "")
      .trim()
      .toLowerCase();
  };


  /*
   * =========================================
   * LOAD CASE DATA
   * =========================================
   */

  useEffect(() => {
    loadCaseData();
  }, [caseId]);


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
        case: Number(caseId),
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
        <div className="case-loading">
          <div className="loading-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>

          Loading case...
        </div>
      </div>
    );
  }


  if (!caseData) {
    return (
      <div className="case-detail-page">
        <div className="case-error">
          Case could not be found.
        </div>
      </div>
    );
  }


  return (
    <div className="case-detail-page">


      {/* =========================================
          HEADER
          ========================================= */}

      <section className="case-top-section">

        <div className="case-breadcrumb">

          <span className="breadcrumb-muted">
            CASES
          </span>

          <span className="breadcrumb-separator">
            /
          </span>

          <span>
            CASE DETAIL
          </span>

        </div>


        <div className="case-header">

          <div className="case-header-left">

            <div className="case-title-row">

              <span className="case-id">
                CASE-{String(caseData.id).padStart(3, "0")}
              </span>

              <span className="case-title-separator">
                /
              </span>

              <h1>
                {caseData.case_name}
              </h1>

            </div>


            <div className="case-meta">

              <span className="case-meta-item">

                <span className="meta-label">
                  STATUS
                </span>

                <span className="case-status">
                  <span className="status-dot"></span>
                  {caseData.status || "—"}
                </span>

              </span>


              <span className="case-meta-divider">
                •
              </span>


              <span className="case-meta-item">

                <span className="meta-label">
                  CREATED
                </span>

                {formatDate(
                  caseData.created_at
                )}

              </span>


              <span className="case-meta-divider">
                •
              </span>


              <span className="case-meta-item">

                <span className="meta-label">
                  UPDATED
                </span>

                {formatDate(
                  caseData.updated_at
                )}

              </span>

            </div>

          </div>


          <div className="case-header-actions">

            <button
              className="case-action-button"
              onClick={() =>
                setShowEdit(true)
              }
            >
              EDIT
            </button>


            <button
              className="case-action-button delete-button"
              onClick={() =>
                setShowDeleteConfirm(true)
              }
            >
              DELETE
            </button>

          </div>

        </div>

      </section>


      {/* =========================================
          MAIN CONTENT
          ========================================= */}

      <main className="case-content-scrollable">

        {error && (
          <div className="case-error">
            <span className="error-icon">
              !
            </span>

            {error}
          </div>
        )}


        {/* =========================================
            CASE OVERVIEW
            ========================================= */}

        <section className="section-block">

          <div className="section-heading-row">

            <div className="section-title-group">

              <div className="section-eyebrow">
                INVESTIGATION
              </div>

              <h2 className="section-header">
                CASE OVERVIEW
              </h2>

            </div>

          </div>


          <div className="overview-layout">

            <div className="overview-main-card">

              <div className="overview-label">
                CASE DESCRIPTION
              </div>

              <div className="overview-description-text">
                {caseData.description ||
                  "No description provided for this investigation."}
              </div>

            </div>


            <div className="overview-meta-grid">

              <div className="overview-small-card">

                <div className="overview-label">
                  STATUS
                </div>

                <div className="overview-status-value">
                  <span className="status-dot"></span>

                  {caseData.status || "—"}
                </div>

              </div>


              <div className="overview-small-card">

                <div className="overview-label">
                  CREATED
                </div>

                <div className="overview-value">
                  {formatDate(
                    caseData.created_at
                  )}
                </div>

              </div>


              <div className="overview-small-card">

                <div className="overview-label">
                  LAST UPDATED
                </div>

                <div className="overview-value">
                  {formatDate(
                    caseData.updated_at
                  )}
                </div>

              </div>

            </div>

          </div>


          {/* Investigation Statistics */}

          <div className="investigation-stats">

            <div className="investigation-stat">

              <div className="stat-icon event-stat-icon">
                EV
              </div>

              <div className="stat-content">

                <span className="stat-label">
                  EVENT FILES
                </span>

                <strong>
                  {events.length}
                </strong>

                <span className="stat-description">
                  Evidence records
                </span>

              </div>

            </div>


            <div className="investigation-stat">

              <div className="stat-icon detection-stat-icon">
                DT
              </div>

              <div className="stat-content">

                <span className="stat-label">
                  DETECTIONS
                </span>

                <strong>
                  {detections.length}
                </strong>

                <span className="stat-description">
                  Detection records
                </span>

              </div>

            </div>


            <div className="investigation-stat">

              <div className="stat-icon note-stat-icon">
                NT
              </div>

              <div className="stat-content">

                <span className="stat-label">
                  NOTES
                </span>

                <strong>
                  {notes.length}
                </strong>

                <span className="stat-description">
                  Analyst observations
                </span>

              </div>

            </div>

          </div>

        </section>


        {/* =========================================
            DETECTIONS
            ========================================= */}

        <section className="section-block">

          <div className="section-heading-row">

            <div className="section-title-group">

              <div className="section-eyebrow">
                ANALYSIS RESULTS
              </div>

              <h2 className="section-header">
                DETECTIONS
              </h2>

              <p className="section-description">
                Detection results associated with this case.
              </p>

            </div>


            <span className="section-count">

              {filteredDetections.length}

              {" "}

              {filteredDetections.length === 1
                ? "DETECTION"
                : "DETECTIONS"}

            </span>

          </div>


          <div className="section-toolbar">

            <div className="table-search">

              <span className="search-symbol">
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search detections..."
                value={detectionSearch}
                onChange={(e) =>
                  setDetectionSearch(
                    e.target.value
                  )
                }
              />

              {detectionSearch && (
                <button
                  className="clear-search"
                  onClick={() =>
                    setDetectionSearch("")
                  }
                  type="button"
                >
                  ×
                </button>
              )}

            </div>

          </div>


          <div className="table-wrapper">

            <table className="soc-table detections-table">

              <thead>

                <tr>
                  <th>TIME</th>
                  <th>EVENT TYPE</th>
                  <th>HOST</th>
                  <th>USER</th>
                  <th>SEVERITY</th>
                  <th>RULE</th>
                  <th>MITRE TECHNIQUE</th>
                </tr>

              </thead>


              <tbody>

                {filteredDetections.length === 0 ? (

                  <tr>

                    <td
                      colSpan="7"
                      className="empty-row"
                    >
                      {detectionSearch
                        ? "No detections match your search."
                        : "No detections for this case."}
                    </td>

                  </tr>

                ) : (

                  filteredDetections.map(
                    (detection) => (

                      <tr
                        key={detection.id}
                        className="clickable-row"
                        onClick={() =>
                          setSelectedDetection(
                            detection
                          )
                        }
                      >

                        <td className="time-col">
                          {formatDate(
                            detection.time
                          )}
                        </td>


                        <td className="bold-col">
                          {detection.event_type ||
                            "—"}
                        </td>


                        <td>
                          {detection.host ||
                            "—"}
                        </td>


                        <td>
                          {detection.user ||
                            "—"}
                        </td>


                        <td>

                          <span
                            className={`badge ${getSeverityClass(
                              detection.severity
                            )}`}
                          >
                            {detection.severity ||
                              "—"}
                          </span>

                        </td>


                        <td className="code-col">
                          {detection.detection_rule ||
                            "—"}
                        </td>


                        <td className="highlight-col">
                          {detection.mitre_technique ||
                            "—"}
                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>


          {filteredDetections.length > 0 && (
            <div className="table-hint">
              Select a detection to inspect the complete record.
            </div>
          )}

        </section>


        {/* =========================================
            EVENTS
            ========================================= */}

        <section className="section-block">

          <div className="section-heading-row">

            <div className="section-title-group">

              <div className="section-eyebrow">
                CASE EVIDENCE
              </div>

              <h2 className="section-header">
                EVENTS
              </h2>

              <p className="section-description">
                Evidence files associated with this investigation.
              </p>

            </div>


            <span className="section-count">

              {filteredEvents.length}

              {" "}

              {filteredEvents.length === 1
                ? "EVENT"
                : "EVENTS"}

            </span>

          </div>


          <div className="section-toolbar">

            <div className="table-search">

              <span className="search-symbol">
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search event files..."
                value={eventSearch}
                onChange={(e) =>
                  setEventSearch(
                    e.target.value
                  )
                }
              />

              {eventSearch && (
                <button
                  className="clear-search"
                  onClick={() =>
                    setEventSearch("")
                  }
                  type="button"
                >
                  ×
                </button>
              )}

            </div>

          </div>


          <div className="table-wrapper">

            <table className="soc-table events-table">

              <thead>

                <tr>
                  <th>FILE</th>
                  <th>TYPE</th>
                  <th>LOCATION</th>
                  <th>SIZE</th>
                  <th>ADDED</th>
                </tr>

              </thead>


              <tbody>

                {filteredEvents.length === 0 ? (

                  <tr>

                    <td
                      colSpan="5"
                      className="empty-row"
                    >
                      {eventSearch
                        ? "No events match your search."
                        : "No event records associated with this case."}
                    </td>

                  </tr>

                ) : (

                  filteredEvents.map(
                    (event) => (

                      <tr
                        key={event.id}
                        className="event-row"
                      >

                        <td className="bold-col">

                          <div className="file-name-cell">

                            <span className="file-icon">
                              ▫
                            </span>

                            <span>
                              {event.file_name ||
                                "—"}
                            </span>

                          </div>

                        </td>


                        <td>

                          <span className="file-type-badge">
                            {event.file_type ||
                              "—"}
                          </span>

                        </td>


                        <td className="code-col">
                          {event.file_path ||
                            "—"}
                        </td>


                        <td className="file-size-col">
                          {formatFileSize(
                            event.file_size
                          )}
                        </td>


                        <td className="time-col">
                          {formatDate(
                            event.created_at
                          )}
                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>

        </section>


        {/* =========================================
            NOTES
            ========================================= */}

        <section className="section-block">

          <div className="section-heading-row">

            <div className="section-title-group">

              <div className="section-eyebrow">
                ANALYST WORKSPACE
              </div>

              <h2 className="section-header">
                INVESTIGATION NOTES
              </h2>

              <p className="section-description">
                Analyst observations and investigation notes for this case.
              </p>

            </div>


            <span className="section-count">

              {notes.length}

              {" "}

              {notes.length === 1
                ? "NOTE"
                : "NOTES"}

            </span>

          </div>


          <div className="notes-container">

            {notes.length === 0 ? (

              <div className="empty-notes">

                <div className="empty-notes-marker">
                  +
                </div>

                <div className="empty-notes-title">
                  No investigation notes
                </div>

                <div className="empty-notes-description">
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

                    <div className="note-card-identity">

                      <span className="note-number">
                        #{String(index + 1).padStart(2, "0")}
                      </span>

                      <span className="note-label">
                        INVESTIGATION NOTE
                      </span>

                    </div>


                    <span className="note-date">
                      {formatDate(
                        note.updated_at ||
                        note.created_at
                      )}
                    </span>

                  </div>


                  {editingNoteId === note.id ? (

                    <div className="note-edit-area">

                      <textarea
                        className="note-edit-input"
                        value={editingNoteContent}
                        onChange={(e) =>
                          setEditingNoteContent(
                            e.target.value
                          )
                        }
                      />


                      <div className="note-edit-actions">

                        <button
                          className="soc-btn"
                          onClick={() =>
                            handleUpdateNote(
                              note.id
                            )
                          }
                        >
                          SAVE
                        </button>


                        <button
                          className="soc-btn secondary-btn"
                          onClick={
                            cancelEditingNote
                          }
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

                        <span className="note-created">
                          Created{" "}
                          {formatDate(
                            note.created_at
                          )}
                        </span>


                        <div className="note-actions">

                          <button
                            className="soc-btn"
                            onClick={() =>
                              startEditingNote(
                                note
                              )
                            }
                          >
                            EDIT
                          </button>


                          <button
                            className="soc-btn delete-note-button"
                            onClick={() =>
                              handleDeleteNote(
                                note.id
                              )
                            }
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


            {/* Add Note */}

            <form
              className="add-note-box"
              onSubmit={handleCreateNote}
            >

              <div className="add-note-header">

                <div className="add-note-title">
                  ADD INVESTIGATION NOTE
                </div>

                <div className="add-note-description">
                  Record an observation, finding, or investigative thought.
                </div>

              </div>


              <textarea
                value={noteContent}
                onChange={(e) =>
                  setNoteContent(
                    e.target.value
                  )
                }
                placeholder="Write an investigation note..."
              />


              <div className="add-note-actions">

                <span className="shortcut-hint">
                  Associated with CASE-{caseData.id}
                </span>


                <button
                  type="submit"
                  className="soc-btn add-note-button"
                >
                  ADD NOTE
                </button>

              </div>

            </form>

          </div>

        </section>

      </main>


      {/* =========================================
          DETECTION DETAIL MODAL
          ========================================= */}

      {selectedDetection && (

        <div
          className="modal-overlay"
          onClick={() =>
            setSelectedDetection(null)
          }
        >

          <div
            className="record-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="record-modal-header">

              <div>

                <div className="record-modal-label">
                  DETECTION RECORD
                </div>

                <h2>
                  Detection #{selectedDetection.id}
                </h2>

              </div>


              <button
                className="modal-close"
                onClick={() =>
                  setSelectedDetection(null)
                }
              >
                ×
              </button>

            </div>


            <div className="record-modal-body">

              <div className="record-grid">

                {Object.entries(
                  selectedDetection
                ).map(
                  ([key, value]) => (

                    <div
                      className="record-field"
                      key={key}
                    >

                      <div className="record-field-label">
                        {key
                          .replaceAll("_", " ")
                          .toUpperCase()}
                      </div>


                      <div className="record-field-value">

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

                  )
                )}

              </div>

            </div>


            <div className="record-modal-footer">

              <span>
                Detection associated with CASE-{caseData.id}
              </span>


              <button
                className="soc-btn"
                onClick={() =>
                  setSelectedDetection(null)
                }
              >
                CLOSE
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
          className="modal-overlay"
          onClick={() =>
            setShowEdit(false)
          }
        >

          <div
            className="case-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>

                <div className="modal-eyebrow">
                  CASE MANAGEMENT
                </div>

                <h2>
                  Edit Case
                </h2>

              </div>


              <button
                className="modal-close"
                onClick={() =>
                  setShowEdit(false)
                }
              >
                ×
              </button>

            </div>


            <form
              onSubmit={handleUpdateCase}
            >

              <div className="modal-body">

                <div className="modal-form-group">

                  <label htmlFor="edit-case-name">
                    CASE NAME
                  </label>

                  <input
                    id="edit-case-name"
                    name="case_name"
                    type="text"
                    value={editForm.case_name}
                    onChange={
                      handleEditChange
                    }
                    required
                  />

                </div>


                <div className="modal-form-group">

                  <label htmlFor="edit-case-description">
                    DESCRIPTION
                  </label>

                  <textarea
                    id="edit-case-description"
                    name="description"
                    value={
                      editForm.description
                    }
                    onChange={
                      handleEditChange
                    }
                  />

                </div>


                <div className="modal-form-group">

                  <label htmlFor="edit-case-status">
                    STATUS
                  </label>

                  <select
                    id="edit-case-status"
                    name="status"
                    value={editForm.status}
                    onChange={
                      handleEditChange
                    }
                  >

                    <option value="Open">
                      Open
                    </option>

                    <option value="Investigating">
                      Investigating
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


              <div className="modal-footer">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={() =>
                    setShowEdit(false)
                  }
                >
                  CANCEL
                </button>


                <button
                  type="submit"
                  className="create-button"
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
          className="modal-overlay"
          onClick={() =>
            setShowDeleteConfirm(false)
          }
        >

          <div
            className="case-modal delete-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>

                <div className="modal-eyebrow">
                  DESTRUCTIVE ACTION
                </div>

                <h2>
                  Delete Case
                </h2>

              </div>


              <button
                className="modal-close"
                onClick={() =>
                  setShowDeleteConfirm(false)
                }
              >
                ×
              </button>

            </div>


            <div className="modal-body">

              <p className="delete-warning">

                Are you sure you want to delete

                <strong>
                  {" "}
                  {caseData.case_name}
                </strong>
                ?

              </p>


              <p className="delete-warning-detail">

                This will permanently delete the case
                and its related detections, events,
                notes, and evidence files.

              </p>

            </div>


            <div className="modal-footer">

              <button
                className="cancel-button"
                onClick={() =>
                  setShowDeleteConfirm(false)
                }
              >
                CANCEL
              </button>


              <button
                className="delete-confirm-button"
                onClick={handleDeleteCase}
              >
                DELETE CASE
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}


export default CaseDetail;