# NexusCorvus — Full Documentation

NexusCorvus is a local web-based workspace designed to assist with digital forensic investigations and security event analysis. The project focuses on organizing investigation cases, evidence, forensic events, detections, and investigator notes within a single workspace.

Primarily developed as a DFIR-focused academic project and personal investigation workspace.

**Users:** a short, user-facing readme lives in [`README.md`](README.md).

## Table of Contents

1. [Overview](#1-overview)
2. [Quick Start (Docker)](#2-quick-start-docker)
3. [Features](#3-features)
4. [Technology Stack](#4-technology-stack)
5. [System Architecture](#5-system-architecture)
6. [Database Structure](#6-database-structure)
7. [Investigation Workflow](#7-investigation-workflow)
8. [Authentication](#8-authentication)
9. [Forensic Integration](#9-forensic-integration)
10. [Frontend Architecture](#10-frontend-architecture)
11. [API Reference](#11-api-reference)
12. [Reports](#12-reports)
13. [API JSON Contract](#13-api-json-contract)
14. [Local Development](#14-local-development)
15. [Project Structure](#15-project-structure)
16. [Development Progress](#16-development-progress)
17. [Project Status](#17-project-status)
18. [Note](#18-note)
19. [Third-Party Tools & Credits](#19-third-party-tools--credits)

---

## 1. Overview

NexusCorvus is a full-stack forensic investigation workspace. An investigator creates a case, registers evidence, analyzes forensic data, records events and detections, and documents findings — everything accessible from one authenticated web UI.

```text
Create Investigation
         │
         ▼
    Add Evidence
         │
         ▼
Analyze Forensic Data
         │
         ▼
Identify Events / Detections
         │
         ▼
Document Findings
```

---

## 2. Quick Start (Docker)

The entire workspace (MySQL + Django backend + Vite frontend) can be run with Docker Compose. No local Python, Node, or MySQL install is required.

### Requirements

- Docker Desktop

### Steps (fresh download from GitHub)

1. `git clone https://github.com/<your-user>/NexusCorvus.git`
2. `cd NexusCorvus`
3. `docker compose up --build`
4. Open `http://localhost:5173` in a browser
5. Log in: username `admin` / password `admin123`

### First start behavior

- The MySQL container is initialised from `docker-compose.yml` (database `nexuscorvus`, user `valorian`).
- The backend entrypoint runs `python manage.py migrate` automatically, then creates the admin user from the `DJANGO_SUPERUSER_*` environment variables (idempotent).
- The frontend runs the Vite dev server with HMR; edits to `frontend/src/` are picked up immediately.

### Overriding settings

- Copy `.env.example` to `.env` and adjust variables (optional).
- Backend settings are environment-driven by default with the documented default values, so both bare-metal and Docker runs share the same code path.

### Data persistence and ports

- **MySQL data:** named volume `mysql_data` (`docker compose down` keeps it; `docker compose down -v` removes it).
- **Evidence uploads / generated event files:** bind mounts `./backend/Evidence` and `./backend/Event`.
- **Host ports:** `3307` (MySQL), `8000` (Django API), `5173` (frontend).
- **Sigma rules:** the backend image bundles `backend/sigma_tool/` (tracked in git), so Sigma detection works without extra setup.
- **Chainsaw:** the bundled binaries are pre-built for Windows and Linux (the runner picks the correct one for the host platform). On other hosts the analyze endpoint returns a clear error while the rest of the app remains functional.

### Useful commands

```text
docker compose up --build     # start (build first)
docker compose down           # stop (keeps data)
docker compose down -v        # stop and wipe the MySQL data volume
docker compose logs -f backend # follow backend logs
docker compose exec backend python manage.py createsuperuser   # add another user
```

---

## 3. Features

### 3.1 Investigation Management

- Create, view, update, and delete investigation cases
- Track investigation status
- Associate evidence, events, detections, and notes with cases
- Track case creation and modification timestamps
- Associate investigations with authenticated users

### 3.2 Evidence Management

- Upload and register forensic evidence
- Store evidence metadata
- Associate evidence files with investigation cases
- Track the user who uploaded evidence
- Track file type, size, path, and upload time
- Compute and store a **SHA-256 integrity hash** for every uploaded artifact (server-side, verifiable in the UI and in case reports)

### 3.3 Event Management

- Store forensic events associated with an investigation
- Track timestamps, event types, hosts, users, and severity
- Associate events with investigation cases

### 3.4 Detection Management

- Store security detections
- Record detection rules
- Track severity
- Associate detections with forensic events and investigations
- Detect with Sigma against EVTX evidence files
- Track severity, detection rule, and rule ID per detection
- MITRE ATT&CK tactic and technique mapping from rule tags

### 3.5 Investigation Notes

- Create investigation notes
- Update and delete notes
- Associate notes with cases
- Track the authenticated user who created a note
- Track creation and modification timestamps

### 3.6 Authentication & Security

- Django authentication
- Session-based authentication
- HTTP session cookies
- CSRF protection
- Authenticated API access
- Protected investigation endpoints
- User identification through `request.user`
- Password change functionality
- Logout functionality

---

## 4. Technology Stack

| Component           | Technology                    |
| ------------------- | ----------------------------- |
| Frontend            | React                         |
| Frontend Build Tool | Vite                          |
| Backend             | Django                        |
| API                 | Django REST API               |
| Database            | MySQL 8                       |
| ORM                 | Django ORM                    |
| Authentication      | Django Session Authentication |
| Web Language        | JavaScript                    |
| Backend Language    | Python                        |
| Database Language   | SQL                           |
| Forensic Analysis   | Chainsaw                      |
| Detection           | Sigma                         |

---

## 5. System Architecture

```text
┌───────────────────────────────┐
│           React UI            │
│                               │
│  Pages / Components / Forms   │
└───────────────┬───────────────┘
                │
                ▼
          API Client Layer
                │
                ▼
┌───────────────────────────────┐
│        Django REST API        │
│                               │
│   Authentication / Views      │
│          CRUD Logic            │
└───────────────┬───────────────┘
                │
                ▼
          Django ORM
                │
                ▼
┌───────────────────────────────┐
│          MySQL 8              │
│                               │
│ Cases / Events / Detections   │
│ Notes / Evidence / Users      │
└───────────────────────────────┘
```

### Backend request flow

```text
HTTP Request
     │
     ▼
Django URL Router
     │
     ▼
views.py
     │
     ▼
CRUD / Application Logic
     │
     ▼
Django ORM
     │
     ▼
MySQL
```

---

## 6. Database Structure

The `nexuscorvus` MySQL database contains Django's built-in authentication/session tables as well as NexusCorvus application tables.

```text
nexuscorvus
│
├── Django Tables
│   ├── auth_user
│   ├── auth_group
│   ├── auth_permission
│   ├── auth_group_permissions
│   ├── auth_user_groups
│   ├── auth_user_user_permissions
│   ├── django_admin_log
│   ├── django_content_type
│   ├── django_migrations
│   └── django_session
│
└── NexusCorvus Tables
    │
    ├── Case
    │   ├── id
    │   ├── case_name
    │   ├── description
    │   ├── status
    │   ├── created_at
    │   ├── updated_at
    │   └── created_by_id
    │
    ├── Event
    │   ├── id
    │   ├── case_id
    │   ├── file_name
    │   ├── file_type
    │   ├── file_path
    │   ├── file_size
    │   └── created_at
    │
    ├── Detection
    │   ├── id
    │   ├── case_id
    │   ├── time
    │   ├── event_type
    │   ├── description
    │   ├── host
    │   ├── severity
    │   ├── detection_rule
    │   └── created_at
    │
    ├── Note
    │   ├── id
    │   ├── case_id
    │   ├── created_by_id
    │   ├── content
    │   ├── created_at
    │   └── updated_at
    │
    └── EvidenceFile
        ├── id
        ├── case_id
        ├── uploaded_by_id
        ├── file_name
        ├── file_type
        ├── file_path
        ├── file_size
        └── uploaded_at
```

Additional application models:

- `sigma_app.SigmaDetectionResult` — persisted Sigma scan runs (scan summary + matched rules/events), linked to `case`, `evidence_file`, and `created_by`.

---

## 7. Investigation Workflow

```text
CASE
 │
 ├── Evidence
 │      └── EVTX / forensic files
 │
 ├── Events
 │      └── Parsed / relevant events
 │
 ├── Detections
 │      └── Sigma-based findings
 │
 ├── Notes
 │      └── Investigator observations
 │
 └── Timeline
        └── Correlated investigation activity
```

The workflow is centered around an investigator working through a case rather than simply storing raw logs. Event correlation across cases and a timeline visualization are future ideas (see [Development Progress](#16-development-progress)).

---

## 8. Authentication

NexusCorvus uses Django's session-based authentication. No tokens are stored in the frontend; the browser holds HTTP session cookies.

```text
FIRST LOGIN

GET /api/auth/csrf/
        │
        ▼
   csrftoken cookie
        │
        ▼
POST /api/auth/login/
        │
        ▼
   CSRF Validation
        │
        ▼
   authenticate()
        │
        ▼
   login(request, user)
        │
        ▼
   django_session
        │
        ▼
   sessionid cookie
        │
        ▼
     Browser
```

Subsequent requests use the session cookie:

```text
Browser
   │
   │ sessionid
   ▼
Django
   │
   ▼
django_session
   │
   ▼
request.user
   │
   ├── Authenticated ──► API Operation
   │
   └── Anonymous ──────► 401 Unauthorized
```

State-changing requests (POST, PUT, PATCH, DELETE) also require the `X-CSRFToken` header.

---

## 9. Forensic Integration

### 9.1 Chainsaw

Chainsaw is used as the primary forensic log analysis engine (bundled binary under `backend/chainsaw_tool/chainsaw/`).

```text
EVTX File
     │
     ▼
NexusCorvus
     │
     ▼
Chainsaw
     │
     ├── Parse EVTX
     ├── Search events
     └── Identify relevant activity
     │
     ▼
Normalized Results
     │
     ▼
NexusCorvus Events
     │
     ▼
Investigation Timeline
```

The integration allows investigators to perform forensic log analysis without manually switching between the investigation workspace and the command line.

### 9.2 Sigma

Sigma detection is integrated as the "Detect with Sigma" engine using Python-native tooling (no subprocesses).

```text
EVTX File
     │
     ▼
python-evtx Parser (events → normalized dicts)
     │
     ▼
SigmaHQ Windows Rules (bundled under backend/sigma_tool/sigma/rules/windows)
     │
     ▼
pySigma parse + sigma-rule-matcher evaluation
     │
     ▼
Detection Results
     │
     ├── Rule ID
     ├── Severity
     ├── Description
     └── MITRE ATT&CK Mapping
     │
     ▼
NexusCorvus Detection (save to case)
```

Successful scans are persisted as `SigmaDetectionResult` rows (the verbatim run output, including matched rules and events) and can be retrieved later via `/api/sigma/results/` and `/api/sigma/results/{id}/`. Reports include these persisted results.

---

## 10. Frontend Architecture

The React frontend separates API communication from UI components.

```text
src/
│
├── api/
│   ├── apiClient.js
│   ├── authApi.js
│   ├── caseApi.js
│   ├── eventApi.js
│   ├── detectionApi.js
│   ├── noteApi.js
│   ├── evidenceApi.js
│   ├── analyze.js
│   └── sigmaApi.js
│
├── components/
├── layouts/
├── pages/
├── App.jsx
└── main.jsx
```

### API layer modules

```text
authApi.js
├── login()
├── logout()
├── getCurrentUser()
├── updateProfile()
└── changePassword()

caseApi.js
├── getCases()
├── getCase()
├── createCase()
├── updateCase()
└── deleteCase()

eventApi.js
├── getEvents()
├── getEvent()
├── createEvent()
└── deleteEvent()

detectionApi.js
├── getDetections()
├── getDetection()
├── createDetection()
├── updateDetection()
└── deleteDetection()

noteApi.js
├── getNotes()
├── getNote()
├── createNote()
├── updateNote()
└── deleteNote()

evidenceApi.js
├── getEvidenceFiles()
├── getEvidenceFile()
├── createEvidenceFile()
└── deleteEvidenceFile()

analyze.js
└── analyzeLogs()            # Chainsaw

sigmaApi.js
├── getSigmaMeta()
└── detectWithSigma()
```

Request flow:

```text
React Page
    │
    ▼
Specific API Module
    │
    ▼
apiClient.js
    │
    ▼
Django REST API
```

---

## 11. API Reference

REST-style endpoints are exposed under `/api/`.

### Cases

```text
GET     /api/cases/
POST    /api/cases/

GET     /api/cases/<id>/
PUT     /api/cases/<id>/
PATCH   /api/cases/<id>/
DELETE  /api/cases/<id>/
```

### Events

```text
GET     /api/events/
POST    /api/events/

GET     /api/events/<id>/
DELETE  /api/events/<id>/
```

### Detections

```text
GET     /api/detections/
POST    /api/detections/

GET     /api/detections/<id>/
PUT     /api/detections/<id>/
PATCH   /api/detections/<id>/
DELETE  /api/detections/<id>/
```

### Notes

```text
GET     /api/notes/
POST    /api/notes/

GET     /api/notes/<id>/
PUT     /api/notes/<id>/
PATCH   /api/notes/<id>/
DELETE  /api/notes/<id>/
```

### Evidence

```text
GET     /api/evidence/
POST    /api/evidence/

GET     /api/evidence/<id>/
DELETE  /api/evidence/<id>/
```

Each evidence record includes `sha256` — the integrity hash computed from the file bytes at upload time.

### Sigma Detection

```text
POST    /api/sigma/detect/
GET     /api/sigma/meta/
GET     /api/sigma/results/
GET     /api/sigma/results/<id>/
```

Successful scans are persisted, so the actual matched rules and events can be reviewed later and are included in case reports.

### Case Report

```text
GET     /api/cases/<id>/report/?report_format=json|md|pdf
```

---

## 12. Reports

`GET /api/cases/{case_id}/report/?report_format=json|md|pdf` generates and downloads an investigation report for a single case.

The report contains, for the selected case:

- Case metadata, investigation status, and artifact counts (evidence files, events, detections, notes, sigma runs)
- Evidence records, each including its metadata and the **SHA-256 integrity hash**
- Events, detections, notes
- **Sigma Detection Results** — the actual persisted Sigma scan output (scan summary, matched rules, and matched events per rule), not just database metadata

---

## 13. API JSON Contract

Base URL: `http://localhost:8000/api`

### 13.1 Authentication Endpoints

`POST /api/auth/csrf/`

Request: None (GET)

Response:

```json
{
  "csrfToken": "string"
}
```

`POST /api/auth/login/`

Request Body:

```json
{
  "username": "string",
  "password": "string"
}
```

Response (200):

```json
{
  "id": 1,
  "username": "string"
}
```

Error (401):

```json
{
  "detail": "Invalid username or password."
}
```

`GET /api/auth/user/`

Headers: Session cookie required

Response (200):

```json
{
  "id": 1,
  "username": "string"
}
```

Error (401):

```json
{
  "detail": "Authentication required."
}
```

`PATCH /api/auth/user/`

Request Body:

```json
{
  "username": "string"
}
```

Response (200):

```json
{
  "id": 1,
  "username": "string"
}
```

Error (400):

```json
{
  "detail": "Username is required."
}
{
  "detail": "Username is already taken."
}
```

`POST /api/auth/password/`

Request Body:

```json
{
  "current_password": "string",
  "new_password": "string"
}
```

Response (200):

```json
{
  "detail": "Password changed successfully."
}
```

Error (400):

```json
{
  "detail": "Current password and new password are required."
}
{
  "detail": "Current password is incorrect."
}
```

`POST /api/auth/logout/`

Headers: Session cookie required

Response (200):

```json
{
  "detail": "Logout successful."
}
```

Error (401):

```json
{
  "detail": "Authentication required."
}
```

### 13.2 Case Endpoints

Model Fields (JSON shape):

```json
{
  "id": 1,
  "case_name": "string",
  "description": "string",
  "status": "string",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "created_by": 1
}
```

`GET /api/cases/`

Headers: Session cookie required

Response (200):

```json
[
  {
    "id": 1,
    "case_name": "string",
    "description": "string",
    "status": "string",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "created_by": 1
  }
]
```

Error (401):

```json
{
  "detail": "Authentication required."
}
```

`POST /api/cases/`

Request Body:

```json
{
  "case_name": "string",
  "description": "string",
  "status": "string"
}
```

Response (201):

```json
{
  "id": 1,
  "case_name": "string",
  "description": "string",
  "status": "string",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "created_by": 1
}
```

Error (401):

```json
{
  "detail": "Authentication required."
}
```

`GET /api/cases/{id}/`

Response (200):

```json
{
  "id": 1,
  "case_name": "string",
  "description": "string",
  "status": "string",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "created_by": 1
}
```

Error (401):

```json
{
  "detail": "Authentication required."
}
```

`PUT /api/cases/{id}/`

Request Body:

```json
{
  "case_name": "string",
  "description": "string",
  "status": "string"
}
```

Response (200):

```json
{
  "id": 1,
  "case_name": "string",
  "description": "string",
  "status": "string",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "created_by": 1
}
```

Error (401):

```json
{
  "detail": "Authentication required."
}
```

`DELETE /api/cases/{id}/`

Response: 204 No Content

Error (401):

```json
{
  "detail": "Authentication required."
}
```

### 13.3 Event Endpoints

Model Fields (JSON shape):

```json
{
  "id": 1,
  "case": 1,
  "file_name": "string",
  "file_type": "string",
  "file_path": "string",
  "file_size": 123456,
  "created_at": "2024-01-01T00:00:00Z"
}
```

`GET /api/events/`

Headers: Session cookie required

Response (200):

```json
[
  {
    "id": 1,
    "case": 1,
    "file_name": "string",
    "file_type": "string",
    "file_path": "string",
    "file_size": 123456,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

Error (401):

```json
{
  "detail": "Authentication required."
}
```

`POST /api/events/`

Request Body:

```json
{
  "case_id": 1,
  "file_name": "string",
  "file_type": "string",
  "file_path": "string",
  "file_size": 123456
}
```

Response (201):

```json
{
  "id": 1,
  "case": 1,
  "file_name": "string",
  "file_type": "string",
  "file_path": "string",
  "file_size": 123456,
  "created_at": "2024-01-01T00:00:00Z"
}
```

Error (401):

```json
{
  "detail": "Authentication required."
}
```

`GET /api/events/{id}/`

Response (200):

```json
{
  "id": 1,
  "case": 1,
  "file_name": "string",
  "file_type": "string",
  "file_path": "string",
  "file_size": 123456,
  "created_at": "2024-01-01T00:00:00Z"
}
```

Error (401):

```json
{
  "detail": "Authentication required."
}
```

`DELETE /api/events/{id}/`

Response: 204 No Content

Error (401):

```json
{
  "detail": "Authentication required."
}
```

### 13.4 Detection Endpoints

Model Fields (JSON shape):

```json
{
  "id": 1,
  "case": 1,
  "time": "2024-01-01T00:00:00Z",
  "event_type": "string",
  "description": "string",
  "host": "string",
  "user": "string",
  "severity": "string",
  "detection_rule": "string",
  "rule_id": "string",
  "mitre_tactic": "string",
  "mitre_technique": "string",
  "created_at": "2024-01-01T00:00:00Z"
}
```

`GET /api/detections/`

Headers: Session cookie required

Response (200):

```json
[
  {
    "id": 1,
    "case": 1,
    "time": "2024-01-01T00:00:00Z",
    "event_type": "string",
    "description": "string",
    "host": "string",
    "user": "string",
    "severity": "string",
    "detection_rule": "string",
    "rule_id": "string",
    "mitre_tactic": "string",
    "mitre_technique": "string",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

Error (401):

```json
{
  "detail": "Authentication required."
}
```

`POST /api/detections/`

Request Body:

```json
{
  "case_id": 1,
  "time": "2024-01-01T00:00:00Z",
  "event_type": "string",
  "description": "string",
  "host": "string",
  "user": "string",
  "severity": "string",
  "detection_rule": "string",
  "rule_id": "string",
  "mitre_tactic": "string",
  "mitre_technique": "string"
}
```

Response (201):

```json
{
  "id": 1,
  "case": 1,
  "time": "2024-01-01T00:00:00Z",
  "event_type": "string",
  "description": "string",
  "host": "string",
  "user": "string",
  "severity": "string",
  "detection_rule": "string",
  "rule_id": "string",
  "mitre_tactic": "string",
  "mitre_technique": "string",
  "created_at": "2024-01-01T00:00:00Z"
}
```

Error (401):

```json
{
  "detail": "Authentication required."
}
```

`GET /api/detections/{id}/`

Response (200):

```json
{
  "id": 1,
  "case": 1,
  "time": "2024-01-01T00:00:00Z",
  "event_type": "string",
  "description": "string",
  "host": "string",
  "user": "string",
  "severity": "string",
  "detection_rule": "string",
  "rule_id": "string",
  "mitre_tactic": "string",
  "mitre_technique": "string",
  "created_at": "2024-01-01T00:00:00Z"
}
```

Error (401):

```json
{
  "detail": "Authentication required."
}
```

`PUT /api/detections/{id}/`

Request Body:

```json
{
  "case_id": 1,
  "time": "2024-01-01T00:00:00Z",
  "event_type": "string",
  "description": "string",
  "host": "string",
  "user": "string",
  "severity": "string",
  "detection_rule": "string",
  "rule_id": "string",
  "mitre_tactic": "string",
  "mitre_technique": "string"
}
```

Response (200):

```json
{
  "id": 1,
  "case": 1,
  "time": "2024-01-01T00:00:00Z",
  "event_type": "string",
  "description": "string",
  "host": "string",
  "user": "string",
  "severity": "string",
  "detection_rule": "string",
  "rule_id": "string",
  "mitre_tactic": "string",
  "mitre_technique": "string",
  "created_at": "2024-01-01T00:00:00Z"
}
```

Error (401):

```json
{
  "detail": "Authentication required."
}
```

`DELETE /api/detections/{id}/`

Response: 204 No Content

Error (401):

```json
{
  "detail": "Authentication required."
}
```

### 13.5 Note Endpoints

Model Fields (JSON shape):

```json
{
  "id": 1,
  "case": 1,
  "created_by": 1,
  "content": "string",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

`GET /api/notes/`

Headers: Session cookie required

Response (200):

```json
[
  {
    "id": 1,
    "case": 1,
    "created_by": 1,
    "content": "string",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

Error (401):

```json
{
  "detail": "Authentication required."
}
```

`POST /api/notes/`

Request Body:

```json
{
  "case_id": 1,
  "content": "string"
}
```

Response (201):

```json
{
  "id": 1,
  "case": 1,
  "created_by": 1,
  "content": "string",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

Error (401):

```json
{
  "detail": "Authentication required."
}
```

`GET /api/notes/{id}/`

Response (200):

```json
{
  "id": 1,
  "case": 1,
  "created_by": 1,
  "content": "string",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

Error (401):

```json
{
  "detail": "Authentication required."
}
```

`PUT /api/notes/{id}/`

Request Body:

```json
{
  "case_id": 1,
  "content": "string"
}
```

Response (200):

```json
{
  "id": 1,
  "case": 1,
  "created_by": 1,
  "content": "string",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

Error (401):

```json
{
  "detail": "Authentication required."
}
```

`DELETE /api/notes/{id}/`

Response: 204 No Content

Error (401):

```json
{
  "detail": "Authentication required."
}
```

### 13.6 Evidence File Endpoints

Model Fields (JSON shape):

```json
{
  "id": 1,
  "case": 1,
  "uploaded_by": 1,
  "file_name": "string",
  "file_type": "string",
  "file_path": "string",
  "file_size": 123456,
  "sha256": "a3a1f8e9...64-char-sha-256-hex-digest",
  "uploaded_at": "2024-01-01T00:00:00Z"
}
```

`GET /api/evidence/`

Headers: Session cookie required

Response (200):

```json
[
  {
    "id": 1,
    "case": 1,
    "uploaded_by": 1,
    "file_name": "string",
    "file_type": "string",
    "file_path": "string",
    "file_size": 123456,
    "sha256": "a3a1f8e9...64-char-sha-256-hex-digest",
    "uploaded_at": "2024-01-01T00:00:00Z"
  }
]
```

Error (401):

```json
{
  "detail": "Authentication required."
}
```

`POST /api/evidence/`

Request Body:

```json
{
  "case_id": 1,
  "file_name": "string",
  "file_type": "string",
  "file_path": "string",
  "file_size": 123456
}
```

Response (201):

```json
{
  "id": 1,
  "case": 1,
  "uploaded_by": 1,
  "file_name": "string",
  "file_type": "string",
  "file_path": "string",
  "file_size": 123456,
  "sha256": "a3a1f8e9...64-char-sha-256-hex-digest",
  "uploaded_at": "2024-01-01T00:00:00Z"
}
```

Notes:

- `sha256` is computed server-side from the actual file bytes while the evidence is written to disk; clients never supply it. It is an integrity fingerprint for the registered artifact.
- Duplicate uploads (same storage path) are rejected with an error.

Error (401):

```json
{
  "detail": "Authentication required."
}
```

`GET /api/evidence/{id}/`

Response (200):

```json
{
  "id": 1,
  "case": 1,
  "uploaded_by": 1,
  "file_name": "string",
  "file_type": "string",
  "file_path": "string",
  "file_size": 123456,
  "sha256": "a3a1f8e9...64-char-sha-256-hex-digest",
  "uploaded_at": "2024-01-01T00:00:00Z"
}
```

Error (401):

```json
{
  "detail": "Authentication required."
}
```

`DELETE /api/evidence/{id}/`

Response: 204 No Content

Error (401):

```json
{
  "detail": "Authentication required."
}
```

### 13.7 Sigma Detection Endpoints

`GET /api/sigma/meta/`

Headers: Session cookie required

Response (200):

```json
{
  "levels": ["informational", "low", "medium", "high", "critical"],
  "categories": ["builtin", "create_remote_thread", "...", "process_creation", "windows"]
}
```

Error (401):

```json
{
  "detail": "Authentication required."
}
```

`POST /api/sigma/detect/`

Headers: Session cookie required

Request Body:

```json
{
  "evidence_file_id": 1,
  "level": "high",
  "category": "security",
  "service": null,
  "rule_files": ["rules/windows/process_creation/proc_creation_win_tool_executable.yml"],
  "max_events_per_rule": 100,
  "max_rules": 0
}
```

Notes on filters:

- `evidence_file_id`: required (EVTX evidence file owned by the uploader or case owner)
- `level`: minimum severity to include (`informational | low | medium | high | critical`)
- `category`: Sigma category, or the Windows rules sub-folder name (e.g. `security`, `process_creation`)
- `rule_files`: optional explicit subset; each entry is a basename, a full repo path, or a directory prefix
- `max_events_per_rule`: cap on matched event rows stored per rule (default 100)
- `max_rules`: optional cap on the number of rules evaluated (default 0 = no limit)

Response (200):

```json
{
  "status": "success",
  "evidence_file_id": 1,
  "evidence_file_name": "sample.evtx",
  "events_processed": 101,
  "events_malformed": 0,
  "rules_loaded": 1226,
  "rules_evaluated": 842,
  "rules_skipped": 384,
  "duration_seconds": 5.92,
  "matches": [
    {
      "rule": {
        "title": "RDP over Reverse SSH Tunnel WFP",
        "id": "f0e2b4d6-...",
        "level": "high",
        "status": "stable",
        "description": "...",
        "references": ["https://..."],
        "author": "...",
        "logsource": { "product": "windows", "category": "network_connection", "service": null },
        "rule_file": "rules/windows/builtin/security/win_security_rdp_reverse_tunnel.yml",
        "mitre_tactics": ["Command and Control", "Lateral Movement"],
        "mitre_techniques": ["T1090.001", "T1021.001"]
      },
      "match_count": 4,
      "truncated": false,
      "matches": [
        {
          "time": "2019-02-13 18:04:58.363695+00:00",
          "event_id": 5156,
          "channel": "Security",
          "computer": "PC01.example.corp",
          "user": "admin01",
          "data": { "Event.System.EventID": 5156, "ProcessName": "C:\\\\Windows\\\\System32\\\\svchost.exe" }
        }
      ]
    }
  ]
}
```

Error (400):

```json
{
  "status": "error",
  "errors": {
    "evidence_file_id": ["This field is required."],
    "level": ["\"extreme\" is not a valid choice."],
    "max_events_per_rule": ["Ensure this value is greater than or equal to 1."]
  }
}
```

Error (401):

```json
{
  "detail": "Authentication required."
}
```

Error (403):

```json
{
  "status": "error",
  "error": "Not authorized to analyze this evidence."
}
```

Error (404):

```json
{
  "status": "error",
  "error": "Evidence file not found."
}
```

`GET /api/sigma/results/`

Headers: Session cookie required

Optional query parameters: `evidence_file_id`, `case_id`

Response (200): list of persisted scan runs (newest first). Each entry wraps the stored run data:

```json
{
  "id": 1,
  "case": 1,
  "evidence_file": 13,
  "created_by": 1,
  "created_at": "2024-01-01T00:00:00Z",
  "run_data": {
    "status": "success",
    "evidence_file_id": 13,
    "evidence_file_name": "sample.evtx",
    "events_processed": 101,
    "rules_evaluated": 842,
    "matches": []
  }
}
```

Notes:

- A successful `POST /api/sigma/detect/` persists the full run result (scan summary + matched rules/events) before the response is returned.
- Only results the caller is allowed to see (evidence uploader or case owner) are returned.

Error (401):

```json
{
  "detail": "Authentication required."
}
```

`GET /api/sigma/results/{id}/`

Response (200): a single persisted scan run in the same shape as above.

Error (401):

```json
{
  "detail": "Authentication required."
}
```

Error (403):

```json
{
  "status": "error",
  "error": "Not authorized to view this result."
}
```

Error (404):

```json
{
  "status": "error",
  "error": "Sigma result not found."
}
```

### 13.8 Case Report Endpoint

Generates and downloads an investigation report for a single case in JSON, Markdown, or PDF format.

`GET /api/cases/{case_id}/report/?report_format=json`

Headers: Session cookie required

`report_format`: `json | md | pdf` (default `json`)

Response (200): attachment download

Contents: see [Reports](#12-reports).

Error (401):

```json
{
  "detail": "Authentication required."
}
```

Error (400):

```json
{
  "detail": "Unsupported report format."
}
```

### 13.9 Chainsaw Analysis Endpoint

`POST /api/chainsaw/analyze/`

Request Body:

```json
{
  "source": "string",
  "event_id": "string",
  "host": "string",
  "user": "string",
  "timerange": "all"
}
```

OR with timerange object:

```json
{
  "source": "string",
  "event_id": "string",
  "host": "string",
  "user": "string",
  "timerange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-01T00:00:00Z"
  }
}
```

Response (200):

```json
{
  "status": "success",
  "message": "Chainsaw analysis request received.",
  "data": {
    "source": "string",
    "event_id": "string",
    "host": "string",
    "user": "string",
    "timerange": {}
  }
}
```

Error (400):

```json
{
  "status": "error",
  "errors": {
    "source": ["Source is required."],
    "event_id": ["Event ID is required."],
    "host": ["Host is required."],
    "user": ["User is required."],
    "timerange": ["Timerange must contain 'start' and 'end'."]
  }
}
```

Error (401):

```json
{
  "detail": "Authentication required."
}
```

### 13.10 Error Response Format

All endpoints return errors in a consistent format:

```json
{
  "detail": "Error message string"
}
```

Validation errors (Chainsaw endpoint):

```json
{
  "status": "error",
  "errors": {
    "field_name": ["Error message"]
  }
}
```

### 13.11 General Notes

- **Authentication:** all endpoints except `/api/auth/csrf/` and `/api/auth/login/` require a valid Django session cookie (`sessionid`).
- **CSRF:** state-changing requests (POST, PUT, PATCH, DELETE) require the `X-CSRFToken` header. The frontend automatically fetches the token via `GET /api/auth/csrf/` and reads it from the `csrftoken` cookie.
- **Content-Type:** all requests with bodies must use `Content-Type: application/json`.
- **204 No Content:** DELETE operations return 204 No Content with no response body. The frontend API client handles this by returning `null`.
- **Timestamps:** all datetime fields use ISO 8601 format (`YYYY-MM-DDTHH:MM:SSZ`).
- **Foreign Keys:** related objects are serialized as their integer IDs (e.g., `case: 1`, `created_by: 1`).
- **Auto fields:** `created_at`, `updated_at`, `uploaded_at` are set automatically by the server and should not be included in POST/PUT requests.

---

## 14. Local Development

### Requirements

- Python
- Node.js and npm
- MySQL 8
- Git

### Database

Create a MySQL database named `nexuscorvus`.

Configure the database credentials through the Django project's environment/configuration rather than committing credentials to the repository.

> **Security:** Never commit real passwords, database credentials, API keys, or other secrets to Git.

### Start MySQL (Windows)

```powershell
net start MYSQL84
```

### Start Backend

From the Django backend directory:

```powershell
python manage.py runserver
```

Backend URL: `http://127.0.0.1:8000/`

Django Admin: `http://127.0.0.1:8000/admin/`

### Start Frontend

From the React frontend directory:

```powershell
npm install
npm run dev
```

Vite development server: `http://localhost:5173/`

---

## 15. Project Structure

```text
NexusCorvus/
│
├── backend/
│   ├── manage.py
│   ├── core/                    # Main Django app (models, views, serializers, CRUD)
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── crud.py
│   │   ├── urls.py
│   │   └── migrations/
│   ├── chainsaw_app/            # Chainsaw integration Django app
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── serializers.py
│   │   ├── models.py
│   │   ├── services/
│   │   │   └── chainsaw_runner.py
│   │   └── migrations/
│   ├── sigma_app/               # Sigma detection Django app
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── serializers.py
│   │   ├── models.py
│   │   ├── services/
│   │   │   ├── evtx_parser.py
│   │   │   ├── rule_resolver.py
│   │   │   └── sigma_runner.py
│   │   └── migrations/
│   ├── chainsaw_tool/           # Chainsaw binary and Sigma rules
│   │   └── chainsaw/
│   │       ├── README.md
│   │       └── sigma/
│   ├── sigma_tool/              # SigmaHQ rules repo (sparse: rules/windows only)
│   │   └── sigma/
│   │       ├── LICENSE
│   │       └── rules/windows/
│   ├── config/                  # Django project config
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   └── wsgi.py
│   └── __init__.py
│
├── frontend/
│   ├── src/
│   │   ├── api/                 # API client modules
│   │   │   ├── apiClient.js
│   │   │   ├── authApi.js
│   │   │   ├── caseApi.js
│   │   │   ├── eventApi.js
│   │   │   ├── detectionApi.js
│   │   │   ├── noteApi.js
│   │   │   ├── evidenceApi.js
│   │   │   ├── analyze.js
│   │   │   └── sigmaApi.js
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── main.py                      # Basic PyCharm template (not application entry point)
└── README.md
```

---

## 16. Development Progress

### Completed

- Initial frontend architecture
- Initial backend architecture
- MySQL database schema
- Django ORM models
- CRUD operations
- Backend REST API endpoints
- Backend API testing
- Frontend API client
- Frontend API integration testing
- Django session authentication
- HTTP session cookie authentication
- CSRF protection
- Protected API endpoints
- Login/logout functionality
- Current-user endpoint
- Profile update functionality
- Password change functionality
- Case management API
- Event management API
- Detection management API
- Notes API
- Evidence API
- Log Analysis page integration (Chainsaw)
- Sigma detection endpoint and engine (python-evtx + pySigma + sigma-rule-matcher)
- Sigma Detection page integration with filters and save-to-case
- MITRE ATT&CK tactic/technique extraction for Sigma matches
- Sigma scan result persistence and results API (`GET /api/sigma/results/[/id]`)
- Evidence SHA-256 integrity hashing (computed at upload, stored, shown in UI and reports)
- Case report generation (JSON / Markdown / PDF) with evidence SHA-256 and persisted Sigma results
- Connect frontend pages to API modules
- Authentication state management
- Protected frontend routes
- Loading and error states
- Form validation and handling
- EVTX file upload workflow
- Evidence file handling

**All features are fully implemented and working.**

### Future ideas (not part of the current feature set)

- Event correlation across cases
- Investigation timeline visualization
- Further forensic-analysis interface polish

---

## 17. Project Status

The full feature set is implemented and working:

- **Foundation:** database, backend CRUD, REST API, frontend API layer, session-based authentication
- **Frontend integration:** all pages connected to the API, auth state management, protected routes, loading/error states, form validation, EVTX upload workflow
- **DFIR Engine:** Chainsaw log analysis engine (platform-aware binary selection), Sigma detection engine (python-evtx + pySigma + sigma-rule-matcher), MITRE ATT&CK extraction for Sigma matches

```text
Foundation
████████████████████████████████████  COMPLETE

Frontend Integration
████████████████████████████████████  COMPLETE

DFIR Engine Integration
████████████████████████████████████  COMPLETE

Event Correlation & Timeline
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  FUTURE IDEA
```

---

## 18. Note

NexusCorvus is fully built and primarily intended for **local development, experimentation, and academic/portfolio purposes**. It is not intended to replace established enterprise DFIR platforms. Its purpose is to explore how forensic analysis tools, detection rules, investigation data, and analyst workflows can be brought together into a single investigation workspace.

---

## 19. Third-Party Tools & Credits

The DFIR capabilities in NexusCorvus rely on several third-party tools and libraries. These belong to their respective authors — this project does not claim them as its own work, and simply integrates them:

- **Chainsaw** — forensic EVTX log analysis engine, by WithSecure Countercept / WithSecureLabs (https://github.com/WithSecureLabs/chainsaw), bundled under `backend/chainsaw_tool/chainsaw/`.
- **Sigma rules** — detection rule content, by SigmaHQ (https://github.com/SigmaHQ/sigma), bundled under `backend/sigma_tool/sigma/` and used under the Detection Rule License (DRL) 1.1.
- **pySigma** — Sigma rule parsing (https://github.com/SigmaHQ/pySigma).
- **sigma-rule-matcher** — Sigma rule evaluation against parsed events (https://github.com/jaehnfried/sigma-rule-matcher).
- **python-evtx** — EVTX file parsing, by Willi Ballenthin (https://github.com/williballenthin/python-evtx).

Full acknowledgements from the bundled upstream projects are preserved in `backend/chainsaw_tool/chainsaw/README.md` and `backend/sigma_tool/sigma/README.md`.