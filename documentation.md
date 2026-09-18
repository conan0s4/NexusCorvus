NexusCorvus - Intelligent Investigation & Digital Forensics Assisted Workspace
Currently in active development
Overview
NexusCorvus is a local web-based workspace designed to assist with digital forensic investigations and security event analysis.
The project focuses on organizing investigation cases, evidence, forensic events, detections, and investigator notes within a single workspace.
The investigation workflow:
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
Primarily developed as a DFIR-focused academic project and personal investigation workspace.
Features
Investigation Management
- Create, view, update, and delete investigation cases
- Track investigation status
- Associate evidence, events, detections, and notes with cases
- Track case creation and modification timestamps
- Associate investigations with authenticated users
Evidence Management
- Upload and register forensic evidence
- Store evidence metadata
- Associate evidence files with investigation cases
- Track user who uploaded evidence
- Track file type, size, path, and upload time
Event Management
- Store forensic events associated with an investigation
- Track timestamps, event types, hosts, users, and severity
- Associate events with investigation cases
Detection Management
- Store security detections
- Record detection rules
- Track severity
- Associate detections with forensic events and investigations
- Prepare detection data for future Sigma integration
- Prepare detections for MITRE ATT&CK mapping
Investigation Notes
- Create investigation notes
- Update and delete notes
- Associate notes with cases
- Track authenticated user who created a note
- Track creation and modification timestamps
Authentication & Security
- Django authentication
- Session-based authentication
- HTTP session cookies
- CSRF protection
- Authenticated API access
- Protected investigation endpoints
- User identification through request.user
- Password change functionality
- Logout functionality
Technology Stack
Component	Technology
Frontend	React
Frontend Build Tool	Vite
Backend	Django
API	Django REST API
Database	MySQL 8
ORM	Django ORM
Authentication	Django Session Authentication
Web Language	JavaScript
Backend Language	Python
Database Language	SQL
Forensic Analysis	Chainsaw (planned)
Detection	Sigma (planned)
System Architecture
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
Backend request flow:
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
Database Structure
The nexuscorvus MySQL database contains Django's built-in authentication/session tables as well as NexusCorvus application tables.
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
API
Cases
GET     /api/cases/
POST    /api/cases/
GET     /api/cases/<id>/
PUT     /api/cases/<id>/
PATCH   /api/cases/<id>/
DELETE  /api/cases/<id>/
Events
GET     /api/events/
POST    /api/events/
GET     /api/events/<id>/
DELETE  /api/events/<id>/
Detections
GET     /api/detections/
POST    /api/detections/
GET     /api/detections/<id>/
PUT     /api/detections/<id>/
PATCH   /api/detections/<id>/
DELETE  /api/detections/<id>/
Notes
GET     /api/notes/
POST    /api/notes/
GET     /api/notes/<id>/
PUT     /api/notes/<id>/
PATCH   /api/notes/<id>/
DELETE  /api/notes/<id>/
Evidence
GET     /api/evidence/
POST    /api/evidence/
GET     /api/evidence/<id>/
DELETE  /api/evidence/<id>/
Frontend Architecture
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
API layer modules:
- authApi.js - login(), logout(), getCurrentUser(), updateProfile(), changePassword()
- caseApi.js - getCases(), getCase(), createCase(), updateCase(), deleteCase()
- eventApi.js - getEvents(), getEvent(), createEvent(), deleteEvent()
- detectionApi.js - getDetections(), getDetection(), createDetection(), updateDetection(), deleteDetection()
- noteApi.js - getNotes(), getNote(), createNote(), updateNote(), deleteNote()
- evidenceApi.js - getEvidenceFiles(), getEvidenceFile(), createEvidenceFile(), deleteEvidenceFile()
Authentication Flow
NexusCorvus uses Django's session-based authentication:
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
Subsequent requests use the session cookie:
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
Investigation Workflow
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
Planned Forensic Integration
Chainsaw
Chainsaw will be integrated as the primary forensic log analysis engine.
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
Sigma
Sigma detection rules will be integrated to identify suspicious activity from supported log data.
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
Development Progress
Completed
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
In Progress
- Connect frontend pages to API modules
- Authentication state management
- Protected frontend routes
- Loading and error states
- Form validation and handling
- EVTX file upload workflow
- Evidence file handling
- Investigation timeline visualization
Planned
- Integrate Chainsaw
- Implement Sigma detection engine
- MITRE ATT&CK mapping
- Event correlation
- Investigation timeline
- Improve forensic analysis interface
- Improve case investigation workflow
Local Development
Requirements
- Python
- Node.js and npm
- MySQL 8
- Git
Database
Create a MySQL database named: nexuscorvus
Configure database credentials through the Django project's environment/configuration rather than committing credentials to the repository.
Never commit real passwords, database credentials, API keys, or other secrets to Git.
Start MySQL (Windows)
net start MYSQL84
Start Backend
From the Django backend directory:
python manage.py runserver
Backend URL: http://127.0.0.1:8000/
Django Admin: http://127.0.0.1:8000/admin/
Start Frontend
From the React frontend directory:
npm install
npm run dev
Vite development server: http://localhost:5173/
Project Structure
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
│   ├── chainsaw_tool/           # Chainsaw binary and Sigma rules
│   │   └── chainsaw/
│   │       ├── README.md
│   │       └── sigma/
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
│   │   │   └── evidenceApi.js
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
Project Status
Foundation is complete:
- Database, backend CRUD, REST API, frontend API layer, session-based authentication
Frontend integration is in progress:
- Connecting frontend pages to API modules
- Authentication state management
- Protected routes
- Form validation
DFIR Engine Integration is planned:
- Chainsaw integration
- Sigma detection engine
- MITRE ATT&CK mapping
- Event correlation
- Investigation timeline
Note
NexusCorvus is a work in progress intended for local development, experimentation, and academic/portfolio purposes. It is not intended to replace established enterprise DFIR platforms. Its purpose is to explore how forensic analysis tools, detection rules, investigation data, and analyst workflows can be brought together into a single investigation workspace.



NexusCorvus API JSON Contract
Base URL: http://localhost:8000/api
1. Authentication Endpoints
POST /api/auth/csrf/
Request: None (GET)
Response:
{
  "csrfToken": "string"
}
POST /api/auth/login/
Request Body:
{
  "username": "string",
  "password": "string"
}
Response (200):
{
  "id": 1,
  "username": "string"
}
Error (401):
{
  "detail": "Invalid username or password."
}
GET /api/auth/user/
Headers: Session cookie required
Response (200):
{
  "id": 1,
  "username": "string"
}
Error (401):
{
  "detail": "Authentication required."
}
PATCH /api/auth/user/
Request Body:
{
  "username": "string"
}
Response (200):
{
  "id": 1,
  "username": "string"
}
Error (400):
{
  "detail": "Username is required."
}
{
  "detail": "Username is already taken."
}
POST /api/auth/password/
Request Body:
{
  "current_password": "string",
  "new_password": "string"
}
Response (200):
{
  "detail": "Password changed successfully."
}
Error (400):
{
  "detail": "Current password and new password are required."
}
{
  "detail": "Current password is incorrect."
}
POST /api/auth/logout/
Headers: Session cookie required
Response (200):
{
  "detail": "Logout successful."
}
Error (401):
{
  "detail": "Authentication required."
}
2. Case Endpoints
Model Fields (JSON shape)
{
  "id": 1,
  "case_name": "string",
  "description": "string",
  "status": "string",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "created_by": 1
}
GET /api/cases/
Headers: Session cookie required
Response (200):
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
Error (401):
{
  "detail": "Authentication required."
}
POST /api/cases/
Request Body:
{
  "case_name": "string",
  "description": "string",
  "status": "string"
}
Response (201):
{
  "id": 1,
  "case_name": "string",
  "description": "string",
  "status": "string",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "created_by": 1
}
Error (401):
{
  "detail": "Authentication required."
}
GET /api/cases/{id}/
Response (200):
{
  "id": 1,
  "case_name": "string",
  "description": "string",
  "status": "string",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "created_by": 1
}
Error (401):
{
  "detail": "Authentication required."
}
PUT /api/cases/{id}/
Request Body:
{
  "case_name": "string",
  "description": "string",
  "status": "string"
}
Response (200):
{
  "id": 1,
  "case_name": "string",
  "description": "string",
  "status": "string",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "created_by": 1
}
Error (401):
{
  "detail": "Authentication required."
}
DELETE /api/cases/{id}/
Response: 204 No Content
Error (401):
{
  "detail": "Authentication required."
}
3. Event Endpoints
Model Fields (JSON shape)
{
  "id": 1,
  "case": 1,
  "file_name": "string",
  "file_type": "string",
  "file_path": "string",
  "file_size": 123456,
  "created_at": "2024-01-01T00:00:00Z"
}
GET /api/events/
Headers: Session cookie required
Response (200):
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
Error (401):
{
  "detail": "Authentication required."
}
POST /api/events/
Request Body:
{
  "case_id": 1,
  "file_name": "string",
  "file_type": "string",
  "file_path": "string",
  "file_size": 123456
}
Response (201):
{
  "id": 1,
  "case": 1,
  "file_name": "string",
  "file_type": "string",
  "file_path": "string",
  "file_size": 123456,
  "created_at": "2024-01-01T00:00:00Z"
}
Error (401):
{
  "detail": "Authentication required."
}
GET /api/events/{id}/
Response (200):
{
  "id": 1,
  "case": 1,
  "file_name": "string",
  "file_type": "string",
  "file_path": "string",
  "file_size": 123456,
  "created_at": "2024-01-01T00:00:00Z"
}
Error (401):
{
  "detail": "Authentication required."
}
DELETE /api/events/{id}/
Response: 204 No Content
Error (401):
{
  "detail": "Authentication required."
}
4. Detection Endpoints
Model Fields (JSON shape)
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
GET /api/detections/
Headers: Session cookie required
Response (200):
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
Error (401):
{
  "detail": "Authentication required."
}
POST /api/detections/
Request Body:
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
Response (201):
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
Error (401):
{
  "detail": "Authentication required."
}
GET /api/detections/{id}/
Response (200):
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
Error (401):
{
  "detail": "Authentication required."
}
PUT /api/detections/{id}/
Request Body:
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
Response (200):
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
Error (401):
{
  "detail": "Authentication required."
}
DELETE /api/detections/{id}/
Response: 204 No Content
Error (401):
{
  "detail": "Authentication required."
}
5. Note Endpoints
Model Fields (JSON shape)
{
  "id": 1,
  "case": 1,
  "created_by": 1,
  "content": "string",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
GET /api/notes/
Headers: Session cookie required
Response (200):
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
Error (401):
{
  "detail": "Authentication required."
}
POST /api/notes/
Request Body:
{
  "case_id": 1,
  "content": "string"
}
Response (201):
{
  "id": 1,
  "case": 1,
  "created_by": 1,
  "content": "string",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
Error (401):
{
  "detail": "Authentication required."
}
GET /api/notes/{id}/
Response (200):
{
  "id": 1,
  "case": 1,
  "created_by": 1,
  "content": "string",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
Error (401):
{
  "detail": "Authentication required."
}
PUT /api/notes/{id}/
Request Body:
{
  "case_id": 1,
  "content": "string"
}
Response (200):
{
  "id": 1,
  "case": 1,
  "created_by": 1,
  "content": "string",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
Error (401):
{
  "detail": "Authentication required."
}
DELETE /api/notes/{id}/
Response: 204 No Content
Error (401):
{
  "detail": "Authentication required."
}
6. Evidence File Endpoints
Model Fields (JSON shape)
{
  "id": 1,
  "case": 1,
  "uploaded_by": 1,
  "file_name": "string",
  "file_type": "string",
  "file_path": "string",
  "file_size": 123456,
  "uploaded_at": "2024-01-01T00:00:00Z"
}
GET /api/evidence/
Headers: Session cookie required
Response (200):
[
  {
    "id": 1,
    "case": 1,
    "uploaded_by": 1,
    "file_name": "string",
    "file_type": "string",
    "file_path": "string",
    "file_size": 123456,
    "uploaded_at": "2024-01-01T00:00:00Z"
  }
]
Error (401):
{
  "detail": "Authentication required."
}
POST /api/evidence/
Request Body:
{
  "case_id": 1,
  "file_name": "string",
  "file_type": "string",
  "file_path": "string",
  "file_size": 123456
}
Response (201):
{
  "id": 1,
  "case": 1,
  "uploaded_by": 1,
  "file_name": "string",
  "file_type": "string",
  "file_path": "string",
  "file_size": 123456,
  "uploaded_at": "2024-01-01T00:00:00Z"
}
Error (401):
{
  "detail": "Authentication required."
}
GET /api/evidence/{id}/
Response (200):
{
  "id": 1,
  "case": 1,
  "uploaded_by": 1,
  "file_name": "string",
  "file_type": "string",
  "file_path": "string",
  "file_size": 123456,
  "uploaded_at": "2024-01-01T00:00:00Z"
}
Error (401):
{
  "detail": "Authentication required."
}
DELETE /api/evidence/{id}/
Response: 204 No Content
Error (401):
{
  "detail": "Authentication required."
}
7. Chainsaw Analysis Endpoint (Planned)
POST /api/chainsaw/analyze/
Request Body:
{
  "source": "string",
  "event_id": "string",
  "host": "string",
  "user": "string",
  "timerange": "all"
}
OR with timerange object:
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
Response (200):
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
Error (400):
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
Error (401):
{
  "detail": "Authentication required."
}
8. Error Response Format
All endpoints return errors in a consistent format:
{
  "detail": "Error message string"
}
Validation errors (Chainsaw endpoint):
{
  "status": "error",
  "errors": {
    "field_name": ["Error message"]
  }
}
9. General Notes
- Authentication: All endpoints except /api/auth/csrf/ and /api/auth/login/ require a valid Django session cookie (sessionid).
- CSRF: State-changing requests (POST, PUT, PATCH, DELETE) require the X-CSRFToken header. The frontend automatically fetches the token via GET /api/auth/csrf/ and reads it from the csrftoken cookie.
- Content-Type: All requests with bodies must use Content-Type: application/json.
- 204 No Content: DELETE operations return 204 No Content with no response body. The frontend API client handles this by returning null.
- Timestamps: All datetime fields use ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ).
- Foreign Keys: Related objects are serialized as their integer IDs (e.g., case: 1, created_by: 1).
- Auto fields: created_at, updated_at, uploaded_at are set automatically by the server and should not be included in POST/PUT requests.