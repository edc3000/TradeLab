from __future__ import annotations

import os
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.db import init_db
from app.services.bootstrap import ensure_sample_data
from app.services.exchange_downloader import DownloadError, TIMEFRAME_SECONDS, download_history
from app.services.indicators import build_indicator_payload
from app.services.replay import ReplayError, create_session, get_session_snapshot, step_session, submit_prediction
from app.services.repository import (
    candles_count,
    create_account,
    delete_account,
    get_account,
    get_account_stats,
    get_candles,
    get_market_range,
    get_session,
    list_accounts,
    list_pairs,
    list_timeframes,
)

APP_DIR = Path(__file__).resolve().parent
STATIC_DIR = APP_DIR / "static"

app = FastAPI(title="TradeLab Replay API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class SessionCreateRequest(BaseModel):
    account_id: str | None = None
    pair: str = Field(default="BINANCE:BTC/USDT")
    timeframe: str = Field(default="4h")
    range_start: int
    range_end: int
    visible_bars: int = Field(default=120, ge=20, le=500)
    hidden_bars: int | None = Field(default=None, ge=1, le=2000)
    seed: int | None = None


class PredictionRequest(BaseModel):
    side: Literal["long", "short"]
    entry_price_limit: float | None = Field(default=None, gt=0)
    margin_usdt: float = Field(default=100, gt=0)
    leverage: float = Field(default=10, ge=3, le=100)
    stop_loss_price: float | None = Field(default=None, gt=0)
    take_profit_price: float | None = Field(default=None, gt=0)
    stop_loss_pct: float | None = Field(default=None, gt=0)
    take_profit_pct: float | None = Field(default=None, gt=0)
    sl_tp_priority: Literal["stop_first", "take_first"] = "stop_first"


class StepRequest(BaseModel):
    steps: int = Field(default=1, gt=0, le=500)


class DownloadRequest(BaseModel):
    exchange: Literal["binance", "okx"]
    pair: str = Field(..., description="BASE/QUOTE for spot, BASE/QUOTE:SETTLE for perpetual")
    market_type: str = Field(default="auto", description="auto or explicit: binance(spot/usdt_perp/coin_perp), okx(spot/swap/futures)")
    timeframe: str
    start_ts: int = Field(..., description="Unix timestamp seconds")
    end_ts: int = Field(..., description="Unix timestamp seconds")


class AccountCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    initial_balance: float = Field(default=10000, gt=0)


@app.on_event("startup")
def startup() -> None:
    init_db()
    if os.getenv("ENABLE_SAMPLE_DATA", "0") == "1":
        ensure_sample_data()


@app.get("/")
def root() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
def health() -> dict:
    total = candles_count()
    return {
        "ok": True,
        "candles": total,
        "has_data": total > 0,
    }


@app.get("/api/market/pairs")
def market_pairs() -> dict:
    return {"pairs": list_pairs()}


@app.get("/api/accounts")
def api_list_accounts(include_archived: bool = False) -> dict:
    return {"items": list_accounts(include_archived=include_archived)}


@app.post("/api/accounts")
def api_create_account(req: AccountCreateRequest) -> dict:
    name = req.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name cannot be empty")
    return create_account(name=name, initial_balance=req.initial_balance)


@app.get("/api/accounts/{account_id}")
def api_get_account(account_id: str) -> dict:
    account = get_account(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@app.delete("/api/accounts/{account_id}")
def api_delete_account(account_id: str) -> dict:
    try:
        account = delete_account(account_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@app.get("/api/accounts/{account_id}/stats")
def api_get_account_stats(account_id: str) -> dict:
    stats = get_account_stats(account_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Account not found")
    return stats


@app.get("/api/market/timeframes")
def market_timeframes(pair: str | None = None) -> dict:
    return {"timeframes": list_timeframes(pair)}


@app.get("/api/market/range")
def market_range(pair: str, timeframe: str) -> dict:
    data = get_market_range(pair, timeframe)
    if not data:
        raise HTTPException(status_code=404, detail="pair/timeframe not found")
    return data


@app.post("/api/data/download")
def data_download(req: DownloadRequest) -> dict:
    try:
        return download_history(
            exchange=req.exchange,
            pair=req.pair,
            market_type=req.market_type,
            timeframe=req.timeframe,
            start_ts=req.start_ts,
            end_ts=req.end_ts,
        )
    except DownloadError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/indicators/catalog")
def indicators_catalog() -> dict:
    return {
        "items": [
            {"name": "sma", "params": {"period": 20}, "pane": "price"},
            {"name": "ema", "params": {"period": 50}, "pane": "price"},
            {"name": "boll", "params": {"period": 20, "stddev": 2.0}, "pane": "price"},
            {"name": "rsi", "params": {"period": 14}, "pane": "indicator"},
            {"name": "macd", "params": {"fast": 12, "slow": 26, "signal": 9}, "pane": "indicator"},
        ]
    }


@app.post("/api/replay/sessions")
def api_create_session(req: SessionCreateRequest) -> dict:
    try:
        return create_session(
            account_id=req.account_id,
            pair=req.pair,
            timeframe=req.timeframe,
            range_start=req.range_start,
            range_end=req.range_end,
            visible_bars=req.visible_bars,
            hidden_bars=req.hidden_bars,
            seed=req.seed,
        )
    except ReplayError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/replay/sessions/{session_id}")
def api_get_session(session_id: str) -> dict:
    try:
        return get_session_snapshot(session_id)
    except ReplayError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/replay/sessions/{session_id}/prediction")
def api_prediction(session_id: str, req: PredictionRequest) -> dict:
    try:
        return submit_prediction(
            session_id=session_id,
            side=req.side,
            entry_price_limit=req.entry_price_limit,
            margin_usdt=req.margin_usdt,
            leverage=req.leverage,
            stop_loss_price=req.stop_loss_price,
            take_profit_price=req.take_profit_price,
            stop_loss_pct=req.stop_loss_pct,
            take_profit_pct=req.take_profit_pct,
            sl_tp_priority=req.sl_tp_priority,
        )
    except ReplayError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/replay/sessions/{session_id}/step")
def api_step(session_id: str, req: StepRequest) -> dict:
    try:
        return step_session(session_id=session_id, steps=req.steps)
    except ReplayError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/replay/sessions/{session_id}/indicator")
def api_indicator(
    session_id: str,
    name: str,
    period: int = Query(default=20, ge=1, le=500),
    fast: int = Query(default=12, ge=1, le=200),
    slow: int = Query(default=26, ge=1, le=500),
    signal: int = Query(default=9, ge=1, le=200),
    stddev: float = Query(default=2.0, ge=0.1, le=10.0),
) -> dict:
    try:
        session = get_session_snapshot(session_id)
    except ReplayError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    params = {"period": period, "fast": fast, "slow": slow, "signal": signal, "stddev": stddev}
    revealed_times = [int(bar["time"]) for bar in session["bars"]]
    if not revealed_times:
        return {"name": name.lower(), "series": []}

    meta = get_session(session_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Session not found")

    tf = str(meta["timeframe"])
    tf_seconds = TIMEFRAME_SECONDS.get(tf, 3600)
    indicator_name = name.lower()

    base_window = max(int(period), int(slow) + int(signal), int(fast), 50)
    if indicator_name in {"rsi", "macd"}:
        warmup_bars = max(240, base_window * 6)
    else:
        warmup_bars = max(120, base_window * 4)
    warmup_bars = min(warmup_bars, 4000)

    visible_start = int(revealed_times[0])
    history_start = max(int(meta["range_start"]), visible_start - warmup_bars * tf_seconds)
    history_end = int(revealed_times[-1])
    candles = get_candles(
        pair=str(meta["pair"]),
        timeframe=tf,
        start_ts=history_start,
        end_ts=history_end,
    )
    if not candles:
        candles = [
            {
                "open_time": bar["time"],
                "open": bar["open"],
                "high": bar["high"],
                "low": bar["low"],
                "close": bar["close"],
                "volume": bar["volume"],
            }
            for bar in session["bars"]
        ]

    try:
        payload = build_indicator_payload(name=name, candles=candles, params=params)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    revealed_ordered = [int(ts) for ts in revealed_times]
    for series in payload.get("series", []):
        index_by_time = {int(p["time"]): p for p in series.get("points", []) if "time" in p}
        aligned_points = []
        for ts in revealed_ordered:
            p = index_by_time.get(ts)
            aligned_points.append(p if p is not None else {"time": ts})
        series["points"] = aligned_points
    return payload
