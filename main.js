// --- MODEL & APP STATE ---

const AI_MODELS = {
    'ai-max': { name: 'AI Max', file: 'signals_claude_log.json', experimental: false },
    'ai-bob': { name: 'AI Bob', file: 'signals_gemini_log.json', experimental: false },
    'ai-bob-2': { name: 'AI Bob-2', file: 'signals_bob_2_log.json', experimental: true },
    'ai-bob-3': { name: 'AI Bob-3', file: 'signals_bob_3_log.json', experimental: true }
};

const modelInfoData = {
    'ai-max':{title:"About AI Max",description:"The AI Max is engineered to replicate the analytical precision of an elite institutional crypto trader. It performs a comprehensive, real-time analysis of the market by integrating technical indicators, multi-timeframe data, liquidity levels, order flow, and news sentiment.",strengths:["Confluence-Based Signals: Identifies high-probability setups by finding a confluence of technical and order flow signals.","Adaptable Strategy: Dynamically identifies the market scenario (Breakout, Reversal, Trend, Range-Bound) to tailor its approach","Data-Rich Analysis: Processes dozens of data points, from VWAP and order book imbalances to news sentiment, for a holistic market view.","Risk-Managed Precision: Generates signals with specific entry, stop loss, and take profit levels based on a calculated risk/reward ratio."],focus:"Breakout trades, momentum, reversals, and trend continuations."},
    'ai-bob':{title:"About AI Bob",description:"AI Bob, Powered by a different LLM than AI  is designed to emulate an elite institutional trader. Its core function is to perform a comprehensive, multi-layered market analysis to identify high-conviction trading opportunities. Rather than focusing on high-frequency scalping, it specializes in identifying more structured and robust trade setups, such as swing trades and trend continuations.",strengths:["Comprehensive Data Synthesis: Integrates a wide array of data including multi-timeframe technicals, liquidity levels, order flow, fundamentals, and news sentiment.","Confluence-Driven: Excels at identifying scenarios where multiple, independent analytical factors align to produce a strong signal","Adaptive to Market Regimes: Systematically identifies the current market type (Breakout, Reversal, Trend, Range) and adapts its strategy accordingly.","Disciplined & Systematic: Operates with institutional-grade precision, providing clear and structured trade plans with specific entry, stop-loss, and take-profit levels."],focus:"Swing Trades, Trend Continuation, Reversals, and Breakout Scenarios."},
    'ai-bob-2':{title:"About AI Bob-2 (Experimental)",description:"AI Bob-2, a sophisticated evolution operates as an elite institutional trading analyst. It performs an exhaustive, data-driven analysis of the market, synthesizing everything from multi-timeframe indicators and order flow to news sentiment. This version is enhanced with an explicit directive for patience, allowing it to issue a **HOLD** signal and remain on the sidelines when trade conditions are not optimal.",strengths:["Enhanced Patience and Selectivity: Uniquely capable of issuing a HOLD signal, ensuring it only engages in high-conviction setups and actively avoids uncertain market conditions.","Comprehensive Data Synthesis: Integrates a vast array of data for a complete market picture before making a decision.","Adaptive to Market Regimes: Systematically identifies the prevailing market conditions (Breakout, Reversal, Trend, Range) to apply the appropriate strategy.","Disciplined & Systematic: Delivers institutional-grade trade plans with precise, actionable levels for entry, exit, and risk management."],focus:"High-conviction Swing Trades, Trend Continuation, Reversals, and Breakout Scenarios."},
    'ai-bob-3':{title:"About AI Bob-3 (Experimental)",description:"AI Bob-3 embodies the persona of a risk-averse institutional portfolio manager. Its primary directive is **capital expansion**, which it achieves through extreme patience, discipline, and a highly selective trading model. It is explicitly designed to filter out mediocre setups and only engage when market conditions present a clear, high-probability opportunity that meets its strict, multi-layered criteria.",strengths:["Risk-Averse by Design: Its core philosophy is built on a non-negotiable set of Trade Veto Conditions. It will automatically issue a Hold signal if critical requirements, such as a minimum 2.5:1 risk-reward ratio or strong trend alignment, are not met.","Systematic & Patient Framework: Follows a precise, five-step decision-making process that analyzes the market regime, session strength, and signal confluence before considering an entry. It understands that often the best trade is no trade at all.","Performance-Aware & Adaptive: Uniquely, it reviews its own past performance feedback to adjust its confidence and will veto trade setups that have been historically unprofitable in similar conditions.","High-Timeframe & Trend Focused: Prioritizes aligning with the dominant trend on higher timeframes (4h, 1d), viewing it as its primary ally for generating consistent returns."],focus:"Capital preservation, high-probability trend continuation, and swing trading during optimal, high-strength market sessions. Actively avoids unclear, choppy, or low-probability environments."}
};

// UPDATED: App State now includes caching and new stats objects
function createDefaultAiState() {
    return {
        allSignals: [],
        displayedSignals: [],
        symbolWinRates: [],
        overallStats: {},
        dayOfWeekStats: {},
        hourOfDayStats: {},
        currentPage: 1,
        itemsPerPage: 10,
        filters: { symbol: '', signalType: '', status: '', minConfidence: '' },
        sort: { by: 'timestamp', order: 'desc' },
        equityChart: null,
        dayChart: null,
        hourChart: null,
        ohlcCache: {} // NEW: For API data caching
    };
}

let appState = {};
for (const id in AI_MODELS) { appState[id] = createDefaultAiState(); }

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    generateTabContentHTML();
    setupEventListeners();
    applyInitialState(); // UPDATED: Now loads from localStorage
});

function setupEventListeners() {
    document.querySelectorAll('.tab-button').forEach(btn => btn.addEventListener('click', (e) => switchTab(e.currentTarget.dataset.tabId)));
    for (const id in AI_MODELS) { setupFilterListeners(id); }
    document.getElementById('info-toggle-button').addEventListener('click', () => document.getElementById('model-info-container').classList.toggle('active'));
    document.getElementById('toggle-comparison-view-btn').addEventListener('click', showComparisonView);
    document.getElementById('exit-comparison-view-btn').addEventListener('click', hideComparisonView);
    document.getElementById('model-select-a').addEventListener('change', renderComparison);
    document.getElementById('model-select-b').addEventListener('change', renderComparison);
    const modal = document.getElementById('signal-modal');
    modal.addEventListener('click', (e) => { if (e.target === modal || e.target.classList.contains('modal-close-btn')) { closeSignalModal(); } });
}

// --- STATE MANAGEMENT (URL & LOCALSTORAGE) ---
// UPDATED: Now also saves state to localStorage
function saveAndPushState(tabId) {
    const state = appState[tabId];
    const params = new URLSearchParams(window.location.search);
    params.set('model', tabId);
    
    // Update URL search params from state
    for (const key in state.filters) {
        if (state.filters[key]) {
            params.set(key, state.filters[key]);
        } else {
            params.delete(key);
        }
    }
    params.set('sort', state.sort.by);

    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    
    // Save to localStorage
    const stateToSave = { filters: state.filters, sort: state.sort };
    localStorage.setItem(`tradingDashboardState-${tabId}`, JSON.stringify(stateToSave));
}

// UPDATED: Now loads from localStorage first, then URL, then defaults
function applyInitialState() {
    const params = new URLSearchParams(window.location.search);
    let modelId = params.get('model') || 'ai-max';

    // Check for a last-used model ID in localStorage if not in URL
    if (!params.has('model')) {
        modelId = localStorage.getItem('lastActiveTab') || 'ai-max';
    }

    const savedState = localStorage.getItem(`tradingDashboardState-${modelId}`);
    
    switchTab(modelId, false); // Switch to the tab without pushing state yet
    
    const state = appState[modelId];

    if (savedState) {
        const loadedState = JSON.parse(savedState);
        state.filters = loadedState.filters || state.filters;
        state.sort = loadedState.sort || state.sort;
    } else {
        // Fallback to URL params if no localStorage state
        state.filters.symbol = params.get('symbol') || '';
        state.filters.signalType = params.get('type') || '';
        state.filters.status = params.get('status') || '';
        state.filters.minConfidence = params.get('confidence') || '';
        state.sort.by = params.get('sort') || 'timestamp';
    }

    // Update UI elements from the determined state
    document.getElementById(`symbol-filter-${modelId}`).value = state.filters.symbol;
    document.getElementById(`signal-type-filter-${modelId}`).value = state.filters.signalType;
    document.getElementById(`status-filter-${modelId}`).value = state.filters.status;
    document.getElementById(`min-confidence-filter-${modelId}`).value = state.filters.minConfidence;
    document.getElementById(`sort-by-filter-${modelId}`).value = state.sort.by;

    if (state.allSignals.length > 0) {
        updateFullDisplay(modelId);
    }
}

// --- TAB & VIEW SWITCHING LOGIC ---
function switchTab(tabId, pushState = true) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`.tab-button[data-tab-id="${tabId}"]`).classList.add('active');
    updateModelInfoPanel(tabId);
    document.getElementById('model-info-container').classList.remove('active');
    
    localStorage.setItem('lastActiveTab', tabId); // Remember last tab

    if (appState[tabId].allSignals.length === 0) {
        fetchSignals(tabId, AI_MODELS[tabId].file);
    }
    if (pushState) {
        saveAndPushState(tabId);
    }
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

// --- SIGNAL MODAL & DETAIL CHART ---
let activeTradingViewChart = null;

async function openSignalModal(signalId, aiId) {
    const signal = appState[aiId].allSignals.find(s => s.timestamp === signalId);
    if (!signal) { return; }

    const modal = document.getElementById('signal-modal');
    const chartContainer = document.getElementById('signal-detail-chart-container');
    
    modal.classList.remove('hidden');
    document.getElementById('modal-title').textContent = `${signal.symbol} - ${signal.Signal} Signal`;
    chartContainer.innerHTML = '<p style="color: #a0a0a0; text-align: center; padding-top: 120px;">Loading chart data...</p>';
    
    document.getElementById('modal-details').innerHTML = `
        <div class="signal-param"><span class="label">Entry Price:</span><span class="value">${signal["Entry Price"]}</span></div>
        <div class="signal-param"><span class="label">Stop Loss:</span><span class="value">${signal["Stop Loss"]}</span></div>
        <div class="signal-param"><span class="label">Take Profit 1:</span><span class="value">${signal["Take Profit Targets"][0] || 'N/A'}</span></div>
        <div class="signal-param"><span class="label">Confidence:</span><span class="value">${signal.Confidence}%</span></div>
        <div class="signal-param"><span class="label">Status:</span><span class="value">${signal.performance.status} (${signal.performance.closed_by})</span></div>
    `;

    // UPDATED: OHLC Caching Logic
    const cachedData = appState[aiId].ohlcCache[signal.timestamp];
    if (cachedData) {
        activeTradingViewChart = renderTradingViewChart(signal, cachedData);
        return;
    }

    try {
        const ohlcData = await fetchOHLCData(signal.symbol, new Date(signal.timestamp));
        if (ohlcData && ohlcData.length > 0) {
            appState[aiId].ohlcCache[signal.timestamp] = ohlcData; // Cache the data
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
    const modal = document.getElementById('signal-modal');
    modal.classList.add('hidden');
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
        if (!response.ok) throw new Error(`Proxy fetch failed with status ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error(data.error || 'Invalid data received from proxy.');
        
        return data.map(d => ({
            x: parseInt(d[0]) * 1000, o: parseFloat(d[1]), c: parseFloat(d[2]),
            h: parseFloat(d[3]), l: parseFloat(d[4]), v: parseFloat(d[5])
        })).reverse();
    } catch (error) {
        console.error("Failed to fetch or parse OHLC data via KuCoin proxy:", error);
        return null;
    }
}

// UPDATED: Theming and Entry Marker
function renderTradingViewChart(signal, ohlcData) {
    const container = document.getElementById('signal-detail-chart-container');
    container.innerHTML = ''; 

    const chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: 300,
        layout: { background: { color: '#1a1a3e' }, textColor: '#d1d4dc' },
        grid: { vertLines: { color: 'rgba(255, 255, 255, 0.1)' }, horzLines: { color: 'rgba(255, 255, 255, 0.1)' } },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        timeScale: { timeVisible: true, secondsVisible: false },
    });

    new ResizeObserver(entries => {
        if (entries.length === 0 || entries[0].target !== container) { return; }
        const newRect = entries[0].contentRect;
        chart.applyOptions({ width: newRect.width, height: newRect.height });
    }).observe(container);

    const candleSeries = chart.addCandlestickSeries({
        upColor: '#26a69a', downColor: '#ef5350', borderDownColor: '#ef5350',
        borderUpColor: '#26a69a', wickDownColor: '#ef5350', wickUpColor: '#26a69a',
    });
    
    const chartData = ohlcData.map(d => ({ time: d.x / 1000, open: d.o, high: d.h, low: d.l, close: d.c }));
    candleSeries.setData(chartData);

    // NEW: Add an Entry Marker Arrow
    const signalTimeInSeconds = new Date(signal.timestamp).getTime() / 1000;
    candleSeries.setMarkers([{
        time: signalTimeInSeconds,
        position: signal.Signal === 'Buy' ? 'belowBar' : 'aboveBar',
        color: signal.Signal === 'Buy' ? '#26a69a' : '#ef5350',
        shape: signal.Signal === 'Buy' ? 'arrowUp' : 'arrowDown',
        text: signal.Signal.toUpperCase()
    }]);

    const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a', priceFormat: { type: 'volume' },
        priceScaleId: '', scaleMargins: { top: 0.8, bottom: 0 },
    });
    const volumeData = ohlcData.map(d => ({
        time: d.x / 1000, value: d.v,
        color: d.c > d.o ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
    }));
    volumeSeries.setData(volumeData);

    const entryPrice = parseFloat(signal["Entry Price"]);
    const sl = parseFloat(signal["Stop Loss"]);
    const tp1 = parseFloat(signal["Take Profit Targets"][0]);
    
    candleSeries.createPriceLine({ price: entryPrice, color: '#45b7d1', lineWidth: 2, lineStyle: LightweightCharts.LineStyle.Solid, axisLabelVisible: true, title: ' Entry' });
    candleSeries.createPriceLine({ price: sl, color: '#ef5350', lineWidth: 2, lineStyle: LightweightCharts.LineStyle.Dashed, axisLabelVisible: true, title: ' SL' });
    candleSeries.createPriceLine({ price: tp1, color: '#26a69a', lineWidth: 2, lineStyle: LightweightCharts.LineStyle.Dashed, axisLabelVisible: true, title: ' TP1' });

    const from = signalTimeInSeconds - (2 * 60 * 60);
    const to = signalTimeInSeconds + (4 * 60 * 60);
    chart.timeScale().setVisibleRange({ from, to });
    
    return chart;
}

// --- DATA CALCULATION ---
async function fetchSignals(aiId, jsonFilename) {
    // ... (loading message logic remains the same)
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
        // ... (error message logic remains the same)
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


// UPDATED: Now calculates streaks and Sharpe Ratio
function calculateAllStats(signals) {
    let wins = 0, losses = 0, evaluatedConfidenceSum = 0, evaluatedConfidenceCount = 0;
    let tooRecentCount = 0, totalSignals = signals.length;
    let grossProfit = 0, grossLoss = 0, totalRR = 0, rrCount = 0;
    let equity = 10000, peakEquity = 10000, maxDrawdown = 0;
    const equityCurveData = [];
    const returns = []; // For Sharpe Ratio

    let currentWinStreak = 0, maxWinStreak = 0, currentLossStreak = 0, maxLossStreak = 0;
    
    const sortedSignals = [...signals].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    if (sortedSignals.length > 0) {
        equityCurveData.push({ x: new Date(sortedSignals[0].timestamp).getTime(), y: equity, signalId: null });
    }

    sortedSignals.forEach(signal => {
        if (signal.Signal && signal.Signal.toLowerCase() === 'hold') { totalSignals--; return; }
        const status = (signal.performance && signal.performance.status) ? signal.performance.status.toLowerCase() : null;
        
        if (status === 'win' || status === 'loss') {
            if (signal.Confidence !== undefined) { evaluatedConfidenceSum += signal.Confidence; evaluatedConfidenceCount++; }
            
            if (status === 'win') {
                wins++;
                currentWinStreak++;
                currentLossStreak = 0;
                maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
            } else {
                losses++;
                currentLossStreak++;
                currentWinStreak = 0;
                maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
            }
            
            const entry = parseFloat(signal["Entry Price"]);
            const sl = parseFloat(signal["Stop Loss"]);
            const tp1 = Array.isArray(signal["Take Profit Targets"]) ? parseFloat(signal["Take Profit Targets"][0]) : NaN;
            if (!isNaN(entry) && !isNaN(sl) && !isNaN(tp1) && Math.abs(entry - sl) > 0) {
                const rr = Math.abs(tp1 - entry) / Math.abs(entry - sl);
                totalRR += rr;
                rrCount++;
                const profitOrLoss = status === 'win' ? (100 * rr) : -100;
                if(status === 'win') {
                    grossProfit += profitOrLoss;
                    returns.push(rr);
                } else {
                    grossLoss += profitOrLoss;
                    returns.push(-1);
                }
                equity += profitOrLoss;
            }
            peakEquity = Math.max(peakEquity, equity);
            maxDrawdown = Math.max(maxDrawdown, (peakEquity - equity) / peakEquity);
            equityCurveData.push({ x: new Date(signal.timestamp).getTime(), y: equity, signalId: signal.timestamp });
        } else if (status === 'too_recent' || status === 'pending' || status === 'active') {
            tooRecentCount++;
        }
    });

    // Sharpe Ratio Calculation
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdDev = returns.length > 0 ? Math.sqrt(returns.map(x => Math.pow(x - avgReturn, 2)).reduce((a, b) => a + b, 0) / returns.length) : 0;
    const sharpeRatio = stdDev !== 0 ? avgReturn / stdDev : 0;

    const tradableSignals = wins + losses;
    return {
        winRate: tradableSignals > 0 ? (wins / tradableSignals) * 100 : 0,
        tradableSignals, evaluatedSignals: tradableSignals, wins, losses,
        avgConfidence: evaluatedConfidenceCount > 0 ? (evaluatedConfidenceSum / evaluatedConfidenceCount) : 0,
        tooRecent: tooRecentCount, totalSignals,
        profitFactor: grossLoss !== 0 ? Math.abs(grossProfit / grossLoss) : Infinity,
        avgRR: rrCount > 0 ? totalRR / rrCount : 0,
        maxDrawdown: maxDrawdown * 100,
        equityCurveData,
        latestTimestamp: sortedSignals.length > 0 ? sortedSignals[sortedSignals.length - 1].timestamp : null,
        maxWinStreak, maxLossStreak, sharpeRatio
    };
}

// UPDATED: Now calculates profit factor per symbol
function calculateSymbolWinRates(signals) {
    const symbolStats = {};
    signals.forEach(s => {
        const status = s.performance?.status?.toLowerCase();
        if (s.symbol && (status === 'win' || status === 'loss')) {
            if (!symbolStats[s.symbol]) {
                symbolStats[s.symbol] = { wins: 0, losses: 0, grossProfit: 0, grossLoss: 0 };
            }
            if (status === 'win') symbolStats[s.symbol].wins++;
            else symbolStats[s.symbol].losses++;

            const entry = parseFloat(s["Entry Price"]);
            const sl = parseFloat(s["Stop Loss"]);
            const tp1 = Array.isArray(s["Take Profit Targets"]) ? parseFloat(s["Take Profit Targets"][0]) : NaN;
            if (!isNaN(entry) && !isNaN(sl) && !isNaN(tp1) && Math.abs(entry - sl) > 0) {
                const rr = Math.abs(tp1 - entry) / Math.abs(entry - sl);
                const profitOrLoss = status === 'win' ? (100 * rr) : -100;
                if (status === 'win') symbolStats[s.symbol].grossProfit += profitOrLoss;
                else symbolStats[s.symbol].grossLoss += profitOrLoss;
            }
        }
    });
    return Object.entries(symbolStats).map(([symbol, {wins, losses, grossProfit, grossLoss}]) => {
        const total = wins + losses;
        return {
            symbol,
            winRate: total > 0 ? (wins / total * 100) : 0,
            wins, losses, total,
            profitFactor: grossLoss !== 0 ? Math.abs(grossProfit / grossLoss) : Infinity,
        };
    }).sort((a,b) => a.symbol.localeCompare(b.symbol));
}

// NEW: Function for time-based analysis
function calculateTimeBasedStats(signals) {
    const dayStats = { 0: {w:0, l:0}, 1: {w:0, l:0}, 2: {w:0, l:0}, 3: {w:0, l:0}, 4: {w:0, l:0}, 5: {w:0, l:0}, 6: {w:0, l:0} };
    const hourStats = {};
    for(let i=0; i<24; i++) hourStats[i] = {w:0, l:0};

    signals.forEach(s => {
        const status = s.performance?.status?.toLowerCase();
        if (status === 'win' || status === 'loss') {
            const date = new Date(s.timestamp);
            const day = date.getDay();
            const hour = date.getHours();
            if (status === 'win') {
                dayStats[day].w++;
                hourStats[hour].w++;
            } else {
                dayStats[day].l++;
                hourStats[hour].l++;
            }
        }
    });
    return { dayStats, hourStats };
}

// --- RENDERING ---
// UPDATED: To handle sorting
function processSignals(aiId) {
    const state = appState[aiId];
    let signalsToProcess = [...state.allSignals].filter(s => s.Signal && s.Signal.toLowerCase() !== 'hold');
    
    // Filtering
    if (state.filters.symbol) signalsToProcess = signalsToProcess.filter(s => s.symbol && s.symbol.toLowerCase().includes(state.filters.symbol.toLowerCase()));
    if (state.filters.signalType) signalsToProcess = signalsToProcess.filter(s => s.Signal && s.Signal.toLowerCase() === state.filters.signalType.toLowerCase());
    if (state.filters.status) {
        const fStatus = state.filters.status.toLowerCase();
        signalsToProcess = signalsToProcess.filter(s => s.performance?.status?.toLowerCase() === fStatus || (fStatus === 'pending' && s.performance?.status?.toLowerCase() === 'too_recent'));
    }
    if (state.filters.minConfidence) {
        signalsToProcess = signalsToProcess.filter(s => s.Confidence !== undefined && s.Confidence >= parseFloat(state.filters.minConfidence));
    }

    // Sorting
    signalsToProcess.sort((a, b) => {
        switch (state.sort.by) {
            case 'confidence':
                return (b.Confidence || 0) - (a.Confidence || 0);
            case 'symbol':
                return (a.symbol || '').localeCompare(b.symbol || '');
            case 'timestamp':
            default:
                return new Date(b.timestamp) - new Date(a.timestamp);
        }
    });

    state.displayedSignals = signalsToProcess;
}

// UPDATED: Now renders new streak and Sharpe ratio stats
function renderOverallStats(aiId) {
    const stats = appState[aiId].overallStats;
    document.getElementById(`stat-win-rate-${aiId}`).textContent = `${stats.winRate.toFixed(2)}%`;
    document.getElementById(`stat-tradable-signals-${aiId}`).textContent = stats.tradableSignals;
    document.getElementById(`stat-avg-confidence-${aiId}`).textContent = `${stats.avgConfidence.toFixed(2)}%`;
    document.getElementById(`stat-too-recent-${aiId}`).textContent = stats.tooRecent;
    
    const breakdownHTML = `
        <div class="detail-item"><span class="detail-label">Evaluated Signals:</span><span class="detail-value">${stats.evaluatedSignals}</span></div>
        <div class="detail-item"><span class="detail-label">Wins / Losses:</span><span class="detail-value"><span class="win">${stats.wins}</span> / <span class="loss">${stats.losses}</span></span></div>
        <div class="detail-item"><span class="detail-label">Max Win Streak:</span><span class="detail-value win">${stats.maxWinStreak}</span></div>
        <div class="detail-item"><span class="detail-label">Max Loss Streak:</span><span class="detail-value loss">${stats.maxLossStreak}</span></div>
        <div class="detail-item"><span class="detail-label tooltip-container">Profit Factor<span class="tooltip-text">Gross Profit / Gross Loss. >1 is profitable.</span></span><span class="detail-value">${isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : 'N/A'}</span></div>
        <div class="detail-item"><span class="detail-label tooltip-container">Avg. R/R (Intended)<span class="tooltip-text">Average Risk/Reward ratio from specified SL and TP1.</span></span><span class="detail-value">${stats.avgRR.toFixed(2)} : 1</span></div>
        <div class="detail-item"><span class="detail-label tooltip-container">Sharpe Ratio<span class="tooltip-text">Risk-adjusted return. Higher is better. Based on 1R returns.</span></span><span class="detail-value">${stats.sharpeRatio.toFixed(2)}</span></div>
        <div class="detail-item"><span class="detail-label tooltip-container">Max Drawdown<span class="tooltip-text">Largest peak-to-trough decline in hypothetical equity.</span></span><span class="detail-value loss">${stats.maxDrawdown.toFixed(2)}%</span></div>
        <div class="detail-item"><span class="detail-label">Data Freshness:</span><span class="detail-value">${stats.latestTimestamp ? new Date(stats.latestTimestamp).toLocaleDateString() : 'N/A'}</span></div>`;
    document.getElementById(`signal-breakdown-${aiId}`).innerHTML = breakdownHTML;
}

// UPDATED: Interactive Equity Curve
function renderEquityChart(aiId) {
    const state = appState[aiId];
    const ctx = document.getElementById(`equity-chart-${aiId}`).getContext('2d');
    if (state.equityChart) { state.equityChart.destroy(); }
    if (!state.overallStats.equityCurveData || state.overallStats.equityCurveData.length < 2) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = '#a0a0a0'; ctx.textAlign = 'center';
        ctx.fillText('Not enough data for equity curve.', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(78, 205, 196, 0.5)');
    gradient.addColorStop(1, 'rgba(78, 205, 196, 0)');
    
    let lastHighlightedIndex = -1;

    state.equityChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Equity ($)',
                data: state.overallStats.equityCurveData,
                borderColor: '#4ecdc4',
                backgroundColor: gradient,
                fill: true,
                pointRadius: 0,
                tension: 0.1,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { type: 'time', time: { unit: 'day' }, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#a0a0a0' } },
                y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#a0a0a0', callback: value => '$' + value.toLocaleString() } }
            },
            plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
            onHover: (event, chartElement) => {
                if (chartElement.length > 0) {
                    const index = chartElement[0].index;
                    if (index === lastHighlightedIndex) return;

                    const signalId = state.overallStats.equityCurveData[index].signalId;
                    document.querySelectorAll('.signal-item-card.highlighted').forEach(c => c.classList.remove('highlighted'));
                    
                    if (signalId) {
                        const card = document.querySelector(`.signal-item-card[data-timestamp="${signalId}"]`);
                        if (card) {
                            card.classList.add('highlighted');
                            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                    }
                    lastHighlightedIndex = index;
                }
            }
        }
    });
    // Add listener to clear highlight when mouse leaves chart
    ctx.canvas.addEventListener('mouseleave', () => {
        document.querySelectorAll('.signal-item-card.highlighted').forEach(c => c.classList.remove('highlighted'));
        lastHighlightedIndex = -1;
    });
}

// UPDATED: Now shows Profit Factor
function renderSymbolWinRates(aiId) {
    const container = document.getElementById(`symbol-winrate-list-${aiId}`);
    const rates = appState[aiId].symbolWinRates;
    if (rates.length === 0) { container.innerHTML = '<p style="text-align:center; color: #a0a0a0;">No symbol data.</p>'; return; }
    container.innerHTML = rates.map(item => {
        const wrClass = item.winRate > 50 ? 'win' : (item.total > 0 ? 'loss' : 'neutral');
        const pfText = isFinite(item.profitFactor) ? `PF: ${item.profitFactor.toFixed(2)}` : '';
        return `<div class="detail-item"><span class="detail-label">${item.symbol}</span><span class="detail-value"><span class="${wrClass}">${item.winRate.toFixed(1)}%</span> <small>(${item.wins}W/${item.losses}L) ${pfText}</small></span></div>`;
    }).join('');
}

// NEW: Render chart for Day of Week performance
function renderDayOfWeekChart(aiId) {
    const state = appState[aiId];
    const ctx = document.getElementById(`day-performance-chart-${aiId}`).getContext('2d');
    if(state.dayChart) state.dayChart.destroy();

    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const winData = labels.map((_, i) => state.dayOfWeekStats[i].w);
    const lossData = labels.map((_, i) => state.dayOfWeekStats[i].l);

    state.dayChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Wins', data: winData, backgroundColor: 'rgba(78, 205, 196, 0.7)' },
                { label: 'Losses', data: lossData, backgroundColor: 'rgba(255, 107, 107, 0.7)' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { 
                x: { stacked: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#a0a0a0' } },
                y: { stacked: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#a0a0a0' } }
            },
            plugins: { legend: { labels: { color: '#a0a0a0' } } }
        }
    });
}

// NEW: Render chart for Hour of Day performance
function renderHourOfDayChart(aiId) {
    const state = appState[aiId];
    const ctx = document.getElementById(`hour-performance-chart-${aiId}`).getContext('2d');
    if(state.hourChart) state.hourChart.destroy();

    const labels = Object.keys(state.hourOfDayStats).map(h => h.padStart(2, '0'));
    const winData = Object.values(state.hourOfDayStats).map(s => s.w);
    const lossData = Object.values(state.hourOfDayStats).map(s => s.l);

    state.hourChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Wins', data: winData, backgroundColor: 'rgba(78, 205, 196, 0.7)' },
                { label: 'Losses', data: lossData, backgroundColor: 'rgba(255, 107, 107, 0.7)' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { 
                x: { stacked: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#a0a0a0' } },
                y: { stacked: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#a0a0a0' } }
            },
            plugins: { legend: { labels: { color: '#a0a0a0' } } }
        }
    });
}

// NEW: Helper for confidence glows
function getConfidenceClass(confidence) {
    if (confidence >= 85) return 'confidence-high';
    if (confidence >= 70) return 'confidence-medium';
    return 'confidence-low';
}

// UPDATED: To add confidence class and data-timestamp
function renderSignalCard(signal, aiId) {
    const perf = signal.performance || {};
    const mfe = typeof perf.mfe_percentage === 'number' ? `${perf.mfe_percentage.toFixed(2)}%` : 'N/A';
    const mae = typeof perf.mae_percentage === 'number' ? `${perf.mae_percentage.toFixed(2)}%` : 'N/A';
    const status = perf.status || 'N/A';
    const confidenceClass = getConfidenceClass(signal.Confidence);
    const mfeLabel = `<span class="tooltip-container">MFE %<span class="tooltip-text">Maximum Favorable Excursion</span></span>`;
    const maeLabel = `<span class="tooltip-container">MAE %<span class="tooltip-text">Maximum Adverse Excursion</span></span>`;

    return `<div class="signal-item-card ${confidenceClass}" data-timestamp="${signal.timestamp}" onclick="openSignalModal('${signal.timestamp}', '${aiId}')">
        <div class="signal-item-header">
            <span class="signal-symbol">${signal.symbol || 'N/A'}</span>
            <span class="signal-action ${signal.Signal?.toLowerCase() === 'buy' ? 'signal-buy' : 'signal-sell'}">${signal.Signal || 'N/A'}</span>
        </div>
        <div class="signal-item-body">
            <div class="signal-param"><span class="label">Entry:</span><span class="value">${signal["Entry Price"]}</span></div>
            <div class="signal-param"><span class="label">Confidence:</span><span class="value">${signal.Confidence}%</span></div>
            <div class="signal-param"><span class="label">${mfeLabel}:</span><span class="value">${mfe}</span></div>
            <div class="signal-param"><span class="label">${maeLabel}:</span><span class="value">${mae}</span></div>
        </div>
        <div class="signal-item-footer">
            <span class="signal-timestamp">${new Date(signal.timestamp).toLocaleString()}</span>
            <span class="signal-status signal-status-${status.toLowerCase()}">${status}</span>
        </div>
    </div>`;
}

function updateFullDisplay(aiId) {
    processSignals(aiId);
    renderSignalsForPage(aiId);
    renderPaginationControls(aiId);
}

// --- DYNAMIC HTML & LISTENERS ---
function generateTabContentHTML() {
    const wrapper = document.getElementById('tab-content-wrapper');
    let html = '';
    for (const id in AI_MODELS) {
        const model = AI_MODELS[id];
        const isExp = model.experimental;
        html += `<div id="${id}" class="tab-content">
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-value win-rate" id="stat-win-rate-${id}">0%</div><div class="stat-label">Win Rate</div></div>
                <div class="stat-card"><div class="stat-value total-signals" id="stat-tradable-signals-${id}">0</div><div class="stat-label">Tradable Signals</div></div>
                <div class="stat-card"><div class="stat-value confidence" id="stat-avg-confidence-${id}">0%</div><div class="stat-label">Avg Confidence</div></div>
                <div class="stat-card"><div class="stat-value pending" id="stat-too-recent-${id}">0</div><div class="stat-label">Pending / Active</div></div>
            </div>
            <div class="chart-container details-card">
                 <h3 class="section-title ${isExp ? 'experimental-header' : ''}">Hypothetical Equity Curve</h3>
                 <canvas id="equity-chart-${id}"></canvas>
            </div>
            <div class="details-section">
                 <div class="details-card">
                    <h3 class="section-title ${isExp ? 'experimental-header' : ''}">Signal Breakdown</h3>
                    <div id="signal-breakdown-${id}"></div>
                </div>
                <div class="details-card">
                    <h3 class="section-title ${isExp ? 'experimental-header' : ''}">Win Rate by Symbol</h3>
                    <div class="symbol-winrate-list" id="symbol-winrate-list-${id}"></div>
                </div>
                <!-- NEW: Time-based charts -->
                <div class="details-card">
                    <h3 class="section-title ${isExp ? 'experimental-header' : ''}">Performance by Day</h3>
                    <canvas id="day-performance-chart-${id}"></canvas>
                </div>
                <div class="details-card">
                    <h3 class="section-title ${isExp ? 'experimental-header' : ''}">Performance by Hour</h3>
                    <canvas id="hour-performance-chart-${id}"></canvas>
                </div>
            </div>
            <div class="signal-controls" id="signal-controls-${id}">
                <div class="control-group"><label for="symbol-filter-${id}">Symbol:</label><input type="text" id="symbol-filter-${id}" placeholder="e.g., BTCUSDT"></div>
                <div class="control-group"><label for="signal-type-filter-${id}">Type:</label><select id="signal-type-filter-${id}"><option value="">All</option><option value="Buy">Buy</option><option value="Sell">Sell</option></select></div>
                <div class="control-group"><label for="status-filter-${id}">Status:</label><select id="status-filter-${id}"><option value="">All</option><option value="WIN">Win</option><option value="LOSS">Loss</option><option value="PENDING">Pending</option><option value="ACTIVE">Active</option></select></div>
                <div class="control-group"><label for="min-confidence-filter-${id}">Min Confidence (%):</label><input type="number" id="min-confidence-filter-${id}" placeholder="e.g., 50" min="0" max="100"></div>
                <!-- NEW: Sort dropdown -->
                <div class="control-group"><label for="sort-by-filter-${id}">Sort By:</label><select id="sort-by-filter-${id}">
                    <option value="timestamp">Date (Newest First)</option>
                    <option value="confidence">Confidence (High-Low)</option>
                    <option value="symbol">Symbol (A-Z)</option>
                </select></div>
            </div>
            <div class="signal-catalog-section">
                ${isExp ? '<span class="experimental-title-overlay">Experimental</span>' : ''}
                <h2 class="section-title ${isExp ? 'experimental-header' : ''}">${model.name} - Signal Catalog</h2>
                <div class="signal-grid" id="signal-grid-${id}"></div>
                <div class="pagination-controls" id="pagination-controls-${id}"></div>
            </div>
        </div>`;
    }
    wrapper.innerHTML = html;
}

// UPDATED: Now listens for sorting changes
function setupFilterListeners(aiId) {
    const state = appState[aiId];
    const controls = [
        {id:`symbol-filter-${aiId}`,prop:'symbol',event:'input', stateKey: 'filters'},
        {id:`signal-type-filter-${aiId}`,prop:'signalType',event:'change', stateKey: 'filters'},
        {id:`status-filter-${aiId}`,prop:'status',event:'change', stateKey: 'filters'},
        {id:`min-confidence-filter-${aiId}`,prop:'minConfidence',event:'input', stateKey: 'filters'},
        {id:`sort-by-filter-${aiId}`,prop:'by',event:'change', stateKey: 'sort'}
    ];

    controls.forEach(control => {
        document.getElementById(control.id)?.addEventListener(control.event, (e) => {
            if (control.stateKey === 'filters') {
                state.filters[control.prop] = e.target.value;
            } else {
                state.sort[control.prop] = e.target.value;
            }
            state.currentPage = 1; 
            updateFullDisplay(aiId);
            saveAndPushState(aiId);
        });
    });
}

function renderPaginationControls(aiId) {
    const state = appState[aiId];
    const container = document.getElementById(`pagination-controls-${aiId}`);
    const totalSignals = state.displayedSignals.length;
    const totalPages = Math.ceil(totalSignals / state.itemsPerPage);
    state.currentPage = Math.min(state.currentPage, totalPages || 1);
    
    if (totalSignals === 0) { container.innerHTML = '<span class="page-info">No signals to display.</span>'; return; }
    
    container.innerHTML = `
        <button id="prev-page-${aiId}" ${state.currentPage === 1 ? 'disabled' : ''}>Previous</button>
        <span class="page-info">Page ${state.currentPage} of ${totalPages}</span>
        <button id="next-page-${aiId}" ${state.currentPage === totalPages ? 'disabled' : ''}>Next</button>`;
        
    document.getElementById(`prev-page-${aiId}`).addEventListener('click', () => { if (state.currentPage > 1) { state.currentPage--; updateFullDisplay(aiId); } });
    document.getElementById(`next-page-${aiId}`).addEventListener('click', () => { if (state.currentPage < totalPages) { state.currentPage++; updateFullDisplay(aiId); } });
}

function renderSignalsForPage(aiId) {
    const state = appState[aiId];
    const grid = document.getElementById(`signal-grid-${aiId}`);
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const paginatedSignals = state.displayedSignals.slice(startIndex, startIndex + state.itemsPerPage);
    if (paginatedSignals.length > 0) {
        grid.innerHTML = paginatedSignals.map(s => renderSignalCard(s, aiId)).join('');
    } else {
        grid.innerHTML = '<p style="text-align:center; color: #a0a0a0;">No signals match your criteria.</p>';
    }
}

function updateModelInfoPanel(aiId) {
    const info = modelInfoData[aiId];
    document.getElementById('model-info-content').innerHTML = `<h4>${info.title}</h4><p>${info.description}</p>`;
}

function initializeComparisonView() {
    // This function remains unchanged
    const selectA = document.getElementById('model-select-a');
    const selectB = document.getElementById('model-select-b');
    selectA.innerHTML = '<option value="">Select Model A</option>';
    selectB.innerHTML = '<option value="">Select Model B</option>';
    for (const id in AI_MODELS) {
        selectA.innerHTML += `<option value="${id}">${AI_MODELS[id].name}</option>`;
        selectB.innerHTML += `<option value="${id}">${AI_MODELS[id].name}</option>`;
    }
}

function renderComparison() {
    // This function remains unchanged
    const modelA_id = document.getElementById('model-select-a').value;
    const modelB_id = document.getElementById('model-select-b').value;
    const grid = document.getElementById('comparison-grid');
    if (!modelA_id || !modelB_id || modelA_id === modelB_id) {
        grid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">Please select two different models to compare.</p>';
        return;
    }
    grid.innerHTML = `<div class="comparison-column">${generateStatsColumnHTML(modelA_id)}</div><div class="comparison-column">${generateStatsColumnHTML(modelB_id)}</div>`;
}

function generateStatsColumnHTML(aiId) {
    // This function remains unchanged but will benefit from new stats if you choose to add them here
    const stats = appState[aiId].overallStats;
    if (Object.keys(stats).length === 0) { return `<div class="details-card"><h3 class="section-title">${AI_MODELS[aiId].name}</h3><p>Data not loaded yet.</p></div>`; }
    const breakdownHTML = `
        <div class="detail-item"><span class="detail-label">Win Rate:</span><span class="detail-value win">${stats.winRate.toFixed(2)}%</span></div>
        <div class="detail-item"><span class="detail-label">Evaluated Signals:</span><span class="detail-value">${stats.evaluatedSignals}</span></div>
        <div class="detail-item"><span class="detail-label">Wins / Losses:</span><span class="detail-value"><span class="win">${stats.wins}</span> / <span class="loss">${stats.losses}</span></span></div>
        <div class="detail-item"><span class="detail-label">Profit Factor:</span><span class="detail-value">${isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : 'N/A'}</span></div>
        <div class="detail-item"><span class="detail-label">Avg. R/R:</span><span class="detail-value">${stats.avgRR.toFixed(2)} : 1</span></div>
        <div class="detail-item"><span class="detail-label">Max Drawdown:</span><span class="detail-value loss">${stats.maxDrawdown.toFixed(2)}%</span></div>`;
    return `<div class="details-card"><h3 class="section-title">${AI_MODELS[aiId].name} Performance</h3>${breakdownHTML}</div>`;
}