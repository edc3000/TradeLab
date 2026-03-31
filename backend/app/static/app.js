const state = {
  session: null,
  accountStats: null,
  accounts: [],
  selectedAccountId: null,
  isStepping: false,
  autoplayTimer: null,
  priceIndicatorSeries: [],
  subIndicatorSeries: [],
  indicatorConfigs: [],
  indicatorEditingId: null,
  indicatorRefreshTimer: null,
  barsByTime: new Map(),
  indicatorValueMaps: new Map(),
  subIndicatorOrder: [],
  isRangeSyncing: false,
  isCrosshairSyncing: false,
  isRefreshingIndicators: false,
  positionZones: {
    profit: null,
    loss: null,
  },
  positionLines: {
    entry: null,
    stop: null,
    take: null,
  },
  predictionGuideZones: {
    profit: null,
    loss: null,
  },
  predictionGuideLines: {
    entry: null,
    stop: null,
    take: null,
  },
  predictionGuideDragTarget: null,
  predictionGuideDragRange: null,
  sessionVersion: 0,
  sessionLoadingPromise: null,
  indicatorRefreshToken: 0,
};

const DEFAULT_SL_PCT = 1.5;
const DEFAULT_RR = 1.5;
const DEFAULT_FEE_BPS = 5.0;
const DEFAULT_SLIPPAGE_BPS = 2.0;
const PREDICTION_FUTURE_BARS = 24;
const TIMEFRAME_SECONDS = {
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
};
const LANG_STORAGE_KEY = "tradelab_lang_v1";
const ACCOUNT_STORAGE_KEY = "tradelab_account_v1";
const INDICATOR_STORAGE_KEY = "tradelab_indicator_configs_v1";
const INDICATOR_NAMES = ["sma", "ema", "boll", "rsi", "macd"];
const I18N = {
  zh: {
    "brand.title": "TradeLab Replay",
    "brand.subtitle": "离线历史回放训练器",
    "account.title": "账户统计",
    "account.label": "账户",
    "account.new": "新建账户",
    "account.delete": "删除",
    "account.none": "暂无账户",
    "account.stats_empty": "请选择账户。",
    "account.prompt_name": "请输入账户名称",
    "account.prompt_balance": "请输入初始资金(USDT)",
    "account.confirm_delete": "确认删除当前账户吗？",
    "account.equity": "净值",
    "account.available": "可用资金",
    "account.locked": "冻结保证金",
    "account.total_net": "累计净收益",
    "account.total_cost": "累计成本",
    "account.return": "收益率",
    "account.sharpe": "夏普(按交易)",
    "account.win_rate": "胜率",
    "account.trades": "已结算/成交笔数",
    "toolbar.pair": "交易对",
    "toolbar.timeframe": "周期",
    "toolbar.start": "开始",
    "toolbar.end": "结束",
    "toolbar.visible": "可见",
    "toolbar.replay": "回放",
    "toolbar.createSession": "创建会话",
    "toolbar.refreshRandom": "刷新随机K线",
    "indicators.title": "指标",
    "indicators.add": "添加指标",
    "indicators.none_added": "未添加指标",
    "indicators.settings": "设置",
    "indicators.remove": "移除",
    "indicators.close": "关闭",
    "indicators.settings_title": "{name} 设置",
    "indicators.field.period": "周期",
    "indicators.field.lineWidth": "线宽",
    "indicators.field.color": "颜色",
    "indicators.field.stddev": "标准差",
    "indicators.field.upperColor": "上轨色",
    "indicators.field.middleColor": "中轨色",
    "indicators.field.lowerColor": "下轨色",
    "indicators.field.fast": "Fast",
    "indicators.field.slow": "Slow",
    "indicators.field.signal": "Signal",
    "indicators.field.macdColor": "MACD线",
    "indicators.field.signalColor": "Signal线",
    "indicators.field.histPosColor": "柱体上涨",
    "indicators.field.histNegColor": "柱体下跌",
    "prediction.title": "预测",
    "prediction.long": "多头",
    "prediction.short": "空头",
    "prediction.mode": "预测类型",
    "prediction.modeLong": "多头仓位",
    "prediction.modeShort": "空头仓位",
    "prediction.entryLimit": "开仓价 (Limit)",
    "prediction.margin": "开仓成本 (USDT)",
    "prediction.leverage": "杠杆 (x)",
    "prediction.slPrice": "止损价",
    "prediction.tpPrice": "止盈价",
    "prediction.priority": "同一根K线触发优先级",
    "prediction.stopFirst": "止损优先",
    "prediction.takeFirst": "止盈优先",
    "prediction.submit": "提交预测",
    "prediction.invalid_entry": "请先输入有效的开仓价（Limit）。",
    "prediction.invalid_margin": "请先输入有效的开仓成本（USDT）。",
    "prediction.invalid_leverage": "杠杆范围应在 3x 到 100x。",
    "prediction.invalid_sl_tp": "请输入有效的 SL/TP 价格。",
    "prediction.long_rule": "多头要求：SL < Entry < TP。",
    "prediction.short_rule": "空头要求：TP < Entry < SL。",
    "prediction.metrics_line1": "SL: {sl}%   TP: {tp}%   RR: 1:{rr}",
    "prediction.metrics_line2": "仓位名义价值: {notional} U   数量: {qty}",
    "prediction.metrics_line3": "命中 TP: {tpPnl} U ({tpRoi}%)",
    "prediction.metrics_line4": "命中 SL: {slPnl} U ({slRoi}%)",
    "prediction.metrics_line5": "默认成本: 手续费 {feeBps}bps + 滑点 {slippageBps}bps",
    "prediction.metrics_line6": "命中 TP 净收益: {tpNet} U ({tpNetRoi}%) | 命中 SL 净收益: {slNet} U ({slNetRoi}%)",
    "prediction.metrics_hint": "设置 Entry/SL/TP 后自动计算 RR。",
    "replay.title": "回放控制",
    "replay.step1": "步进 +1",
    "replay.step5": "步进 +5",
    "replay.play": "回放",
    "replay.pause": "暂停",
    "replay.speed": "速度 (ms)",
    "result.title": "结果",
    "result.no_session": "暂无会话。",
    "status.title": "状态",
    "status.ready": "就绪",
    "status.loading_market": "加载市场元数据...",
    "status.no_local_data": "本地无数据，请先下载 Binance/OKX 历史K线。",
    "status.current_pair_no_tf": "当前交易对没有周期数据。",
    "status.range_loaded": "范围已加载: {start} -> {end}",
    "status.creating_session": "正在创建回放会话...",
    "status.session_created": "会话已创建。",
    "status.random_refreshed": "随机K线已刷新。",
    "status.submitting_prediction": "正在提交预测...",
    "status.prediction_submitted": "预测已提交。开仓价 {entry} | RR 1:{rr}",
    "status.account_created": "账户已创建: {name}",
    "status.account_deleted": "账户已删除: {name}",
    "status.account_failed": "账户操作失败: {err}",
    "status.auto_play_started": "自动回放已启动 ({speed}ms)",
    "status.paused": "已暂停",
    "status.replay_finished": "回放完成。",
    "status.create_failed": "创建失败: {err}",
    "status.refresh_failed": "刷新失败: {err}",
    "status.prediction_failed": "预测失败: {err}",
    "status.chart_no_session": "会话未就绪，正在创建...",
    "status.chart_locked": "已有已提交预测，请刷新随机K线后再设置新的预测。",
    "status.chart_ready_long": "已设置默认多头 1:1，可拖拽 ENTRY/SL/TP 微调。",
    "status.chart_ready_short": "已设置默认空头 1:1，可拖拽 ENTRY/SL/TP 微调。",
    "status.replay_preparing": "正在创建会话并提交预测...",
    "status.step_failed": "步进失败: {err}",
    "status.play_failed": "播放失败: {err}",
    "status.indicator_failed": "指标加载失败: {err}",
    "status.preload_failed": "预加载失败: {err}",
    "status.init_failed": "初始化失败: {err}",
    "status.init_no_data_hint":
      "未找到历史K线数据。\\n\\n运行下载脚本:\\npython backend/app/scripts/download_history.py --exchange binance --pair BTC/USDT --timeframe 1h --start 2024-01-01T00:00:00Z --end 2025-01-01T00:00:00Z",
    "error.invalid_date_range": "日期范围无效。",
    "error.create_session_first": "请先创建会话。",
    "error.account_required": "请先选择账户。",
    "overlay.long_position": "多头仓位",
    "overlay.short_position": "空头仓位",
    "overlay.replaying": "回放中",
    "overlay.hit_tp": "命中止盈",
    "overlay.hit_sl": "命中止损",
    "overlay.liquidation": "触发爆仓",
    "overlay.unfilled": "挂单未成交",
    "overlay.end_of_data": "数据结束平仓",
    "overlay.waiting_entry": "等待限价成交",
    "overlay.margin_leverage": "保证金/杠杆",
    "overlay.target_rr": "目标盈亏比",
    "overlay.live_r": "实时 R 倍数",
    "overlay.live_pnl": "实时PNL(U)",
    "overlay.live_roi": "实时ROI",
    "overlay.final_gross_pnl": "最终毛PNL(U)",
    "overlay.final_cost": "最终成本(U)",
    "overlay.final_pnl": "最终PNL(U)",
    "overlay.final_roi": "最终ROI",
    "overlay.current_status": "当前状态",
    "hover.prefix": "悬浮",
  },
  en: {
    "brand.title": "TradeLab Replay",
    "brand.subtitle": "Offline Historical Playback Trainer",
    "account.title": "Account Stats",
    "account.label": "Account",
    "account.new": "New Account",
    "account.delete": "Delete",
    "account.none": "No account",
    "account.stats_empty": "Select an account first.",
    "account.prompt_name": "Enter account name",
    "account.prompt_balance": "Enter initial balance (USDT)",
    "account.confirm_delete": "Delete current account?",
    "account.equity": "Equity",
    "account.available": "Available",
    "account.locked": "Locked Margin",
    "account.total_net": "Total Net PNL",
    "account.total_cost": "Total Costs",
    "account.return": "Return",
    "account.sharpe": "Sharpe (trade)",
    "account.win_rate": "Win Rate",
    "account.trades": "Settled/Filled Trades",
    "toolbar.pair": "Pair",
    "toolbar.timeframe": "Timeframe",
    "toolbar.start": "Start",
    "toolbar.end": "End",
    "toolbar.visible": "Visible",
    "toolbar.replay": "Replay",
    "toolbar.createSession": "Create Session",
    "toolbar.refreshRandom": "Refresh Random K-Line",
    "indicators.title": "Indicators",
    "indicators.add": "Add Indicator",
    "indicators.none_added": "No indicators added",
    "indicators.settings": "Settings",
    "indicators.remove": "Remove",
    "indicators.close": "Close",
    "indicators.settings_title": "{name} Settings",
    "indicators.field.period": "Period",
    "indicators.field.lineWidth": "Line Width",
    "indicators.field.color": "Color",
    "indicators.field.stddev": "StdDev",
    "indicators.field.upperColor": "Upper Color",
    "indicators.field.middleColor": "Middle Color",
    "indicators.field.lowerColor": "Lower Color",
    "indicators.field.fast": "Fast",
    "indicators.field.slow": "Slow",
    "indicators.field.signal": "Signal",
    "indicators.field.macdColor": "MACD Color",
    "indicators.field.signalColor": "Signal Color",
    "indicators.field.histPosColor": "Hist Up",
    "indicators.field.histNegColor": "Hist Down",
    "prediction.title": "Prediction",
    "prediction.long": "Long",
    "prediction.short": "Short",
    "prediction.mode": "Prediction Type",
    "prediction.modeLong": "Long Position",
    "prediction.modeShort": "Short Position",
    "prediction.entryLimit": "Entry Price (Limit)",
    "prediction.margin": "Margin / Cost (USDT)",
    "prediction.leverage": "Leverage (x)",
    "prediction.slPrice": "Stop Loss Price",
    "prediction.tpPrice": "Take Profit Price",
    "prediction.priority": "Same-Bar Priority",
    "prediction.stopFirst": "Stop First",
    "prediction.takeFirst": "Take First",
    "prediction.submit": "Submit Prediction",
    "prediction.invalid_entry": "Please enter a valid entry price (Limit).",
    "prediction.invalid_margin": "Please enter a valid margin amount (USDT).",
    "prediction.invalid_leverage": "Leverage must be between 3x and 100x.",
    "prediction.invalid_sl_tp": "Please enter valid SL/TP prices.",
    "prediction.long_rule": "Long rule: SL < Entry < TP.",
    "prediction.short_rule": "Short rule: TP < Entry < SL.",
    "prediction.metrics_line1": "SL: {sl}%   TP: {tp}%   RR: 1:{rr}",
    "prediction.metrics_line2": "Notional: {notional} U   Qty: {qty}",
    "prediction.metrics_line3": "At TP: {tpPnl} U ({tpRoi}%)",
    "prediction.metrics_line4": "At SL: {slPnl} U ({slRoi}%)",
    "prediction.metrics_line5": "Default Costs: Fee {feeBps}bps + Slippage {slippageBps}bps",
    "prediction.metrics_line6": "Net at TP: {tpNet} U ({tpNetRoi}%) | Net at SL: {slNet} U ({slNetRoi}%)",
    "prediction.metrics_hint": "Set Entry/SL/TP to calculate RR.",
    "replay.title": "Replay Control",
    "replay.step1": "Step +1",
    "replay.step5": "Step +5",
    "replay.play": "Replay",
    "replay.pause": "Pause",
    "replay.speed": "Speed (ms)",
    "result.title": "Result",
    "result.no_session": "No session yet.",
    "status.title": "Status",
    "status.ready": "Ready",
    "status.loading_market": "Loading market metadata...",
    "status.no_local_data": "No local data. Download Binance/OKX candles first.",
    "status.current_pair_no_tf": "Current pair has no timeframe data.",
    "status.range_loaded": "Range loaded: {start} -> {end}",
    "status.creating_session": "Creating replay session...",
    "status.session_created": "Session created.",
    "status.random_refreshed": "Random K-line refreshed.",
    "status.submitting_prediction": "Submitting prediction...",
    "status.prediction_submitted": "Prediction submitted. Entry {entry} | RR 1:{rr}",
    "status.account_created": "Account created: {name}",
    "status.account_deleted": "Account deleted: {name}",
    "status.account_failed": "Account action failed: {err}",
    "status.auto_play_started": "Auto play started ({speed}ms)",
    "status.paused": "Paused",
    "status.replay_finished": "Replay finished.",
    "status.create_failed": "Create failed: {err}",
    "status.refresh_failed": "Refresh failed: {err}",
    "status.prediction_failed": "Prediction failed: {err}",
    "status.chart_no_session": "Session not ready. Creating one...",
    "status.chart_locked": "A prediction is already submitted. Refresh random K-line first.",
    "status.chart_ready_long": "Default long 1:1 is set. Drag ENTRY/SL/TP to fine tune.",
    "status.chart_ready_short": "Default short 1:1 is set. Drag ENTRY/SL/TP to fine tune.",
    "status.replay_preparing": "Creating session and submitting prediction...",
    "status.step_failed": "Step failed: {err}",
    "status.play_failed": "Play failed: {err}",
    "status.indicator_failed": "Indicator failed: {err}",
    "status.preload_failed": "Preload failed: {err}",
    "status.init_failed": "Init failed: {err}",
    "status.init_no_data_hint":
      "No historical candles found.\\n\\nRun downloader script:\\npython backend/app/scripts/download_history.py --exchange binance --pair BTC/USDT --timeframe 1h --start 2024-01-01T00:00:00Z --end 2025-01-01T00:00:00Z",
    "error.invalid_date_range": "Invalid date range.",
    "error.create_session_first": "Create session first.",
    "error.account_required": "Select an account first.",
    "overlay.long_position": "Long Position",
    "overlay.short_position": "Short Position",
    "overlay.replaying": "Replaying",
    "overlay.hit_tp": "Hit Take Profit",
    "overlay.hit_sl": "Hit Stop Loss",
    "overlay.liquidation": "Liquidated",
    "overlay.unfilled": "Entry Not Filled",
    "overlay.end_of_data": "Closed at End of Data",
    "overlay.waiting_entry": "Waiting for Entry Fill",
    "overlay.margin_leverage": "Margin / Leverage",
    "overlay.target_rr": "Target RR",
    "overlay.live_r": "Live R",
    "overlay.live_pnl": "Live PNL (U)",
    "overlay.live_roi": "Live ROI",
    "overlay.final_gross_pnl": "Final Gross PNL (U)",
    "overlay.final_cost": "Final Costs (U)",
    "overlay.final_pnl": "Final PNL (U)",
    "overlay.final_roi": "Final ROI",
    "overlay.current_status": "Status",
    "hover.prefix": "Hover",
  },
};

const el = {
  accountPicker: document.getElementById("accountPicker"),
  accountPickerBtn: document.getElementById("accountPickerBtn"),
  accountMenu: document.getElementById("accountMenu"),
  newAccountBtn: document.getElementById("newAccountBtn"),
  pair: document.getElementById("pairSelect"),
  timeframe: document.getElementById("timeframeSelect"),
  startDate: document.getElementById("startDate"),
  endDate: document.getElementById("endDate"),
  visibleBars: document.getElementById("visibleBars"),
  refreshRandomBtn: document.getElementById("refreshRandomBtn"),
  langSelect: document.getElementById("langSelect"),
  indicatorSelect: document.getElementById("indicatorSelect"),
  addIndicatorBtn: document.getElementById("addIndicatorBtn"),
  indicatorsPanel: document.getElementById("indicatorsPanel"),
  playBtn: document.getElementById("playBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  speedMs: document.getElementById("speedMs"),
  predictionModeSelect: document.getElementById("predictionModeSelect"),
  entryPriceLimit: document.getElementById("entryPriceLimit"),
  marginUsdt: document.getElementById("marginUsdt"),
  leverage: document.getElementById("leverage"),
  slPrice: document.getElementById("slPrice"),
  tpPrice: document.getElementById("tpPrice"),
  prioritySelect: document.getElementById("prioritySelect"),
  predictionMetrics: document.getElementById("predictionMetrics"),
  statusBox: document.getElementById("statusBox"),
  resultBox: document.getElementById("resultBox"),
  positionOverlay: document.getElementById("positionOverlay"),
  accountStatsBox: document.getElementById("accountStatsBox"),
};

const priceContainer = document.getElementById("priceChart");
const indicatorContainer = document.getElementById("indicatorChart");
state.lang = localStorage.getItem(LANG_STORAGE_KEY) === "en" ? "en" : "zh";

function setupAccountDropdown() {
  if (!el.accountMenu) {
    return;
  }
  if (el.accountMenu.parentElement !== document.body) {
    document.body.appendChild(el.accountMenu);
    el.accountMenu.hidden = true;
    el.accountMenu.style.display = "none";
  }

  const styleId = "account-dropdown-runtime-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      #accountMenu {
        position: fixed;
        z-index: 1000;
        min-width: 240px;
        max-height: 260px;
        overflow-y: auto;
        border: 1px solid #2f4256;
        border-radius: 10px;
        background: #0f1b26;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
      }
      #accountMenu[hidden] { display: none !important; }
      #accountMenu .account-menu-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 6px 8px;
        border-bottom: 1px solid rgba(66, 88, 109, 0.35);
      }
      #accountMenu .account-menu-item:last-child { border-bottom: 0; }
      #accountMenu .account-menu-item.is-selected { background: rgba(40, 70, 98, 0.45); }
      #accountMenu .account-menu-select {
        flex: 1 1 auto;
        border: 0;
        background: transparent;
        color: #d6e2f0;
        text-align: left;
        padding: 4px 2px;
        cursor: pointer;
      }
      #accountMenu .account-menu-select:hover { color: #f1f6fc; }
      #accountMenu .account-menu-delete {
        width: 24px;
        height: 24px;
        border: 1px solid #3b5268;
        border-radius: 6px;
        background: #142433;
        color: #b9ccdf;
        line-height: 1;
        cursor: pointer;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.12s ease;
      }
      #accountMenu .account-menu-item:hover .account-menu-delete {
        opacity: 1;
        pointer-events: auto;
      }
      #accountMenu .account-menu-delete:hover {
        background: #24374a;
        color: #ffb1b1;
      }
      #accountMenu .account-menu-empty {
        padding: 10px;
        color: #90a6bc;
        font-size: 0.83rem;
      }
    `;
    document.head.appendChild(style);
  }
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function resolveUnixTime(time) {
  if (typeof time === "number") {
    return time;
  }
  if (!time || typeof time !== "object") {
    return null;
  }
  if (typeof time.timestamp === "number") {
    return time.timestamp;
  }
  if (typeof time.year === "number" && typeof time.month === "number" && typeof time.day === "number") {
    return Math.floor(Date.UTC(time.year, time.month - 1, time.day) / 1000);
  }
  return null;
}

function formatDateTime(ts) {
  const date = new Date(ts * 1000);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatHourMinute(ts) {
  const date = new Date(ts * 1000);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function t(key, vars = {}) {
  const dict = I18N[state.lang] || I18N.zh;
  const fallback = I18N.zh[key] ?? key;
  const raw = dict[key] ?? fallback;
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

function applyI18n() {
  document.documentElement.lang = state.lang === "en" ? "en" : "zh-CN";
  if (el.langSelect) {
    el.langSelect.value = state.lang;
  }
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (key) {
      node.textContent = t(key);
    }
  });
  document.querySelectorAll("[data-i18n-title]").forEach((node) => {
    const key = node.getAttribute("data-i18n-title");
    if (key) {
      node.setAttribute("title", t(key));
    }
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    const key = node.getAttribute("data-i18n-aria");
    if (key) {
      node.setAttribute("aria-label", t(key));
    }
  });
  const locale = state.lang === "en" ? "en-US" : "zh-CN";
  priceChart.applyOptions({
    localization: {
      locale,
      timeFormatter: (time) => {
        const ts = resolveUnixTime(time);
        return ts ? formatDateTime(ts) : "";
      },
    },
  });
  indicatorChart.applyOptions({
    localization: {
      locale,
      timeFormatter: (time) => {
        const ts = resolveUnixTime(time);
        return ts ? formatDateTime(ts) : "";
      },
    },
  });
}

function setLang(lang) {
  state.lang = lang === "en" ? "en" : "zh";
  try {
    localStorage.setItem(LANG_STORAGE_KEY, state.lang);
  } catch (_) {
    // ignore
  }
  applyI18n();
  renderIndicatorsPanel();
  renderPredictionMetrics();
  if (el.accountStatsBox) {
    el.accountStatsBox.textContent = formatAccountStats(state.accountStats);
  }
  void loadAccounts(getSelectedAccountId()).catch(() => {
    // ignore i18n refresh failures for account list
  });
  if (state.session) {
    updatePositionOverlay(state.session);
    el.resultBox.textContent = formatResult(state.session);
  } else {
    el.resultBox.textContent = t("result.no_session");
    setStatus(t("status.ready"));
  }
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, n));
}

function indicatorTitle(name) {
  return String(name || "").toUpperCase();
}

function defaultIndicatorConfig(name) {
  const id = `ind_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
  if (name === "sma") {
    return {
      id,
      name,
      params: { period: 20 },
      style: { pane: "price", color: "#f4b400", lineWidth: 2 },
    };
  }
  if (name === "ema") {
    return {
      id,
      name,
      params: { period: 50 },
      style: { pane: "price", color: "#42a5f5", lineWidth: 2 },
    };
  }
  if (name === "boll") {
    return {
      id,
      name,
      params: { period: 20, stddev: 2.0 },
      style: {
        pane: "price",
        lineWidth: 2,
        upperColor: "#f4b400",
        middleColor: "#42a5f5",
        lowerColor: "#ff8a65",
      },
    };
  }
  if (name === "rsi") {
    return {
      id,
      name,
      params: { period: 14 },
      style: { pane: "indicator", color: "#66bb6a", lineWidth: 2 },
    };
  }
  return {
    id,
    name: "macd",
    params: { fast: 12, slow: 26, signal: 9 },
    style: {
      pane: "indicator",
      lineWidth: 2,
      macdColor: "#42a5f5",
      signalColor: "#f4b400",
      histPosColor: "#26a69a",
      histNegColor: "#ef5350",
    },
  };
}

function sanitizeIndicatorConfig(raw) {
  const name = String(raw?.name || "").toLowerCase();
  if (!INDICATOR_NAMES.includes(name)) {
    return null;
  }
  const base = defaultIndicatorConfig(name);
  const cfg = {
    id: typeof raw?.id === "string" && raw.id ? raw.id : base.id,
    name,
    params: { ...base.params, ...(raw?.params || {}) },
    style: { ...base.style, ...(raw?.style || {}) },
  };
  if ("period" in cfg.params) {
    cfg.params.period = Math.round(clampNumber(cfg.params.period, 1, 500, base.params.period));
  }
  if ("fast" in cfg.params) {
    cfg.params.fast = Math.round(clampNumber(cfg.params.fast, 1, 200, base.params.fast));
  }
  if ("slow" in cfg.params) {
    cfg.params.slow = Math.round(clampNumber(cfg.params.slow, 1, 500, base.params.slow));
  }
  if ("signal" in cfg.params) {
    cfg.params.signal = Math.round(clampNumber(cfg.params.signal, 1, 200, base.params.signal));
  }
  if ("stddev" in cfg.params) {
    cfg.params.stddev = clampNumber(cfg.params.stddev, 0.1, 10.0, base.params.stddev);
  }
  cfg.style.lineWidth = Math.round(clampNumber(cfg.style.lineWidth, 1, 4, base.style.lineWidth || 2));
  return cfg;
}

function saveIndicatorConfigs() {
  try {
    localStorage.setItem(INDICATOR_STORAGE_KEY, JSON.stringify(state.indicatorConfigs));
  } catch (_) {
    // ignore storage failures
  }
}

function loadIndicatorConfigs() {
  try {
    const raw = localStorage.getItem(INDICATOR_STORAGE_KEY);
    if (!raw) {
      state.indicatorConfigs = [];
      return;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      state.indicatorConfigs = [];
      return;
    }
    state.indicatorConfigs = parsed.map(sanitizeIndicatorConfig).filter((x) => x);
  } catch (_) {
    state.indicatorConfigs = [];
  }
}

function queueRefreshIndicators() {
  if (state.indicatorRefreshTimer) {
    clearTimeout(state.indicatorRefreshTimer);
  }
  state.indicatorRefreshTimer = setTimeout(async () => {
    try {
      await refreshIndicators();
    } catch (err) {
      setStatus(t("status.indicator_failed", { err: err.message || err }));
    }
  }, 120);
}

function updateIndicatorConfig(id, patcher) {
  const idx = state.indicatorConfigs.findIndex((it) => it.id === id);
  if (idx < 0) {
    return;
  }
  const current = JSON.parse(JSON.stringify(state.indicatorConfigs[idx]));
  const next = patcher(current);
  const safe = sanitizeIndicatorConfig(next);
  if (!safe) {
    return;
  }
  state.indicatorConfigs[idx] = safe;
  saveIndicatorConfigs();
  queueRefreshIndicators();
}

function removeIndicatorConfig(id) {
  state.indicatorConfigs = state.indicatorConfigs.filter((it) => it.id !== id);
  if (state.indicatorEditingId === id) {
    state.indicatorEditingId = null;
  }
  saveIndicatorConfigs();
  renderIndicatorsPanel();
  queueRefreshIndicators();
}

function addIndicatorConfig(name) {
  const cfg = sanitizeIndicatorConfig(defaultIndicatorConfig(name));
  if (!cfg) {
    return;
  }
  state.indicatorConfigs.push(cfg);
  saveIndicatorConfigs();
  renderIndicatorsPanel();
  queueRefreshIndicators();
}

function makeNumberField({ label, value, min, max, step, onChange }) {
  const wrap = document.createElement("div");
  wrap.className = "indicator-field";
  const lab = document.createElement("label");
  lab.textContent = label;
  const input = document.createElement("input");
  input.type = "number";
  if (min != null) {
    input.min = String(min);
  }
  if (max != null) {
    input.max = String(max);
  }
  if (step != null) {
    input.step = String(step);
  }
  input.value = String(value);
  input.addEventListener("input", () => onChange(input.value));
  wrap.appendChild(lab);
  wrap.appendChild(input);
  return wrap;
}

function makeColorField({ label, value, onChange }) {
  const wrap = document.createElement("div");
  wrap.className = "indicator-field";
  const lab = document.createElement("label");
  lab.textContent = label;
  const input = document.createElement("input");
  input.type = "color";
  input.value = String(value || "#42a5f5");
  input.addEventListener("input", () => onChange(input.value));
  wrap.appendChild(lab);
  wrap.appendChild(input);
  return wrap;
}

function indicatorChipLabel(cfg) {
  if (cfg.name === "sma" || cfg.name === "ema" || cfg.name === "rsi") {
    return `${indicatorTitle(cfg.name)}(${cfg.params.period})`;
  }
  if (cfg.name === "boll") {
    return `BOLL(${cfg.params.period},${cfg.params.stddev})`;
  }
  if (cfg.name === "macd") {
    return `MACD(${cfg.params.fast},${cfg.params.slow},${cfg.params.signal})`;
  }
  return indicatorTitle(cfg.name);
}

function buildIndicatorEditor(cfg) {
  const editor = document.createElement("div");
  editor.className = "indicator-editor";
  const head = document.createElement("div");
  head.className = "indicator-editor-head";
  const title = document.createElement("div");
  title.className = "indicator-editor-title";
  title.textContent = t("indicators.settings_title", { name: indicatorChipLabel(cfg) });
  const closeBtn = document.createElement("button");
  closeBtn.className = "indicator-pill-btn";
  closeBtn.textContent = t("indicators.close");
  closeBtn.addEventListener("click", () => {
    state.indicatorEditingId = null;
    renderIndicatorsPanel();
  });
  head.appendChild(title);
  head.appendChild(closeBtn);
  editor.appendChild(head);

  const grid = document.createElement("div");
  grid.className = "indicator-grid";

  if (cfg.name === "sma" || cfg.name === "ema" || cfg.name === "rsi") {
    grid.appendChild(
        makeNumberField({
          label: t("indicators.field.period"),
        value: cfg.params.period,
        min: 1,
        max: 500,
        step: 1,
        onChange: (value) =>
          updateIndicatorConfig(cfg.id, (next) => {
            next.params.period = value;
            return next;
          }),
      })
    );
    grid.appendChild(
        makeNumberField({
          label: t("indicators.field.lineWidth"),
        value: cfg.style.lineWidth || 2,
        min: 1,
        max: 4,
        step: 1,
        onChange: (value) =>
          updateIndicatorConfig(cfg.id, (next) => {
            next.style.lineWidth = value;
            return next;
          }),
      })
    );
    grid.appendChild(
        makeColorField({
          label: t("indicators.field.color"),
        value: cfg.style.color || "#42a5f5",
        onChange: (value) =>
          updateIndicatorConfig(cfg.id, (next) => {
            next.style.color = value;
            return next;
          }),
      })
    );
  } else if (cfg.name === "boll") {
    grid.appendChild(
        makeNumberField({
          label: t("indicators.field.period"),
        value: cfg.params.period,
        min: 1,
        max: 500,
        step: 1,
        onChange: (value) =>
          updateIndicatorConfig(cfg.id, (next) => {
            next.params.period = value;
            return next;
          }),
      })
    );
    grid.appendChild(
        makeNumberField({
          label: t("indicators.field.stddev"),
        value: cfg.params.stddev,
        min: 0.1,
        max: 10,
        step: 0.1,
        onChange: (value) =>
          updateIndicatorConfig(cfg.id, (next) => {
            next.params.stddev = value;
            return next;
          }),
      })
    );
    grid.appendChild(
        makeNumberField({
          label: t("indicators.field.lineWidth"),
        value: cfg.style.lineWidth || 2,
        min: 1,
        max: 4,
        step: 1,
        onChange: (value) =>
          updateIndicatorConfig(cfg.id, (next) => {
            next.style.lineWidth = value;
            return next;
          }),
      })
    );
    grid.appendChild(
        makeColorField({
          label: t("indicators.field.upperColor"),
        value: cfg.style.upperColor || "#f4b400",
        onChange: (value) =>
          updateIndicatorConfig(cfg.id, (next) => {
            next.style.upperColor = value;
            return next;
          }),
      })
    );
    grid.appendChild(
        makeColorField({
          label: t("indicators.field.middleColor"),
        value: cfg.style.middleColor || "#42a5f5",
        onChange: (value) =>
          updateIndicatorConfig(cfg.id, (next) => {
            next.style.middleColor = value;
            return next;
          }),
      })
    );
    grid.appendChild(
        makeColorField({
          label: t("indicators.field.lowerColor"),
        value: cfg.style.lowerColor || "#ff8a65",
        onChange: (value) =>
          updateIndicatorConfig(cfg.id, (next) => {
            next.style.lowerColor = value;
            return next;
          }),
      })
    );
  } else if (cfg.name === "macd") {
    grid.appendChild(
        makeNumberField({
          label: t("indicators.field.fast"),
        value: cfg.params.fast,
        min: 1,
        max: 200,
        step: 1,
        onChange: (value) =>
          updateIndicatorConfig(cfg.id, (next) => {
            next.params.fast = value;
            return next;
          }),
      })
    );
    grid.appendChild(
        makeNumberField({
          label: t("indicators.field.slow"),
        value: cfg.params.slow,
        min: 1,
        max: 500,
        step: 1,
        onChange: (value) =>
          updateIndicatorConfig(cfg.id, (next) => {
            next.params.slow = value;
            return next;
          }),
      })
    );
    grid.appendChild(
        makeNumberField({
          label: t("indicators.field.signal"),
        value: cfg.params.signal,
        min: 1,
        max: 200,
        step: 1,
        onChange: (value) =>
          updateIndicatorConfig(cfg.id, (next) => {
            next.params.signal = value;
            return next;
          }),
      })
    );
    grid.appendChild(
        makeNumberField({
          label: t("indicators.field.lineWidth"),
        value: cfg.style.lineWidth || 2,
        min: 1,
        max: 4,
        step: 1,
        onChange: (value) =>
          updateIndicatorConfig(cfg.id, (next) => {
            next.style.lineWidth = value;
            return next;
          }),
      })
    );
    grid.appendChild(
        makeColorField({
          label: t("indicators.field.macdColor"),
        value: cfg.style.macdColor || "#42a5f5",
        onChange: (value) =>
          updateIndicatorConfig(cfg.id, (next) => {
            next.style.macdColor = value;
            return next;
          }),
      })
    );
    grid.appendChild(
        makeColorField({
          label: t("indicators.field.signalColor"),
        value: cfg.style.signalColor || "#f4b400",
        onChange: (value) =>
          updateIndicatorConfig(cfg.id, (next) => {
            next.style.signalColor = value;
            return next;
          }),
      })
    );
    grid.appendChild(
        makeColorField({
          label: t("indicators.field.histPosColor"),
        value: cfg.style.histPosColor || "#26a69a",
        onChange: (value) =>
          updateIndicatorConfig(cfg.id, (next) => {
            next.style.histPosColor = value;
            return next;
          }),
      })
    );
    grid.appendChild(
        makeColorField({
          label: t("indicators.field.histNegColor"),
        value: cfg.style.histNegColor || "#ef5350",
        onChange: (value) =>
          updateIndicatorConfig(cfg.id, (next) => {
            next.style.histNegColor = value;
            return next;
          }),
      })
    );
  }
  editor.appendChild(grid);
  return editor;
}

function renderIndicatorsPanel() {
  if (!el.indicatorsPanel) {
    return;
  }
  el.indicatorsPanel.innerHTML = "";
  if (state.indicatorConfigs.length === 0) {
    const hint = document.createElement("div");
    hint.className = "indicator-hint";
    hint.textContent = t("indicators.none_added");
    el.indicatorsPanel.appendChild(hint);
    return;
  }

  const row = document.createElement("div");
  row.className = "indicators-row";

  for (const cfg of state.indicatorConfigs) {
    const pill = document.createElement("div");
    pill.className = "indicator-pill";
    const text = document.createElement("span");
    text.className = "indicator-pill-text";
    text.textContent = indicatorChipLabel(cfg);
    const actions = document.createElement("div");
    actions.className = "indicator-pill-actions";

    const settingsBtn = document.createElement("button");
    settingsBtn.className = "indicator-pill-btn";
    settingsBtn.textContent = t("indicators.settings");
    settingsBtn.addEventListener("click", () => {
      state.indicatorEditingId = state.indicatorEditingId === cfg.id ? null : cfg.id;
      renderIndicatorsPanel();
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "indicator-pill-btn";
    removeBtn.textContent = t("indicators.remove");
    removeBtn.addEventListener("click", () => removeIndicatorConfig(cfg.id));

    actions.appendChild(settingsBtn);
    actions.appendChild(removeBtn);
    pill.appendChild(text);
    pill.appendChild(actions);
    row.appendChild(pill);
  }

  el.indicatorsPanel.appendChild(row);
  const editingCfg = state.indicatorConfigs.find((it) => it.id === state.indicatorEditingId);
  if (editingCfg) {
    el.indicatorsPanel.appendChild(buildIndicatorEditor(editingCfg));
  }
}

const priceChart = LightweightCharts.createChart(priceContainer, {
  layout: {
    background: { color: "#0d1721" },
    textColor: "#9db2c8",
  },
  grid: {
    vertLines: { color: "rgba(70,95,121,0.3)" },
    horzLines: { color: "rgba(70,95,121,0.3)" },
  },
  rightPriceScale: { borderColor: "#2a3e52", minimumWidth: 90 },
  timeScale: {
    borderColor: "#2a3e52",
    timeVisible: true,
    secondsVisible: false,
    tickMarkFormatter: (time) => {
      const ts = resolveUnixTime(time);
      return ts ? formatHourMinute(ts) : "";
    },
  },
  localization: {
    locale: "zh-CN",
    timeFormatter: (time) => {
      const ts = resolveUnixTime(time);
      return ts ? formatDateTime(ts) : "";
    },
  },
  crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
});

const indicatorChart = LightweightCharts.createChart(indicatorContainer, {
  layout: {
    background: { color: "#0d1721" },
    textColor: "#8ca2bb",
  },
  grid: {
    vertLines: { color: "rgba(70,95,121,0.25)" },
    horzLines: { color: "rgba(70,95,121,0.25)" },
  },
  rightPriceScale: { borderColor: "#2a3e52", minimumWidth: 90 },
  timeScale: {
    borderColor: "#2a3e52",
    timeVisible: true,
    secondsVisible: false,
    tickMarkFormatter: (time) => {
      const ts = resolveUnixTime(time);
      return ts ? formatHourMinute(ts) : "";
    },
  },
  localization: {
    locale: "zh-CN",
    timeFormatter: (time) => {
      const ts = resolveUnixTime(time);
      return ts ? formatDateTime(ts) : "";
    },
  },
});

const candleSeries = priceChart.addSeries(LightweightCharts.CandlestickSeries, {
  upColor: "#26a69a",
  downColor: "#ef5350",
  borderVisible: false,
  wickUpColor: "#26a69a",
  wickDownColor: "#ef5350",
});

const volumeSeries = priceChart.addSeries(LightweightCharts.HistogramSeries, {
  priceFormat: { type: "volume" },
  priceScaleId: "",
  color: "#294565",
  lastValueVisible: false,
  priceLineVisible: false,
});
volumeSeries.priceScale().applyOptions({
  scaleMargins: {
    top: 0.82,
    bottom: 0,
  },
});

priceChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
  if (
    !range ||
    !Number.isFinite(range.from) ||
    !Number.isFinite(range.to) ||
    state.isRangeSyncing ||
    state.subIndicatorSeries.length === 0
  ) {
    return;
  }
  state.isRangeSyncing = true;
  try {
    try {
      indicatorChart.timeScale().setVisibleLogicalRange(range);
    } catch (_err) {
      // Ignore transient pane sync errors (e.g. indicator pane has no ready data yet).
    }
  } finally {
    state.isRangeSyncing = false;
  }
});

indicatorChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
  if (
    !range ||
    !Number.isFinite(range.from) ||
    !Number.isFinite(range.to) ||
    state.isRangeSyncing ||
    state.isRefreshingIndicators
  ) {
    return;
  }
  state.isRangeSyncing = true;
  try {
    priceChart.timeScale().setVisibleLogicalRange(range);
  } finally {
    state.isRangeSyncing = false;
  }
});

function syncIndicatorRangeFromPrice() {
  if (state.subIndicatorSeries.length === 0) {
    return;
  }
  const range = priceChart.timeScale().getVisibleLogicalRange();
  if (!range || !Number.isFinite(range.from) || !Number.isFinite(range.to)) {
    return;
  }
  state.isRangeSyncing = true;
  try {
    try {
      indicatorChart.timeScale().setVisibleLogicalRange(range);
    } catch (_err) {
      // Ignore transient pane sync errors (e.g. indicator pane has no ready data yet).
    }
  } finally {
    state.isRangeSyncing = false;
  }
}

function applyTimeRange(range) {
  if (!range || !Number.isFinite(range.from) || !Number.isFinite(range.to) || range.to <= range.from) {
    return;
  }
  state.isRangeSyncing = true;
  try {
    priceChart.timeScale().setVisibleRange(range);
    const logical = priceChart.timeScale().getVisibleLogicalRange();
    if (
      state.subIndicatorSeries.length > 0 &&
      logical &&
      Number.isFinite(logical.from) &&
      Number.isFinite(logical.to)
    ) {
      try {
        indicatorChart.timeScale().setVisibleLogicalRange(logical);
      } catch (_err) {
        // Ignore transient pane sync errors (e.g. indicator pane has no ready data yet).
      }
    }
  } finally {
    state.isRangeSyncing = false;
  }
}

function centerLatestForReplayStart(session) {
  const bars = session?.bars || [];
  if (!bars.length) {
    return;
  }
  const latestLogical = bars.length - 1;
  if (!Number.isFinite(latestLogical) || latestLogical < 0) {
    return;
  }

  let span = Math.max(20, Number(session?.visible_bars || el.visibleBars?.value || 120));
  const existing = priceChart.timeScale().getVisibleLogicalRange();
  if (existing && Number.isFinite(existing.from) && Number.isFinite(existing.to)) {
    const existingSpan = Number(existing.to) - Number(existing.from);
    if (Number.isFinite(existingSpan) && existingSpan > 0) {
      span = existingSpan;
    }
  }
  const leftRatio = 0.4;
  const from = latestLogical - span * leftRatio;
  const to = from + span;

  state.isRangeSyncing = true;
  try {
    priceChart.timeScale().setVisibleLogicalRange({
      from,
      to,
    });
  } finally {
    state.isRangeSyncing = false;
  }
  syncIndicatorRangeFromPrice();
}

function formatIndicatorHover(ts) {
  const chunks = [];
  for (const seriesId of state.subIndicatorOrder) {
    const rec = state.indicatorValueMaps.get(seriesId);
    if (!rec) {
      continue;
    }
    const value = rec.values.get(ts);
    if (value == null) {
      continue;
    }
    chunks.push(`${rec.label || seriesId}:${Number(value).toFixed(4)}`);
  }
  return chunks.join(" | ");
}

function showHoverStatus(ts, candle) {
  if (!candle) {
    return;
  }
  const base = `${t("hover.prefix")} ${formatDateTime(ts)} | O:${Number(candle.open).toFixed(4)} H:${Number(candle.high).toFixed(4)} L:${Number(candle.low).toFixed(4)} C:${Number(candle.close).toFixed(4)}`;
  const sub = formatIndicatorHover(ts);
  setStatus(sub ? `${base} | ${sub}` : base);
}

function syncCrosshairToPrice(ts) {
  if (typeof priceChart.setCrosshairPosition !== "function") {
    return;
  }
  const candle = state.barsByTime.get(ts);
  if (!candle) {
    return;
  }
  state.isCrosshairSyncing = true;
  try {
    priceChart.setCrosshairPosition(Number(candle.close), ts, candleSeries);
  } finally {
    state.isCrosshairSyncing = false;
  }
}

function syncCrosshairToIndicator(ts) {
  if (typeof indicatorChart.setCrosshairPosition !== "function") {
    return;
  }
  const targetSeries = state.subIndicatorSeries[0];
  if (!targetSeries) {
    return;
  }
  let value = null;
  for (const seriesId of state.subIndicatorOrder) {
    const rec = state.indicatorValueMaps.get(seriesId);
    const maybe = rec?.values.get(ts);
    if (maybe != null) {
      value = Number(maybe);
      break;
    }
  }
  if (value == null) {
    return;
  }
  state.isCrosshairSyncing = true;
  try {
    indicatorChart.setCrosshairPosition(value, ts, targetSeries);
  } finally {
    state.isCrosshairSyncing = false;
  }
}

function clearSyncedCrosshair(source) {
  if (source !== "price" && typeof priceChart.clearCrosshairPosition === "function") {
    priceChart.clearCrosshairPosition();
  }
  if (source !== "indicator" && typeof indicatorChart.clearCrosshairPosition === "function") {
    indicatorChart.clearCrosshairPosition();
  }
}

function onCrosshairMove(source, param) {
  if (state.isCrosshairSyncing) {
    return;
  }
  const ts = resolveUnixTime(param.time);
  if (!ts) {
    clearSyncedCrosshair(source);
    return;
  }

  const candle = param.seriesData?.get(candleSeries) || state.barsByTime.get(ts);
  showHoverStatus(ts, candle);
  if (source === "price") {
    syncCrosshairToIndicator(ts);
  } else {
    syncCrosshairToPrice(ts);
  }
}

priceChart.subscribeCrosshairMove((param) => onCrosshairMove("price", param));
indicatorChart.subscribeCrosshairMove((param) => onCrosshairMove("indicator", param));

function setStatus(text) {
  el.statusBox.textContent = text;
}

function getSideValue() {
  return el.predictionModeSelect?.value === "short" ? "short" : "long";
}

function toNumberOrNull(value) {
  if (value == null || value === "") {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function setSideValue(side) {
  const next = side === "short" ? "short" : "long";
  if (el.predictionModeSelect) {
    el.predictionModeSelect.value = next;
  }
}

function formatInputPrice(price) {
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) {
    return "";
  }
  if (n >= 1000) {
    return n.toFixed(2);
  }
  if (n >= 1) {
    return n.toFixed(4);
  }
  return n.toFixed(8);
}

function clearChartPredictionPlacementMode() {
  // no-op: kept for compatibility with previous flow
}

function getLastVisibleClosePrice() {
  return Number(state.session?.bars?.[state.session?.bars?.length - 1]?.close ?? NaN);
}

function canUseChartPredictionTool() {
  if (!state.session) {
    setStatus(t("status.chart_no_session"));
    return false;
  }
  if (state.session.prediction) {
    setStatus(t("status.chart_locked"));
    return false;
  }
  return true;
}

function seedPredictionInputs(side, entryPrice, rrRatio = DEFAULT_RR) {
  const entry = Number(entryPrice);
  if (!Number.isFinite(entry) || entry <= 0) {
    return false;
  }
  const slFactor = DEFAULT_SL_PCT / 100;
  const tpFactor = (DEFAULT_SL_PCT * Math.max(0.1, Number(rrRatio) || DEFAULT_RR)) / 100;
  let stop = 0;
  let take = 0;

  if (side === "short") {
    stop = entry * (1 + slFactor);
    take = entry * (1 - tpFactor);
  } else {
    stop = entry * (1 - slFactor);
    take = entry * (1 + tpFactor);
  }

  setSideValue(side);
  el.entryPriceLimit.value = formatInputPrice(entry);
  el.slPrice.value = formatInputPrice(stop);
  el.tpPrice.value = formatInputPrice(take);
  normalizeSlTpForSide();
  renderPredictionMetrics();
  setStatus(t(side === "short" ? "status.chart_ready_short" : "status.chart_ready_long"));
  return true;
}

function applyPredictionModePreset(force = false) {
  const side = getSideValue();
  if (!side) {
    return;
  }
  if (!state.session || !state.session.bars?.length) {
    return;
  }
  if (state.session.prediction) {
    setStatus(t("status.chart_locked"));
    return;
  }
  if (!force) {
    const current = computePredictionPreview();
    if (current.ok) {
      renderPredictionMetrics();
      return;
    }
  }
  const ref = getLastVisibleClosePrice();
  if (!Number.isFinite(ref) || ref <= 0) {
    return;
  }
  seedPredictionInputs(side, ref, 1.0);
}

function getPredictionFutureStepSeconds(session) {
  const tf = String(session?.timeframe || "");
  const mapped = TIMEFRAME_SECONDS[tf];
  if (Number.isFinite(mapped) && mapped > 0) {
    return mapped;
  }
  const bars = session?.bars || [];
  if (bars.length >= 2) {
    const last = Number(bars[bars.length - 1]?.time);
    const prev = Number(bars[bars.length - 2]?.time);
    const delta = last - prev;
    if (Number.isFinite(delta) && delta > 0) {
      return delta;
    }
  }
  return 3600;
}

function getChartPriceByClientY(clientY) {
  const rect = priceContainer.getBoundingClientRect();
  const y = clientY - rect.top;
  if (y < 0 || y > rect.height) {
    return null;
  }
  const price = candleSeries.coordinateToPrice(y);
  return Number.isFinite(price) && price > 0 ? Number(price) : null;
}

function getPredictionGuideHandle(clientY) {
  const entry = toNumberOrNull(el.entryPriceLimit.value);
  const stop = toNumberOrNull(el.slPrice.value);
  const take = toNumberOrNull(el.tpPrice.value);
  if (!entry || !stop || !take) {
    return null;
  }

  const rect = priceContainer.getBoundingClientRect();
  const y = clientY - rect.top;
  const candidates = [
    { id: "entry", price: entry },
    { id: "stop", price: stop },
    { id: "take", price: take },
  ];

  let best = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const item of candidates) {
    const coordinate = candleSeries.priceToCoordinate(item.price);
    if (!Number.isFinite(coordinate)) {
      continue;
    }
    const dist = Math.abs(Number(coordinate) - y);
    if (dist < bestDist) {
      best = item.id;
      bestDist = dist;
    }
  }
  return bestDist <= 10 ? best : null;
}

function applyPredictionGuideDrag(target, price) {
  let entry = toNumberOrNull(el.entryPriceLimit.value);
  let stop = toNumberOrNull(el.slPrice.value);
  let take = toNumberOrNull(el.tpPrice.value);
  const side = getSideValue();

  if (!entry || entry <= 0 || !stop || stop <= 0 || !take || take <= 0) {
    const anchor = price || getLastVisibleClosePrice();
    if (!seedPredictionInputs(side, anchor)) {
      return;
    }
    entry = toNumberOrNull(el.entryPriceLimit.value);
    stop = toNumberOrNull(el.slPrice.value);
    take = toNumberOrNull(el.tpPrice.value);
  }
  if (!entry || !stop || !take) {
    return;
  }

  if (target === "entry") {
    entry = price;
  } else if (target === "stop") {
    stop = price;
  } else if (target === "take") {
    take = price;
  } else {
    return;
  }

  const eps = Math.max(Math.abs(entry) * 1e-6, 1e-8);
  if (side === "long") {
    stop = Math.min(stop, entry - eps);
    take = Math.max(take, entry + eps);
  } else {
    take = Math.min(take, entry - eps);
    stop = Math.max(stop, entry + eps);
  }

  el.entryPriceLimit.value = formatInputPrice(entry);
  el.slPrice.value = formatInputPrice(stop);
  el.tpPrice.value = formatInputPrice(take);
  renderPredictionMetrics();
}

function onPriceChartPointerDown(event) {
  if (event.button !== 0) {
    return;
  }
  if (!canUseChartPredictionTool()) {
    return;
  }
  const target = getPredictionGuideHandle(event.clientY);
  if (!target) {
    return;
  }
  state.predictionGuideDragTarget = target;
  state.predictionGuideDragRange = priceChart.timeScale().getVisibleRange() || null;
  priceContainer.classList.add("guide-dragging");
  event.preventDefault();
}

function onPriceChartPointerMove(event) {
  if (!state.predictionGuideDragTarget) {
    return;
  }
  const nextPrice = getChartPriceByClientY(event.clientY);
  if (!nextPrice) {
    return;
  }
  applyPredictionGuideDrag(state.predictionGuideDragTarget, nextPrice);
  event.preventDefault();
}

function onPriceChartPointerUp() {
  state.predictionGuideDragTarget = null;
  state.predictionGuideDragRange = null;
  priceContainer.classList.remove("guide-dragging");
}

function normalizeSlTpForSide() {
  const side = getSideValue();
  const sl = toNumberOrNull(el.slPrice.value);
  const tp = toNumberOrNull(el.tpPrice.value);
  const entry = toNumberOrNull(el.entryPriceLimit.value);
  if (sl == null || tp == null) {
    return false;
  }

  const isValid = (s, stop, take, entryPrice) => {
    if (entryPrice != null && entryPrice > 0) {
      if (s === "long") {
        return stop < entryPrice && take > entryPrice;
      }
      return take < entryPrice && stop > entryPrice;
    }
    if (s === "long") {
      return stop < take;
    }
    return take < stop;
  };

  const origValid = isValid(side, sl, tp, entry);
  const swappedValid = isValid(side, tp, sl, entry);

  // If current values don't match the selected side but swapped values do, auto swap.
  if (!origValid && swappedValid) {
    const slRaw = el.slPrice.value;
    const tpRaw = el.tpPrice.value;
    el.slPrice.value = tpRaw;
    el.tpPrice.value = slRaw;
    return true;
  }
  return false;
}

function computePredictionPreview() {
  const side = getSideValue();
  const entry = toNumberOrNull(el.entryPriceLimit.value);
  const stop = toNumberOrNull(el.slPrice.value);
  const take = toNumberOrNull(el.tpPrice.value);
  const margin = toNumberOrNull(el.marginUsdt.value);
  const leverage = toNumberOrNull(el.leverage.value);

  if (!entry || entry <= 0) {
    return { ok: false, message: t("prediction.invalid_entry") };
  }
  if (!margin || margin <= 0) {
    return { ok: false, message: t("prediction.invalid_margin") };
  }
  if (!leverage || leverage < 3 || leverage > 100) {
    return { ok: false, message: t("prediction.invalid_leverage") };
  }
  if (!stop || !take || stop <= 0 || take <= 0) {
    return { ok: false, message: t("prediction.invalid_sl_tp") };
  }

  let riskPct = 0;
  let rewardPct = 0;
  if (side === "long") {
    if (!(stop < entry && take > entry)) {
      return { ok: false, message: t("prediction.long_rule") };
    }
    riskPct = ((entry - stop) / entry) * 100;
    rewardPct = ((take - entry) / entry) * 100;
  } else {
    if (!(take < entry && stop > entry)) {
      return { ok: false, message: t("prediction.short_rule") };
    }
    riskPct = ((stop - entry) / entry) * 100;
    rewardPct = ((entry - take) / entry) * 100;
  }

  const rr = rewardPct / Math.max(riskPct, 1e-9);
  const notional = margin * leverage;
  const quantity = notional / entry;
  const tpPnl = side === "long" ? (take - entry) * quantity : (entry - take) * quantity;
  const slPnl = side === "long" ? (stop - entry) * quantity : (entry - stop) * quantity;
  const tpRoi = (tpPnl / margin) * 100;
  const slRoi = (slPnl / margin) * 100;
  const feeRate = DEFAULT_FEE_BPS / 10000;
  const slippageRate = DEFAULT_SLIPPAGE_BPS / 10000;
  const entryNotional = notional;
  const tpExitNotional = Math.abs(quantity * take);
  const slExitNotional = Math.abs(quantity * stop);
  const tpFeeCost = (entryNotional + tpExitNotional) * feeRate;
  const slFeeCost = (entryNotional + slExitNotional) * feeRate;
  const tpSlippageCost = (entryNotional + tpExitNotional) * slippageRate;
  const slSlippageCost = (entryNotional + slExitNotional) * slippageRate;
  const tpCost = tpFeeCost + tpSlippageCost;
  const slCost = slFeeCost + slSlippageCost;
  const tpNetPnl = tpPnl - tpCost;
  const slNetPnl = slPnl - slCost;
  const tpNetRoi = (tpNetPnl / margin) * 100;
  const slNetRoi = (slNetPnl / margin) * 100;

  return {
    ok: true,
    side,
    entry,
    stop,
    take,
    margin,
    leverage,
    riskPct,
    rewardPct,
    rr,
    notional,
    quantity,
    tpPnl,
    slPnl,
    tpRoi,
    slRoi,
    feeBps: DEFAULT_FEE_BPS,
    slippageBps: DEFAULT_SLIPPAGE_BPS,
    tpCost,
    slCost,
    tpNetPnl,
    slNetPnl,
    tpNetRoi,
    slNetRoi,
  };
}

function renderPredictionMetrics() {
  const p = computePredictionPreview();
  if (!p.ok) {
    const hasAnyInput = Boolean(
      String(el.entryPriceLimit.value || "").trim() ||
        String(el.slPrice.value || "").trim() ||
        String(el.tpPrice.value || "").trim()
    );
    el.predictionMetrics.textContent = hasAnyInput ? p.message : t("prediction.metrics_hint");
    hidePredictionGuide();
    return p;
  }

  el.predictionMetrics.textContent = [
    t("prediction.metrics_line1", {
      sl: p.riskPct.toFixed(3),
      tp: p.rewardPct.toFixed(3),
      rr: p.rr.toFixed(2),
    }),
    t("prediction.metrics_line2", {
      notional: p.notional.toFixed(2),
      qty: p.quantity.toFixed(6),
    }),
    t("prediction.metrics_line3", {
      tpPnl: p.tpPnl.toFixed(2),
      tpRoi: p.tpRoi.toFixed(2),
    }),
    t("prediction.metrics_line4", {
      slPnl: p.slPnl.toFixed(2),
      slRoi: p.slRoi.toFixed(2),
    }),
    t("prediction.metrics_line5", {
      feeBps: p.feeBps.toFixed(1),
      slippageBps: p.slippageBps.toFixed(1),
    }),
    t("prediction.metrics_line6", {
      tpNet: p.tpNetPnl.toFixed(2),
      tpNetRoi: p.tpNetRoi.toFixed(2),
      slNet: p.slNetPnl.toFixed(2),
      slNetRoi: p.slNetRoi.toFixed(2),
    }),
  ].join("\n");
  drawPredictionGuide(p);
  return p;
}

function removePositionLines() {
  if (state.positionLines.entry) {
    candleSeries.removePriceLine(state.positionLines.entry);
    state.positionLines.entry = null;
  }
  if (state.positionLines.stop) {
    candleSeries.removePriceLine(state.positionLines.stop);
    state.positionLines.stop = null;
  }
  if (state.positionLines.take) {
    candleSeries.removePriceLine(state.positionLines.take);
    state.positionLines.take = null;
  }
}

function removePositionZones() {
  if (state.positionZones.profit) {
    priceChart.removeSeries(state.positionZones.profit);
    state.positionZones.profit = null;
  }
  if (state.positionZones.loss) {
    priceChart.removeSeries(state.positionZones.loss);
    state.positionZones.loss = null;
  }
}

function removePredictionGuideLines() {
  if (state.predictionGuideLines.entry) {
    candleSeries.removePriceLine(state.predictionGuideLines.entry);
    state.predictionGuideLines.entry = null;
  }
  if (state.predictionGuideLines.stop) {
    candleSeries.removePriceLine(state.predictionGuideLines.stop);
    state.predictionGuideLines.stop = null;
  }
  if (state.predictionGuideLines.take) {
    candleSeries.removePriceLine(state.predictionGuideLines.take);
    state.predictionGuideLines.take = null;
  }
}

function removePredictionGuideZones() {
  if (state.predictionGuideZones.profit) {
    priceChart.removeSeries(state.predictionGuideZones.profit);
    state.predictionGuideZones.profit = null;
  }
  if (state.predictionGuideZones.loss) {
    priceChart.removeSeries(state.predictionGuideZones.loss);
    state.predictionGuideZones.loss = null;
  }
}

function hidePredictionGuide() {
  removePredictionGuideZones();
  removePredictionGuideLines();
}

function upsertPredictionGuideLine(key, options) {
  const current = state.predictionGuideLines[key];
  if (current && typeof current.applyOptions === "function") {
    current.applyOptions(options);
    return;
  }
  state.predictionGuideLines[key] = candleSeries.createPriceLine(options);
}

function ensurePredictionGuideZones() {
  if (!state.predictionGuideZones.profit) {
    state.predictionGuideZones.profit = priceChart.addSeries(LightweightCharts.BaselineSeries, {
      baseValue: { type: "price", price: 0 },
      topLineColor: "rgba(62, 204, 142, 0.55)",
      topFillColor1: "rgba(62, 204, 142, 0.40)",
      topFillColor2: "rgba(62, 204, 142, 0.18)",
      bottomLineColor: "rgba(62, 204, 142, 0.55)",
      bottomFillColor1: "rgba(62, 204, 142, 0.40)",
      bottomFillColor2: "rgba(62, 204, 142, 0.18)",
      lineWidth: 1,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
  }
  if (!state.predictionGuideZones.loss) {
    state.predictionGuideZones.loss = priceChart.addSeries(LightweightCharts.BaselineSeries, {
      baseValue: { type: "price", price: 0 },
      topLineColor: "rgba(239, 83, 83, 0.55)",
      topFillColor1: "rgba(239, 83, 83, 0.38)",
      topFillColor2: "rgba(239, 83, 83, 0.16)",
      bottomLineColor: "rgba(239, 83, 83, 0.55)",
      bottomFillColor1: "rgba(239, 83, 83, 0.38)",
      bottomFillColor2: "rgba(239, 83, 83, 0.16)",
      lineWidth: 1,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
  }
}

function drawPredictionGuide(preview = null) {
  if (!state.session || state.session.prediction || !state.session.bars?.length) {
    hidePredictionGuide();
    return;
  }
  const p = preview && preview.ok ? preview : computePredictionPreview();
  if (!p.ok) {
    hidePredictionGuide();
    return;
  }

  const preservedRange = priceChart.timeScale().getVisibleRange();

  upsertPredictionGuideLine("entry", {
    price: Number(p.entry),
    color: "#64b5f6",
    lineWidth: 1,
    lineStyle: LightweightCharts.LineStyle.Dashed,
    axisLabelVisible: true,
    title: "ENTRY",
  });
  upsertPredictionGuideLine("stop", {
    price: Number(p.stop),
    color: "#ef5350",
    lineWidth: 1,
    lineStyle: LightweightCharts.LineStyle.Dashed,
    axisLabelVisible: true,
    title: "SL",
  });
  upsertPredictionGuideLine("take", {
    price: Number(p.take),
    color: "#26a69a",
    lineWidth: 1,
    lineStyle: LightweightCharts.LineStyle.Dashed,
    axisLabelVisible: true,
    title: "TP",
  });

  const bars = state.session.bars;
  const lastTime = Number(bars[bars.length - 1]?.time);
  const stepSec = getPredictionFutureStepSeconds(state.session);
  const futureBars = PREDICTION_FUTURE_BARS;
  const startTime = lastTime;
  const endTime = startTime + stepSec * futureBars;
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) {
    return;
  }

  const zoneData = (value) => [
    { time: startTime, value },
    { time: endTime, value },
  ];

  ensurePredictionGuideZones();
  state.predictionGuideZones.profit.applyOptions({
    baseValue: { type: "price", price: Number(p.entry) },
  });
  state.predictionGuideZones.profit.setData(zoneData(Number(p.take)));

  state.predictionGuideZones.loss.applyOptions({
    baseValue: { type: "price", price: Number(p.entry) },
  });
  state.predictionGuideZones.loss.setData(zoneData(Number(p.stop)));

  // During SL/TP dragging, keep viewport stable and never auto-jump.
  if (state.predictionGuideDragTarget && state.predictionGuideDragRange) {
    applyTimeRange(state.predictionGuideDragRange);
    return;
  }
  if (preservedRange) {
    applyTimeRange(preservedRange);
  }
}

function hidePositionOverlay() {
  removePositionZones();
  removePositionLines();
  el.positionOverlay.classList.add("hidden");
  el.positionOverlay.classList.remove("positive", "negative");
  el.positionOverlay.innerHTML = "";
}

function calcRiskReward(session) {
  const trade = session.trade;
  const prediction = session.prediction;
  if (!trade || !prediction) {
    return null;
  }

  const side = prediction.side;
  const entry = Number(trade.entry_price);
  const stop = Number(trade.stop_loss_price);
  const take = Number(trade.take_profit_price);
  const lastClose = Number(session.bars[session.bars.length - 1]?.close ?? entry);

  let riskPct = 0;
  let rewardPct = 0;
  if (side === "long") {
    riskPct = ((entry - stop) / entry) * 100;
    rewardPct = ((take - entry) / entry) * 100;
  } else {
    riskPct = ((stop - entry) / entry) * 100;
    rewardPct = ((entry - take) / entry) * 100;
  }

  const denom = Math.max(riskPct, 1e-9);
  const rr = rewardPct / denom;
  const isWaitingEntry = trade.status === "waiting_entry";

  const livePrice = trade.exit_price != null ? Number(trade.exit_price) : lastClose;
  const livePctRaw =
    side === "long" ? ((livePrice - entry) / entry) * 100 : ((entry - livePrice) / entry) * 100;
  const livePct = isWaitingEntry ? null : livePctRaw;
  const liveR = livePct == null ? null : livePct / denom;
  const margin = Number(trade.margin_usdt ?? prediction.margin_usdt ?? 0);
  const leverage = Number(trade.leverage ?? prediction.leverage ?? 0);
  const notional = Number(trade.position_notional ?? (margin > 0 && leverage > 0 ? margin * leverage : 0));
  const quantity = Number(trade.quantity ?? (notional > 0 ? notional / Math.max(entry, 1e-9) : 0));
  const livePnlUsdt = isWaitingEntry
    ? null
    : quantity > 0
      ? side === "long"
        ? (livePrice - entry) * quantity
        : (entry - livePrice) * quantity
      : null;
  const liveRoiPct = livePnlUsdt != null && margin > 0 ? (livePnlUsdt / margin) * 100 : null;
  const finalPnlUsdt =
    trade.pnl_usdt != null ? Number(trade.pnl_usdt) : trade.reason === "entry_not_filled" ? 0 : null;
  const finalRoiPct =
    trade.roi_pct != null ? Number(trade.roi_pct) : trade.reason === "entry_not_filled" ? 0 : null;
  const finalGrossPnlUsdt =
    trade.gross_pnl_usdt != null
      ? Number(trade.gross_pnl_usdt)
      : trade.reason === "entry_not_filled"
        ? 0
        : null;
  const finalCostUsdt =
    trade.cost_usdt != null ? Number(trade.cost_usdt) : trade.reason === "entry_not_filled" ? 0 : null;

  return {
    side,
    entry,
    stop,
    take,
    rr,
    livePct,
    liveR,
    margin,
    leverage,
    notional,
    quantity,
    livePnlUsdt,
    liveRoiPct,
    finalGrossPnlUsdt,
    finalCostUsdt,
    finalPnlUsdt,
    finalRoiPct,
    isWaitingEntry,
  };
}

function drawPositionLines(session) {
  removePositionLines();
  if (!session.trade || !session.prediction) {
    return;
  }

  const trade = session.trade;
  const prediction = session.prediction;
  const sideLabel = prediction.side === "long" ? "LONG" : "SHORT";
  const hit = trade.reason;

  state.positionLines.entry = candleSeries.createPriceLine({
    price: Number(trade.entry_price),
    color: "#64b5f6",
    lineWidth: 1,
    lineStyle: LightweightCharts.LineStyle.Dashed,
    axisLabelVisible: true,
    title: `${sideLabel} ENTRY`,
  });

  state.positionLines.stop = candleSeries.createPriceLine({
    price: Number(trade.stop_loss_price),
    color: hit === "stop_loss" ? "#ff6b6b" : "#ef5350",
    lineWidth: hit === "stop_loss" ? 2 : 1,
    lineStyle: LightweightCharts.LineStyle.Dashed,
    axisLabelVisible: true,
    title: hit === "stop_loss" ? "SL HIT" : "SL",
  });

  state.positionLines.take = candleSeries.createPriceLine({
    price: Number(trade.take_profit_price),
    color: hit === "take_profit" ? "#40d8a2" : "#26a69a",
    lineWidth: hit === "take_profit" ? 2 : 1,
    lineStyle: LightweightCharts.LineStyle.Dashed,
    axisLabelVisible: true,
    title: hit === "take_profit" ? "TP HIT" : "TP",
  });
}

function drawPositionZones(session) {
  removePositionZones();
  if (!session.trade || !session.prediction || !session.bars?.length) {
    return;
  }

  const trade = session.trade;
  const entry = Number(trade.entry_price);
  const stop = Number(trade.stop_loss_price);
  const take = Number(trade.take_profit_price);
  const prediction = session.prediction;
  const startTime = Number(trade.entry_time ?? prediction.entry_time);
  const stepSec = getPredictionFutureStepSeconds(session);
  const minEndTime = startTime + stepSec * PREDICTION_FUTURE_BARS;
  const endTime = Math.max(Number(session.bars[session.bars.length - 1]?.time ?? startTime), minEndTime);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) {
    return;
  }

  const zoneData = (value) => [
    { time: startTime, value },
    { time: endTime, value },
  ];

  state.positionZones.profit = priceChart.addSeries(LightweightCharts.BaselineSeries, {
    baseValue: { type: "price", price: entry },
    topLineColor: "rgba(0,0,0,0)",
    topFillColor1: "rgba(40, 200, 120, 0.26)",
    topFillColor2: "rgba(40, 200, 120, 0.09)",
    bottomLineColor: "rgba(0,0,0,0)",
    bottomFillColor1: "rgba(40, 200, 120, 0.26)",
    bottomFillColor2: "rgba(40, 200, 120, 0.09)",
    lineWidth: 1,
    crosshairMarkerVisible: false,
    lastValueVisible: false,
    priceLineVisible: false,
  });
  state.positionZones.profit.setData(zoneData(take));

  state.positionZones.loss = priceChart.addSeries(LightweightCharts.BaselineSeries, {
    baseValue: { type: "price", price: entry },
    topLineColor: "rgba(0,0,0,0)",
    topFillColor1: "rgba(230, 83, 83, 0.25)",
    topFillColor2: "rgba(230, 83, 83, 0.08)",
    bottomLineColor: "rgba(0,0,0,0)",
    bottomFillColor1: "rgba(230, 83, 83, 0.25)",
    bottomFillColor2: "rgba(230, 83, 83, 0.08)",
    lineWidth: 1,
    crosshairMarkerVisible: false,
    lastValueVisible: false,
    priceLineVisible: false,
  });
  state.positionZones.loss.setData(zoneData(stop));
}

function updatePositionOverlay(session) {
  if (!session.prediction || !session.trade) {
    hidePositionOverlay();
    return;
  }

  drawPositionZones(session);
  drawPositionLines(session);
  const metrics = calcRiskReward(session);
  if (!metrics) {
    hidePositionOverlay();
    return;
  }

  const trade = session.trade;
  const sideText = metrics.side === "long" ? t("overlay.long_position") : t("overlay.short_position");
  let finalText = t("overlay.replaying");
  if (trade.status === "closed") {
    if (trade.reason === "take_profit") {
      finalText = t("overlay.hit_tp");
    } else if (trade.reason === "stop_loss") {
      finalText = t("overlay.hit_sl");
    } else if (trade.reason === "liquidation") {
      finalText = t("overlay.liquidation");
    } else if (trade.reason === "entry_not_filled") {
      finalText = t("overlay.unfilled");
    } else {
      finalText = t("overlay.end_of_data");
    }
  } else if (trade.status === "waiting_entry") {
    finalText = session.done ? t("overlay.unfilled") : t("overlay.waiting_entry");
  }

  el.positionOverlay.classList.remove("hidden", "positive", "negative");
  if (trade.reason === "take_profit" || (metrics.livePnlUsdt != null && metrics.livePnlUsdt > 0)) {
    el.positionOverlay.classList.add("positive");
  } else if (trade.reason === "stop_loss" || (metrics.livePnlUsdt != null && metrics.livePnlUsdt < 0)) {
    el.positionOverlay.classList.add("negative");
  }

  const rText = metrics.liveR == null ? "--" : `${metrics.liveR.toFixed(2)} R`;
  const pnlText = metrics.livePnlUsdt == null ? "--" : `${metrics.livePnlUsdt.toFixed(2)} U`;
  const roiText = metrics.liveRoiPct == null ? "--" : `${metrics.liveRoiPct.toFixed(2)}%`;
  const finalGrossPnlText =
    metrics.finalGrossPnlUsdt == null ? "--" : `${metrics.finalGrossPnlUsdt.toFixed(2)} U`;
  const finalCostText = metrics.finalCostUsdt == null ? "--" : `${metrics.finalCostUsdt.toFixed(2)} U`;
  const finalPnlText = metrics.finalPnlUsdt == null ? "--" : `${metrics.finalPnlUsdt.toFixed(2)} U`;
  const finalRoiText = metrics.finalRoiPct == null ? "--" : `${metrics.finalRoiPct.toFixed(2)}%`;

  el.positionOverlay.innerHTML = `
    <div class="title">${sideText}</div>
    <div class="row"><span>${t("overlay.margin_leverage")}</span><strong>${metrics.margin.toFixed(2)}U / ${metrics.leverage.toFixed(0)}x</strong></div>
    <div class="row"><span>${t("overlay.target_rr")}</span><strong>1 : ${metrics.rr.toFixed(2)}</strong></div>
    <div class="row"><span>${t("overlay.live_r")}</span><strong>${rText}</strong></div>
    <div class="row"><span>${t("overlay.live_pnl")}</span><strong>${pnlText}</strong></div>
    <div class="row"><span>${t("overlay.live_roi")}</span><strong>${roiText}</strong></div>
    <div class="row"><span>${t("overlay.final_gross_pnl")}</span><strong>${finalGrossPnlText}</strong></div>
    <div class="row"><span>${t("overlay.final_cost")}</span><strong>${finalCostText}</strong></div>
    <div class="row"><span>${t("overlay.final_pnl")}</span><strong>${finalPnlText}</strong></div>
    <div class="row"><span>${t("overlay.final_roi")}</span><strong>${finalRoiText}</strong></div>
    <div class="row"><span>${t("overlay.current_status")}</span><strong>${finalText}</strong></div>
  `;
}

function setControlsDisabled(disabled) {
  if (disabled) {
    closeAccountMenu();
  }
  [
    el.accountPickerBtn,
    el.newAccountBtn,
    el.pair,
    el.timeframe,
    el.startDate,
    el.endDate,
    el.visibleBars,
    el.refreshRandomBtn,
    el.indicatorSelect,
    el.addIndicatorBtn,
    el.playBtn,
    el.pauseBtn,
    el.speedMs,
    el.predictionModeSelect,
    el.entryPriceLimit,
    el.marginUsdt,
    el.leverage,
    el.slPrice,
    el.tpPrice,
    el.prioritySelect,
  ].forEach((node) => {
    if (node) {
      node.disabled = disabled;
    }
  });
  if (el.indicatorsPanel) {
    el.indicatorsPanel.querySelectorAll("input, button, select").forEach((node) => {
      node.disabled = disabled;
    });
  }
}

function toDateInput(ts) {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

function dateToUnix(dateText, endOfDay = false) {
  if (!dateText) {
    return null;
  }
  const suffix = endOfDay ? "T23:59:59Z" : "T00:00:00Z";
  return Math.floor(Date.parse(`${dateText}${suffix}`) / 1000);
}

async function apiGet(path) {
  const res = await fetch(path);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || JSON.stringify(data));
  }
  return data;
}

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || JSON.stringify(data));
  }
  return data;
}

async function apiDelete(path) {
  const res = await fetch(path, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || JSON.stringify(data));
  }
  return data;
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getSelectedAccountId() {
  const id = String(state.selectedAccountId || "").trim();
  return id || null;
}

function getSelectedAccount() {
  const accountId = getSelectedAccountId();
  if (!accountId) {
    return null;
  }
  return state.accounts.find((acc) => String(acc.id) === accountId) || null;
}

function normalizeAccountId(value) {
  const id = String(value || "").trim();
  return id || null;
}

function isSessionAlignedWithSelectedAccount(session = state.session) {
  if (!session) {
    return true;
  }
  return normalizeAccountId(session.account_id) === normalizeAccountId(getSelectedAccountId());
}

function closeAccountMenu() {
  if (el.accountMenu) {
    el.accountMenu.classList.add("hidden");
    el.accountMenu.hidden = true;
    el.accountMenu.style.display = "none";
    if (el.accountPickerBtn) {
      el.accountPickerBtn.setAttribute("aria-expanded", "false");
    }
  }
}

function positionAccountMenu() {
  if (!el.accountMenu || !el.accountPickerBtn) {
    return;
  }
  const rect = el.accountPickerBtn.getBoundingClientRect();
  const menuWidth = Math.max(240, Math.ceil(rect.width));
  const preferredTop = Math.ceil(rect.bottom + 6);
  const maxHeight = 260;
  let top = preferredTop;
  if (preferredTop + maxHeight > window.innerHeight - 8) {
    top = Math.max(8, Math.ceil(rect.top - maxHeight - 6));
  }
  const left = Math.max(8, Math.min(Math.ceil(rect.left), window.innerWidth - menuWidth - 8));
  el.accountMenu.style.left = `${left}px`;
  el.accountMenu.style.top = `${top}px`;
  el.accountMenu.style.minWidth = `${menuWidth}px`;
}

function openAccountMenu() {
  if (!el.accountMenu) {
    return;
  }
  setupAccountDropdown();
  el.accountMenu.classList.remove("hidden");
  el.accountMenu.hidden = false;
  el.accountMenu.style.display = "block";
  if (el.accountPickerBtn) {
    el.accountPickerBtn.setAttribute("aria-expanded", "true");
  }
  positionAccountMenu();
}

function toggleAccountMenu() {
  if (!el.accountMenu) {
    return;
  }
  if (el.accountMenu.hidden || el.accountMenu.classList.contains("hidden")) {
    openAccountMenu();
  } else {
    closeAccountMenu();
  }
}

function renderAccountPickerLabel() {
  if (!el.accountPickerBtn) {
    return;
  }
  const selected = getSelectedAccount();
  el.accountPickerBtn.textContent = selected ? selected.name : t("account.none");
}

function renderAccountMenu() {
  if (!el.accountMenu) {
    return;
  }
  setupAccountDropdown();
  const items = Array.isArray(state.accounts) ? state.accounts : [];
  const selectedId = getSelectedAccountId();
  if (items.length === 0) {
    el.accountMenu.innerHTML = `<div class="account-menu-empty">${escapeHtml(t("account.none"))}</div>`;
    return;
  }
  el.accountMenu.innerHTML = items
    .map((acc) => {
      const isSelected = String(acc.id) === String(selectedId);
      const name = escapeHtml(acc.name);
      const statusTag = String(acc.status || "") === "archived" ? " (archived)" : "";
      return `
        <div class="account-menu-item${isSelected ? " is-selected" : ""}">
          <button type="button" class="account-menu-select" data-account-action="select" data-account-id="${escapeHtml(acc.id)}">
            ${name}${escapeHtml(statusTag)}
          </button>
          <button type="button" class="account-menu-delete" data-account-action="delete" data-account-id="${escapeHtml(acc.id)}" title="${escapeHtml(t("account.delete"))}" aria-label="${escapeHtml(t("account.delete"))}">
            ×
          </button>
        </div>
      `;
    })
    .join("");
}

function formatMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(2)} U` : "--";
}

function formatPercent(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(2)}%` : "--";
}

function formatAccountStats(stats) {
  if (!stats) {
    return t("account.stats_empty");
  }
  const winRate = stats.win_rate_pct == null ? "--" : `${Number(stats.win_rate_pct).toFixed(2)}%`;
  const sharpe = stats.sharpe == null ? "--" : Number(stats.sharpe).toFixed(3);
  return [
    `${t("account.equity")}: ${formatMoney(stats.equity)}`,
    `${t("account.available")}: ${formatMoney(stats.available_balance)}`,
    `${t("account.locked")}: ${formatMoney(stats.locked_margin)}`,
    `${t("account.total_net")}: ${formatMoney(stats.total_net_pnl_usdt)}`,
    `${t("account.total_cost")}: ${formatMoney(stats.total_cost_usdt)}`,
    `${t("account.return")}: ${formatPercent(stats.return_pct)}`,
    `${t("account.sharpe")}: ${sharpe}`,
    `${t("account.win_rate")}: ${winRate}`,
    `${t("account.trades")}: ${Number(stats.trade_count || 0)} / ${Number(stats.filled_trade_count || 0)}`,
  ].join("\n");
}

async function refreshAccountStats() {
  const accountId = getSelectedAccountId();
  if (!accountId) {
    state.accountStats = null;
    if (el.accountStatsBox) {
      el.accountStatsBox.textContent = t("account.stats_empty");
    }
    return null;
  }
  const stats = await apiGet(`/api/accounts/${encodeURIComponent(accountId)}/stats`);
  state.accountStats = stats;
  if (el.accountStatsBox) {
    el.accountStatsBox.textContent = formatAccountStats(stats);
  }
  return stats;
}

async function loadAccounts(preferredAccountId = null) {
  closeAccountMenu();
  const data = await apiGet("/api/accounts?include_archived=true");
  const items = Array.isArray(data.items) ? data.items : [];
  state.accounts = items;
  if (items.length === 0) {
    state.selectedAccountId = null;
    try {
      localStorage.removeItem(ACCOUNT_STORAGE_KEY);
    } catch (_) {
      // ignore
    }
    renderAccountPickerLabel();
    renderAccountMenu();
    closeAccountMenu();
    state.accountStats = null;
    if (el.accountStatsBox) {
      el.accountStatsBox.textContent = t("account.stats_empty");
    }
    return items;
  }

  const saved = localStorage.getItem(ACCOUNT_STORAGE_KEY);
  const target = preferredAccountId || state.selectedAccountId || saved || items[0].id;
  const hasTarget = items.some((acc) => String(acc.id) === String(target));
  state.selectedAccountId = hasTarget ? String(target) : String(items[0].id);
  try {
    localStorage.setItem(ACCOUNT_STORAGE_KEY, state.selectedAccountId);
  } catch (_) {
    // ignore
  }
  renderAccountPickerLabel();
  renderAccountMenu();
  closeAccountMenu();
  await refreshAccountStats();
  return items;
}

async function ensureAccountReady() {
  await loadAccounts();
}

async function createAccountFromPrompt() {
  const defaultName = `Account ${new Date().toISOString().slice(0, 10)}`;
  const nameInput = window.prompt(t("account.prompt_name"), defaultName);
  if (nameInput == null) {
    return;
  }
  const name = nameInput.trim();
  if (!name) {
    throw new Error("name cannot be empty");
  }
  const balanceInput = window.prompt(t("account.prompt_balance"), "10000");
  if (balanceInput == null) {
    return;
  }
  const initialBalance = Number(balanceInput);
  if (!Number.isFinite(initialBalance) || initialBalance <= 0) {
    throw new Error(t("prediction.invalid_margin"));
  }

  const account = await apiPost("/api/accounts", {
    name,
    initial_balance: initialBalance,
  });
  await loadAccounts(account.id);
  setStatus(t("status.account_created", { name: account.name }));
}

async function deleteCurrentAccount(accountIdOverride = null) {
  const accountId = String(accountIdOverride || getSelectedAccountId() || "").trim();
  if (!accountId) {
    return;
  }
  if (!window.confirm(t("account.confirm_delete"))) {
    return;
  }
  const account = await apiDelete(`/api/accounts/${encodeURIComponent(accountId)}`);
  const remaining = state.accounts.filter((acc) => String(acc.id) !== accountId);
  const nextId = remaining.length > 0 ? String(remaining[0].id) : null;
  await loadAccounts(nextId);
  closeAccountMenu();
  setStatus(t("status.account_deleted", { name: account.name }));
}

function formatResult(session) {
  if (!session) {
    return t("result.no_session");
  }

  const lines = [];
  lines.push(`session: ${session.session_id}`);
  if (session.account_id) {
    lines.push(`account: ${session.account_id}`);
  }
  lines.push(`pair/tf: ${session.pair} ${session.timeframe}`);
  lines.push(`status: ${session.status}`);
  lines.push(`bars: ${session.cursor + 1}/${session.total_bars}`);

  if (session.prediction) {
    lines.push(`entry: ${Number(session.prediction.entry_price).toFixed(4)}`);
    lines.push(`side: ${session.prediction.side}`);
    if (session.prediction.margin_usdt != null && session.prediction.leverage != null) {
      lines.push(`margin/leverage: ${Number(session.prediction.margin_usdt).toFixed(2)}U x${Number(session.prediction.leverage).toFixed(0)}`);
    }
    if (session.prediction.fee_bps != null && session.prediction.slippage_bps != null) {
      lines.push(`cost_model: fee ${Number(session.prediction.fee_bps).toFixed(1)}bps + slippage ${Number(session.prediction.slippage_bps).toFixed(1)}bps`);
    }
  }

  if (session.trade) {
    lines.push(`trade: ${session.trade.status}`);
    if (session.trade.reason) {
      lines.push(`reason: ${session.trade.reason}`);
    }
    lines.push(`SL: ${Number(session.trade.stop_loss_price).toFixed(4)}`);
    lines.push(`TP: ${Number(session.trade.take_profit_price).toFixed(4)}`);
    if (session.trade.exit_price != null) {
      lines.push(`exit: ${Number(session.trade.exit_price).toFixed(4)}`);
    }
    if (session.trade.pnl_pct != null) {
      lines.push(`pnl: ${Number(session.trade.pnl_pct).toFixed(3)}%`);
    }
    if (session.trade.gross_pnl_usdt != null) {
      lines.push(`gross_pnl_u: ${Number(session.trade.gross_pnl_usdt).toFixed(3)}U`);
    }
    if (session.trade.fee_usdt != null || session.trade.slippage_usdt != null) {
      const fee = Number(session.trade.fee_usdt ?? 0);
      const slippage = Number(session.trade.slippage_usdt ?? 0);
      lines.push(`cost_u: ${(fee + slippage).toFixed(3)}U (fee ${fee.toFixed(3)}U + slippage ${slippage.toFixed(3)}U)`);
    }
    if (session.trade.pnl_usdt != null) {
      lines.push(`${session.trade.status === "closed" ? "final_net_pnl_u" : "net_pnl_u"}: ${Number(session.trade.pnl_usdt).toFixed(3)}U`);
    }
    if (session.trade.roi_pct != null) {
      lines.push(`${session.trade.status === "closed" ? "final_roi" : "roi"}: ${Number(session.trade.roi_pct).toFixed(3)}%`);
    }
    if (session.trade.r_multiple != null) {
      lines.push(`R: ${Number(session.trade.r_multiple).toFixed(3)}`);
    }
  }

  return lines.join("\n");
}

function resizeCharts() {
  const width = priceContainer.clientWidth;
  priceChart.applyOptions({ width });
  indicatorChart.applyOptions({ width });
}

function clearIndicators() {
  for (const series of state.priceIndicatorSeries) {
    priceChart.removeSeries(series);
  }
  for (const series of state.subIndicatorSeries) {
    indicatorChart.removeSeries(series);
  }
  state.priceIndicatorSeries = [];
  state.subIndicatorSeries = [];
  state.indicatorValueMaps.clear();
  state.subIndicatorOrder = [];
}

function indicatorColor(index) {
  const colors = ["#f4b400", "#42a5f5", "#ff8a65", "#ab47bc", "#66bb6a", "#ec407a"];
  return colors[index % colors.length];
}

function isSubPaneIndicator(cfg) {
  if (cfg?.style?.pane) {
    return cfg.style.pane === "indicator";
  }
  return cfg?.name === "rsi" || cfg?.name === "macd";
}

function buildIndicatorQuery(cfg) {
  const params = new URLSearchParams();
  params.set("name", cfg.name);
  for (const [k, v] of Object.entries(cfg.params || {})) {
    if (v != null && v !== "") {
      params.set(k, String(v));
    }
  }
  return params.toString();
}

function resolveLineColor(cfg, seriesDef, fallback) {
  if (cfg.name === "boll") {
    if (seriesDef.id.includes("upper")) {
      return cfg.style.upperColor || fallback;
    }
    if (seriesDef.id.includes("middle")) {
      return cfg.style.middleColor || fallback;
    }
    if (seriesDef.id.includes("lower")) {
      return cfg.style.lowerColor || fallback;
    }
  }
  if (cfg.name === "macd") {
    if (seriesDef.id.startsWith("macd_")) {
      return cfg.style.macdColor || fallback;
    }
    if (seriesDef.id.startsWith("signal_")) {
      return cfg.style.signalColor || fallback;
    }
  }
  return cfg.style.color || fallback;
}

function resolveSeriesLabel(cfg, seriesDef) {
  if (cfg.name === "sma") {
    return `SMA(${cfg.params.period})`;
  }
  if (cfg.name === "ema") {
    return `EMA(${cfg.params.period})`;
  }
  if (cfg.name === "rsi") {
    return `RSI(${cfg.params.period})`;
  }
  if (cfg.name === "boll") {
    if (seriesDef.id.includes("upper")) {
      return "BOLL Upper";
    }
    if (seriesDef.id.includes("middle")) {
      return "BOLL Middle";
    }
    if (seriesDef.id.includes("lower")) {
      return "BOLL Lower";
    }
    return "BOLL";
  }
  if (cfg.name === "macd") {
    if (seriesDef.id.startsWith("signal_")) {
      return "MACD Signal";
    }
    if (seriesDef.id === "macd_hist") {
      return "MACD Hist";
    }
    return "MACD";
  }
  return indicatorTitle(cfg.name);
}

async function refreshIndicators() {
  if (!state.session) {
    return;
  }
  const refreshToken = state.indicatorRefreshToken + 1;
  state.indicatorRefreshToken = refreshToken;
  const expectedSessionId = state.session.session_id;
  const expectedVersion = state.sessionVersion;
  const preservedRangeRaw = priceChart.timeScale().getVisibleLogicalRange();
  const preservedRange =
    preservedRangeRaw &&
    Number.isFinite(preservedRangeRaw.from) &&
    Number.isFinite(preservedRangeRaw.to)
      ? preservedRangeRaw
      : null;
  state.isRefreshingIndicators = true;
  try {
    clearIndicators();

    const configs = state.indicatorConfigs || [];
    if (configs.length === 0) {
      return;
    }

    let idx = 0;
    for (const cfg of configs) {
      if (
        refreshToken !== state.indicatorRefreshToken ||
        !state.session ||
        state.sessionVersion !== expectedVersion ||
        state.session.session_id !== expectedSessionId
      ) {
        return;
      }
      const data = await apiGet(
        `/api/replay/sessions/${expectedSessionId}/indicator?${buildIndicatorQuery(cfg)}`
      );
      if (
        refreshToken !== state.indicatorRefreshToken ||
        !state.session ||
        state.sessionVersion !== expectedVersion ||
        state.session.session_id !== expectedSessionId
      ) {
        return;
      }
      const drawOnSub = isSubPaneIndicator(cfg);

      for (const seriesDef of data.series) {
        const fallbackColor = indicatorColor(idx++);
        const lineColor = resolveLineColor(cfg, seriesDef, fallbackColor);
        const chart = drawOnSub ? indicatorChart : priceChart;
        let series = null;

        if (seriesDef.type === "line") {
          series = chart.addSeries(LightweightCharts.LineSeries, {
            color: lineColor,
            lineWidth: cfg.style.lineWidth || 2,
            priceLineVisible: false,
            lastValueVisible: true,
          });
        } else if (seriesDef.type === "histogram") {
          series = chart.addSeries(LightweightCharts.HistogramSeries, {
            priceLineVisible: false,
            lastValueVisible: true,
          });
        }

        if (!series) {
          continue;
        }

        let points = seriesDef.points || [];
        if (seriesDef.type === "histogram") {
          const pos = cfg.style.histPosColor || "#26a69a";
          const neg = cfg.style.histNegColor || "#ef5350";
          points = points.map((p) => {
            if (p && typeof p.value === "number") {
              return { ...p, color: p.value >= 0 ? pos : neg };
            }
            return p;
          });
        }
        series.setData(points);
        const valueMap = new Map();
        for (const pt of points) {
          if (pt && typeof pt.time === "number" && typeof pt.value === "number") {
            valueMap.set(Number(pt.time), Number(pt.value));
          }
        }
        const uniqueSeriesId = `${cfg.id}:${seriesDef.id}`;
        state.indicatorValueMaps.set(uniqueSeriesId, {
          drawOnSub,
          values: valueMap,
          label: resolveSeriesLabel(cfg, seriesDef),
        });
        if (drawOnSub) {
          state.subIndicatorOrder.push(uniqueSeriesId);
        }
        if (drawOnSub) {
          state.subIndicatorSeries.push(series);
        } else {
          state.priceIndicatorSeries.push(series);
        }
      }
    }
  } finally {
    if (refreshToken === state.indicatorRefreshToken) {
      state.isRefreshingIndicators = false;
    }
  }

  if (
    refreshToken !== state.indicatorRefreshToken ||
    !state.session ||
    state.sessionVersion !== expectedVersion ||
    state.session.session_id !== expectedSessionId
  ) {
    return;
  }

  if (preservedRange) {
    state.isRangeSyncing = true;
    try {
      priceChart.timeScale().setVisibleLogicalRange(preservedRange);
      if (state.subIndicatorSeries.length > 0) {
        try {
          indicatorChart.timeScale().setVisibleLogicalRange(preservedRange);
        } catch (_err) {
          // Ignore transient pane sync errors when indicator pane has no ready data.
        }
      }
    } finally {
      state.isRangeSyncing = false;
    }
  } else {
    syncIndicatorRangeFromPrice();
  }
}

function renderSession(session, fit = false) {
  const prevSessionId = state.session?.session_id || null;
  const prevBarsCount = Array.isArray(state.session?.bars) ? state.session.bars.length : 0;
  const prevHasPrediction = Boolean(state.session?.prediction);
  state.session = session;

  const bars = session.bars || [];
  const stepSec = getPredictionFutureStepSeconds(session);
  const lastTime = Number(bars[bars.length - 1]?.time ?? 0);
  const futureSlots = [];
  // Keep right-side forecast space only before prediction submission (placement stage).
  if (!session.prediction && bars.length > 0 && Number.isFinite(lastTime) && Number.isFinite(stepSec) && stepSec > 0) {
    for (let i = 1; i <= PREDICTION_FUTURE_BARS; i += 1) {
      futureSlots.push({ time: lastTime + stepSec * i });
    }
  }
  state.barsByTime = new Map(bars.map((b) => [Number(b.time), b]));
  candleSeries.setData(
    [
      ...bars.map((b) => ({
        time: b.time,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      })),
      ...futureSlots,
    ]
  );

  volumeSeries.setData(
    [
      ...bars.map((b) => ({
        time: b.time,
        value: b.volume,
        color: b.close >= b.open ? "rgba(38,166,154,0.55)" : "rgba(239,83,80,0.55)",
      })),
      ...futureSlots,
    ]
  );

  updatePositionOverlay(session);
  if (session.prediction) {
    hidePredictionGuide();
    clearChartPredictionPlacementMode();
  } else {
    drawPredictionGuide();
  }
  const isNewSession = session.session_id !== prevSessionId;
  const predictionJustActivated = !prevHasPrediction && Boolean(session.prediction);
  if (fit || isNewSession) {
    priceChart.timeScale().fitContent();
    indicatorChart.timeScale().fitContent();
    syncIndicatorRangeFromPrice();
  }
  if (predictionJustActivated) {
    centerLatestForReplayStart(session);
  } else if (session.prediction) {
    const currentBarsCount = Array.isArray(session.bars) ? session.bars.length : 0;
    const replayAdvanced = currentBarsCount > prevBarsCount;
    if (replayAdvanced) {
      // Keep playback viewport stable like the previous stable version.
      syncIndicatorRangeFromPrice();
    }
  }
  el.resultBox.textContent = formatResult(session);

  if (session.done) {
    stopAutoplay();
    setStatus(t("status.replay_finished"));
  }
}

async function loadPairs() {
  const data = await apiGet("/api/market/pairs");
  if (!data.pairs || data.pairs.length === 0) {
    el.pair.innerHTML = "";
    return false;
  }
  el.pair.innerHTML = data.pairs.map((p) => `<option value="${p}">${p}</option>`).join("");
  return true;
}

async function loadTimeframes() {
  const pair = el.pair.value;
  if (!pair) {
    el.timeframe.innerHTML = "";
    return false;
  }
  const previous = el.timeframe.value;
  const data = await apiGet(`/api/market/timeframes?pair=${encodeURIComponent(pair)}`);
  if (!data.timeframes || data.timeframes.length === 0) {
    el.timeframe.innerHTML = "";
    return false;
  }
  el.timeframe.innerHTML = data.timeframes.map((t) => `<option value="${t}">${t}</option>`).join("");
  if (previous && data.timeframes.includes(previous)) {
    el.timeframe.value = previous;
  } else if (data.timeframes.includes("4h")) {
    el.timeframe.value = "4h";
  }
  return true;
}

async function loadRange(options = {}) {
  const keepStart = Boolean(options.keepStart);
  const pair = el.pair.value;
  const timeframe = el.timeframe.value;
  if (!pair || !timeframe) {
    return false;
  }
  const data = await apiGet(
    `/api/market/range?pair=${encodeURIComponent(pair)}&timeframe=${encodeURIComponent(timeframe)}`
  );
  if (!keepStart || !el.startDate.value) {
    el.startDate.value = toDateInput(data.start_ts);
  }
  el.endDate.value = toDateInput(data.end_ts);
  setStatus(
    t("status.range_loaded", {
      start: new Date(data.start_ts * 1000).toISOString(),
      end: new Date(data.end_ts * 1000).toISOString(),
    })
  );
  return true;
}

async function createSession() {
  if (state.sessionLoadingPromise) {
    await state.sessionLoadingPromise;
  }

  const run = (async () => {
    stopAutoplay();
    const myVersion = state.sessionVersion + 1;
    state.sessionVersion = myVersion;
    clearIndicators();
    hidePositionOverlay();
    hidePredictionGuide();
    clearChartPredictionPlacementMode();
    onPriceChartPointerUp();

    const payload = {
      account_id: getSelectedAccountId(),
      pair: el.pair.value,
      timeframe: el.timeframe.value,
      range_start: dateToUnix(el.startDate.value, false),
      range_end: dateToUnix(el.endDate.value, true),
      visible_bars: Number(el.visibleBars.value),
    };

    if (!payload.range_start || !payload.range_end || payload.range_start >= payload.range_end) {
      throw new Error(t("error.invalid_date_range"));
    }
    if (!payload.account_id) {
      throw new Error(t("error.account_required"));
    }

    setStatus(t("status.creating_session"));
    const session = await apiPost("/api/replay/sessions", payload);
    if (myVersion !== state.sessionVersion) {
      return;
    }
    renderSession(session, true);
    await refreshAccountStats();
    applyPredictionModePreset(true);
    renderPredictionMetrics();
    try {
      await refreshIndicators();
    } catch (err) {
      setStatus(t("status.indicator_failed", { err: err.message || err }));
    }
    setStatus(t("status.session_created"));
  })();

  state.sessionLoadingPromise = run;
  try {
    await run;
  } finally {
    if (state.sessionLoadingPromise === run) {
      state.sessionLoadingPromise = null;
    }
  }
}

async function refreshRandomSession() {
  await loadRange({ keepStart: true });
  await createSession();
  setStatus(t("status.random_refreshed"));
}

async function submitPrediction() {
  if (!state.session || state.session.done || !isSessionAlignedWithSelectedAccount(state.session)) {
    await createSession();
  }
  if (!state.session) {
    throw new Error(t("error.create_session_first"));
  }
  const sid = state.session.session_id;
  const version = state.sessionVersion;
  normalizeSlTpForSide();
  const side = getSideValue();
  const preview = renderPredictionMetrics();
  if (!preview.ok) {
    throw new Error(preview.message);
  }
  const payload = {
    side,
    entry_price_limit: preview.entry,
    margin_usdt: preview.margin,
    leverage: preview.leverage,
    stop_loss_price: preview.stop,
    take_profit_price: preview.take,
    stop_loss_pct: preview.riskPct,
    take_profit_pct: preview.rewardPct,
    sl_tp_priority: el.prioritySelect.value,
  };

  setStatus(t("status.submitting_prediction"));
  const session = await apiPost(`/api/replay/sessions/${sid}/prediction`, payload);
  if (version !== state.sessionVersion || !state.session || state.session.session_id !== sid) {
    return;
  }
  renderSession(session, false);
  try {
    await refreshAccountStats();
  } catch (err) {
    setStatus(t("status.account_failed", { err: err.message || err }));
  }
  setStatus(
    t("status.prediction_submitted", {
      entry: Number(session.prediction.entry_price).toFixed(4),
      rr: preview.rr.toFixed(2),
    })
  );
}

async function step(steps = 1) {
  if (!state.session) {
    throw new Error(t("error.create_session_first"));
  }
  const sid = state.session.session_id;
  const version = state.sessionVersion;
  if (state.isStepping) {
    return;
  }

  state.isStepping = true;
  try {
    const session = await apiPost(`/api/replay/sessions/${sid}/step`, { steps });
    if (version !== state.sessionVersion || !state.session || state.session.session_id !== sid) {
      return;
    }
    renderSession(session, false);
    if (session.done || session.trade?.status === "closed" || session.trade?.reason === "entry_not_filled") {
      try {
        await refreshAccountStats();
      } catch (err) {
        setStatus(t("status.account_failed", { err: err.message || err }));
      }
    }
    try {
      await refreshIndicators();
    } catch (err) {
      setStatus(t("status.indicator_failed", { err: err.message || err }));
    }
  } finally {
    state.isStepping = false;
  }
}

function stopAutoplay() {
  if (state.autoplayTimer) {
    clearTimeout(state.autoplayTimer);
    state.autoplayTimer = null;
  }
}

function startAutoplay() {
  if (!state.session) {
    throw new Error(t("error.create_session_first"));
  }
  stopAutoplay();

  const speed = Math.max(50, Number(el.speedMs.value) || 250);
  setStatus(t("status.auto_play_started", { speed }));

  const tick = async () => {
    if (!state.autoplayTimer) {
      return;
    }
    if (!state.session || state.session.done) {
      stopAutoplay();
      return;
    }
    try {
      await step(1);
    } catch (err) {
      stopAutoplay();
      setStatus(String(err.message || err));
      return;
    }
    if (!state.autoplayTimer) {
      return;
    }
    state.autoplayTimer = setTimeout(tick, speed);
  };

  state.autoplayTimer = setTimeout(tick, speed);
}

async function startReplayFlow() {
  if (state.sessionLoadingPromise) {
    await state.sessionLoadingPromise;
  }

  if (!state.session || state.session.done || !isSessionAlignedWithSelectedAccount(state.session)) {
    setStatus(t("status.replay_preparing"));
    await createSession();
  } else {
    applyPredictionModePreset(false);
  }

  if (!state.session) {
    throw new Error(t("error.create_session_first"));
  }

  if (!state.session?.prediction) {
    const preview = renderPredictionMetrics();
    if (!preview.ok) {
      throw new Error(preview.message);
    }
    await submitPrediction();
  }
  startAutoplay();
}

function wireEvents() {
  el.accountPickerBtn?.addEventListener("click", () => {
    toggleAccountMenu();
  });
  el.accountMenu?.addEventListener("click", async (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) {
      return;
    }
    const action = target.getAttribute("data-account-action");
    const accountId = target.getAttribute("data-account-id");
    if (!action || !accountId) {
      return;
    }
    try {
      if (action === "delete") {
        await deleteCurrentAccount(accountId);
        return;
      }
      if (action === "select") {
        state.selectedAccountId = String(accountId);
        try {
          localStorage.setItem(ACCOUNT_STORAGE_KEY, state.selectedAccountId);
        } catch (_) {
          // ignore
        }
        renderAccountPickerLabel();
        renderAccountMenu();
        closeAccountMenu();
        await refreshAccountStats();
      }
    } catch (err) {
      setStatus(t("status.account_failed", { err: err.message || err }));
    }
  });
  window.addEventListener("click", (event) => {
    const root = el.accountPicker;
    const menu = el.accountMenu;
    if (!root && !menu) {
      return;
    }
    const target = event.target instanceof Node ? event.target : null;
    if (target && ((root && root.contains(target)) || (menu && menu.contains(target)))) {
      return;
    }
    closeAccountMenu();
  });
  window.addEventListener("resize", () => {
    if (!el.accountMenu?.classList.contains("hidden")) {
      positionAccountMenu();
    }
  });
  window.addEventListener("scroll", () => {
    if (!el.accountMenu?.classList.contains("hidden")) {
      positionAccountMenu();
    }
  });
  el.newAccountBtn?.addEventListener("click", async () => {
    try {
      await createAccountFromPrompt();
    } catch (err) {
      setStatus(t("status.account_failed", { err: err.message || err }));
    }
  });
  el.pair?.addEventListener("change", async () => {
    await loadTimeframes();
    await loadRange();
    applyPredictionModePreset(true);
  });
  el.langSelect?.addEventListener("change", () => {
    setLang(el.langSelect.value);
  });
  el.timeframe?.addEventListener("change", async () => {
    await loadRange();
    applyPredictionModePreset(true);
  });
  el.predictionModeSelect?.addEventListener("change", () => {
    applyPredictionModePreset(true);
  });
  [el.entryPriceLimit, el.marginUsdt, el.leverage, el.slPrice, el.tpPrice].forEach((node) => {
    node?.addEventListener("input", renderPredictionMetrics);
  });
  el.addIndicatorBtn?.addEventListener("click", () => {
    addIndicatorConfig(el.indicatorSelect.value);
  });

  el.refreshRandomBtn?.addEventListener("click", async () => {
    try {
      await refreshRandomSession();
    } catch (err) {
      setStatus(t("status.refresh_failed", { err: err.message || err }));
    }
  });

  el.playBtn?.addEventListener("click", async () => {
    try {
      await startReplayFlow();
    } catch (err) {
      setStatus(t("status.play_failed", { err: err.message || err }));
    }
  });

  el.pauseBtn?.addEventListener("click", () => {
    stopAutoplay();
    setStatus(t("status.paused"));
  });

  priceContainer.addEventListener("pointerdown", onPriceChartPointerDown);
  window.addEventListener("pointermove", onPriceChartPointerMove);
  window.addEventListener("pointerup", onPriceChartPointerUp);
  window.addEventListener("pointercancel", onPriceChartPointerUp);
  window.addEventListener("resize", resizeCharts);
}

async function init() {
  setupAccountDropdown();
  applyI18n();
  closeAccountMenu();
  await ensureAccountReady();
  setStatus(t("status.loading_market"));
  const hasPairs = await loadPairs();
  if (!hasPairs) {
    setControlsDisabled(true);
    el.resultBox.textContent = t("status.init_no_data_hint");
    setStatus(t("status.no_local_data"));
    return;
  }

  const hasTimeframes = await loadTimeframes();
  if (!hasTimeframes) {
    setControlsDisabled(true);
    setStatus(t("status.current_pair_no_tf"));
    return;
  }

  loadIndicatorConfigs();
  renderIndicatorsPanel();
  await loadRange();
  wireEvents();
  setControlsDisabled(false);
  renderPredictionMetrics();
  resizeCharts();
  try {
    await refreshRandomSession();
  } catch (err) {
    setStatus(t("status.preload_failed", { err: err.message || err }));
  }
}

init().catch((err) => {
  setStatus(t("status.init_failed", { err: err.message || err }));
});
