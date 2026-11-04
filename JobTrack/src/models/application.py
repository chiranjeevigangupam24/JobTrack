"""Application and Interview models for JobTrack.

Contains domain classes, enums, validation hooks, and serialization methods
for persistent storage and reporting.
"""

import uuid
from enum import Enum
from typing import Any, Dict, List, Optional

from src.utils.date_utils import get_current_date, get_current_datetime_iso
from src.utils.validators import (
    ValidationError,
    validate_date,
    validate_required,
    validate_salary,
    validate_time,
    validate_url,
)


class ApplicationStatus(str, Enum):
    """Central definition of valid application statuses."""

    APPLIED = "Applied"
    ASSESSMENT = "Assessment"
    INTERVIEW = "Interview"
    OFFER_RECEIVED = "Offer Received"
    SELECTED = "Selected"
    REJECTED = "Rejected"
    WITHDRAWN = "Withdrawn"

    @classmethod
    def list_values(cls) -> List[str]:
        """Return a list of all status string values."""
        return [status.value for status in cls]

    @classmethod
    def from_string(cls, value: str) -> "ApplicationStatus":
        """Parse a case-insensitive string into an ApplicationStatus enum member.

        Args:
            value: Status name or representation.

        Returns:
            Matched ApplicationStatus member.

        Raises:
            ValidationError: If status is not recognized.
        """
        cleaned = str(value).strip().lower()
        for member in cls:
            if member.value.lower() == cleaned or member.name.lower() == cleaned:
                return member
        valid_options = ", ".join(cls.list_values())
        raise ValidationError(
            f"Invalid status '{value}'. Valid statuses are: {valid_options}."
        )

    def is_terminal(self) -> bool:
        """Check if this status is terminal (closed / inactive)."""
        return self in (
            ApplicationStatus.SELECTED,
            ApplicationStatus.REJECTED,
            ApplicationStatus.WITHDRAWN,
        )


class JobType(str, Enum):
    """Enumeration of typical employment and contract types."""

    FULL_TIME = "Full-time"
    PART_TIME = "Part-time"
    INTERNSHIP = "Internship"
    CONTRACT = "Contract"
    FREELANCE = "Freelance"
    OTHER = "Other"

    @classmethod
    def list_values(cls) -> List[str]:
        """Return list of standard job types."""
        return [jt.value for jt in cls]

    @classmethod
    def from_string(cls, value: str) -> "JobType":
        """Parse a case-insensitive string into a JobType member.

        Args:
            value: Job type string.

        Returns:
            JobType member or JobType.OTHER if non-empty but unmatched.
        """
        cleaned = str(value).strip().lower()
        for member in cls:
            if member.value.lower() == cleaned or member.name.lower() == cleaned:
                return member
        return cls.OTHER


class InterviewRound(str, Enum):
    """Standard interview rounds."""

    SCREENING = "Screening / HR"
    TECHNICAL = "Technical"
    CODING = "Coding Assessment"
    SYSTEM_DESIGN = "System Design"
    MANAGERIAL = "Managerial"
    BEHAVIORAL = "Behavioral"
    FINAL = "Final Round"
    OTHER = "Other"

    @classmethod
    def list_values(cls) -> List[str]:
        """Return list of round names."""
        return [r.value for r in cls]


class InterviewMode(str, Enum):
    """Interview delivery modes."""

    ONLINE = "Online / Video"
    IN_PERSON = "In-person"
    PHONE = "Phone"

    @classmethod
    def list_values(cls) -> List[str]:
        """Return list of interview modes."""
        return [m.value for m in cls]


class InterviewStatus(str, Enum):
    """Lifecycle status of an interview."""

    SCHEDULED = "Scheduled"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"
    RESCHEDULED = "Rescheduled"

    @classmethod
    def list_values(cls) -> List[str]:
        """Return list of interview statuses."""
        return [s.value for s in cls]

    @classmethod
    def from_string(cls, value: str) -> "InterviewStatus":
        """Parse status case-insensitively."""
        cleaned = str(value).strip().lower()
        for member in cls:
            if member.value.lower() == cleaned or member.name.lower() == cleaned:
                return member
        raise ValidationError(f"Invalid interview status: '{value}'.")


class InterviewOutcome(str, Enum):
    """Outcome of an interview round."""

    PENDING = "Pending"
    PASSED = "Passed"
    FAILED = "Failed"
    NOT_APPLICABLE = "N/A"

    @classmethod
    def list_values(cls) -> List[str]:
        """Return list of outcomes."""
        return [o.value for o in cls]

    @classmethod
    def from_string(cls, value: str) -> "InterviewOutcome":
        """Parse outcome case-insensitively."""
        cleaned = str(value).strip().lower()
        for member in cls:
            if member.value.lower() == cleaned or member.name.lower() == cleaned:
                return member
        raise ValidationError(f"Invalid interview outcome: '{value}'.")


class Interview:
    """Represents a scheduled, completed, or cancelled interview round."""

    def __init__(
        self,
        application_id: str,
        round_name: str,
        interview_date: str,
        interview_time: str,
        interview_mode: str = InterviewMode.ONLINE.value,
        meeting_link: Optional[str] = None,
        interview_status: str = InterviewStatus.SCHEDULED.value,
        prep_notes: str = "",
        outcome: str = InterviewOutcome.PENDING.value,
        interview_id: Optional[str] = None,
        created_at: Optional[str] = None,
        updated_at: Optional[str] = None,
    ):
        self.interview_id = interview_id or f"INT-{uuid.uuid4().hex[:8].upper()}"
        self.application_id = validate_required(application_id, "Application ID")
        self.round_name = validate_required(round_name, "Interview round")
        self.interview_date = validate_date(interview_date, "Interview date")
        assert self.interview_date is not None
        self.interview_time = validate_time(interview_time, "Interview time")
        assert self.interview_time is not None
        self.interview_mode = str(interview_mode).strip() if interview_mode else InterviewMode.ONLINE.value
        self.meeting_link = validate_url(meeting_link, allow_empty=True)
        self.interview_status = InterviewStatus.from_string(interview_status)
        self.prep_notes = str(prep_notes).strip() if prep_notes else ""
        self.outcome = InterviewOutcome.from_string(outcome)
        self.created_at = created_at or get_current_datetime_iso()
        self.updated_at = updated_at or self.created_at

    def update(
        self,
        round_name: Optional[str] = None,
        interview_date: Optional[str] = None,
        interview_time: Optional[str] = None,
        interview_mode: Optional[str] = None,
        meeting_link: Optional[str] = None,
        interview_status: Optional[str] = None,
        prep_notes: Optional[str] = None,
        outcome: Optional[str] = None,
    ) -> None:
        """Update interview fields with validation and timestamp tracking."""
        if round_name is not None:
            self.round_name = validate_required(round_name, "Interview round")
        if interview_date is not None:
            self.interview_date = validate_date(interview_date, "Interview date")  # type: ignore
        if interview_time is not None:
            self.interview_time = validate_time(interview_time, "Interview time")  # type: ignore
        if interview_mode is not None:
            self.interview_mode = str(interview_mode).strip()
        if meeting_link is not None:
            self.meeting_link = validate_url(meeting_link, allow_empty=True)
        if interview_status is not None:
            self.interview_status = InterviewStatus.from_string(interview_status)
        if prep_notes is not None:
            self.prep_notes = str(prep_notes).strip()
        if outcome is not None:
            self.outcome = InterviewOutcome.from_string(outcome)

        self.updated_at = get_current_datetime_iso()

    def to_dict(self) -> Dict[str, Any]:
        """Serialize interview object to a JSON-compatible dictionary."""
        return {
            "interview_id": self.interview_id,
            "application_id": self.application_id,
            "round_name": self.round_name,
            "interview_date": self.interview_date,
            "interview_time": self.interview_time,
            "interview_mode": self.interview_mode,
            "meeting_link": self.meeting_link,
            "interview_status": self.interview_status.value,
            "prep_notes": self.prep_notes,
            "outcome": self.outcome.value,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Interview":
        """Deserialize dictionary to Interview instance."""
        return cls(
            interview_id=data.get("interview_id"),
            application_id=data.get("application_id", ""),
            round_name=data.get("round_name", ""),
            interview_date=data.get("interview_date", ""),
            interview_time=data.get("interview_time", ""),
            interview_mode=data.get("interview_mode", InterviewMode.ONLINE.value),
            meeting_link=data.get("meeting_link"),
            interview_status=data.get("interview_status", InterviewStatus.SCHEDULED.value),
            prep_notes=data.get("prep_notes", ""),
            outcome=data.get("outcome", InterviewOutcome.PENDING.value),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )


class JobApplication:
    """Represents a job application, including details, salary, status, and interview history."""

    def __init__(
        self,
        company_name: str,
        job_role: str,
        location: str = "Remote",
        job_type: str = JobType.FULL_TIME.value,
        job_description: str = "",
        application_date: Optional[str] = None,
        application_deadline: Optional[str] = None,
        job_url: Optional[str] = None,
        min_salary: Optional[float] = None,
        max_salary: Optional[float] = None,
        status: str = ApplicationStatus.APPLIED.value,
        notes: str = "",
        applicant_name: Optional[str] = None,
        application_id: Optional[str] = None,
        created_at: Optional[str] = None,
        updated_at: Optional[str] = None,
        interviews: Optional[List[Interview]] = None,
    ):
        self.application_id = application_id or f"APP-{uuid.uuid4().hex[:8].upper()}"
        self.applicant_name = str(applicant_name).strip() if applicant_name else "Naga Chiranjeevi"
        self.company_name = validate_required(company_name, "Company name")
        self.job_role = validate_required(job_role, "Job role")
        self.location = str(location).strip() if location else "Not Specified"
        self.job_type = str(job_type).strip() if job_type else JobType.FULL_TIME.value
        self.job_description = str(job_description).strip() if job_description else ""

        # Dates
        default_app_date = application_date or get_current_date().strftime("%Y-%m-%d")
        self.application_date = validate_date(default_app_date, "Application date")
        assert self.application_date is not None
        self.application_deadline = validate_date(
            application_deadline, "Application deadline", allow_empty=True
        )

        # URL and Salary
        self.job_url = validate_url(job_url, allow_empty=True)
        self.min_salary, self.max_salary = validate_salary(min_salary, max_salary)

        # Status and notes
        self.status = ApplicationStatus.from_string(status)
        self.notes = str(notes).strip() if notes else ""

        # Timestamps
        self.created_at = created_at or get_current_datetime_iso()
        self.updated_at = updated_at or self.created_at

        # Interview history (isolated from application status)
        self.interviews: List[Interview] = interviews if interviews is not None else []

    def update(
        self,
        company_name: Optional[str] = None,
        job_role: Optional[str] = None,
        location: Optional[str] = None,
        job_type: Optional[str] = None,
        job_description: Optional[str] = None,
        application_date: Optional[str] = None,
        application_deadline: Optional[str] = None,
        job_url: Optional[str] = None,
        min_salary: Optional[float] = None,
        max_salary: Optional[float] = None,
        status: Optional[str] = None,
        notes: Optional[str] = None,
        applicant_name: Optional[str] = None,
    ) -> None:
        """Update application attributes with full validation without losing interview history."""
        if applicant_name is not None:
            self.applicant_name = str(applicant_name).strip() or "Naga Chiranjeevi"
        if company_name is not None:
            self.company_name = validate_required(company_name, "Company name")
        if job_role is not None:
            self.job_role = validate_required(job_role, "Job role")
        if location is not None:
            self.location = str(location).strip() or "Not Specified"
        if job_type is not None:
            self.job_type = str(job_type).strip()
        if job_description is not None:
            self.job_description = str(job_description).strip()
        if application_date is not None:
            self.application_date = validate_date(application_date, "Application date")  # type: ignore
        if application_deadline is not None:
            self.application_deadline = validate_date(
                application_deadline, "Application deadline", allow_empty=True
            )
        if job_url is not None:
            self.job_url = validate_url(job_url, allow_empty=True)

        # Handle salary updates cleanly
        new_min = self.min_salary if min_salary is None else min_salary
        new_max = self.max_salary if max_salary is None else max_salary
        self.min_salary, self.max_salary = validate_salary(new_min, new_max)

        if status is not None:
            self.status = ApplicationStatus.from_string(status)
        if notes is not None:
            self.notes = str(notes).strip()

        self.updated_at = get_current_datetime_iso()

    def add_interview(self, interview: Interview) -> None:
        """Attach an interview round to this application."""
        if interview.application_id != self.application_id:
            interview.application_id = self.application_id
        self.interviews.append(interview)
        self.updated_at = get_current_datetime_iso()

    def get_interview(self, interview_id: str) -> Optional[Interview]:
        """Find an interview by its ID."""
        for iv in self.interviews:
            if iv.interview_id.upper() == interview_id.strip().upper():
                return iv
        return None

    def salary_display(self) -> str:
        """Formatted salary range string for display."""
        if self.min_salary is not None and self.max_salary is not None:
            if self.min_salary == self.max_salary:
                return f"${self.min_salary:,.0f}"
            return f"${self.min_salary:,.0f} - ${self.max_salary:,.0f}"
        if self.min_salary is not None:
            return f"From ${self.min_salary:,.0f}"
        if self.max_salary is not None:
            return f"Up to ${self.max_salary:,.0f}"
        return "Not Disclosed"

    def to_dict(self) -> Dict[str, Any]:
        """Serialize JobApplication to dictionary for JSON persistence."""
        return {
            "application_id": self.application_id,
            "company_name": self.company_name,
            "job_role": self.job_role,
            "location": self.location,
            "job_type": self.job_type,
            "job_description": self.job_description,
            "application_date": self.application_date,
            "application_deadline": self.application_deadline,
            "job_url": self.job_url,
            "min_salary": self.min_salary,
            "max_salary": self.max_salary,
            "status": self.status.value,
            "notes": self.notes,
            "applicant_name": self.applicant_name,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "interviews": [iv.to_dict() for iv in self.interviews],
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "JobApplication":
        """Deserialize dictionary into JobApplication instance."""
        interviews_raw = data.get("interviews", [])
        parsed_interviews = [
            Interview.from_dict(iv_data)
            for iv_data in interviews_raw
            if isinstance(iv_data, dict)
        ]

        return cls(
            application_id=data.get("application_id"),
            company_name=data.get("company_name", ""),
            job_role=data.get("job_role", ""),
            location=data.get("location", "Not Specified"),
            job_type=data.get("job_type", JobType.FULL_TIME.value),
            job_description=data.get("job_description", ""),
            application_date=data.get("application_date"),
            application_deadline=data.get("application_deadline"),
            job_url=data.get("job_url"),
            min_salary=data.get("min_salary"),
            max_salary=data.get("max_salary"),
            status=data.get("status", ApplicationStatus.APPLIED.value),
            notes=data.get("notes", ""),
            applicant_name=data.get("applicant_name", "Naga Chiranjeevi"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
            interviews=parsed_interviews,
        )
