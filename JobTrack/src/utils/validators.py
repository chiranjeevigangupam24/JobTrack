"""Validation utilities for user input and data persistence in JobTrack.

Provides explicit, safe validation functions for required text, dates,
times, salaries, URLs, statuses, and safe CSV field escaping.
"""

import re
from datetime import datetime
from typing import Any, Optional, Tuple


class ValidationError(Exception):
    """Raised when user input or loaded data violates validation constraints."""
    pass


def validate_required(value: Any, field_name: str) -> str:
    """Validate that a field is non-empty after stripping whitespace.

    Args:
        value: The string or value to test.
        field_name: The human-readable name of the field for error reporting.

    Returns:
        The cleaned, stripped string.

    Raises:
        ValidationError: If value is None or empty whitespace.
    """
    if value is None:
        raise ValidationError(f"'{field_name}' is required and cannot be empty.")
    val_str = str(value).strip()
    if not val_str:
        raise ValidationError(f"'{field_name}' is required and cannot be empty.")
    return val_str


def validate_date(date_str: Optional[str], field_name: str, allow_empty: bool = False) -> Optional[str]:
    """Validate and normalize an ISO 8601 date string (YYYY-MM-DD).

    Args:
        date_str: Date string to validate.
        field_name: Human-readable name of the field.
        allow_empty: Whether an empty string or None is permissible.

    Returns:
        Normalized 'YYYY-MM-DD' string, or None if empty and allow_empty is True.

    Raises:
        ValidationError: If date does not match 'YYYY-MM-DD' or represents an invalid calendar date.
    """
    if date_str is None or str(date_str).strip() == "":
        if allow_empty:
            return None
        raise ValidationError(f"'{field_name}' is required and must be in YYYY-MM-DD format.")

    cleaned = str(date_str).strip()
    try:
        parsed = datetime.strptime(cleaned, "%Y-%m-%d")
        return parsed.strftime("%Y-%m-%d")
    except ValueError:
        raise ValidationError(
            f"'{field_name}' must be a valid calendar date in YYYY-MM-DD format (received: '{cleaned}')."
        )


def validate_time(time_str: Optional[str], field_name: str, allow_empty: bool = False) -> Optional[str]:
    """Validate and normalize a 24-hour time string (HH:MM).

    Args:
        time_str: Time string to validate.
        field_name: Human-readable name of the field.
        allow_empty: Whether an empty string or None is permissible.

    Returns:
        Normalized 'HH:MM' string, or None if empty and allow_empty is True.

    Raises:
        ValidationError: If time does not match 'HH:MM' or represents an invalid time.
    """
    if time_str is None or str(time_str).strip() == "":
        if allow_empty:
            return None
        raise ValidationError(f"'{field_name}' is required and must be in HH:MM (24-hour) format.")

    cleaned = str(time_str).strip()
    try:
        parsed = datetime.strptime(cleaned, "%H:%M")
        return parsed.strftime("%H:%M")
    except ValueError:
        raise ValidationError(
            f"'{field_name}' must be a valid 24-hour time in HH:MM format (e.g., 09:30 or 14:00; received: '{cleaned}')."
        )


def validate_salary(
    min_sal: Optional[Any], max_sal: Optional[Any]
) -> Tuple[Optional[float], Optional[float]]:
    """Validate minimum and maximum salary values.

    Args:
        min_sal: Raw min salary (number, string, or None).
        max_sal: Raw max salary (number, string, or None).

    Returns:
        Tuple of (clean_min, clean_max) as floats or None.

    Raises:
        ValidationError: If values are negative or min_sal exceeds max_sal.
    """
    def _parse_num(val: Any, name: str) -> Optional[float]:
        if val is None or str(val).strip() == "":
            return None
        try:
            num = float(str(val).strip())
            if num < 0:
                raise ValidationError(f"'{name}' cannot be negative.")
            return round(num, 2)
        except ValueError:
            raise ValidationError(f"'{name}' must be a valid positive number.")

    c_min = _parse_num(min_sal, "Minimum salary")
    c_max = _parse_num(max_sal, "Maximum salary")

    if c_min is not None and c_max is not None:
        if c_min > c_max:
            raise ValidationError(
                f"Minimum salary ({c_min:,.2f}) cannot be greater than maximum salary ({c_max:,.2f})."
            )

    return c_min, c_max


def validate_url(url_str: Optional[str], allow_empty: bool = True) -> Optional[str]:
    """Validate that a URL starts with http:// or https:// and has a valid domain format.

    Args:
        url_str: The URL string.
        allow_empty: Whether empty string or None is allowed.

    Returns:
        Cleaned URL string or None.

    Raises:
        ValidationError: If URL format is invalid.
    """
    if url_str is None or str(url_str).strip() == "":
        if allow_empty:
            return None
        raise ValidationError("URL cannot be empty.")

    cleaned = str(url_str).strip()
    url_pattern = re.compile(
        r"^https?://"  # http:// or https://
        r"(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|"  # domain
        r"localhost|"  # localhost
        r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})"  # ...or ip
        r"(?::\d+)?"  # optional port
        r"(?:/?|[/?]\S+)$",
        re.IGNORECASE,
    )

    if not url_pattern.match(cleaned):
        raise ValidationError(
            f"Invalid URL: '{cleaned}'. URLs must begin with http:// or https:// and contain a valid domain."
        )

    return cleaned


def validate_date_range(start_date: str, end_date: str) -> Tuple[str, str]:
    """Validate that start_date and end_date are valid ISO dates and start_date <= end_date.

    Args:
        start_date: Start date string (YYYY-MM-DD).
        end_date: End date string (YYYY-MM-DD).

    Returns:
        Tuple of (clean_start, clean_end).

    Raises:
        ValidationError: If either date is invalid or start_date > end_date.
    """
    clean_start = validate_date(start_date, "Start date")
    clean_end = validate_date(end_date, "End date")
    assert clean_start is not None and clean_end is not None

    d_start = datetime.strptime(clean_start, "%Y-%m-%d").date()
    d_end = datetime.strptime(clean_end, "%Y-%m-%d").date()

    if d_start > d_end:
        raise ValidationError(
            f"Start date ({clean_start}) cannot be later than end date ({clean_end})."
        )

    return clean_start, clean_end


def validate_status(status_str: Any) -> str:
    """Validate status against ApplicationStatus enum values.

    Args:
        status_str: Status string.

    Returns:
        The matched canonical status string.

    Raises:
        ValidationError: If status is not recognized.
    """
    from src.models.application import ApplicationStatus

    return ApplicationStatus.from_string(str(status_str)).value


def sanitize_for_csv(value: Any) -> str:
    """Sanitize field value for CSV export to prevent spreadsheet formula injection.

    Prefixes characters that trigger formula execution in spreadsheet software
    (=, +, -, @, tab, carriage return) with a single quote ('), without
    mutating original stored application records.

    Args:
        value: The raw field value.

    Returns:
        Safe string representation for CSV writing.
    """
    if value is None:
        return ""
    val_str = str(value)
    if not val_str:
        return ""

    # Disarm formula triggers if the first character is dangerous
    dangerous_prefixes = ("=", "+", "-", "@", "\t", "\r")
    if val_str.startswith(dangerous_prefixes):
        return "'" + val_str

    return val_str
