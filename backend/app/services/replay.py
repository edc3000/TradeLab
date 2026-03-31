from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Any
from uuid import uuid4

from app.services import repository


class ReplayError(Exception):
    pass


DEFAULT_FEE_BPS = 5.0
DEFAULT_SLIPPAGE_BPS = 2.0


@dataclass
class TradeState:
    status: str
    reason: str | None
    entry_price: float
    entry_time: int
    stop_loss_price: float
    take_profit_price: float
    exit_price: float | None
    exit_time: int | None
    exit_index: int | None
    pnl_pct: float | None
    r_multiple: float | None
    margin_usdt: float | None
    leverage: float | None
    position_notional: float | None
    quantity: float | None
    pnl_usdt: float | None
    roi_pct: float | None
    liquidation_price: float | None
    fee_bps: float = DEFAULT_FEE_BPS
    slippage_bps: float = DEFAULT_SLIPPAGE_BPS
    gross_pnl_usdt: float | None = None
    fee_usdt: float | None = None
    slippage_usdt: float | None = None
    cost_usdt: float | None = None
    net_pnl_usdt: float | None = None


def _to_chart_bar(candle: dict[str, Any]) -> dict[str, float | int]:
    return {
        "time": int(candle["open_time"]),
        "open": float(candle["open"]),
        "high": float(candle["high"]),
        "low": float(candle["low"]),
        "close": float(candle["close"]),
        "volume": float(candle["volume"]),
    }


def _compute_exit(
    side: str,
    sl_tp_priority: str,
    bar: dict[str, Any],
    stop_loss_price: float,
    take_profit_price: float,
    liquidation_price: float | None,
) -> tuple[float | None, str | None]:
    high = float(bar["high"])
    low = float(bar["low"])

    if side == "long":
        sl_hit = low <= stop_loss_price
        tp_hit = high >= take_profit_price
        liq_hit = liquidation_price is not None and low <= liquidation_price
    else:
        sl_hit = high >= stop_loss_price
        tp_hit = low <= take_profit_price
        liq_hit = liquidation_price is not None and high >= liquidation_price

    if not sl_hit and not tp_hit:
        if liq_hit:
            return liquidation_price, "liquidation"
        return None, None

    # Conservative backtest assumption:
    # once liquidation level is touched intrabar, position is force-closed first.
    if liq_hit:
        return liquidation_price, "liquidation"

    if sl_hit and tp_hit:
        if sl_tp_priority == "take_first":
            return take_profit_price, "take_profit"
        return stop_loss_price, "stop_loss"

    if sl_hit:
        return stop_loss_price, "stop_loss"
    return take_profit_price, "take_profit"


def _calc_roundtrip_costs(
    *,
    entry_notional: float,
    exit_notional: float,
    fee_bps: float,
    slippage_bps: float,
) -> tuple[float, float, float]:
    fee_rate = max(fee_bps, 0.0) / 10_000.0
    slippage_rate = max(slippage_bps, 0.0) / 10_000.0
    fee_usdt = (entry_notional + exit_notional) * fee_rate
    slippage_usdt = (entry_notional + exit_notional) * slippage_rate
    return fee_usdt, slippage_usdt, fee_usdt + slippage_usdt


def evaluate_trade(
    prediction: dict[str, Any],
    candles: list[dict[str, Any]],
    visible_bars: int,
    current_cursor: int,
) -> TradeState:
    side = prediction["side"]
    stop_loss_pct = float(prediction["stop_loss_pct"])
    take_profit_pct = float(prediction["take_profit_pct"])
    entry_price = float(prediction["entry_price"])
    requested_entry_time = int(prediction["entry_time"])
    requested_entry_index = int(prediction["entry_index"])
    sl_tp_priority = prediction["sl_tp_priority"]
    margin_usdt = float(prediction.get("margin_usdt") or 100.0)
    leverage = float(prediction.get("leverage") or 10.0)
    fee_bps = float(prediction.get("fee_bps") or DEFAULT_FEE_BPS)
    slippage_bps = float(prediction.get("slippage_bps") or DEFAULT_SLIPPAGE_BPS)
    position_notional = margin_usdt * leverage
    quantity = position_notional / entry_price if entry_price > 0 else 0.0
    liquidation_price = (
        entry_price * (1.0 - 1.0 / leverage)
        if side == "long"
        else entry_price * (1.0 + 1.0 / leverage)
    )

    stop_loss_price = prediction.get("stop_loss_price")
    take_profit_price = prediction.get("take_profit_price")
    if stop_loss_price is None or take_profit_price is None:
        if side == "long":
            stop_loss_price = entry_price * (1 - (stop_loss_pct / 100.0))
            take_profit_price = entry_price * (1 + (take_profit_pct / 100.0))
        else:
            stop_loss_price = entry_price * (1 + (stop_loss_pct / 100.0))
            take_profit_price = entry_price * (1 - (take_profit_pct / 100.0))
    stop_loss_price = float(stop_loss_price)
    take_profit_price = float(take_profit_price)

    if current_cursor < requested_entry_index:
        return TradeState(
            status="waiting_entry",
            reason=None,
            entry_price=entry_price,
            entry_time=requested_entry_time,
            stop_loss_price=stop_loss_price,
            take_profit_price=take_profit_price,
            exit_price=None,
            exit_time=None,
            exit_index=None,
            pnl_pct=None,
            r_multiple=None,
            margin_usdt=margin_usdt,
            leverage=leverage,
            position_notional=position_notional,
            quantity=quantity,
            pnl_usdt=None,
            roi_pct=None,
            liquidation_price=liquidation_price,
            fee_bps=fee_bps,
            slippage_bps=slippage_bps,
        )

    entry_index: int | None = None
    entry_time: int | None = None
    for idx in range(requested_entry_index, current_cursor + 1):
        bar = candles[idx]
        low = float(bar["low"])
        high = float(bar["high"])
        if low <= entry_price <= high:
            entry_index = idx
            entry_time = int(bar["open_time"])
            break

    if entry_index is None or entry_time is None:
        return TradeState(
            status="waiting_entry",
            reason="entry_not_filled",
            entry_price=entry_price,
            entry_time=requested_entry_time,
            stop_loss_price=stop_loss_price,
            take_profit_price=take_profit_price,
            exit_price=None,
            exit_time=None,
            exit_index=None,
            pnl_pct=None,
            r_multiple=None,
            margin_usdt=margin_usdt,
            leverage=leverage,
            position_notional=position_notional,
            quantity=quantity,
            pnl_usdt=None,
            roi_pct=None,
            liquidation_price=liquidation_price,
            fee_bps=fee_bps,
            slippage_bps=slippage_bps,
        )

    for idx in range(entry_index, current_cursor + 1):
        bar = candles[idx]
        maybe_exit, reason = _compute_exit(
            side,
            sl_tp_priority,
            bar,
            stop_loss_price,
            take_profit_price,
            liquidation_price,
        )
        if maybe_exit is None:
            continue

        pnl_pct = (
            ((maybe_exit - entry_price) / entry_price) * 100.0
            if side == "long"
            else ((entry_price - maybe_exit) / entry_price) * 100.0
        )
        r_multiple = pnl_pct / stop_loss_pct if stop_loss_pct > 0 else None
        gross_pnl_usdt = (
            (maybe_exit - entry_price) * quantity
            if side == "long"
            else (entry_price - maybe_exit) * quantity
        )
        if reason == "liquidation":
            gross_pnl_usdt = -margin_usdt

        exit_notional = abs(quantity * maybe_exit)
        fee_usdt, slippage_usdt, cost_usdt = _calc_roundtrip_costs(
            entry_notional=position_notional,
            exit_notional=exit_notional,
            fee_bps=fee_bps,
            slippage_bps=slippage_bps,
        )
        net_pnl_usdt = gross_pnl_usdt - cost_usdt
        roi_pct = (net_pnl_usdt / margin_usdt) * 100.0 if margin_usdt > 0 else None

        return TradeState(
            status="closed",
            reason=reason,
            entry_price=entry_price,
            entry_time=entry_time,
            stop_loss_price=stop_loss_price,
            take_profit_price=take_profit_price,
            exit_price=maybe_exit,
            exit_time=int(bar["open_time"]),
            exit_index=idx,
            pnl_pct=pnl_pct,
            r_multiple=r_multiple,
            margin_usdt=margin_usdt,
            leverage=leverage,
            position_notional=position_notional,
            quantity=quantity,
            pnl_usdt=net_pnl_usdt,
            roi_pct=roi_pct,
            liquidation_price=liquidation_price,
            fee_bps=fee_bps,
            slippage_bps=slippage_bps,
            gross_pnl_usdt=gross_pnl_usdt,
            fee_usdt=fee_usdt,
            slippage_usdt=slippage_usdt,
            cost_usdt=cost_usdt,
            net_pnl_usdt=net_pnl_usdt,
        )

    if current_cursor == len(candles) - 1:
        last_close = float(candles[current_cursor]["close"])
        pnl_pct = (
            ((last_close - entry_price) / entry_price) * 100.0
            if side == "long"
            else ((entry_price - last_close) / entry_price) * 100.0
        )
        r_multiple = pnl_pct / stop_loss_pct if stop_loss_pct > 0 else None
        gross_pnl_usdt = (
            (last_close - entry_price) * quantity
            if side == "long"
            else (entry_price - last_close) * quantity
        )
        exit_notional = abs(quantity * last_close)
        fee_usdt, slippage_usdt, cost_usdt = _calc_roundtrip_costs(
            entry_notional=position_notional,
            exit_notional=exit_notional,
            fee_bps=fee_bps,
            slippage_bps=slippage_bps,
        )
        net_pnl_usdt = gross_pnl_usdt - cost_usdt
        roi_pct = (net_pnl_usdt / margin_usdt) * 100.0 if margin_usdt > 0 else None
        return TradeState(
            status="closed",
            reason="end_of_data",
            entry_price=entry_price,
            entry_time=entry_time,
            stop_loss_price=stop_loss_price,
            take_profit_price=take_profit_price,
            exit_price=last_close,
            exit_time=int(candles[current_cursor]["open_time"]),
            exit_index=current_cursor,
            pnl_pct=pnl_pct,
            r_multiple=r_multiple,
            margin_usdt=margin_usdt,
            leverage=leverage,
            position_notional=position_notional,
            quantity=quantity,
            pnl_usdt=net_pnl_usdt,
            roi_pct=roi_pct,
            liquidation_price=liquidation_price,
            fee_bps=fee_bps,
            slippage_bps=slippage_bps,
            gross_pnl_usdt=gross_pnl_usdt,
            fee_usdt=fee_usdt,
            slippage_usdt=slippage_usdt,
            cost_usdt=cost_usdt,
            net_pnl_usdt=net_pnl_usdt,
        )

    return TradeState(
        status="open",
        reason=None,
        entry_price=entry_price,
        entry_time=entry_time,
        stop_loss_price=stop_loss_price,
        take_profit_price=take_profit_price,
        exit_price=None,
        exit_time=None,
        exit_index=None,
        pnl_pct=None,
        r_multiple=None,
        margin_usdt=margin_usdt,
        leverage=leverage,
        position_notional=position_notional,
        quantity=quantity,
        pnl_usdt=None,
        roi_pct=None,
        liquidation_price=liquidation_price,
        fee_bps=fee_bps,
        slippage_bps=slippage_bps,
    )


def _trade_to_payload(trade: TradeState) -> dict[str, Any]:
    return {
        "status": trade.status,
        "reason": trade.reason,
        "entry_price": trade.entry_price,
        "entry_time": trade.entry_time,
        "stop_loss_price": trade.stop_loss_price,
        "take_profit_price": trade.take_profit_price,
        "exit_price": trade.exit_price,
        "exit_time": trade.exit_time,
        "pnl_pct": trade.pnl_pct,
        "r_multiple": trade.r_multiple,
        "margin_usdt": trade.margin_usdt,
        "leverage": trade.leverage,
        "position_notional": trade.position_notional,
        "quantity": trade.quantity,
        "pnl_usdt": trade.pnl_usdt,
        "roi_pct": trade.roi_pct,
        "liquidation_price": trade.liquidation_price,
        "fee_bps": trade.fee_bps,
        "slippage_bps": trade.slippage_bps,
        "gross_pnl_usdt": trade.gross_pnl_usdt,
        "fee_usdt": trade.fee_usdt,
        "slippage_usdt": trade.slippage_usdt,
        "cost_usdt": trade.cost_usdt,
        "net_pnl_usdt": trade.net_pnl_usdt,
    }


def _maybe_settle_account_trade(
    session: dict[str, Any],
    prediction: dict[str, Any] | None,
    candles: list[dict[str, Any]],
) -> None:
    if not prediction or not session.get("account_id"):
        return
    trade = evaluate_trade(prediction, candles, int(session["visible_bars"]), int(session["cursor"]))
    should_settle = (trade.status == "closed") or (
        str(session.get("status")) == "completed" and trade.reason == "entry_not_filled"
    )
    if not should_settle:
        return
    repository.settle_account_trade(session=session, prediction=prediction, trade=_trade_to_payload(trade))


def _session_payload(session: dict[str, Any], candles: list[dict[str, Any]], prediction: dict[str, Any] | None) -> dict[str, Any]:
    cursor = int(session["cursor"])
    revealed = candles[: cursor + 1]
    done = (session.get("status") == "completed") or (cursor >= len(candles) - 1)
    payload: dict[str, Any] = {
        "session_id": session["id"],
        "account_id": session.get("account_id"),
        "pair": session["pair"],
        "timeframe": session["timeframe"],
        "status": session["status"],
        "visible_bars": int(session["visible_bars"]),
        "hidden_bars": int(session["hidden_bars"]),
        "cursor": cursor,
        "total_bars": len(candles),
        "bars": [_to_chart_bar(c) for c in revealed],
        "done": done,
        "prediction": prediction,
        "trade": None,
    }

    if prediction:
        trade = evaluate_trade(prediction, candles, int(session["visible_bars"]), cursor)
        payload["trade"] = _trade_to_payload(trade)
    return payload


def create_session(
    account_id: str | None,
    pair: str,
    timeframe: str,
    range_start: int,
    range_end: int,
    visible_bars: int,
    hidden_bars: int | None,
    seed: int | None,
) -> dict[str, Any]:
    if visible_bars < 20:
        raise ReplayError("visible_bars must be at least 20")
    if account_id:
        account = repository.get_account(account_id)
        if not account:
            raise ReplayError("Account not found")

    candles = repository.get_candles(pair, timeframe, range_start, range_end)
    if hidden_bars is None:
        min_need = visible_bars + 1
        if len(candles) < min_need:
            raise ReplayError(f"Not enough candles in range: need {min_need}, got {len(candles)}")
    else:
        if hidden_bars < 1:
            raise ReplayError("hidden_bars must be at least 1")
        need = visible_bars + hidden_bars
        if len(candles) < need:
            raise ReplayError(f"Not enough candles in range: need {need}, got {len(candles)}")

    seed_value = seed if seed is not None else random.randint(1, 2_000_000_000)
    rng = random.Random(seed_value)
    if hidden_bars is None:
        max_start = len(candles) - visible_bars - 1
        start_index = rng.randint(0, max_start)
        scenario = candles[start_index:]
        hidden_count = len(scenario) - visible_bars
    else:
        need = visible_bars + hidden_bars
        start_index = rng.randint(0, len(candles) - need)
        scenario = candles[start_index : start_index + need]
        hidden_count = hidden_bars

    session = {
        "id": str(uuid4()),
        "account_id": account_id,
        "pair": pair,
        "timeframe": timeframe,
        "range_start": range_start,
        "range_end": range_end,
        "scenario_start": int(scenario[0]["open_time"]),
        "scenario_end": int(scenario[-1]["open_time"]),
        "visible_bars": visible_bars,
        "hidden_bars": hidden_count,
        "cursor": visible_bars - 1,
        "seed": seed_value,
        "status": "waiting_prediction",
        "created_at": repository.utc_now_iso(),
    }
    repository.save_session(session)

    return _session_payload(session, scenario, prediction=None)


def get_session_snapshot(session_id: str) -> dict[str, Any]:
    session = repository.get_session(session_id)
    if not session:
        raise ReplayError("Session not found")
    candles = repository.get_scenario_candles(session)
    prediction = repository.get_prediction(session_id)
    _maybe_settle_account_trade(session, prediction, candles)
    return _session_payload(session, candles, prediction=prediction)


def submit_prediction(
    session_id: str,
    side: str,
    entry_price_limit: float | None,
    margin_usdt: float,
    leverage: float,
    stop_loss_price: float | None,
    take_profit_price: float | None,
    stop_loss_pct: float | None,
    take_profit_pct: float | None,
    sl_tp_priority: str,
) -> dict[str, Any]:
    if side not in {"long", "short"}:
        raise ReplayError("side must be long or short")
    if margin_usdt <= 0:
        raise ReplayError("margin_usdt must be > 0")
    if leverage < 3 or leverage > 100:
        raise ReplayError("leverage must be in [3, 100]")
    if sl_tp_priority not in {"stop_first", "take_first"}:
        raise ReplayError("sl_tp_priority must be stop_first or take_first")

    session = repository.get_session(session_id)
    if not session:
        raise ReplayError("Session not found")
    if repository.get_prediction(session_id):
        raise ReplayError("Prediction already submitted for this session")

    candles = repository.get_scenario_candles(session)
    entry_index = int(session["visible_bars"])
    if entry_index >= len(candles):
        raise ReplayError("No candle available for entry")

    entry_candle = candles[entry_index]
    entry_price = float(entry_price_limit) if entry_price_limit is not None else float(entry_candle["open"])
    if entry_price <= 0:
        raise ReplayError("entry_price_limit must be > 0")

    if (stop_loss_price is None) != (take_profit_price is None):
        raise ReplayError("stop_loss_price and take_profit_price must be provided together")

    if stop_loss_price is not None and take_profit_price is not None:
        sl_price = float(stop_loss_price)
        tp_price = float(take_profit_price)
        if side == "long":
            if not (sl_price < entry_price < tp_price):
                raise ReplayError("For long, require stop_loss_price < entry_price < take_profit_price")
            stop_loss_pct = ((entry_price - sl_price) / entry_price) * 100.0
            take_profit_pct = ((tp_price - entry_price) / entry_price) * 100.0
        else:
            if not (tp_price < entry_price < sl_price):
                raise ReplayError("For short, require take_profit_price < entry_price < stop_loss_price")
            stop_loss_pct = ((sl_price - entry_price) / entry_price) * 100.0
            take_profit_pct = ((entry_price - tp_price) / entry_price) * 100.0
    else:
        if stop_loss_pct is None or take_profit_pct is None:
            raise ReplayError("Provide both stop_loss_price/take_profit_price or stop_loss_pct/take_profit_pct")
        if stop_loss_pct <= 0 or take_profit_pct <= 0:
            raise ReplayError("stop_loss_pct and take_profit_pct must be > 0")
        if side == "long":
            sl_price = entry_price * (1 - (float(stop_loss_pct) / 100.0))
            tp_price = entry_price * (1 + (float(take_profit_pct) / 100.0))
        else:
            sl_price = entry_price * (1 + (float(stop_loss_pct) / 100.0))
            tp_price = entry_price * (1 - (float(take_profit_pct) / 100.0))

    if float(stop_loss_pct) <= 0 or float(take_profit_pct) <= 0:
        raise ReplayError("Calculated stop/take percentage must be > 0")

    prediction = {
        "session_id": session_id,
        "side": side,
        "stop_loss_pct": float(stop_loss_pct),
        "take_profit_pct": float(take_profit_pct),
        "entry_price": entry_price,
        "entry_time": int(entry_candle["open_time"]),
        "entry_index": entry_index,
        "submitted_at": repository.utc_now_iso(),
        "sl_tp_priority": sl_tp_priority,
        "margin_usdt": float(margin_usdt),
        "leverage": float(leverage),
        "stop_loss_price": float(sl_price),
        "take_profit_price": float(tp_price),
        "entry_type": "limit",
        "fee_bps": DEFAULT_FEE_BPS,
        "slippage_bps": DEFAULT_SLIPPAGE_BPS,
    }
    account_id = session.get("account_id")
    locked = False
    if account_id:
        try:
            repository.lock_account_margin(str(account_id), float(margin_usdt))
            locked = True
        except ValueError as exc:
            raise ReplayError(str(exc)) from exc
    try:
        repository.save_prediction(prediction)
    except Exception as exc:
        if account_id and locked:
            repository.unlock_account_margin(str(account_id), float(margin_usdt))
        raise ReplayError(f"Failed to save prediction: {exc}") from exc

    current_cursor = int(session["cursor"])
    status = "running" if current_cursor < len(candles) - 1 else "completed"
    repository.update_session_cursor_status(session_id, current_cursor, status)
    session["status"] = status

    return _session_payload(session, candles, prediction)


def step_session(session_id: str, steps: int) -> dict[str, Any]:
    if steps <= 0:
        raise ReplayError("steps must be > 0")

    session = repository.get_session(session_id)
    if not session:
        raise ReplayError("Session not found")

    prediction = repository.get_prediction(session_id)
    if not prediction:
        raise ReplayError("Please submit prediction first")

    candles = repository.get_scenario_candles(session)
    if session["status"] == "completed":
        _maybe_settle_account_trade(session, prediction, candles)
        payload = _session_payload(session, candles, prediction)
        payload["new_bars"] = []
        return payload

    old_cursor = int(session["cursor"])
    if old_cursor >= len(candles) - 1:
        session["status"] = "completed"
        repository.update_session_cursor_status(session_id, old_cursor, "completed")
        _maybe_settle_account_trade(session, prediction, candles)
        return _session_payload(session, candles, prediction)

    proposed_cursor = min(len(candles) - 1, old_cursor + steps)
    trade = evaluate_trade(prediction, candles, int(session["visible_bars"]), proposed_cursor)

    new_cursor = proposed_cursor
    if trade.status == "closed" and trade.exit_index is not None:
        new_cursor = min(new_cursor, int(trade.exit_index))

    status = "completed" if (new_cursor >= len(candles) - 1 or trade.status == "closed") else "running"
    repository.update_session_cursor_status(session_id, new_cursor, status)

    session["cursor"] = new_cursor
    session["status"] = status
    _maybe_settle_account_trade(session, prediction, candles)

    payload = _session_payload(session, candles, prediction)
    payload["new_bars"] = [_to_chart_bar(c) for c in candles[old_cursor + 1 : new_cursor + 1]]
    return payload
