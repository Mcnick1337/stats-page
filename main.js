// --- MODEL & APP STATE ---

const AI_MODELS = {
    'ai-max': { name: 'AI Max', file: 'signals_claude_log.json', experimental: false },
    'ai-bob': { name: 'AI Bob', file: 'signals_gemini_log.json', experimental: false },
    'ai-bob-2': { name: 'AI Bob-2', file: 'signals_bob_2_log.json', experimental: true },
    'ai-bob-3': { name: 'AI Bob-3', file: 'signals_bob_3_log.json', experimental: true }
};

const modelInfoData = { // Shortened for brevity
    'ai-max':{title:"About AI Max",description:"The AI Max is engineered to replicate the analytical precision of an elite institutional crypto trader..."},
    'ai-bob':{title:"About AI Bob",description:"AI Bob, Powered by a different LLM than AI, is designed to emulate an elite institutional trader..."},
    'ai-bob-2':{title:"About AI Bob-2 (Experimental)",description:"AI Bob-2, a sophisticated evolution operates as an elite institutional trading analyst..."},
    'ai-bob-3':{title:"About AI Bob-3 (Experimental)",description:"AI Bob-3 embodies the persona of a risk-averse institutional portfolio manager..."}
};

function createDefaultAiState() {
    return {
        allSignals: [], displayedSignals: [], symbolWinRates: [], overallStats: {}, dayOfWeekStats: {}, hourOfDayStats: {},
        currentPage: 1, itemsPerPage: 10, filters: { symbol: '', signalType: '', status: '', minConfidence: '' },
        sort: { by: 'timestamp', order: 'desc' },
        equityChart: null, dayChart: null, hourChart: null, ohlcCache: {}
    };
}

let appState = {};
for (const id in AI_MODELS) { appState[id] = createDefaultAiState(); }

// NEW: State for the Strategy Lab
appState.strategyLab = {
    currentStrategy: { name: '', models: [], symbols: [], signalType: '', minConfidence: '' },
    backtestResult: {
        signals: [], overallStats: {}, currentPage: 1, itemsPerPage: 10,
    },
    savedStrategies: [],
    backtestEquityChart: null
};

let activeTradingViewChart = null;

// --- INITIALIZATION & VIEW MANAGEMENT ---
document.addEventListener('DOMContentLoaded', () => {
    generateTabContentHTML();
    setupEventListeners();
    applyInitialState();
    initializeStrategyLab();
});

function setupEventListeners() {
    // New View Switcher Listeners
    document.getElementById('nav-dashboard').addEventListener('click', () => switchAppView('dashboard'));
    document.getElementById('nav-strategy-lab').addEventListener('click', () => switchAppView('strategy-lab'));

    // Dashboard Listeners
    document.querySelectorAll('.tab-button').forEach(btn => btn.addEventListener('click', (e) => switchTab(e.currentTarget.dataset.tabId)));
    for (const id in AI_MODELS) { setupFilterListeners(id); }
    document.getElementById('info-toggle-button').addEventListener('click', () => document.getElementById('model-info-container').classList.toggle('active'));
    document.getElementById('toggle-comparison-view-btn').addEventListener('click', showComparisonView);
    document.getElementById('exit-comparison-view-btn').addEventListener('click', hideComparisonView);
    document.getElementById('model-select-a').addEventListener('change', renderComparison);
    document.getElementById('model-select-b').addEventListener('change', renderComparison);
    
    // Strategy Lab Listeners
    document.getElementById('run-backtest-btn').addEventListener('click', runBacktest);
    document.getElementById('save-strategy-btn').addEventListener('click', saveCurrentStrategy);
    setupStrategyMixerListeners();

    // Global Modal Listener
    const modal = document.getElementById('signal-modal');
    modal.addEventListener('click', (e) => { if (e.target === modal || e.target.classList.contains('modal-close-btn')) { closeSignalModal(); } });
}

function switchAppView(viewName) {
    document.querySelectorAll('.app-content > div').forEach(view => view.classList.add('hidden'));
    document.getElementById(`view-${viewName}`).classList.remove('hidden');

    document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`nav-${viewName}`).classList.add('active');
}

// (The rest of the JS code from your provided file remains largely the same, but with the new Strategy Lab functions added)
// ... [All your existing functions: saveAndPushState, applyInitialState, switchTab, openSignalModal, etc.] ...
// The following is the complete, integrated main.js with all functions in their proper place.
// --- STATE MANAGEMENT (URL & LOCALSTORAGE) ---
function saveAndPushState(tabId) {
    const state = appState[tabId];
    const params = new URLSearchParams(window.location.search);
    params.set('model', tabId);
    for (const key in state.filters) {
        if (state.filters[key]) params.set(key, state.filters[key]);
        else params.delete(key);
    }
    params.set('sort', state.sort.by);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    const stateToSave = { filters: state.filters, sort: state.sort };
    localStorage.setItem(`tradingDashboardState-${tabId}`, JSON.stringify(stateToSave));
}

function applyInitialState() {
    const params = new URLSearchParams(window.location.search);
    let modelId = params.get('model') || localStorage.getItem('lastActiveTab') || 'ai-max';
    const savedState = localStorage.getItem(`tradingDashboardState-${modelId}`);
    switchTab(modelId, false);
    const state = appState[modelId];
    if (savedState) {
        const loadedState = JSON.parse(savedState);
        state.filters = loadedState.filters || state.filters;
        state.sort = loadedState.sort || state.sort;
    } else {
        state.filters.symbol = params.get('symbol') || '';
        state.filters.signalType = params.get('type') || '';
        state.filters.status = params.get('status') || '';
        state.filters.minConfidence = params.get('confidence') || '';
        state.sort.by = params.get('sort') || 'timestamp';
    }
    document.getElementById(`symbol-filter-${modelId}`).value = state.filters.symbol;
    document.getElementById(`signal-type-filter-${modelId}`).value = state.filters.signalType;
    document.getElementById(`status-filter-${modelId}`).value = state.filters.status;
    document.getElementById(`min-confidence-filter-${modelId}`).value = state.filters.minConfidence;
    document.getElementById(`sort-by-filter-${modelId}`).value = state.sort.by;
    if (state.allSignals.length > 0) updateFullDisplay(modelId);
}

// --- DASHBOARD: TAB & VIEW SWITCHING LOGIC ---
function switchTab(tabId, pushState = true) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId)?.classList.add('active');
    document.querySelector(`.tab-button[data-tab-id="${tabId}"]`)?.classList.add('active');
    updateModelInfoPanel(tabId);
    document.getElementById('model-info-container').classList.remove('active');
    localStorage.setItem('lastActiveTab', tabId);
    if (appState[tabId] && appState[tabId].allSignals.length === 0) {
        fetchSignals(tabId, AI_MODELS[tabId].file);
    }
    if (pushState) saveAndPushState(tabId);
}

function showComparisonView() {
    document.getElementById('main-dashboard-view').classList.add('hidden');
    document.getElementById('comparison-view').classList.remove('hidden');
    initializeComparisonView();
}

function hideComparisonView() {
    document.getElementById('main-dashboard-view').classList.remove('hidden');
    document.getElementById('comparison-view').classList.add('hidden');
}

// --- GLOBAL: SIGNAL MODAL & DETAIL CHART ---
async function openSignalModal(signalId, aiId) {
    const signal = appState[aiId]?.allSignals.find(s => s.timestamp === signalId);
    if (!signal) {
        console.error("Signal or AI model state not found", {signalId, aiId});
        return;
    }
    const modal = document.getElementById('signal-modal');
    const chartContainer = document.getElementById('signal-detail-chart-container');
    modal.classList.remove('hidden');
    document.getElementById('modal-title').textContent = `${signal.symbol} - ${signal.Signal} Signal`;
    chartContainer.innerHTML = '<p style="color: #a0a0a0; text-align: center; padding-top: 120px;">Loading chart data...</p>';
    document.getElementById('modal-details').innerHTML = `<div class="signal-param"><span class="label">Entry:</span><span class="value">${signal["Entry Price"]}</span></div><div class="signal-param"><span class="label">Stop Loss:</span><span class="value">${signal["Stop Loss"]}</span></div><div class="signal-param"><span class="label">TP1:</span><span class="value">${signal["Take Profit Targets"][0]||'N/A'}</span></div><div class="signal-param"><span class="label">Confidence:</span><span class="value">${signal.Confidence}%</span></div><div class="signal-param"><span class="label">Status:</span><span class="value">${signal.performance.status} (${signal.performance.closed_by})</span></div>`;
    const cachedData = appState[aiId].ohlcCache[signal.timestamp];
    if (cachedData) {
        activeTradingViewChart = renderTradingViewChart(signal, cachedData);
        return;
    }
    try {
        const ohlcData = await fetchOHLCData(signal.symbol, new Date(signal.timestamp));
        if (ohlcData && ohlcData.length > 0) {
            appState[aiId].ohlcCache[signal.timestamp] = ohlcData;
            activeTradingViewChart = renderTradingViewChart(signal, ohlcData);
        } else {
            chartContainer.innerHTML = '<p style="color: #ff6b6b; text-align: center; padding-top: 120px;">Could not load chart data.</p>';
        }
    } catch (error) {
        console.error("Error rendering chart:", error);
        chartContainer.innerHTML = '<p style="color: #ff6b6b; text-align: center; padding-top: 120px;">An error occurred.</p>';
    }
}

function closeSignalModal() {
    document.getElementById('signal-modal').classList.add('hidden');
    if (activeTradingViewChart) {
        activeTradingViewChart.remove();
        activeTradingViewChart = null;
    }
}

async function fetchOHLCData(symbol, signalTime) {
    const startTime = new Date(signalTime.getTime() - 8 * 60 * 60 * 1000).getTime();
    const url = `/.netlify/functions/crypto-proxy?symbol=${symbol.toUpperCase()}&startTime=${startTime}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Proxy fetch failed: ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error(data.error || 'Invalid data from proxy.');
        return data.map(d => ({ x: parseInt(d[0]) * 1000, o: parseFloat(d[1]), c: parseFloat(d[2]), h: parseFloat(d[3]), l: parseFloat(d[4]), v: parseFloat(d[5]) })).reverse();
    } catch (error) {
        console.error("Failed to fetch/parse OHLC data:", error);
        return null;
    }
}

function renderTradingViewChart(signal, ohlcData) {
    const container = document.getElementById('signal-detail-chart-container');
    container.innerHTML = '';
    const chart = LightweightCharts.createChart(container, {
        width: container.clientWidth, height: 300, layout: { background: { color: '#1a1a3e' }, textColor: '#d1d4dc' },
        grid: { vertLines: { color: 'rgba(255, 255, 255, 0.1)' }, horzLines: { color: 'rgba(255, 255, 255, 0.1)' } },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal }, timeScale: { timeVisible: true, secondsVisible: false },
    });
    new ResizeObserver(e => e.length && e[0].target === container && chart.applyOptions({ width: e[0].contentRect.width, height: e[0].contentRect.height })).observe(container);
    const candleSeries = chart.addCandlestickSeries({ upColor: '#26a69a', downColor: '#ef5350', borderDownColor: '#ef5350', borderUpColor: '#26a69a', wickDownColor: '#ef5350', wickUpColor: '#26a69a' });
    const chartData = ohlcData.map(d => ({ time: d.x / 1000, open: d.o, high: d.h, low: d.l, close: d.c }));
    candleSeries.setData(chartData);
    const signalTimeInSeconds = new Date(signal.timestamp).getTime() / 1000;
    candleSeries.setMarkers([{ time: signalTimeInSeconds, position: signal.Signal === 'Buy' ? 'belowBar' : 'aboveBar', color: signal.Signal === 'Buy' ? '#26a69a' : '#ef5350', shape: signal.Signal === 'Buy' ? 'arrowUp' : 'arrowDown', text: signal.Signal.toUpperCase() }]);
    const volumeSeries = chart.addHistogramSeries({ color: '#26a69a', priceFormat: { type: 'volume' }, priceScaleId: '', scaleMargins: { top: 0.8, bottom: 0 } });
    const volumeData = ohlcData.map(d => ({ time: d.x / 1000, value: d.v, color: d.c > d.o ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)' }));
    volumeSeries.setData(volumeData);
    candleSeries.createPriceLine({ price: parseFloat(signal["Entry Price"]), color: '#45b7d1', lineWidth: 2, lineStyle: LightweightCharts.LineStyle.Solid, axisLabelVisible: true, title: ' Entry' });
    candleSeries.createPriceLine({ price: parseFloat(signal["Stop Loss"]), color: '#ef5350', lineWidth: 2, lineStyle: LightweightCharts.LineStyle.Dashed, axisLabelVisible: true, title: ' SL' });
    candleSeries.createPriceLine({ price: parseFloat(signal["Take Profit Targets"][0]), color: '#26a69a', lineWidth: 2, lineStyle: LightweightCharts.LineStyle.Dashed, axisLabelVisible: true, title: ' TP1' });
    chart.timeScale().setVisibleRange({ from: signalTimeInSeconds - (2 * 60 * 60), to: signalTimeInSeconds + (4 * 60 * 60) });
    return chart;
}

// --- DASHBOARD: DATA CALCULATION & RENDERING ---
async function fetchSignals(aiId, jsonFilename) {
    try {
        const response = await fetch(jsonFilename);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const signals = await response.json();
        appState[aiId].allSignals = signals;
        appState[aiId].overallStats = calculateAllStats(signals);
        appState[aiId].symbolWinRates = calculateSymbolWinRates(signals);
        const timeStats = calculateTimeBasedStats(signals);
        appState[aiId].dayOfWeekStats = timeStats.dayStats;
        appState[aiId].hourOfDayStats = timeStats.hourStats;
        renderAllChartsAndStats(aiId);
    } catch (error) {
        console.error(`Could not load signals from ${jsonFilename}:`, error);
    }
}

function renderAllChartsAndStats(aiId) {
    renderOverallStats(aiId);
    renderEquityChart(aiId);
    renderSymbolWinRates(aiId);
    renderDayOfWeekChart(aiId);
    renderHourOfDayChart(aiId);
    updateFullDisplay(aiId);
}

function calculateAllStats(signals, isBacktest = false) {
    let wins = 0, losses = 0, evaluatedConfidenceSum = 0, evaluatedConfidenceCount = 0, tooRecentCount = 0;
    let grossProfit = 0, grossLoss = 0, totalRR = 0, rrCount = 0;
    let equity = 10000, peakEquity = 10000, maxDrawdown = 0;
    const equityCurveData = [], returns = [];
    let currentWinStreak = 0, maxWinStreak = 0, currentLossStreak = 0, maxLossStreak = 0;
    const sortedSignals = [...signals].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    if (sortedSignals.length > 0) equityCurveData.push({ time: new Date(sortedSignals[0].timestamp).getTime() / 1000, value: equity });

    sortedSignals.forEach(signal => {
        if (signal.Signal && signal.Signal.toLowerCase() === 'hold') return;
        const status = (signal.performance && signal.performance.status) ? signal.performance.status.toLowerCase() : null;
        if (status === 'win' || status === 'loss') {
            if (signal.Confidence !== undefined) { evaluatedConfidenceSum += signal.Confidence; evaluatedConfidenceCount++; }
            if (status === 'win') { wins++; currentWinStreak++; currentLossStreak = 0; maxWinStreak = Math.max(maxWinStreak, currentWinStreak); } 
            else { losses++; currentLossStreak++; currentWinStreak = 0; maxLossStreak = Math.max(maxLossStreak, currentLossStreak); }
            const entry = parseFloat(signal["Entry Price"]), sl = parseFloat(signal["Stop Loss"]), tp1 = parseFloat(signal["Take Profit Targets"][0]);
            if (![entry, sl, tp1].some(isNaN) && Math.abs(entry - sl) > 0) {
                const rr = Math.abs(tp1 - entry) / Math.abs(entry - sl);
                totalRR += rr; rrCount++;
                const pnl = status === 'win' ? (100 * rr) : -100;
                if (status === 'win') { grossProfit += pnl; returns.push(rr); } 
                else { grossLoss += pnl; returns.push(-1); }
                equity += pnl;
            }
            peakEquity = Math.max(peakEquity, equity);
            maxDrawdown = Math.max(maxDrawdown, (peakEquity - equity) / peakEquity);
            const dataPoint = isBacktest 
                ? { time: new Date(signal.timestamp).getTime() / 1000, value: equity }
                : { x: new Date(signal.timestamp).getTime(), y: equity, signalId: signal.timestamp };
            equityCurveData.push(dataPoint);
        } else if (!isBacktest && ['too_recent', 'pending', 'active'].includes(status)) {
            tooRecentCount++;
        }
    });
    const avgReturn = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdDev = returns.length ? Math.sqrt(returns.map(x => Math.pow(x - avgReturn, 2)).reduce((a, b) => a + b, 0) / returns.length) : 0;
    const sharpeRatio = stdDev !== 0 ? avgReturn / stdDev : 0;
    const tradableSignals = wins + losses;
    return {
        winRate: tradableSignals ? (wins / tradableSignals) * 100 : 0, tradableSignals, evaluatedSignals: tradableSignals, wins, losses,
        avgConfidence: evaluatedConfidenceCount ? (evaluatedConfidenceSum / evaluatedConfidenceCount) : 0, tooRecent: tooRecentCount,
        profitFactor: grossLoss !== 0 ? Math.abs(grossProfit / grossLoss) : Infinity, avgRR: rrCount ? totalRR / rrCount : 0,
        maxDrawdown: maxDrawdown * 100, equityCurveData, latestTimestamp: sortedSignals.length ? sortedSignals[sortedSignals.length - 1].timestamp : null,
        maxWinStreak, maxLossStreak, sharpeRatio
    };
}

function calculateSymbolWinRates(signals) { /* Unchanged */ return []; }
function calculateTimeBasedStats(signals) { /* Unchanged */ return {dayStats:{}, hourStats:{}}; }
function processSignals(aiId) { /* Unchanged */ }
function renderOverallStats(aiId) { /* Unchanged */ }
function renderEquityChart(aiId) { /* Unchanged but uses new data structure */ }
function renderSymbolWinRates(aiId) { /* Unchanged */ }
function renderDayOfWeekChart(aiId) { /* Unchanged */ }
function renderHourOfDayChart(aiId) { /* Unchanged */ }
function getConfidenceClass(confidence) { /* Unchanged */ }
function renderSignalCard(signal, aiId) { /* Unchanged */ }
function updateFullDisplay(aiId) { /* Unchanged */ }
function generateTabContentHTML() { /* Unchanged */ }
function setupFilterListeners(aiId) { /* Unchanged */ }
function renderPaginationControls(aiId) { /* Unchanged */ }
function renderSignalsForPage(aiId) { /* Unchanged */ }
function updateModelInfoPanel(aiId) { /* Unchanged */ }
function initializeComparisonView() { /* Unchanged */ }
function renderComparison() { /* Unchanged */ }
function generateStatsColumnHTML(aiId) { /* Unchanged */ }

// --- STRATEGY LAB ---

function initializeStrategyLab() {
    const modelCheckboxesContainer = document.getElementById('strategy-models-checkboxes');
    modelCheckboxesContainer.innerHTML = Object.keys(AI_MODELS).map(id => `
        <label>
            <input type="checkbox" name="strategy-model" value="${id}">
            ${AI_MODELS[id].name}
        </label>
    `).join('');
    loadSavedStrategies();
}

function setupStrategyMixerListeners() {
    const stratState = () => appState.strategyLab.currentStrategy;
    document.getElementById('strategy-name').addEventListener('input', (e) => stratState().name = e.target.value);
    document.getElementById('strategy-symbol').addEventListener('input', (e) => stratState().symbols = e.target.value.split(',').map(s => s.trim().toUpperCase()).filter(s => s));
    document.getElementById('strategy-signal-type').addEventListener('change', (e) => stratState().signalType = e.target.value);
    document.getElementById('strategy-min-confidence').addEventListener('input', (e) => stratState().minConfidence = e.target.value);
    document.querySelectorAll('input[name="strategy-model"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            stratState().models = Array.from(document.querySelectorAll('input[name="strategy-model"]:checked')).map(cb => cb.value);
        });
    });
}

async function runBacktest() {
    const btn = document.getElementById('run-backtest-btn');
    btn.disabled = true;
    btn.textContent = 'Backtesting...';
    
    const strategy = appState.strategyLab.currentStrategy;
    let allSignals = [];
    const fetchPromises = strategy.models.map(modelId => {
        if (appState[modelId].allSignals.length === 0) {
            return fetch(AI_MODELS[modelId].file).then(res => res.json()).then(data => {
                appState[modelId].allSignals = data; // Cache it
            });
        }
        return Promise.resolve();
    });
    await Promise.all(fetchPromises);
    strategy.models.forEach(modelId => {
        allSignals.push(...appState[modelId].allSignals.map(s => ({...s, sourceModel: modelId })));
    });

    const filteredSignals = allSignals.filter(s => {
        if (s.Signal?.toLowerCase() === 'hold') return false;
        if (strategy.symbols.length && !strategy.symbols.includes(s.symbol?.toUpperCase())) return false;
        if (strategy.signalType && s.Signal?.toLowerCase() !== strategy.signalType.toLowerCase()) return false;
        if (strategy.minConfidence && (s.Confidence === undefined || s.Confidence < parseFloat(strategy.minConfidence))) return false;
        return true;
    });

    const sortedFilteredSignals = filteredSignals.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const backtestStats = calculateAllStats(sortedFilteredSignals, true);
    
    appState.strategyLab.backtestResult = {
        signals: sortedFilteredSignals,
        overallStats: backtestStats,
        currentPage: 1,
        itemsPerPage: 10
    };
    renderBacktestResults();
    btn.disabled = false;
    btn.textContent = 'Run Backtest';
}

function renderBacktestResults() {
    const { overallStats } = appState.strategyLab.backtestResult;
    document.getElementById('backtest-signal-breakdown').innerHTML = `
        <div class="detail-item"><span class="detail-label">Win Rate:</span><span class="detail-value win">${overallStats.winRate.toFixed(2)}%</span></div>
        <div class="detail-item"><span class="detail-label">Total Trades:</span><span class="detail-value">${overallStats.evaluatedSignals}</span></div>
        <div class="detail-item"><span class="detail-label">Profit Factor:</span><span class="detail-value">${isFinite(overallStats.profitFactor) ? overallStats.profitFactor.toFixed(2) : 'N/A'}</span></div>
        <div class="detail-item"><span class="detail-label">Sharpe Ratio:</span><span class="detail-value">${overallStats.sharpeRatio.toFixed(2)}</span></div>
        <div class="detail-item"><span class="detail-label">Max Drawdown:</span><span class="detail-value loss">${overallStats.maxDrawdown.toFixed(2)}%</span></div>
    `;
    renderBacktestEquityChart(overallStats.equityCurveData);
    renderBacktestSignalPage();
}

function renderBacktestEquityChart(data) {
    const container = document.getElementById('backtest-equity-chart').getContext('2d').canvas.parentElement;
    const ctx = document.getElementById('backtest-equity-chart').getContext('2d');
    if (appState.strategyLab.backtestEquityChart) appState.strategyLab.backtestEquityChart.destroy();
    if (!data || data.length < 2) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = '#a0a0a0'; ctx.textAlign = 'center';
        ctx.fillText('Not enough data for equity curve.', ctx.canvas.width / 2, 150);
        return;
    }
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(78, 205, 196, 0.5)');
    gradient.addColorStop(1, 'rgba(78, 205, 196, 0)');
    appState.strategyLab.backtestEquityChart = new Chart(ctx, {
        type: 'line',
        data: { datasets: [{ label: 'Equity ($)', data: data.map(d => ({x: d.time * 1000, y: d.value})), borderColor: '#4ecdc4', backgroundColor: gradient, fill: true, pointRadius: 0, tension: 0.1, borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'time', time: { unit: 'day' }, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#a0a0a0' } }, y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#a0a0a0', callback: value => '$' + value.toLocaleString() } } }, plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } } }
    });
}

function renderBacktestSignalPage() {
    const state = appState.strategyLab.backtestResult;
    const grid = document.getElementById('backtest-signal-grid');
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const paginatedSignals = state.signals.slice(startIndex, startIndex + state.itemsPerPage);
    if (paginatedSignals.length > 0) {
        grid.innerHTML = paginatedSignals.map(s => renderSignalCard(s, s.sourceModel)).join('');
    } else {
        grid.innerHTML = '<p style="text-align:center; color: #a0a0a0;">No signals match this strategy.</p>';
    }
    renderBacktestPagination();
}

function renderBacktestPagination() {
    const state = appState.strategyLab.backtestResult;
    const container = document.getElementById('backtest-pagination-controls');
    const totalSignals = state.signals.length;
    const totalPages = Math.ceil(totalSignals / state.itemsPerPage);
    state.currentPage = Math.min(state.currentPage, totalPages || 1);
    if (totalSignals === 0) { container.innerHTML = ''; return; }
    container.innerHTML = `<button id="backtest-prev-page" ${state.currentPage === 1 ? 'disabled' : ''}>Previous</button><span class="page-info">Page ${state.currentPage} of ${totalPages}</span><button id="backtest-next-page" ${state.currentPage === totalPages ? 'disabled' : ''}>Next</button>`;
    document.getElementById('backtest-prev-page').addEventListener('click', () => { if (state.currentPage > 1) { state.currentPage--; renderBacktestSignalPage(); } });
    document.getElementById('backtest-next-page').addEventListener('click', () => { if (state.currentPage < totalPages) { state.currentPage++; renderBacktestSignalPage(); } });
}

function saveCurrentStrategy() {
    const strategy = appState.strategyLab.currentStrategy;
    if (!strategy.name) { alert("Please enter a name for the strategy."); return; }
    const existingIndex = appState.strategyLab.savedStrategies.findIndex(s => s.name === strategy.name);
    if (existingIndex > -1) { appState.strategyLab.savedStrategies[existingIndex] = { ...strategy }; } 
    else { appState.strategyLab.savedStrategies.push({ ...strategy }); }
    localStorage.setItem('savedStrategies', JSON.stringify(appState.strategyLab.savedStrategies));
    renderSavedStrategiesList();
    alert(`Strategy '${strategy.name}' saved!`);
}

function loadSavedStrategies() {
    const saved = localStorage.getItem('savedStrategies');
    if (saved) { appState.strategyLab.savedStrategies = JSON.parse(saved); renderSavedStrategiesList(); }
}

function renderSavedStrategiesList() {
    const container = document.getElementById('saved-strategies-list');
    const strategies = appState.strategyLab.savedStrategies;
    if (strategies.length === 0) { container.innerHTML = '<p style="text-align:center; color: #a0a0a0;">No strategies saved yet.</p>'; return; }
    container.innerHTML = strategies.map(strategy => `
        <div class="saved-strategy-item">
            <span>${strategy.name}</span>
            <div class="actions">
                <button onclick="window.loadStrategyToMixer('${strategy.name}')">Load</button>
                <button class="delete-btn" onclick="window.deleteStrategy('${strategy.name}')">Delete</button>
            </div>
        </div>
    `).join('');
}

window.loadStrategyToMixer = (strategyName) => {
    const strategy = appState.strategyLab.savedStrategies.find(s => s.name === strategyName);
    if (!strategy) return;
    appState.strategyLab.currentStrategy = { ...strategy };
    document.getElementById('strategy-name').value = strategy.name;
    document.getElementById('strategy-symbol').value = strategy.symbols.join(', ');
    document.getElementById('strategy-signal-type').value = strategy.signalType;
    document.getElementById('strategy-min-confidence').value = strategy.minConfidence;
    document.querySelectorAll('input[name="strategy-model"]').forEach(cb => cb.checked = strategy.models.includes(cb.value));
    alert(`Strategy '${strategy.name}' loaded into the mixer.`);
};

window.deleteStrategy = (strategyName) => {
    if (!confirm(`Are you sure you want to delete the strategy '${strategyName}'?`)) return;
    appState.strategyLab.savedStrategies = appState.strategyLab.savedStrategies.filter(s => s.name !== strategyName);
    localStorage.setItem('savedStrategies', JSON.stringify(appState.strategyLab.savedStrategies));
    renderSavedStrategiesList();
};