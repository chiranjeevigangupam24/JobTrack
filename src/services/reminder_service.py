"""Reminder service for tracking interview schedules and application deadlines.

Provides boundary-tested reminder queries with dependency injection for reference dates
and active-application filtering.
"""

from datetime import date
from typing import Any, Dict, List, Optional, Tuple

from src.models.application import Interview, InterviewStatus, JobApplication
from src.services.application_service import ApplicationService
from src.utils.date_utils import (
    get_current_date,
    is_past_due,
    is_today,
    is_within_days,
)


class ReminderService:
    """Calculates active reminders for interviews and application deadlines."""

    def __init__(
        self,
        app_service: ApplicationService,
        default_window_days: int = 7,
    ):
        self.app_service = app_service
        self.default_window_days = default_window_days

    def get_interviews_today(
        self, reference_date: Optional[date] = None
    ) -> List[Tuple[JobApplication, Interview]]:
        """Find all scheduled interviews occurring on the reference date."""
        ref = reference_date or get_current_date()
        results: List[Tuple[JobApplication, Interview]] = []

        for app in self.app_service.get_all_applications():
            for iv in app.interviews:
                if (
                    iv.interview_status == InterviewStatus.SCHEDULED
                    and is_today(iv.interview_date, reference_date=ref)
                ):
                    results.append((app, iv))

        return sorted(results, key=lambda pair: pair[1].interview_time)

    def get_upcoming_interviews(
        self, days: Optional[int] = None, reference_date: Optional[date] = None
    ) -> List[Tuple[JobApplication, Interview]]:
        """Find all scheduled interviews in the window (tomorrow through ref + days)."""
        ref = reference_date or get_current_date()
        window = days if days is not None else self.default_window_days
        results: List[Tuple[JobApplication, Interview]] = []

        for app in self.app_service.get_all_applications():
            for iv in app.interviews:
                if (
                    iv.interview_status == InterviewStatus.SCHEDULED
                    and is_within_days(
                        iv.interview_date,
                        days=window,
                        reference_date=ref,
                        include_today=False,
                    )
                ):
                    results.append((app, iv))

        return sorted(
            results,
            key=lambda pair: (pair[1].interview_date, pair[1].interview_time),
        )

    def get_upcoming_deadlines(
        self, days: Optional[int] = None, reference_date: Optional[date] = None
    ) -> List[JobApplication]:
        """Find active applications with submission deadlines in the upcoming window.

        Deadlines for terminal applications (Selected, Rejected, Withdrawn) are excluded.
        """
        ref = reference_date or get_current_date()
        window = days if days is not None else self.default_window_days
        results: List[JobApplication] = []

        for app in self.app_service.get_all_applications():
            if app.status.is_terminal():
                continue
            if not app.application_deadline:
                continue

            if is_within_days(
                app.application_deadline,
                days=window,
                reference_date=ref,
                include_today=True,
            ):
                results.append(app)

        return sorted(results, key=lambda a: a.application_deadline or "")

    def get_overdue_deadlines(
        self, reference_date: Optional[date] = None
    ) -> List[JobApplication]:
        """Find active applications whose submission deadline is strictly before reference date.

        Terminal applications (Selected, Rejected, Withdrawn) are excluded.
        """
        ref = reference_date or get_current_date()
        results: List[JobApplication] = []

        for app in self.app_service.get_all_applications():
            if app.status.is_terminal():
                continue
            if not app.application_deadline:
                continue

            if is_past_due(app.application_deadline, reference_date=ref):
                results.append(app)

        return sorted(results, key=lambda a: a.application_deadline or "")

    def get_all_reminders_summary(
        self, days: Optional[int] = None, reference_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """Bundle all reminder categories into a unified summary dictionary."""
        ref = reference_date or get_current_date()
        window = days if days is not None else self.default_window_days

        today_interviews = self.get_interviews_today(reference_date=ref)
        upcoming_interviews = self.get_upcoming_interviews(days=window, reference_date=ref)
        upcoming_deadlines = self.get_upcoming_deadlines(days=window, reference_date=ref)
        overdue_deadlines = self.get_overdue_deadlines(reference_date=ref)

        total_count = (
            len(today_interviews)
            + len(upcoming_interviews)
            + len(upcoming_deadlines)
            + len(overdue_deadlines)
        )

        return {
            "reference_date": ref.strftime("%Y-%m-%d"),
            "window_days": window,
            "total_reminders": total_count,
            "interviews_today": today_interviews,
            "upcoming_interviews": upcoming_interviews,
            "upcoming_deadlines": upcoming_deadlines,
            "overdue_deadlines": overdue_deadlines,
        }
