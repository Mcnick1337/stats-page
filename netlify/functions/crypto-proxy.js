// File: netlify/functions/crypto-proxy.js
const fetch = require('node-fetch');

exports.handler = async function (event) {
    let { symbol, startTime } = event.queryStringParameters;

    if (!symbol || !startTime) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing parameters.' }) };
    }

    // --- Critical KuCoin-specific changes ---
    // 1. Convert symbol from "BTCUSDT" to "BTC-USDT"
    const kucoinSymbol = symbol.replace('USDT', '-USDT');
    // 2. KuCoin uses timestamps in seconds, not milliseconds
    const startAt = Math.floor(parseInt(startTime) / 1000);
    // 3. Set the interval type
    const type = '15min';
    // -----------------------------------------

    const API_ENDPOINT = `https://api.kucoin.com/api/v1/market/candles?type=${type}&symbol=${kucoinSymbol}&startAt=${startAt}`;

    try {
        const response = await fetch(API_ENDPOINT);
        const data = await response.json();

        // Check for KuCoin's specific error format
        if (data.code !== '200000') {
            const errorMessage = `KuCoin API Error: ${data.msg || 'Unknown error'}`;
            console.error(errorMessage, data);
            return { statusCode: 500, body: JSON.stringify({ error: errorMessage }) };
        }

        // The data we want is in data.data
        return {
            statusCode: 200,
            body: JSON.stringify(data.data),
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