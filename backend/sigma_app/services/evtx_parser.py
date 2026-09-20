import re
import xml.etree.ElementTree as ET
from pathlib import Path

_NUMERIC_INT_RE = re.compile(r"^[+-]?[0-9]+$")
_NUMERIC_FLOAT_RE = re.compile(r"^[+-]?[0-9]+\.[0-9]+$")


def _local_name(tag):
    """Strip the XML namespace from a tag name."""
    return tag.rsplit("}", 1)[-1]


def _coerce(value):
    """Return int/float for numeric-looking strings, otherwise str."""
    if value is None:
        return None
    if _NUMERIC_INT_RE.match(value):
        try:
            return int(value)
        except ValueError:
            pass
    elif _NUMERIC_FLOAT_RE.match(value):
        try:
            return float(value)
        except ValueError:
            pass
    return value


def _first(*values):
    for value in values:
        if value:
            return value
    return None


class EvtxParser:
    """Parse a binary EVTX file into flat, sigma-friendly event dicts."""

    def __init__(self, path):
        self.path = Path(path)
        self.malformed = 0

    def events(self):
        """Yield normalized event dicts from the EVTX file.

        Yields one dict per event record. Malformed/unparseable records are
        counted and skipped so a single bad record does not abort the scan.
        """
        try:
            import Evtx.Evtx as evtx
        except ImportError as exc:
            raise ImportError(
                "python-evtx is required to parse EVTX files."
            ) from exc

        with evtx.Evtx(str(self.path)) as log:
            records = log.records()

            while True:
                try:
                    record = next(records)
                except StopIteration:
                    break
                except Exception:
                    # A corrupted chunk/file header means the remaining
                    # records cannot be trusted; stop reading the file.
                    self.malformed += 1
                    break

                try:
                    xml_text = record.xml()
                except Exception:
                    self.malformed += 1
                    continue

                if not xml_text:
                    self.malformed += 1
                    continue

                try:
                    event = self._normalize(xml_text)
                except Exception:
                    self.malformed += 1
                    continue

                if event is not None:
                    yield event

    @staticmethod
    def _normalize(xml_text):
        """Turn a single EVTX XML record into a flat field -> value dict.

        Both bare field names and dotted ``Event.System`` /
        ``Event.EventData`` keys are produced so that Sigma rules using
        either style can match. Numeric strings are converted to int/float
        so that rules comparing numbers (e.g. ``EventID: 4624``) work.
        """
        root = ET.fromstring(xml_text)
        event = {}

        for section in root:
            section_name = _local_name(section.tag)
            if section_name == "System":
                for child in section:
                    tag = _local_name(child.tag)
                    text = child.text
                    text = text.strip() if isinstance(text, str) else None

                    if text:
                        value = _coerce(text)
                        event[tag] = value
                        event["Event.System.%s" % tag] = value

                    for attr, attr_value in child.attrib.items():
                        attr_value = _coerce(attr_value)
                        event["Event.System.%s.%s" % (tag, attr)] = attr_value
                        event.setdefault("%s_%s" % (tag, attr), attr_value)

            elif section_name == "EventData":
                for index, child in enumerate(section):
                    name = child.attrib.get("Name")
                    text = child.text
                    text = text.strip() if isinstance(text, str) else None
                    value = _coerce(text)

                    if name:
                        event.setdefault(name, value)
                        event.setdefault("Event.EventData.%s" % name, value)
                    else:
                        # Positional <Data> without a name attribute.
                        event.setdefault("Event.EventData.Data", value)
                        event.setdefault("Data_%04d" % index, value)

        # Convenience fields used by the UI and by several rules.
        if "EventID" in event:
            event.setdefault("event_id", event["EventID"])
        if "Channel" in event:
            event.setdefault("channel", event["Channel"])
        if "Computer" in event:
            event.setdefault("computer", event["Computer"])
        if "TimeCreated_SystemTime" in event:
            event.setdefault("time", event["TimeCreated_SystemTime"])
        user = _first(
            event.get("TargetUserName"),
            event.get("SubjectUserName"),
            event.get("User"),
            event.get("Security_UserID"),
        )
        if user is not None:
            event.setdefault("user", user)

        return event