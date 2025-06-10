// File: netlify/functions/crypto-proxy.js

// This line is ESSENTIAL. Put it back.
const fetch = require('node-fetch');

exports.handler = async function (event) {
    // ... the rest of the function remains the same
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
        console.error("Proxy function crashed:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "The proxy function on the server crashed.",
                details: error.message,
            }),
        };
    }
};