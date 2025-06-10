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

function createDefaultAiState() {
    return { allSignals:[], displayedSignals:[], symbolWinRates:[], overallStats:{}, currentPage:1, itemsPerPage:10, filters:{symbol:'',signalType:'',status:'',minConfidence:''}, sort:{by:'timestamp',order:'desc'}, equityChart:null, signalDetailChart:null };
}

let appState = {};
for (const id in AI_MODELS) { appState[id] = createDefaultAiState(); }

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    generateTabContentHTML();
    setupEventListeners();
    applyStateFromUrl();
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

// --- URL STATE MANAGEMENT ---
function updateUrlWithState(tabId) {
    const state = appState[tabId];
    const params = new URLSearchParams();
    params.set('model', tabId);
    if (state.filters.symbol) params.set('symbol', state.filters.symbol);
    if (state.filters.signalType) params.set('type', state.filters.signalType);
    if (state.filters.status) params.set('status', state.filters.status);
    if (state.filters.minConfidence) params.set('confidence', state.filters.minConfidence);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
}

function applyStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const modelId = params.get('model') || 'ai-max';
    switchTab(modelId, false);
    const state = appState[modelId];
    const filters = state.filters;
    filters.symbol = params.get('symbol') || '';
    filters.signalType = params.get('type') || '';
    filters.status = params.get('status') || '';
    filters.minConfidence = params.get('confidence') || '';
    document.getElementById(`symbol-filter-${modelId}`).value = filters.symbol;
    document.getElementById(`signal-type-filter-${modelId}`).value = filters.signalType;
    document.getElementById(`status-filter-${modelId}`).value = filters.status;
    document.getElementById(`min-confidence-filter-${modelId}`).value = filters.minConfidence;
    if (state.allSignals.length > 0) { updateFullDisplay(modelId); }
}

// --- TAB & VIEW SWITCHING LOGIC ---
function switchTab(tabId, updateUrl = true) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`.tab-button[data-tab-id="${tabId}"]`).classList.add('active');
    updateModelInfoPanel(tabId);
    document.getElementById('model-info-container').classList.remove('active');
    if (appState[tabId].allSignals.length === 0) { fetchSignals(tabId, AI_MODELS[tabId].file); }
    if (updateUrl) { updateUrlWithState(tabId); }
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
/**
 * UPDATED (MORE ROBUST): Fetches real OHLC data and provides instant feedback and error logging.
 */
async function openSignalModal(signalId, aiId) {
    console.log(`Attempting to open modal for signalId: ${signalId}, aiId: ${aiId}`);

    // --- 1. Find the signal data first ---
    const signal = appState[aiId].allSignals.find(s => s.timestamp === signalId);

    if (!signal) {
        console.error("Signal not found! The function will now exit.", { signalId, aiId });
        alert("Error: Could not find the data for the clicked signal.");
        return;
    }
    console.log("Signal found successfully:", signal);

    // --- 2. Find the modal element ---
    const modal = document.getElementById('signal-modal');
    if (!modal) {
        console.error("Modal element with id 'signal-modal' not found in the HTML!");
        return;
    }
    console.log("Modal HTML element found.");

    // --- 3. Make the modal visible IMMEDIATELY with a loading state ---
    // This provides instant user feedback.
    modal.classList.remove('hidden');
    document.getElementById('modal-title').textContent = `${signal.symbol} - ${signal.Signal} Signal`;

    const chartCanvas = document.getElementById('signal-detail-chart');
    const ctx = chartCanvas.getContext('2d');
    
    // Clear previous chart and show loading text
    if (appState.signalDetailChart) {
        appState.signalDetailChart.destroy();
    }
    ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
    ctx.fillStyle = '#a0a0a0';
    ctx.textAlign = 'center';
    ctx.fillText('Loading chart data from proxy...', chartCanvas.width / 2, chartCanvas.height / 2);

    // --- 4. Populate details while chart loads ---
    const detailsContainer = document.getElementById('modal-details');
    detailsContainer.innerHTML = `
        <div class="signal-param"><span class="label">Entry Price:</span><span class="value">${signal["Entry Price"]}</span></div>
        <div class="signal-param"><span class="label">Stop Loss:</span><span class="value">${signal["Stop Loss"]}</span></div>
        <div class="signal-param"><span class="label">Take Profit 1:</span><span class="value">${signal["Take Profit Targets"][0] || 'N/A'}</span></div>
        <div class="signal-param"><span class="label">Confidence:</span><span class="value">${signal.Confidence}%</span></div>
        <div class="signal-param"><span class="label">Status:</span><span class="value">${signal.performance.status} (${signal.performance.closed_by})</span></div>
    `;

    // --- 5. Fetch data and render the chart inside a try...catch block ---
    try {
        console.log("Fetching OHLC data...");
        const ohlcData = await fetchOHLCData(signal.symbol, new Date(signal.timestamp));

        if (ohlcData && ohlcData.length > 0) {
            console.log("OHLC data received. Rendering chart.");
            renderSignalDetailChart(signal, ohlcData);
        } else {
            console.error("Failed to get valid OHLC data, or data was empty.");
            ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
            ctx.fillText('Could not load chart data.', chartCanvas.width / 2, chartCanvas.height / 2);
        }
    } catch (error) {
        console.error("An error occurred during chart fetching or rendering:", error);
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
        ctx.fillText('An error occurred loading the chart.', chartCanvas.width / 2, chartCanvas.height / 2);
    }
}

function closeSignalModal() { 
    document.getElementById('signal-modal').classList.add('hidden'); 
    // Destroy the chart when the modal is closed to free up memory
    if (appState.signalDetailChart) {
        appState.signalDetailChart.destroy();
    }
}

/**
 * UPDATED: Renders a real candlestick chart with annotations.
 */
function renderSignalDetailChart(signal, ohlcData) {
    const ctx = document.getElementById('signal-detail-chart').getContext('2d');
    
    // Destroy previous chart to prevent conflicts
    if (appState.signalDetailChart) {
        appState.signalDetailChart.destroy();
    }

    const entryPrice = parseFloat(signal["Entry Price"]);
    const sl = parseFloat(signal["Stop Loss"]);
    const tp1 = parseFloat(signal["Take Profit Targets"][0]);

    // Create annotation lines for the trade setup
    const annotations = {
        entryLine: { type: 'line', yMin: entryPrice, yMax: entryPrice, borderColor: '#45b7d1', borderWidth: 2, label: { content: `Entry: ${entryPrice.toFixed(2)}`, enabled: true, position: 'start', backgroundColor: 'rgba(69, 183, 209, 0.8)' } },
        slLine: { type: 'line', yMin: sl, yMax: sl, borderColor: '#ff6b6b', borderWidth: 2, label: { content: `SL: ${sl.toFixed(2)}`, enabled: true, position: 'start', backgroundColor: 'rgba(255, 107, 107, 0.8)' } },
        tp1Line: { type: 'line', yMin: tp1, yMax: tp1, borderColor: '#4ecdc4', borderWidth: 2, borderDash: [6, 6], label: { content: `TP1: ${tp1.toFixed(2)}`, enabled: true, position: 'end', backgroundColor: 'rgba(78, 205, 196, 0.8)' } }
    };

    appState.signalDetailChart = new Chart(ctx, {
        type: 'candlestick', // The magic happens here!
        data: {
            datasets: [{
                label: `${signal.symbol} 15m Chart`,
                data: ohlcData
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'hour' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#a0a0a0' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#a0a0a0' }
                }
            },
            plugins: {
                legend: { display: false },
                annotation: { annotations }, // The annotation plugin still works perfectly
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    bodyFont: { size: 14 }
                }
            }
        }
    });
    
    // Change the disclaimer text
    document.querySelector('.chart-disclaimer').innerHTML = `<strong>Note:</strong> Chart data is fetched from the Binance API.`;
}

// --- COMPARISON VIEW LOGIC ---
function initializeComparisonView() {
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

// --- DYNAMIC HTML GENERATION ---
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
            </div>
            <div class="signal-controls" id="signal-controls-${id}">
                <div class="control-group"><label for="symbol-filter-${id}">Symbol:</label><input type="text" id="symbol-filter-${id}" placeholder="e.g., BTCUSDT"></div>
                <div class="control-group"><label for="signal-type-filter-${id}">Type:</label><select id="signal-type-filter-${id}"><option value="">All</option><option value="Buy">Buy</option><option value="Sell">Sell</option></select></div>
                <div class="control-group"><label for="status-filter-${id}">Status:</label><select id="status-filter-${id}"><option value="">All</option><option value="WIN">Win</option><option value="LOSS">Loss</option><option value="PENDING">Pending</option><option value="ACTIVE">Active</option></select></div>
                <div class="control-group"><label for="min-confidence-filter-${id}">Min Confidence (%):</label><input type="number" id="min-confidence-filter-${id}" placeholder="e.g., 50" min="0" max="100"></div>
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

function setupFilterListeners(aiId) {
    const state = appState[aiId];
    const controls = [{id:`symbol-filter-${aiId}`,prop:'symbol',event:'input'},{id:`signal-type-filter-${aiId}`,prop:'signalType',event:'change'},{id:`status-filter-${aiId}`,prop:'status',event:'change'},{id:`min-confidence-filter-${aiId}`,prop:'minConfidence',event:'input'}];
    controls.forEach(control => {
        document.getElementById(control.id)?.addEventListener(control.event, (e) => {
            state.filters[control.prop] = e.target.value;
            state.currentPage = 1; 
            updateFullDisplay(aiId);
            updateUrlWithState(aiId);
        });
    });
}

// --- DATA & RENDERING FUNCTIONS (UNCHANGED CORE LOGIC) ---
// Note: These functions are copied from the previous response and integrated into the new structure.
// Minor changes like passing aiId to renderSignalCard are included.

async function fetchSignals(aiId, jsonFilename) {
    const elementsToClear = document.querySelectorAll(`#${aiId} .stat-value, #${aiId} .details-card div, #${aiId} .performance-grid, #${aiId} .signal-grid, #${aiId} .chart-container canvas`);
    elementsToClear.forEach(el => {
        if (el.tagName !== 'CANVAS') el.innerHTML = '<p style="text-align:center; color: #a0a0a0;">Loading...</p>';
    });

    try {
        const response = await fetch(jsonFilename);
        if (!response.ok) {
            if (response.status === 404) { appState[aiId].allSignals = []; } 
            else { throw new Error(`HTTP error! status: ${response.status}`); }
        } else {
            appState[aiId].allSignals = await response.json();
        }
        
        appState[aiId].overallStats = calculateAllStats(appState[aiId].allSignals);
        appState[aiId].symbolWinRates = calculateSymbolWinRates(appState[aiId].allSignals);
        
        renderOverallStats(aiId);
        renderEquityChart(aiId);
        renderSymbolWinRates(aiId);
        updateFullDisplay(aiId);
    } catch (error) {
        console.error(`Could not load signals from ${jsonFilename}:`, error);
        const errorMsg = `<p style="text-align:center; color: #ff6b6b;">Failed to load data.</p>`;
        elementsToClear.forEach(el => { if (el.tagName !== 'CANVAS') el.innerHTML = errorMsg; });
    }
}

function calculateAllStats(signals) {
    let wins = 0, losses = 0, evaluatedConfidenceSum = 0, evaluatedConfidenceCount = 0;
    let tooRecentCount = 0, totalSignals = signals.length;
    let grossProfit = 0, grossLoss = 0, totalRR = 0, rrCount = 0;
    let equity = 10000, peakEquity = 10000, maxDrawdown = 0;
    const equityCurveData = [];
    let latestTimestamp = null;
    
    const sortedSignals = [...signals].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    if (sortedSignals.length > 0) {
        latestTimestamp = sortedSignals[sortedSignals.length - 1].timestamp;
        equityCurveData.push({ x: new Date(sortedSignals[0].timestamp), y: equity });
    }

    sortedSignals.forEach(signal => {
        if (signal.Signal && signal.Signal.toLowerCase() === 'hold') { totalSignals--; return; }
        const status = (signal.performance && signal.performance.status) ? signal.performance.status.toLowerCase() : null;
        if (status === 'win' || status === 'loss') {
            if (signal.Confidence !== undefined) { evaluatedConfidenceSum += signal.Confidence; evaluatedConfidenceCount++; }
            if (status === 'win') { wins++; } else { losses++; }
        } else if (status === 'too_recent' || status === 'pending' || status === 'active') { tooRecentCount++; }

        if (status === 'win' || status === 'loss') {
            const entry = parseFloat(signal["Entry Price"]);
            const sl = parseFloat(signal["Stop Loss"]);
            const tp1 = Array.isArray(signal["Take Profit Targets"]) ? parseFloat(signal["Take Profit Targets"][0]) : NaN;
            if (!isNaN(entry) && !isNaN(sl) && !isNaN(tp1) && Math.abs(entry - sl) > 0) {
                const rr = Math.abs(tp1 - entry) / Math.abs(entry - sl);
                totalRR += rr;
                rrCount++;
                const profitOrLoss = status === 'win' ? (100 * rr) : -100;
                if(status === 'win') grossProfit += profitOrLoss; else grossLoss += profitOrLoss;
                equity += profitOrLoss;
            }
            peakEquity = Math.max(peakEquity, equity);
            maxDrawdown = Math.max(maxDrawdown, (peakEquity - equity) / peakEquity);
            equityCurveData.push({ x: new Date(signal.timestamp), y: equity });
        }
    });

    const tradableSignals = wins + losses;
    return {
        winRate: tradableSignals > 0 ? (wins / tradableSignals) * 100 : 0,
        tradableSignals, evaluatedSignals: tradableSignals, wins, losses,
        avgConfidence: evaluatedConfidenceCount > 0 ? (evaluatedConfidenceSum / evaluatedConfidenceCount) : 0,
        tooRecent: tooRecentCount, totalSignals,
        profitFactor: grossLoss !== 0 ? Math.abs(grossProfit / grossLoss) : Infinity,
        avgRR: rrCount > 0 ? totalRR / rrCount : 0,
        maxDrawdown: maxDrawdown * 100,
        equityCurveData, latestTimestamp
    };
}

function calculateSymbolWinRates(signals) {
    const symbolStats = {};
    signals.forEach(s => {
        const status = s.performance?.status?.toLowerCase();
        if (s.symbol && (status === 'win' || status === 'loss')) {
            if (!symbolStats[s.symbol]) symbolStats[s.symbol] = { wins: 0, losses: 0 };
            if (status === 'win') symbolStats[s.symbol].wins++; else symbolStats[s.symbol].losses++;
        }
    });
    return Object.entries(symbolStats).map(([symbol, {wins, losses}]) => {
        const total = wins + losses;
        return { symbol, winRate: total > 0 ? (wins / total * 100) : 0, wins, losses, total };
    }).sort((a,b) => a.symbol.localeCompare(b.symbol));
}

function processSignals(aiId) {
    const state = appState[aiId];
    let signalsToProcess = [...state.allSignals].filter(s => s.Signal && s.Signal.toLowerCase() !== 'hold');
    if (state.filters.symbol) signalsToProcess = signalsToProcess.filter(s => s.symbol && s.symbol.toLowerCase().includes(state.filters.symbol.toLowerCase()));
    if (state.filters.signalType) signalsToProcess = signalsToProcess.filter(s => s.Signal && s.Signal.toLowerCase() === state.filters.signalType.toLowerCase());
    if (state.filters.status) {
        const fStatus = state.filters.status.toLowerCase();
        signalsToProcess = signalsToProcess.filter(s => s.performance?.status?.toLowerCase() === fStatus || (fStatus === 'pending' && s.performance?.status?.toLowerCase() === 'too_recent'));
    }
    if (state.filters.minConfidence) {
        signalsToProcess = signalsToProcess.filter(s => s.Confidence !== undefined && s.Confidence >= parseFloat(state.filters.minConfidence));
    }
    state.displayedSignals = signalsToProcess.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function renderOverallStats(aiId) {
    const stats = appState[aiId].overallStats;
    document.getElementById(`stat-win-rate-${aiId}`).textContent = `${stats.winRate.toFixed(2)}%`;
    document.getElementById(`stat-tradable-signals-${aiId}`).textContent = stats.tradableSignals;
    document.getElementById(`stat-avg-confidence-${aiId}`).textContent = `${stats.avgConfidence.toFixed(2)}%`;
    document.getElementById(`stat-too-recent-${aiId}`).textContent = stats.tooRecent;
    document.getElementById(`signal-breakdown-${aiId}`).innerHTML = `
        <div class="detail-item"><span class="detail-label">Evaluated Signals:</span><span class="detail-value">${stats.evaluatedSignals}</span></div>
        <div class="detail-item"><span class="detail-label">Wins / Losses:</span><span class="detail-value"><span class="win">${stats.wins}</span> / <span class="loss">${stats.losses}</span></span></div>
        <div class="detail-item"><span class="detail-label tooltip-container">Profit Factor<span class="tooltip-text">Gross Profit / Gross Loss. >1 is profitable. Based on TP1 & fixed risk.</span></span><span class="detail-value">${isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : 'N/A'}</span></div>
        <div class="detail-item"><span class="detail-label tooltip-container">Avg. R/R (Intended)<span class="tooltip-text">Average Risk/Reward ratio from specified SL and TP1.</span></span><span class="detail-value">${stats.avgRR.toFixed(2)} : 1</span></div>
        <div class="detail-item"><span class="detail-label tooltip-container">Max Drawdown<span class="tooltip-text">Largest peak-to-trough decline in hypothetical equity.</span></span><span class="detail-value loss">${stats.maxDrawdown.toFixed(2)}%</span></div>
        <div class="detail-item"><span class="detail-label">Data Freshness:</span><span class="detail-value">${stats.latestTimestamp ? new Date(stats.latestTimestamp).toLocaleDateString() : 'N/A'}</span></div>`;
}

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
    state.equityChart = new Chart(ctx, { type: 'line', data: { datasets: [{ label: 'Equity ($)', data: state.overallStats.equityCurveData, borderColor: '#4ecdc4', backgroundColor: gradient, fill: true, pointRadius: 0, tension: 0.1, borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'time', time: { unit: 'day' }, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#a0a0a0' } }, y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#a0a0a0', callback: value => '$' + value.toLocaleString() } } }, plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } } } });
}

function renderSymbolWinRates(aiId) {
    const container = document.getElementById(`symbol-winrate-list-${aiId}`);
    const rates = appState[aiId].symbolWinRates;
    if (rates.length === 0) { container.innerHTML = '<p style="text-align:center; color: #a0a0a0;">No symbol data.</p>'; return; }
    container.innerHTML = rates.map(item => {
        const wrClass = item.winRate > 50 ? 'win' : (item.total > 0 ? 'loss' : 'neutral');
        return `<div class="detail-item"><span class="detail-label">${item.symbol}</span><span class="detail-value"><span class="${wrClass}">${item.winRate.toFixed(1)}%</span> <small>(${item.wins}W/${item.losses}L)</small></span></div>`;
    }).join('');
}

function renderSignalCard(signal, aiId) {
    const perf = signal.performance || {};
    const mfe = typeof perf.mfe_percentage === 'number' ? `${perf.mfe_percentage.toFixed(2)}%` : 'N/A';
    const mae = typeof perf.mae_percentage === 'number' ? `${perf.mae_percentage.toFixed(2)}%` : 'N/A';
    const status = perf.status || 'N/A';
    const mfeLabel = `<span class="tooltip-container">MFE %<span class="tooltip-text">Maximum Favorable Excursion: The most profit a trade reached.</span></span>`;
    const maeLabel = `<span class="tooltip-container">MAE %<span class="tooltip-text">Maximum Adverse Excursion: The most a trade went against you.</span></span>`;

    return `<div class="signal-item-card" onclick="openSignalModal('${signal.timestamp}', '${aiId}')">
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

function updateFullDisplay(aiId) {
    processSignals(aiId);
    renderSignalsForPage(aiId);
    renderPaginationControls(aiId);
}

function updateModelInfoPanel(aiId) {
    const info = modelInfoData[aiId];
    document.getElementById('model-info-content').innerHTML = `<h4>${info.title}</h4><p>${info.description}</p>`;
}

/**
 * FINAL VERSION: Fetches OHLC data from the KuCoin API via our proxy.
 */
async function fetchOHLCData(symbol, signalTime) {
    // We only need startTime for the KuCoin API call in the proxy
    const startTime = new Date(signalTime.getTime() - 2 * 60 * 60 * 1000).getTime();

    // The URL is simpler as we do the conversions in the proxy
    const url = `/.netlify/functions/crypto-proxy?symbol=${symbol.toUpperCase()}&startTime=${startTime}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!Array.isArray(data)) {
            console.error("KuCoin proxy did not return an array:", data);
            throw new Error(data.error || 'Invalid data received from proxy.');
        }

        // --- KuCoin data format is different! ---
        // It is: [time, open, close, high, low, volume]
        // We must parse it into the format Chart.js expects: {x, o, h, l, c}
        const parsedData = data.map(d => ({
            x: parseInt(d[0]) * 1000, // Convert Unix seconds back to milliseconds for Chart.js
            o: parseFloat(d[1]),     // open
            h: parseFloat(d[3]),     // high (Note the index is 3)
            l: parseFloat(d[4]),     // low (Note the index is 4)
            c: parseFloat(d[2])      // close (Note the index is 2)
        })).reverse(); // KuCoin also returns newest first, so we reverse it.
        
        return parsedData;

    } catch (error) {
        console.error("Failed to fetch or parse OHLC data via KuCoin proxy:", error);
        return null;
    }
}