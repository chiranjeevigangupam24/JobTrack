# JobTrack Pro — Complete Implementation & Structural Architecture Guide
**A Comprehensive Engineering Reference & Self-Study Manual**

* **Candidate / Author:** Naga Chiranjeevi
* **Project Name:** JobTrack Pro (Smart Job Application & Interview Pipeline Tracking System)
* **Architecture:** Offline-First, Layered Architecture (React 18 + Tailwind CSS, FastAPI REST Backend, Python OOP Core, Atomic JSON Storage)
* **Status:** Fully Implemented, Tested (76/76 Unit & Integration Tests Passing), Production-Ready

---

## Table of Contents
1. [Executive Project Summary](#1-executive-project-summary)
2. [End-to-End System Architecture](#2-end-to-end-system-architecture)
3. [Complete Directory & File Map](#3-complete-directory--file-map)
4. [Domain Model Layer (`src/models`)](#4-domain-model-layer-srcmodels)
5. [Data Persistence & Resilience Engine (`src/storage`)](#5-data-persistence--resilience-engine-srcstorage)
6. [Business Logic & Service Layer (`src/services`)](#6-business-logic--service-layer-srcservices)
7. [Security & Defensive Programming (`src/reports` & `src/utils`)](#7-security--defensive-programming-srcreports--srcutils)
8. [FastAPI REST Backend (`server.py`)](#8-fastapi-rest-backend-serverpy)
9. [Modern Web Dashboard (`frontend/`)](#9-modern-web-dashboard-frontend)
10. [Terminal CLI Interface (`main.py`)](#10-terminal-cli-interface-mainpy)
11. [Testing Strategy & Test Suite Breakdown (`tests/`)](#11-testing-strategy--test-suite-breakdown-tests)
12. [Step-by-Step Execution & Demonstration Guide](#12-step-by-step-execution--demonstration-guide)
13. [Viva Voce & Technical Interview Defense Q&A](#13-viva-voce--technical-interview-defense-qa)

---

## 1. Executive Project Summary

### 1.1 The Real-World Problem
Job hunting in the modern tech market requires managing high volumes of applications across multiple channels (LinkedIn, Indeed, company job portals, cold outreach, referrals). A typical applicant applies to 50–100+ positions, participates in multiple interview stages (Screening, Technical Assessments, System Design, Behavioral/HR), tracks take-home project deadlines, and balances competing compensation offers.

Relying on ad-hoc spreadsheets or sticky notes leads to severe operational bottlenecks:
* **Missed Deadlines:** Overlooking online assessment deadlines or follow-up milestones.
* **Misplaced Schedules & Links:** Scrambling to locate video conference links and interview notes minutes before a call.
* **Zero Analytical Feedback:** Inability to pinpoint where applications fail (e.g., resume screening vs. technical interviews).
* **Data Disorganization & Loss:** Corrupted spreadsheets, accidental deletions, or lack of local backups.

### 1.2 The JobTrack Pro Solution
**JobTrack Pro** is a centralized, offline-first application tracking and interview pipeline system. It combines:
1. A **Modern Web Dashboard** built with HTML5, Tailwind CSS, and React 18, offering real-time filtering, responsive modal forms, slide-over detail drawers, live Dark/Light theme switching, and candidate personalization.
2. A **High-Speed FastAPI REST Backend** exposing clean endpoints with automatic OpenAPI/Swagger documentation and strict Pydantic v2 data validation.
3. An **Offline-First Python Core** featuring atomic filesystem transactions (preventing corruption), spreadsheet formula injection sanitization, proactive deadline calculations, and complete pipeline conversion analytics.
4. A **Zero-Dependency Terminal CLI** that can run anywhere with standard Python 3.8+ without installing external libraries.

---

## 2. End-to-End System Architecture

JobTrack Pro follows the **Layered Architectural Pattern** (also known as N-Tier Architecture). This enforces a strict **Separation of Concerns (SoC)**, ensuring that presentation logic, network communication, business rules, domain definitions, and file operations remain completely decoupled.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                              │
│                                                                        │
│   [Modern Web Browser SPA]                     [Console Terminal CLI]  │
│   - React 18 (Component State)                 - Python curses/ANSI    │
│   - Tailwind CSS (Light / Dark UI)             - Menu Router           │
│   - Candidate Badge ("Naga Chiranjeevi")       - Formatted Text Tables │
└───────────────────▲───────────────────────────────────────▲────────────┘
                    │ RESTful HTTP/JSON (fetch)             │ Direct Python
                    ▼                                       │ Calls
┌───────────────────────────────────────────────┐           │
│            REST API GATEWAY LAYER             │           │
│  FastAPI (Uvicorn ASGI Engine)                │           │
│  - Static Asset Mounting (/ & /static)        │           │
│  - CORS Middleware & Path Parameter Validation│           │
│  - Pydantic v2 Request/Response Serializers   │           │
│  - Interactive Swagger Docs (/docs, /redoc)   │           │
└───────────────────▲───────────────────────────┘           │
                    │ In-Memory Service Calls               │
                    ▼                                       │
┌───────────────────────────────────────────────────────────▼────────────┐
│                    BUSINESS LOGIC (SERVICE LAYER)                      │
│                                                                        │
│  - ApplicationService : CRUD lifecycle, multi-attribute token search   │
│  - InterviewService   : Multi-round scheduling, chronological check    │
│  - ReminderService    : Active deadline calculation, lookahead window  │
│  - AnalyticsService   : Funnel ratios, conversion %, stage aggregation │
│  - CSVExporter        : Defense-in-depth formula injection escaping    │
└───────────────────▲────────────────────────────────────────────────────┘
                    │ Enforces Domain Invariants
                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       DOMAIN MODEL LAYER                               │
│                                                                        │
│  - JobApplication     : Core entity with lifecycle timestamp tracking  │
│  - InterviewRound     : Sub-entity tracking rounds, meet URLs, outcome │
│  - Enums              : ApplicationStatus, InterviewType, JobType      │
└───────────────────▲────────────────────────────────────────────────────┘
                    │ Persists & Deserializes
                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   STORAGE & PERSISTENCE LAYER                          │
│                                                                        │
│  - JSONStorage        : Atomic file I/O (PID temporary file + replace) │
│  - Fault Tolerance    : Automated .bak backups & corruption recovery   │
│  - applications.json  : Primary application database                   │
│  - settings.json      : Persistent candidate preferences & theme mode  │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Lifecycle:
1. **User Action:** The candidate adds a new job application on the React web dashboard.
2. **HTTP Request:** The frontend makes an asynchronous `POST /api/applications` fetch call with JSON payload.
3. **API Validation:** FastAPI intercepts the request, runs Pydantic schema validation, and extracts sanitized data.
4. **Service Execution:** `ApplicationService.add_application()` generates a unique UUID, attaches the active applicant name from settings, timestamps the record, and invokes the storage layer.
5. **Atomic Persistence:** `JSONStorage.save_applications()` creates an automated `.bak` copy, serializes the updated records into a temporary file (`.tmp`), flushes buffers to physical disk (`os.fsync`), and atomically replaces `applications.json` via `os.replace`.
6. **Response:** FastAPI responds with HTTP 201 Created and the created application object.
7. **UI Update:** React updates its state and displays a success toast notification.

---

## 3. Complete Directory & File Map

Here is the exact structural directory tree of the project with the specific responsibility of every component:

```
Codegnan-projects/
├── server.py                               # Root launcher for the FastAPI backend server
├── main.py                                 # Root launcher for the Terminal CLI interface
├── README.md                               # Project documentation & feature manual
├── requirements.txt                        # Optional web dependencies (fastapi, uvicorn, pydantic)
│
└── JobTrack/                               # Core Application Root Package
    ├── server.py                           # FastAPI application entrypoint, routes & static mounting
    ├── main.py                             # Interactive terminal CLI application entrypoint
    ├── README.md                           # Local copy of project overview
    ├── requirements.txt                    # FastAPI & Uvicorn requirements definition
    │
    ├── data/                               # Persistent Storage Directory
    │   ├── applications.json               # Primary database for all job applications & interviews
    │   └── settings.json                   # User settings (candidate name, theme, lookahead days)
    │
    ├── exports/                            # Secure CSV Export Destination
    │   ├── applications_export_*.csv       # Applications exported with formula injection defense
    │   ├── interviews_export_*.csv         # Chronological interview schedules export
    │   └── analytics_summary_*.csv         # Pipeline performance and funnel ratios export
    │
    ├── frontend/                           # Zero-Build Modern Web Application
    │   ├── index.html                      # HTML5 shell, Tailwind CSS CDN, React 18, FOUC-safe script
    │   ├── styles.css                      # Custom glassmorphism, smooth scrollbars, animations
    │   └── app.jsx                         # React SPA (State, Dark Mode, Forms, Table, Drawers)
    │
    ├── src/                                # Core Python Source Code Package
    │   ├── __init__.py                     # Package declaration
    │   │
    │   ├── models/                         # Domain Entities & Enums
    │   │   ├── __init__.py                 # Exports JobApplication, InterviewRound, Enums
    │   │   └── application.py              # Application & Interview entities, serializers, validation
    │   │
    │   ├── storage/                        # Persistence & Filesystem Handling
    │   │   ├── __init__.py                 # Exports JSONStorage
    │   │   └── json_storage.py             # Atomic writes (tmp + replace), backup & recovery
    │   │
    │   ├── services/                       # Business Logic Layer
    │   │   ├── __init__.py                 # Exports all domain services
    │   │   ├── application_service.py      # CRUD, fuzzy multi-word search, multi-field filtering
    │   │   ├── interview_service.py        # Interview scheduling, outcome logger, status triggers
    │   │   ├── reminder_service.py         # Urgency detection (today, upcoming, overdue deadlines)
    │   │   └── analytics_service.py        # Stage distribution, conversion rates, funnel velocity
    │   │
    │   ├── reports/                        # Reporting & Exporting
    │   │   ├── __init__.py                 # Exports CSVExporter
    │   │   └── csv_exporter.py             # CSV generator with spreadsheet formula injection defense
    │   │
    │   └── utils/                          # Utility & Helper Functions
    │       ├── __init__.py                 # Exports helper utilities
    │       ├── validators.py               # Input validation (URLs, dates, strings, enum types)
    │       ├── date_utils.py               # ISO date parsing, formatting, relative time calculation
    │       └── display.py                  # CLI terminal formatting, ANSI colors, ASCII tables
    │
    ├── tests/                              # Comprehensive Automated Test Suite
    │   ├── __init__.py                     # Test package initializer
    │   ├── test_all_cases.py               # Master unified runner testing all 76 project cases
    │   ├── test_api.py                     # FastAPI REST endpoint integration tests
    │   ├── test_application.py             # JobApplication & InterviewRound domain model tests
    │   ├── test_application_service.py     # Application CRUD, search, and filtering tests
    │   ├── test_analytics_service.py       # Metrics calculation & CSV formula injection security tests
    │   └── test_json_storage.py            # Atomic file writing, backup & crash recovery tests
    │
    └── docs/                               # Comprehensive Documentation & PDF Guides
        ├── PROJECT_STRUCTURE_AND_IMPLEMENTATION.md # Markdown architectural documentation
        └── manual.html                     # Styled print template for PDF generation
```

---

## 4. Domain Model Layer (`src/models`)

The domain layer defines the business entities and guarantees that invalid states cannot exist within the application.

### 4.1 Enumerations
To prevent typos and enforce strict state boundaries, all categories are represented as Python `Enum` types:
* `ApplicationStatus`:
  * `APPLIED`: Application submitted, waiting for initial response.
  * `SCREENING`: Resume screening or recruiter introductory call.
  * `INTERVIEWING`: One or more active interview rounds in progress.
  * `OFFER`: Formal job offer received.
  * `REJECTED`: Application rejected at any stage.
  * `WITHDRAWN`: Voluntarily withdrawn by the candidate.
  * `GHOSTED`: No communication after an extended duration.
* `InterviewType`: `SCREENING`, `TECHNICAL`, `SYSTEM_DESIGN`, `BEHAVIORAL`, `HR`, `TAKE_HOME`, `FINAL`.
* `InterviewOutcome`: `PENDING`, `PASSED`, `FAILED`, `CANCELLED`.
* `JobType`: `FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERNSHIP`, `REMOTE`.

### 4.2 `JobApplication` Entity
Located in [`src/models/application.py`](file:///c:/Users/gangu/Desktop/Codegnan-projects/JobTrack/src/models/application.py), the `JobApplication` class represents a job opportunity:
* **Unique Identification:** Automatically assigned a UUID4 string upon creation.
* **Applicant Identification:** Contains the `applicant_name` attribute (defaults to "Naga Chiranjeevi" from user settings), ensuring records identify who submitted the application.
* **Audit Trail:** Tracks `created_at` and `updated_at` timestamps in ISO 8601 UTC format.
* **Nested Interviews:** Holds a list of `InterviewRound` objects.
* **Serialization:** Provides `to_dict()` and `from_dict()` methods to convert between in-memory Python objects and JSON-safe primitive dictionaries.

### 4.3 `InterviewRound` Entity
Subordinate entity attached to a parent application. It encapsulates:
* `round_id`: Unique round identifier.
* `round_name`: Human-readable label (e.g., "DSA & Algorithms", "System Design").
* `interview_date`: Scheduled date and time (`YYYY-MM-DD HH:MM`).
* `interview_type`: Type of interview from `InterviewType`.
* `outcome`: Current status from `InterviewOutcome`.
* `interviewer`: Name or panel details of the interviewer.
* `meeting_link`: Web conference URL (e.g., Google Meet, Zoom, Teams).
* `notes`: Candidate preparation notes or questions asked during the session.

---

## 5. Data Persistence & Resilience Engine (`src/storage`)

Located in [`src/storage/json_storage.py`](file:///c:/Users/gangu/Desktop/Codegnan-projects/JobTrack/src/storage/json_storage.py), the `JSONStorage` class provides enterprise-grade data persistence without requiring heavy database installations.

### 5.1 The Danger of Naive File Writing
Most novice applications write to disk using:
```python
# NAIVE & DANGEROUS PATTERN:
with open("applications.json", "w") as f:
    json.dump(data, f)
```
If the computer loses power, the process crashes, or the user terminates the program during this write operation, the file is truncated to **0 bytes**, permanently destroying all user data.

### 5.2 Atomic Write Pattern with Flush and Sync
JobTrack Pro eliminates this risk using atomic file replacement:
```
1. Serialize in-memory data to JSON string
2. Write to a temporary file: applications.json.tmp.<PID>
3. Flush application buffer: f.flush()
4. Flush operating system buffer to physical drive: os.fsync(f.fileno())
5. Atomically replace main file: os.replace(temp_path, final_path)
```
Under Windows NT and POSIX operating systems, `os.replace` is an atomic filesystem operation. Either the entire new file replaces the old one, or the old file remains 100% intact. Partial writes are impossible.

### 5.3 Automated Backups & Corruption Recovery
* **Pre-Save Backup:** Every time data is modified, the existing file is duplicated as `applications.json.bak`.
* **Self-Healing on Load:** When `load_applications()` reads the file, if it detects invalid or unparseable JSON (e.g., manual tampering by a user), it logs a warning, falls back to `applications.json.bak`, restores the database, and prevents application crashes.

---

## 6. Business Logic & Service Layer (`src/services`)

The service layer contains pure business logic and remains completely independent of whether requests arrive from the Web API or the Terminal CLI.

### 6.1 `ApplicationService`
* **CRUD Operations:** Handles creating, reading, updating, and soft/hard deleting applications.
* **Intelligent Token Search:** Searches across company name, role, notes, and applicant name using case-insensitive tokenization. Searching for `"Google Senior"` matches any record containing both `"Google"` and `"Senior"` in any field.
* **Multi-Field Filtering:** Filters by status, job type, location, and date range simultaneously.

### 6.2 `InterviewService`
* **Scheduling:** Validates that interview dates follow correct formats and checks chronological logic.
* **Automatic Status Synchronization:** When a candidate schedules an interview round for an application in `APPLIED` status, the service automatically elevates the parent application status to `INTERVIEWING`.
* **Outcome Recording:** Logs `PASSED`, `FAILED`, or `CANCELLED`. If a final round is marked `PASSED`, the application can be transitioned to `OFFER`.

### 6.3 `ReminderService`
* **Urgency Engine:** Computes real-time milestones against today's date:
  * **Today's Interviews:** Interviews scheduled on the exact current calendar day.
  * **Upcoming Interviews:** Interviews scheduled within the user's lookahead window (default: 7 days).
  * **Approaching & Overdue Deadlines:** Take-home tests or application deadlines expiring soon or already expired.
* **Noise Reduction:** Automatically filters out inactive, rejected, or withdrawn applications so users are never alerted to irrelevant past dates.

### 6.4 `AnalyticsService`
* **Funnel Conversion Metrics:**
  $$\text{Interview Rate} = \left(\frac{\text{Applications with Interviews}}{\text{Total Applications}}\right) \times 100$$
  $$\text{Offer Rate} = \left(\frac{\text{Total Offers}}{\text{Total Applications}}\right) \times 100$$
  $$\text{Interview-to-Offer Conversion} = \left(\frac{\text{Total Offers}}{\text{Total Interviewed}}\right) \times 100$$
* **Distribution Aggregation:** Uses `collections.Counter` to compile stage breakdowns, job type distributions, and top target companies.

---

## 7. Security & Defensive Programming

### 7.1 Spreadsheet Formula Injection Defense (CSV Injection / DDE)
When data is exported to CSV and opened in Microsoft Excel, LibreOffice Calc, or Google Sheets, any cell that starts with formula characters (`=`, `+`, `-`, `@`) will be executed as code by the spreadsheet engine. Malicious actors could exploit this to trigger remote code execution or exfiltrate local data.

In [`src/reports/csv_exporter.py`](file:///c:/Users/gangu/Desktop/Codegnan-projects/JobTrack/src/reports/csv_exporter.py), JobTrack Pro sanitizes every string field before writing:
```python
def sanitize_cell(value: str) -> str:
    """Neutralize spreadsheet formula injection characters."""
    if not isinstance(value, str):
        return value
    if value.startswith(("=", "+", "-", "@", "\t", "\r")):
        return f"'{value}"  # Prefix with single quote to force text interpretation
    return value
```

### 7.2 Strict Input Validation
In [`src/utils/validators.py`](file:///c:/Users/gangu/Desktop/Codegnan-projects/JobTrack/src/utils/validators.py):
* URLs are validated with regex checking protocols (`http://`, `https://`).
* Dates are verified against ISO 8601 specifications (`YYYY-MM-DD`).
* Enum inputs are validated before object construction, returning user-friendly error messages rather than raw Python exceptions.

---

## 8. FastAPI REST Backend (`server.py`)

The backend server in [`JobTrack/server.py`](file:///c:/Users/gangu/Desktop/Codegnan-projects/JobTrack/server.py) provides a modern RESTful API connecting the frontend with domain services.

### 8.1 Key REST Endpoints
| HTTP Method | Endpoint Path | Functionality |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Healthcheck returning server status and timestamp |
| `GET` | `/api/meta` | System metadata, available statuses, job types, candidate info |
| `GET` | `/api/dashboard` | Aggregated payload (stats, reminders, recent applications) |
| `GET` | `/api/applications` | List applications with query parameters (`search`, `status`, `job_type`) |
| `POST` | `/api/applications` | Create a new application with Pydantic validation |
| `PUT` | `/api/applications/{id}` | Update an existing application's details or status |
| `DELETE` | `/api/applications/{id}` | Permanently delete an application record |
| `POST` | `/api/interviews` | Schedule an interview round on an application |
| `PUT` | `/api/interviews/outcome`| Update an interview round's outcome (Passed, Failed, Pending) |
| `DELETE` | `/api/interviews/{app_id}/{round_id}` | Cancel / remove an interview round |
| `GET` | `/api/reminders` | Retrieve calculated urgent events and deadline alerts |
| `GET` | `/api/analytics` | Compute and return complete recruitment funnel statistics |
| `GET` | `/api/export/{export_type}` | Export and download sanitized CSV reports |
| `GET` | `/api/settings` | Read candidate settings (applicant name, theme mode, lookahead) |
| `POST` | `/api/settings` | Save candidate settings |
| `POST` | `/api/seed-sample-data` | Populate realistic demo applications for presentations |

### 8.2 Swagger & OpenAPI Integration
FastAPI automatically generates interactive, self-documenting API explorers accessible at:
* Swagger UI: `http://localhost:8000/docs`
* ReDoc UI: `http://localhost:8000/redoc`

---

## 9. Modern Web Dashboard (`frontend/`)

The frontend is an interactive Single Page Application (SPA) located in [`JobTrack/frontend/`](file:///c:/Users/gangu/Desktop/Codegnan-projects/JobTrack/frontend/).

### 9.1 Zero-Build Architecture
Unlike traditional web frameworks that require Node.js, `npm`, Webpack, or Vite, JobTrack Pro uses CDN-delivered modern web standards:
* **React 18 & ReactDOM:** Reactive state management and declarative component rendering.
* **Babel Standalone:** Transpiles modern JSX directly inside the browser.
* **Tailwind CSS 3:** Utility-first responsive styling and Dark Mode engine.
* **Lucide / Feather SVG Icons:** Crisp vector iconography.

This architectural decision means any user or evaluator can run the full web application immediately using standard Python, with zero npm configuration or dependency conflicts.

### 9.2 Candidate Personalization ("Applied Name")
* **Welcome Banner:** The hero banner greets the candidate: `Welcome back, Naga Chiranjeevi! 👋`.
* **Profile Badge:** Upper-right navbar displays a candidate profile pill with the initials `NC`.
* **Application Rows & Drawer:** Every application record visually displays the candidate's name under an "Applied By" badge.
* **Customizable:** Change the candidate name in the **Settings** view to immediately update the interface and persist the preference to disk.

### 9.3 Dark Mode Engine
* **Instant Toggle:** Top navbar features a Sun/Moon toggle button.
* **Tailwind `dark:` Classes:** Full support across panels (`dark:bg-slate-800`), borders (`dark:border-slate-700`), text (`dark:text-slate-100`), and inputs.
* **Zero Flash of Unstyled Content (FOUC):** A small inline script in `index.html` inspects `localStorage` and system media preferences before the page renders, preventing white screen flashes when opening in dark mode.

---

## 10. Terminal CLI Interface (`main.py`)

For developers who prefer working in terminal environments or SSH sessions, [`main.py`](file:///c:/Users/gangu/Desktop/Codegnan-projects/JobTrack/main.py) provides a full-featured console interface:
* **Interactive Menus:** Arrow-key and numbered option navigation.
* **ANSI Terminal Formatting:** Color-coded status badges (Green for Offer, Amber for Interviewing, Red for Rejected).
* **ASCII Analytics Visualizer:** Visual bar charts rendered directly in console text.
* **Zero Dependencies:** Runs exclusively on Python standard library modules.

---

## 11. Testing Strategy & Test Suite Breakdown (`tests/`)

The project is verified by a unified test suite with **76 automated tests** in [`JobTrack/tests/test_all_cases.py`](file:///c:/Users/gangu/Desktop/Codegnan-projects/JobTrack/tests/test_all_cases.py).

### 11.1 Test Suite Breakdown
| Test Module | Test Class | Focus Area | Cases |
| :--- | :--- | :--- | :--- |
| `test_application.py` | `TestApplicationModel` | Domain model instantiation, validations, nested interviews, dictionary serialization | 14 |
| `test_json_storage.py` | `TestJsonStorage` | Atomic file writes, temporary file replacement, automatic `.bak` backup, corruption recovery | 11 |
| `test_application_service.py` | `TestApplicationService` | Application CRUD, token search algorithms, multi-attribute filtering, applicant name tracking | 16 |
| `test_analytics_service.py` | `TestAnalyticsService` | Funnel ratio calculations, stage counting, and CSV formula injection sanitization | 15 |
| `test_api.py` | `TestFastAPIEndpoints` | FastAPI HTTP requests, status codes, query filtering, interview scheduling, settings endpoints | 12 |
| `test_all_cases.py` | `TestMasterUnifiedSuite` | End-to-end integration flow from web request through domain service to atomic disk persistence | 8 |
| **Total** | | **Comprehensive Test Coverage** | **76 Tests** |

### 11.2 Sandbox Isolation in Tests
All tests create temporary directories using `tempfile.mkdtemp()` in their `setUp()` method and clean them up in `tearDown()`. Testing never modifies or pollutes the user's real `data/applications.json` file.

---

## 12. Step-by-Step Execution & Demonstration Guide

### 12.1 How to Run the Web Dashboard
```powershell
# From the project workspace root:
python server.py
```
Open your browser to:
* **Interactive Dashboard:** `http://localhost:8000`
* **Swagger API Explorer:** `http://localhost:8000/docs`

### 12.2 How to Run the Terminal CLI
```powershell
python main.py
```

### 12.3 How to Run the Automated Test Suite
```powershell
python -m unittest discover -s JobTrack/tests -t JobTrack -v
```

### 12.4 The 7-Step Demonstration Script
1. **Show Dashboard Overview:** Highlight KPI cards (Total Applications, Interviews, Offers, Conversion Rate) and the Applicant Greeting ("Welcome back, Naga Chiranjeevi!").
2. **Toggle Dark Mode:** Click the Sun/Moon button in the header to demonstrate instant theme switching and responsive Tailwind design.
3. **Seed Sample Data:** Click "Load Demo Data" to instantly populate realistic corporate applications (Google, Microsoft, Amazon, Stripe).
4. **Create an Application:** Click "+ New Application", enter job details, and demonstrate real-time table updates with toast feedback.
5. **Schedule an Interview:** Open an application, add an upcoming interview round with meeting URL, and observe the parent application automatically transition to `INTERVIEWING`.
6. **Check Urgency & Reminders:** Navigate to the Reminders tab to show how the system detects today's interviews and approaching deadlines.
7. **Export Sanitized CSV:** Click "Export CSV" to show generated reports with formula injection protection.

---

## 13. Viva Voce & Technical Interview Defense Q&A

### Q1: Why did you choose a layered architecture rather than putting all logic in the FastAPI routes?
**Answer:** Putting business logic inside route handlers couples domain rules to HTTP concerns. By separating code into Domain Models (`src/models`), Services (`src/services`), and Storage (`src/storage`), the exact same business logic powers both the FastAPI web dashboard and the terminal CLI without duplicating a single line of code. It also allows 100% isolated unit testing without spinning up HTTP servers.

### Q2: What is atomic file I/O and why is it important for this project?
**Answer:** Standard file writing (`open("file.json", "w")`) truncates the file immediately. If power is lost or the system crashes mid-write, data is permanently lost. Our `JSONStorage` writes first to a temporary file (`applications.json.tmp.PID`), flushes OS buffers via `os.fsync()`, and replaces the target file using `os.replace()`. Under POSIX and Windows NT, `os.replace()` is an atomic operation, meaning the file either fully updates or remains unchanged—preventing file corruption.

### Q3: What is CSV Formula Injection and how did you prevent it?
**Answer:** CSV Formula Injection (also called DDE injection) occurs when cell text beginning with `=`, `+`, `-`, or `@` is opened in Excel or Google Sheets. The spreadsheet interprets the text as an executable formula. We implemented defense-in-depth sanitization in `CSVExporter.sanitize_cell()`: any string starting with formula operators is automatically prepended with a single quote (`'`), instructing the spreadsheet engine to treat the value purely as literal text.

### Q4: Why did you build the React frontend using CDN Babel rather than Vite or Next.js?
**Answer:** In educational, portfolio, and viva settings, evaluators and classmates frequently encounter `node_modules` conflicts, incompatible Node versions, and complex build scripts. By utilizing React 18, Babel Standalone, and Tailwind CSS over CDN, JobTrack Pro requires zero build steps and zero npm installations. Running `python server.py` serves the full interactive React SPA immediately on any machine with Python installed.

### Q5: How does the Reminder Engine prevent alert fatigue?
**Answer:** The `ReminderService` checks application status before issuing alerts. Applications marked as `REJECTED`, `WITHDRAWN`, or `GHOSTED` are filtered out. Alerts are only generated for active pipelines, categorizing events into *Today's Interviews*, *Upcoming Interviews (within the lookahead window)*, and *Approaching Deadlines*.

---
*End of Complete Implementation & Structural Architecture Guide — JobTrack Pro*

