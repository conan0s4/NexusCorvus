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
| Forensic Analysis   | Chainsaw *(planned)*          |
| Detection           | Sigma *(planned)*             |

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

# Planned Forensic Integration

## Chainsaw

Chainsaw will be integrated as the primary forensic log analysis engine.

Planned workflow:

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

Sigma detection rules will be integrated to identify suspicious activity from supported log data.

Planned workflow:

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

## In Progress

* [ ] Connect frontend pages to API modules
* [ ] Authentication state management
* [ ] Protected frontend routes
* [ ] Loading and error states
* [ ] Form validation and handling
* [ ] EVTX file upload workflow
* [ ] Evidence file handling
* [ ] Investigation timeline visualization

## Planned

* [ ] Integrate Chainsaw
* [ ] Implement Sigma detection engine
* [ ] MITRE ATT&CK mapping
* [ ] Event correlation
* [ ] Investigation timeline
* [ ] Improve forensic analysis interface
* [ ] Improve case investigation workflow

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

The next major development phase focuses on the **DFIR functionality itself**, particularly Chainsaw integration, Sigma detection, event correlation, and investigation timeline visualization.

```text
Foundation
████████████████████████████████████  COMPLETE

Frontend Integration
████████████████████░░░░░░░░░░░░░░░░  IN PROGRESS

DFIR Engine Integration
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  PLANNED

Detection & Correlation
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  PLANNED
```

---

## Note

NexusCorvus is a work in progress and is primarily intended for **local development, experimentation, and academic/portfolio purposes**.

The project is not intended to replace established enterprise DFIR platforms. Its purpose is to explore how forensic analysis tools, detection rules, investigation data, and analyst workflows can be brought together into a single investigation workspace.
