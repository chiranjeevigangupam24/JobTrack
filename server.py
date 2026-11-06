#!/usr/bin/env python3
"""JobTrack Pro — Root Web Dashboard & Built-in REST API Server.

Permits executing 'python server.py' directly from the workspace root.
- Automatic Pure Standard Library Mode: Built-in resilient REST API engine and
  static web server with zero external dependencies, persistent JSON storage,
  and anti-caching headers for instant updates!
- Full FastAPI Mode (optional): When fastapi & uvicorn are installed, seamlessly
  delegates to the ASGI application.
"""

import datetime
import http.server
import importlib.util
import json
import mimetypes
import os
import re
import socketserver
import sys
import urllib.parse
import uuid
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
CANDIDATE_PATHS = [
    ROOT_DIR / "JobTrack" / "JobTrack",
    ROOT_DIR / "JobTrack",
    ROOT_DIR,
]

PROJECT_DIR = None
for p in CANDIDATE_PATHS:
    if (p / "src").exists() and (p / "data").exists() and (p / "frontend").exists():
        PROJECT_DIR = p
        break

if PROJECT_DIR is None:
    PROJECT_DIR = ROOT_DIR / "JobTrack" / "JobTrack"

DATA_DIR = PROJECT_DIR / "data"
FRONTEND_DIR = PROJECT_DIR / "frontend"

if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))


# ==============================================================================
# Built-in Standard Library REST Engine for Zero-Install Persistence
# ==============================================================================

class BuiltinAPIEngine:
    """Zero-dependency REST API engine reading/writing JobTrack JSON storage."""

    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.apps_file = data_dir / "applications.json"
        self.settings_file = data_dir / "settings.json"

    def load_applications(self) -> list:
        if self.apps_file.exists():
            try:
                with open(self.apps_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return []
        return []

    def save_applications(self, apps: list):
        self.data_dir.mkdir(parents=True, exist_ok=True)
        temp_file = self.apps_file.with_suffix(".tmp")
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(apps, f, indent=4)
        temp_file.replace(self.apps_file)

    def load_settings(self) -> dict:
        if self.settings_file.exists():
            try:
                with open(self.settings_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {
            "applicant_name": "Naga Chiranjeevi",
            "theme_mode": "dark",
            "reminder_window_days": 14,
            "default_application_status": "Applied",
            "date_display_format": "%d-%m-%Y"
        }

    def save_settings(self, settings: dict):
        self.data_dir.mkdir(parents=True, exist_ok=True)
        with open(self.settings_file, "w", encoding="utf-8") as f:
            json.dump(settings, f, indent=4)

    def get_meta(self) -> dict:
        return {
            "statuses": [
                "Applied", "Assessment", "Interview", "Offer Received",
                "Selected", "Rejected", "Withdrawn"
            ],
            "job_types": [
                "Full-time", "Part-time", "Contract", "Internship", "Freelance", "Remote"
            ],
            "interview_rounds": [
                "Recruiter Screening", "Technical Assessment", "System Design",
                "Behavioral & Cultural", "Managerial Round", "HR Discussion",
                "Final Round", "Other"
            ],
            "interview_modes": [
                "Online / Video", "Phone Call", "In-Person / Onsite"
            ],
            "interview_outcomes": [
                "Pending", "Passed", "Failed", "On Hold"
            ]
        }

    def get_applications(self, search: str = "", status: str = "", job_type: str = "") -> list:
        apps = self.load_applications()
        result = apps

        if search:
            q = search.lower()
            result = [
                a for a in result
                if q in a.get("company_name", "").lower()
                or q in a.get("job_role", "").lower()
                or q in a.get("location", "").lower()
                or q in a.get("notes", "").lower()
            ]

        if status and status != "All":
            result = [a for a in result if a.get("status") == status]

        if job_type and job_type != "All":
            result = [a for a in result if a.get("job_type") == job_type]

        # Sort descending by application_date or created_at
        result.sort(key=lambda a: (a.get("application_date") or a.get("created_at") or ""), reverse=True)
        return result

    def get_application_by_id(self, app_id: str) -> dict:
        apps = self.load_applications()
        for a in apps:
            if a.get("application_id") == app_id:
                return a
        return None

    def create_application(self, data: dict) -> dict:
        apps = self.load_applications()
        now_str = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        app_id = f"APP-{uuid.uuid4().hex[:8].upper()}"
        settings = self.load_settings()

        min_sal = data.get("min_salary")
        max_sal = data.get("max_salary")
        try:
            clean_min = float(min_sal) if min_sal not in (None, "", "null") else None
        except (ValueError, TypeError):
            clean_min = None
        try:
            clean_max = float(max_sal) if max_sal not in (None, "", "null") else None
        except (ValueError, TypeError):
            clean_max = None

        new_app = {
            "application_id": app_id,
            "company_name": data.get("company_name", "").strip(),
            "job_role": data.get("job_role", "").strip(),
            "location": data.get("location", "").strip(),
            "job_type": data.get("job_type", "Full-time"),
            "job_description": data.get("job_description", ""),
            "application_date": data.get("application_date") or datetime.date.today().isoformat(),
            "application_deadline": data.get("application_deadline") or None,
            "job_url": data.get("job_url", ""),
            "min_salary": clean_min,
            "max_salary": clean_max,
            "status": data.get("status", "Applied"),
            "notes": data.get("notes", ""),
            "applicant_name": settings.get("applicant_name", "Naga Chiranjeevi"),
            "created_at": now_str,
            "updated_at": now_str,
            "interviews": []
        }
        apps.insert(0, new_app)
        self.save_applications(apps)
        return new_app

    def update_application(self, app_id: str, data: dict) -> dict:
        apps = self.load_applications()
        target = None
        for a in apps:
            if a.get("application_id") == app_id:
                target = a
                break
        if not target:
            return None

        # Update fields
        for field in [
            "company_name", "job_role", "location", "job_type", "job_description",
            "application_date", "application_deadline", "job_url", "status", "notes"
        ]:
            if field in data:
                target[field] = data[field]

        if "min_salary" in data:
            val = data["min_salary"]
            try:
                target["min_salary"] = float(val) if val not in (None, "", "null") else None
            except (ValueError, TypeError):
                target["min_salary"] = None
        if "max_salary" in data:
            val = data["max_salary"]
            try:
                target["max_salary"] = float(val) if val not in (None, "", "null") else None
            except (ValueError, TypeError):
                target["max_salary"] = None

        target["updated_at"] = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        self.save_applications(apps)
        return target

    def delete_application(self, app_id: str) -> bool:
        apps = self.load_applications()
        new_apps = [a for a in apps if a.get("application_id") != app_id]
        if len(new_apps) == len(apps):
            return False
        self.save_applications(new_apps)
        return True

    def get_all_interviews(self) -> list:
        apps = self.load_applications()
        interviews = []
        for a in apps:
            for iv in a.get("interviews", []):
                enriched = dict(iv)
                enriched["company_name"] = a.get("company_name", "")
                enriched["job_role"] = a.get("job_role", "")
                enriched["location"] = a.get("location", "")
                interviews.append(enriched)
        interviews.sort(key=lambda i: (i.get("interview_date") or "", i.get("interview_time") or ""), reverse=True)
        return interviews

    def schedule_interview(self, data: dict) -> dict:
        app_id = data.get("application_id")
        apps = self.load_applications()
        target = None
        for a in apps:
            if a.get("application_id") == app_id:
                target = a
                break
        if not target:
            return None

        iv_id = f"INT-{uuid.uuid4().hex[:8].upper()}"
        now_str = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        new_round = {
            "interview_id": iv_id,
            "application_id": app_id,
            "round_name": data.get("round_name", "Technical Assessment"),
            "interview_date": data.get("interview_date") or datetime.date.today().isoformat(),
            "interview_time": data.get("interview_time", "10:00"),
            "interview_mode": data.get("interview_mode", "Online / Video"),
            "meeting_link": data.get("meeting_link", ""),
            "interview_status": "Scheduled",
            "prep_notes": data.get("prep_notes", ""),
            "outcome": "Pending",
            "created_at": now_str,
            "updated_at": now_str,
        }
        if "interviews" not in target:
            target["interviews"] = []
        target["interviews"].append(new_round)
        if target.get("status") in ["Applied", "Assessment"]:
            target["status"] = "Interview"
        target["updated_at"] = now_str
        self.save_applications(apps)
        return new_round

    def record_outcome(self, app_id: str, iv_id: str, data: dict) -> dict:
        apps = self.load_applications()
        for a in apps:
            if a.get("application_id") == app_id:
                for iv in a.get("interviews", []):
                    if iv.get("interview_id") == iv_id:
                        iv["outcome"] = data.get("outcome", "Passed")
                        if iv["outcome"] in ["Passed", "Failed"]:
                            iv["interview_status"] = "Completed"
                        if data.get("notes"):
                            iv["prep_notes"] = f"{iv.get('prep_notes', '')}\nOutcome Notes: {data['notes']}".strip()
                        iv["updated_at"] = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
                        
                        if data.get("update_app_status"):
                            a["status"] = data["update_app_status"]
                        elif iv["outcome"] == "Failed":
                            a["status"] = "Rejected"
                        elif iv["outcome"] == "Passed" and a.get("status") == "Interview":
                            a["status"] = "Offer Received"
                        
                        a["updated_at"] = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
                        self.save_applications(apps)
                        return a
        return None

    def cancel_interview(self, app_id: str, iv_id: str, reason: str = "") -> dict:
        apps = self.load_applications()
        for a in apps:
            if a.get("application_id") == app_id:
                for iv in a.get("interviews", []):
                    if iv.get("interview_id") == iv_id:
                        iv["interview_status"] = "Cancelled"
                        if reason:
                            iv["prep_notes"] = f"{iv.get('prep_notes', '')}\nCancelled: {reason}".strip()
                        iv["updated_at"] = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
                        a["updated_at"] = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
                        self.save_applications(apps)
                        return a
        return None

    def get_reminders(self, window_days: int = 14) -> dict:
        apps = self.load_applications()
        today = datetime.date.today()
        today_str = today.isoformat()
        cutoff_date = (today + datetime.timedelta(days=window_days)).isoformat()

        interviews_today = []
        upcoming_deadlines = []
        overdue_deadlines = []

        for a in apps:
            # Check interview rounds
            for iv in a.get("interviews", []):
                if iv.get("interview_date") == today_str and iv.get("interview_status") == "Scheduled":
                    iv_copy = dict(iv)
                    iv_copy["company_name"] = a.get("company_name")
                    iv_copy["job_role"] = a.get("job_role")
                    interviews_today.append(iv_copy)

            # Check deadlines
            deadline = a.get("application_deadline")
            if deadline and a.get("status") not in ["Selected", "Rejected", "Withdrawn"]:
                if today_str <= deadline <= cutoff_date:
                    upcoming_deadlines.append(a)
                elif deadline < today_str and a.get("status") in ["Applied", "Assessment"]:
                    overdue_deadlines.append(a)

        return {
            "interviews_today": interviews_today,
            "upcoming_deadlines": upcoming_deadlines,
            "overdue_deadlines": overdue_deadlines,
            "summary": {
                "interviews_today_count": len(interviews_today),
                "upcoming_deadlines_count": len(upcoming_deadlines),
                "overdue_deadlines_count": len(overdue_deadlines),
            }
        }

    def get_dashboard(self) -> dict:
        apps = self.load_applications()
        settings = self.load_settings()
        total = len(apps)
        active = len([a for a in apps if a.get("status") not in ["Selected", "Rejected", "Withdrawn"]])
        interviews_cnt = len([a for a in apps if a.get("status") == "Interview"])
        offers = len([a for a in apps if a.get("status") in ["Offer Received", "Selected"]])

        statuses = ["Applied", "Assessment", "Interview", "Offer Received", "Selected", "Rejected", "Withdrawn"]
        pipeline = {s: 0 for s in statuses}
        for a in apps:
            st = a.get("status", "Applied")
            if st in pipeline:
                pipeline[st] += 1
            else:
                pipeline[st] = 1

        interview_rate = round((interviews_cnt / total * 100), 1) if total > 0 else 0.0
        offer_rate = round((offers / total * 100), 1) if total > 0 else 0.0

        all_ivs = self.get_all_interviews()
        upcoming = [i for i in all_ivs if i.get("interview_status") == "Scheduled"][:5]

        return {
            "kpis": {
                "total_applications": total,
                "active_applications": active,
                "interviews_scheduled": interviews_cnt,
                "offers_received": offers,
                "interview_conversion_rate": interview_rate,
                "offer_conversion_rate": offer_rate,
            },
            "pipeline_by_status": pipeline,
            "upcoming_interviews": upcoming,
            "applicant_name": settings.get("applicant_name", "Naga Chiranjeevi"),
        }

    def generate_csv_export(self, export_type: str, status_filter: str = "") -> tuple:
        """Generate spreadsheet-safe CSV export disarming '=', '+', '-', '@' triggers."""
        import csv
        import io

        def sanitize(val):
            if val is None:
                return ""
            s = str(val).strip()
            if s and s[0] in ("=", "+", "-", "@", "\t", "\r"):
                return f"'{s}"
            return s

        clean_type = export_type.strip().lower()
        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

        if clean_type == "applications":
            apps = self.load_applications()
            if status_filter and status_filter.lower() != "all":
                apps = [a for a in apps if a.get("status", "").lower() == status_filter.lower()]
                filename = f"applications_{status_filter.lower()}_{ts}.csv"
            else:
                filename = f"applications_export_{ts}.csv"

            headers = [
                "Application ID", "Company Name", "Job Role", "Location", "Job Type",
                "Status", "Application Date", "Deadline", "Min Salary", "Max Salary",
                "Job Posting URL", "Interviews Count", "Notes", "Created At", "Applicant Name"
            ]
            writer.writerow(headers)
            for a in apps:
                writer.writerow([
                    sanitize(a.get("application_id")),
                    sanitize(a.get("company_name")),
                    sanitize(a.get("job_role")),
                    sanitize(a.get("location")),
                    sanitize(a.get("job_type")),
                    sanitize(a.get("status")),
                    sanitize(a.get("application_date")),
                    sanitize(a.get("application_deadline") or "N/A"),
                    sanitize(a.get("min_salary") or ""),
                    sanitize(a.get("max_salary") or ""),
                    sanitize(a.get("job_url") or ""),
                    len(a.get("interviews", [])),
                    sanitize(a.get("notes") or ""),
                    sanitize(a.get("created_at")),
                    sanitize(a.get("applicant_name") or "Naga Chiranjeevi")
                ])

        elif clean_type == "interviews":
            filename = f"interviews_export_{ts}.csv"
            headers = [
                "Interview ID", "Application ID", "Company Name", "Job Role",
                "Round Name", "Date", "Time", "Mode", "Status", "Outcome", "Meeting Link", "Notes"
            ]
            writer.writerow(headers)
            ivs = self.get_all_interviews()
            for iv in ivs:
                writer.writerow([
                    sanitize(iv.get("interview_id")),
                    sanitize(iv.get("application_id")),
                    sanitize(iv.get("company_name")),
                    sanitize(iv.get("job_role")),
                    sanitize(iv.get("round_name")),
                    sanitize(iv.get("interview_date")),
                    sanitize(iv.get("interview_time")),
                    sanitize(iv.get("interview_mode")),
                    sanitize(iv.get("interview_status")),
                    sanitize(iv.get("outcome")),
                    sanitize(iv.get("meeting_link")),
                    sanitize(iv.get("prep_notes"))
                ])

        elif clean_type == "analytics":
            filename = f"analytics_summary_{ts}.csv"
            dash = self.get_dashboard()
            kpis = dash.get("kpis", {})
            writer.writerow(["Metric", "Value"])
            writer.writerow(["Total Applications", kpis.get("total_applications", 0)])
            writer.writerow(["Active Applications", kpis.get("active_applications", 0)])
            writer.writerow(["Interviews Scheduled", kpis.get("interviews_scheduled", 0)])
            writer.writerow(["Offers Received", kpis.get("offers_received", 0)])
            writer.writerow(["Interview Conversion Rate (%)", f"{kpis.get('interview_conversion_rate', 0)}%"])
            writer.writerow(["Offer Conversion Rate (%)", f"{kpis.get('offer_conversion_rate', 0)}%"])
            writer.writerow([])
            writer.writerow(["Pipeline Status", "Count"])
            for st, cnt in dash.get("pipeline_by_status", {}).items():
                writer.writerow([sanitize(st), cnt])
        else:
            filename = f"export_{ts}.csv"
            writer.writerow(["Message", f"Export type '{clean_type}' generated."])

        csv_content = output.getvalue().encode("utf-8")
        return csv_content, filename


# ==============================================================================
# HTTP Request Handler with Built-in API & Static Serving
# ==============================================================================

def run_builtin_server(port: int = 8000):
    """Zero-dependency HTTP server with REST API and static frontend dispatcher."""
    api_engine = BuiltinAPIEngine(DATA_DIR)

    mimetypes.add_type("application/javascript", ".jsx")
    mimetypes.add_type("text/javascript", ".jsx")
    mimetypes.add_type("text/css", ".css")

    class JobTrackHTTPHandler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(FRONTEND_DIR), **kwargs)

        def end_headers(self):
            # Anti-caching headers: Ensures browser always evaluates current JSX & CSS
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "*")
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
            super().end_headers()

        def do_OPTIONS(self):
            self.send_response(200)
            self.end_headers()

        def _send_json(self, data, status: int = 200):
            payload = json.dumps(data, indent=2).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def _parse_body(self) -> dict:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length > 0:
                raw_body = self.rfile.read(content_length).decode("utf-8")
                try:
                    return json.loads(raw_body)
                except Exception:
                    return {}
            return {}

        def do_GET(self):
            parsed = urllib.parse.urlparse(self.path)
            clean_path = parsed.path
            params = urllib.parse.parse_qs(parsed.query)

            # ---------------- API Routing ----------------
            if clean_path == "/api/health":
                return self._send_json({"status": "healthy", "service": "JobTrack Pro", "mode": "builtin_engine", "version": "2.2.0"})

            elif clean_path == "/api/meta":
                return self._send_json(api_engine.get_meta())

            elif clean_path == "/api/dashboard":
                return self._send_json(api_engine.get_dashboard())

            elif clean_path == "/api/applications":
                search = params.get("search", [""])[0]
                status = params.get("status", [""])[0]
                job_type = params.get("job_type", [""])[0]
                return self._send_json(api_engine.get_applications(search=search, status=status, job_type=job_type))

            elif clean_path.startswith("/api/applications/"):
                app_id = clean_path.split("/")[-1]
                app_obj = api_engine.get_application_by_id(app_id)
                if app_obj:
                    return self._send_json(app_obj)
                return self._send_json({"detail": "Application not found"}, status=404)

            elif clean_path == "/api/interviews":
                return self._send_json(api_engine.get_all_interviews())

            elif clean_path == "/api/reminders":
                window = int(params.get("window_days", [14])[0])
                return self._send_json(api_engine.get_reminders(window_days=window))

            elif clean_path == "/api/settings":
                return self._send_json(api_engine.load_settings())

            elif clean_path.startswith("/api/export/"):
                export_type = clean_path.replace("/api/export/", "").split("?")[0].strip().lower()
                status_filter = params.get("status_filter", [""])[0]
                csv_bytes, filename = api_engine.generate_csv_export(export_type, status_filter=status_filter)
                self.send_response(200)
                self.send_header("Content-Type", "text/csv; charset=utf-8")
                self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
                self.send_header("Content-Length", str(len(csv_bytes)))
                self.end_headers()
                self.wfile.write(csv_bytes)
                return

            # ---------------- Frontend Routing ----------------
            elif clean_path == "/" or clean_path == "/index.html":
                self.path = "/index.html"
            elif clean_path.startswith("/static/"):
                self.path = clean_path.replace("/static/", "/", 1)

            return super().do_GET()

        def do_POST(self):
            parsed = urllib.parse.urlparse(self.path)
            clean_path = parsed.path
            body = self._parse_body()

            if clean_path == "/api/applications":
                created = api_engine.create_application(body)
                return self._send_json(created, status=201)

            elif clean_path == "/api/interviews":
                scheduled = api_engine.schedule_interview(body)
                if scheduled:
                    return self._send_json(scheduled, status=201)
                return self._send_json({"detail": "Parent application not found"}, status=404)

            elif "/outcome" in clean_path:
                # /api/interviews/{appId}/{ivId}/outcome
                parts = clean_path.strip("/").split("/")
                if len(parts) >= 4:
                    app_id, iv_id = parts[2], parts[3]
                    updated = api_engine.record_outcome(app_id, iv_id, body)
                    if updated:
                        return self._send_json(updated)
                return self._send_json({"detail": "Interview record not found"}, status=404)

            elif "/cancel" in clean_path:
                # /api/interviews/{appId}/{ivId}/cancel
                parts = clean_path.strip("/").split("/")
                if len(parts) >= 4:
                    app_id, iv_id = parts[2], parts[3]
                    cancelled = api_engine.cancel_interview(app_id, iv_id, body.get("reason", ""))
                    if cancelled:
                        return self._send_json(cancelled)
                return self._send_json({"detail": "Interview record not found"}, status=404)

            elif clean_path == "/api/seed":
                return self._send_json({"message": "JobTrack demo data active", "count": len(api_engine.load_applications())})

            return self._send_json({"detail": "Not found"}, status=404)

        def do_PUT(self):
            parsed = urllib.parse.urlparse(self.path)
            clean_path = parsed.path
            body = self._parse_body()

            if clean_path.startswith("/api/applications/"):
                app_id = clean_path.split("/")[-1]
                updated = api_engine.update_application(app_id, body)
                if updated:
                    return self._send_json(updated)
                return self._send_json({"detail": "Application not found"}, status=404)

            elif clean_path == "/api/settings":
                api_engine.save_settings(body)
                return self._send_json(body)

            return self._send_json({"detail": "Not found"}, status=404)

        def do_DELETE(self):
            parsed = urllib.parse.urlparse(self.path)
            clean_path = parsed.path

            if clean_path.startswith("/api/applications/"):
                app_id = clean_path.split("/")[-1]
                deleted = api_engine.delete_application(app_id)
                if deleted:
                    return self._send_json({"message": "Application deleted successfully"})
                return self._send_json({"detail": "Application not found"}, status=404)

            return self._send_json({"detail": "Not found"}, status=404)

        def log_message(self, format, *args):
            pass  # Keep console output clean

    print("=" * 72)
    print("  JobTrack Pro — Executive Aesthetic Dashboard & Zero-Install Engine")
    print("  Access the app in your browser: http://localhost:8000")
    print("  Persistent JSON data store   : JobTrack/JobTrack/data/applications.json")
    print("=" * 72)

    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("0.0.0.0", port), JobTrackHTTPHandler) as httpd:
            print(f"  Server active on port {port}. Press Ctrl+C to terminate.\n")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server stopped.")


# ==============================================================================
# Entry Point
# ==============================================================================

if __name__ == "__main__":
    # Check if FastAPI is present
    has_fastapi = False
    app = None
    try:
        import fastapi
        import uvicorn
        spec = importlib.util.spec_from_file_location("jobtrack_backend_server", PROJECT_DIR / "server.py")
        server_module = importlib.util.module_from_spec(spec)
        sys.modules["jobtrack_backend_server"] = server_module
        spec.loader.exec_module(server_module)
        app = getattr(server_module, "app", None)
        has_fastapi = (app is not None)
    except Exception:
        has_fastapi = False

    if has_fastapi and app is not None:
        import uvicorn
        print("=" * 72)
        print("  JobTrack Pro — FastAPI Mode Running")
        print("  Open in browser: http://localhost:8000")
        print("=" * 72)
        uvicorn.run(app, host="0.0.0.0", port=8000)
    else:
        run_builtin_server(port=8000)
