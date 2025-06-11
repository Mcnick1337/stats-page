// --- Global State Object ---
function createDefaultAiState() {
    return {
        allSignals: [], 
        displayedSignals: [], 
        symbolWinRates: [], 
        overallStats: { /* Populated by calculation */ },
        currentPage: 1, 
        itemsPerPage: 10, 
        filters: { symbol: '', signalType: '', status: '', minConfidence: '' },
        sort: { by: 'timestamp', order: 'desc' },
        chartInstance: null // To hold the chart object
    };
}

let appState = {
    'ai-max': createDefaultAiState(),
    'ai-bob': createDefaultAiState(),
    'ai-bob-2': createDefaultAiState(),
    'ai-bob-3': createDefaultAiState()
};

const modelInfoData = {
    'ai-max': {
        title: "About AI Max",
        description: "The AI Max is engineered to replicate the analytical precision of an elite institutional crypto trader. It performs a comprehensive, real-time analysis of the market by integrating technical indicators, multi-timeframe data, liquidity levels, order flow, and news sentiment.",
        strengths: [
            "Confluence-Based Signals: Identifies high-probability setups by finding a confluence of technical and order flow signals.",
            "Adaptable Strategy: Dynamically identifies the market scenario (Breakout, Reversal, Trend, Range-Bound) to tailor its approach",
            "Data-Rich Analysis: Processes dozens of data points, from VWAP and order book imbalances to news sentiment, for a holistic market view.",
            "Risk-Managed Precision: Generates signals with specific entry, stop loss, and take profit levels based on a calculated risk/reward ratio."
        ],
        focus: "Breakout trades, momentum, reversals, and trend continuations.",
    },
    'ai-bob': {
        title: "About AI Bob",
        description: "AI Bob, Powered by a different LLM than AI  is designed to emulate an elite institutional trader. Its core function is to perform a comprehensive, multi-layered market analysis to identify high-conviction trading opportunities. Rather than focusing on high-frequency scalping, it specializes in identifying more structured and robust trade setups, such as swing trades and trend continuations.",
        strengths: [
            "Comprehensive Data Synthesis: Integrates a wide array of data including multi-timeframe technicals, liquidity levels, order flow, fundamentals, and news sentiment.",
            "Confluence-Driven: Excels at identifying scenarios where multiple, independent analytical factors align to produce a strong signal",
            "Adaptive to Market Regimes: Systematically identifies the current market type (Breakout, Reversal, Trend, Range) and adapts its strategy accordingly.",
            "Disciplined & Systematic: Operates with institutional-grade precision, providing clear and structured trade plans with specific entry, stop-loss, and take-profit levels."
        ],
        focus: "Swing Trades, Trend Continuation, Reversals, and Breakout Scenarios.",
    },
    'ai-bob-2': {
        title: "About AI Bob-2 (Experimental)",
        description: "AI Bob-2, a sophisticated evolution operates as an elite institutional trading analyst. It performs an exhaustive, data-driven analysis of the market, synthesizing everything from multi-timeframe indicators and order flow to news sentiment. This version is enhanced with an explicit directive for patience, allowing it to issue a **HOLD** signal and remain on the sidelines when trade conditions are not optimal.",
        strengths: [
            "Enhanced Patience and Selectivity: Uniquely capable of issuing a HOLD signal, ensuring it only engages in high-conviction setups and actively avoids uncertain market conditions.",
            "Comprehensive Data Synthesis: Integrates a vast array of data for a complete market picture before making a decision.",
            "Adaptive to Market Regimes: Systematically identifies the prevailing market conditions (Breakout, Reversal, Trend, Range) to apply the appropriate strategy.",
            "Disciplined & Systematic: Delivers institutional-grade trade plans with precise, actionable levels for entry, exit, and risk management."
        ],
        focus: "High-conviction Swing Trades, Trend Continuation, Reversals, and Breakout Scenarios.",
    },
    'ai-bob-3': {
        title: "About AI Bob-3 (Experimental)",
        description: "AI Bob-3 embodies the persona of a risk-averse institutional portfolio manager. Its primary directive is **capital expansion**, which it achieves through extreme patience, discipline, and a highly selective trading model. It is explicitly designed to filter out mediocre setups and only engage when market conditions present a clear, high-probability opportunity that meets its strict, multi-layered criteria.",
        strengths: [
            "Risk-Averse by Design: Its core philosophy is built on a non-negotiable set of Trade Veto Conditions. It will automatically issue a Hold signal if critical requirements, such as a minimum 2.5:1 risk-reward ratio or strong trend alignment, are not met.",
            "Systematic & Patient Framework: Follows a precise, five-step decision-making process that analyzes the market regime, session strength, and signal confluence before considering an entry. It understands that often the best trade is no trade at all.",
            "Performance-Aware & Adaptive: Uniquely, it reviews its own past performance feedback to adjust its confidence and will veto trade setups that have been historically unprofitable in similar conditions.",
            "High-Timeframe & Trend Focused: Prioritizes aligning with the dominant trend on higher timeframes (4h, 1d), viewing it as its primary ally for generating consistent returns."
        ],
        focus: "Capital preservation, high-probability trend continuation, and swing trading during optimal, high-strength market sessions. Actively avoids unclear, choppy, or low-probability environments.",
    }
};

function updateModelInfoPanel(aiId) {
    const contentDiv = document.getElementById('model-info-content');
    const info = modelInfoData[aiId];
    if (info) {
        let strengthsHTML = info.strengths && info.strengths.length > 0 ? '<ul>' + info.strengths.map(s => `<li>${s}</li>`).join('') + '</ul>' : '';
        contentDiv.innerHTML = `
            <h4>${info.title}</h4><p>${info.description}</p>
            ${strengthsHTML ? `<p><strong>Key Characteristics/Strengths:</strong></p>${strengthsHTML}` : ''}
            ${info.focus ? `<p><strong>Primary Focus:</strong> ${info.focus}</p>` : ''}
            ${info.data_source ? `<p><strong>Data Source:</strong> ${info.data_source}</p>` : ''}`;
    } else {
        contentDiv.innerHTML = `<h4>Model Information</h4><p>Details for this model are not yet available.</p>`;
    }
}

function switchTab(event, tabName) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');
    updateModelInfoPanel(tabName);
    document.getElementById('model-info-container').classList.remove('active');
}

function getPerformanceStatusClass(status) {
    if (!status) return 'signal-status-default';
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'win') return 'signal-status-win';
    if (lowerStatus === 'loss') return 'signal-status-loss';
    if (lowerStatus === 'pending' || lowerStatus === 'too_recent') return 'signal-status-pending';
    if (lowerStatus === 'active' || lowerStatus === 'open') return 'signal-status-active';
    return 'signal-status-default';
}

function formatSignalTimestamp(isoTimestamp) {
    if (!isoTimestamp) return 'N/A';
    try {
        const date = new Date(isoTimestamp);
        return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return isoTimestamp; }
}

function renderSignalCard(signal) {
    const performance = signal.performance || {};
    const mfe = typeof performance.mfe_percentage === 'number' ? `${performance.mfe_percentage.toFixed(2)}%` : 'N/A';
    const mae = typeof performance.mae_percentage === 'number' ? `${performance.mae_percentage.toFixed(2)}%` : 'N/A';
    let displayStatus = performance.status || 'N/A';
    let originalStatusForClass = performance.status; 
    if (displayStatus.toUpperCase() === 'TOO_RECENT') {
        displayStatus = 'Pending Eval';
        originalStatusForClass = 'PENDING'; 
    }
    return `
        <div class="signal-item-card">
            <div class="signal-item-header">
                <span class="signal-symbol">${signal.symbol || 'N/A'}</span>
                <span class="signal-action ${signal.Signal && signal.Signal.toLowerCase() === 'buy' ? 'signal-buy' : 'signal-sell'}">${signal.Signal || 'N/A'}</span>
            </div>
            <div class="signal-item-body">
                <div class="signal-param"><span class="label">Entry Price:</span><span class="value">${signal["Entry Price"] || 'N/A'}</span></div>
                <div class="signal-param"><span class="label">Take Profit:</span><span class="value tp-list">${Array.isArray(signal["Take Profit Targets"]) ? signal["Take Profit Targets"].join(', ') : 'N/A'}</span></div>
                <div class="signal-param"><span class="label">Stop Loss:</span><span class="value">${signal["Stop Loss"] || 'N/A'}</span></div>
                <div class="signal-param"><span class="label">Confidence:</span><span class="value">${signal.Confidence !== undefined ? signal.Confidence + '%' : 'N/A'}</span></div>
                <div class="signal-param"><span class="label">Scenario:</span><span class="value">${signal.Scenario || 'N/A'}</span></div>
                <div class="signal-param"><span class="label">Setup Type:</span><span class="value">${signal["Trade Setup Type"] || 'N/A'}</span></div>
                <div class="signal-param"><span class="label">MFE %:</span><span class="value">${mfe}</span></div>
                <div class="signal-param"><span class="label">MAE %:</span><span class="value">${mae}</span></div>
            </div>
            <div class="signal-item-footer">
                <span class="signal-timestamp">${formatSignalTimestamp(signal.timestamp)}</span>
                <span class="signal-status ${getPerformanceStatusClass(originalStatusForClass)}">${displayStatus} ${performance.closed_by ? `(${performance.closed_by})` : ''}</span>
            </div>
        </div>`;
}

/**
 * NEW: Calculates all basic and advanced financial statistics from a list of signals.
 * @param {Array} signals - The array of signal objects.
 * @returns {Object} An object containing all calculated statistics.
 */
function calculateAllStats(signals) {
    // --- Basic Stats Initialization ---
    let wins = 0, losses = 0, evaluatedConfidenceSum = 0, evaluatedConfidenceCount = 0;
    let winConfidenceSum = 0, winConfidenceCount = 0, lossConfidenceSum = 0, lossConfidenceCount = 0;
    let tooRecentCount = 0, totalSignals = signals.length;
    const buySignalStats = { wins: 0, losses: 0, total: 0, mfeSum: 0, maeSum: 0, countWithMfeMae: 0 };
    const sellSignalStats = { wins: 0, losses: 0, total: 0, mfeSum: 0, maeSum: 0, countWithMfeMae: 0 };
    const scenarioPerformance = {};
    const confidencePerformance = {
        "81-100": { wins: 0, total: 0 }, "61-80": { wins: 0, total: 0 },
        "41-60": { wins: 0, total: 0 }, "21-40": { wins: 0, total: 0 }, "0-20": { wins: 0, total: 0 }
    };
    
    // --- Advanced Financial Stats Initialization ---
    let grossProfit = 0, grossLoss = 0, totalRR = 0, rrCount = 0;
    let equity = 10000; // Starting with a hypothetical $10k account
    let peakEquity = 10000;
    let maxDrawdown = 0;
    const equityCurveData = [];
    let latestTimestamp = null;
    
    // --- Sorting is CRUCIAL for equity curve and drawdown calculation ---
    const sortedSignals = [...signals].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (sortedSignals.length > 0) {
        latestTimestamp = sortedSignals[sortedSignals.length - 1].timestamp;
        // Start equity curve from the time of the first signal
        equityCurveData.push({ x: new Date(sortedSignals[0].timestamp), y: equity });
    }

    sortedSignals.forEach(signal => {
        if (signal.Signal && signal.Signal.toLowerCase() === 'hold') {
            totalSignals--; return;
        }

        const status = (signal.performance && signal.performance.status) ? signal.performance.status.toLowerCase() : null;
        const confidence = signal.Confidence;
        const signalType = signal.Signal ? signal.Signal.toLowerCase() : null;
        const scenario = signal.Scenario || "Unknown";

        // --- Basic Stats Calculation ---
        if (status === 'win' || status === 'loss') {
            if (confidence !== undefined) { evaluatedConfidenceSum += confidence; evaluatedConfidenceCount++; }
            if (status === 'win') { wins++; if (confidence !== undefined) { winConfidenceSum += confidence; winConfidenceCount++; } }
            else { losses++; if (confidence !== undefined) { lossConfidenceSum += confidence; lossConfidenceCount++; } }
        } else if (status === 'too_recent' || status === 'pending' || status === 'active') { tooRecentCount++; }

        const mfe = signal.performance?.mfe_percentage;
        const mae = signal.performance?.mae_percentage;
        let currentTypeStats = (signalType === 'buy') ? buySignalStats : ((signalType === 'sell') ? sellSignalStats : null);
        if (currentTypeStats && (status === 'win' || status === 'loss')) {
            currentTypeStats.total++;
            if (status === 'win') currentTypeStats.wins++; else currentTypeStats.losses++;
            if (typeof mfe === 'number' && typeof mae === 'number') {
                currentTypeStats.mfeSum += mfe; currentTypeStats.maeSum += mae; currentTypeStats.countWithMfeMae++;
            }
        }
        
        if (status === 'win' || status === 'loss') {
            if (!scenarioPerformance[scenario]) scenarioPerformance[scenario] = { wins: 0, total: 0 };
            scenarioPerformance[scenario].total++;
            if (status === 'win') scenarioPerformance[scenario].wins++;
        }

        if ((status === 'win' || status === 'loss') && confidence !== undefined) {
            let bucketKey;
            if (confidence > 80) bucketKey = "81-100";
            else if (confidence > 60) bucketKey = "61-80";
            else if (confidence > 40) bucketKey = "41-60";
            else if (confidence > 20) bucketKey = "21-40";
            else bucketKey = "0-20";
            if (confidencePerformance[bucketKey]) {
                confidencePerformance[bucketKey].total++;
                if (status === 'win') confidencePerformance[bucketKey].wins++;
            }
        }

        // --- Advanced Financial Calculation ---
        if (status === 'win' || status === 'loss') {
            const entry = parseFloat(signal["Entry Price"]);
            const sl = parseFloat(signal["Stop Loss"]);
            const tp1 = Array.isArray(signal["Take Profit Targets"]) ? parseFloat(signal["Take Profit Targets"][0]) : NaN;

            if (!isNaN(entry) && !isNaN(sl) && !isNaN(tp1)) {
                const riskPerUnit = Math.abs(entry - sl);
                const rewardPerUnit = Math.abs(tp1 - entry);
                
                if (riskPerUnit > 0) {
                    const rr = rewardPerUnit / riskPerUnit;
                    totalRR += rr;
                    rrCount++;
                    
                    // Simulate trade based on a fixed $100 risk per trade
                    if (status === 'win') {
                        const profit = 100 * rr;
                        grossProfit += profit;
                        equity += profit;
                    } else { // loss
                        const loss = -100;
                        grossLoss += loss;
                        equity += loss;
                    }
                }
            }
            // Update equity curve and drawdown
            peakEquity = Math.max(peakEquity, equity);
            const drawdown = (peakEquity - equity) / peakEquity;
            maxDrawdown = Math.max(maxDrawdown, drawdown);
            equityCurveData.push({ x: new Date(signal.timestamp), y: equity });
        }
    });

    const tradableSignals = wins + losses;

    return {
        // Basic stats
        winRate: tradableSignals > 0 ? (wins / tradableSignals) * 100 : 0,
        tradableSignals, 
        avgConfidence: evaluatedConfidenceCount > 0 ? (evaluatedConfidenceSum / evaluatedConfidenceCount) : 0,
        tooRecent: tooRecentCount,
        totalSignals, evaluatedSignals: tradableSignals, wins, losses,
        avgWinConfidence: winConfidenceCount > 0 ? (winConfidenceSum / winConfidenceCount) : 0,
        avgLossConfidence: lossConfidenceCount > 0 ? (lossConfidenceSum / lossConfidenceCount) : 0,
        buySignalStats: { ...buySignalStats, avgMfe: buySignalStats.countWithMfeMae > 0 ? buySignalStats.mfeSum / buySignalStats.countWithMfeMae : 0, avgMae: buySignalStats.countWithMfeMae > 0 ? buySignalStats.maeSum / buySignalStats.countWithMfeMae : 0 },
        sellSignalStats: { ...sellSignalStats, avgMfe: sellSignalStats.countWithMfeMae > 0 ? sellSignalStats.mfeSum / sellSignalStats.countWithMfeMae : 0, avgMae: sellSignalStats.countWithMfeMae > 0 ? sellSignalStats.maeSum / sellSignalStats.countWithMfeMae : 0 },
        scenarioPerformance, confidencePerformance,
        // Advanced stats
        profitFactor: grossLoss !== 0 ? Math.abs(grossProfit / grossLoss) : Infinity,
        avgRR: rrCount > 0 ? totalRR / rrCount : 0,
        maxDrawdown: maxDrawdown * 100, // as percentage
        equityCurveData,
        latestTimestamp
    };
}


/**
 * NEW: Renders the equity curve chart using Chart.js.
 * @param {string} aiId - The ID of the AI model (e.g., 'ai-max').
 */
function renderEquityChart(aiId) {
    const state = appState[aiId];
    const ctx = document.getElementById(`equity-chart-${aiId}`).getContext('2d');
    
    // Destroy previous chart instance if it exists to prevent memory leaks
    if (state.chartInstance) {
        state.chartInstance.destroy();
    }
    
    if (!state.overallStats.equityCurveData || state.overallStats.equityCurveData.length < 2) {
        // You can display a message on the canvas if you want
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = '#a0a0a0';
        ctx.textAlign = 'center';
        ctx.fillText('Not enough data to display equity curve.', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    
    const equityData = state.overallStats.equityCurveData;
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(78, 205, 196, 0.5)');
    gradient.addColorStop(1, 'rgba(78, 205, 196, 0)');

    state.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Hypothetical Equity ($)',
                data: equityData,
                borderColor: '#4ecdc4',
                backgroundColor: gradient,
                fill: true,
                pointRadius: 0,
                tension: 0.1,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        tooltipFormat: 'MMM dd, yyyy HH:mm'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#a0a0a0'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#a0a0a0',
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 15, 35, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#c0c0d0',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1
                }
            }
        }
    });
}

/**
 * UPDATED: Renders all statistics, including the new financial metrics.
 * @param {string} aiId - The ID of the AI model.
 */
function renderOverallStats(aiId) {
    const stats = appState[aiId].overallStats;
    document.getElementById(`stat-win-rate-${aiId}`).textContent = `${stats.winRate.toFixed(2)}%`;
    document.getElementById(`stat-tradable-signals-${aiId}`).textContent = stats.tradableSignals;
    document.getElementById(`stat-avg-confidence-${aiId}`).textContent = `${stats.avgConfidence.toFixed(2)}%`;
    document.getElementById(`stat-too-recent-${aiId}`).textContent = stats.tooRecent;
    
    const breakdownContainer = document.getElementById(`signal-breakdown-${aiId}`);
    if(breakdownContainer) {
         breakdownContainer.innerHTML = `
            <div class="detail-item">
                <span class="detail-label">Total Signals (Source):</span>
                <span class="detail-value">${stats.totalSignals}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Evaluated Signals:</span>
                <span class="detail-value">${stats.evaluatedSignals}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Wins / Losses:</span>
                <span class="detail-value"><span class="win">${stats.wins}</span> / <span class="loss">${stats.losses}</span></span>
            </div>
            <div class="detail-item">
                <span class="detail-label tooltip-container">Profit Factor
                    <span class="tooltip-text">Gross Profit divided by Gross Loss. A value > 1 indicates profitability. Calculated based on TP1 and a fixed risk per trade.</span>
                </span>
                <span class="detail-value">${isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : 'N/A'}</span>
            </div>
             <div class="detail-item">
                <span class="detail-label tooltip-container">Avg. R/R (Intended)
                    <span class="tooltip-text">The average Risk/Reward ratio of signals based on their specified Stop Loss and first Take Profit target.</span>
                </span>
                <span class="detail-value">${stats.avgRR.toFixed(2)} : 1</span>
            </div>
            <div class="detail-item">
                <span class="detail-label tooltip-container">Max Drawdown
                    <span class="tooltip-text">The largest peak-to-trough decline in the hypothetical equity curve, representing the worst losing period.</span>
                </span>
                <span class="detail-value loss">${stats.maxDrawdown.toFixed(2)}%</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Data Freshness:</span>
                <span class="detail-value">${stats.latestTimestamp ? formatSignalTimestamp(stats.latestTimestamp) : 'N/A'}</span>
            </div>`;
    }

    const signalTypeContainer = document.getElementById(`signal-type-performance-${aiId}`);
    if (signalTypeContainer) {
        signalTypeContainer.innerHTML = ''; 
        const types = [
            { name: 'Buy Signals', stats: stats.buySignalStats, color: 'linear-gradient(90deg, #4ecdc4, #45b7d1)', idSuffix: 'buy' },
            { name: 'Sell Signals', stats: stats.sellSignalStats, color: 'linear-gradient(90deg, #ff6b6b, #e57373)', idSuffix: 'sell' }
        ];
        let hasTypeData = false;
        types.forEach(type => {
            if (type.stats.total > 0) {
                hasTypeData = true;
                const winRate = type.stats.total > 0 ? (type.stats.wins / type.stats.total * 100) : 0;
                const cardHTML = `
                    <div class="symbol-card">
                        <div class="symbol-name">${type.name}</div>
                        <div class="symbol-stats"><span>Win Rate:</span><span class="win-rate">${winRate.toFixed(2)}%</span></div>
                        <div class="symbol-stats"><span>Trades:</span><span>${type.stats.total}</span></div>
                        <div class="symbol-stats"><span>Avg MFE:</span><span class="detail-value">${type.stats.avgMfe.toFixed(2)}%</span></div>
                        <div class="symbol-stats"><span>Avg MAE:</span><span class="detail-value">${type.stats.avgMae.toFixed(2)}%</span></div>
                        <div class="win-rate-bar"><div class="win-rate-fill" style="width: ${winRate.toFixed(2)}%; background: ${type.color};"></div></div>
                    </div>`;
                signalTypeContainer.insertAdjacentHTML('beforeend', cardHTML);
            }
        });
         if (!hasTypeData) signalTypeContainer.innerHTML = '<p style="text-align:center; color: #a0a0a0;">No signal type data.</p>';
    }

    const scenarioContainer = document.getElementById(`scenario-performance-${aiId}`);
    if (scenarioContainer) {
        scenarioContainer.innerHTML = '';
        const sortedScenarios = Object.entries(stats.scenarioPerformance).sort(([,a],[,b]) => b.total - a.total); 
        sortedScenarios.forEach(([scenario, data]) => {
            const winRate = data.total > 0 ? (data.wins / data.total * 100) : 0;
            let wrClass = winRate > 50 ? 'win' : (data.total > 0 ? 'loss' : 'neutral');
            scenarioContainer.innerHTML += `<div class="detail-item"><span class="detail-label">${scenario}:</span><span class="detail-value"><span class="${wrClass}">${winRate.toFixed(2)}%</span> <small>(${data.wins}/${data.total})</small></span></div>`;
        });
        if (!scenarioContainer.innerHTML) scenarioContainer.innerHTML = '<p style="text-align:center; color: #a0a0a0;">No scenario data.</p>';
    }
    
    const confidenceContainer = document.getElementById(`confidence-performance-${aiId}`);
    if (confidenceContainer) {
        confidenceContainer.innerHTML = '';
         Object.entries(stats.confidencePerformance).forEach(([bucket, data]) => {
            if (data.total > 0) {
                const winRate = (data.wins / data.total) * 100;
                let wrClass = winRate > 50 ? 'win' : 'loss';
                confidenceContainer.innerHTML += `<div class="detail-item"><span class="detail-label">${bucket}% Confidence:</span><span class="detail-value"><span class="${wrClass}">${winRate.toFixed(2)}%</span> <small>(${data.wins}/${data.total} trades)</small></span></div>`;
            }
        });
        if (!confidenceContainer.innerHTML) confidenceContainer.innerHTML = '<p style="text-align:center; color: #a0a0a0;">No confidence data.</p>';
    }
}

function calculateSymbolWinRates(signals) {
    const symbolStats = {};
    const relevantSignals = signals.filter(s => {
        const signalType = s.Signal ? s.Signal.toLowerCase() : '';
        const status = s.performance && s.performance.status ? s.performance.status.toLowerCase() : '';
        return signalType !== 'hold' && (status === 'win' || status === 'loss');
    });
    relevantSignals.forEach(signal => {
        if (!signal.symbol) return; 
        if (!symbolStats[signal.symbol]) symbolStats[signal.symbol] = { wins: 0, losses: 0, totalEvaluated: 0 };
        symbolStats[signal.symbol].totalEvaluated++;
        if (signal.performance.status.toLowerCase() === 'win') symbolStats[signal.symbol].wins++;
        else if (signal.performance.status.toLowerCase() === 'loss') symbolStats[signal.symbol].losses++;
    });
    const result = [];
    for (const symbol in symbolStats) {
        const stats = symbolStats[symbol];
        const winRate = stats.totalEvaluated > 0 ? (stats.wins / stats.totalEvaluated) * 100 : 0;
        result.push({ symbol, winRate: winRate.toFixed(2), wins: stats.wins, losses: stats.losses, totalEvaluated: stats.totalEvaluated });
    }
    return result.sort((a,b) => a.symbol.localeCompare(b.symbol));
}

function renderSymbolWinRates(aiId) {
    const state = appState[aiId];
    const container = document.getElementById(`symbol-winrate-list-${aiId}`);
    if (!container) return;
    if (state.symbolWinRates.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: #a0a0a0;">No symbol data to display.</p>'; return;
    }
    let html = '';
    state.symbolWinRates.forEach(item => {
        let wrClass = 'neutral';
        if (parseFloat(item.winRate) > 50) wrClass = 'win';
        else if (parseFloat(item.winRate) < 50 && item.totalEvaluated > 0) wrClass = 'loss';
        html += `<div class="detail-item"><span class="detail-label">${item.symbol}</span><span class="detail-value"><span class="${wrClass}">${item.winRate}%</span> <small>(${item.wins}W / ${item.losses}L)</small></span></div>`;
    });
    container.innerHTML = html;
}

async function fetchSignals(aiId, jsonFilename) {
    const signalGrid = document.getElementById(`signal-grid-${aiId}`);
    if (!signalGrid) { console.error(`Signal grid for ${aiId} not found.`); return; }
    
    // Simplified loading state
    const elementsToClear = document.querySelectorAll(`#${aiId} .stat-value, #${aiId} .details-card div, #${aiId} .performance-grid, #${aiId} .signal-grid`);
    elementsToClear.forEach(el => el.innerHTML = '<p style="text-align:center; color: #a0a0a0;">Loading...</p>');

    try {
        const response = await fetch(jsonFilename); 
        if (!response.ok) {
            if (response.status === 404) {
                // If a file for an experimental model doesn't exist, treat it as empty data
                appState[aiId].allSignals = [];
            } else {
                throw new Error(`HTTP error! status: ${response.status} fetching ${jsonFilename}`);
            }
        } else {
            appState[aiId].allSignals = await response.json();
        }
        
        // Calculate all stats at once
        appState[aiId].overallStats = calculateAllStats(appState[aiId].allSignals);
        appState[aiId].symbolWinRates = calculateSymbolWinRates(appState[aiId].allSignals);
        
        // Render everything
        renderOverallStats(aiId); 
        renderEquityChart(aiId);
        renderSymbolWinRates(aiId); 
        updateFullDisplay(aiId); // This handles filters and pagination

    } catch (error) {
        console.error(`Could not load signals from ${jsonFilename}:`, error);
        const errorMsg = `<p style="text-align:center; color: #ff6b6b;">Failed to load data.</p>`;
        elementsToClear.forEach(el => el.innerHTML = errorMsg);
    }
}

function processSignals(aiId) {
    const state = appState[aiId];
    let signalsToProcess = [...state.allSignals];
    signalsToProcess = signalsToProcess.filter(s => s.Signal && s.Signal.toLowerCase() !== 'hold');

    if (state.filters.symbol) signalsToProcess = signalsToProcess.filter(s => s.symbol && s.symbol.toLowerCase().includes(state.filters.symbol.toLowerCase()));
    if (state.filters.signalType) signalsToProcess = signalsToProcess.filter(s => s.Signal && s.Signal.toLowerCase() === state.filters.signalType.toLowerCase());
    if (state.filters.status) {
        if (state.filters.status.toLowerCase() === 'pending') {
            signalsToProcess = signalsToProcess.filter(s => s.performance && s.performance.status && (s.performance.status.toLowerCase() === 'pending' || s.performance.status.toLowerCase() === 'too_recent'));
        } else {
            signalsToProcess = signalsToProcess.filter(s => s.performance && s.performance.status && s.performance.status.toLowerCase() === state.filters.status.toLowerCase());
        }
    }
    if (state.filters.minConfidence !== '' && !isNaN(parseFloat(state.filters.minConfidence))) {
        const minConf = parseFloat(state.filters.minConfidence);
        signalsToProcess = signalsToProcess.filter(s => s.Confidence !== undefined && s.Confidence >= minConf);
    }

    signalsToProcess.sort((a, b) => {
        let valA, valB;
        switch (state.sort.by) {
            case 'timestamp': valA = new Date(a.timestamp); valB = new Date(b.timestamp); break;
            case 'entryPrice': valA = parseFloat(a["Entry Price"]); valB = parseFloat(b["Entry Price"]); break;
            default: valA = new Date(a.timestamp); valB = new Date(b.timestamp);
        }
        // Ensure NaNs or invalid values are handled
        if (isNaN(valA) || valA === null) valA = state.sort.order === 'asc' ? Infinity : -Infinity;
        if (isNaN(valB) || valB === null) valB = state.sort.order === 'asc' ? Infinity : -Infinity;

        return state.sort.order === 'asc' ? (valA > valB ? 1 : (valA < valB ? -1 : 0)) : (valA < valB ? 1 : (valA > valB ? -1 : 0));
    });
    state.displayedSignals = signalsToProcess;
}

function renderSignalsForPage(aiId) {
    const state = appState[aiId];
    const signalGrid = document.getElementById(`signal-grid-${aiId}`);
    if (!signalGrid) return;
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    const paginatedSignals = state.displayedSignals.slice(startIndex, endIndex);
    if (paginatedSignals.length > 0) {
        signalGrid.innerHTML = paginatedSignals.map(signal => renderSignalCard(signal)).join('');
    } else if (state.allSignals.length > 0) {
        signalGrid.innerHTML = '<p style="text-align:center; color: #a0a0a0;">No signals match your criteria.</p>';
    } else {
        signalGrid.innerHTML = '<p style="text-align:center; color: #a0a0a0;">No signal data available for this model.</p>';
    }
}

function renderPaginationControls(aiId) {
    const state = appState[aiId];
    const controlsContainer = document.getElementById(`pagination-controls-${aiId}`);
    if (!controlsContainer) return;
    const totalSignals = state.displayedSignals.length;
    const totalPages = Math.ceil(totalSignals / state.itemsPerPage);
    if (state.currentPage > totalPages && totalPages > 0) state.currentPage = totalPages;
    else if (totalPages === 0) state.currentPage = 1;

    let paginationHTML = '';
    if (totalSignals > 0) {
         paginationHTML = `
            <button id="prev-page-${aiId}" ${state.currentPage === 1 ? 'disabled' : ''}>Previous</button>
            <span class="page-info">Page ${state.currentPage} of ${totalPages > 0 ? totalPages : 1} (Total: ${totalSignals})</span>
            <button id="next-page-${aiId}" ${state.currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}>Next</button>
            <div class="control-group"><label for="items-per-page-${aiId}" style="margin-bottom:0; margin-right:5px;">Per Page:</label>
                <select id="items-per-page-${aiId}">
                    <option value="10" ${state.itemsPerPage === 10 ? 'selected' : ''}>10</option>
                    <option value="25" ${state.itemsPerPage === 25 ? 'selected' : ''}>25</option>
                    <option value="50" ${state.itemsPerPage === 50 ? 'selected' : ''}>50</option>
                    <option value="100" ${state.itemsPerPage === 100 ? 'selected' : ''}>100</option>
                    <option value="${totalSignals > 0 ? Math.max(totalSignals,1) : 99999}" ${state.itemsPerPage >= totalSignals && totalSignals > 0 ? 'selected' : ''}>All</option>
                </select>
            </div>`;
    } else paginationHTML = '<span class="page-info">No signals to display.</span>';
    controlsContainer.innerHTML = paginationHTML;

    if (totalSignals > 0) {
        document.getElementById(`prev-page-${aiId}`)?.addEventListener('click', () => { if (state.currentPage > 1) { state.currentPage--; updateFullDisplay(aiId); } });
        document.getElementById(`next-page-${aiId}`)?.addEventListener('click', () => { if (state.currentPage < totalPages) { state.currentPage++; updateFullDisplay(aiId); } });
        document.getElementById(`items-per-page-${aiId}`)?.addEventListener('change', (e) => { state.itemsPerPage = parseInt(e.target.value, 10); state.currentPage = 1; updateFullDisplay(aiId); });
    }
}

function updateFullDisplay(aiId) {
    processSignals(aiId); 
    renderSignalsForPage(aiId); 
    renderPaginationControls(aiId); 
}

function setupEventListeners(aiId) {
    const state = appState[aiId];
    const controls = [
        {id: `symbol-filter-${aiId}`, prop: 'symbol', event: 'input'},
        {id: `signal-type-filter-${aiId}`, prop: 'signalType', event: 'change'},
        {id: `status-filter-${aiId}`, prop: 'status', event: 'change'},
        {id: `min-confidence-filter-${aiId}`, prop: 'minConfidence', event: 'input'},
        {id: `sort-by-${aiId}`, prop: 'by', target: state.sort, event: 'change'},
        {id: `sort-order-${aiId}`, prop: 'order', target: state.sort, event: 'change'}
    ];
    controls.forEach(control => {
        document.getElementById(control.id)?.addEventListener(control.event, (e) => {
            (control.target || state.filters)[control.prop] = e.target.value;
            state.currentPage = 1; updateFullDisplay(aiId);
        });
    });
}

// --- Initializer ---
document.addEventListener('DOMContentLoaded', () => {
    // Setup collapsible panel
    const infoContainer = document.getElementById('model-info-container');
    const infoToggleButton = document.getElementById('info-toggle-button');
    if(infoToggleButton && infoContainer) {
        infoToggleButton.addEventListener('click', () => {
            infoContainer.classList.toggle('active');
        });
    }

    // Set initial model info panel
    const activeTabButton = document.querySelector('.tab-button.active');
    const initialTabId = activeTabButton ? activeTabButton.getAttribute('onclick').match(/'([^']+)'/)[1] : 'ai-max';
    updateModelInfoPanel(initialTabId);

    // Fetch data and setup listeners for all models
    fetchSignals('ai-max', 'signals_claude_log.json');
    fetchSignals('ai-bob', 'signals_gemini_log.json'); 
    fetchSignals('ai-bob-2', 'signals_bob_2_log.json'); 
    fetchSignals('ai-bob-3', 'signals_bob_3_log.json'); 
    
    setupEventListeners('ai-max');
    setupEventListeners('ai-bob');
    setupEventListeners('ai-bob-2');
    setupEventListeners('ai-bob-3');
});