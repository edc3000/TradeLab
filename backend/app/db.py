from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Iterable

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "data"
DB_PATH = DATA_DIR / "tradelab.db"


def get_connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.executescript(
            """
            PRAGMA journal_mode=WAL;

            CREATE TABLE IF NOT EXISTS candles (
                pair TEXT NOT NULL,
                timeframe TEXT NOT NULL,
                open_time INTEGER NOT NULL,
                open REAL NOT NULL,
                high REAL NOT NULL,
                low REAL NOT NULL,
                close REAL NOT NULL,
                volume REAL NOT NULL,
                PRIMARY KEY (pair, timeframe, open_time)
            );

            CREATE TABLE IF NOT EXISTS replay_sessions (
                id TEXT PRIMARY KEY,
                pair TEXT NOT NULL,
                timeframe TEXT NOT NULL,
                range_start INTEGER NOT NULL,
                range_end INTEGER NOT NULL,
                scenario_start INTEGER NOT NULL,
                scenario_end INTEGER NOT NULL,
                visible_bars INTEGER NOT NULL,
                hidden_bars INTEGER NOT NULL,
                cursor INTEGER NOT NULL,
                seed INTEGER NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS predictions (
                session_id TEXT PRIMARY KEY,
                side TEXT NOT NULL,
                stop_loss_pct REAL NOT NULL,
                take_profit_pct REAL NOT NULL,
                entry_price REAL NOT NULL,
                entry_time INTEGER NOT NULL,
                entry_index INTEGER NOT NULL,
                submitted_at TEXT NOT NULL,
                sl_tp_priority TEXT NOT NULL,
                FOREIGN KEY (session_id) REFERENCES replay_sessions(id)
            );

            CREATE INDEX IF NOT EXISTS idx_candles_lookup
                ON candles(pair, timeframe, open_time);
            """
        )
        _ensure_prediction_columns(conn)


def _ensure_prediction_columns(conn: sqlite3.Connection) -> None:
    rows = conn.execute("PRAGMA table_info(predictions)").fetchall()
    existing = {str(row["name"]) for row in rows}
    migrations: list[str] = []

    if "margin_usdt" not in existing:
        migrations.append("ALTER TABLE predictions ADD COLUMN margin_usdt REAL NOT NULL DEFAULT 100")
    if "leverage" not in existing:
        migrations.append("ALTER TABLE predictions ADD COLUMN leverage REAL NOT NULL DEFAULT 10")
    if "stop_loss_price" not in existing:
        migrations.append("ALTER TABLE predictions ADD COLUMN stop_loss_price REAL")
    if "take_profit_price" not in existing:
        migrations.append("ALTER TABLE predictions ADD COLUMN take_profit_price REAL")
    if "entry_type" not in existing:
        migrations.append("ALTER TABLE predictions ADD COLUMN entry_type TEXT NOT NULL DEFAULT 'limit'")

    for sql in migrations:
        conn.execute(sql)


def upsert_candles(rows: Iterable[tuple]) -> int:
    sql = """
        INSERT INTO candles (pair, timeframe, open_time, open, high, low, close, volume)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(pair, timeframe, open_time) DO UPDATE SET
            open=excluded.open,
            high=excluded.high,
            low=excluded.low,
            close=excluded.close,
            volume=excluded.volume
    """
    with get_connection() as conn:
        conn.executemany(sql, rows)
        return conn.total_changes
