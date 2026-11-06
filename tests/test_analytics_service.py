"""Unit tests for AnalyticsService, ReminderService date boundaries, and CSVExporter."""

import csv
from datetime import date
from pathlib import Path
import tempfile
import unittest

from src.models.application import (
    ApplicationStatus,
    Interview,
    InterviewStatus,
    JobApplication,
)
from src.reports.csv_exporter import CSVExporter
from src.services.analytics_service import AnalyticsService
from src.services.application_service import ApplicationService
from src.services.reminder_service import ReminderService
from src.storage.json_storage import JSONStorage


class TestAnalyticsAndReminders(unittest.TestCase):
    """Test suite for analytics computations, reminder boundaries, and secure CSV exporting."""

    def setUp(self):
        """Set up isolated storage and services."""
        self.temp_dir = tempfile.TemporaryDirectory()
        self.storage = JSONStorage(data_dir=Path(self.temp_dir.name))
        self.app_service = ApplicationService(storage=self.storage)
        self.analytics_service = AnalyticsService(app_service=self.app_service)
        self.reminder_service = ReminderService(app_service=self.app_service, default_window_days=7)
        self.csv_exporter = CSVExporter(export_dir=Path(self.temp_dir.name) / "exports")

    def tearDown(self):
        """Cleanup temporary files."""
        self.temp_dir.cleanup()

    def test_analytics_with_zero_applications(self):
        """Ensure analytics computes safely without division-by-zero errors when empty."""
        summary = self.analytics_service.calculate_summary(applications=[])
        self.assertEqual(summary.total_applications, 0)
        self.assertEqual(summary.interview_conversion_rate, 0.0)
        self.assertEqual(summary.offer_conversion_rate, 0.0)
        self.assertEqual(summary.interview_to_offer_rate, 0.0)
        self.assertEqual(summary.offers_received, 0)
        self.assertEqual(summary.rejected_applications, 0)

    def test_analytics_conversion_rates(self):
        """Test accuracy of metrics and stage conversion rates."""
        # App 1: Applied only
        self.app_service.add_application("Company A", "Dev", status=ApplicationStatus.APPLIED.value)

        # App 2: Reached Interview
        app2 = self.app_service.add_application("Company B", "Dev", status=ApplicationStatus.INTERVIEW.value)
        iv1 = Interview(
            application_id=app2.application_id,
            round_name="Tech Round",
            interview_date="2026-10-20",
            interview_time="10:00",
            interview_status=InterviewStatus.COMPLETED.value,
        )
        app2.add_interview(iv1)

        # App 3: Reached Offer
        app3 = self.app_service.add_application("Company C", "Dev", status=ApplicationStatus.OFFER_RECEIVED.value)
        iv2 = Interview(
            application_id=app3.application_id,
            round_name="HR Round",
            interview_date="2026-10-21",
            interview_time="11:00",
            interview_status=InterviewStatus.COMPLETED.value,
        )
        app3.add_interview(iv2)

        # App 4: Rejected after applied
        self.app_service.add_application("Company D", "Dev", status=ApplicationStatus.REJECTED.value)

        self.app_service._persist()

        summary = self.analytics_service.calculate_summary()
        self.assertEqual(summary.total_applications, 4)
        self.assertEqual(summary.offers_received, 1)
        self.assertEqual(summary.rejected_applications, 1)

        # 2 out of 4 reached interview: 50.0%
        self.assertEqual(summary.interview_conversion_rate, 50.0)
        # 1 out of 4 reached offer: 25.0%
        self.assertEqual(summary.offer_conversion_rate, 25.0)
        # 1 offer out of 2 interviewed: 50.0%
        self.assertEqual(summary.interview_to_offer_rate, 50.0)

    def test_reminder_date_boundaries(self):
        """Test deterministic reminder calculations using an injected reference date."""
        ref_date = date(2026, 10, 15)  # Baseline reference date

        # App 1: Interview today (2026-10-15)
        app1 = self.app_service.add_application("Corp 1", "Dev 1")
        app1.add_interview(
            Interview(
                application_id=app1.application_id,
                round_name="Round 1",
                interview_date="2026-10-15",
                interview_time="09:00",
                interview_status=InterviewStatus.SCHEDULED.value,
            )
        )

        # App 2: Interview in 3 days (2026-10-18)
        app2 = self.app_service.add_application("Corp 2", "Dev 2")
        app2.add_interview(
            Interview(
                application_id=app2.application_id,
                round_name="Round 2",
                interview_date="2026-10-18",
                interview_time="14:00",
                interview_status=InterviewStatus.SCHEDULED.value,
            )
        )

        # App 3: Active deadline approaching in 5 days (2026-10-20)
        self.app_service.add_application(
            "Corp 3",
            "Dev 3",
            status=ApplicationStatus.APPLIED.value,
            application_deadline="2026-10-20",
        )

        # App 4: Active deadline overdue (2026-10-10, 5 days ago)
        self.app_service.add_application(
            "Corp 4",
            "Dev 4",
            status=ApplicationStatus.APPLIED.value,
            application_deadline="2026-10-10",
        )

        # App 5: Overdue deadline, BUT application is REJECTED (obsolete deadline)
        self.app_service.add_application(
            "Corp 5",
            "Dev 5",
            status=ApplicationStatus.REJECTED.value,
            application_deadline="2026-10-05",
        )

        self.app_service._persist()

        # Check today's interviews
        today_ivs = self.reminder_service.get_interviews_today(reference_date=ref_date)
        self.assertEqual(len(today_ivs), 1)
        self.assertEqual(today_ivs[0][0].company_name, "Corp 1")

        # Check upcoming interviews (within 7 days)
        upcoming_ivs = self.reminder_service.get_upcoming_interviews(
            days=7, reference_date=ref_date
        )
        self.assertEqual(len(upcoming_ivs), 1)
        self.assertEqual(upcoming_ivs[0][0].company_name, "Corp 2")

        # Check upcoming deadlines
        upcoming_dl = self.reminder_service.get_upcoming_deadlines(
            days=7, reference_date=ref_date
        )
        self.assertEqual(len(upcoming_dl), 1)
        self.assertEqual(upcoming_dl[0].company_name, "Corp 3")

        # Check overdue deadlines - Corp 4 should be returned, Corp 5 (Rejected) must NOT be returned!
        overdue_dl = self.reminder_service.get_overdue_deadlines(reference_date=ref_date)
        self.assertEqual(len(overdue_dl), 1)
        self.assertEqual(overdue_dl[0].company_name, "Corp 4")

    def test_csv_export_and_formula_injection_defense(self):
        """Ensure CSV export disarms dangerous characters (=, +, -, @) without altering model data."""
        # Create an application with potentially dangerous formula strings
        app = self.app_service.add_application(
            company_name="=CMD|' /C calc'!A0",
            job_role="+SUM(A1:A10)",
            notes="@mentionAdmin",
        )

        csv_path = self.csv_exporter.export_applications([app], filename="security_test.csv")
        self.assertTrue(csv_path.exists())

        # Inspect raw CSV contents
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            rows = list(reader)

        # Row 0 is header, Row 1 is data
        data_row = rows[1]
        company_cell = data_row[1]
        role_cell = data_row[2]
        notes_cell = data_row[13]

        # Verify formula trigger characters are escaped with a leading single quote
        self.assertTrue(company_cell.startswith("'="))
        self.assertTrue(role_cell.startswith("'+"))
        self.assertTrue(notes_cell.startswith("'@"))

        # Crucial: verify underlying application instance was NOT mutated!
        self.assertEqual(app.company_name, "=CMD|' /C calc'!A0")
        self.assertEqual(app.job_role, "+SUM(A1:A10)")
        self.assertEqual(app.notes, "@mentionAdmin")


if __name__ == "__main__":
    unittest.main()
