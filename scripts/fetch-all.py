#!/usr/bin/env python3
"""Run all fetch scripts in parallel."""

import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

SCRIPTS = [
    'scripts/fetch-index-returns.py',
    'scripts/fetch-position-info.py',
    'scripts/fetch-position-holdings.py',
    'scripts/fetch-budget-data.py',
]

BASE = Path(__file__).parent.parent


def run(script):
    result = subprocess.run([sys.executable, BASE / script])
    return script, result.returncode


with ThreadPoolExecutor(max_workers=len(SCRIPTS)) as executor:
    futures = {executor.submit(run, s): s for s in SCRIPTS}
    failed = [futures[f] for f in as_completed(futures) if f.result()[1] != 0]

if failed:
    print('fetch failed:', failed, file=sys.stderr)
    sys.exit(1)
