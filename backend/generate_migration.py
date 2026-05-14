"""
Run this script once to generate the initial Alembic migration.
Usage (from select/backend):
    python generate_migration.py
"""
import subprocess
import sys
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
result = subprocess.run(
    [sys.executable, "-m", "alembic", "revision", "--autogenerate", "-m", "initial_schema"],
    capture_output=True, text=True
)
print(result.stdout)
if result.returncode != 0:
    print(result.stderr)
