// File: netlify/functions/crypto-proxy.js
const fetch = require('node-fetch');

exports.handler = async function (event) {
    const { symbol, interval, startTime, endTime } = event.queryStringParameters;

    if (!symbol || !interval || !startTime || !endTime) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing parameters.' }) };
    }

    // Bybit uses intervals in minutes for its API
    const bybitInterval = '15'; // 15 minutes
    
    // Bybit uses milliseconds for startTime
    const bybitStartTime = startTime;

    // Construct the Bybit API URL
    // We use the 'linear' category for USDT pairs like BTCUSDT
    const API_ENDPOINT = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${bybitInterval}&start=${bybitStartTime}&limit=200`;

    try {
        const response = await fetch(API_ENDPOINT);
        const data = await response.json();

        // Check for Bybit's specific error format
        if (data.retCode !== 0) {
            console.error("Bybit API Error:", data.retMsg);
            return { statusCode: 500, body: JSON.stringify({ error: data.retMsg }) };
        }

        // The data we want is in result.list
        const bybitList = data.result.list;

        return {
            statusCode: 200,
            body: JSON.stringify(bybitList),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch data from Bybit API.' }),
        };
    }
};