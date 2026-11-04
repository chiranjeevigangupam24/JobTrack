#!/usr/bin/env python3
"""JobTrack — Job Application Management System.

Entrypoint for the menu-driven command-line application.
Uses only the Python standard library.
"""

import sys
from pathlib import Path

# Ensure 'src' package can be imported regardless of execution working directory
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.models.application import (
    ApplicationStatus,
    InterviewMode,
    InterviewOutcome,
    InterviewRound,
    InterviewStatus,
    JobType,
)
from src.reports.csv_exporter import CSVExporter
from src.services.analytics_service import AnalyticsService
from src.services.application_service import ApplicationService, RecordNotFoundError
from src.services.interview_service import InterviewService
from src.services.reminder_service import ReminderService
from src.storage.json_storage import JSONStorage, StorageError
from src.utils.date_utils import format_date, get_current_date
from src.utils.display import TerminalDisplay
from src.utils.validators import (
    ValidationError,
    validate_date,
    validate_date_range,
    validate_time,
    validate_url,
)


class JobTrackApp:
    """Orchestrates menu routing, user interactions, and service coordination."""

    def __init__(self):
        self.storage = JSONStorage(data_dir=PROJECT_ROOT / "data")
        self.settings = self.storage.load_settings()

        self.app_service = ApplicationService(storage=self.storage)
        self.interview_service = InterviewService(app_service=self.app_service)
        self.reminder_service = ReminderService(
            app_service=self.app_service,
            default_window_days=self.settings.get("reminder_window_days", 7),
        )
        self.analytics_service = AnalyticsService(app_service=self.app_service)
        self.csv_exporter = CSVExporter(export_dir=PROJECT_ROOT / "exports")

    @property
    def date_format(self) -> str:
        """Current date format pattern from user settings."""
        return self.settings.get("date_display_format", "%Y-%m-%d")

    def run(self) -> None:
        """Main application lifecycle loop."""
        TerminalDisplay.header("Welcome to JobTrack")
        print("  Your Personal Job Application & Interview Pipeline Manager")
        print(f"  Storage Directory: {self.storage.data_dir}")

        # Show initial startup reminder banner
        self._display_startup_alerts()

        while True:
            TerminalDisplay.print_main_menu()
            choice = input("\nEnter menu selection [1-15]: ").strip()

            if choice == "1":
                self.menu_dashboard()
            elif choice == "2":
                self.menu_add_application()
            elif choice == "3":
                self.menu_view_all_applications()
            elif choice == "4":
                self.menu_view_application_details()
            elif choice == "5":
                self.menu_update_application()
            elif choice == "6":
                self.menu_delete_application()
            elif choice == "7":
                self.menu_search_applications()
            elif choice == "8":
                self.menu_filter_applications()
            elif choice == "9":
                self.menu_manage_interviews()
            elif choice == "10":
                self.menu_view_reminders()
            elif choice == "11":
                self.menu_analytics_and_reports()
            elif choice == "12":
                self.menu_export_data_to_csv()
            elif choice == "13":
                self.menu_settings()
            elif choice == "14":
                self.menu_help()
            elif choice == "15":
                if TerminalDisplay.prompt_confirm("Are you sure you want to exit JobTrack?", default=True):
                    TerminalDisplay.header("Thank You For Using JobTrack")
                    print("  All records and settings have been safely saved.\n  Best of luck with your job search!\n")
                    sys.exit(0)
            else:
                TerminalDisplay.warning("Invalid menu option. Please enter a number between 1 and 15.")

    # ------------------ Startup Alert Banner ------------------

    def _display_startup_alerts(self) -> None:
        """Display quick notification on startup if critical actions require attention."""
        reminders = self.reminder_service.get_all_reminders_summary()
        today_count = len(reminders["interviews_today"])
        overdue_count = len(reminders["overdue_deadlines"])

        if today_count > 0 or overdue_count > 0:
            print("\n" + "!" * TerminalDisplay.WIDTH)
            print(" ATTENTION: ACTION ITEMS REQUIRE YOUR IMMEDIATE REVIEW ".center(TerminalDisplay.WIDTH))
            if today_count > 0:
                print(f"  * You have {today_count} interview(s) scheduled for TODAY!")
            if overdue_count > 0:
                print(f"  * You have {overdue_count} active application deadline(s) that are OVERDUE!")
            print("  Select option [10] from the menu to review full reminder details.")
            print("!" * TerminalDisplay.WIDTH)

    # ------------------ Option 1: Dashboard ------------------

    def menu_dashboard(self) -> None:
        """Display executive summary dashboard."""
        summary = self.analytics_service.calculate_summary()
        reminders = self.reminder_service.get_all_reminders_summary()

        TerminalDisplay.header("Job Search Pipeline Dashboard")
        print(f"  Total Applications : {summary.total_applications:<6} | Offers Received : {summary.offers_received}")
        print(f"  Total Interviews   : {summary.total_interviews:<6} | Rejections      : {summary.rejected_applications}")
        print(f"  Interview Rate     : {summary.interview_conversion_rate}% | Offer Rate       : {summary.offer_conversion_rate}%")
        print("-" * TerminalDisplay.WIDTH)
        print("  Active Pipeline Status:")
        for status in ApplicationStatus.list_values():
            count = summary.status_counts.get(status, 0)
            print(f"    - {status:<16} : {count}")
        print("-" * TerminalDisplay.WIDTH)
        print(f"  Alerts: {len(reminders['interviews_today'])} interview(s) today | {len(reminders['overdue_deadlines'])} overdue deadline(s)")
        print("=" * TerminalDisplay.WIDTH)

    # ------------------ Option 2: Add Job Application ------------------

    def menu_add_application(self) -> None:
        """Prompt user for details and record a new application."""
        TerminalDisplay.header("Add New Job Application")
        print("  (Press Enter to accept default values when shown)\n")

        company = TerminalDisplay.prompt_string("Company Name (required)")
        role = TerminalDisplay.prompt_string("Job Role / Title (required)")
        location = TerminalDisplay.prompt_string("Location", required=False, default="Remote")

        # Select Job Type
        job_types = JobType.list_values()
        job_type = TerminalDisplay.prompt_choice("Select Job Type", job_types, default_index=0)

        description = TerminalDisplay.prompt_string("Job Description / Snippet", required=False, default="")

        # Dates
        today_str = get_current_date().strftime("%Y-%m-%d")
        app_date = TerminalDisplay.prompt_string(
            "Application Date (YYYY-MM-DD)",
            required=True,
            default=today_str,
            validator=lambda d: validate_date(d, "Application Date"),
        )
        deadline = TerminalDisplay.prompt_string(
            "Application Deadline (YYYY-MM-DD, optional)",
            required=False,
            default="",
            validator=lambda d: validate_date(d, "Application Deadline", allow_empty=True) if d else None,
        )

        job_url = TerminalDisplay.prompt_string(
            "Job Posting URL (optional)",
            required=False,
            default="",
            validator=lambda u: validate_url(u, allow_empty=True) if u else None,
        )

        # Salaries
        min_sal = TerminalDisplay.prompt_number("Minimum Salary (annual/base, optional)", required=False, min_val=0)
        max_sal = TerminalDisplay.prompt_number("Maximum Salary (annual/base, optional)", required=False, min_val=0)
        if min_sal is not None and max_sal is not None and min_sal > max_sal:
            TerminalDisplay.warning(f"Min salary ({min_sal}) exceeded max ({max_sal}). Swapping values.")
            min_sal, max_sal = max_sal, min_sal

        # Initial Status
        default_status = self.settings.get("default_application_status", ApplicationStatus.APPLIED.value)
        status_choices = ApplicationStatus.list_values()
        def_idx = status_choices.index(default_status) if default_status in status_choices else 0
        status = TerminalDisplay.prompt_choice("Select Initial Status", status_choices, default_index=def_idx)

        notes = TerminalDisplay.prompt_string("Additional Notes / Referral info", required=False, default="")

        try:
            created_app = self.app_service.add_application(
                company_name=company,
                job_role=role,
                location=location,
                job_type=job_type,
                job_description=description,
                application_date=app_date,
                application_deadline=deadline if deadline else None,
                job_url=job_url if job_url else None,
                min_salary=min_sal,
                max_salary=max_sal,
                status=status,
                notes=notes,
            )
            TerminalDisplay.success(
                f"Application successfully created! Assigned ID: [{created_app.application_id}]"
            )
        except Exception as e:
            TerminalDisplay.error(f"Failed to create application: {e}")

    # ------------------ Option 3: View All Applications ------------------

    def menu_view_all_applications(self) -> None:
        """Display all recorded applications in tabular format."""
        TerminalDisplay.header("All Job Applications")
        apps = self.app_service.get_all_applications()
        TerminalDisplay.render_applications_table(apps, date_format=self.date_format)

    # ------------------ Option 4: View Application Details ------------------

    def menu_view_application_details(self) -> None:
        """Display all details and interview rounds for an application."""
        TerminalDisplay.header("View Application Details")
        app_id = TerminalDisplay.prompt_string("Enter Application ID")
        app = self.app_service.get_application_by_id(app_id)
        if not app:
            TerminalDisplay.error(f"Application with ID '{app_id}' was not found.")
            return

        TerminalDisplay.render_application_details(app, date_format=self.date_format)

    # ------------------ Option 5: Update Application ------------------

    def menu_update_application(self) -> None:
        """Update fields of an existing job application."""
        TerminalDisplay.header("Update Job Application")
        app_id = TerminalDisplay.prompt_string("Enter Application ID to update")
        app = self.app_service.get_application_by_id(app_id)
        if not app:
            TerminalDisplay.error(f"Application with ID '{app_id}' was not found.")
            return

        print(f"\nEditing Application: {app.application_id} ({app.company_name} - {app.job_role})")
        print("Select field to update:")
        fields = [
            "Company Name",
            "Job Role",
            "Location",
            "Job Type",
            "Job Description",
            "Application Date",
            "Application Deadline",
            "Job Posting URL",
            "Salary Range",
            "Status",
            "Notes",
            "Done (Return)",
        ]
        choice = TerminalDisplay.prompt_choice("Field to update", fields, default_index=len(fields) - 1)

        try:
            if choice == "Company Name":
                val = TerminalDisplay.prompt_string("New Company Name", default=app.company_name)
                self.app_service.update_application(app.application_id, company_name=val)
            elif choice == "Job Role":
                val = TerminalDisplay.prompt_string("New Job Role", default=app.job_role)
                self.app_service.update_application(app.application_id, job_role=val)
            elif choice == "Location":
                val = TerminalDisplay.prompt_string("New Location", default=app.location)
                self.app_service.update_application(app.application_id, location=val)
            elif choice == "Job Type":
                val = TerminalDisplay.prompt_choice("Select Job Type", JobType.list_values())
                self.app_service.update_application(app.application_id, job_type=val)
            elif choice == "Job Description":
                val = TerminalDisplay.prompt_string("New Job Description", default=app.job_description)
                self.app_service.update_application(app.application_id, job_description=val)
            elif choice == "Application Date":
                val = TerminalDisplay.prompt_string(
                    "New Application Date (YYYY-MM-DD)",
                    default=app.application_date,
                    validator=lambda d: validate_date(d, "Application Date"),
                )
                self.app_service.update_application(app.application_id, application_date=val)
            elif choice == "Application Deadline":
                val = TerminalDisplay.prompt_string(
                    "New Deadline (YYYY-MM-DD or leave blank to clear)",
                    required=False,
                    default=app.application_deadline or "",
                    validator=lambda d: validate_date(d, "Deadline", allow_empty=True) if d else None,
                )
                self.app_service.update_application(app.application_id, application_deadline=val or None)
            elif choice == "Job Posting URL":
                val = TerminalDisplay.prompt_string(
                    "New Job Posting URL (or leave blank to clear)",
                    required=False,
                    default=app.job_url or "",
                    validator=lambda u: validate_url(u, allow_empty=True) if u else None,
                )
                self.app_service.update_application(app.application_id, job_url=val or None)
            elif choice == "Salary Range":
                min_s = TerminalDisplay.prompt_number(
                    "New Minimum Salary",
                    required=False,
                    default=app.min_salary,
                    min_val=0,
                )
                max_s = TerminalDisplay.prompt_number(
                    "New Maximum Salary",
                    required=False,
                    default=app.max_salary,
                    min_val=0,
                )
                self.app_service.update_application(app.application_id, min_salary=min_s, max_salary=max_s)
            elif choice == "Status":
                val = TerminalDisplay.prompt_choice(
                    "Select New Status", ApplicationStatus.list_values()
                )
                self.app_service.update_application(app.application_id, status=val)
            elif choice == "Notes":
                val = TerminalDisplay.prompt_string("New Notes", default=app.notes)
                self.app_service.update_application(app.application_id, notes=val)
            elif choice == "Done (Return)":
                return

            TerminalDisplay.success(f"Application '{app.application_id}' successfully updated!")
        except Exception as e:
            TerminalDisplay.error(f"Failed to update application: {e}")

    # ------------------ Option 6: Delete Application ------------------

    def menu_delete_application(self) -> None:
        """Prompt and confirm deletion of an application record."""
        TerminalDisplay.header("Delete Job Application")
        app_id = TerminalDisplay.prompt_string("Enter Application ID to delete")
        app = self.app_service.get_application_by_id(app_id)
        if not app:
            TerminalDisplay.error(f"Application with ID '{app_id}' was not found.")
            return

        print(f"\n  Target Record: {app.application_id} - {app.company_name} ({app.job_role})")
        print(f"  Includes {len(app.interviews)} associated interview round(s).")
        confirmed = TerminalDisplay.prompt_confirm(
            "Are you SURE you want to permanently delete this application?",
            default=False,
        )
        if confirmed:
            try:
                self.app_service.delete_application(app.application_id)
                TerminalDisplay.success(f"Application '{app.application_id}' has been permanently deleted.")
            except Exception as e:
                TerminalDisplay.error(f"Failed to delete application: {e}")
        else:
            TerminalDisplay.info("Deletion cancelled by user.")

    # ------------------ Option 7: Search Applications ------------------

    def menu_search_applications(self) -> None:
        """Search applications by company, role, location, ID, or all fields."""
        TerminalDisplay.header("Search Applications")
        print("Select search criteria:")
        choices = [
            "Search Across All Fields",
            "Search by Company Name",
            "Search by Job Role",
            "Search by Location",
            "Search by Application ID",
        ]
        choice = TerminalDisplay.prompt_choice("Search Criteria", choices, default_index=0)
        field_map = {
            "Search Across All Fields": "all",
            "Search by Company Name": "company",
            "Search by Job Role": "role",
            "Search by Location": "location",
            "Search by Application ID": "id",
        }
        search_field = field_map[choice]
        query = TerminalDisplay.prompt_string("Enter search term")

        results = self.app_service.search_applications(query, search_field=search_field)
        if not results:
            TerminalDisplay.warning(f"No applications matched your search query '{query}'.")
        else:
            print(f"\nFound {len(results)} matching application(s):")
            TerminalDisplay.render_applications_table(results, date_format=self.date_format)

    # ------------------ Option 8: Filter Applications ------------------

    def menu_filter_applications(self) -> None:
        """Filter applications by status, job type, or submission date range."""
        TerminalDisplay.header("Filter Applications")
        print("Select filter type:")
        choices = [
            "Filter by Status",
            "Filter by Job Type",
            "Filter by Application Date Range",
        ]
        choice = TerminalDisplay.prompt_choice("Filter Type", choices, default_index=0)

        if choice == "Filter by Status":
            status = TerminalDisplay.prompt_choice(
                "Select Status", ApplicationStatus.list_values()
            )
            results = self.app_service.filter_applications(status=status)
        elif choice == "Filter by Job Type":
            job_type = TerminalDisplay.prompt_choice(
                "Select Job Type", JobType.list_values()
            )
            results = self.app_service.filter_applications(job_type=job_type)
        else:
            start_date = TerminalDisplay.prompt_string(
                "Start Date (YYYY-MM-DD)",
                validator=lambda d: validate_date(d, "Start Date"),
            )
            end_date = TerminalDisplay.prompt_string(
                "End Date (YYYY-MM-DD)",
                validator=lambda d: validate_date(d, "End Date"),
            )
            try:
                validate_date_range(start_date, end_date)
                results = self.app_service.filter_applications(
                    start_date=start_date, end_date=end_date
                )
            except ValidationError as ve:
                TerminalDisplay.error(str(ve))
                return

        if not results:
            TerminalDisplay.warning("No applications matched the specified filter criteria.")
        else:
            print(f"\nFiltered Results ({len(results)} application(s)):")
            TerminalDisplay.render_applications_table(results, date_format=self.date_format)

    # ------------------ Option 9: Manage Interviews ------------------

    def menu_manage_interviews(self) -> None:
        """Submenu for scheduling, updating, cancelling, and viewing interview rounds."""
        while True:
            TerminalDisplay.header("Interview Management Submenu")
            choices = [
                "Schedule a New Interview",
                "View All Scheduled & Completed Interviews",
                "View Interviews for a Particular Application",
                "Update an Interview",
                "Cancel an Interview",
                "Record Interview Outcome",
                "Return to Main Menu",
            ]
            choice = TerminalDisplay.prompt_choice("Select Operation", choices, default_index=len(choices) - 1)

            if choice == "Schedule a New Interview":
                self._action_schedule_interview()
            elif choice == "View All Scheduled & Completed Interviews":
                interviews = self.interview_service.get_all_interviews()
                TerminalDisplay.render_interviews_table(interviews, date_format=self.date_format)
            elif choice == "View Interviews for a Particular Application":
                app_id = TerminalDisplay.prompt_string("Enter Application ID")
                try:
                    ivs = self.interview_service.get_interviews_for_application(app_id)
                    app = self.app_service.get_application_by_id(app_id)
                    if app:
                        pairs = [(app, iv) for iv in ivs]
                        TerminalDisplay.render_interviews_table(pairs, date_format=self.date_format)
                except RecordNotFoundError as e:
                    TerminalDisplay.error(str(e))
            elif choice == "Update an Interview":
                self._action_update_interview()
            elif choice == "Cancel an Interview":
                self._action_cancel_interview()
            elif choice == "Record Interview Outcome":
                self._action_record_interview_outcome()
            elif choice == "Return to Main Menu":
                break

    def _action_schedule_interview(self) -> None:
        """Interactive workflow to schedule an interview round."""
        TerminalDisplay.subheader("Schedule an Interview")
        app_id = TerminalDisplay.prompt_string("Enter Target Application ID")
        app = self.app_service.get_application_by_id(app_id)
        if not app:
            TerminalDisplay.error(f"Application '{app_id}' does not exist.")
            return

        print(f"Target: {app.company_name} — {app.job_role}")
        round_name = TerminalDisplay.prompt_choice(
            "Select Interview Round", InterviewRound.list_values(), default_index=0
        )
        if round_name == InterviewRound.OTHER.value:
            round_name = TerminalDisplay.prompt_string("Specify Custom Round Name")

        iv_date = TerminalDisplay.prompt_string(
            "Interview Date (YYYY-MM-DD)",
            validator=lambda d: validate_date(d, "Interview Date"),
        )
        iv_time = TerminalDisplay.prompt_string(
            "Interview Time (HH:MM 24-hour)",
            validator=lambda t: validate_time(t, "Interview Time"),
        )
        mode = TerminalDisplay.prompt_choice(
            "Select Interview Mode", InterviewMode.list_values(), default_index=0
        )
        link = TerminalDisplay.prompt_string(
            "Meeting Link (e.g., Google Meet / Zoom URL, optional)",
            required=False,
            default="",
            validator=lambda u: validate_url(u, allow_empty=True) if u else None,
        )
        notes = TerminalDisplay.prompt_string("Preparation Notes / Agenda", required=False, default="")

        try:
            new_iv = self.interview_service.schedule_interview(
                application_id=app.application_id,
                round_name=round_name,
                interview_date=iv_date,
                interview_time=iv_time,
                interview_mode=mode,
                meeting_link=link if link else None,
                prep_notes=notes,
            )
            TerminalDisplay.success(
                f"Interview scheduled successfully! ID: [{new_iv.interview_id}] for {app.company_name}."
            )
        except Exception as e:
            TerminalDisplay.error(f"Failed to schedule interview: {e}")

    def _action_update_interview(self) -> None:
        """Interactive workflow to update an interview round."""
        iv_id = TerminalDisplay.prompt_string("Enter Interview ID to update")
        found = self.interview_service.get_interview_by_id(iv_id)
        if not found:
            TerminalDisplay.error(f"Interview with ID '{iv_id}' not found.")
            return

        app, iv = found
        print(f"Editing Interview '{iv.interview_id}' for {app.company_name} ({iv.round_name})")
        fields = [
            "Round Name",
            "Interview Date",
            "Interview Time",
            "Mode",
            "Meeting Link",
            "Status",
            "Preparation Notes",
            "Done (Cancel)",
        ]
        choice = TerminalDisplay.prompt_choice("Select Field to Update", fields, default_index=len(fields) - 1)

        try:
            if choice == "Round Name":
                val = TerminalDisplay.prompt_string("New Round Name", default=iv.round_name)
                self.interview_service.update_interview(app.application_id, iv.interview_id, round_name=val)
            elif choice == "Interview Date":
                val = TerminalDisplay.prompt_string(
                    "New Date (YYYY-MM-DD)",
                    default=iv.interview_date,
                    validator=lambda d: validate_date(d, "Interview Date"),
                )
                self.interview_service.update_interview(app.application_id, iv.interview_id, interview_date=val)
            elif choice == "Interview Time":
                val = TerminalDisplay.prompt_string(
                    "New Time (HH:MM)",
                    default=iv.interview_time,
                    validator=lambda t: validate_time(t, "Interview Time"),
                )
                self.interview_service.update_interview(app.application_id, iv.interview_id, interview_time=val)
            elif choice == "Mode":
                val = TerminalDisplay.prompt_choice("Interview Mode", InterviewMode.list_values())
                self.interview_service.update_interview(app.application_id, iv.interview_id, interview_mode=val)
            elif choice == "Meeting Link":
                val = TerminalDisplay.prompt_string(
                    "Meeting Link (or blank to clear)",
                    required=False,
                    default=iv.meeting_link or "",
                    validator=lambda u: validate_url(u, allow_empty=True) if u else None,
                )
                self.interview_service.update_interview(app.application_id, iv.interview_id, meeting_link=val or None)
            elif choice == "Status":
                val = TerminalDisplay.prompt_choice("Interview Status", InterviewStatus.list_values())
                self.interview_service.update_interview(app.application_id, iv.interview_id, interview_status=val)
            elif choice == "Preparation Notes":
                val = TerminalDisplay.prompt_string("Preparation Notes", default=iv.prep_notes)
                self.interview_service.update_interview(app.application_id, iv.interview_id, prep_notes=val)
            elif choice == "Done (Cancel)":
                return

            TerminalDisplay.success("Interview updated successfully.")
        except Exception as e:
            TerminalDisplay.error(f"Failed to update interview: {e}")

    def _action_cancel_interview(self) -> None:
        """Cancel an interview round with reason."""
        iv_id = TerminalDisplay.prompt_string("Enter Interview ID to cancel")
        found = self.interview_service.get_interview_by_id(iv_id)
        if not found:
            TerminalDisplay.error(f"Interview '{iv_id}' not found.")
            return

        app, iv = found
        reason = TerminalDisplay.prompt_string("Cancellation Reason (optional)", required=False, default="")
        if TerminalDisplay.prompt_confirm(f"Cancel interview '{iv.round_name}' with {app.company_name}?"):
            try:
                self.interview_service.cancel_interview(app.application_id, iv.interview_id, cancellation_reason=reason)
                TerminalDisplay.success(f"Interview '{iv.interview_id}' marked as Cancelled.")
            except Exception as e:
                TerminalDisplay.error(f"Failed to cancel interview: {e}")

    def _action_record_interview_outcome(self) -> None:
        """Record the outcome for an interview round."""
        iv_id = TerminalDisplay.prompt_string("Enter Interview ID to log outcome")
        found = self.interview_service.get_interview_by_id(iv_id)
        if not found:
            TerminalDisplay.error(f"Interview '{iv_id}' not found.")
            return

        app, iv = found
        outcome = TerminalDisplay.prompt_choice("Select Interview Outcome", InterviewOutcome.list_values())
        notes = TerminalDisplay.prompt_string("Outcome Notes / Feedback received", required=False, default="")

        try:
            self.interview_service.record_outcome(app.application_id, iv.interview_id, outcome=outcome, notes=notes)
            TerminalDisplay.success(f"Outcome '{outcome}' recorded for interview '{iv.interview_id}'.")
        except Exception as e:
            TerminalDisplay.error(f"Failed to record outcome: {e}")

    # ------------------ Option 10: View Reminders ------------------

    def menu_view_reminders(self) -> None:
        """Display comprehensive reminders for schedules and deadlines."""
        summary = self.reminder_service.get_all_reminders_summary()
        TerminalDisplay.render_reminders_view(summary, date_format=self.date_format)

    # ------------------ Option 11: Analytics and Reports ------------------

    def menu_analytics_and_reports(self) -> None:
        """Display deep analytical report and metrics."""
        summary = self.analytics_service.calculate_summary()
        TerminalDisplay.render_analytics(summary)

    # ------------------ Option 12: Export Data to CSV ------------------

    def menu_export_data_to_csv(self) -> None:
        """Export application, interview, or analytics records to CSV files."""
        TerminalDisplay.header("Export Data to CSV")
        choices = [
            "Export All Applications",
            "Export Applications by Status",
            "Export All Interview Records",
            "Export Analytics Summary",
            "Return to Main Menu",
        ]
        choice = TerminalDisplay.prompt_choice("Select Export Option", choices, default_index=0)

        try:
            if choice == "Export All Applications":
                apps = self.app_service.get_all_applications()
                path = self.csv_exporter.export_applications(apps)
                TerminalDisplay.success(f"Successfully exported {len(apps)} application(s) to:\n  {path}")
            elif choice == "Export Applications by Status":
                status = TerminalDisplay.prompt_choice("Select Target Status", ApplicationStatus.list_values())
                apps = self.app_service.get_all_applications()
                path = self.csv_exporter.export_applications_by_status(apps, status=status)
                TerminalDisplay.success(f"Successfully exported status '{status}' applications to:\n  {path}")
            elif choice == "Export All Interview Records":
                ivs = self.interview_service.get_all_interviews()
                path = self.csv_exporter.export_interviews(ivs)
                TerminalDisplay.success(f"Successfully exported {len(ivs)} interview record(s) to:\n  {path}")
            elif choice == "Export Analytics Summary":
                summary = self.analytics_service.calculate_summary()
                path = self.csv_exporter.export_analytics(summary)
                TerminalDisplay.success(f"Successfully exported analytics summary to:\n  {path}")
            elif choice == "Return to Main Menu":
                return
        except Exception as e:
            TerminalDisplay.error(f"CSV Export failed: {e}")

    # ------------------ Option 13: Settings ------------------

    def menu_settings(self) -> None:
        """View and modify application preferences."""
        while True:
            TerminalDisplay.header("JobTrack Configuration Settings")
            print(f"  [1] Reminder Window (Days)     : {self.settings.get('reminder_window_days', 7)} days")
            print(f"  [2] Default Application Status : {self.settings.get('default_application_status', 'Applied')}")
            print(f"  [3] Date Display Format        : {self.settings.get('date_display_format', '%Y-%m-%d')}")
            print("  [4] Return to Main Menu")
            print("-" * TerminalDisplay.WIDTH)

            choice = input("Select setting to modify [1-4]: ").strip()
            if choice == "1":
                days = TerminalDisplay.prompt_number(
                    "Enter reminder window in days (1-90)",
                    num_type=int,
                    required=True,
                    default=self.settings.get("reminder_window_days", 7),
                    min_val=1,
                )
                if days and 1 <= days <= 90:
                    self.settings["reminder_window_days"] = int(days)
                    self.reminder_service.default_window_days = int(days)
                    self.storage.save_settings(self.settings)
                    TerminalDisplay.success("Reminder window updated!")
                else:
                    TerminalDisplay.error("Please provide a number between 1 and 90.")
            elif choice == "2":
                new_status = TerminalDisplay.prompt_choice(
                    "Select Default Status", ApplicationStatus.list_values()
                )
                self.settings["default_application_status"] = new_status
                self.storage.save_settings(self.settings)
                TerminalDisplay.success("Default status updated!")
            elif choice == "3":
                formats = [
                    ("%Y-%m-%d", "YYYY-MM-DD (ISO standard, e.g. 2026-10-26)"),
                    ("%d-%m-%Y", "DD-MM-YYYY (European/Indian standard, e.g. 26-10-2026)"),
                    ("%m/%d/%Y", "MM/DD/YYYY (US standard, e.g. 10/26/2026)"),
                    ("%b %d, %Y", "Mon DD, YYYY (e.g. Oct 26, 2026)"),
                ]
                format_choices = [f[1] for f in formats]
                chosen_label = TerminalDisplay.prompt_choice("Select Date Format", format_choices)
                for fmt, label in formats:
                    if label == chosen_label:
                        self.settings["date_display_format"] = fmt
                        break
                self.storage.save_settings(self.settings)
                TerminalDisplay.success("Date display format updated!")
            elif choice == "4":
                break
            else:
                TerminalDisplay.warning("Please choose a valid option (1-4).")

    # ------------------ Option 14: Help ------------------

    def menu_help(self) -> None:
        """Display user guide and operation instructions."""
        TerminalDisplay.header("JobTrack — User Guide & Architecture")
        print("""
1. OVERVIEW:
   JobTrack is a complete, self-contained Python CLI tool designed to streamline
   job hunting, stage progression, interview scheduling, and deadline tracking.

2. CORE APPLICATION LIFECYCLE:
   * Applied        : Initial submission to job portal or direct recruiter reach-out.
   * Assessment     : Online coding test, take-home challenge, or psychometric test.
   * Interview      : Screening, technical rounds, system design, or managerial rounds.
   * Offer Received : Official or verbal offer extended.
   * Selected       : Offer accepted and joining confirmed.
   * Rejected       : Application not moving forward.
   * Withdrawn      : Application voluntarily withdrawn by the candidate.

3. INTERVIEW MANAGEMENT:
   * Each job application can have multiple interview rounds attached.
   * Scheduling an interview will automatically bump early status to 'Interview'.
   * Record outcomes ('Passed', 'Failed', 'Pending') to monitor stage velocity.

4. REMINDER WINDOW & ALERTS:
   * Displays interviews scheduled for today, upcoming interviews in N days,
     deadlines approaching within N days, and overdue deadlines for active roles.
   * Inactive applications (Selected, Rejected, Withdrawn) do NOT trigger alerts.

5. SPREADSHEET SAFETY & CSV EXPORT:
   * All exported CSV files disarm potential spreadsheet formula injection
     by escaping cells starting with '=', '+', '-', '@', etc.

6. DATA STORAGE & ATOMICITY:
   * Persisted locally in 'data/applications.json' and 'data/settings.json'.
   * All file writes are atomic using temporary file replacement to prevent
     data corruption upon unexpected termination.
""")
        input("\nPress [Enter] to return to Main Menu...")


def main():
    """Application entrypoint."""
    try:
        app = JobTrackApp()
        app.run()
    except KeyboardInterrupt:
        print("\n\nSession terminated by user (Ctrl+C). Goodbye!")
        sys.exit(0)
    except Exception as e:
        print(f"\n[FATAL ERROR] An unexpected error occurred: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
