"""Date and time utilities for JobTrack.

Provides centralized date operations, timezone-naive ISO 8601 conversions,
and dependency-injected reference date calculations to support deterministic testing.
"""

from datetime import date, datetime, timedelta
from typing import Optional


def get_current_date() -> date:
    """Return the current local calendar date.

    Returns:
        Current date object.
    """
    return datetime.now().date()


def get_current_datetime_iso() -> str:
    """Return current timestamp as ISO 8601 string (YYYY-MM-DDTHH:MM:SS).

    Returns:
        Formatted timestamp string.
    """
    return datetime.now().replace(microsecond=0).isoformat()


def parse_date(date_str: str) -> date:
    """Parse an ISO 8601 date string (YYYY-MM-DD) into a date object.

    Args:
        date_str: The ISO date string.

    Returns:
        datetime.date instance.

    Raises:
        ValueError: If format is invalid.
    """
    return datetime.strptime(date_str.strip(), "%Y-%m-%d").date()


def format_date(date_str: Optional[str], format_pattern: str = "%Y-%m-%d") -> str:
    """Format an ISO date string according to a target pattern.

    Args:
        date_str: ISO date string (YYYY-MM-DD) or None.
        format_pattern: strftime pattern (e.g., '%Y-%m-%d', '%d-%m-%Y').

    Returns:
        Formatted string or 'N/A' if None/empty.
    """
    if not date_str or not str(date_str).strip():
        return "N/A"
    try:
        d = parse_date(date_str)
        return d.strftime(format_pattern)
    except (ValueError, TypeError):
        return str(date_str)


def is_today(date_str: str, reference_date: Optional[date] = None) -> bool:
    """Check if the given ISO date string is today.

    Args:
        date_str: ISO date string (YYYY-MM-DD).
        reference_date: Optional baseline date (defaults to current date).

    Returns:
        True if date matches reference date.
    """
    try:
        d = parse_date(date_str)
        ref = reference_date or get_current_date()
        return d == ref
    except (ValueError, TypeError):
        return False


def is_within_days(
    date_str: str,
    days: int = 7,
    reference_date: Optional[date] = None,
    include_today: bool = True,
) -> bool:
    """Check if the given ISO date string falls between reference date and reference_date + days.

    Args:
        date_str: ISO date string (YYYY-MM-DD).
        days: Window in days into the future.
        reference_date: Optional baseline date (defaults to current date).
        include_today: Whether reference_date itself is considered within window.

    Returns:
        True if reference_date (or ref+1) <= target_date <= reference_date + days.
    """
    try:
        target = parse_date(date_str)
        ref = reference_date or get_current_date()
        window_end = ref + timedelta(days=days)

        start = ref if include_today else (ref + timedelta(days=1))
        return start <= target <= window_end
    except (ValueError, TypeError):
        return False


def is_past_due(date_str: str, reference_date: Optional[date] = None) -> bool:
    """Check if the given ISO date string is strictly before the reference date.

    Args:
        date_str: ISO date string (YYYY-MM-DD).
        reference_date: Optional baseline date (defaults to current date).

    Returns:
        True if target date is in the past.
    """
    try:
        target = parse_date(date_str)
        ref = reference_date or get_current_date()
        return target < ref
    except (ValueError, TypeError):
        return False


def days_between(date_str1: str, date_str2: str) -> int:
    """Calculate the number of calendar days between date_str1 and date_str2.

    Args:
        date_str1: Start ISO date string.
        date_str2: End ISO date string.

    Returns:
        Signed integer (positive if date_str2 is after date_str1).
    """
    d1 = parse_date(date_str1)
    d2 = parse_date(date_str2)
    return (d2 - d1).days
