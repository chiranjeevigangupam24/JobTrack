#!/usr/bin/env python3
"""JobTrack workspace root launcher.

Permits executing 'python main.py' directly from the Codegnan-projects directory.
Delegates cleanly to JobTrack/main.py.
"""

import runpy
from pathlib import Path

if __name__ == "__main__":
    jobtrack_main = Path(__file__).resolve().parent / "JobTrack" / "main.py"
    runpy.run_path(str(jobtrack_main), run_name="__main__")
