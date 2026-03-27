from __future__ import annotations

import math
import random
from datetime import datetime, timedelta, timezone

from app.db import upsert_candles
from app.services.repository import candles_count


def _unix(ts: datetime) -> int:
    return int(ts.replace(tzinfo=timezone.utc).timestamp())


def _gen_pair_rows(pair: str, timeframe: str, start: datetime, bars: int, step_hours: int, base_price: float) -> list[tuple]:
    rng = random.Random(hash((pair, timeframe, bars)) & 0xFFFFFFFF)
    rows: list[tuple] = []
    price = base_price
    for i in range(bars):
        ts = start + timedelta(hours=i * step_hours)

        trend = math.sin(i / 40.0) * 0.006
        noise = rng.uniform(-0.007, 0.007)
        drift = 0.00025
        change = trend + noise + drift

        open_price = price
        close_price = max(1.0, open_price * (1 + change))
        high = max(open_price, close_price) * (1 + rng.uniform(0.0, 0.0045))
        low = min(open_price, close_price) * (1 - rng.uniform(0.0, 0.0045))
        volume = rng.uniform(80.0, 250.0)

        rows.append(
            (
                pair,
                timeframe,
                _unix(ts),
                round(open_price, 4),
                round(high, 4),
                round(low, 4),
                round(close_price, 4),
                round(volume, 4),
            )
        )

        price = close_price
    return rows


def ensure_sample_data(min_rows: int = 3000) -> None:
    if candles_count() >= min_rows:
        return

    start = datetime(2023, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    rows: list[tuple] = []
    rows.extend(_gen_pair_rows("SAMPLE:BTC/USDT", "1h", start, bars=5200, step_hours=1, base_price=24000.0))
    rows.extend(_gen_pair_rows("SAMPLE:ETH/USDT", "1h", start, bars=5200, step_hours=1, base_price=1600.0))
    rows.extend(_gen_pair_rows("SAMPLE:SOL/USDT", "1h", start, bars=5200, step_hours=1, base_price=25.0))
    rows.extend(_gen_pair_rows("SAMPLE:BTC/USDT", "4h", start, bars=2000, step_hours=4, base_price=24000.0))
    upsert_candles(rows)
