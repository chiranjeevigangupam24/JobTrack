"""Vercel Serverless Entrypoint for JobTrack Pro.

This file enables seamless zero-config deployment on Vercel by exposing
the FastAPI ASGI application instance as a serverless handler with
automatic ASGI path normalization for Vercel's rewrite mechanism.
"""

import sys
from pathlib import Path

# Ensure project root is in Python sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from server import app as fastapi_app

async def app(scope, receive, send):
    if scope["type"] == "http":
        headers = dict(scope.get("headers", []))
        matched = (
            headers.get(b"x-matched-path", b"").decode("utf-8")
            or headers.get(b"x-forwarded-uri", b"").decode("utf-8")
            or headers.get(b"x-invoke-path", b"").decode("utf-8")
        )
        if matched:
            scope["path"] = matched

    await fastapi_app(scope, receive, send)

# Also expose handler for standard WSGI/ASGI serverless runners
handler = app
