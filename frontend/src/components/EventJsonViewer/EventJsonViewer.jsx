import { useEffect, useMemo, useState } from "react";
import "./EventJsonViewer.css";
import { getEventContent } from "../../api/eventApi";

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

function EventJsonViewer({ event, onClose }) {
  const [content, setContent] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    setContent(null);
    setError("");

    if (!event?.id) {
      setError("This event record has no JSON to view.");
      return undefined;
    }

    getEventContent(event.id)
      .then((data) => {
        if (!cancelled) {
          setContent(typeof data.content === "string" ? data.content : "");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to load event JSON.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [event?.id]);

  const formatted = useMemo(() => {
    if (!content) {
      return content;
    }
    try {
      return JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      return content;
    }
  }, [content]);

  return (
    <div className="nc-modal-overlay" onClick={onClose}>
      <div
        className="nc-modal nc-modal-json"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="nc-modal-header">
          <div className="event-json-header">
            <div className="nc-modal-eyebrow">
              EVENT RECORD / JSON
            </div>
            <h2 className="nc-modal-title">
              {event?.file_name || "Event JSON"}
            </h2>
          </div>
          <button
            type="button"
            className="nc-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="nc-modal-body event-json-body">
          <div className="event-json-meta">
            <span className="nc-badge plain">{event?.file_type || "JSON"}</span>
            <span className="event-json-meta-item">
              <span className="nc-field-label">SIZE</span>
              <span className="mono">{formatFileSize(event?.file_size)}</span>
            </span>
            <span className="event-json-meta-item">
              <span className="nc-field-label">CREATED</span>
              <span className="mono dim">
                {formatDate(event?.created_at)}
              </span>
            </span>
          </div>

          {error ? (
            <div className="nc-error-banner">{error}</div>
          ) : content === null ? (
            <div className="nc-empty">
              <div className="nc-empty-title">Loading event JSON...</div>
            </div>
          ) : (
            <pre className="event-json-content">
              {formatted}
            </pre>
          )}
        </div>

        <div className="nc-modal-footer">
          <span className="mono dim">
            SAVED EVENT {event?.id ? `#${event.id}` : ""}
          </span>
          <button type="button" className="nc-btn" onClick={onClose}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

export default EventJsonViewer;