"""Unit tests for JSONStorage resilience and persistence."""

import json
import tempfile
import unittest
from pathlib import Path

from src.models.application import ApplicationStatus, JobApplication
from src.storage.json_storage import DEFAULT_SETTINGS, JSONStorage, StorageError


class TestJSONStorage(unittest.TestCase):
    """Test suite for atomic file writes, error recovery, and data preservation."""

    def setUp(self):
        """Initialize clean temporary storage directory."""
        self.temp_dir = tempfile.TemporaryDirectory()
        self.storage_dir = Path(self.temp_dir.name)
        self.storage = JSONStorage(data_dir=self.storage_dir)

    def tearDown(self):
        """Cleanup temporary directory."""
        self.temp_dir.cleanup()

    def test_save_and_load_applications(self):
        """Test round-trip persistence of job applications."""
        app1 = JobApplication(company_name="Google", job_role="SWE", status="Applied")
        app2 = JobApplication(company_name="Meta", job_role="MLE", status="Interview")

        self.storage.save_applications([app1, app2])
        loaded = self.storage.load_applications()

        self.assertEqual(len(loaded), 2)
        self.assertEqual(loaded[0].company_name, "Google")
        self.assertEqual(loaded[1].company_name, "Meta")

    def test_missing_file_handling(self):
        """Ensure missing files return empty lists or default settings without crashing."""
        non_existent_dir = self.storage_dir / "subdir_not_created"
        storage = JSONStorage(data_dir=non_existent_dir)

        self.assertEqual(storage.load_applications(), [])
        settings = storage.load_settings()
        self.assertEqual(settings["reminder_window_days"], 7)

    def test_malformed_json_raises_storage_error(self):
        """Ensure corrupted JSON raises StorageError and does not silently wipe data."""
        bad_file = self.storage_dir / "applications.json"
        with open(bad_file, "w", encoding="utf-8") as f:
            f.write("CORRUPTED_JSON_DATA{{{ [[[")

        with self.assertRaises(StorageError):
            self.storage.load_applications()

        # Verify corrupted file content is preserved and not overwritten
        with open(bad_file, "r", encoding="utf-8") as f:
            self.assertEqual(f.read(), "CORRUPTED_JSON_DATA{{{ [[[")

    def test_corrupted_records_skipped_while_preserving_valid(self):
        """Ensure invalid items inside an array are skipped while valid records load."""
        file_path = self.storage_dir / "applications.json"
        raw_data = [
            {"company_name": "Tesla", "job_role": "Autopilot Eng"},  # valid
            "NOT_A_DICT",  # invalid
            {"company_name": "", "job_role": "SWE"},  # invalid: missing required company
            {"company_name": "SpaceX", "job_role": "Guidance Eng"},  # valid
        ]
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(raw_data, f)

        loaded = self.storage.load_applications()
        self.assertEqual(len(loaded), 2)
        self.assertEqual(loaded[0].company_name, "Tesla")
        self.assertEqual(loaded[1].company_name, "SpaceX")

    def test_settings_validation_and_recovery(self):
        """Ensure invalid settings are gracefully repaired using sensible defaults."""
        file_path = self.storage_dir / "settings.json"
        corrupt_settings = {
            "reminder_window_days": -10,  # invalid
            "default_application_status": "InvalidStatusChoice",  # invalid
            "date_display_format": "%Y-%m-%d",  # valid
        }
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(corrupt_settings, f)

        loaded = self.storage.load_settings()
        # Fallbacks applied for invalid values
        self.assertEqual(loaded["reminder_window_days"], DEFAULT_SETTINGS["reminder_window_days"])
        self.assertEqual(
            loaded["default_application_status"], DEFAULT_SETTINGS["default_application_status"]
        )
        self.assertEqual(loaded["date_display_format"], "%Y-%m-%d")


if __name__ == "__main__":
    unittest.main()
