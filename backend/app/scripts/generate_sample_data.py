from __future__ import annotations

import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.append(str(Path(__file__).resolve().parents[2]))

from app.db import init_db
from app.services.bootstrap import ensure_sample_data


if __name__ == "__main__":
    init_db()
    ensure_sample_data(min_rows=1)
    print("Sample data ready in data/tradelab.db")
