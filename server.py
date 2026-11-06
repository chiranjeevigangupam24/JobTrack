#!/usr/bin/env python3
"""JobTrack Pro — Web Dashboard & REST Launcher for JobTrack folder.
Delegates to the root server.py launcher.
"""
import runpy
from pathlib import Path

ROOT_SERVER = Path(__file__).resolve().parent.parent / "server.py"
if ROOT_SERVER.exists():
    runpy.run_path(str(ROOT_SERVER), run_name="__main__")
