// File: netlify/functions/crypto-proxy.js

exports.handler = async function (event) {
    const { symbol, interval, startTime, endTime } = event.queryStringParameters;

    if (!symbol || !interval || !startTime || !endTime) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing parameters.' }) };
    }

    const bybitInterval = '15';
    const bybitStartTime = startTime;
    const API_ENDPOINT = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${bybitInterval}&start=${bybitStartTime}&limit=200`;

    try {
        const response = await fetch(API_ENDPOINT);
        const data = await response.json();

        if (data.retCode !== 0) {
            console.error("Bybit API Error:", data.retMsg);
            return { statusCode: 500, body: JSON.stringify({ error: `Bybit API Error: ${data.retMsg}` }) };
        }

        const bybitList = data.result.list;
        return {
            statusCode: 200,
            body: JSON.stringify(bybitList),
        };
    } catch (error) {
        // --- THIS IS THE CRUCIAL CHANGE ---
        // We now log the real error on the server and send its message back to the browser.
        console.error("Proxy function crashed:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "The proxy function on the server crashed.",
                details: error.message, // This will contain the actual reason for the crash.
            }),
        };
        // ------------------------------------
    }
};