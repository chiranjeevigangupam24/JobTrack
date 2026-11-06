"""JSON persistence layer for JobTrack.

Handles resilient atomic file operations, error recovery, data validation,
and settings management.
"""

import json
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from src.models.application import ApplicationStatus, JobApplication


class StorageError(Exception):
    """Raised when loading or saving data fails unexpectedly."""
    pass


DEFAULT_SETTINGS: Dict[str, Any] = {
    "applicant_name": "Naga Chiranjeevi",
    "theme_mode": "dark",
    "reminder_window_days": 7,
    "default_application_status": ApplicationStatus.APPLIED.value,
    "date_display_format": "%Y-%m-%d",
}


class JSONStorage:
    """Manages persistent JSON storage for job applications and user settings."""

    def __init__(
        self,
        data_dir: Optional[Union[str, Path]] = None,
        applications_filename: str = "applications.json",
        settings_filename: str = "settings.json",
    ):
        if data_dir is None:
            # Resolve relative to project root
            base_dir = Path(__file__).resolve().parent.parent.parent
            initial_data_dir = base_dir / "data"
        else:
            initial_data_dir = Path(data_dir)

        self.data_dir = initial_data_dir
        self.applications_path = self.data_dir / applications_filename
        self.settings_path = self.data_dir / settings_filename

        # Serverless / Read-Only Environment Fallback (e.g., Vercel, AWS Lambda)
        # If the target directory cannot be written to, transparently migrate data to /tmp.
        is_serverless = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
        if is_serverless or not self._is_writable(self.data_dir):
            temp_data_dir = Path(tempfile.gettempdir()) / "jobtrack_data"
            try:
                temp_data_dir.mkdir(parents=True, exist_ok=True)
                # Seed from bundled JSON files if temp files do not exist yet
                for fname in (applications_filename, settings_filename):
                    bundled_file = initial_data_dir / fname
                    temp_file = temp_data_dir / fname
                    if bundled_file.exists() and not temp_file.exists():
                        try:
                            shutil.copy2(bundled_file, temp_file)
                        except Exception:
                            pass
                self.data_dir = temp_data_dir
                self.applications_path = self.data_dir / applications_filename
                self.settings_path = self.data_dir / settings_filename
            except Exception:
                pass

        self._ensure_directory(self.data_dir)

    @staticmethod
    def _is_writable(path: Path) -> bool:
        """Verify whether the directory supports file writes."""
        try:
            path.mkdir(parents=True, exist_ok=True)
            test_file = path / f".write_test_{os.getpid()}.tmp"
            test_file.write_text("ok", encoding="utf-8")
            if test_file.exists():
                test_file.unlink()
            return True
        except Exception:
            return False

    def _ensure_directory(self, path: Path) -> None:
        """Create directory if it does not exist."""
        try:
            path.mkdir(parents=True, exist_ok=True)
        except OSError as e:
            raise StorageError(f"Failed to create data directory at '{path}': {e}") from e

    def _atomic_write(self, target_path: Path, data: Any) -> None:
        """Write JSON data to a temporary file and atomically replace target file.

        Prevents file corruption if application crashes or power is lost mid-write.
        """
        self._ensure_directory(target_path.parent)

        # Create temporary file in the same directory to allow atomic rename
        temp_file = target_path.with_name(f"{target_path.name}.{os.getpid()}.tmp")
        try:
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
                f.flush()
                os.fsync(f.fileno())

            # Atomic replace
            os.replace(temp_file, target_path)
        except Exception as e:
            if temp_file.exists():
                try:
                    temp_file.unlink()
                except OSError:
                    pass
            raise StorageError(f"Failed to write data safely to '{target_path}': {e}") from e

    def load_applications(self) -> List[JobApplication]:
        """Load job applications from JSON file.

        Returns:
            List of JobApplication instances.

        Raises:
            StorageError: If JSON syntax is corrupted, avoiding overwriting with empty data.
        """
        if not self.applications_path.exists():
            return []

        try:
            with open(self.applications_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return []
                raw_data = json.loads(content)
        except json.JSONDecodeError as e:
            raise StorageError(
                f"Corrupted JSON in '{self.applications_path}': {e}. "
                "Data has NOT been overwritten. Please inspect or restore your backup."
            ) from e
        except OSError as e:
            raise StorageError(f"Could not read applications file '{self.applications_path}': {e}") from e

        if not isinstance(raw_data, list):
            raise StorageError(
                f"Invalid format in '{self.applications_path}': expected a JSON array, got {type(raw_data).__name__}."
            )

        applications: List[JobApplication] = []
        for index, item in enumerate(raw_data):
            if not isinstance(item, dict):
                # Skip invalid entries while preserving valid ones
                continue
            try:
                app = JobApplication.from_dict(item)
                applications.append(app)
            except Exception:
                # Corrupted record skipped, but remainder preserved
                continue

        return applications

    def save_applications(self, applications: List[JobApplication]) -> bool:
        """Serialize and atomically save applications to JSON.

        Args:
            applications: List of JobApplication instances.

        Returns:
            True upon successful save.

        Raises:
            StorageError: On disk/IO failure.
        """
        data = [app.to_dict() for app in applications]
        self._atomic_write(self.applications_path, data)
        return True

    def load_settings(self) -> Dict[str, Any]:
        """Load settings from JSON with fallback and auto-repair.

        Returns:
            Validated settings dictionary.
        """
        settings = DEFAULT_SETTINGS.copy()
        if not self.settings_path.exists():
            # Save default settings
            self.save_settings(settings)
            return settings

        try:
            with open(self.settings_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    loaded = json.loads(content)
                    if isinstance(loaded, dict):
                        # Merge and validate
                        self._validate_and_merge_settings(settings, loaded)
        except (json.JSONDecodeError, OSError):
            # Fall back to default settings without crashing
            return DEFAULT_SETTINGS.copy()

        return settings

    def _validate_and_merge_settings(
        self, base: Dict[str, Any], candidate: Dict[str, Any]
    ) -> None:
        """Validate candidate settings keys and update base dictionary."""
        # applicant_name
        if "applicant_name" in candidate:
            name_val = str(candidate["applicant_name"]).strip()
            if name_val:
                base["applicant_name"] = name_val

        # theme_mode
        if "theme_mode" in candidate:
            mode_val = str(candidate["theme_mode"]).strip().lower()
            if mode_val in ("light", "dark"):
                base["theme_mode"] = mode_val

        # reminder_window_days
        if "reminder_window_days" in candidate:
            try:
                days = int(candidate["reminder_window_days"])
                if 1 <= days <= 365:
                    base["reminder_window_days"] = days
            except (ValueError, TypeError):
                pass

        # default_application_status
        if "default_application_status" in candidate:
            raw_status = candidate["default_application_status"]
            try:
                status_enum = ApplicationStatus.from_string(str(raw_status))
                base["default_application_status"] = status_enum.value
            except Exception:
                pass

        # date_display_format
        if "date_display_format" in candidate:
            fmt = str(candidate["date_display_format"]).strip()
            if fmt and "%" in fmt:
                base["date_display_format"] = fmt

    def save_settings(self, settings: Dict[str, Any]) -> bool:
        """Save settings dictionary to JSON file atomically."""
        clean = DEFAULT_SETTINGS.copy()
        self._validate_and_merge_settings(clean, settings)
        self._atomic_write(self.settings_path, clean)
        return True
