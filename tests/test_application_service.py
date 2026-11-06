"""Unit tests for ApplicationService and InterviewService."""

import tempfile
import unittest
from pathlib import Path

from src.models.application import (
    ApplicationStatus,
    InterviewOutcome,
    InterviewStatus,
    JobType,
)
from src.services.application_service import ApplicationService, RecordNotFoundError
from src.services.interview_service import InterviewService
from src.storage.json_storage import JSONStorage


class TestApplicationService(unittest.TestCase):
    """Test suite for CRUD, search, filter, and interview operations in an isolated environment."""

    def setUp(self):
        """Set up an isolated temporary storage directory for each test."""
        self.temp_dir = tempfile.TemporaryDirectory()
        self.storage = JSONStorage(data_dir=Path(self.temp_dir.name))
        self.app_service = ApplicationService(storage=self.storage)
        self.interview_service = InterviewService(app_service=self.app_service)

    def tearDown(self):
        """Clean up temporary directory."""
        self.temp_dir.cleanup()

    def test_add_and_retrieve_application(self):
        """Test creating an application and retrieving it by ID."""
        app = self.app_service.add_application(
            company_name="Spotify",
            job_role="Data Engineer",
            location="Stockholm",
            job_type=JobType.FULL_TIME.value,
            application_date="2026-10-10",
        )
        self.assertIsNotNone(app.application_id)

        retrieved = self.app_service.get_application_by_id(app.application_id)
        self.assertIsNotNone(retrieved)
        assert retrieved is not None
        self.assertEqual(retrieved.company_name, "Spotify")
        self.assertEqual(retrieved.job_role, "Data Engineer")

    def test_update_application(self):
        """Test updating application attributes and verifying persistence."""
        app = self.app_service.add_application(
            company_name="Airbnb",
            job_role="Frontend Engineer",
            status=ApplicationStatus.APPLIED.value,
        )

        updated = self.app_service.update_application(
            app.application_id,
            status=ApplicationStatus.INTERVIEW.value,
            location="San Francisco, CA",
        )
        self.assertEqual(updated.status, ApplicationStatus.INTERVIEW)
        self.assertEqual(updated.location, "San Francisco, CA")

        # Reload from storage to verify persistence
        new_service = ApplicationService(storage=self.storage)
        persisted = new_service.get_application_by_id(app.application_id)
        assert persisted is not None
        self.assertEqual(persisted.status, ApplicationStatus.INTERVIEW)

    def test_delete_application(self):
        """Test deleting an application record."""
        app = self.app_service.add_application(
            company_name="Oracle",
            job_role="Database Engineer",
        )
        self.assertTrue(self.app_service.delete_application(app.application_id))
        self.assertIsNone(self.app_service.get_application_by_id(app.application_id))

        with self.assertRaises(RecordNotFoundError):
            self.app_service.delete_application("APP-NONEXISTENT")

    def test_case_insensitive_search(self):
        """Test search across ID, company name, role, and location."""
        self.app_service.add_application(
            company_name="Databricks",
            job_role="Spark Core Developer",
            location="San Francisco",
        )
        self.app_service.add_application(
            company_name="Snowflake",
            job_role="Warehouse Architect",
            location="Bozeman, MT",
        )

        # Search company case-insensitive
        by_comp = self.app_service.search_applications("DATA", search_field="company")
        self.assertEqual(len(by_comp), 1)
        self.assertEqual(by_comp[0].company_name, "Databricks")

        # Search role
        by_role = self.app_service.search_applications("architect", search_field="role")
        self.assertEqual(len(by_role), 1)
        self.assertEqual(by_role[0].company_name, "Snowflake")

        # Search all fields
        by_all = self.app_service.search_applications("bozeman", search_field="all")
        self.assertEqual(len(by_all), 1)

    def test_filter_applications(self):
        """Test filtering by status, job type, and date range."""
        self.app_service.add_application(
            company_name="Adobe",
            job_role="Full Stack Dev",
            job_type=JobType.FULL_TIME.value,
            status=ApplicationStatus.APPLIED.value,
            application_date="2026-10-01",
        )
        self.app_service.add_application(
            company_name="Figma",
            job_role="Design Engineer",
            job_type=JobType.INTERNSHIP.value,
            status=ApplicationStatus.OFFER_RECEIVED.value,
            application_date="2026-10-15",
        )

        # Filter by status
        offers = self.app_service.filter_applications(status=ApplicationStatus.OFFER_RECEIVED.value)
        self.assertEqual(len(offers), 1)
        self.assertEqual(offers[0].company_name, "Figma")

        # Filter by job type
        internships = self.app_service.filter_applications(job_type=JobType.INTERNSHIP.value)
        self.assertEqual(len(internships), 1)
        self.assertEqual(internships[0].company_name, "Figma")

        # Filter by date range
        date_filtered = self.app_service.filter_applications(
            start_date="2026-10-10", end_date="2026-10-20"
        )
        self.assertEqual(len(date_filtered), 1)
        self.assertEqual(date_filtered[0].company_name, "Figma")

    def test_interview_scheduling_and_workflows(self):
        """Test interview service interactions."""
        app = self.app_service.add_application(
            company_name="Palantir",
            job_role="Forward Deployed Engineer",
            status=ApplicationStatus.APPLIED.value,
        )

        # Scheduling bumps status to Interview
        iv = self.interview_service.schedule_interview(
            application_id=app.application_id,
            round_name="Technical Screening",
            interview_date="2026-11-05",
            interview_time="11:00",
        )
        self.assertEqual(iv.round_name, "Technical Screening")
        self.assertEqual(app.status, ApplicationStatus.INTERVIEW)

        # Retrieve interviews
        ivs = self.interview_service.get_interviews_for_application(app.application_id)
        self.assertEqual(len(ivs), 1)

        # Record outcome
        self.interview_service.record_outcome(
            application_id=app.application_id,
            interview_id=iv.interview_id,
            outcome=InterviewOutcome.PASSED.value,
            notes="Passed with flying colors",
        )
        self.assertEqual(iv.outcome, InterviewOutcome.PASSED)
        self.assertEqual(iv.interview_status, InterviewStatus.COMPLETED)

        # Cancel interview
        self.interview_service.cancel_interview(
            application_id=app.application_id,
            interview_id=iv.interview_id,
            cancellation_reason="Candidate accepted another offer",
        )
        self.assertEqual(iv.interview_status, InterviewStatus.CANCELLED)


if __name__ == "__main__":
    unittest.main()
