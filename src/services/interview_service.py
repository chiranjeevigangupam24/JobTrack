"""Interview management service for JobTrack.

Handles scheduling, updating, cancelling, outcome logging,
and query operations for interviews linked to job applications.
"""

from typing import List, Optional, Tuple

from src.models.application import (
    ApplicationStatus,
    Interview,
    InterviewMode,
    InterviewOutcome,
    InterviewStatus,
    JobApplication,
)
from src.services.application_service import ApplicationService, RecordNotFoundError


class InterviewService:
    """Service orchestrating interview workflows linked to job applications."""

    def __init__(self, app_service: ApplicationService):
        self.app_service = app_service

    def schedule_interview(
        self,
        application_id: str,
        round_name: str,
        interview_date: str,
        interview_time: str,
        interview_mode: str = InterviewMode.ONLINE.value,
        meeting_link: Optional[str] = None,
        prep_notes: str = "",
    ) -> Interview:
        """Schedule a new interview for a valid job application.

        Args:
            application_id: ID of the parent application.
            round_name: Name/type of interview round.
            interview_date: ISO date string (YYYY-MM-DD).
            interview_time: Time string (HH:MM).
            interview_mode: Online, In-person, or Phone.
            meeting_link: Optional URL to interview room.
            prep_notes: Optional preparation notes.

        Returns:
            The created and persisted Interview instance.

        Raises:
            RecordNotFoundError: If parent application does not exist.
        """
        app = self.app_service.get_application_by_id(application_id)
        if not app:
            raise RecordNotFoundError(
                f"Cannot schedule interview: Application '{application_id}' does not exist."
            )

        interview = Interview(
            application_id=app.application_id,
            round_name=round_name,
            interview_date=interview_date,
            interview_time=interview_time,
            interview_mode=interview_mode,
            meeting_link=meeting_link,
            interview_status=InterviewStatus.SCHEDULED.value,
            prep_notes=prep_notes,
            outcome=InterviewOutcome.PENDING.value,
        )

        app.add_interview(interview)

        # Transition application status to Interview if currently Applied/Assessment
        if app.status in (ApplicationStatus.APPLIED, ApplicationStatus.ASSESSMENT):
            app.status = ApplicationStatus.INTERVIEW

        self.app_service._persist()
        return interview

    def get_all_interviews(self) -> List[Tuple[JobApplication, Interview]]:
        """Retrieve all interviews across all applications, sorted chronologically."""
        all_interviews: List[Tuple[JobApplication, Interview]] = []
        for app in self.app_service.get_all_applications():
            for iv in app.interviews:
                all_interviews.append((app, iv))

        # Sort by date and time
        return sorted(
            all_interviews,
            key=lambda pair: (pair[1].interview_date, pair[1].interview_time),
        )

    def get_interviews_for_application(self, application_id: str) -> List[Interview]:
        """Retrieve all interviews for a specific application.

        Raises:
            RecordNotFoundError: If application does not exist.
        """
        app = self.app_service.get_application_by_id(application_id)
        if not app:
            raise RecordNotFoundError(f"Application '{application_id}' not found.")

        return sorted(
            app.interviews,
            key=lambda iv: (iv.interview_date, iv.interview_time),
        )

    def get_interview_by_id(
        self, interview_id: str
    ) -> Optional[Tuple[JobApplication, Interview]]:
        """Find an interview and its parent application by interview ID."""
        target = interview_id.strip().upper()
        for app in self.app_service.get_all_applications():
            for iv in app.interviews:
                if iv.interview_id.upper() == target:
                    return app, iv
        return None

    def update_interview(
        self,
        application_id: str,
        interview_id: str,
        round_name: Optional[str] = None,
        interview_date: Optional[str] = None,
        interview_time: Optional[str] = None,
        interview_mode: Optional[str] = None,
        meeting_link: Optional[str] = None,
        interview_status: Optional[str] = None,
        prep_notes: Optional[str] = None,
        outcome: Optional[str] = None,
    ) -> Interview:
        """Update fields of an existing interview and persist changes."""
        app = self.app_service.get_application_by_id(application_id)
        if not app:
            raise RecordNotFoundError(f"Application '{application_id}' not found.")

        interview = app.get_interview(interview_id)
        if not interview:
            raise RecordNotFoundError(
                f"Interview '{interview_id}' not found in application '{application_id}'."
            )

        interview.update(
            round_name=round_name,
            interview_date=interview_date,
            interview_time=interview_time,
            interview_mode=interview_mode,
            meeting_link=meeting_link,
            interview_status=interview_status,
            prep_notes=prep_notes,
            outcome=outcome,
        )

        self.app_service._persist()
        return interview

    def cancel_interview(
        self, application_id: str, interview_id: str, cancellation_reason: str = ""
    ) -> Interview:
        """Mark an interview as Cancelled with optional notes."""
        app = self.app_service.get_application_by_id(application_id)
        if not app:
            raise RecordNotFoundError(f"Application '{application_id}' not found.")

        interview = app.get_interview(interview_id)
        if not interview:
            raise RecordNotFoundError(f"Interview '{interview_id}' not found.")

        reason_text = f"Cancelled: {cancellation_reason.strip()}" if cancellation_reason else "Cancelled"
        combined_notes = (
            f"{interview.prep_notes} | {reason_text}".strip(" |")
            if interview.prep_notes
            else reason_text
        )

        interview.update(
            interview_status=InterviewStatus.CANCELLED.value,
            prep_notes=combined_notes,
        )
        self.app_service._persist()
        return interview

    def record_outcome(
        self,
        application_id: str,
        interview_id: str,
        outcome: str,
        notes: str = "",
    ) -> Interview:
        """Record the outcome (Passed/Failed/Pending) and mark interview as Completed."""
        app = self.app_service.get_application_by_id(application_id)
        if not app:
            raise RecordNotFoundError(f"Application '{application_id}' not found.")

        interview = app.get_interview(interview_id)
        if not interview:
            raise RecordNotFoundError(f"Interview '{interview_id}' not found.")

        # Update interview
        new_prep_notes = (
            f"{interview.prep_notes}\nOutcome Notes: {notes}".strip()
            if notes
            else interview.prep_notes
        )

        interview.update(
            interview_status=InterviewStatus.COMPLETED.value,
            outcome=outcome,
            prep_notes=new_prep_notes,
        )

        self.app_service._persist()
        return interview
