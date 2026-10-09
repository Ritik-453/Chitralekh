import sys
from pathlib import Path

# Ensure the backend project root is first on sys.path so imports use a
# single package path (prevents duplicate imports that can redefine SQLAlchemy
# Table objects during pytest collection).
ROOT = str(Path(__file__).resolve().parent)
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
