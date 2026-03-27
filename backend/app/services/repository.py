from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.db import get_connection


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def candles_count() -> int:
    with get_connection() as conn:
        row = conn.execute("SELECT COUNT(1) AS c FROM candles").fetchone()
        return int(row["c"])


def list_pairs() -> list[str]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT DISTINCT pair
            FROM candles
            WHERE pair LIKE '%/%' OR pair LIKE 'OKX:FUTURES:%'
            ORDER BY pair
            """
        ).fetchall()
        return [r["pair"] for r in rows]


def list_timeframes(pair: str | None = None) -> list[str]:
    with get_connection() as conn:
        if pair:
            rows = conn.execute(
                "SELECT DISTINCT timeframe FROM candles WHERE pair=? ORDER BY timeframe", (pair,)
            ).fetchall()
        else:
            rows = conn.execute("SELECT DISTINCT timeframe FROM candles ORDER BY timeframe").fetchall()
        return [r["timeframe"] for r in rows]


def get_market_range(pair: str, timeframe: str) -> dict[str, int] | None:
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT MIN(open_time) AS start_ts, MAX(open_time) AS end_ts, COUNT(1) AS bars
            FROM candles
            WHERE pair=? AND timeframe=?
            """,
            (pair, timeframe),
        ).fetchone()
    if not row or row["start_ts"] is None:
        return None
    return {
        "start_ts": int(row["start_ts"]),
        "end_ts": int(row["end_ts"]),
        "bars": int(row["bars"]),
    }


def get_candles(pair: str, timeframe: str, start_ts: int, end_ts: int) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT open_time, open, high, low, close, volume
            FROM candles
            WHERE pair=? AND timeframe=? AND open_time BETWEEN ? AND ?
            ORDER BY open_time
            """,
            (pair, timeframe, start_ts, end_ts),
        ).fetchall()
    return [dict(r) for r in rows]


def get_scenario_candles(session: dict[str, Any]) -> list[dict[str, Any]]:
    return get_candles(
        pair=session["pair"],
        timeframe=session["timeframe"],
        start_ts=session["scenario_start"],
        end_ts=session["scenario_end"],
    )


def save_session(session: dict[str, Any]) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO replay_sessions (
                id, pair, timeframe, range_start, range_end, scenario_start,
                scenario_end, visible_bars, hidden_bars, cursor, seed, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session["id"],
                session["pair"],
                session["timeframe"],
                session["range_start"],
                session["range_end"],
                session["scenario_start"],
                session["scenario_end"],
                session["visible_bars"],
                session["hidden_bars"],
                session["cursor"],
                session["seed"],
                session["status"],
                session["created_at"],
            ),
        )


def get_session(session_id: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM replay_sessions WHERE id=?",
            (session_id,),
        ).fetchone()
    return dict(row) if row else None


def update_session_cursor_status(session_id: str, cursor: int, status: str) -> None:
    with get_connection() as conn:
        conn.execute(
            "UPDATE replay_sessions SET cursor=?, status=? WHERE id=?",
            (cursor, status, session_id),
        )


def save_prediction(prediction: dict[str, Any]) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO predictions (
                session_id, side, stop_loss_pct, take_profit_pct, entry_price,
                entry_time, entry_index, submitted_at, sl_tp_priority,
                margin_usdt, leverage, stop_loss_price, take_profit_price, entry_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(session_id) DO UPDATE SET
                side=excluded.side,
                stop_loss_pct=excluded.stop_loss_pct,
                take_profit_pct=excluded.take_profit_pct,
                entry_price=excluded.entry_price,
                entry_time=excluded.entry_time,
                entry_index=excluded.entry_index,
                submitted_at=excluded.submitted_at,
                sl_tp_priority=excluded.sl_tp_priority,
                margin_usdt=excluded.margin_usdt,
                leverage=excluded.leverage,
                stop_loss_price=excluded.stop_loss_price,
                take_profit_price=excluded.take_profit_price,
                entry_type=excluded.entry_type
            """,
            (
                prediction["session_id"],
                prediction["side"],
                prediction["stop_loss_pct"],
                prediction["take_profit_pct"],
                prediction["entry_price"],
                prediction["entry_time"],
                prediction["entry_index"],
                prediction["submitted_at"],
                prediction["sl_tp_priority"],
                prediction.get("margin_usdt", 100.0),
                prediction.get("leverage", 10.0),
                prediction.get("stop_loss_price"),
                prediction.get("take_profit_price"),
                prediction.get("entry_type", "limit"),
            ),
        )


def get_prediction(session_id: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM predictions WHERE session_id=?",
            (session_id,),
        ).fetchone()
    return dict(row) if row else None
