"""Terminal formatting, table rendering, and interactive input helpers for JobTrack.

Provides formatted ASCII banners, color-safe status indicators, paginated list displays,
and robust input prompts that prevent program crashes.
"""

from typing import Any, Callable, Dict, List, Optional, Tuple

from src.models.application import (
    ApplicationStatus,
    Interview,
    JobApplication,
)
from src.services.analytics_service import AnalyticsSummary
from src.utils.date_utils import format_date


class TerminalDisplay:
    """Handles all terminal formatting, output presentation, and user input validation."""

    WIDTH = 80

    @classmethod
    def header(cls, title: str) -> None:
        """Print an eye-catching section header with consistent borders."""
        print()
        print("=" * cls.WIDTH)
        print(f" {title.upper()} ".center(cls.WIDTH, "="))
        print("=" * cls.WIDTH)

    @classmethod
    def subheader(cls, title: str) -> None:
        """Print a secondary divider line."""
        print()
        print(f"--- {title} " + "-" * max(0, cls.WIDTH - len(title) - 5))

    @classmethod
    def success(cls, message: str) -> None:
        """Display a highlighted success notification."""
        print(f"\n[SUCCESS] {message}")

    @classmethod
    def warning(cls, message: str) -> None:
        """Display a caution/warning notification."""
        print(f"\n[WARNING] {message}")

    @classmethod
    def error(cls, message: str) -> None:
        """Display an error notification."""
        print(f"\n[ERROR] {message}")

    @classmethod
    def info(cls, message: str) -> None:
        """Display an informational notification."""
        print(f"[INFO] {message}")

    @classmethod
    def print_main_menu(cls) -> None:
        """Print the 15-option main menu."""
        print()
        print("=" * cls.WIDTH)
        print(" JOBTRACK - MAIN MENU ".center(cls.WIDTH, "="))
        print("=" * cls.WIDTH)
        menu_items = [
            ("1", "Dashboard (Quick Overview)"),
            ("2", "Add Job Application"),
            ("3", "View All Applications"),
            ("4", "View Application Details"),
            ("5", "Update Application"),
            ("6", "Delete Application"),
            ("7", "Search Applications"),
            ("8", "Filter Applications"),
            ("9", "Manage Interviews"),
            ("10", "View Reminders"),
            ("11", "Analytics and Reports"),
            ("12", "Export Data to CSV"),
            ("13", "Settings"),
            ("14", "Help & User Guide"),
            ("15", "Exit"),
        ]
        for num, desc in menu_items:
            print(f"  [{num.rjust(2)}]  {desc}")
        print("=" * cls.WIDTH)

    @classmethod
    def render_applications_table(
        cls,
        applications: List[JobApplication],
        date_format: str = "%Y-%m-%d",
    ) -> None:
        """Render a tabular list of job applications."""
        if not applications:
            print("\n  (No application records to display)")
            return

        print()
        header = f"{'#':<3} {'App ID':<13} {'Company':<16} {'Role':<18} {'Status':<14} {'Applied':<11} {'Deadline':<11}"
        print(header)
        print("-" * len(header))

        for idx, app in enumerate(applications, start=1):
            applied_str = format_date(app.application_date, date_format)
            deadline_str = format_date(app.application_deadline, date_format)

            comp = app.company_name[:14] + ".." if len(app.company_name) > 16 else app.company_name
            role = app.job_role[:16] + ".." if len(app.job_role) > 18 else app.job_role
            status = app.status.value[:14]

            print(
                f"{idx:<3} {app.application_id:<13} {comp:<16} {role:<18} {status:<14} {applied_str:<11} {deadline_str:<11}"
            )
        print("-" * len(header))
        print(f"Total: {len(applications)} application(s)")

    @classmethod
    def render_application_details(
        cls,
        app: JobApplication,
        date_format: str = "%Y-%m-%d",
    ) -> None:
        """Display comprehensive details of a single job application and its interview history."""
        cls.header(f"Application Details: {app.application_id}")
        print(f"  Company Name     : {app.company_name}")
        print(f"  Job Role         : {app.job_role}")
        print(f"  Location         : {app.location}")
        print(f"  Job Type         : {app.job_type}")
        print(f"  Current Status   : [{app.status.value}]")
        print(f"  Salary Range     : {app.salary_display()}")
        print(f"  Application Date : {format_date(app.application_date, date_format)}")
        print(f"  Deadline         : {format_date(app.application_deadline, date_format)}")
        print(f"  Job Posting URL  : {app.job_url or 'N/A'}")
        print(f"  Created At       : {app.created_at}")
        print(f"  Last Updated     : {app.updated_at}")

        if app.job_description:
            print("\n  Description:")
            for line in app.job_description.splitlines():
                print(f"    {line}")

        if app.notes:
            print("\n  Additional Notes:")
            for line in app.notes.splitlines():
                print(f"    {line}")

        cls.subheader(f"Interview History ({len(app.interviews)} rounds)")
        if not app.interviews:
            print("  (No interview rounds scheduled or recorded yet)")
        else:
            for idx, iv in enumerate(app.interviews, start=1):
                iv_date = format_date(iv.interview_date, date_format)
                print(
                    f"  [{idx}] ID: {iv.interview_id} | {iv.round_name} | {iv_date} at {iv.interview_time}"
                )
                print(
                    f"      Mode: {iv.interview_mode} | Status: {iv.interview_status.value} | Outcome: {iv.outcome.value}"
                )
                if iv.meeting_link:
                    print(f"      Meeting Link: {iv.meeting_link}")
                if iv.prep_notes:
                    print(f"      Notes: {iv.prep_notes}")
                print()

    @classmethod
    def render_interviews_table(
        cls,
        interviews: List[Tuple[JobApplication, Interview]],
        date_format: str = "%Y-%m-%d",
    ) -> None:
        """Render tabular view of interview rounds across applications."""
        if not interviews:
            print("\n  (No interview records to display)")
            return

        print()
        header = f"{'#':<3} {'Interview ID':<14} {'Company':<15} {'Round':<16} {'Date & Time':<18} {'Mode':<14} {'Status':<11} {'Outcome':<9}"
        print(header)
        print("-" * len(header))

        for idx, (app, iv) in enumerate(interviews, start=1):
            date_time = f"{format_date(iv.interview_date, date_format)} {iv.interview_time}"
            comp = app.company_name[:13] + ".." if len(app.company_name) > 15 else app.company_name
            round_name = iv.round_name[:14] + ".." if len(iv.round_name) > 16 else iv.round_name
            mode = iv.interview_mode[:12] + ".." if len(iv.interview_mode) > 14 else iv.interview_mode
            status = iv.interview_status.value[:11]
            outcome = iv.outcome.value[:9]

            print(
                f"{idx:<3} {iv.interview_id:<14} {comp:<15} {round_name:<16} {date_time:<18} {mode:<14} {status:<11} {outcome:<9}"
            )
        print("-" * len(header))
        print(f"Total: {len(interviews)} interview(s)")

    @classmethod
    def render_reminders_view(
        cls, summary: Dict[str, Any], date_format: str = "%Y-%m-%d"
    ) -> None:
        """Display grouped reminders for today's interviews, upcoming schedules, and deadlines."""
        cls.header("Job Search Reminders & Deadlines")
        print(f" Reference Date: {summary['reference_date']} | Look-ahead Window: {summary['window_days']} days")
        print(f" Total Active Alerts: {summary['total_reminders']}\n")

        # 1. Interviews Today
        today_ivs = summary["interviews_today"]
        print(f"=== [!] INTERVIEWS SCHEDULED TODAY ({len(today_ivs)}) ===")
        if not today_ivs:
            print("  No interviews scheduled for today.")
        else:
            for app, iv in today_ivs:
                print(
                    f"  * {iv.interview_time} - {app.company_name} ({app.job_role}) | {iv.round_name} [{iv.interview_mode}]"
                )
                if iv.meeting_link:
                    print(f"    Meeting Link: {iv.meeting_link}")
        print()

        # 2. Upcoming Interviews (Next N days)
        up_ivs = summary["upcoming_interviews"]
        print(f"=== UPCOMING INTERVIEWS (Next {summary['window_days']} Days: {len(up_ivs)}) ===")
        if not up_ivs:
            print("  No upcoming interviews in this window.")
        else:
            for app, iv in up_ivs:
                iv_d = format_date(iv.interview_date, date_format)
                print(
                    f"  * {iv_d} at {iv.interview_time} - {app.company_name} ({app.job_role}) | {iv.round_name} [{iv.interview_mode}]"
                )
        print()

        # 3. Upcoming Application Deadlines
        up_deadlines = summary["upcoming_deadlines"]
        print(f"=== UPCOMING DEADLINES (Active Applications: {len(up_deadlines)}) ===")
        if not up_deadlines:
            print("  No upcoming deadlines approaching.")
        else:
            for app in up_deadlines:
                dl_d = format_date(app.application_deadline, date_format)
                print(f"  * Due {dl_d} - {app.company_name} ({app.job_role}) [{app.status.value}]")
        print()

        # 4. Overdue Deadlines
        overdue = summary["overdue_deadlines"]
        print(f"=== OVERDUE DEADLINES (Active Applications: {len(overdue)}) ===")
        if not overdue:
            print("  No overdue active applications.")
        else:
            for app in overdue:
                dl_d = format_date(app.application_deadline, date_format)
                print(f"  * EXPIRED {dl_d} - {app.company_name} ({app.job_role}) [{app.status.value}]")
        print("=" * cls.WIDTH)

    @classmethod
    def render_analytics(cls, summary: AnalyticsSummary) -> None:
        """Display formatted job search analytics with progress indicators."""
        cls.header("Job Search Analytics & Progress Report")

        # Overview Metrics Box
        print("  KEY PERFORMANCE METRICS")
        print("  " + "-" * 40)
        print(f"  Total Applications Submitted : {summary.total_applications}")
        print(f"  Offers Received              : {summary.offers_received}")
        print(f"  Applications Rejected        : {summary.rejected_applications}")
        print(f"  Applications Withdrawn       : {summary.withdrawn_applications}")
        print()
        print(f"  Total Interviews Logged      : {summary.total_interviews}")
        print(f"  Completed Interviews         : {summary.completed_interviews}")
        print(f"  Scheduled Interviews         : {summary.scheduled_interviews}")
        print(f"  Cancelled Interviews         : {summary.cancelled_interviews}")
        print()
        print("  CONVERSION RATES")
        print("  " + "-" * 40)
        print(f"  Interview Conversion Rate    : {summary.interview_conversion_rate:.1f}%")
        print("    (Applications advancing to interview stage / Total applications)")
        print(f"  Overall Offer Rate           : {summary.offer_conversion_rate:.1f}%")
        print("    (Offers received / Total applications)")
        print(f"  Interview-to-Offer Rate      : {summary.interview_to_offer_rate:.1f}%")
        print("    (Offers received / Applications reaching interview)")
        print()

        # Status Distribution Bar Graph
        cls.subheader("Application Status Distribution")
        total = summary.total_applications
        for status in ApplicationStatus.list_values():
            count = summary.status_counts.get(status, 0)
            pct = (count / total * 100) if total > 0 else 0
            bar_len = int(pct / 4)  # 25 chars max
            bar = "#" * bar_len + "-" * (25 - bar_len)
            print(f"  {status:<16} : [{bar}] {count:>3} ({pct:>5.1f}%)")

        # Top Companies Breakdown
        cls.subheader("Top Target Companies")
        if not summary.company_counts:
            print("  (No applications yet)")
        else:
            sorted_companies = sorted(
                summary.company_counts.items(), key=lambda x: x[1], reverse=True
            )[:5]
            for comp, count in sorted_companies:
                print(f"  * {comp:<25} : {count} application(s)")

        # Top Roles Breakdown
        cls.subheader("Target Job Roles")
        if not summary.role_counts:
            print("  (No applications yet)")
        else:
            sorted_roles = sorted(
                summary.role_counts.items(), key=lambda x: x[1], reverse=True
            )[:5]
            for role, count in sorted_roles:
                print(f"  * {role:<25} : {count} application(s)")

        print("=" * cls.WIDTH)

    # ------------------ Interactive Prompts ------------------

    @classmethod
    def prompt_string(
        cls,
        prompt_text: str,
        required: bool = True,
        default: Optional[str] = None,
        validator: Optional[Callable[[str], Any]] = None,
    ) -> str:
        """Prompt user for string with validation, default values, and retry loop."""
        while True:
            hint = f" [{default}]" if default else ""
            raw = input(f"{prompt_text}{hint}: ").strip()

            if not raw:
                if default is not None:
                    return default
                if not required:
                    return ""
                print("  [!] This field is required. Please provide a value.")
                continue

            if validator:
                try:
                    validator(raw)
                    return raw
                except Exception as e:
                    print(f"  [!] {e}")
                    continue

            return raw

    @classmethod
    def prompt_number(
        cls,
        prompt_text: str,
        num_type: type = float,
        required: bool = False,
        default: Optional[Any] = None,
        min_val: Optional[float] = None,
    ) -> Optional[float]:
        """Prompt user for a valid number."""
        while True:
            hint = f" [{default}]" if default is not None else ""
            raw = input(f"{prompt_text}{hint}: ").strip()

            if not raw:
                if default is not None:
                    return default
                if not required:
                    return None
                print("  [!] This field is required.")
                continue

            try:
                val = num_type(raw)
                if min_val is not None and val < min_val:
                    print(f"  [!] Value cannot be less than {min_val}.")
                    continue
                return val
            except ValueError:
                print(f"  [!] Please enter a valid number (e.g., 50000).")

    @classmethod
    def prompt_choice(
        cls,
        prompt_text: str,
        choices: List[str],
        default_index: int = 0,
    ) -> str:
        """Prompt user to select an option from a numbered list."""
        print(f"\n{prompt_text}:")
        for i, choice in enumerate(choices, start=1):
            marker = " (default)" if (i - 1) == default_index else ""
            print(f"  [{i}] {choice}{marker}")

        while True:
            raw = input(f"Select option [1-{len(choices)}] (default {default_index + 1}): ").strip()
            if not raw:
                return choices[default_index]
            try:
                idx = int(raw) - 1
                if 0 <= idx < len(choices):
                    return choices[idx]
                print(f"  [!] Please enter a number between 1 and {len(choices)}.")
            except ValueError:
                print("  [!] Please enter a valid number.")

    @classmethod
    def prompt_confirm(cls, prompt_text: str, default: bool = False) -> bool:
        """Prompt user for yes/no confirmation."""
        default_str = "Y/n" if default else "y/N"
        while True:
            raw = input(f"{prompt_text} ({default_str}): ").strip().lower()
            if not raw:
                return default
            if raw in ("y", "yes"):
                return True
            if raw in ("n", "no"):
                return False
            print("  [!] Please enter 'y' for Yes or 'n' for No.")
