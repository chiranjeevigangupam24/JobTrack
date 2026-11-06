"""Vercel Catch-All Serverless Entrypoint for JobTrack Pro.

Handles all routes under /api/* dynamically with FastAPI.
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from server import app
