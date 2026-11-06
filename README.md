# 🚀 JobTrack Pro — Job Application & Interview Pipeline Platform

[![Python 3.8+](https://img.shields.io/badge/Python-3.8%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/Frontend-React%2018-61DAFB.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

**JobTrack Pro** is a modern, responsive personal job application tracker and interview management system designed with a clean **4-Tier Architecture** and **mobile-first responsive design**.

---

## ✨ Key Features

- 📱 **Fully Responsive UI**: Mobile-first design with a slide-out drawer, bottom thumb navigation bar, and one-click toggle between **Cards View** and **Table View**.
- 🌓 **Dynamic Theme Engine**: Light and Dark mode with automatic system detection and persistent preference.
- ⚡ **Dual Server Architecture**:
  - **FastAPI Production Server**: High-performance RESTful API with interactive Swagger docs (`/docs`).
  - **Zero-Install Fallback Mode**: Instantly launches the web dashboard using Python's standard library alone if dependencies are not yet installed!
- 💻 **Offline Terminal CLI**: Interactive console menu interface running with zero external dependencies.
- 📊 **Funnel Analytics**: Real-time conversion ratios (Application-to-Interview, Interview-to-Offer, Overall Offer Rate) and pipeline distribution charts.
- 🔔 **Proactive Reminders**: Alerts for today's scheduled interviews, approaching deadlines, and past-due follow-ups.
- 🔒 **Zero Data Corruption & CSV Security**: Atomic file operations with temporary file replacement and formula injection protection for CSV downloads.

---

## 🏃 Quick Start

### 1. Launch the Web Dashboard
```powershell
python server.py
```
- Open in Browser: **[http://localhost:8000](http://localhost:8000)**
- Interactive API Docs (Swagger): **[http://localhost:8000/docs](http://localhost:8000/docs)**
- Alternative Docs (ReDoc): **[http://localhost:8000/redoc](http://localhost:8000/redoc)**

> **Note**: If you haven't installed dependencies yet, `python server.py` automatically runs in standard library preview mode with interactive demo data! To enable the full FastAPI REST backend:
> ```powershell
> pip install -r requirements.txt
> ```

---

### 2. Launch the Terminal CLI (Offline, Zero Dependencies)
```powershell
python main.py
```
Provides a clean, numbered menu interface to track applications, schedule interview rounds, check reminders, and export data directly from your terminal.

---

### 3. Run the Comprehensive Test Suite
```powershell
python -m unittest discover -s JobTrack/JobTrack/tests -t JobTrack/JobTrack -v
```
Runs 76 unit and integration test cases covering domain models, services, storage, validators, reminders, analytics, and security.

---

## 📐 Architecture & Structure

For complete architectural details, sequence diagrams, and responsive design breakpoints, please see [ARCHITECTURE.md](./ARCHITECTURE.md).

```text
JobTrack/
├── server.py              # Root launcher for Web Dashboard & REST API
├── main.py                # Root launcher for Terminal CLI
├── requirements.txt       # Dependencies (fastapi, uvicorn, pydantic, httpx)
├── README.md              # Project overview & usage guide
├── ARCHITECTURE.md        # 4-tier architecture & responsive design specs
└── JobTrack/
    └── JobTrack/
        ├── frontend/      # Responsive React 18 + Tailwind CSS SPA
        ├── src/           # Domain business logic & services
        ├── data/          # JSON data store
        ├── exports/       # Sanitized CSV reports
        └── tests/         # Unit and integration test suites
```

