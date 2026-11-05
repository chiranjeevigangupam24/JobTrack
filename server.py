#!/usr/bin/env python3
"""JobTrack Pro — Web Dashboard & FastAPI Backend Launcher.

Permits executing 'python server.py' directly from the JobTrack directory.
Delegates to the root launcher logic with automatic standard library fallback.
"""

import sys
from pathlib import Path

# Add root and inner JobTrack to sys.path
CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent
PROJECT_DIR = CURRENT_DIR / "JobTrack"

for p in [ROOT_DIR, PROJECT_DIR, CURRENT_DIR]:
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

# Delegate directly to root server launcher
if (ROOT_DIR / "server.py").exists():
    import runpy
    if __name__ == "__main__":
        runpy.run_path(str(ROOT_DIR / "server.py"), run_name="__main__")
    else:
        from server import app
