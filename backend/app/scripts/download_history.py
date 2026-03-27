from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.append(str(Path(__file__).resolve().parents[2]))

from app.db import init_db
from app.services.exchange_downloader import DownloadError, download_history


def _parse_time_arg(text: str) -> int:
    stripped = text.strip()
    if stripped.isdigit():
        return int(stripped)

    candidate = stripped.replace("Z", "+00:00")
    dt = datetime.fromisoformat(candidate)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp())


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download historical candles from Binance/OKX into TradeLab SQLite")
    parser.add_argument("--exchange", required=True, choices=["binance", "okx"], help="Exchange name")
    parser.add_argument("--pair", required=True, help="Pair, e.g. BTC/USDT or BTC/USDT:USDT")
    parser.add_argument(
        "--market-type",
        default="auto",
        help="auto or explicit. Binance: spot/usdt_perp/coin_perp; OKX: spot/swap/futures",
    )
    parser.add_argument("--timeframe", required=True, help="e.g. 5m, 15m, 1h, 4h, 1d, 1M")
    parser.add_argument("--start", required=True, help="Unix seconds or ISO time, e.g. 1704067200 / 2024-01-01T00:00:00Z")
    parser.add_argument("--end", required=True, help="Unix seconds or ISO time")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    start_ts = _parse_time_arg(args.start)
    end_ts = _parse_time_arg(args.end)

    init_db()
    try:
        result = download_history(
            exchange=args.exchange,
            pair=args.pair,
            market_type=args.market_type,
            timeframe=args.timeframe,
            start_ts=start_ts,
            end_ts=end_ts,
        )
    except DownloadError as exc:
        raise SystemExit(f"Download failed: {exc}") from exc

    print("Download completed:")
    for key, value in result.items():
        print(f"- {key}: {value}")


if __name__ == "__main__":
    main()
