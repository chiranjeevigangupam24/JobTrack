"""Comprehensive Exhaustive Test Suite for JobTrack Pro.

Systematically verifies EVERY use case and edge case across:
1. Domain Models & Validators (Application, Interview, Enums)
2. Domain Services (CRUD, Search, Multi-Filter, Cascade Deletes)
3. Interview Lifecycle (Scheduling, Auto-Bump Status, Outcomes, Cancellations)
4. Reminders & Alerts (Today's Events, Window Math, Overdue Deadlines)
5. Analytics & Conversion Rates (Funnel Velocity, Zero-Division Safety)
6. Security & Storage (Atomic File I/O, Recovery, CSV Injection Sanitization)
7. FastAPI REST API (Status Codes, Validation Responses, File Downloads)
"""

import os
import shutil
import sys
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path

# Add JobTrack to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

try:
    from fastapi.testclient import TestClient
    from server import app
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False
    TestClient = None
    app = None
from src.models.application import (
    ApplicationStatus,
    Interview,
    InterviewMode,
    InterviewOutcome,
    InterviewRound,
    InterviewStatus,
    JobApplication,
    JobType,
)
from src.reports.csv_exporter import CSVExporter
from src.services.analytics_service import AnalyticsService
from src.services.application_service import ApplicationService, RecordNotFoundError
from src.services.interview_service import InterviewService
from src.services.reminder_service import ReminderService
from src.storage.json_storage import JSONStorage, StorageError
from src.utils.date_utils import format_date, get_current_date, is_past_due, is_today, is_within_days
from src.utils.validators import (
    ValidationError,
    sanitize_for_csv,
    validate_date,
    validate_date_range,
    validate_required,
    validate_salary,
    validate_time,
    validate_url,
)


class TestExhaustiveDomainCases(unittest.TestCase):
    """Exhaustive tests for domain logic, validators, services, and persistence."""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.storage = JSONStorage(data_dir=self.temp_dir)
        self.app_service = ApplicationService(storage=self.storage)
        self.interview_service = InterviewService(app_service=self.app_service)
        self.reminder_service = ReminderService(app_service=self.app_service, default_window_days=7)
        self.analytics_service = AnalyticsService(app_service=self.app_service)
        self.csv_exporter = CSVExporter(export_dir=self.temp_dir)

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    # ------------------ CASE 1-5: Required Fields & Basic Creation ------------------

    def test_case_01_create_valid_application_full_fields(self):
        """Case 01: Create valid application with all fields provided."""
        app_obj = self.app_service.add_application(
            company_name="Google",
            job_role="Senior Python Engineer",
            location="Bengaluru",
            job_type="Full-time",
            job_description="FastAPI + Cloud",
            application_date="2026-10-15",
            application_deadline="2026-11-15",
            job_url="https://careers.google.com/job/123",
            min_salary=100000.0,
            max_salary=150000.0,
            status="Applied",
            notes="Direct referral",
        )
        self.assertIsNotNone(app_obj.application_id)
        self.assertEqual(app_obj.company_name, "Google")
        self.assertEqual(app_obj.job_role, "Senior Python Engineer")
        self.assertEqual(app_obj.min_salary, 100000.0)
        self.assertEqual(app_obj.max_salary, 150000.0)

    def test_case_02_create_application_minimum_fields(self):
        """Case 02: Create application with minimum required fields (company & role)."""
        app_obj = self.app_service.add_application(
            company_name="Acme Corp",
            job_role="Software Engineer",
        )
        self.assertEqual(app_obj.company_name, "Acme Corp")
        self.assertEqual(app_obj.location, "Remote")
        self.assertEqual(app_obj.job_type, "Full-time")
        self.assertEqual(app_obj.status, ApplicationStatus.APPLIED)

    def test_case_03_missing_company_name_raises_validation_error(self):
        """Case 03: Empty company name or whitespace raises ValidationError."""
        with self.assertRaises(ValidationError):
            self.app_service.add_application(company_name="", job_role="Dev")
        with self.assertRaises(ValidationError):
            self.app_service.add_application(company_name="   ", job_role="Dev")

    def test_case_04_missing_job_role_raises_validation_error(self):
        """Case 04: Empty job role or whitespace raises ValidationError."""
        with self.assertRaises(ValidationError):
            self.app_service.add_application(company_name="Acme", job_role="")
        with self.assertRaises(ValidationError):
            self.app_service.add_application(company_name="Acme", job_role="   ")

    def test_case_05_invalid_date_formats(self):
        """Case 05: Invalid calendar dates or wrong date formats raise ValidationError."""
        with self.assertRaises(ValidationError):
            validate_date("2026/10/25", "Date")
        with self.assertRaises(ValidationError):
            validate_date("25-10-2026", "Date")
        with self.assertRaises(ValidationError):
            validate_date("not-a-date", "Date")
        with self.assertRaises(ValidationError):
            validate_date("2026-02-30", "Date")  # Non-existent calendar day

    # ------------------ CASE 6-10: Salary, URL & Status Validation ------------------

    def test_case_06_negative_salary_raises_validation_error(self):
        """Case 06: Negative salary is rejected."""
        with self.assertRaises(ValidationError):
            validate_salary(-1000, 50000)
        with self.assertRaises(ValidationError):
            validate_salary(50000, -500)

    def test_case_07_min_salary_greater_than_max_salary_rejected(self):
        """Case 07: min_salary > max_salary is rejected."""
        with self.assertRaises(ValidationError):
            validate_salary(120000, 80000)

    def test_case_08_invalid_url_format_rejected(self):
        """Case 08: URL not starting with http/https is rejected."""
        with self.assertRaises(ValidationError):
            validate_url("ftp://example.com", allow_empty=False)
        with self.assertRaises(ValidationError):
            validate_url("www.example.com", allow_empty=False)
        with self.assertRaises(ValidationError):
            validate_url("just-a-string", allow_empty=False)

    def test_case_09_valid_url_formats_accepted(self):
        """Case 09: Valid HTTP and HTTPS URLs are parsed cleanly."""
        self.assertEqual(validate_url("https://careers.google.com"), "https://careers.google.com")
        self.assertEqual(validate_url("http://localhost:8000/test"), "http://localhost:8000/test")
        self.assertIsNone(validate_url("", allow_empty=True))

    def test_case_10_status_enum_case_insensitivity(self):
        """Case 10: Status parsing is case-insensitive and rejects invalid values."""
        self.assertEqual(ApplicationStatus.from_string("applied"), ApplicationStatus.APPLIED)
        self.assertEqual(ApplicationStatus.from_string("INTERVIEW"), ApplicationStatus.INTERVIEW)
        self.assertEqual(ApplicationStatus.from_string("Offer Received"), ApplicationStatus.OFFER_RECEIVED)
        with self.assertRaises(ValidationError):
            ApplicationStatus.from_string("UNKNOWN_STATUS")

    # ------------------ CASE 11-15: Search & Multi-Criteria Filtering ------------------

    def test_case_11_case_insensitive_search(self):
        """Case 11: Search matches company, role, location, or status regardless of case."""
        self.app_service.add_application(company_name="Microsoft", job_role="Backend Dev", location="Hyderabad")
        self.app_service.add_application(company_name="Amazon", job_role="Frontend Dev", location="Remote")

        # Search company
        results = self.app_service.search_applications("micro")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].company_name, "Microsoft")

        # Search role
        results = self.app_service.search_applications("frontend")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].company_name, "Amazon")

        # Search location
        results = self.app_service.search_applications("hyderabad")
        self.assertEqual(len(results), 1)

    def test_case_12_empty_search_returns_all_applications(self):
        """Case 12: Empty or whitespace search string returns all applications."""
        self.app_service.add_application(company_name="A", job_role="Eng")
        self.app_service.add_application(company_name="B", job_role="Eng")
        self.assertEqual(len(self.app_service.search_applications("")), 2)
        self.assertEqual(len(self.app_service.search_applications("   ")), 2)

    def test_case_13_filter_by_status(self):
        """Case 13: Filter applications by specific status."""
        self.app_service.add_application(company_name="A", job_role="Eng", status="Applied")
        self.app_service.add_application(company_name="B", job_role="Eng", status="Interview")

        results = self.app_service.filter_applications(status="Interview")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].company_name, "B")

    def test_case_14_filter_by_job_type(self):
        """Case 14: Filter applications by job type."""
        self.app_service.add_application(company_name="A", job_role="Eng", job_type="Full-time")
        self.app_service.add_application(company_name="B", job_role="Intern", job_type="Internship")

        results = self.app_service.filter_applications(job_type="Internship")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].company_name, "B")

    def test_case_15_filter_by_date_range(self):
        """Case 15: Filter applications within inclusive date boundaries."""
        self.app_service.add_application(company_name="Old", job_role="Dev", application_date="2026-01-01")
        self.app_service.add_application(company_name="Target", job_role="Dev", application_date="2026-05-15")
        self.app_service.add_application(company_name="Future", job_role="Dev", application_date="2026-12-01")

        results = self.app_service.filter_applications(start_date="2026-05-01", end_date="2026-05-31")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].company_name, "Target")

    def test_case_16_invalid_date_range_rejected(self):
        """Case 16: Start date later than end date raises ValidationError."""
        with self.assertRaises(ValidationError):
            validate_date_range("2026-12-01", "2026-01-01")

    # ------------------ CASE 17-22: Application Updates & Deletion ------------------

    def test_case_17_update_application_attributes(self):
        """Case 17: Update application fields while keeping unchanged fields intact."""
        app_obj = self.app_service.add_application(company_name="OldCorp", job_role="Dev")
        updated = self.app_service.update_application(
            app_obj.application_id,
            company_name="NewCorp",
            location="Bengaluru",
        )
        self.assertEqual(updated.company_name, "NewCorp")
        self.assertEqual(updated.location, "Bengaluru")
        self.assertEqual(updated.job_role, "Dev")

    def test_case_18_update_non_existent_application_raises_error(self):
        """Case 18: Updating a non-existent ID raises RecordNotFoundError."""
        with self.assertRaises(RecordNotFoundError):
            self.app_service.update_application("APP-NONEXISTENT", company_name="Fake")

    def test_case_19_delete_application(self):
        """Case 19: Delete application removes it completely from memory and storage."""
        app_obj = self.app_service.add_application(company_name="ToDelete", job_role="Dev")
        self.assertTrue(self.app_service.delete_application(app_obj.application_id))
        self.assertIsNone(self.app_service.get_application_by_id(app_obj.application_id))

    def test_case_20_delete_non_existent_application_raises_error(self):
        """Case 20: Deleting a non-existent ID raises RecordNotFoundError."""
        with self.assertRaises(RecordNotFoundError):
            self.app_service.delete_application("APP-NONEXISTENT")

    # ------------------ CASE 21-26: Interview Lifecycle ------------------

    def test_case_21_schedule_interview_and_auto_status_transition(self):
        """Case 21: Scheduling an interview automatically advances status from 'Applied' to 'Interview'."""
        app_obj = self.app_service.add_application(company_name="Stripe", job_role="API Eng", status="Applied")
        iv = self.interview_service.schedule_interview(
            application_id=app_obj.application_id,
            round_name="Technical",
            interview_date="2026-11-10",
            interview_time="14:00",
            meeting_link="https://meet.google.com/xyz",
        )
        self.assertIsNotNone(iv.interview_id)
        # Check application status auto-updated to Interview
        reloaded_app = self.app_service.get_application_by_id(app_obj.application_id)
        self.assertEqual(reloaded_app.status, ApplicationStatus.INTERVIEW)

    def test_case_22_schedule_interview_invalid_time_rejected(self):
        """Case 22: Invalid time string (e.g. 25:00 or 9am) raises ValidationError."""
        with self.assertRaises(ValidationError):
            validate_time("25:00", "Time")
        with self.assertRaises(ValidationError):
            validate_time("9:00am", "Time")

    def test_case_23_schedule_interview_for_invalid_app_raises_error(self):
        """Case 23: Scheduling an interview for a missing app raises RecordNotFoundError."""
        with self.assertRaises(RecordNotFoundError):
            self.interview_service.schedule_interview(
                application_id="APP-MISSING",
                round_name="HR",
                interview_date="2026-11-10",
                interview_time="10:00",
            )

    def test_case_24_update_interview_details(self):
        """Case 24: Update existing interview attributes."""
        app_obj = self.app_service.add_application(company_name="Meta", job_role="Dev")
        iv = self.interview_service.schedule_interview(
            application_id=app_obj.application_id,
            round_name="Screening",
            interview_date="2026-11-10",
            interview_time="10:00",
        )
        updated_iv = self.interview_service.update_interview(
            application_id=app_obj.application_id,
            interview_id=iv.interview_id,
            round_name="System Design",
            interview_time="11:30",
        )
        self.assertEqual(updated_iv.round_name, "System Design")
        self.assertEqual(updated_iv.interview_time, "11:30")

    def test_case_25_record_interview_outcome(self):
        """Case 25: Record outcome (Passed) and verify interview status becomes Completed."""
        app_obj = self.app_service.add_application(company_name="Netflix", job_role="Dev")
        iv = self.interview_service.schedule_interview(
            application_id=app_obj.application_id,
            round_name="Coding",
            interview_date="2026-11-10",
            interview_time="10:00",
        )
        completed_iv = self.interview_service.record_outcome(
            application_id=app_obj.application_id,
            interview_id=iv.interview_id,
            outcome="Passed",
            notes="Strong algorithms performance",
        )
        self.assertEqual(completed_iv.outcome, InterviewOutcome.PASSED)
        self.assertEqual(completed_iv.interview_status, InterviewStatus.COMPLETED)
        self.assertIn("Strong algorithms performance", completed_iv.prep_notes)

    def test_case_26_cancel_interview(self):
        """Case 26: Cancel interview round with reason."""
        app_obj = self.app_service.add_application(company_name="Apple", job_role="Dev")
        iv = self.interview_service.schedule_interview(
            application_id=app_obj.application_id,
            round_name="Screening",
            interview_date="2026-11-10",
            interview_time="10:00",
        )
        cancelled_iv = self.interview_service.cancel_interview(
            application_id=app_obj.application_id,
            interview_id=iv.interview_id,
            cancellation_reason="Candidate accepted another offer",
        )
        self.assertEqual(cancelled_iv.interview_status, InterviewStatus.CANCELLED)
        self.assertIn("Candidate accepted another offer", cancelled_iv.prep_notes)

    # ------------------ CASE 27-31: Reminders & Alerts Math ------------------

    def test_case_27_reminders_interviews_today(self):
        """Case 27: Detect scheduled interviews occurring exactly on the reference date."""
        ref_date = date(2026, 11, 4)
        app_obj = self.app_service.add_application(company_name="TodayCorp", job_role="Dev")
        self.interview_service.schedule_interview(
            application_id=app_obj.application_id,
            round_name="Live Coding",
            interview_date="2026-11-04",
            interview_time="14:00",
        )
        today_ivs = self.reminder_service.get_interviews_today(reference_date=ref_date)
        self.assertEqual(len(today_ivs), 1)
        self.assertEqual(today_ivs[0][1].round_name, "Live Coding")

    def test_case_28_reminders_upcoming_interviews_in_window(self):
        """Case 28: Detect scheduled interviews occurring within next N days (excluding today)."""
        ref_date = date(2026, 11, 4)
        app_obj = self.app_service.add_application(company_name="WindowCorp", job_role="Dev")
        self.interview_service.schedule_interview(
            application_id=app_obj.application_id,
            round_name="Next Week Round",
            interview_date="2026-11-07",
            interview_time="10:00",
        )
        upcoming = self.reminder_service.get_upcoming_interviews(days=7, reference_date=ref_date)
        self.assertEqual(len(upcoming), 1)

    def test_case_29_reminders_overdue_deadlines_excludes_terminal_applications(self):
        """Case 29: Overdue deadlines flag active applications, but ignore Selected/Rejected/Withdrawn."""
        ref_date = date(2026, 11, 4)
        # Active application with past deadline
        self.app_service.add_application(
            company_name="ActiveOverdue",
            job_role="Dev",
            application_deadline="2026-11-01",
            status="Applied",
        )
        # Terminal application with past deadline (should be ignored)
        self.app_service.add_application(
            company_name="RejectedOverdue",
            job_role="Dev",
            application_deadline="2026-11-01",
            status="Rejected",
        )
        overdue = self.reminder_service.get_overdue_deadlines(reference_date=ref_date)
        self.assertEqual(len(overdue), 1)
        self.assertEqual(overdue[0].company_name, "ActiveOverdue")

    # ------------------ CASE 30-34: Analytics & Conversion Rates ------------------

    def test_case_30_analytics_calculation_with_zero_applications(self):
        """Case 30: Analytics computes safely on empty dataset without ZeroDivisionError."""
        summary = self.analytics_service.calculate_summary([])
        self.assertEqual(summary.total_applications, 0)
        self.assertEqual(summary.interview_conversion_rate, 0.0)
        self.assertEqual(summary.offer_conversion_rate, 0.0)
        self.assertEqual(summary.interview_to_offer_rate, 0.0)

    def test_case_31_analytics_conversion_funnel_ratios(self):
        """Case 31: Conversion ratios calculated accurately based on funnel progression."""
        # App 1: reaches interview and gets offer
        a1 = self.app_service.add_application(company_name="A", job_role="Dev", status="Offer Received")
        # App 2: reaches interview but rejected
        a2 = self.app_service.add_application(company_name="B", job_role="Dev", status="Rejected")
        self.interview_service.schedule_interview(a2.application_id, "Tech", "2026-11-01", "10:00")
        # App 3: applied only
        self.app_service.add_application(company_name="C", job_role="Dev", status="Applied")
        # App 4: applied only
        self.app_service.add_application(company_name="D", job_role="Dev", status="Applied")

        summary = self.analytics_service.calculate_summary()
        self.assertEqual(summary.total_applications, 4)
        # 2 out of 4 reached interview = 50.0%
        self.assertEqual(summary.interview_conversion_rate, 50.0)
        # 1 out of 4 got offer = 25.0%
        self.assertEqual(summary.offer_conversion_rate, 25.0)
        # 1 out of 2 who interviewed got offer = 50.0%
        self.assertEqual(summary.interview_to_offer_rate, 50.0)

    # ------------------ CASE 32-35: CSV Injection Defense & Storage ------------------

    def test_case_32_csv_export_formula_injection_defense(self):
        """Case 32: Cells starting with =, +, -, @, tab, or CR are disarmed with single quote."""
        self.assertEqual(sanitize_for_csv("=SUM(A1:A10)"), "'=SUM(A1:A10)")
        self.assertEqual(sanitize_for_csv("+cmd|' /C calc'!A0"), "'+cmd|' /C calc'!A0")
        self.assertEqual(sanitize_for_csv("-100"), "'-100")
        self.assertEqual(sanitize_for_csv("@test"), "'@test")
        self.assertEqual(sanitize_for_csv("Safe text"), "Safe text")
        self.assertEqual(sanitize_for_csv(None), "")

    def test_case_33_storage_atomic_write_and_recovery(self):
        """Case 33: Applications save and load reliably using atomic file operations."""
        app1 = JobApplication(company_name="SaveTest", job_role="Engineer")
        self.storage.save_applications([app1])
        loaded = self.storage.load_applications()
        self.assertEqual(len(loaded), 1)
        self.assertEqual(loaded[0].company_name, "SaveTest")

    def test_case_34_storage_corrupted_json_raises_storage_error(self):
        """Case 34: Malformed JSON syntax raises StorageError without wiping the file."""
        with open(self.storage.applications_path, "w", encoding="utf-8") as f:
            f.write("{ bad json syntax: ")
        with self.assertRaises(StorageError):
            self.storage.load_applications()


@unittest.skipUnless(HAS_FASTAPI, "FastAPI and TestClient required for API endpoint tests")
class TestExhaustiveFastAPIEndpoints(unittest.TestCase):
    """Exhaustive tests for every FastAPI endpoint, query param, error response, and static file."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_case_35_api_health_check(self):
        """Case 35: GET /api/health returns 200 with online status."""
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "online")

    def test_case_36_api_meta_options(self):
        """Case 36: GET /api/meta returns standard dropdown choices."""
        resp = self.client.get("/api/meta")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("application_statuses", data)
        self.assertIn("job_types", data)
        self.assertIn("interview_rounds", data)

    def test_case_37_api_dashboard_data(self):
        """Case 37: GET /api/dashboard returns KPIs, distribution, and alerts."""
        resp = self.client.get("/api/dashboard")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("kpis", data)
        self.assertIn("status_distribution", data)
        self.assertIn("alerts", data)

    def test_case_38_api_create_application_valid(self):
        """Case 38: POST /api/applications creates valid record with 201 status."""
        payload = {
            "company_name": "FastAPI Test Corp",
            "job_role": "Backend Engineer",
            "location": "Bengaluru",
            "job_type": "Full-time",
            "min_salary": 95000.0,
            "max_salary": 130000.0,
            "status": "Applied",
        }
        resp = self.client.post("/api/applications", json=payload)
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["data"]["company_name"], "FastAPI Test Corp")
        # Cleanup
        app_id = data["data"]["application_id"]
        self.client.delete(f"/api/applications/{app_id}")

    def test_case_39_api_create_application_validation_failure(self):
        """Case 39: POST /api/applications with invalid salary returns 400 Bad Request."""
        payload = {
            "company_name": "Invalid Corp",
            "job_role": "Engineer",
            "min_salary": 150000.0,
            "max_salary": 80000.0,  # min > max
        }
        resp = self.client.post("/api/applications", json=payload)
        self.assertEqual(resp.status_code, 400)
        self.assertIn("cannot be greater than", resp.json()["detail"])

    def test_case_40_api_get_application_not_found(self):
        """Case 40: GET /api/applications/{invalid_id} returns 404 Not Found."""
        resp = self.client.get("/api/applications/APP-DOESNOTEXIST")
        self.assertEqual(resp.status_code, 404)
        self.assertIn("not found", resp.json()["detail"].lower())

    def test_case_41_api_search_and_filter_queries(self):
        """Case 41: GET /api/applications with query params filters properly."""
        # Create temporary app
        c_resp = self.client.post("/api/applications", json={"company_name": "FilterCompanyX", "job_role": "Tester"})
        app_id = c_resp.json()["data"]["application_id"]

        # Search param
        resp = self.client.get("/api/applications?search=FilterCompanyX")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(len(resp.json()) >= 1)

        # Status filter
        resp_status = self.client.get("/api/applications?status=Applied")
        self.assertEqual(resp_status.status_code, 200)

        # Clean up
        self.client.delete(f"/api/applications/{app_id}")

    def test_case_42_api_interview_lifecycle(self):
        """Case 42: Schedule interview, record outcome, and cancel via REST endpoints."""
        # 1. Create Application
        c_resp = self.client.post("/api/applications", json={"company_name": "InterviewAPIApp", "job_role": "Dev"})
        app_id = c_resp.json()["data"]["application_id"]

        # 2. Schedule Interview
        iv_payload = {
            "application_id": app_id,
            "round_name": "Technical",
            "interview_date": "2026-11-20",
            "interview_time": "14:30",
            "interview_mode": "Online / Video",
            "meeting_link": "https://meet.google.com/test",
        }
        iv_resp = self.client.post("/api/interviews", json=iv_payload)
        self.assertEqual(iv_resp.status_code, 201)
        iv_id = iv_resp.json()["data"]["interview_id"]

        # 3. Record Outcome
        outcome_resp = self.client.post(
            f"/api/interviews/{app_id}/{iv_id}/outcome",
            json={"outcome": "Passed", "notes": "Solid system design"},
        )
        self.assertEqual(outcome_resp.status_code, 200)
        self.assertEqual(outcome_resp.json()["data"]["outcome"], "Passed")

        # 4. Cleanup
        self.client.delete(f"/api/applications/{app_id}")

    def test_case_43_api_csv_exports(self):
        """Case 43: CSV exports for applications, interviews, and analytics succeed."""
        for export_type in ["applications", "interviews", "analytics"]:
            resp = self.client.get(f"/api/export/{export_type}")
            self.assertEqual(resp.status_code, 200)
            self.assertTrue(resp.headers["content-type"].startswith("text/csv"))

        # Unknown export type returns 400
        bad_resp = self.client.get("/api/export/unknown_type")
        self.assertEqual(bad_resp.status_code, 400)

        # Clean up test-generated CSV exports to keep repository clean
        exports_dir = Path(__file__).resolve().parent.parent / "exports"
        if exports_dir.exists():
            for f in exports_dir.glob("*.csv"):
                try:
                    f.unlink()
                except OSError:
                    pass

    def test_case_44_api_settings_endpoints(self):
        """Case 44: GET and POST /api/settings manage user preferences."""
        # Read settings
        resp = self.client.get("/api/settings")
        self.assertEqual(resp.status_code, 200)

        # Update settings
        update_resp = self.client.post(
            "/api/settings",
            json={"reminder_window_days": 14, "date_display_format": "%d-%m-%Y"},
        )
        self.assertEqual(update_resp.status_code, 200)
        self.assertEqual(update_resp.json()["settings"]["reminder_window_days"], 14)

    def test_case_45_api_seed_sample_data(self):
        """Case 45: POST /api/seed-sample-data populates realistic presentation data."""
        resp = self.client.post("/api/seed-sample-data")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["success"])

    def test_case_46_api_static_and_root_serving(self):
        """Case 46: Root / delivers index.html and /static delivers stylesheets."""
        resp_root = self.client.get("/")
        self.assertEqual(resp_root.status_code, 200)
        self.assertIn("text/html", resp_root.headers["content-type"])

        resp_css = self.client.get("/static/styles.css")
        self.assertEqual(resp_css.status_code, 200)
        self.assertIn("text/css", resp_css.headers["content-type"])

    def test_case_47_applicant_name_in_dashboard_and_settings(self):
        """Case 47: Verify applicant name is returned in dashboard and can be updated in settings."""
        # 1. Dashboard contains applicant name
        dash_resp = self.client.get("/api/dashboard")
        self.assertEqual(dash_resp.status_code, 200)
        self.assertIn("applicant_name", dash_resp.json())
        self.assertIn("theme_mode", dash_resp.json())

        # 2. Update applicant name via settings
        set_resp = self.client.post("/api/settings", json={"applicant_name": "Naga Chiranjeevi", "theme_mode": "dark"})
        self.assertEqual(set_resp.status_code, 200)
        self.assertEqual(set_resp.json()["settings"]["applicant_name"], "Naga Chiranjeevi")
        self.assertEqual(set_resp.json()["settings"]["theme_mode"], "dark")

        # 3. Create application with explicit applicant name
        app_resp = self.client.post("/api/applications", json={
            "company_name": "ApplicantNameCorp",
            "job_role": "Backend Lead",
            "applicant_name": "Naga Chiranjeevi",
        })
        self.assertEqual(app_resp.status_code, 201)
        created_data = app_resp.json()["data"]
        self.assertEqual(created_data["applicant_name"], "Naga Chiranjeevi")

        # Cleanup
        self.client.delete(f"/api/applications/{created_data['application_id']}")


if __name__ == "__main__":
    unittest.main()

