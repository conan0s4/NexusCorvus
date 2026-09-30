<div align="center">

# NexusCorvus

**Intelligent Investigation & Digital Forensics Assisted Workspace**

*Currently in active development*

</div>

---

## Overview

NexusCorvus is a local web-based workspace designed to assist with **digital forensic investigations and security event analysis**.

The project is focused on organizing investigation cases, evidence, forensic events, detections, and investigator notes within a single workspace.

NexusCorvus is designed around a simple investigation workflow:

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
        │
        ▼
Build Investigation Timeline
```

The system is being developed primarily as a **DFIR-focused academic project and personal investigation workspace**.

---

## Quick Start with Docker

Run the whole workspace (MySQL + backend + frontend) with Docker Compose. No local Python or Node install needed.

### Requirements

* [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Steps

```text
git clone https://github.com/<your-user>/NexusCorvus.git
cd NexusCorvus
docker compose up --build
```

Then open **http://localhost:5173** and log in with the default account:

```text
username: admin
password: admin123
```

What happens on first start:

* MySQL runs in a container and is set up automatically.
* The backend runs migrations automatically and creates the `admin` account.
* The frontend starts with hot-reload, so editing `frontend/src/` reflects immediately.

### Changing credentials (optional)

Copy `.env.example` to `.env` and edit the values, then run `docker compose up` again. Every variable is optional.

### Useful commands

```text
docker compose up --build     # start (build first)
docker compose down           # stop (keeps data)
docker compose down -v        # stop and wipe the MySQL data volume
docker compose logs -f backend # follow backend logs
docker compose exec backend python manage.py createsuperuser   # add another user
```

### Data & ports

* MySQL data lives in a Docker volume (`mysql_data`); it survives restarts.
* Uploaded evidence and generated event files persist in `backend/Evidence/` and `backend/Event/` (bind-mounted into the container).
* The MySQL container is exposed on host port **3307** to avoid clashing with a local MySQL on 3306/3301. The app itself uses **8000** (API) and **5173** (frontend).
* The backend image bundles the bundled Sigma rules (`backend/sigma_tool/`), so Sigma detection works out of the box.
* **Chainsaw (Log Analysis)** ships pre-built for Windows and Linux (the runner selects the right binary for the host platform). On other hosts the analyze endpoint returns a clear error; Sigma detection, evidence, cases, reports, and the rest of the app still work.

---

## Features

### Investigation Management

* Create, view, update, and delete investigation cases
* Track investigation status
* Associate evidence, events, detections, and notes with cases
* Track case creation and modification timestamps
* Associate investigations with authenticated users

### Evidence Management

* Upload and register forensic evidence
* Store evidence metadata
* Associate evidence files with investigation cases
* Track the user who uploaded evidence
* Track file type, size, path, and upload time
* Compute and store a SHA-256 integrity hash for every uploaded artifact (verifiable in the UI and in case reports)

### Event Management

* Store forensic events associated with an investigation
* Track timestamps, event types, hosts, users, and severity
* Associate events with investigation cases

### Detection Management

* Store security detections
* Record detection rules
* Track severity
* Associate detections with forensic events and investigations
* Prepare detection data for future Sigma integration
* Prepare detections for MITRE ATT&CK mapping

### Investigation Notes

* Create investigation notes
* Update and delete notes
* Associate notes with cases
* Track the authenticated user who created a note
* Track creation and modification timestamps

### Authentication & Security

NexusCorvus uses Django's built-in authentication and session framework.

* Django authentication
* Session-based authentication
* HTTP session cookies
* CSRF protection
* Authenticated API access
* Protected investigation endpoints
* User identification through `request.user`
* Password change functionality
* Logout functionality

Authentication flow:

```text
                 LOGIN
                   │
                   ▼
          Django Authentication
                   │
                   ▼
              login()
                   │
                   ▼
          django_session
                   │
                   ▼
        sessionid HTTP Cookie
                   │
                   ▼
              Browser
                   │
                   │ sessionid
                   ▼
          Django REST API
                   │
                   ▼
             request.user
                   │
                   ▼
          Authenticated Request
```

---

# Technology Stack

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
| Detection           | Sigma                          |

---

# System Architecture

NexusCorvus follows a frontend/backend architecture.

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

### Backend Request Flow

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

# Database Structure

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

---

# API

The backend exposes REST-style API endpoints under `/api/`.

## Cases

```text
GET     /api/cases/
POST    /api/cases/

GET     /api/cases/<id>/
PUT     /api/cases/<id>/
PATCH   /api/cases/<id>/
DELETE  /api/cases/<id>/
```

## Events

```text
GET     /api/events/
POST    /api/events/

GET     /api/events/<id>/
DELETE  /api/events/<id>/
```

## Detections

```text
GET     /api/detections/
POST    /api/detections/

GET     /api/detections/<id>/
PUT     /api/detections/<id>/
PATCH   /api/detections/<id>/
DELETE  /api/detections/<id>/
```

## Notes

```text
GET     /api/notes/
POST    /api/notes/

GET     /api/notes/<id>/
PUT     /api/notes/<id>/
PATCH   /api/notes/<id>/
DELETE  /api/notes/<id>/
```

## Evidence

```text
GET     /api/evidence/
POST    /api/evidence/

GET     /api/evidence/<id>/
DELETE  /api/evidence/<id>/
```

Each evidence record includes `sha256` - the integrity hash computed from the file bytes at upload time.

## Sigma

```text
POST    /api/sigma/detect/

GET     /api/sigma/meta/
GET     /api/sigma/results/
GET     /api/sigma/results/<id>/
```

Successful scans are persisted, so the actual matched rules and events can be
reviewed later and are included in case reports.

## Case Reports

```text
GET     /api/cases/<id>/report/?report_format=json|md|pdf
```

Reports contain case metadata and counts, evidence records (with SHA-256),
events, detections, notes, and the persisted Sigma detection results.

---

# Frontend Architecture

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
│   └── evidenceApi.js
│
├── components/
├── layouts/
├── pages/
├── App.jsx
└── main.jsx
```

### API Layer

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

Current API modules include:

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
```

---

# Authentication

NexusCorvus uses Django's session-based authentication rather than storing authentication tokens in the frontend.

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

State-changing requests also use CSRF protection.

---

# Investigation Workflow

The planned workflow is centered around an investigator working through a case rather than simply storing raw logs.

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

The goal is to eventually connect these components into a more useful investigation view.

---

# Forensic Integration

## Chainsaw

Chainsaw is used as the primary forensic log analysis engine (bundled binary under `backend/chainsaw_tool/`).

Workflow:

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

The integration is intended to allow investigators to perform forensic log analysis without manually switching between the investigation workspace and the command line.

## Sigma

Sigma detection rules are used to identify suspicious activity from supported log data (bundled SigmaHQ rules under `backend/sigma_tool/`).

Workflow:

```text
Forensic Events
      │
      ▼
Sigma Rules
      │
      ▼
Detection Engine
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
NexusCorvus Detection
```

---

# Development Progress

## Completed

* [x] Initial frontend architecture
* [x] Initial backend architecture
* [x] MySQL database schema
* [x] Django ORM models
* [x] CRUD operations
* [x] Backend REST API endpoints
* [x] Backend API testing
* [x] Frontend API client
* [x] Frontend API integration testing
* [x] Django session authentication
* [x] HTTP session cookie authentication
* [x] CSRF protection
* [x] Protected API endpoints
* [x] Login/logout functionality
* [x] Current-user endpoint
* [x] Profile update functionality
* [x] Password change functionality
* [x] Case management API
* [x] Event management API
* [x] Detection management API
* [x] Notes API
* [x] Evidence API
* [x] Evidence SHA-256 integrity hashing (at upload, shown in the Evidence UI and case reports)
* [x] Sigma scan result persistence and results API
* [x] Case report generation (JSON / Markdown / PDF) including evidence SHA-256 and persisted Sigma results
* [x] Chainsaw integration (Evtx log analysis, platform-aware binary selection)
* [x] Sigma detection engine (python-evtx + pySigma + sigma-rule-matcher)
* [x] MITRE ATT&CK tactic/technique extraction for Sigma matches
* [x] Connect frontend pages to API modules
* [x] Authentication state management
* [x] Protected frontend routes
* [x] Loading and error states
* [x] Form validation and handling
* [x] EVTX file upload workflow
* [x] Evidence file handling

**All features are fully implemented and working.**

## Future ideas (not part of the current feature set)

* [ ] Event correlation across cases
* [ ] Investigation timeline visualization
* [ ] Further forensic-analysis interface polish

---

# Local Development

## Requirements

Before running NexusCorvus locally, install:

* Python
* Node.js and npm
* MySQL 8
* Git

The project currently consists of:

```text
NexusCorvus
│
├── Backend
│   └── Django
│
├── Frontend
│   └── React + Vite
│
└── Database
    └── MySQL 8
```

## Database

Create a MySQL database named:

```text
nexuscorvus
```

Configure the database credentials through the Django project's environment/configuration rather than committing credentials to the repository.

> **Security:** Never commit real passwords, database credentials, API keys, or other secrets to Git.

## Start MySQL

On Windows:

```powershell
net start MYSQL84
```

## Start Backend

From the Django backend directory:

```powershell
python manage.py runserver
```

Backend:

```text
http://127.0.0.1:8000/
```

Django administration:

```text
http://127.0.0.1:8000/admin/
```

## Start Frontend

From the React frontend directory:

```powershell
npm install
npm run dev
```

Vite development server:

```text
http://localhost:5173/
```

---

# Project Structure

A simplified project structure:

```text
NexusCorvus/
│
├── backend/
│   ├── manage.py
│   ├── core/
│   ├── cases/
│   ├── events/
│   ├── detections/
│   ├── notes/
│   └── evidence/
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── layouts/
│   │   └── pages/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

# Project Status

NexusCorvus is currently under active development.

The foundational application architecture is now established, including the database, backend CRUD operations, REST API, frontend API layer, and session-based authentication.

NexusCorvus is under active development, and its full feature set is implemented and working: case/Sigma/Chainsaw/evidence/report workflows run end to end in both bare-metal and Docker setups.

```text
Foundation
████████████████████████████████████  COMPLETE

Frontend Integration
████████████████████████████████████  COMPLETE

DFIR Engine Integration
██████████████████████████████░░░░░░  COMPLETE

Event Correlation & Timeline
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  FUTURE IDEA
```

---

## Note

NexusCorvus is a work in progress and is primarily intended for **local development, experimentation, and academic/portfolio purposes**.

The project is not intended to replace established enterprise DFIR platforms. Its purpose is to explore how forensic analysis tools, detection rules, investigation data, and analyst workflows can be brought together into a single investigation workspace.

---

## Credits

The DFIR capabilities in NexusCorvus rely on several third-party tools and libraries. These belong to their respective authors — this project does not claim them as its own work, and simply integrates them:

* **Chainsaw** — forensic EVTX log analysis engine, by WithSecure Countercept / WithSecureLabs ([github.com/WithSecureLabs/chainsaw](https://github.com/WithSecureLabs/chainsaw)), bundled under `backend/chainsaw_tool/chainsaw/`.
* **Sigma rules** — detection rule content, by [SigmaHQ](https://github.com/SigmaHQ/sigma), bundled under `backend/sigma_tool/sigma/` and used under the [Detection Rule License (DRL) 1.1](https://github.com/SigmaHQ/Detection-Rule-License).
* **pySigma** — Sigma rule parsing ([github.com/SigmaHQ/pySigma](https://github.com/SigmaHQ/pySigma)).
* **sigma-rule-matcher** — Sigma rule evaluation against parsed events ([github.com/jaehnfried/sigma-rule-matcher](https://github.com/jaehnfried/sigma-rule-matcher)).
* **python-evtx** — EVTX file parsing, by Willi Ballenthin ([github.com/williballenthin/python-evtx](https://github.com/williballenthin/python-evtx)).

Full acknowledgements from the bundled upstream projects are preserved in `backend/chainsaw_tool/chainsaw/README.md` and `backend/sigma_tool/sigma/README.md`.
