"""Application management service for JobTrack.

Coordinates CRUD operations, case-insensitive searches, multi-criteria filtering,
and persistence synchronization.
"""

from datetime import datetime
from typing import List, Optional

from src.models.application import ApplicationStatus, JobApplication
from src.storage.json_storage import JSONStorage
from src.utils.validators import validate_date_range


class ApplicationServiceError(Exception):
    """General exception for application service failures."""
    pass


class RecordNotFoundError(ApplicationServiceError):
    """Raised when an application or interview cannot be located."""
    pass


class ApplicationService:
    """Service handling job application lifecycle and query operations."""

    def __init__(self, storage: Optional[JSONStorage] = None):
        self.storage = storage or JSONStorage()
        self._applications: List[JobApplication] = []
        self.reload()

    def reload(self) -> None:
        """Reload applications from JSON storage."""
        self._applications = self.storage.load_applications()

    def _persist(self) -> None:
        """Save current application state to storage."""
        self.storage.save_applications(self._applications)

    def add_application(
        self,
        company_name: str,
        job_role: str,
        location: str = "Remote",
        job_type: str = "Full-time",
        job_description: str = "",
        application_date: Optional[str] = None,
        application_deadline: Optional[str] = None,
        job_url: Optional[str] = None,
        min_salary: Optional[float] = None,
        max_salary: Optional[float] = None,
        status: str = ApplicationStatus.APPLIED.value,
        notes: str = "",
        applicant_name: Optional[str] = None,
    ) -> JobApplication:
        """Create, validate, persist, and return a new JobApplication."""
        # Fall back to applicant_name in settings if not passed
        if not applicant_name:
            settings = self.storage.load_settings()
            applicant_name = settings.get("applicant_name", "Naga Chiranjeevi")

        app = JobApplication(
            company_name=company_name,
            job_role=job_role,
            location=location,
            job_type=job_type,
            job_description=job_description,
            application_date=application_date,
            application_deadline=application_deadline,
            job_url=job_url,
            min_salary=min_salary,
            max_salary=max_salary,
            status=status,
            notes=notes,
            applicant_name=applicant_name,
        )
        self._applications.append(app)
        self._persist()
        return app

    def get_all_applications(self, sort_by_date_desc: bool = True) -> List[JobApplication]:
        """Retrieve all applications, optionally sorted by application date descending."""
        if sort_by_date_desc:
            return sorted(
                self._applications,
                key=lambda a: (a.application_date, a.created_at),
                reverse=True,
            )
        return list(self._applications)

    def get_application_by_id(self, application_id: str) -> Optional[JobApplication]:
        """Find an application by its unique ID (case-insensitive)."""
        target = application_id.strip().upper()
        for app in self._applications:
            if app.application_id.upper() == target:
                return app
        return None

    def update_application(self, application_id: str, **kwargs) -> JobApplication:
        """Update an existing application and persist changes immediately.

        Args:
            application_id: The ID of the application to update.
            **kwargs: Field names and new values.

        Returns:
            The updated JobApplication instance.

        Raises:
            RecordNotFoundError: If ID does not match any application.
        """
        self.reload()
        app = self.get_application_by_id(application_id)
        if not app:
            raise RecordNotFoundError(f"Application with ID '{application_id}' not found.")

        app.update(**kwargs)
        self._persist()
        return app

    def delete_application(self, application_id: str) -> bool:
        """Delete an application and its associated interviews.

        Args:
            application_id: The ID of the application to delete.

        Returns:
            True if deletion was successful.

        Raises:
            RecordNotFoundError: If application does not exist.
        """
        self.reload()
        app = self.get_application_by_id(application_id)
        if not app:
            raise RecordNotFoundError(f"Application with ID '{application_id}' not found.")

        self._applications = [a for a in self._applications if a.application_id != app.application_id]
        self._persist()
        return True

    def search_applications(
        self, query: str, search_field: str = "all"
    ) -> List[JobApplication]:
        """Perform a case-insensitive search across applications.

        Args:
            query: The search term.
            search_field: Field to search in ('all', 'id', 'company', 'role', 'location').

        Returns:
            Matching list of applications.
        """
        q = query.strip().lower()
        if not q:
            return self.get_all_applications()

        field = search_field.strip().lower()
        results: List[JobApplication] = []

        for app in self._applications:
            if field == "id":
                if q in app.application_id.lower():
                    results.append(app)
            elif field == "company":
                if q in app.company_name.lower():
                    results.append(app)
            elif field == "role":
                if q in app.job_role.lower():
                    results.append(app)
            elif field == "location":
                if q in app.location.lower():
                    results.append(app)
            else:  # "all"
                applicant = getattr(app, "applicant_name", "") or ""
                notes = getattr(app, "notes", "") or ""
                if (
                    q in app.application_id.lower()
                    or q in app.company_name.lower()
                    or q in app.job_role.lower()
                    or q in app.location.lower()
                    or q in app.job_type.lower()
                    or q in app.status.value.lower()
                    or q in applicant.lower()
                    or q in notes.lower()
                ):
                    results.append(app)

        return sorted(results, key=lambda a: a.application_date, reverse=True)

    def filter_applications(
        self,
        status: Optional[str] = None,
        job_type: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[JobApplication]:
        """Filter applications by status, job type, and/or date range.

        Args:
            status: Target status value (case-insensitive).
            job_type: Target job type value (case-insensitive).
            start_date: Filter start date (YYYY-MM-DD).
            end_date: Filter end date (YYYY-MM-DD).

        Returns:
            Filtered list of applications.
        """
        results = list(self._applications)

        # Status filter
        if status and status.strip():
            target_status = status.strip().lower()
            results = [a for a in results if a.status.value.lower() == target_status]

        # Job type filter
        if job_type and job_type.strip():
            target_type = job_type.strip().lower()
            results = [a for a in results if a.job_type.lower() == target_type]

        # Date range filter
        if start_date and end_date:
            clean_start, clean_end = validate_date_range(start_date, end_date)
            d_start = datetime.strptime(clean_start, "%Y-%m-%d").date()
            d_end = datetime.strptime(clean_end, "%Y-%m-%d").date()

            results = [
                a
                for a in results
                if d_start <= datetime.strptime(a.application_date, "%Y-%m-%d").date() <= d_end
            ]

        return sorted(results, key=lambda a: a.application_date, reverse=True)
