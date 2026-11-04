"""Analytics and reporting engine for JobTrack.

Computes application metrics, status distribution, interview progress,
and conversion rates without terminal UI dependencies or division-by-zero vulnerabilities.
"""

from collections import Counter
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional

from src.models.application import (
    ApplicationStatus,
    InterviewStatus,
    JobApplication,
)
from src.services.application_service import ApplicationService


@dataclass
class AnalyticsSummary:
    """Strongly-typed container for all computed job search analytics."""

    total_applications: int
    status_counts: Dict[str, int]
    company_counts: Dict[str, int]
    role_counts: Dict[str, int]
    job_type_counts: Dict[str, int]
    total_interviews: int
    scheduled_interviews: int
    completed_interviews: int
    cancelled_interviews: int
    rescheduled_interviews: int
    offers_received: int
    rejected_applications: int
    withdrawn_applications: int
    interview_conversion_rate: float
    offer_conversion_rate: float
    interview_to_offer_rate: float

    def to_dict(self) -> Dict[str, Any]:
        """Convert analytics summary to dictionary."""
        return asdict(self)


class AnalyticsService:
    """Computes progress metrics, ratios, and distributions across applications."""

    def __init__(self, app_service: ApplicationService):
        self.app_service = app_service

    def calculate_summary(
        self, applications: Optional[List[JobApplication]] = None
    ) -> AnalyticsSummary:
        """Compute comprehensive analytics summary for the provided or stored applications.

        Guards against zero-division errors when no applications or interviews exist.

        Args:
            applications: Optional explicit list of applications (defaults to all stored).

        Returns:
            AnalyticsSummary instance with rounded metrics.
        """
        apps = (
            applications
            if applications is not None
            else self.app_service.get_all_applications()
        )
        total_apps = len(apps)

        # Distribution counters
        status_counter: Counter = Counter()
        company_counter: Counter = Counter()
        role_counter: Counter = Counter()
        type_counter: Counter = Counter()

        # Interview counters
        total_interviews = 0
        scheduled_interviews = 0
        completed_interviews = 0
        cancelled_interviews = 0
        rescheduled_interviews = 0

        # Application stage tracking
        apps_with_interviews_count = 0
        offers_count = 0
        rejected_count = 0
        withdrawn_count = 0

        for app in apps:
            status_counter[app.status.value] += 1
            company_counter[app.company_name] += 1
            role_counter[app.job_role] += 1
            type_counter[app.job_type] += 1

            if app.status in (ApplicationStatus.OFFER_RECEIVED, ApplicationStatus.SELECTED):
                offers_count += 1
            elif app.status == ApplicationStatus.REJECTED:
                rejected_count += 1
            elif app.status == ApplicationStatus.WITHDRAWN:
                withdrawn_count += 1

            # Check if this application has interview activity
            has_interview_activity = len(app.interviews) > 0 or app.status in (
                ApplicationStatus.INTERVIEW,
                ApplicationStatus.OFFER_RECEIVED,
                ApplicationStatus.SELECTED,
            )
            if has_interview_activity:
                apps_with_interviews_count += 1

            for iv in app.interviews:
                total_interviews += 1
                if iv.interview_status == InterviewStatus.SCHEDULED:
                    scheduled_interviews += 1
                elif iv.interview_status == InterviewStatus.COMPLETED:
                    completed_interviews += 1
                elif iv.interview_status == InterviewStatus.CANCELLED:
                    cancelled_interviews += 1
                elif iv.interview_status == InterviewStatus.RESCHEDULED:
                    rescheduled_interviews += 1

        # Calculate conversion rates safely
        # 1. Interview conversion rate: (Applications reaching interview / Total Applications) * 100
        interview_conv_rate = (
            round((apps_with_interviews_count / total_apps) * 100.0, 1)
            if total_apps > 0
            else 0.0
        )

        # 2. Offer conversion rate: (Offers received / Total Applications) * 100
        offer_conv_rate = (
            round((offers_count / total_apps) * 100.0, 1)
            if total_apps > 0
            else 0.0
        )

        # 3. Interview-to-Offer rate: (Offers received / Applications with interviews) * 100
        interview_to_offer_rate = (
            round((offers_count / apps_with_interviews_count) * 100.0, 1)
            if apps_with_interviews_count > 0
            else 0.0
        )

        return AnalyticsSummary(
            total_applications=total_apps,
            status_counts=dict(status_counter),
            company_counts=dict(company_counter),
            role_counts=dict(role_counter),
            job_type_counts=dict(type_counter),
            total_interviews=total_interviews,
            scheduled_interviews=scheduled_interviews,
            completed_interviews=completed_interviews,
            cancelled_interviews=cancelled_interviews,
            rescheduled_interviews=rescheduled_interviews,
            offers_received=offers_count,
            rejected_applications=rejected_count,
            withdrawn_applications=withdrawn_count,
            interview_conversion_rate=interview_conv_rate,
            offer_conversion_rate=offer_conv_rate,
            interview_to_offer_rate=interview_to_offer_rate,
        )
