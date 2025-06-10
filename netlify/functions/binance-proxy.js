// File: netlify/functions/binance-proxy.js
const fetch = require('node-fetch');

exports.handler = async function (event) {
    const { symbol, interval, startTime, endTime } = event.queryStringParameters;

    if (!symbol || !interval || !startTime || !endTime) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing required query parameters.' }),
        };
    }

    const API_ENDPOINT = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=1000`;

    try {
        const response = await fetch(API_ENDPOINT);
        const data = await response.json();
        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch data from Binance API.' }),
        };
    }
};