from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.append(str(Path(__file__).resolve().parents[2]))

from app.db import init_db, upsert_candles


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import historical candles from CSV")
    parser.add_argument("--csv", required=True, help="CSV file path")
    parser.add_argument("--pair", required=True, help="e.g. BTCUSDT")
    parser.add_argument("--timeframe", required=True, help="e.g. 1h")
    parser.add_argument(
        "--time-column",
        default="open_time",
        help="Unix timestamp seconds column name, default=open_time",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    csv_path = Path(args.csv)
    if not csv_path.exists():
        raise FileNotFoundError(csv_path)

    init_db()

    rows: list[tuple] = []
    with csv_path.open("r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        required = {args.time_column, "open", "high", "low", "close", "volume"}
        missing = required - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"CSV missing columns: {sorted(missing)}")

        for row in reader:
            rows.append(
                (
                    args.pair,
                    args.timeframe,
                    int(float(row[args.time_column])),
                    float(row["open"]),
                    float(row["high"]),
                    float(row["low"]),
                    float(row["close"]),
                    float(row["volume"]),
                )
            )

    changed = upsert_candles(rows)
    print(f"Imported {len(rows)} rows, changed={changed}")


if __name__ == "__main__":
    main()
