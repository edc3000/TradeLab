from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

from app.db import upsert_candles


class DownloadError(Exception):
    pass


# Requested granularity range: 5m -> 1M
TIMEFRAME_SECONDS: dict[str, int] = {
    "5m": 300,
    "15m": 900,
    "30m": 1800,
    "1h": 3600,
    "2h": 7200,
    "4h": 14400,
    "6h": 21600,
    "8h": 28800,
    "12h": 43200,
    "1d": 86400,
    "3d": 259200,
    "1w": 604800,
    "1M": 2592000,
}

BINANCE_MARKET_TYPES = {"auto", "spot", "usdt_perp", "coin_perp"}
OKX_MARKET_TYPES = {"auto", "spot", "swap", "futures"}

OKX_BAR_MAP: dict[str, str] = {
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "1H",
    "2h": "2H",
    "4h": "4H",
    "6h": "6H",
    "8h": "8H",
    "12h": "12H",
    "1d": "1D",
    "3d": "3D",
    "1w": "1W",
    "1M": "1M",
}

KNOWN_QUOTES = ["USDT", "USDC", "BUSD", "FDUSD", "USD", "BTC", "ETH", "EUR"]


def _http_get_json(url: str, params: dict[str, str | int]) -> dict | list:
    query = urllib.parse.urlencode(params)
    full_url = f"{url}?{query}"
    req = urllib.request.Request(
        full_url,
        headers={
            "User-Agent": "TradeLab/0.3",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise DownloadError(f"HTTP {exc.code} from {url}: {detail[:250]}") from exc
    except urllib.error.URLError as exc:
        raise DownloadError(f"Network error while calling {url}: {exc}") from exc

    try:
        return json.loads(payload)
    except json.JSONDecodeError as exc:
        raise DownloadError(f"Invalid JSON from {url}: {payload[:250]}") from exc


def _require_timeframe(timeframe: str) -> int:
    if timeframe not in TIMEFRAME_SECONDS:
        raise DownloadError(
            f"Unsupported timeframe '{timeframe}'. Supported: {', '.join(TIMEFRAME_SECONDS.keys())}"
        )
    return TIMEFRAME_SECONDS[timeframe]


def _strip_exchange_prefix(raw_pair: str, exchange: str) -> str:
    text = raw_pair.strip().upper()
    marker = f"{exchange.upper()}:"
    if text.startswith(marker):
        return text[len(marker) :]
    return text


def _split_compact_symbol(symbol: str) -> tuple[str, str]:
    text = symbol.replace("/", "").replace("-", "").replace("_", "").upper()
    for quote in KNOWN_QUOTES:
        if text.endswith(quote) and len(text) > len(quote):
            return text[: -len(quote)], quote
    raise DownloadError(
        f"Unable to parse symbol '{symbol}'. Prefer canonical form BASE/QUOTE or BASE/QUOTE:SETTLE."
    )


def _split_pair_settle(text: str) -> tuple[str, str, str | None] | None:
    if "/" not in text:
        return None
    pair_part, settle = (text.rsplit(":", 1) + [None])[:2] if ":" in text else (text, None)
    base, quote = pair_part.split("/", 1)
    base = base.strip().upper()
    quote = quote.strip().upper()
    settle = settle.strip().upper() if settle else None
    if not base or not quote:
        raise DownloadError(f"Invalid pair format: {text}")
    return base, quote, settle


def _canonical_pair(exchange: str, base: str, quote: str, settle: str | None) -> str:
    body = f"{base}/{quote}"
    if settle:
        body = f"{body}:{settle}"
    return f"{exchange.upper()}:{body}"


def _default_settle(quote: str, base: str) -> str:
    if quote in {"USDT", "USDC"}:
        return quote
    return base


def _resolve_binance_contract(
    raw_pair: str,
    requested_market_type: str,
) -> tuple[str, str, str]:
    text = _strip_exchange_prefix(raw_pair, "binance")
    parsed = _split_pair_settle(text)

    if parsed:
        base, quote, settle = parsed
    else:
        legacy = text.replace("-", "").upper()
        if legacy.endswith("_PERP"):
            core = legacy[: -len("_PERP")]
            if not core.endswith("USD") or len(core) <= 3:
                raise DownloadError("Invalid COIN perpetual symbol. Example: BTCUSD_PERP")
            base = core[:-3]
            quote = "USD"
            settle = base
        else:
            base, quote = _split_compact_symbol(legacy)
            if requested_market_type == "usdt_perp":
                settle = quote
            elif requested_market_type == "coin_perp":
                if quote != "USD":
                    raise DownloadError("coin_perp requires USD quote, e.g. BTC/USD:BTC or BTCUSD_PERP")
                settle = base
            else:
                settle = None

    if settle is None:
        resolved_market = "spot"
        api_symbol = f"{base}{quote}"
    else:
        if quote in {"USDT", "USDC"} and settle == quote:
            resolved_market = "usdt_perp"
            api_symbol = f"{base}{quote}"
        elif quote == "USD" and settle == base:
            resolved_market = "coin_perp"
            api_symbol = f"{base}{quote}_PERP"
        else:
            raise DownloadError(
                "Unsupported Binance contract notation. Use BASE/USDT:USDT (linear perp) or BASE/USD:BASE (inverse perp)."
            )

    if requested_market_type != "auto" and requested_market_type != resolved_market:
        raise DownloadError(
            f"pair notation resolves to '{resolved_market}', but market_type is '{requested_market_type}'."
        )

    return resolved_market, api_symbol, _canonical_pair("BINANCE", base, quote, settle)


def _resolve_okx_contract(
    raw_pair: str,
    requested_market_type: str,
) -> tuple[str, str, str]:
    text = _strip_exchange_prefix(raw_pair, "okx")

    if requested_market_type == "futures":
        inst_id = text
        parts = inst_id.split("-")
        if len(parts) < 3:
            raise DownloadError("OKX futures requires full instId, e.g. BTC-USDT-240628")
        base, quote = parts[0], parts[1]
        canonical = f"OKX:FUTURES:{inst_id}"
        return "futures", inst_id, canonical

    parsed = _split_pair_settle(text)
    if parsed:
        base, quote, settle = parsed
    else:
        upper = text.upper()
        if upper.endswith("-SWAP"):
            parts = upper.split("-")
            if len(parts) < 3:
                raise DownloadError(f"Invalid OKX swap instId: {text}")
            base, quote = parts[0], parts[1]
            settle = _default_settle(quote, base)
        elif "-" in upper:
            base, quote = upper.split("-", 1)
            settle = _default_settle(quote, base) if requested_market_type == "swap" else None
        else:
            base, quote = _split_compact_symbol(upper)
            settle = _default_settle(quote, base) if requested_market_type == "swap" else None

    if settle is None:
        resolved_market = "spot"
        inst_id = f"{base}-{quote}"
        canonical = _canonical_pair("OKX", base, quote, None)
    else:
        resolved_market = "swap"
        inst_id = f"{base}-{quote}-SWAP"
        canonical = _canonical_pair("OKX", base, quote, settle)

    if requested_market_type not in {"auto", resolved_market}:
        raise DownloadError(
            f"pair notation resolves to '{resolved_market}', but market_type is '{requested_market_type}'."
        )

    return resolved_market, inst_id, canonical


def _download_binance(
    raw_pair: str,
    timeframe: str,
    start_ts: int,
    end_ts: int,
    requested_market_type: str,
) -> tuple[str, str, list[tuple]]:
    if requested_market_type not in BINANCE_MARKET_TYPES:
        raise DownloadError("Binance market_type must be auto/spot/usdt_perp/coin_perp.")

    market_type, api_symbol, canonical_pair = _resolve_binance_contract(raw_pair, requested_market_type)
    interval_s = _require_timeframe(timeframe)
    interval_ms = interval_s * 1000

    if market_type == "spot":
        base = os.getenv("BINANCE_API_BASE", "https://api.binance.com").rstrip("/")
        api_url = f"{base}/api/v3/klines"
    elif market_type == "usdt_perp":
        base = os.getenv("BINANCE_FAPI_BASE", "https://fapi.binance.com").rstrip("/")
        api_url = f"{base}/fapi/v1/klines"
    else:
        base = os.getenv("BINANCE_DAPI_BASE", "https://dapi.binance.com").rstrip("/")
        api_url = f"{base}/dapi/v1/klines"

    start_ms = start_ts * 1000
    end_ms = end_ts * 1000

    rows: list[tuple] = []
    while start_ms <= end_ms:
        payload = _http_get_json(
            api_url,
            {
                "symbol": api_symbol,
                "interval": timeframe,
                "startTime": start_ms,
                "endTime": end_ms,
                "limit": 1000,
            },
        )

        if not isinstance(payload, list):
            raise DownloadError(f"Unexpected Binance response for {api_symbol}: {payload}")
        if not payload:
            break

        for item in payload:
            open_time_ms = int(item[0])
            if open_time_ms < start_ts * 1000 or open_time_ms > end_ts * 1000:
                continue
            rows.append(
                (
                    canonical_pair,
                    timeframe,
                    open_time_ms // 1000,
                    float(item[1]),
                    float(item[2]),
                    float(item[3]),
                    float(item[4]),
                    float(item[5]),
                )
            )

        next_start = int(payload[-1][0]) + interval_ms
        if next_start <= start_ms:
            break
        start_ms = next_start
        time.sleep(0.05)

    rows.sort(key=lambda x: x[2])
    return market_type, canonical_pair, rows


def _download_okx(
    raw_pair: str,
    timeframe: str,
    start_ts: int,
    end_ts: int,
    requested_market_type: str,
) -> tuple[str, str, list[tuple]]:
    if requested_market_type not in OKX_MARKET_TYPES:
        raise DownloadError("OKX market_type must be auto/spot/swap/futures.")

    market_type, inst_id, canonical_pair = _resolve_okx_contract(raw_pair, requested_market_type)
    _require_timeframe(timeframe)
    bar = OKX_BAR_MAP.get(timeframe)
    if not bar:
        raise DownloadError(f"Timeframe '{timeframe}' is not supported by OKX market candles.")

    if market_type in {"spot", "swap"}:
        okx_path = "/api/v5/market/history-candles"
    else:
        okx_path = "/api/v5/market/history-candles"

    okx_base = os.getenv("OKX_API_BASE", "https://www.okx.com").rstrip("/")
    api_url = f"{okx_base}{okx_path}"
    start_ms = start_ts * 1000
    end_ms = end_ts * 1000

    cursor = end_ms + 1
    rows_map: dict[int, tuple] = {}

    while True:
        payload = _http_get_json(
            api_url,
            {
                "instId": inst_id,
                "bar": bar,
                "after": cursor,
                "limit": 100,
            },
        )
        if not isinstance(payload, dict) or "data" not in payload:
            raise DownloadError(f"Unexpected OKX response for {inst_id}: {payload}")
        if payload.get("code") != "0":
            raise DownloadError(f"OKX error for {inst_id}: {payload}")

        data = payload.get("data") or []
        if not data:
            break

        oldest = None
        for item in data:
            ts_ms = int(item[0])
            oldest = ts_ms if oldest is None else min(oldest, ts_ms)

            if ts_ms < start_ms or ts_ms > end_ms:
                continue

            rows_map[ts_ms] = (
                canonical_pair,
                timeframe,
                ts_ms // 1000,
                float(item[1]),
                float(item[2]),
                float(item[3]),
                float(item[4]),
                float(item[5]),
            )

        if oldest is None or oldest <= start_ms:
            break
        if oldest >= cursor:
            break

        cursor = oldest
        time.sleep(0.08)

    rows = list(rows_map.values())
    rows.sort(key=lambda x: x[2])
    return market_type, canonical_pair, rows


def download_history(
    exchange: str,
    pair: str,
    timeframe: str,
    start_ts: int,
    end_ts: int,
    market_type: str | None = None,
) -> dict[str, str | int]:
    exchange_norm = exchange.lower().strip()
    market_type_norm = (market_type or "auto").lower().strip()
    if end_ts <= start_ts:
        raise DownloadError("end_ts must be greater than start_ts")

    if exchange_norm == "binance":
        resolved_market_type, stored_pair, rows = _download_binance(
            raw_pair=pair,
            timeframe=timeframe,
            start_ts=start_ts,
            end_ts=end_ts,
            requested_market_type=market_type_norm,
        )
    elif exchange_norm == "okx":
        resolved_market_type, stored_pair, rows = _download_okx(
            raw_pair=pair,
            timeframe=timeframe,
            start_ts=start_ts,
            end_ts=end_ts,
            requested_market_type=market_type_norm,
        )
    else:
        raise DownloadError("exchange must be 'binance' or 'okx'")

    if not rows:
        raise DownloadError(
            f"No candles downloaded for {exchange_norm}:{pair}. Check pair/timeframe/date range and market availability."
        )

    changed = upsert_candles(rows)

    return {
        "exchange": exchange_norm,
        "market_type": resolved_market_type,
        "stored_pair": stored_pair,
        "timeframe": timeframe,
        "start_ts": int(rows[0][2]),
        "end_ts": int(rows[-1][2]),
        "rows_downloaded": len(rows),
        "rows_changed": int(changed),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
