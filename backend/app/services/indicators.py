from __future__ import annotations

import math
from collections.abc import Sequence


def _line_payload(times: Sequence[int], values: Sequence[float | None], key: str = "value") -> list[dict]:
    points: list[dict] = []
    for t, value in zip(times, values):
        if value is None or math.isnan(value):
            # Keep whitespace points so indicator pane keeps the same timeline as candles.
            points.append({"time": int(t)})
            continue
        points.append({"time": int(t), key: float(value)})
    return points


def _hist_payload(times: Sequence[int], values: Sequence[float | None]) -> list[dict]:
    points: list[dict] = []
    for t, v in zip(times, values):
        if v is None or math.isnan(v):
            points.append({"time": int(t)})
            continue
        points.append(
            {
                "time": int(t),
                "value": float(v),
                "color": "#26a69a" if float(v) >= 0 else "#ef5350",
            }
        )
    return points


def sma(values: Sequence[float], period: int) -> list[float | None]:
    out: list[float | None] = [None] * len(values)
    if period <= 0 or len(values) < period:
        return out
    rolling = 0.0
    for i, v in enumerate(values):
        rolling += v
        if i >= period:
            rolling -= values[i - period]
        if i >= period - 1:
            out[i] = rolling / period
    return out


def ema(values: Sequence[float], period: int) -> list[float | None]:
    out: list[float | None] = [None] * len(values)
    if period <= 0 or len(values) < period:
        return out
    multiplier = 2.0 / (period + 1.0)
    seed = sum(values[:period]) / period
    out[period - 1] = seed
    prev = seed
    for i in range(period, len(values)):
        prev = (values[i] - prev) * multiplier + prev
        out[i] = prev
    return out


def rsi(values: Sequence[float], period: int) -> list[float | None]:
    out: list[float | None] = [None] * len(values)
    if period <= 0 or len(values) <= period:
        return out
    gains = []
    losses = []
    for i in range(1, period + 1):
        change = values[i] - values[i - 1]
        gains.append(max(change, 0.0))
        losses.append(abs(min(change, 0.0)))
    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period
    out[period] = 100.0 if avg_loss == 0 else 100 - (100 / (1 + (avg_gain / avg_loss)))

    for i in range(period + 1, len(values)):
        change = values[i] - values[i - 1]
        gain = max(change, 0.0)
        loss = abs(min(change, 0.0))
        avg_gain = ((avg_gain * (period - 1)) + gain) / period
        avg_loss = ((avg_loss * (period - 1)) + loss) / period
        out[i] = 100.0 if avg_loss == 0 else 100 - (100 / (1 + (avg_gain / avg_loss)))
    return out


def stddev(values: Sequence[float], period: int, ma: Sequence[float | None]) -> list[float | None]:
    out: list[float | None] = [None] * len(values)
    if period <= 0 or len(values) < period:
        return out
    for i in range(period - 1, len(values)):
        m = ma[i]
        if m is None:
            continue
        window = values[i - period + 1 : i + 1]
        variance = sum((x - m) ** 2 for x in window) / period
        out[i] = math.sqrt(variance)
    return out


def bollinger(values: Sequence[float], period: int, std_factor: float) -> dict[str, list[float | None]]:
    middle = sma(values, period)
    sigma = stddev(values, period, middle)
    upper: list[float | None] = [None] * len(values)
    lower: list[float | None] = [None] * len(values)
    for i in range(len(values)):
        if middle[i] is None or sigma[i] is None:
            continue
        upper[i] = middle[i] + (std_factor * sigma[i])
        lower[i] = middle[i] - (std_factor * sigma[i])
    return {"upper": upper, "middle": middle, "lower": lower}


def macd(values: Sequence[float], fast: int, slow: int, signal: int) -> dict[str, list[float | None]]:
    fast_ema = ema(values, fast)
    slow_ema = ema(values, slow)
    macd_line: list[float | None] = [None] * len(values)
    for i in range(len(values)):
        if fast_ema[i] is None or slow_ema[i] is None:
            continue
        macd_line[i] = fast_ema[i] - slow_ema[i]

    compact_macd = [v for v in macd_line if v is not None]
    signal_values = ema(compact_macd, signal)

    signal_line: list[float | None] = [None] * len(values)
    sig_idx = 0
    for i, v in enumerate(macd_line):
        if v is None:
            continue
        sig = signal_values[sig_idx]
        signal_line[i] = sig
        sig_idx += 1

    histogram: list[float | None] = [None] * len(values)
    for i in range(len(values)):
        if macd_line[i] is None or signal_line[i] is None:
            continue
        histogram[i] = macd_line[i] - signal_line[i]

    return {"macd": macd_line, "signal": signal_line, "histogram": histogram}


def build_indicator_payload(name: str, candles: list[dict], params: dict[str, float | int]) -> dict:
    times = [int(c["open_time"]) for c in candles]
    closes = [float(c["close"]) for c in candles]
    name = name.lower()

    if name == "sma":
        period = int(params.get("period", 20))
        values = sma(closes, period)
        return {"name": "sma", "series": [{"id": f"sma_{period}", "type": "line", "points": _line_payload(times, values)}]}

    if name == "ema":
        period = int(params.get("period", 20))
        values = ema(closes, period)
        return {"name": "ema", "series": [{"id": f"ema_{period}", "type": "line", "points": _line_payload(times, values)}]}

    if name == "rsi":
        period = int(params.get("period", 14))
        values = rsi(closes, period)
        return {"name": "rsi", "series": [{"id": f"rsi_{period}", "type": "line", "points": _line_payload(times, values)}]}

    if name == "boll":
        period = int(params.get("period", 20))
        std_factor = float(params.get("stddev", 2.0))
        bands = bollinger(closes, period, std_factor)
        return {
            "name": "boll",
            "series": [
                {"id": f"boll_upper_{period}", "type": "line", "points": _line_payload(times, bands["upper"])},
                {"id": f"boll_middle_{period}", "type": "line", "points": _line_payload(times, bands["middle"])},
                {"id": f"boll_lower_{period}", "type": "line", "points": _line_payload(times, bands["lower"])},
            ],
        }

    if name == "macd":
        fast = int(params.get("fast", 12))
        slow = int(params.get("slow", 26))
        signal = int(params.get("signal", 9))
        lines = macd(closes, fast, slow, signal)
        return {
            "name": "macd",
            "series": [
                {"id": f"macd_{fast}_{slow}", "type": "line", "points": _line_payload(times, lines["macd"])},
                {"id": f"signal_{signal}", "type": "line", "points": _line_payload(times, lines["signal"])},
                {
                    "id": "macd_hist",
                    "type": "histogram",
                    "points": _hist_payload(times, lines["histogram"]),
                },
            ],
        }

    raise ValueError(f"Unsupported indicator: {name}")
