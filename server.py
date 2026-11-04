#!/usr/bin/env python3
"""JobTrack workspace root FastAPI launcher.

Permits executing 'python server.py' directly from the Codegnan-projects directory.
Delegates cleanly to JobTrack/server.py.
"""

import sys
from pathlib import Path

# Add JobTrack to sys.path so server and src can be imported directly
JOBTRACK_DIR = Path(__file__).resolve().parent / "JobTrack"
if str(JOBTRACK_DIR) not in sys.path:
    sys.path.insert(0, str(JOBTRACK_DIR))

# Expose FastAPI app at top level so 'uvicorn server:app' and 'from server import app' both work
from JobTrack.server import app

if __name__ == "__main__":
    import uvicorn

    print("=" * 70)
    print("  JobTrack Pro — Web Dashboard & FastAPI Backend Starting")
    print("  Open in your browser: http://localhost:8000")
    print("  API Documentation   : http://localhost:8000/docs")
    print("=" * 70)
    uvicorn.run("JobTrack.server:app", host="0.0.0.0", port=8000, reload=True)

