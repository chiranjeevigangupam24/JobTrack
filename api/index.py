"""Vercel Serverless Entrypoint for JobTrack Pro.

This file enables seamless zero-config deployment on Vercel by exposing
the FastAPI ASGI application instance as a serverless handler.
"""

import sys
from pathlib import Path

# Ensure project root is in Python sys.path so 'src' and 'server' import cleanly
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from server import app
