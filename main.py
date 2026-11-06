#!/usr/bin/env python3
"""JobTrack Pro — Root Terminal CLI Launcher.

Allows executing the terminal menu CLI directly from the root workspace directory:
    python main.py

Delegates cleanly to the core CLI engine with zero external dependencies.
"""

import runpy
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
CANDIDATE_PATHS = [
    ROOT_DIR / "JobTrack" / "JobTrack" / "main.py",
    ROOT_DIR / "JobTrack" / "main.py",
]

target_script = None
for p in CANDIDATE_PATHS:
    if p.exists() and p != Path(__file__).resolve():
        target_script = p
        break

if target_script:
    # Ensure target directory is in sys.path
    if str(target_script.parent) not in sys.path:
        sys.path.insert(0, str(target_script.parent))
    runpy.run_path(str(target_script), run_name="__main__")
else:
    print("Error: Could not locate JobTrack core CLI engine main.py.")
    sys.exit(1)

