"""Unit tests for JobApplication and Interview models."""

import unittest
from datetime import datetime

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
from src.utils.validators import ValidationError


class TestApplicationModel(unittest.TestCase):
    """Test suite for domain models, validation rules, and serialization."""

    def test_create_valid_application(self):
        """Test successful initialization with valid fields."""
        app = JobApplication(
            company_name="Google",
            job_role="Software Engineer",
            location="Mountain View, CA",
            job_type=JobType.FULL_TIME.value,
            application_date="2026-10-01",
            application_deadline="2026-10-31",
            job_url="https://careers.google.com/jobs/123",
            min_salary=140000.0,
            max_salary=180000.0,
            status=ApplicationStatus.APPLIED.value,
            notes="Referred by college alumni",
        )

        self.assertTrue(app.application_id.startswith("APP-"))
        self.assertEqual(app.company_name, "Google")
        self.assertEqual(app.job_role, "Software Engineer")
        self.assertEqual(app.status, ApplicationStatus.APPLIED)
        self.assertEqual(app.min_salary, 140000.0)
        self.assertEqual(app.max_salary, 180000.0)
        self.assertEqual(app.salary_display(), "$140,000 - $180,000")
        self.assertEqual(len(app.interviews), 0)

    def test_required_field_validation(self):
        """Ensure missing or whitespace-only required fields raise ValidationError."""
        with self.assertRaises(ValidationError):
            JobApplication(company_name="", job_role="Engineer")

        with self.assertRaises(ValidationError):
            JobApplication(company_name="   ", job_role="Engineer")

        with self.assertRaises(ValidationError):
            JobApplication(company_name="Meta", job_role="")

    def test_invalid_date_formats(self):
        """Ensure non-ISO or non-calendar dates raise ValidationError."""
        with self.assertRaises(ValidationError):
            JobApplication(
                company_name="Amazon",
                job_role="SDE",
                application_date="10-01-2026",  # wrong format
            )

        with self.assertRaises(ValidationError):
            JobApplication(
                company_name="Amazon",
                job_role="SDE",
                application_deadline="2026-02-31",  # invalid date
            )

    def test_salary_validation(self):
        """Ensure negative salaries and min > max are caught."""
        with self.assertRaises(ValidationError):
            JobApplication(
                company_name="Netflix",
                job_role="Senior Dev",
                min_salary=-500.0,
            )

        with self.assertRaises(ValidationError):
            JobApplication(
                company_name="Netflix",
                job_role="Senior Dev",
                min_salary=150000.0,
                max_salary=120000.0,  # min > max
            )

    def test_invalid_url_validation(self):
        """Ensure invalid URLs raise ValidationError."""
        with self.assertRaises(ValidationError):
            JobApplication(
                company_name="Apple",
                job_role="iOS Dev",
                job_url="ftp://apple.com/job",
            )

        with self.assertRaises(ValidationError):
            JobApplication(
                company_name="Apple",
                job_role="iOS Dev",
                job_url="not-a-valid-url",
            )

    def test_status_enum_validation(self):
        """Test status parsing and rejection of invalid values."""
        self.assertEqual(
            ApplicationStatus.from_string("interview"), ApplicationStatus.INTERVIEW
        )
        self.assertEqual(
            ApplicationStatus.from_string("Offer Received"), ApplicationStatus.OFFER_RECEIVED
        )

        with self.assertRaises(ValidationError):
            ApplicationStatus.from_string("UnknownStatus")

    def test_update_application(self):
        """Test updating application attributes."""
        app = JobApplication(company_name="Microsoft", job_role="Dev 1")
        app.update(
            company_name="Microsoft Corporation",
            status=ApplicationStatus.INTERVIEW.value,
            min_salary=90000,
            max_salary=110000,
        )

        self.assertEqual(app.company_name, "Microsoft Corporation")
        self.assertEqual(app.status, ApplicationStatus.INTERVIEW)
        self.assertEqual(app.min_salary, 90000.0)
        self.assertEqual(app.max_salary, 110000.0)

    def test_interview_lifecycle(self):
        """Test creating, attaching, and updating interview rounds."""
        app = JobApplication(company_name="Stripe", job_role="Backend Engineer")
        iv = Interview(
            application_id=app.application_id,
            round_name=InterviewRound.TECHNICAL.value,
            interview_date="2026-10-15",
            interview_time="14:30",
            interview_mode=InterviewMode.ONLINE.value,
            meeting_link="https://meet.google.com/xyz-abc",
        )
        app.add_interview(iv)

        self.assertEqual(len(app.interviews), 1)
        self.assertEqual(app.get_interview(iv.interview_id), iv)

        # Update interview outcome
        iv.update(
            interview_status=InterviewStatus.COMPLETED.value,
            outcome=InterviewOutcome.PASSED.value,
            prep_notes="Strong performance in distributed systems questions.",
        )
        self.assertEqual(iv.interview_status, InterviewStatus.COMPLETED)
        self.assertEqual(iv.outcome, InterviewOutcome.PASSED)

    def test_serialization_roundtrip(self):
        """Ensure full fidelity after to_dict() and from_dict()."""
        app = JobApplication(
            company_name="Uber",
            job_role="Platform Engineer",
            location="Amsterdam, Netherlands",
            job_type=JobType.CONTRACT.value,
            job_description="Core infrastructure team",
            application_date="2026-09-15",
            application_deadline="2026-10-15",
            job_url="https://uber.com/careers/12345",
            min_salary=110000.0,
            max_salary=130000.0,
            status=ApplicationStatus.ASSESSMENT.value,
            notes="Take-home test submitted",
        )
        iv = Interview(
            application_id=app.application_id,
            round_name="Coding Round",
            interview_date="2026-09-25",
            interview_time="16:00",
        )
        app.add_interview(iv)

        app_dict = app.to_dict()
        restored_app = JobApplication.from_dict(app_dict)

        self.assertEqual(restored_app.application_id, app.application_id)
        self.assertEqual(restored_app.company_name, "Uber")
        self.assertEqual(restored_app.job_role, "Platform Engineer")
        self.assertEqual(restored_app.status, ApplicationStatus.ASSESSMENT)
        self.assertEqual(len(restored_app.interviews), 1)
        self.assertEqual(restored_app.interviews[0].round_name, "Coding Round")


if __name__ == "__main__":
    unittest.main()
