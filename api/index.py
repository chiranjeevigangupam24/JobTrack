"""Vercel Serverless Entrypoint for JobTrack Pro.

This file enables seamless zero-config deployment on Vercel by exposing
the FastAPI ASGI application instance as a serverless handler with
automatic ASGI path normalization for Vercel's rewrite mechanism.
"""

import sys
from pathlib import Path
from urllib.parse import parse_qs, urlencode

# Ensure project root is in Python sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from server import app as fastapi_app

async def app(scope, receive, send):
    if scope["type"] == "http":
        qs = scope.get("query_string", b"").decode("utf-8")
        params = parse_qs(qs, keep_blank_values=True)
        
        # Check if Vercel rewrite passed the matched subpath
        if "path" in params and params["path"]:
            subpath = params["path"][0].lstrip("/")
            scope["path"] = f"/api/{subpath}"
            
            # Remove 'path' from query string so endpoints only see their real query params
            del params["path"]
            # Reconstruct clean query string
            flat_params = []
            for k, vals in params.items():
                for v in vals:
                    flat_params.append((k, v))
            scope["query_string"] = urlencode(flat_params).encode("utf-8")
        else:
            # Fallback to headers if present
            headers = dict(scope.get("headers", []))
            matched = (
                headers.get(b"x-matched-path", b"").decode("utf-8")
                or headers.get(b"x-forwarded-uri", b"").decode("utf-8")
                or headers.get(b"x-invoke-path", b"").decode("utf-8")
            )
            if matched and matched != scope.get("path"):
                scope["path"] = matched

    await fastapi_app(scope, receive, send)

handler = app
