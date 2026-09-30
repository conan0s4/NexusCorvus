# NexusCorvus

> Intelligent Investigation & Digital Forensics Assisted Workspace

NexusCorvus is a self-hosted, local web workspace for digital forensic investigations and security event analysis. Register case evidence, analyze EVTX logs with Chainsaw, run Sigma-based detection, record events and detections, and export investigation reports — all from a single authenticated web UI.

- **Fully built and working** — no "work in progress" features
- **Docker-first** — run the whole stack with one command
- **Bundled engines** — Chainsaw (Windows + Linux) and SigmaHQ rules ship with the project

## Features

| Area | What you get |
| --- | --- |
| **Cases** | Create, track, and manage investigations with per-user ownership |
| **Evidence** | Register forensic files with metadata and a SHA-256 integrity hash |
| **Log Analysis** | EVTX forensics via bundled Chainsaw |
| **Detection** | "Detect with Sigma" against EVTX evidence, with MITRE ATT&CK mapping |
| **Findings** | Store parsed events and detection results per case |
| **Notes** | Investigator observations per case |
| **Reports** | Export case reports as JSON, Markdown, or PDF (includes evidence hashes and Sigma results) |
| **Authentication** | Session-based login with CSRF protection |

## Built With

- **Frontend:** React + Vite
- **Backend:** Django (Python)
- **Database:** MySQL 8

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

No local Python, Node.js, or MySQL installation is required.

### Install & Run

```text
git clone <repo-url>
cd NexusCorvus
docker compose up --build
```

Open `http://localhost:5173` and log in with the default account:

| Username | Password |
| --- | --- |
| `admin` | `admin123` |

On first start, the backend runs database migrations and creates the `admin` user automatically. To change the default credentials, copy `.env.example` to `.env`, edit the values, and restart.

### Useful Commands

```text
docker compose up --build                      # start (build first)
docker compose down                            # stop (keeps data)
docker compose down -v                         # stop and wipe the MySQL data volume
docker compose logs -f backend                 # follow backend logs
docker compose exec backend python manage.py createsuperuser   # add another user
```

### Data & Ports

- **Web UI:** `http://localhost:5173` · **API:** `http://localhost:8000`
- **MySQL:** host port `3307`, persisted in the `mysql_data` volume (survives restarts)
- **Evidence / event files:** `backend/Evidence/` and `backend/Event/` (bind-mounted)
- `docker compose down -v` deletes the database volume — back it up first

## Documentation

Complete documentation, including the API JSON contract, architecture, database structure, and local (bare-metal) development setup, is in **[documentation.md](documentation.md)**.

## Credits

The DFIR capabilities integrate third-party tools and libraries that belong to their respective authors:

- **Chainsaw** — EVTX log analysis engine by WithSecureLabs
- **Sigma rules** — detection content by SigmaHQ (DRL 1.1)
- **pySigma**, **sigma-rule-matcher**, **python-evtx** (Willi Ballenthin)

Full acknowledgements are in [documentation.md](documentation.md).