import { useEffect, useState } from "react";
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

  const [editForm, setEditForm] = useState({
    case_name: "",
    description: "",
    status: "",
  });

  const [noteContent, setNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");

  /*
   * Convert API responses into arrays.
   *
   * This also works if Django later returns:
   * { results: [...] }
   * instead of directly returning [...]
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

  /*
   * Load all information required by this case page.
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

      /*
       * Populate edit form using the actual case data.
       */
      setEditForm({
        case_name: currentCase.case_name || "",
        description: currentCase.description || "",
        status: currentCase.status || "",
      });

      /*
       * The current APIs return all records.
       * Therefore the frontend filters records belonging
       * to the current case.
       */
      const detectionList = extractList(detectionsResponse);
      const eventList = extractList(eventsResponse);
      const noteList = extractList(notesResponse);

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
      setError(err.message || "Failed to fetch case data.");
    } finally {
      setLoading(false);
    }
  };


  /*
   * EDIT CASE
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

      const updatedCase = await updateCase(caseId, {
        case_name: editForm.case_name,
        description: editForm.description,
        status: editForm.status,
      });

      setCaseData(updatedCase);

      setEditForm({
        case_name: updatedCase.case_name || "",
        description: updatedCase.description || "",
        status: updatedCase.status || "",
      });

      setShowEdit(false);

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update case.");
    }
  };


  /*
   * DELETE CASE
   *
   * Django's Case ForeignKey relationships use
   * on_delete=models.CASCADE, so deleting the Case
   * also deletes its related Events, Detections,
   * Notes and EvidenceFiles.
   */
  const handleDeleteCase = async () => {
    try {
      setError("");

      await deleteCase(caseId);

      navigate("/cases");

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete case.");
    }
  };


  /*
   * CREATE NOTE
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
      setError(err.message || "Failed to create note.");
    }
  };


  /*
   * START NOTE EDIT
   */
  const startEditingNote = (note) => {
    setEditingNoteId(note.id);
    setEditingNoteContent(note.content || "");
  };


  /*
   * CANCEL NOTE EDIT
   */
  const cancelEditingNote = () => {
    setEditingNoteId(null);
    setEditingNoteContent("");
  };


  /*
   * UPDATE NOTE
   */
  const handleUpdateNote = async (noteId) => {
    if (!editingNoteContent.trim()) {
      return;
    }

    try {
      setError("");

      const updatedNote = await updateNote(noteId, {
        content: editingNoteContent.trim(),
      });

      setNotes((previous) =>
        previous.map((note) =>
          note.id === noteId ? updatedNote : note
        )
      );

      cancelEditingNote();

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update note.");
    }
  };


  /*
   * DELETE NOTE
   */
  const handleDeleteNote = async (noteId) => {
    try {
      setError("");

      await deleteNote(noteId);

      setNotes((previous) =>
        previous.filter((note) => note.id !== noteId)
      );

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete note.");
    }
  };


  /*
   * Loading state
   */
  if (loading) {
    return (
      <div className="case-detail-page">
        <div className="case-loading">
          Loading case...
        </div>
      </div>
    );
  }


  /*
   * Case not found
   */
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

      {/* Header */}
      <section className="case-top-section">

        <div className="case-breadcrumb">
          Cases
          <span>/</span>
          Case Detail
        </div>

        <div className="case-header">

          <div className="case-header-left">

            <div className="case-title-row">

              <span className="case-id">
                #{caseData.id}
              </span>

              <span className="case-title-separator">
                /
              </span>

              <h1>
                {caseData.case_name}
              </h1>

            </div>

            <div className="case-meta">

              <span>
                Status:
                <strong className="case-status">
                  {caseData.status}
                </strong>
              </span>

              <span>
                Created:
                {" "}
                {caseData.created_at
                  ? new Date(caseData.created_at).toLocaleString()
                  : "—"}
              </span>

              <span>
                Updated:
                {" "}
                {caseData.updated_at
                  ? new Date(caseData.updated_at).toLocaleString()
                  : "—"}
              </span>

            </div>

          </div>

          <div className="case-header-actions">

            <button
              className="case-action-button"
              onClick={() => setShowEdit(true)}
            >
              Edit
            </button>

            <button
              className="case-action-button delete-button"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </button>

          </div>

        </div>

      </section>


      {/* Main Content */}
      <main className="case-content-scrollable">

        {error && (
          <div className="case-error">
            {error}
          </div>
        )}


        {/* Description */}
        <section className="section-block">

          <h2 className="section-header">
            CASE DESCRIPTION
          </h2>

          <div className="description-box">
            {caseData.description || "No description provided."}
          </div>

        </section>


        {/* Detections */}
        <section className="section-block">

          <h2 className="section-header">
            DETECTIONS
          </h2>

          <div className="table-wrapper">

            <table className="soc-table">

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

                {detections.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="empty-row"
                    >
                      No detections for this case.
                    </td>
                  </tr>
                ) : (

                  detections.map((detection) => (

                    <tr key={detection.id}>

                      <td className="time-col">
                        {detection.time
                          ? new Date(
                              detection.time
                            ).toLocaleString()
                          : "—"}
                      </td>

                      <td className="bold-col">
                        {detection.event_type || "—"}
                      </td>

                      <td>
                        {detection.host || "—"}
                      </td>

                      <td>
                        {detection.user || "—"}
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            String(
                              detection.severity || ""
                            ).toLowerCase()
                          }`}
                        >
                          {detection.severity || "—"}
                        </span>
                      </td>

                      <td className="code-col">
                        {detection.detection_rule || "—"}
                      </td>

                      <td className="highlight-col">
                        {detection.mitre_technique || "—"}
                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

        </section>


        {/* Events */}
        <section className="section-block">

          <h2 className="section-header">
            EVENTS
          </h2>

          <div className="events-toolbar">

            <input
              className="soc-input"
              type="text"
              placeholder="Search events..."
            />

            <span className="event-count">
              {events.length} event
              {events.length !== 1 ? "s" : ""}
            </span>

          </div>

          <div className="table-wrapper">

            <table className="soc-table">

              <thead>
                <tr>
                  <th>FILE NAME</th>
                  <th>FILE TYPE</th>
                  <th>FILE PATH</th>
                  <th>FILE SIZE</th>
                  <th>CREATED</th>
                </tr>
              </thead>

              <tbody>

                {events.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="empty-row"
                    >
                      No event files associated with this case.
                    </td>
                  </tr>
                ) : (

                  events.map((event) => (

                    <tr key={event.id}>

                      <td className="bold-col">
                        {event.file_name || "—"}
                      </td>

                      <td>
                        {event.file_type || "—"}
                      </td>

                      <td className="code-col">
                        {event.file_path || "—"}
                      </td>

                      <td>
                        {event.file_size ?? "—"}
                      </td>

                      <td className="time-col">
                        {event.created_at
                          ? new Date(
                              event.created_at
                            ).toLocaleString()
                          : "—"}
                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

        </section>


        {/* Notes */}
        <section className="section-block">

          <h2 className="section-header">
            NOTES
          </h2>

          <div className="notes-container">

            {notes.length === 0 ? (
              <div className="empty-notes">
                No notes for this case.
              </div>
            ) : (

              notes.map((note) => (

                <div
                  className="note-item"
                  key={note.id}
                >

                  {editingNoteId === note.id ? (

                    <>
                      <textarea
                        className="note-edit-input"
                        value={editingNoteContent}
                        onChange={(e) =>
                          setEditingNoteContent(
                            e.target.value
                          )
                        }
                      />

                      <div className="note-actions">

                        <button
                          className="soc-btn"
                          onClick={() =>
                            handleUpdateNote(note.id)
                          }
                        >
                          Save
                        </button>

                        <button
                          className="soc-btn"
                          onClick={cancelEditingNote}
                        >
                          Cancel
                        </button>

                      </div>
                    </>

                  ) : (

                    <>
                      <p>
                        {note.content}
                      </p>

                      <div className="note-footer">

                        <span className="note-meta">
                          {note.created_at
                            ? new Date(
                                note.created_at
                              ).toLocaleString()
                            : ""}
                        </span>

                        <div className="note-actions">

                          <button
                            className="soc-btn"
                            onClick={() =>
                              startEditingNote(note)
                            }
                          >
                            Edit
                          </button>

                          <button
                            className="soc-btn delete-note-button"
                            onClick={() =>
                              handleDeleteNote(note.id)
                            }
                          >
                            Delete
                          </button>

                        </div>

                      </div>
                    </>

                  )}

                </div>

              ))

            )}


            {/* Add Note */}
            <form
              className="add-note-box"
              onSubmit={handleCreateNote}
            >

              <label className="add-note-label">
                ADD NOTE
              </label>

              <textarea
                value={noteContent}
                onChange={(e) =>
                  setNoteContent(e.target.value)
                }
                placeholder="Write an investigation note..."
              />

              <div className="add-note-actions">

                <span className="shortcut-hint">
                  Notes are associated with this case.
                </span>

                <button
                  type="submit"
                  className="soc-btn"
                >
                  Add Note
                </button>

              </div>

            </form>

          </div>

        </section>

      </main>


      {/* Edit Case Modal */}
      {showEdit && (

        <div className="modal-overlay">

          <div className="case-modal">

            <div className="modal-header">

              <h2>
                Edit Case
              </h2>

              <button
                className="modal-close"
                onClick={() => setShowEdit(false)}
              >
                ×
              </button>

            </div>

            <form onSubmit={handleUpdateCase}>

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
                    onChange={handleEditChange}
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
                    value={editForm.description}
                    onChange={handleEditChange}
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
                    onChange={handleEditChange}
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
                  onClick={() => setShowEdit(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="create-button"
                >
                  Save Changes
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* Delete Confirmation */}
      {showDeleteConfirm && (

        <div className="modal-overlay">

          <div className="case-modal delete-modal">

            <div className="modal-header">

              <h2>
                Delete Case
              </h2>

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
                Cancel
              </button>

              <button
                className="delete-confirm-button"
                onClick={handleDeleteCase}
              >
                Delete Case
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default CaseDetail;