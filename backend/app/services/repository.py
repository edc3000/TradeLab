from __future__ import annotations

from datetime import datetime, timezone
import math
from typing import Any
from uuid import uuid4

from app.db import get_connection


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_account(name: str, initial_balance: float) -> dict[str, Any]:
    account = {
        "id": str(uuid4()),
        "name": str(name).strip(),
        "status": "active",
        "initial_balance": float(initial_balance),
        "available_balance": float(initial_balance),
        "locked_margin": 0.0,
        "created_at": utc_now_iso(),
        "archived_at": None,
    }
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO accounts (
                id, name, status, initial_balance, available_balance,
                locked_margin, created_at, archived_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                account["id"],
                account["name"],
                account["status"],
                account["initial_balance"],
                account["available_balance"],
                account["locked_margin"],
                account["created_at"],
                account["archived_at"],
            ),
        )
    return account


def list_accounts(include_archived: bool = False) -> list[dict[str, Any]]:
    with get_connection() as conn:
        if include_archived:
            rows = conn.execute(
                "SELECT * FROM accounts ORDER BY status='active' DESC, created_at DESC"
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM accounts WHERE status='active' ORDER BY created_at DESC"
            ).fetchall()
    return [dict(r) for r in rows]


def get_account(account_id: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM accounts WHERE id=?", (account_id,)).fetchone()
    return dict(row) if row else None


def archive_account(account_id: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM accounts WHERE id=?", (account_id,)).fetchone()
        if not row:
            return None
        if float(row["locked_margin"]) > 1e-9:
            raise ValueError("Cannot archive account with locked margin")
        now = utc_now_iso()
        conn.execute(
            "UPDATE accounts SET status='archived', archived_at=? WHERE id=?",
            (now, account_id),
        )
        updated = conn.execute("SELECT * FROM accounts WHERE id=?", (account_id,)).fetchone()
    return dict(updated) if updated else None


def delete_account(account_id: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM accounts WHERE id=?", (account_id,)).fetchone()
        if not row:
            return None
        if float(row["locked_margin"]) > 1e-9:
            raise ValueError("Cannot delete account with locked margin")
        conn.execute("UPDATE replay_sessions SET account_id=NULL WHERE account_id=?", (account_id,))
        conn.execute("DELETE FROM account_trades WHERE account_id=?", (account_id,))
        conn.execute("DELETE FROM accounts WHERE id=?", (account_id,))
    return dict(row)


def lock_account_margin(account_id: str, margin_usdt: float) -> dict[str, Any]:
    margin = float(margin_usdt)
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM accounts WHERE id=?", (account_id,)).fetchone()
        if not row:
            raise ValueError("Account not found")
        available = float(row["available_balance"])
        if available + 1e-9 < margin:
            raise ValueError(
                f"Insufficient account balance: available={available:.2f}, required={margin:.2f}"
            )
        conn.execute(
            """
            UPDATE accounts
            SET available_balance=available_balance-?,
                locked_margin=locked_margin+?
            WHERE id=?
            """,
            (margin, margin, account_id),
        )
        updated = conn.execute("SELECT * FROM accounts WHERE id=?", (account_id,)).fetchone()
    return dict(updated) if updated else {}


def unlock_account_margin(account_id: str, margin_usdt: float) -> dict[str, Any]:
    margin = float(margin_usdt)
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE accounts
            SET available_balance=available_balance+?,
                locked_margin=CASE
                    WHEN locked_margin>=? THEN locked_margin-?
                    ELSE 0
                END
            WHERE id=?
            """,
            (margin, margin, margin, account_id),
        )
        updated = conn.execute("SELECT * FROM accounts WHERE id=?", (account_id,)).fetchone()
    return dict(updated) if updated else {}


def settle_account_trade(
    *,
    session: dict[str, Any],
    prediction: dict[str, Any],
    trade: dict[str, Any],
) -> bool:
    account_id = session.get("account_id")
    if not account_id:
        return False

    session_id = str(session["id"])
    margin_usdt = float(prediction.get("margin_usdt") or 0.0)
    leverage = float(prediction.get("leverage") or 0.0)
    side = str(prediction.get("side") or "")
    status = str(trade.get("status") or "")
    reason = str(trade.get("reason") or "") or None

    entry_time_raw = trade.get("entry_time")
    entry_time = int(entry_time_raw) if entry_time_raw is not None else int(prediction["entry_time"])
    exit_time_raw = trade.get("exit_time")
    exit_time = int(exit_time_raw) if exit_time_raw is not None else int(session["scenario_end"])

    if reason == "entry_not_filled":
        gross_pnl_usdt = 0.0
        fee_usdt = 0.0
        slippage_usdt = 0.0
        cost_usdt = 0.0
        net_pnl_usdt = 0.0
        roi_pct = 0.0
    else:
        gross_pnl_usdt = float(trade.get("gross_pnl_usdt") or 0.0)
        fee_usdt = float(trade.get("fee_usdt") or 0.0)
        slippage_usdt = float(trade.get("slippage_usdt") or 0.0)
        cost_usdt = float(trade.get("cost_usdt") or 0.0)
        net_pnl_usdt = float(trade.get("net_pnl_usdt") or trade.get("pnl_usdt") or 0.0)
        roi_raw = trade.get("roi_pct")
        roi_pct = float(roi_raw) if roi_raw is not None else None

    with get_connection() as conn:
        existing = conn.execute(
            "SELECT 1 FROM account_trades WHERE session_id=?",
            (session_id,),
        ).fetchone()
        if existing:
            return False

        account = conn.execute("SELECT * FROM accounts WHERE id=?", (account_id,)).fetchone()
        if not account:
            raise ValueError("Account not found during settlement")

        conn.execute(
            """
            INSERT INTO account_trades (
                id, account_id, session_id, side, status, reason,
                margin_usdt, leverage, entry_time, exit_time,
                gross_pnl_usdt, fee_usdt, slippage_usdt, cost_usdt, net_pnl_usdt, roi_pct,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid4()),
                account_id,
                session_id,
                side,
                status,
                reason,
                margin_usdt,
                leverage,
                entry_time,
                exit_time,
                gross_pnl_usdt,
                fee_usdt,
                slippage_usdt,
                cost_usdt,
                net_pnl_usdt,
                roi_pct,
                utc_now_iso(),
            ),
        )

        conn.execute(
            """
            UPDATE accounts
            SET available_balance=available_balance+?,
                locked_margin=CASE
                    WHEN locked_margin>=? THEN locked_margin-?
                    ELSE 0
                END
            WHERE id=?
            """,
            (margin_usdt + net_pnl_usdt, margin_usdt, margin_usdt, account_id),
        )
    return True


def get_account_stats(account_id: str) -> dict[str, Any] | None:
    account = get_account(account_id)
    if not account:
        return None

    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT reason, margin_usdt, gross_pnl_usdt, fee_usdt, slippage_usdt, cost_usdt, net_pnl_usdt, roi_pct
            FROM account_trades
            WHERE account_id=?
            ORDER BY created_at ASC
            """,
            (account_id,),
        ).fetchall()

    trades = [dict(r) for r in rows]
    trade_count = len(trades)
    filled = [t for t in trades if str(t.get("reason") or "") != "entry_not_filled"]
    filled_count = len(filled)
    win_count = sum(1 for t in filled if float(t.get("net_pnl_usdt") or 0.0) > 0)

    total_gross = sum(float(t.get("gross_pnl_usdt") or 0.0) for t in trades)
    total_fee = sum(float(t.get("fee_usdt") or 0.0) for t in trades)
    total_slippage = sum(float(t.get("slippage_usdt") or 0.0) for t in trades)
    total_cost = sum(float(t.get("cost_usdt") or 0.0) for t in trades)
    total_net = sum(float(t.get("net_pnl_usdt") or 0.0) for t in trades)

    returns = []
    for trade in filled:
        margin = float(trade.get("margin_usdt") or 0.0)
        if margin <= 0:
            continue
        returns.append(float(trade.get("net_pnl_usdt") or 0.0) / margin)

    sharpe = None
    if len(returns) >= 2:
        mean = sum(returns) / len(returns)
        variance = sum((x - mean) ** 2 for x in returns) / (len(returns) - 1)
        std = math.sqrt(max(variance, 0.0))
        if std > 1e-12:
            sharpe = (mean / std) * math.sqrt(len(returns))

    initial_balance = float(account["initial_balance"])
    available_balance = float(account["available_balance"])
    locked_margin = float(account["locked_margin"])
    equity = available_balance + locked_margin
    return_pct = ((equity - initial_balance) / initial_balance) * 100.0 if initial_balance > 0 else None
    win_rate_pct = (win_count / filled_count) * 100.0 if filled_count > 0 else None

    return {
        "account_id": account_id,
        "name": account["name"],
        "status": account["status"],
        "initial_balance": initial_balance,
        "available_balance": available_balance,
        "locked_margin": locked_margin,
        "equity": equity,
        "return_pct": return_pct,
        "trade_count": trade_count,
        "filled_trade_count": filled_count,
        "win_count": win_count,
        "win_rate_pct": win_rate_pct,
        "sharpe": sharpe,
        "total_gross_pnl_usdt": total_gross,
        "total_fee_usdt": total_fee,
        "total_slippage_usdt": total_slippage,
        "total_cost_usdt": total_cost,
        "total_net_pnl_usdt": total_net,
    }


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
                id, account_id, pair, timeframe, range_start, range_end, scenario_start,
                scenario_end, visible_bars, hidden_bars, cursor, seed, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session["id"],
                session.get("account_id"),
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
                margin_usdt, leverage, stop_loss_price, take_profit_price, entry_type,
                fee_bps, slippage_bps
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                entry_type=excluded.entry_type,
                fee_bps=excluded.fee_bps,
                slippage_bps=excluded.slippage_bps
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
                prediction.get("fee_bps", 5.0),
                prediction.get("slippage_bps", 2.0),
            ),
        )


def get_prediction(session_id: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM predictions WHERE session_id=?",
            (session_id,),
        ).fetchone()
    return dict(row) if row else None
