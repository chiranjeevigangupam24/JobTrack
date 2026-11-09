# JobTrack Pro — Job Application & Interview Pipeline Manager

A comprehensive, full-stack application tracking system featuring a **modern web dashboard (HTML, Tailwind CSS, React)** connected to a high-speed **FastAPI REST API**, alongside the original zero-dependency **Python CLI**.

---

## 🚀 Quick Start (Web Dashboard)

Run the FastAPI backend server and launch the interactive web dashboard:

```powershell
python server.py
```
Then open your browser at:
- **Interactive Web Dashboard:** [http://localhost:8000](http://localhost:8000)
- **FastAPI Swagger API Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)

*(To run the original terminal CLI instead, execute `python main.py`).*

---

## 1. Project Overview

Finding a job requires juggling dozens of applications across different platforms, scheduling multiple interview rounds, tracking take-home assessment deadlines, and negotiating offers. Many applicants rely on messy spreadsheets or notes that quickly fall out of sync.

**JobTrack** provides a dedicated, offline-first command-line platform that brings structure, discipline, and analytical clarity to the job hunt. It requires **zero external packages**, runs cross-platform, and persists data with atomic safety guarantees.

---

## 2. Problem Statement & Objectives

### Problem Statement
Job seekers frequently encounter:
* Missed deadlines for coding assessments and application forms.
* Forgotten interview schedules and misplaced video conference links.
* Difficulty recalling previous interview rounds and preparation notes.
* Lack of actionable data to assess whether rejection is happening at the resume stage or the interview stage.

### Objectives
1. **Centralize Data:** Maintain a single source of truth for all job applications and their corresponding interview history.
2. **Prevent Missed Deadlines:** Automated reminder calculations highlighting today's events, upcoming schedules, and overdue deadlines.
3. **Analyze Funnel Velocity:** Compute true conversion rates (interview rate, offer rate, interview-to-offer conversion) without external data science libraries.
4. **Data Integrity & Portability:** Guarantee safe local JSON persistence with atomic file writes, coupled with secure CSV export capabilities.

---

## 3. Technology Stack

* **Language:** Python 3.8+
* **Frameworks & Packages:** **None** (Exclusively standard library modules)
* **Standard Modules Utilized:**
  * `json` — Persistent structured storage for applications and configuration.
  * `csv` — Spreadsheet report generation with formula injection prevention.
  * `datetime` — Date arithmetic, ISO 8601 parsing, and reminder window calculation.
  * `pathlib` & `os` — Cross-platform path management and atomic filesystem operations.
  * `uuid` — Cryptographically unique identifier generation for records.
  * `collections.Counter` — High-efficiency categorical distribution aggregation.
  * `typing` & `dataclasses` — Type safety, code readability, and strict domain modeling.
  * `enum` — Centralized status, job type, and interview stage definitions.
  * `tempfile` — Atomic file operations and safe persistence sandboxing.

---

## 4. Key Features

1. **Complete CRUD Lifecycle:** Create, review, update, and delete job applications with multi-field validation.
2. **Dedicated Interview Management:** Schedule multi-round interviews (Screening, Technical, System Design, HR) linked to parent applications.
3. **Configurable Reminder Engine:** Real-time visibility into today's interviews, upcoming interviews, and approaching deadlines. Inactive/rejected applications are intelligently filtered out to eliminate alert noise.
4. **Full-Funnel Analytics:** Instant calculations of conversion ratios, status distributions, top target companies, and interview metrics with custom ASCII distribution charts.
5. **Secure CSV Export:** Timestamped CSV reports with built-in defense against spreadsheet formula injection (escaping characters like `=`, `+`, `-`, `@`).
6. **Resilient JSON Storage:** Atomic file writing via temporary files and `os.replace` to safeguard against data corruption.
7. **Customizable Settings:** Dynamic configuration of the lookahead reminder window, default statuses, and date display formats.

---

## 5. Python Concepts Applied

* **Object-Oriented Design (OOP):** Encapsulation of domain logic in `JobApplication` and `Interview` classes with validation hooks and JSON serializers.
* **Separation of Concerns (SoC):** Distinct separation between models (`src/models`), services (`src/services`), persistence (`src/storage`), reporting (`src/reports`), and terminal presentation (`src/utils`).
* **Defensive Programming:** Custom exceptions (`ValidationError`, `StorageError`, `RecordNotFoundError`) and strict validation preventing runtime crashes from invalid user input.
* **Atomic File I/O:** Flushed and synced writes through PID-specific temporary files to eliminate partial writes.
* **Dependency Injection:** Reference date injection across date utilities and reminder services to facilitate 100% deterministic unit tests.

---

## 6. Directory Structure

```
JobTrack/
├── main.py                     # Application entrypoint & menu router
├── README.md                   # System documentation & usage guide
├── requirements.txt            # Zero-dependency specification
├── .gitignore                  # Git exclusion rules
│
├── data/
│   ├── applications.json       # Persistent JSON applications database
│   └── settings.json           # User configuration settings
│
├── src/
│   ├── __init__.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── application.py      # JobApplication, Interview, and Enums
│   ├── services/
│   │   ├── __init__.py
│   │   ├── application_service.py # Application CRUD, search & filter
│   │   ├── interview_service.py   # Scheduling, rounds, & outcomes
│   │   ├── analytics_service.py   # Funnel metrics & conversion rates
│   │   └── reminder_service.py    # Deadline & schedule alert engine
│   ├── storage/
│   │   ├── __init__.py
│   │   └── json_storage.py     # Atomic file operations & JSON schema
│   ├── reports/
│   │   ├── __init__.py
│   │   └── csv_exporter.py     # Safe CSV exports with formula escaping
│   └── utils/
│       ├── __init__.py
│       ├── validators.py       # Input sanitation & rule enforcement
│       ├── date_utils.py       # Date arithmetic & ISO 8601 formatting
│       └── display.py          # Terminal tables, ASCII cards, & prompts
│
└── exports/
    └── .gitkeep                # Output folder for generated CSV reports
```

---

## 7. Installation & Execution

### Prerequisites
* Python 3.8 or higher installed on Windows, macOS, or Linux.
* No pip install or virtual environment is mandatory (standard library only).

### Running the Application (Windows Command Prompt or PowerShell)
Navigate to the `JobTrack` folder and execute:

```powershell
cd JobTrack
python main.py
```

*(Alternatively, you may run `python main.py` directly from the workspace root).*

---

## 8. Main Menu Guide

```
================================================================================
                              JOBTRACK — MAIN MENU                              
================================================================================
  [ 1]  Dashboard (Quick Overview)
  [ 2]  Add Job Application
  [ 3]  View All Applications
  [ 4]  View Application Details
  [ 5]  Update Application
  [ 6]  Delete Application
  [ 7]  Search Applications
  [ 8]  Filter Applications
  [ 9]  Manage Interviews
  [10]  View Reminders
  [11]  Analytics and Reports
  [12]  Export Data to CSV
  [13]  Settings
  [14]  Help & User Guide
  [15]  Exit
================================================================================
```

### Option Explanations:
1. **Dashboard:** Summarizes total applications, interview counts, active pipeline breakdown, and overdue deadline count.
2. **Add Job Application:** Step-by-step prompt to record company, role, location, job type, salary range, dates, URL, and notes.
3. **View All Applications:** Clean, column-aligned table displaying all applications, IDs, and statuses.
4. **View Application Details:** Detailed card view including notes, URLs, and complete interview chronology.
5. **Update Application:** Edit any specific field without risk of losing associated interview history.
6. **Delete Application:** Deletes an application record after explicit confirmation.
7. **Search Applications:** Substring search across Company, Role, Location, or Application ID.
8. **Filter Applications:** Filter applications by Status (e.g. `Applied`, `Interview`, `Offer Received`), Job Type, or Date Range.
9. **Manage Interviews:** Dedicated workflow to schedule rounds, view upcoming interviews, update notes, cancel interviews, or log outcomes.
10. **View Reminders:** Review interviews scheduled for today, upcoming interviews in the configured window (default 7 days), and active overdue deadlines.
11. **Analytics and Reports:** Comprehensive funnel metrics, stage conversion rates, and company breakdown.
12. **Export Data to CSV:** Export full application logs, status subsets, interview records, or analytics summaries into `exports/`.
13. **Settings:** Adjust the reminder lookahead window (1–90 days), default application status, and date presentation format.
14. **Help:** In-terminal manual and status definitions.
15. **Exit:** Graceful termination with confirmation.

---

## 9. Sample Terminal Output

### Analytics Dashboard
```
================================================================================
                   JOB SEARCH ANALYTICS & PROGRESS REPORT                   
================================================================================
  KEY PERFORMANCE METRICS
  ----------------------------------------
  Total Applications Submitted : 12
  Offers Received              : 2
  Applications Rejected        : 3
  Applications Withdrawn       : 1

  Total Interviews Logged      : 8
  Completed Interviews         : 6
  Scheduled Interviews         : 2
  Cancelled Interviews         : 0

  CONVERSION RATES
  ----------------------------------------
  Interview Conversion Rate    : 50.0%
    (Applications advancing to interview stage / Total applications)
  Overall Offer Rate           : 16.7%
    (Offers received / Total applications)
  Interview-to-Offer Rate      : 33.3%
    (Offers received / Applications reaching interview)

--- Application Status Distribution --------------------------------------------
  Applied          : [##########---------------]   5 ( 41.7%)
  Assessment       : [####---------------------]   2 ( 16.7%)
  Interview        : [####---------------------]   2 ( 16.7%)
  Offer Received   : [##-----------------------]   1 (  8.3%)
  Selected         : [##-----------------------]   1 (  8.3%)
  Rejected         : [######-------------------]   3 ( 25.0%)
  Withdrawn        : [##-----------------------]   1 (  8.3%)
================================================================================
```

---

## 10. Security & Data Integrity

1. **Spreadsheet Formula Injection Defense (CSV Injection):**
   When exporting to CSV, any text cell beginning with characters such as `=`, `+`, `-`, `@`, `\t`, or `\r` is automatically escaped with a leading single quote (`'`). The underlying stored application record is **never mutated**.
2. **Atomic Writes:**
   All persistence operations write to a temporary file (`applications.json.<pid>.tmp`), flush buffers to disk (`os.fsync`), and atomically replace the target (`os.replace`). A sudden program termination or power outage will never leave `applications.json` in a half-written or corrupted state.
3. **No Unsafe Code Execution:**
   No `eval()`, `exec()`, or shell command execution is permitted on user inputs or JSON data.

---

## 12. Limitations & Future Roadmap

### Current Limitations:
* **Single-User Local Environment:** Designed for local CLI use without concurrent network write locks.
* **Terminal Display:** Designed for standard 80-column terminal environments.

### Future Roadmap:
* Automatic backup snapshot creation in `data/backups/`.
* Export to PDF report summaries via standard library PostScript generation.
* Colorized terminal output using ANSI escape sequences with automated fallback for legacy terminals.
