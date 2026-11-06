"""CSV export service for JobTrack.

Generates structured, spreadsheet-safe CSV exports with formula injection disarming,
custom formatting, and automatic timestamped filenames.
"""

import csv
from datetime import datetime
from pathlib import Path
from typing import Any, List, Optional, Tuple, Union

from src.models.application import Interview, JobApplication
from src.services.analytics_service import AnalyticsSummary
from src.utils.validators import sanitize_for_csv


class ExportError(Exception):
    """Raised when CSV generation or writing fails."""
    pass


class CSVExporter:
    """Exports applications, interviews, and analytics to spreadsheet-safe CSV files."""

    def __init__(self, export_dir: Optional[Union[str, Path]] = None):
        if export_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent
            self.export_dir = base_dir / "exports"
        else:
            self.export_dir = Path(export_dir)

        self._ensure_directory(self.export_dir)

    def _ensure_directory(self, path: Path) -> None:
        """Create export directory if missing."""
        try:
            path.mkdir(parents=True, exist_ok=True)
        except OSError as e:
            raise ExportError(f"Failed to create export directory '{path}': {e}") from e

    def _generate_filename(self, prefix: str) -> str:
        """Generate a standard timestamped filename."""
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{prefix}_{ts}.csv"

    def export_applications(
        self,
        applications: List[JobApplication],
        filename: Optional[str] = None,
    ) -> Path:
        """Export a list of job applications to CSV.

        Protects against spreadsheet formula injection by sanitizing all text cells.

        Args:
            applications: List of JobApplication objects.
            filename: Optional custom filename.

        Returns:
            Path of the exported CSV file.

        Raises:
            ExportError: If file writing fails.
        """
        out_name = filename or self._generate_filename("applications_export")
        out_path = self.export_dir / out_name

        headers = [
            "Application ID",
            "Company Name",
            "Job Role",
            "Location",
            "Job Type",
            "Status",
            "Application Date",
            "Deadline",
            "Min Salary",
            "Max Salary",
            "Salary Display",
            "Job Posting URL",
            "Interviews Count",
            "Notes",
            "Created At",
            "Updated At",
            "Applicant Name",
        ]

        try:
            with open(out_path, mode="w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
                writer.writerow(headers)

                for app in applications:
                    row = [
                        sanitize_for_csv(app.application_id),
                        sanitize_for_csv(app.company_name),
                        sanitize_for_csv(app.job_role),
                        sanitize_for_csv(app.location),
                        sanitize_for_csv(app.job_type),
                        sanitize_for_csv(app.status.value),
                        sanitize_for_csv(app.application_date),
                        sanitize_for_csv(app.application_deadline or "N/A"),
                        sanitize_for_csv(f"{app.min_salary:.2f}" if app.min_salary is not None else ""),
                        sanitize_for_csv(f"{app.max_salary:.2f}" if app.max_salary is not None else ""),
                        sanitize_for_csv(app.salary_display()),
                        sanitize_for_csv(app.job_url or ""),
                        sanitize_for_csv(str(len(app.interviews))),
                        sanitize_for_csv(app.notes),
                        sanitize_for_csv(app.created_at),
                        sanitize_for_csv(app.updated_at),
                        sanitize_for_csv(getattr(app, "applicant_name", "Naga Chiranjeevi")),
                    ]
                    writer.writerow(row)

            return out_path
        except OSError as e:
            raise ExportError(f"Failed to export applications to '{out_path}': {e}") from e

    def export_applications_by_status(
        self,
        applications: List[JobApplication],
        status: str,
        filename: Optional[str] = None,
    ) -> Path:
        """Export applications filtered by status."""
        target_status = status.strip().lower()
        filtered = [a for a in applications if a.status.value.lower() == target_status]
        clean_prefix = f"applications_{status.lower().replace(' ', '_')}"
        out_name = filename or self._generate_filename(clean_prefix)
        return self.export_applications(filtered, filename=out_name)

    def export_interviews(
        self,
        interviews: List[Tuple[JobApplication, Interview]],
        filename: Optional[str] = None,
    ) -> Path:
        """Export interview records across applications to CSV.

        Args:
            interviews: List of (JobApplication, Interview) tuples.
            filename: Optional custom filename.

        Returns:
            Path of generated CSV.
        """
        out_name = filename or self._generate_filename("interviews_export")
        out_path = self.export_dir / out_name

        headers = [
            "Interview ID",
            "Application ID",
            "Company Name",
            "Job Role",
            "Round Name",
            "Date",
            "Time",
            "Mode",
            "Status",
            "Outcome",
            "Meeting Link",
            "Preparation Notes",
            "Created At",
            "Updated At",
        ]

        try:
            with open(out_path, mode="w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
                writer.writerow(headers)

                for app, iv in interviews:
                    row = [
                        sanitize_for_csv(iv.interview_id),
                        sanitize_for_csv(iv.application_id),
                        sanitize_for_csv(app.company_name),
                        sanitize_for_csv(app.job_role),
                        sanitize_for_csv(iv.round_name),
                        sanitize_for_csv(iv.interview_date),
                        sanitize_for_csv(iv.interview_time),
                        sanitize_for_csv(iv.interview_mode),
                        sanitize_for_csv(iv.interview_status.value),
                        sanitize_for_csv(iv.outcome.value),
                        sanitize_for_csv(iv.meeting_link or ""),
                        sanitize_for_csv(iv.prep_notes),
                        sanitize_for_csv(iv.created_at),
                        sanitize_for_csv(iv.updated_at),
                    ]
                    writer.writerow(row)

            return out_path
        except OSError as e:
            raise ExportError(f"Failed to export interviews to '{out_path}': {e}") from e

    def export_analytics(
        self,
        summary: AnalyticsSummary,
        filename: Optional[str] = None,
    ) -> Path:
        """Export analytics summary metrics and distributions to CSV."""
        out_name = filename or self._generate_filename("analytics_summary")
        out_path = self.export_dir / out_name

        try:
            with open(out_path, mode="w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)

                # High-level metrics section
                writer.writerow(["=== JOB SEARCH OVERVIEW METRICS ===", ""])
                writer.writerow(["Metric", "Value"])
                writer.writerow(["Total Applications", summary.total_applications])
                writer.writerow(["Offers Received", summary.offers_received])
                writer.writerow(["Rejected Applications", summary.rejected_applications])
                writer.writerow(["Withdrawn Applications", summary.withdrawn_applications])
                writer.writerow(["Total Interviews", summary.total_interviews])
                writer.writerow(["Scheduled Interviews", summary.scheduled_interviews])
                writer.writerow(["Completed Interviews", summary.completed_interviews])
                writer.writerow(["Cancelled Interviews", summary.cancelled_interviews])
                writer.writerow(["Rescheduled Interviews", summary.rescheduled_interviews])
                writer.writerow(["Interview Conversion Rate", f"{summary.interview_conversion_rate}%"])
                writer.writerow(["Overall Offer Rate", f"{summary.offer_conversion_rate}%"])
                writer.writerow(["Interview-to-Offer Rate", f"{summary.interview_to_offer_rate}%"])
                writer.writerow([])

                # Status distribution section
                writer.writerow(["=== APPLICATION STATUS BREAKDOWN ===", ""])
                writer.writerow(["Status", "Count"])
                for status_name, count in summary.status_counts.items():
                    writer.writerow([sanitize_for_csv(status_name), count])
                writer.writerow([])

                # Top companies
                writer.writerow(["=== APPLICATIONS BY COMPANY ===", ""])
                writer.writerow(["Company", "Count"])
                for company, count in sorted(summary.company_counts.items(), key=lambda x: x[1], reverse=True):
                    writer.writerow([sanitize_for_csv(company), count])
                writer.writerow([])

                # Top roles
                writer.writerow(["=== APPLICATIONS BY ROLE ===", ""])
                writer.writerow(["Role", "Count"])
                for role, count in sorted(summary.role_counts.items(), key=lambda x: x[1], reverse=True):
                    writer.writerow([sanitize_for_csv(role), count])
                writer.writerow([])

                # Job Types
                writer.writerow(["=== APPLICATIONS BY JOB TYPE ===", ""])
                writer.writerow(["Job Type", "Count"])
                for j_type, count in summary.job_type_counts.items():
                    writer.writerow([sanitize_for_csv(j_type), count])

            return out_path
        except OSError as e:
            raise ExportError(f"Failed to export analytics summary to '{out_path}': {e}") from e
