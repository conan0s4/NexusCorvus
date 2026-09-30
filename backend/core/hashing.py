"""SHA-256 helpers for original evidence files.

Hashes are always computed from the actual file bytes on disk. Metadata
(filename, path, size, timestamps, database ids) is never hashed.
"""

import hashlib
from pathlib import Path

_CHUNK_SIZE = 1024 * 1024


def sha256_file(path):
    """Return the lowercase hex SHA-256 digest of ``path``."""
    digest = hashlib.sha256()

    with open(path, "rb") as stream:
        for chunk in iter(lambda: stream.read(_CHUNK_SIZE), b""):
            digest.update(chunk)

    return digest.hexdigest()


def resolve_evidence_path(evidence_root, relative_path):
    """Resolve a stored evidence path relative to ``evidence_root``.

    Returns the absolute pathlib.Path only when the candidate resolves
    inside the managed root and exists as a regular file; otherwise
    ``None`` so callers never fabricate a hash for a missing/malicious
    path.
    """
    root = Path(evidence_root).resolve()
    candidate = (root / relative_path).resolve()

    try:
        candidate.relative_to(root)
    except ValueError:
        return None

    if not candidate.exists() or not candidate.is_file():
        return None

    return candidate