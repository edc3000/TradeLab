const state = {
  session: null,
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
};

const DEFAULT_SL_PCT = 1.5;
const DEFAULT_RR = 1.5;
const LANG_STORAGE_KEY = "tradelab_lang_v1";
const INDICATOR_STORAGE_KEY = "tradelab_indicator_configs_v1";
const INDICATOR_NAMES = ["sma", "ema", "boll", "rsi", "macd"];
const I18N = {
  zh: {
    "brand.title": "TradeLab Replay",
    "brand.subtitle": "离线历史回放训练器",
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
    "prediction.metrics_hint": "设置 Entry/SL/TP 后自动计算 RR。",
    "replay.title": "回放控制",
    "replay.step1": "步进 +1",
    "replay.step5": "步进 +5",
    "replay.play": "自动回放",
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
    "status.session_created": "会话已创建。请先提交预测再开始回放。",
    "status.random_refreshed": "随机K线已刷新。",
    "status.submitting_prediction": "正在提交预测...",
    "status.prediction_submitted": "预测已提交。开仓价 {entry} | RR 1:{rr}",
    "status.auto_play_started": "自动回放已启动 ({speed}ms)",
    "status.paused": "已暂停",
    "status.replay_finished": "回放完成。",
    "status.create_failed": "创建失败: {err}",
    "status.refresh_failed": "刷新失败: {err}",
    "status.prediction_failed": "预测失败: {err}",
    "status.step_failed": "步进失败: {err}",
    "status.play_failed": "播放失败: {err}",
    "status.indicator_failed": "指标加载失败: {err}",
    "status.preload_failed": "预加载失败: {err}",
    "status.init_failed": "初始化失败: {err}",
    "status.init_no_data_hint":
      "未找到历史K线数据。\\n\\n运行下载脚本:\\npython backend/app/scripts/download_history.py --exchange binance --pair BTC/USDT --timeframe 1h --start 2024-01-01T00:00:00Z --end 2025-01-01T00:00:00Z",
    "error.invalid_date_range": "日期范围无效。",
    "error.create_session_first": "请先创建会话。",
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
    "overlay.final_pnl": "最终PNL(U)",
    "overlay.final_roi": "最终ROI",
    "overlay.current_status": "当前状态",
    "hover.prefix": "悬浮",
  },
  en: {
    "brand.title": "TradeLab Replay",
    "brand.subtitle": "Offline Historical Playback Trainer",
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
    "prediction.metrics_hint": "Set Entry/SL/TP to calculate RR.",
    "replay.title": "Replay Control",
    "replay.step1": "Step +1",
    "replay.step5": "Step +5",
    "replay.play": "Auto Play",
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
    "status.session_created": "Session created. Submit prediction before stepping.",
    "status.random_refreshed": "Random K-line refreshed.",
    "status.submitting_prediction": "Submitting prediction...",
    "status.prediction_submitted": "Prediction submitted. Entry {entry} | RR 1:{rr}",
    "status.auto_play_started": "Auto play started ({speed}ms)",
    "status.paused": "Paused",
    "status.replay_finished": "Replay finished.",
    "status.create_failed": "Create failed: {err}",
    "status.refresh_failed": "Refresh failed: {err}",
    "status.prediction_failed": "Prediction failed: {err}",
    "status.step_failed": "Step failed: {err}",
    "status.play_failed": "Play failed: {err}",
    "status.indicator_failed": "Indicator failed: {err}",
    "status.preload_failed": "Preload failed: {err}",
    "status.init_failed": "Init failed: {err}",
    "status.init_no_data_hint":
      "No historical candles found.\\n\\nRun downloader script:\\npython backend/app/scripts/download_history.py --exchange binance --pair BTC/USDT --timeframe 1h --start 2024-01-01T00:00:00Z --end 2025-01-01T00:00:00Z",
    "error.invalid_date_range": "Invalid date range.",
    "error.create_session_first": "Create session first.",
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
    "overlay.final_pnl": "Final PNL (U)",
    "overlay.final_roi": "Final ROI",
    "overlay.current_status": "Status",
    "hover.prefix": "Hover",
  },
};

const el = {
  pair: document.getElementById("pairSelect"),
  timeframe: document.getElementById("timeframeSelect"),
  startDate: document.getElementById("startDate"),
  endDate: document.getElementById("endDate"),
  visibleBars: document.getElementById("visibleBars"),
  hiddenBars: document.getElementById("hiddenBars"),
  createSessionBtn: document.getElementById("createSessionBtn"),
  refreshRandomBtn: document.getElementById("refreshRandomBtn"),
  langSelect: document.getElementById("langSelect"),
  indicatorSelect: document.getElementById("indicatorSelect"),
  addIndicatorBtn: document.getElementById("addIndicatorBtn"),
  indicatorsPanel: document.getElementById("indicatorsPanel"),
  submitPredictionBtn: document.getElementById("submitPredictionBtn"),
  stepBtn: document.getElementById("stepBtn"),
  step5Btn: document.getElementById("step5Btn"),
  playBtn: document.getElementById("playBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  speedMs: document.getElementById("speedMs"),
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
};

const priceContainer = document.getElementById("priceChart");
const indicatorContainer = document.getElementById("indicatorChart");
state.lang = localStorage.getItem(LANG_STORAGE_KEY) === "en" ? "en" : "zh";

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
  if (el.stepBtn) {
    el.stepBtn.textContent = t("replay.step1");
  }
  if (el.step5Btn) {
    el.step5Btn.textContent = t("replay.step5");
  }
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
  if (!range || state.isRangeSyncing) {
    return;
  }
  state.isRangeSyncing = true;
  try {
    indicatorChart.timeScale().setVisibleLogicalRange(range);
  } finally {
    state.isRangeSyncing = false;
  }
});

indicatorChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
  if (!range || state.isRangeSyncing || state.isRefreshingIndicators) {
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
  const range = priceChart.timeScale().getVisibleLogicalRange();
  if (!range) {
    return;
  }
  state.isRangeSyncing = true;
  try {
    indicatorChart.timeScale().setVisibleLogicalRange(range);
  } finally {
    state.isRangeSyncing = false;
  }
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
  const node = document.querySelector('input[name="side"]:checked');
  return node ? node.value : "long";
}

function toNumberOrNull(value) {
  if (value == null || value === "") {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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
  ].join("\n");
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
  const endTime = Number(session.bars[session.bars.length - 1]?.time ?? startTime);
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
  const finalPnlText = metrics.finalPnlUsdt == null ? "--" : `${metrics.finalPnlUsdt.toFixed(2)} U`;
  const finalRoiText = metrics.finalRoiPct == null ? "--" : `${metrics.finalRoiPct.toFixed(2)}%`;

  el.positionOverlay.innerHTML = `
    <div class="title">${sideText}</div>
    <div class="row"><span>${t("overlay.margin_leverage")}</span><strong>${metrics.margin.toFixed(2)}U / ${metrics.leverage.toFixed(0)}x</strong></div>
    <div class="row"><span>${t("overlay.target_rr")}</span><strong>1 : ${metrics.rr.toFixed(2)}</strong></div>
    <div class="row"><span>${t("overlay.live_r")}</span><strong>${rText}</strong></div>
    <div class="row"><span>${t("overlay.live_pnl")}</span><strong>${pnlText}</strong></div>
    <div class="row"><span>${t("overlay.live_roi")}</span><strong>${roiText}</strong></div>
    <div class="row"><span>${t("overlay.final_pnl")}</span><strong>${finalPnlText}</strong></div>
    <div class="row"><span>${t("overlay.final_roi")}</span><strong>${finalRoiText}</strong></div>
    <div class="row"><span>${t("overlay.current_status")}</span><strong>${finalText}</strong></div>
  `;
}

function setControlsDisabled(disabled) {
  [
    el.pair,
    el.timeframe,
    el.startDate,
    el.endDate,
    el.visibleBars,
    el.hiddenBars,
    el.createSessionBtn,
    el.refreshRandomBtn,
    el.indicatorSelect,
    el.addIndicatorBtn,
    el.submitPredictionBtn,
    el.stepBtn,
    el.step5Btn,
    el.playBtn,
    el.pauseBtn,
    el.speedMs,
    el.entryPriceLimit,
    el.marginUsdt,
    el.leverage,
    el.slPrice,
    el.tpPrice,
    el.prioritySelect,
  ].forEach((node) => {
    node.disabled = disabled;
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

function formatResult(session) {
  if (!session) {
    return t("result.no_session");
  }

  const lines = [];
  lines.push(`session: ${session.session_id}`);
  lines.push(`pair/tf: ${session.pair} ${session.timeframe}`);
  lines.push(`status: ${session.status}`);
  lines.push(`bars: ${session.cursor + 1}/${session.total_bars}`);

  if (session.prediction) {
    lines.push(`entry: ${Number(session.prediction.entry_price).toFixed(4)}`);
    lines.push(`side: ${session.prediction.side}`);
    if (session.prediction.margin_usdt != null && session.prediction.leverage != null) {
      lines.push(`margin/leverage: ${Number(session.prediction.margin_usdt).toFixed(2)}U x${Number(session.prediction.leverage).toFixed(0)}`);
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
    if (session.trade.pnl_usdt != null) {
      lines.push(`${session.trade.status === "closed" ? "final_pnl_u" : "pnl_u"}: ${Number(session.trade.pnl_usdt).toFixed(3)}U`);
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
  const preservedRange = priceChart.timeScale().getVisibleLogicalRange();
  state.isRefreshingIndicators = true;
  try {
    clearIndicators();

    const configs = state.indicatorConfigs || [];
    if (configs.length === 0) {
      return;
    }

    let idx = 0;
    for (const cfg of configs) {
      const data = await apiGet(
        `/api/replay/sessions/${state.session.session_id}/indicator?${buildIndicatorQuery(cfg)}`
      );
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
    state.isRefreshingIndicators = false;
  }

  if (preservedRange) {
    state.isRangeSyncing = true;
    try {
      priceChart.timeScale().setVisibleLogicalRange(preservedRange);
      indicatorChart.timeScale().setVisibleLogicalRange(preservedRange);
    } finally {
      state.isRangeSyncing = false;
    }
  } else {
    syncIndicatorRangeFromPrice();
  }
}

function renderSession(session, fit = false) {
  state.session = session;

  const bars = session.bars || [];
  state.barsByTime = new Map(bars.map((b) => [Number(b.time), b]));
  candleSeries.setData(
    bars.map((b) => ({
      time: b.time,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }))
  );

  volumeSeries.setData(
    bars.map((b) => ({
      time: b.time,
      value: b.volume,
      color: b.close >= b.open ? "rgba(38,166,154,0.55)" : "rgba(239,83,80,0.55)",
    }))
  );

  if (fit) {
    priceChart.timeScale().fitContent();
    indicatorChart.timeScale().fitContent();
    syncIndicatorRangeFromPrice();
  }

  updatePositionOverlay(session);
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
  const data = await apiGet(`/api/market/timeframes?pair=${encodeURIComponent(pair)}`);
  if (!data.timeframes || data.timeframes.length === 0) {
    el.timeframe.innerHTML = "";
    return false;
  }
  el.timeframe.innerHTML = data.timeframes.map((t) => `<option value="${t}">${t}</option>`).join("");
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
  stopAutoplay();
  clearIndicators();
  hidePositionOverlay();

  const payload = {
    pair: el.pair.value,
    timeframe: el.timeframe.value,
    range_start: dateToUnix(el.startDate.value, false),
    range_end: dateToUnix(el.endDate.value, true),
    visible_bars: Number(el.visibleBars.value),
    hidden_bars: Number(el.hiddenBars.value),
  };

  if (!payload.range_start || !payload.range_end || payload.range_start >= payload.range_end) {
    throw new Error(t("error.invalid_date_range"));
  }

  setStatus(t("status.creating_session"));
  const session = await apiPost("/api/replay/sessions", payload);
  if (session?.bars?.length) {
    const ref = Number(session.bars[session.bars.length - 1]?.close);
    if (Number.isFinite(ref) && ref > 0) {
      const slFactor = 1 - DEFAULT_SL_PCT / 100;
      const tpFactor = 1 + (DEFAULT_SL_PCT * DEFAULT_RR) / 100;
      el.entryPriceLimit.value = ref.toFixed(4);
      el.slPrice.value = (ref * slFactor).toFixed(4);
      el.tpPrice.value = (ref * tpFactor).toFixed(4);
    }
  }
  renderPredictionMetrics();
  renderSession(session, true);
  await refreshIndicators();
  setStatus(t("status.session_created"));
}

async function refreshRandomSession() {
  await loadRange({ keepStart: true });
  await createSession();
  setStatus(t("status.random_refreshed"));
}

async function submitPrediction() {
  if (!state.session) {
    throw new Error(t("error.create_session_first"));
  }
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
  const session = await apiPost(`/api/replay/sessions/${state.session.session_id}/prediction`, payload);
  renderSession(session, false);
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
  if (state.isStepping) {
    return;
  }

  state.isStepping = true;
  try {
    const session = await apiPost(`/api/replay/sessions/${state.session.session_id}/step`, { steps });
    renderSession(session, false);
    await refreshIndicators();
  } finally {
    state.isStepping = false;
  }
}

function stopAutoplay() {
  if (state.autoplayTimer) {
    clearInterval(state.autoplayTimer);
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

  state.autoplayTimer = setInterval(async () => {
    if (!state.session || state.session.done) {
      stopAutoplay();
      return;
    }
    try {
      await step(1);
    } catch (err) {
      stopAutoplay();
      setStatus(String(err.message || err));
    }
  }, speed);
}

function wireEvents() {
  el.pair.addEventListener("change", async () => {
    await loadTimeframes();
    await loadRange();
  });
  el.langSelect.addEventListener("change", () => {
    setLang(el.langSelect.value);
  });

  el.timeframe.addEventListener("change", loadRange);
  document.querySelectorAll('input[name="side"]').forEach((node) => {
    node.addEventListener("change", () => {
      normalizeSlTpForSide();
      renderPredictionMetrics();
    });
  });
  [el.entryPriceLimit, el.marginUsdt, el.leverage, el.slPrice, el.tpPrice].forEach((node) => {
    node.addEventListener("input", renderPredictionMetrics);
  });
  el.addIndicatorBtn.addEventListener("click", () => {
    addIndicatorConfig(el.indicatorSelect.value);
  });

  el.createSessionBtn.addEventListener("click", async () => {
    try {
      await createSession();
    } catch (err) {
      setStatus(t("status.create_failed", { err: err.message || err }));
    }
  });

  el.refreshRandomBtn.addEventListener("click", async () => {
    try {
      await refreshRandomSession();
    } catch (err) {
      setStatus(t("status.refresh_failed", { err: err.message || err }));
    }
  });

  el.submitPredictionBtn.addEventListener("click", async () => {
    try {
      await submitPrediction();
    } catch (err) {
      setStatus(t("status.prediction_failed", { err: err.message || err }));
    }
  });

  el.stepBtn.addEventListener("click", async () => {
    try {
      await step(1);
    } catch (err) {
      setStatus(t("status.step_failed", { err: err.message || err }));
    }
  });

  el.step5Btn.addEventListener("click", async () => {
    try {
      await step(5);
    } catch (err) {
      setStatus(t("status.step_failed", { err: err.message || err }));
    }
  });

  el.playBtn.addEventListener("click", () => {
    try {
      startAutoplay();
    } catch (err) {
      setStatus(t("status.play_failed", { err: err.message || err }));
    }
  });

  el.pauseBtn.addEventListener("click", () => {
    stopAutoplay();
    setStatus(t("status.paused"));
  });

  window.addEventListener("resize", resizeCharts);
}

async function init() {
  applyI18n();
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
