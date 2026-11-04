"""JobTrack Pro — FastAPI Backend Server & RESTful API.

This module exposes clean, human-readable REST API endpoints connecting the
Tailwind CSS + React frontend dashboard to the core JobTrack domain services.

Architecture Overview:
- FastAPI & Uvicorn: Asynchronous ASGI web framework and server.
- Pydantic v2: Strong typing, automatic schema generation, and request validation.
- JSONStorage: Resilient atomic file persistence (applications.json & settings.json).
- Domain Services:
    * ApplicationService: Application CRUD, case-insensitive search, and filtering.
    * InterviewService: Interview round lifecycle, meeting links, and outcome recording.
    * ReminderService: Proactive tracking of today's interviews and approaching deadlines.
    * AnalyticsService: Conversion funnel rates and pipeline distributions.
    * CSVExporter: Spreadsheet-safe exports with formula injection defense.
"""

import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure JobTrack root and 'src' package are importable regardless of launch folder
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

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
from src.storage.json_storage import JSONStorage
from src.utils.date_utils import get_current_date
from src.utils.validators import ValidationError

# ------------------------------------------------------------------------------
# 1. Service Initialization (Singletons for clean dependency injection)
# ------------------------------------------------------------------------------
storage = JSONStorage(data_dir=PROJECT_ROOT / "data")
app_service = ApplicationService(storage=storage)
interview_service = InterviewService(app_service=app_service)
reminder_service = ReminderService(app_service=app_service)
analytics_service = AnalyticsService(app_service=app_service)
csv_exporter = CSVExporter(export_dir=PROJECT_ROOT / "exports")

# ------------------------------------------------------------------------------
# 2. FastAPI Application Setup
# ------------------------------------------------------------------------------
app = FastAPI(
    title="JobTrack Pro API",
    description="RESTful API for JobTrack — Personal Job Application & Interview Pipeline Manager",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable Cross-Origin Resource Sharing (CORS) so the frontend connects smoothly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# 3. Pydantic Schemas (Input Data Transfer Objects with Human-Friendly Docs)
# ==============================================================================

class ApplicationCreateRequest(BaseModel):
    """Schema for creating a new job application."""
    company_name: str = Field(..., description="Target company name (e.g. Google, Microsoft)")
    job_role: str = Field(..., description="Job role or title (e.g. Full Stack Developer)")
    location: Optional[str] = Field("Remote", description="Job location (City, State, or Remote)")
    job_type: Optional[str] = Field("Full-time", description="Employment type (Full-time, Part-time, Internship, etc.)")
    job_description: Optional[str] = Field("", description="Optional job snippet, requirements, or tech stack")
    application_date: Optional[str] = Field(None, description="ISO date (YYYY-MM-DD); defaults to today if omitted")
    application_deadline: Optional[str] = Field(None, description="Optional deadline ISO date (YYYY-MM-DD)")
    job_url: Optional[str] = Field(None, description="Optional URL to job posting (must start with http:// or https://)")
    min_salary: Optional[float] = Field(None, description="Minimum expected salary (annual/base)")
    max_salary: Optional[float] = Field(None, description="Maximum expected salary (annual/base)")
    status: Optional[str] = Field("Applied", description="Initial application status (defaults to 'Applied')")
    notes: Optional[str] = Field("", description="Personal notes, referrals, recruiter contact info")
    applicant_name: Optional[str] = Field("Naga Chiranjeevi", description="Name of the applicant / candidate")


class ApplicationUpdateRequest(BaseModel):
    """Schema for updating an existing job application. All fields are optional."""
    company_name: Optional[str] = None
    job_role: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    job_description: Optional[str] = None
    application_date: Optional[str] = None
    application_deadline: Optional[str] = None
    job_url: Optional[str] = None
    min_salary: Optional[float] = None
    max_salary: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    applicant_name: Optional[str] = None


class InterviewCreateRequest(BaseModel):
    """Schema for scheduling a new interview round."""
    application_id: str = Field(..., description="Unique ID of the parent application (e.g. APP-12345678)")
    round_name: str = Field(..., description="Round title (e.g. Technical, HR, Coding Assessment, System Design)")
    interview_date: str = Field(..., description="Scheduled date in YYYY-MM-DD format")
    interview_time: str = Field(..., description="Scheduled 24-hour time in HH:MM format (e.g. 14:30)")
    interview_mode: Optional[str] = Field("Online / Video", description="Online / Video, In-person, or Phone")
    meeting_link: Optional[str] = Field(None, description="Video link URL (Google Meet, Zoom, MS Teams)")
    prep_notes: Optional[str] = Field("", description="Topics to prepare, recruiter feedback, questions to ask")


class InterviewUpdateRequest(BaseModel):
    """Schema for editing an existing interview round."""
    round_name: Optional[str] = None
    interview_date: Optional[str] = None
    interview_time: Optional[str] = None
    interview_mode: Optional[str] = None
    meeting_link: Optional[str] = None
    interview_status: Optional[str] = None
    prep_notes: Optional[str] = None
    outcome: Optional[str] = None


class InterviewOutcomeRequest(BaseModel):
    """Schema for recording the outcome of a completed interview."""
    outcome: str = Field(..., description="Passed, Failed, or Pending")
    notes: Optional[str] = Field("", description="Reflections, feedback received, or areas to improve")


class InterviewCancelRequest(BaseModel):
    """Schema for cancelling an interview round."""
    reason: Optional[str] = Field("", description="Reason for cancellation (e.g. Rescheduled by recruiter)")


class SettingsUpdateRequest(BaseModel):
    """Schema for updating application preferences."""
    applicant_name: Optional[str] = Field(None, description="Candidate / applicant full name")
    theme_mode: Optional[str] = Field(None, description="Theme appearance mode ('light' or 'dark')")
    reminder_window_days: Optional[int] = Field(None, ge=1, le=90, description="Reminder lookahead window in days (1-90)")
    default_application_status: Optional[str] = Field(None, description="Default status for newly created applications")
    date_display_format: Optional[str] = Field(None, description="Date presentation pattern (e.g. %Y-%m-%d)")


# ==============================================================================
# 4. System & Metadata Endpoints
# ==============================================================================

@app.get("/api/health", tags=["System"])
def health_check():
    """Health check endpoint confirming that the backend server is active and accessible."""
    return {
        "status": "online",
        "service": "JobTrack Pro API",
        "version": "2.0.0",
        "storage_dir": str(storage.data_dir),
    }


@app.get("/api/meta", tags=["System"])
def get_metadata():
    """Returns standard dropdown choices (statuses, job types, interview rounds) for frontend forms."""
    return {
        "application_statuses": ApplicationStatus.list_values(),
        "job_types": JobType.list_values(),
        "interview_rounds": InterviewRound.list_values(),
        "interview_modes": InterviewMode.list_values(),
        "interview_statuses": InterviewStatus.list_values(),
        "interview_outcomes": InterviewOutcome.list_values(),
    }


# ==============================================================================
# 5. Dashboard Overview Endpoint
# ==============================================================================

@app.get("/api/dashboard", tags=["Dashboard"])
def get_dashboard():
    """Unified dashboard endpoint providing KPIs, stage distributions, urgent alerts, and recent applications."""
    app_service.reload()
    summary = analytics_service.calculate_summary()
    reminders = reminder_service.get_all_reminders_summary()
    apps = app_service.get_all_applications(sort_by_date_desc=True)
    settings = storage.load_settings()

    # Format today's interviews into clean objects for frontend display
    today_interviews = [
        {
            "application_id": app.application_id,
            "company_name": app.company_name,
            "job_role": app.job_role,
            "round_name": iv.round_name,
            "interview_time": iv.interview_time,
            "meeting_link": iv.meeting_link,
            "interview_mode": iv.interview_mode,
        }
        for app, iv in reminders["interviews_today"]
    ]

    # Format upcoming interviews within the reminder window
    upcoming_interviews = [
        {
            "application_id": app.application_id,
            "company_name": app.company_name,
            "job_role": app.job_role,
            "round_name": iv.round_name,
            "interview_date": iv.interview_date,
            "interview_time": iv.interview_time,
            "meeting_link": iv.meeting_link,
        }
        for app, iv in reminders["upcoming_interviews"]
    ]

    # Format overdue deadlines for active applications
    overdue_deadlines = [
        {
            "application_id": app.application_id,
            "company_name": app.company_name,
            "job_role": app.job_role,
            "deadline": app.application_deadline,
            "status": app.status.value,
        }
        for app in reminders["overdue_deadlines"]
    ]

    # Format upcoming deadlines
    upcoming_deadlines = [
        {
            "application_id": app.application_id,
            "company_name": app.company_name,
            "job_role": app.job_role,
            "deadline": app.application_deadline,
            "status": app.status.value,
        }
        for app in reminders["upcoming_deadlines"]
    ]

    return {
        "applicant_name": settings.get("applicant_name", "Naga Chiranjeevi"),
        "theme_mode": settings.get("theme_mode", "dark"),
        "kpis": {
            "total_applications": summary.total_applications,
            "offers_received": summary.offers_received,
            "rejected_applications": summary.rejected_applications,
            "withdrawn_applications": summary.withdrawn_applications,
            "total_interviews": summary.total_interviews,
            "scheduled_interviews": summary.scheduled_interviews,
            "completed_interviews": summary.completed_interviews,
            "interview_conversion_rate": summary.interview_conversion_rate,
            "offer_conversion_rate": summary.offer_conversion_rate,
            "interview_to_offer_rate": summary.interview_to_offer_rate,
        },
        "status_distribution": summary.status_counts,
        "company_distribution": summary.company_counts,
        "role_distribution": summary.role_counts,
        "job_type_distribution": summary.job_type_counts,
        "alerts": {
            "total_alerts": reminders["total_reminders"],
            "interviews_today": today_interviews,
            "upcoming_interviews": upcoming_interviews,
            "overdue_deadlines": overdue_deadlines,
            "upcoming_deadlines": upcoming_deadlines,
        },
        "recent_applications": [a.to_dict() for a in apps[:6]],
    }


# ==============================================================================
# 6. Job Applications CRUD & Search Endpoints
# ==============================================================================

@app.get("/api/applications", tags=["Applications"])
def list_applications(
    search: Optional[str] = Query(None, description="Search keyword across company, role, location, ID"),
    status: Optional[str] = Query(None, description="Filter by status (e.g. Applied, Interview, Offer Received)"),
    job_type: Optional[str] = Query(None, description="Filter by job type (e.g. Full-time, Internship)"),
    start_date: Optional[str] = Query(None, description="Filter by start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter by end date (YYYY-MM-DD)"),
):
    """Retrieve job applications with real-time substring search and multi-criteria filtering."""
    app_service.reload()

    # 1. If text search is specified
    if search and search.strip():
        apps = app_service.search_applications(search.strip())
        # Refine search results if extra filters are present
        if status and status.strip() and status.strip().lower() != "all":
            apps = [a for a in apps if a.status.value.lower() == status.strip().lower()]
        if job_type and job_type.strip() and job_type.strip().lower() != "all":
            apps = [a for a in apps if a.job_type.lower() == job_type.strip().lower()]
        return [a.to_dict() for a in apps]

    # 2. If status, job type, or date range filters are specified
    clean_status = status.strip() if status and status.strip().lower() != "all" else None
    clean_type = job_type.strip() if job_type and job_type.strip().lower() != "all" else None

    if clean_status or clean_type or (start_date and end_date):
        apps = app_service.filter_applications(
            status=clean_status,
            job_type=clean_type,
            start_date=start_date,
            end_date=end_date,
        )
        return [a.to_dict() for a in apps]

    # 3. Default: return all applications sorted by application date descending
    apps = app_service.get_all_applications(sort_by_date_desc=True)
    return [a.to_dict() for a in apps]


@app.post("/api/applications", status_code=status.HTTP_201_CREATED, tags=["Applications"])
def create_application(req: ApplicationCreateRequest):
    """Create, validate, persist, and return a new job application."""
    try:
        app = app_service.add_application(
            company_name=req.company_name,
            job_role=req.job_role,
            location=req.location or "Remote",
            job_type=req.job_type or "Full-time",
            job_description=req.job_description or "",
            application_date=req.application_date,
            application_deadline=req.application_deadline,
            job_url=req.job_url,
            min_salary=req.min_salary,
            max_salary=req.max_salary,
            status=req.status or "Applied",
            notes=req.notes or "",
            applicant_name=req.applicant_name or "Naga Chiranjeevi",
        )
        return {"success": True, "data": app.to_dict()}
    except ValidationError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create application: {e}")


@app.get("/api/applications/{app_id}", tags=["Applications"])
def get_application_by_id(app_id: str):
    """Retrieve full details of a specific job application including interview history."""
    app_service.reload()
    app = app_service.get_application_by_id(app_id)
    if not app:
        raise HTTPException(
            status_code=404,
            detail=f"Application with ID '{app_id}' was not found. Please verify the ID."
        )
    return app.to_dict()


@app.put("/api/applications/{app_id}", tags=["Applications"])
def update_application(app_id: str, req: ApplicationUpdateRequest):
    """Update fields on an existing application while preserving all interview history."""
    try:
        # Extract fields provided by the caller
        update_data = {k: v for k, v in req.model_dump().items() if v is not None}
        updated_app = app_service.update_application(app_id, **update_data)
        return {"success": True, "data": updated_app.to_dict()}
    except RecordNotFoundError as re:
        raise HTTPException(status_code=404, detail=str(re))
    except ValidationError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update application: {e}")


@app.delete("/api/applications/{app_id}", tags=["Applications"])
def delete_application(app_id: str):
    """Permanently delete a job application and its associated interview rounds."""
    try:
        app_service.delete_application(app_id)
        return {"success": True, "message": f"Application '{app_id}' has been permanently deleted."}
    except RecordNotFoundError as re:
        raise HTTPException(status_code=404, detail=str(re))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete application: {e}")


# ==============================================================================
# 7. Interview Management Endpoints
# ==============================================================================

@app.get("/api/interviews", tags=["Interviews"])
def list_all_interviews():
    """Retrieve all scheduled, completed, and cancelled interviews across applications."""
    app_service.reload()
    results = []
    for app, iv in interview_service.get_all_interviews():
        results.append({
            "application_id": app.application_id,
            "company_name": app.company_name,
            "job_role": app.job_role,
            "application_status": app.status.value,
            **iv.to_dict(),
        })
    return results


@app.post("/api/interviews", status_code=status.HTTP_201_CREATED, tags=["Interviews"])
def schedule_interview(req: InterviewCreateRequest):
    """Schedule a new interview round for an application. Auto-updates status to 'Interview'."""
    try:
        iv = interview_service.schedule_interview(
            application_id=req.application_id,
            round_name=req.round_name,
            interview_date=req.interview_date,
            interview_time=req.interview_time,
            interview_mode=req.interview_mode or "Online / Video",
            meeting_link=req.meeting_link,
            prep_notes=req.prep_notes or "",
        )
        return {"success": True, "data": iv.to_dict()}
    except RecordNotFoundError as re:
        raise HTTPException(status_code=404, detail=str(re))
    except ValidationError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to schedule interview: {e}")


@app.put("/api/interviews/{app_id}/{interview_id}", tags=["Interviews"])
def update_interview(app_id: str, interview_id: str, req: InterviewUpdateRequest):
    """Update details of an interview round (date, time, meet link, notes)."""
    try:
        update_data = {k: v for k, v in req.model_dump().items() if v is not None}
        iv = interview_service.update_interview(app_id, interview_id, **update_data)
        return {"success": True, "data": iv.to_dict()}
    except RecordNotFoundError as re:
        raise HTTPException(status_code=404, detail=str(re))
    except ValidationError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update interview: {e}")


@app.post("/api/interviews/{app_id}/{interview_id}/outcome", tags=["Interviews"])
def record_interview_outcome(app_id: str, interview_id: str, req: InterviewOutcomeRequest):
    """Record Passed, Failed, or Pending outcome with feedback notes; marks round as Completed."""
    try:
        iv = interview_service.record_outcome(
            application_id=app_id,
            interview_id=interview_id,
            outcome=req.outcome,
            notes=req.notes or "",
        )
        return {"success": True, "data": iv.to_dict()}
    except RecordNotFoundError as re:
        raise HTTPException(status_code=404, detail=str(re))
    except ValidationError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record outcome: {e}")


@app.post("/api/interviews/{app_id}/{interview_id}/cancel", tags=["Interviews"])
def cancel_interview(app_id: str, interview_id: str, req: InterviewCancelRequest):
    """Mark an interview as Cancelled with optional reason."""
    try:
        iv = interview_service.cancel_interview(
            application_id=app_id,
            interview_id=interview_id,
            cancellation_reason=req.reason or "",
        )
        return {"success": True, "data": iv.to_dict()}
    except RecordNotFoundError as re:
        raise HTTPException(status_code=404, detail=str(re))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel interview: {e}")


# ==============================================================================
# 8. Reminders & Funnel Analytics Endpoints
# ==============================================================================

@app.get("/api/reminders", tags=["Reminders"])
def get_reminders(days: Optional[int] = Query(None, ge=1, le=90, description="Lookahead window in days (1-90)")):
    """Returns today's interviews, upcoming interviews, upcoming deadlines, and overdue deadlines."""
    app_service.reload()
    reminders = reminder_service.get_all_reminders_summary(days=days)

    return {
        "reference_date": reminders["reference_date"],
        "window_days": reminders["window_days"],
        "total_reminders": reminders["total_reminders"],
        "interviews_today": [
            {"application": app.to_dict(), "interview": iv.to_dict()}
            for app, iv in reminders["interviews_today"]
        ],
        "upcoming_interviews": [
            {"application": app.to_dict(), "interview": iv.to_dict()}
            for app, iv in reminders["upcoming_interviews"]
        ],
        "upcoming_deadlines": [app.to_dict() for app in reminders["upcoming_deadlines"]],
        "overdue_deadlines": [app.to_dict() for app in reminders["overdue_deadlines"]],
    }


@app.get("/api/analytics", tags=["Analytics"])
def get_analytics():
    """Returns funnel conversion rates, status counts, top companies, and role breakdowns."""
    app_service.reload()
    summary = analytics_service.calculate_summary()
    return summary.to_dict()


# ==============================================================================
# 9. Spreadsheet-Safe CSV Export Endpoints
# ==============================================================================

@app.get("/api/export/{export_type}", tags=["Exports"])
def export_csv(export_type: str, status_filter: Optional[str] = None):
    """Export dataset to CSV with formula injection defense disarming '=', '+', '-', '@' triggers."""
    app_service.reload()
    try:
        clean_type = export_type.strip().lower()
        if clean_type == "applications":
            apps = app_service.get_all_applications()
            if status_filter:
                csv_path = csv_exporter.export_applications_by_status(apps, status=status_filter)
            else:
                csv_path = csv_exporter.export_applications(apps)
        elif clean_type == "interviews":
            ivs = interview_service.get_all_interviews()
            csv_path = csv_exporter.export_interviews(ivs)
        elif clean_type == "analytics":
            summary = analytics_service.calculate_summary()
            csv_path = csv_exporter.export_analytics(summary)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown export type '{export_type}'. Choose 'applications', 'interviews', or 'analytics'."
            )

        return FileResponse(
            path=csv_path,
            filename=csv_path.name,
            media_type="text/csv",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate CSV export: {e}")


# ==============================================================================
# 10. System Preferences & Settings Endpoints
# ==============================================================================

@app.get("/api/settings", tags=["Settings"])
def get_settings():
    """Retrieve current user settings (reminder window, default status, date format)."""
    return storage.load_settings()


@app.post("/api/settings", tags=["Settings"])
def update_settings(req: SettingsUpdateRequest):
    """Update user preferences and persist atomically."""
    settings = storage.load_settings()
    if req.applicant_name is not None and req.applicant_name.strip():
        settings["applicant_name"] = req.applicant_name.strip()
    if req.theme_mode is not None and req.theme_mode.strip().lower() in ("light", "dark"):
        settings["theme_mode"] = req.theme_mode.strip().lower()
    if req.reminder_window_days is not None:
        settings["reminder_window_days"] = req.reminder_window_days
        reminder_service.default_window_days = req.reminder_window_days
    if req.default_application_status is not None:
        settings["default_application_status"] = req.default_application_status
    if req.date_display_format is not None:
        settings["date_display_format"] = req.date_display_format

    storage.save_settings(settings)
    return {"success": True, "settings": settings}


# ==============================================================================
# 11. Presentation Demo / Sample Data Seeder
# ==============================================================================

@app.post("/api/seed-sample-data", tags=["Demo"])
def seed_sample_data():
    """Populates realistic sample data (Google, Microsoft, Amazon, Stripe) for smooth project demos."""
    sample_records = [
        {
            "company_name": "Google",
            "job_role": "Full Stack Software Engineer",
            "location": "Bengaluru, India (Hybrid)",
            "job_type": "Full-time",
            "job_description": "Building cloud-native web applications with Python, FastAPI, and React.",
            "application_date": "2026-10-15",
            "application_deadline": "2026-11-15",
            "job_url": "https://careers.google.com/jobs/results/12345",
            "min_salary": 120000.0,
            "max_salary": 160000.0,
            "status": "Interview",
            "notes": "Referred by senior software engineer. Round 1 coding passed.",
            "interviews": [
                {
                    "round_name": "Technical Assessment",
                    "interview_date": "2026-10-22",
                    "interview_time": "15:00",
                    "interview_mode": "Online / Video",
                    "meeting_link": "https://meet.google.com/abc-defg-hij",
                    "prep_notes": "Focused on dynamic programming and graph algorithms.",
                    "interview_status": "Completed",
                    "outcome": "Passed",
                },
                {
                    "round_name": "System Design",
                    "interview_date": get_current_date().strftime("%Y-%m-%d"),
                    "interview_time": "17:30",
                    "interview_mode": "Online / Video",
                    "meeting_link": "https://meet.google.com/xyz-uvwx-rst",
                    "prep_notes": "Distributed caching, rate limiters, and microservice communication.",
                    "interview_status": "Scheduled",
                    "outcome": "Pending",
                },
            ],
        },
        {
            "company_name": "Microsoft",
            "job_role": "Backend Cloud Developer",
            "location": "Hyderabad, India",
            "job_type": "Full-time",
            "job_description": "Azure cloud services, scalable REST APIs, and event-driven architectures.",
            "application_date": "2026-10-10",
            "application_deadline": "2026-10-30",
            "job_url": "https://careers.microsoft.com/us/en/job/67890",
            "min_salary": 110000.0,
            "max_salary": 145000.0,
            "status": "Offer Received",
            "notes": "Official offer letter received! Base: $135k + stock options.",
            "interviews": [
                {
                    "round_name": "Screening / HR",
                    "interview_date": "2026-10-14",
                    "interview_time": "11:00",
                    "interview_mode": "Online / Video",
                    "meeting_link": "https://teams.microsoft.com/l/meetup-join/123",
                    "prep_notes": "HR background discussion and salary expectations.",
                    "interview_status": "Completed",
                    "outcome": "Passed",
                },
                {
                    "round_name": "Final Round",
                    "interview_date": "2026-10-25",
                    "interview_time": "14:00",
                    "interview_mode": "Online / Video",
                    "meeting_link": "https://teams.microsoft.com/l/meetup-join/456",
                    "prep_notes": "Engineering Director cultural and architectural fit.",
                    "interview_status": "Completed",
                    "outcome": "Passed",
                },
            ],
        },
        {
            "company_name": "Amazon",
            "job_role": "Frontend React Engineer",
            "location": "Remote",
            "job_type": "Full-time",
            "job_description": "Crafting responsive, accessible user interfaces with React, Tailwind CSS, and TypeScript.",
            "application_date": "2026-10-20",
            "application_deadline": "2026-11-20",
            "job_url": "https://amazon.jobs/en/jobs/998877",
            "min_salary": 95000.0,
            "max_salary": 130000.0,
            "status": "Assessment",
            "notes": "HackerRank OA link received. 90 minutes test.",
            "interviews": [],
        },
        {
            "company_name": "Stripe",
            "job_role": "API Platform Engineer",
            "location": "Remote",
            "job_type": "Full-time",
            "job_description": "Designing high-reliability payment processing pipelines and developer APIs.",
            "application_date": "2026-10-18",
            "application_deadline": "2026-11-10",
            "job_url": "https://stripe.com/jobs/api-eng",
            "min_salary": 130000.0,
            "max_salary": 175000.0,
            "status": "Applied",
            "notes": "Applied via company portal after recruiter reach-out on LinkedIn.",
            "interviews": [],
        },
        {
            "company_name": "Codegnan",
            "job_role": "Python Full-Stack Instructor & Developer",
            "location": "Hyderabad, India",
            "job_type": "Full-time",
            "job_description": "Developing modern web apps with FastAPI, React, and mentoring students.",
            "application_date": "2026-10-01",
            "application_deadline": "2026-10-20",
            "job_url": "https://codegnan.com/careers",
            "min_salary": 50000.0,
            "max_salary": 80000.0,
            "status": "Selected",
            "notes": "Offer accepted! Excited to mentor budding engineers.",
            "interviews": [
                {
                    "round_name": "Technical Assessment",
                    "interview_date": "2026-10-05",
                    "interview_time": "10:00",
                    "interview_mode": "In-person",
                    "meeting_link": None,
                    "prep_notes": "Live coding demonstration in Python & JavaScript.",
                    "interview_status": "Completed",
                    "outcome": "Passed",
                }
            ],
        },
    ]

    created = []
    for item in sample_records:
        interviews_to_add = item.pop("interviews", [])
        app = app_service.add_application(**item)
        for iv_data in interviews_to_add:
            interview_service.schedule_interview(
                application_id=app.application_id,
                round_name=iv_data["round_name"],
                interview_date=iv_data["interview_date"],
                interview_time=iv_data["interview_time"],
                interview_mode=iv_data.get("interview_mode", "Online / Video"),
                meeting_link=iv_data.get("meeting_link"),
                prep_notes=iv_data.get("prep_notes", ""),
            )
            if iv_data.get("interview_status") == "Completed":
                iv_obj = app.interviews[-1]
                interview_service.record_outcome(
                    application_id=app.application_id,
                    interview_id=iv_obj.interview_id,
                    outcome=iv_data.get("outcome", "Passed"),
                    notes="Completed during sample seed.",
                )
        created.append(app.company_name)

    return {"success": True, "message": f"Successfully seeded {len(created)} applications: {', '.join(created)}"}


# ==============================================================================
# 12. Static Assets & Single Page Application (SPA) Serving
# ==============================================================================

FRONTEND_DIR = PROJECT_ROOT / "frontend"
if FRONTEND_DIR.exists():
    # Mount the frontend directory to serve CSS, JSX, and scripts
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

    @app.get("/", include_in_schema=False)
    def serve_frontend_index():
        """Serves the interactive single-page dashboard at http://localhost:8000/"""
        return FileResponse(FRONTEND_DIR / "index.html")


# Standalone runner for `python server.py`
if __name__ == "__main__":
    import uvicorn

    print("=" * 72)
    print("  JobTrack Pro — Web Dashboard & FastAPI Backend Starting")
    print("  Dashboard UI        : http://localhost:8000")
    print("  Interactive API Docs: http://localhost:8000/docs")
    print("=" * 72)
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
