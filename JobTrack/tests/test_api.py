"""API Integration Tests for JobTrack FastAPI Server.

Tests RESTful API endpoints for health, dashboard, applications CRUD,
interviews management, and CSV exports using FastAPI TestClient.
"""

import sys
import unittest
from pathlib import Path

# Add JobTrack to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi.testclient import TestClient
from server import app


class TestFastAPIEndpoints(unittest.TestCase):
    """Test suite verifying all REST API endpoints."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_check(self):
        """Ensure /api/health returns online status and correct metadata."""
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "online")
        self.assertIn("JobTrack Pro API", data["service"])

    def test_metadata_endpoint(self):
        """Ensure /api/meta provides valid dropdown choices."""
        response = self.client.get("/api/meta")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("Applied", data["application_statuses"])
        self.assertIn("Full-time", data["job_types"])
        self.assertIn("Technical", data["interview_rounds"])

    def test_dashboard_endpoint(self):
        """Ensure /api/dashboard returns KPIs, distribution, and alerts."""
        response = self.client.get("/api/dashboard")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("kpis", data)
        self.assertIn("total_applications", data["kpis"])
        self.assertIn("status_distribution", data)
        self.assertIn("alerts", data)

    def test_application_lifecycle_crud(self):
        """Test full create, read, update, delete flow for an application."""
        # 1. Create Application
        payload = {
            "company_name": "API Test Labs",
            "job_role": "Python Backend Engineer",
            "location": "Bengaluru",
            "job_type": "Full-time",
            "min_salary": 90000.0,
            "max_salary": 120000.0,
            "status": "Applied",
            "notes": "Automated test application",
        }
        res_create = self.client.post("/api/applications", json=payload)
        self.assertEqual(res_create.status_code, 201)
        created_app = res_create.json()["data"]
        app_id = created_app["application_id"]
        self.assertEqual(created_app["company_name"], "API Test Labs")

        # 2. Get Single Application
        res_get = self.client.get(f"/api/applications/{app_id}")
        self.assertEqual(res_get.status_code, 200)
        self.assertEqual(res_get.json()["application_id"], app_id)

        # 3. Update Application
        res_update = self.client.put(
            f"/api/applications/{app_id}",
            json={"status": "Interview", "location": "Remote"},
        )
        self.assertEqual(res_update.status_code, 200)
        self.assertEqual(res_update.json()["data"]["status"], "Interview")
        self.assertEqual(res_update.json()["data"]["location"], "Remote")

        # 4. Schedule Interview for this Application
        iv_payload = {
            "application_id": app_id,
            "round_name": "Technical",
            "interview_date": "2026-11-20",
            "interview_time": "15:00",
            "interview_mode": "Online / Video",
            "meeting_link": "https://meet.google.com/test-room",
        }
        res_iv = self.client.post("/api/interviews", json=iv_payload)
        self.assertEqual(res_iv.status_code, 201)
        iv_id = res_iv.json()["data"]["interview_id"]

        # 5. Record Interview Outcome
        res_outcome = self.client.post(
            f"/api/interviews/{app_id}/{iv_id}/outcome",
            json={"outcome": "Passed", "notes": "Great performance!"},
        )
        self.assertEqual(res_outcome.status_code, 200)
        self.assertEqual(res_outcome.json()["data"]["outcome"], "Passed")

        # 6. Delete Application (should cascade delete interviews)
        res_del = self.client.delete(f"/api/applications/{app_id}")
        self.assertEqual(res_del.status_code, 200)

        # Verify deletion
        res_after = self.client.get(f"/api/applications/{app_id}")
        self.assertEqual(res_after.status_code, 404)

    def test_csv_export_endpoint(self):
        """Ensure /api/export/applications delivers a valid CSV attachment."""
        res = self.client.get("/api/export/applications")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.headers["content-type"].startswith("text/csv"))
        self.assertIn("Application ID", res.text)

        # Clean up test-generated CSV export to keep repository pristine
        exports_dir = Path(__file__).resolve().parent.parent / "exports"
        if exports_dir.exists():
            for csv_file in exports_dir.glob("applications_export_*.csv"):
                try:
                    csv_file.unlink()
                except OSError:
                    pass


if __name__ == "__main__":
    unittest.main()

