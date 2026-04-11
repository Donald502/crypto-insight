import { Coin, OHLCData, GlobalExchange, DerivativesData, MarketLiquidity, ExchangeFlow } from '../types';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const BINANCE_BASE = 'https://api.binance.com/api/v3';
const BINANCE_FUTURES_BASE = 'https://fapi.binance.com/fapi/v1';
const OKX_BASE = 'https://www.okx.com/api/v5';
const BYBIT_BASE = 'https://api.bybit.com/v5';

// Simple in-memory cache to avoid redundant calls during session
const memoryCache: Record<string, { data: any; timestamp: number }> = {};
const pendingRequests: Record<string, Promise<any>> = {};

// Helper to get/set from sessionStorage for persistence across refreshes
function getCachedData(url: string, ttl: number) {
  // Check memory cache first
  if (memoryCache[url] && Date.now() - memoryCache[url].timestamp < ttl) {
    return memoryCache[url].data;
  }

  // Check sessionStorage
  try {
    const cached = sessionStorage.getItem(`cache_${url}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < ttl) {
        // Hydrate memory cache
        memoryCache[url] = { data, timestamp };
        return data;
      }
    }
  } catch (e) {
    // SessionStorage might be disabled or full
  }
  return null;
}

function setCachedData(url: string, data: any) {
  const timestamp = Date.now();
  memoryCache[url] = { data, timestamp };
  try {
    sessionStorage.setItem(`cache_${url}`, JSON.stringify({ data, timestamp }));
  } catch (e) {
    // Ignore storage errors
  }
}

// Request Queues to prevent hitting API too hard simultaneously
const queues: Record<string, Promise<any>> = {
  'coingecko': Promise.resolve(),
  'binance': Promise.resolve(),
  'default': Promise.resolve()
};
const QUEUE_DELAY = 5000; // 5 seconds between requests for CoinGecko free tier

// Common mappings between CoinGecko symbols and Binance symbols
const BINANCE_SYMBOL_MAP: Record<string, string> = {
  'm': 'MNT',
  'luna': 'LUNC',
  'ust': 'USTC',
  'poly': 'MATIC',
  'spaceid': 'ID',
  'spaceusdt': 'IDUSDT',
  'bonk': 'BONK',
  'pepe': 'PEPE',
  'wif': 'WIF',
  'floki': 'FLOKI',
};

async function fetchWithRetry(url: string, retries = 3, delay = 3000, ttl = 30000, silent = false): Promise<any> {
  // Check cache first
  const cached = getCachedData(url, ttl);
  if (cached) return cached;

  // Check if there's already a pending request for this URL
  if (pendingRequests[url]) {
    return pendingRequests[url];
  }

  // Determine which queue to use
  let queueKey = 'default';
  if (url.includes('coingecko.com')) queueKey = 'coingecko';
  else if (url.includes('binance.com')) queueKey = 'binance';

  // Add to queue
  const requestPromise = new Promise((resolve, reject) => {
    queues[queueKey] = queues[queueKey].then(async () => {
      // Wait a bit before starting the next request to respect rate limits
      if (queueKey === 'coingecko') {
        await new Promise(r => setTimeout(r, QUEUE_DELAY + Math.random() * 1000));
      } else {
        await new Promise(r => setTimeout(r, 200)); // Minor delay for others
      }

      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch(url, {
            headers: {
              'Accept': 'application/json',
            }
          });

          if (response.status === 429) {
            const waitTime = delay * Math.pow(2, i + 2) + (Math.random() * 3000);
            if (!silent) console.warn(`[Rate Limit] ${url}. Waiting ${Math.round(waitTime)}ms...`);
            await new Promise(r => setTimeout(r, waitTime));
            continue;
          }

          if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
          }

          const data = await response.json();
          setCachedData(url, data);
          delete pendingRequests[url];
          return resolve(data);
        } catch (error: any) {
          if (!silent) {
            if (i > 0 && i < retries - 1) {
              console.warn(`[Retry ${i}] ${url}: ${error.message}`);
            } else if (i === retries - 1) {
              console.error(`[Final Failure] ${url}:`, error.message);
            }
          }

          if (i === retries - 1) {
            const isNetworkError = error.message === 'Failed to fetch' || error.message.includes('NetworkError');
            if (isNetworkError) {
              if (!silent) console.error(`[Final Network Failure] ${url}:`, error.message);
              const provider = url.includes('coingecko') ? 'CoinGecko' : 'Binance';
              delete pendingRequests[url];
              return reject(new Error(`네트워크 연결 오류 또는 API 제한이 발생했습니다. (${provider} API Limit)`));
            }
            delete pendingRequests[url];
            return reject(error);
          }

          const backoffDelay = (error.message === 'Failed to fetch' || error.message.includes('NetworkError'))
            ? delay * Math.pow(3, i + 1)
            : delay * Math.pow(2, i);
          const jitter = Math.random() * 3000;
          await new Promise(r => setTimeout(r, backoffDelay + jitter));
        }
      }
    }).catch(err => {
      if (!silent) console.error('Queue processing error:', err);
      delete pendingRequests[url];
      reject(err);
    });
  });

  pendingRequests[url] = requestPromise;
  return requestPromise;
}

export async function getFearGreedIndex() {
  // Fear & Greed index updates once a day, can be cached for a long time
  return fetchWithRetry('https://api.alternative.me/fng/', 3, 2000, 3600000); // 1 hour cache
}

export async function getGlobalData() {
  // Global data doesn't change every second, cache for 5 minutes
  return fetchWithRetry(`${COINGECKO_BASE}/global`, 3, 2000, 300000);
}

export async function getTopCoins(limit = 250): Promise<Coin[]> {
  // Top coins list, cache for 1 minute
  return fetchWithRetry(`${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false`, 3, 2000, 60000);
}

export async function getCoinDetails(id: string) {
  // Coin details, cache for 1 minute
  return fetchWithRetry(`${COINGECKO_BASE}/coins/${id}?localization=false&tickers=true&market_data=true&community_data=false&developer_data=false&sparkline=false`, 5, 3000, 60000);
}

export async function getSectorCoins(category: string): Promise<Coin[]> {
  // Sector calls are more prone to rate limits, cache for 5 minutes
  return fetchWithRetry(`${COINGECKO_BASE}/coins/markets?vs_currency=usd&category=${category}&order=volume_desc&per_page=5&page=1&sparkline=false`, 5, 3000, 300000);
}

export async function getBinanceKlines(symbol: string, interval: string, limit = 100): Promise<OHLCData[]> {
  const lowerSymbol = symbol.toLowerCase();
  const baseSymbol = BINANCE_SYMBOL_MAP[lowerSymbol] || symbol.toUpperCase();
  const binanceSymbol = baseSymbol.endsWith('USDT') ? baseSymbol : `${baseSymbol}USDT`;

  const endpoints = [
    `${BINANCE_BASE}/klines`,
    `https://api1.binance.com/api/v3/klines`,
    `https://api2.binance.com/api/v3/klines`,
    `https://api3.binance.com/api/v3/klines`
  ];

  for (const endpoint of endpoints) {
    try {
      const data = await fetchWithRetry(`${endpoint}?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`, 1, 500, 30000, true);
      if (!Array.isArray(data)) continue;
      return data.map((d: any) => ({
        time: d[0],
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5]),
      }));
    } catch (error) { continue; }
  }
  return [];
}

export async function getOKXKlines(symbol: string, interval: string, limit = 100): Promise<OHLCData[]> {
  const lowerSymbol = symbol.toLowerCase();
  const baseSymbol = BINANCE_SYMBOL_MAP[lowerSymbol] || symbol.toUpperCase();
  const barMap: Record<string, string> = { '15m': '15m', '1h': '1H', '4h': '4H', '1d': '1D', '3d': '3D' };
  const bar = barMap[interval] || '1H';
  const instId = `${baseSymbol}-USDT`;

  try {
    const res = await fetchWithRetry(`https://www.okx.com/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`, 1, 500, 30000, true);
    if (res && res.data && Array.isArray(res.data)) {
      return res.data.map((d: any) => ({
        time: parseInt(d[0]),
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5]),
      })).reverse();
    }
  } catch (e) { }
  return [];
}

export async function getUpbitKlines(symbol: string, interval: string, limit = 100): Promise<OHLCData[]> {
  let url = '';
  if (interval === '1d') url = `https://api.upbit.com/v1/candles/days?market=KRW-${symbol.toUpperCase()}&count=${limit}`;
  else if (interval === '15m') url = `https://api.upbit.com/v1/candles/minutes/15?market=KRW-${symbol.toUpperCase()}&count=${limit}`;
  else if (interval === '1h') url = `https://api.upbit.com/v1/candles/minutes/60?market=KRW-${symbol.toUpperCase()}&count=${limit}`;
  else if (interval === '4h') url = `https://api.upbit.com/v1/candles/minutes/240?market=KRW-${symbol.toUpperCase()}&count=${limit}`;
  else return [];

  try {
    const data = await fetchWithRetry(url, 1, 500, 30000, true);
    if (Array.isArray(data)) {
      return data.map((d: any) => ({
        time: d.timestamp,
        open: d.opening_price,
        high: d.high_price,
        low: d.low_price,
        close: d.trade_price,
        volume: d.candle_acc_trade_volume,
      })).reverse();
    }
  } catch (e) { }
  return [];
}

export async function getCoinbaseKlines(symbol: string, interval: string, limit = 100): Promise<OHLCData[]> {
  const granularityMap: Record<string, number> = { '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400 };
  const granularity = granularityMap[interval] || 3600;
  const product = `${symbol.toUpperCase()}-USD`;

  try {
    const data = await fetchWithRetry(`https://api.exchange.coinbase.com/products/${product}/candles?granularity=${granularity}`, 1, 500, 30000, true);
    if (Array.isArray(data)) {
      return data.slice(0, limit).map((d: any) => ({
        time: d[0] * 1000,
        open: d[3],
        high: d[2],
        low: d[1],
        close: d[4],
        volume: d[5],
      })).reverse();
    }
  } catch (e) { }
  return [];
}

export async function getKrakenKlines(symbol: string, interval: string, limit = 100): Promise<OHLCData[]> {
  const intervalMap: Record<string, number> = { '15m': 15, '1h': 60, '4h': 240, '1d': 1440 };
  const krakenInterval = intervalMap[interval] || 60;
  const pair = `${symbol.toUpperCase()}USD`;

  try {
    const res = await fetchWithRetry(`https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${krakenInterval}`, 1, 500, 30000, true);
    if (res && res.result) {
      const pairKey = Object.keys(res.result)[0];
      const data = res.result[pairKey];
      if (Array.isArray(data)) {
        return data.slice(-limit).map((d: any) => ({
          time: d[0] * 1000,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[6]),
        }));
      }
    }
  } catch (e) { }
  return [];
}

export async function getBithumbKlines(symbol: string, interval: string, limit = 100): Promise<OHLCData[]> {
  const intervalMap: Record<string, string> = { '15m': '30m', '1h': '1h', '4h': '6h', '1d': '24h' };
  const bithumbInterval = intervalMap[interval] || '1h';

  try {
    const res = await fetchWithRetry(`https://api.bithumb.com/public/candlestick/${symbol.toUpperCase()}_KRW/${bithumbInterval}`, 1, 500, 30000, true);
    if (res && res.data && Array.isArray(res.data)) {
      return res.data.slice(-limit).map((d: any) => ({
        time: d[0],
        open: parseFloat(d[1]),
        high: parseFloat(d[3]),
        low: parseFloat(d[4]),
        close: parseFloat(d[2]),
        volume: parseFloat(d[5]),
      }));
    }
  } catch (e) { }
  return [];
}

export async function getGateIoKlines(symbol: string, interval: string, limit = 100): Promise<OHLCData[]> {
  const intervalMap: Record<string, string> = { '15m': '15m', '1h': '1h', '4h': '4h', '1d': '1d', '3d': '1d' };
  const gateInterval = intervalMap[interval] || '1h';
  const pair = `${symbol.toUpperCase()}_USDT`;

  try {
    const data = await fetchWithRetry(`https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=${pair}&interval=${gateInterval}&limit=${limit}`, 1, 500, 30000, true);
    if (Array.isArray(data)) {
      return data.map((d: any) => ({
        time: parseInt(d[0]) * 1000,
        open: parseFloat(d[5]),
        high: parseFloat(d[3]),
        low: parseFloat(d[4]),
        close: parseFloat(d[2]),
        volume: parseFloat(d[1]),
      }));
    }
  } catch (e) { }
  return [];
}

export async function getExchangeRate(): Promise<number> {
  try {
    // Try to get USD/KRW rate from a simple public API
    const res = await fetchWithRetry('https://api.exchangerate-api.com/v4/latest/USD', 1, 1000, 3600000, true);
    if (res && res.rates && res.rates.KRW) {
      return res.rates.KRW;
    }
  } catch (e) {
    console.warn('Failed to fetch exchange rate, using default 1350');
  }
  return 1350; // Fallback
}

export async function getBybitKlines(symbol: string, interval: string, limit = 100): Promise<OHLCData[]> {
  const lowerSymbol = symbol.toLowerCase();
  const baseSymbol = BINANCE_SYMBOL_MAP[lowerSymbol] || symbol.toUpperCase();
  const intervalMap: Record<string, string> = { '15m': '15', '1h': '60', '4h': '240', '1d': 'D' };
  const bybitInterval = intervalMap[interval] || '60';
  const bybitSymbol = `${baseSymbol}USDT`;

  try {
    const res = await fetchWithRetry(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${bybitSymbol}&interval=${bybitInterval}&limit=${limit}`, 1, 500, 30000, true);
    if (res && res.result && Array.isArray(res.result.list)) {
      return res.result.list.map((d: any) => ({
        time: parseInt(d[0]),
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5]),
      })).reverse();
    }
  } catch (e) { }
  return [];
}

export async function getCoinGeckoOHLC(coinId: string, interval: string): Promise<OHLCData[]> {
  try {
    // Map interval to CoinGecko days
    // 1 day = 30m, 7-30 days = 4h, 365 days = daily
    let days = 1;
    if (interval === '1d' || interval === '3d') days = 30;
    if (interval === '1w') days = 365;

    const url = `${COINGECKO_BASE}/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`;
    const data = await fetchWithRetry(url, 2, 5000, 600000); // 10 min cache

    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        time: item[0],
        open: item[1],
        high: item[2],
        low: item[3],
        close: item[4],
        volume: 0
      }));
    }
  } catch (e) {
    console.warn('CoinGecko OHLC fetch failed:', e);
  }
  return [];
}

export async function getUniversalKlines(symbol: string, interval: string, limit = 100, coinId?: string, currentPrice?: number): Promise<{ data: OHLCData[], source: string }> {
  const isShortTerm = ['15m', '1h', '4h'].includes(interval);

  const validatePrice = (klines: OHLCData[]) => {
    if (!currentPrice || klines.length === 0) return true;
    const lastPrice = klines[klines.length - 1].close;
    const diff = Math.abs(lastPrice - currentPrice) / currentPrice;
    return diff < 0.2;
  };

  if (isShortTerm) {
    // 병렬로 동시 호출
    const [binance, bybit, okx] = await Promise.allSettled([
      getBinanceKlines(symbol, interval, limit),
      getBybitKlines(symbol, interval, limit),
      getOKXKlines(symbol, interval, limit),
    ]);

    const results = [
      { result: binance, source: 'Binance (Fast)' },
      { result: bybit, source: 'Bybit' },
      { result: okx, source: 'OKX' },
    ];

    for (const { result, source } of results) {
      if (result.status === 'fulfilled' && result.value.length > 0 && validatePrice(result.value)) {
        return { data: result.value, source };
      }
    }
  }

  if (coinId) {
    const cgData = await getCoinGeckoOHLC(coinId, interval);
    if (cgData.length > 0) return { data: cgData, source: 'CoinGecko (Base)' };
  }

  const [binance, okx, upbit] = await Promise.allSettled([
    getBinanceKlines(symbol, interval, limit),
    getOKXKlines(symbol, interval, limit),
    getUpbitKlines(symbol, interval, limit),
  ]);

  if (binance.status === 'fulfilled' && binance.value.length > 0 && validatePrice(binance.value))
    return { data: binance.value, source: 'Binance' };
  if (okx.status === 'fulfilled' && okx.value.length > 0 && validatePrice(okx.value))
    return { data: okx.value, source: 'OKX' };
  if (upbit.status === 'fulfilled' && upbit.value.length > 0 && validatePrice(upbit.value))
    return { data: upbit.value, source: 'Upbit' };

  return { data: [], source: 'None' };
}
export async function searchCoins(query: string) {
  // Search endpoint, cache for 5 minutes
  return fetchWithRetry(`${COINGECKO_BASE}/search?query=${query}`, 5, 3000, 300000);
}

export async function getTopExchanges(limit = 5): Promise<GlobalExchange[]> {
  // Top exchanges by volume, cache for 10 minutes
  return fetchWithRetry(`${COINGECKO_BASE}/exchanges?per_page=${limit}&page=1`, 3, 2000, 600000);
}

export async function getDerivativesData(symbol: string): Promise<DerivativesData | null> {
  const baseSymbol = BINANCE_SYMBOL_MAP[symbol.toLowerCase()] || symbol.toUpperCase();
  const binanceSymbol = baseSymbol.endsWith('USDT') ? baseSymbol : `${baseSymbol}USDT`;

  try {
    // 1. Funding Rate
    const fundingRes = await fetchWithRetry(`${BINANCE_FUTURES_BASE}/premiumIndex?symbol=${binanceSymbol}`, 1, 500, 30000, true).catch(() => null);

    // 2. Long/Short Ratio (Global)
    const lsRes = await fetchWithRetry(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${binanceSymbol}&period=1h&limit=1`, 1, 500, 30000, true).catch(() => null);

    // 3. Open Interest
    const oiRes = await fetchWithRetry(`${BINANCE_FUTURES_BASE}/openInterest?symbol=${binanceSymbol}`, 1, 500, 30000, true).catch(() => null);

    if (fundingRes || lsRes || oiRes) {
      return {
        symbol: binanceSymbol,
        fundingRate: fundingRes ? parseFloat(fundingRes.lastFundingRate) * 100 : 0,
        longShortRatio: lsRes?.[0] ? parseFloat(lsRes[0].longShortRatio) : 1,
        openInterest: oiRes ? parseFloat(oiRes.openInterest) : 0,
        timestamp: Date.now()
      };
    }
  } catch (e) {
    // console.warn('Failed to fetch derivatives data:', e);
  }
  return null;
}

export async function getOkxDerivativesData(symbol: string): Promise<DerivativesData | null> {
  const baseSymbol = symbol.toUpperCase();
  const okxSymbol = `${baseSymbol}-USDT-SWAP`;

  try {
    // OKX API often has CORS issues in browser for some endpoints.
    // We try to fetch but handle failure gracefully.

    // 1. Funding Rate
    const fundingRes = await fetchWithRetry(`${OKX_BASE}/public/funding-rate?instId=${okxSymbol}`, 1, 500, 30000, true).catch(() => null);

    // 2. Long/Short Ratio (Account)
    const lsRes = await fetchWithRetry(`${OKX_BASE}/rubik/stat/contracts/long-short-account-ratio?instId=${baseSymbol}-USDT&period=1H`, 1, 500, 30000, true).catch(() => null);

    // 3. Open Interest
    const oiRes = await fetchWithRetry(`${OKX_BASE}/public/open-interest?instId=${okxSymbol}`, 1, 500, 30000, true).catch(() => null);

    if (fundingRes?.data?.[0] || lsRes?.data?.[0] || oiRes?.data?.[0]) {
      return {
        symbol: okxSymbol,
        fundingRate: fundingRes?.data?.[0] ? parseFloat(fundingRes.data[0].fundingRate) * 100 : 0,
        longShortRatio: lsRes?.data?.[0] ? parseFloat(lsRes.data[0].ratio) : 1,
        openInterest: oiRes?.data?.[0] ? parseFloat(oiRes.data[0].oi) : 0,
        timestamp: Date.now()
      };
    }
  } catch (e) {
    console.warn('OKX derivatives fetch error:', e);
  }
  return null;
}

export async function getBybitDerivativesData(symbol: string): Promise<DerivativesData | null> {
  const lowerSymbol = symbol.toLowerCase();
  const baseSymbol = BINANCE_SYMBOL_MAP[lowerSymbol] || symbol.toUpperCase();
  const bybitSymbol = baseSymbol.endsWith('USDT') ? baseSymbol : `${baseSymbol}USDT`;

  try {
    // 1. Funding Rate & Ticker info
    const tickerRes = await fetchWithRetry(`${BYBIT_BASE}/market/tickers?category=linear&symbol=${bybitSymbol}`, 1, 500, 30000, true).catch(() => null);

    // 2. Long/Short Ratio (Account)
    const lsRes = await fetchWithRetry(`${BYBIT_BASE}/market/account-ratio?category=linear&symbol=${bybitSymbol}&period=1h`, 1, 500, 30000, true).catch(() => null);

    // 3. Open Interest
    const oiRes = await fetchWithRetry(`${BYBIT_BASE}/market/open-interest?category=linear&symbol=${bybitSymbol}&intervalTime=1h`, 1, 500, 30000, true).catch(() => null);

    const ticker = tickerRes?.result?.list?.[0];
    const ls = lsRes?.result?.list?.[0];
    const oi = oiRes?.result?.list?.[0];

    if (ticker || ls || oi) {
      // Bybit returns buyRatio and sellRatio as decimals (e.g., 0.55 and 0.45)
      let ratio = 1;
      if (ls) {
        const buyRatio = parseFloat(ls.buyRatio);
        const sellRatio = parseFloat(ls.sellRatio);
        ratio = sellRatio !== 0 ? buyRatio / sellRatio : 1;
      }

      return {
        symbol: bybitSymbol,
        fundingRate: ticker ? parseFloat(ticker.fundingRate) * 100 : 0,
        longShortRatio: ratio,
        openInterest: oi ? parseFloat(oi.openInterest) : 0,
        timestamp: Date.now()
      };
    }
  } catch (e) { }
  return null;
}

export async function getMarketLiquidityData(): Promise<MarketLiquidity | null> {
  try {
    const global = await getGlobalData();
    if (global && global.data) {
      const { total_market_cap, total_volume, market_cap_percentage, active_cryptocurrencies } = global.data;
      const totalCap = total_market_cap.usd;
      const totalVol = total_volume.usd;

      return {
        total_market_cap: totalCap,
        total_volume: totalVol,
        liquidity_ratio: (totalVol / totalCap) * 100, // Volume to Market Cap ratio as a proxy for liquidity
        market_dominance: market_cap_percentage,
        active_cryptocurrencies
      };
    }
  } catch (e) { }
  return null;
}

export async function getExchangeFlows(): Promise<ExchangeFlow[]> {
  // Real-time net flow is a paid metric. We simulate it based on volume and market trends
  // for top exchanges to provide a visual representation.
  const exchanges = ['Binance', 'Coinbase', 'OKX', 'Kraken', 'Bybit'];
  return exchanges.map(ex => {
    const base = 100 + Math.random() * 500;
    const inflow = base * (0.8 + Math.random() * 0.4);
    const outflow = base * (0.8 + Math.random() * 0.4);
    return {
      exchange: ex,
      inflow,
      outflow,
      netflow: inflow - outflow,
      timestamp: Date.now()
    };
  });
}

export function calculateBollingerBands(data: OHLCData[], period = 20, stdDev = 2) {
  return data.map((item, index) => {
    const sliceStart = Math.max(0, index - period + 1);
    const sliceEnd = index + 1;
    const slice = data.slice(sliceStart, sliceEnd);
    const actualPeriod = slice.length;

    const prices = slice.map(d => d.close);
    const mean = prices.reduce((a, b) => a + b, 0) / actualPeriod;
    const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / actualPeriod;
    const sd = Math.sqrt(variance);

    if (actualPeriod === 1) {
      return {
        ...item,
        middleBand: mean,
        upperBand: mean,
        lowerBand: mean,
      };
    }

    return {
      ...item,
      middleBand: mean,
      upperBand: mean + sd * stdDev,
      lowerBand: mean - sd * stdDev,
    };
  });
}

export function calculateMACD(data: OHLCData[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const ema = (data: number[], period: number) => {
    const k = 2 / (period + 1);
    const emaValues: number[] = [];
    let prevEma = data[0];
    emaValues.push(prevEma);

    for (let i = 1; i < data.length; i++) {
      const currentEma = (data[i] - prevEma) * k + prevEma;
      emaValues.push(currentEma);
      prevEma = currentEma;
    }
    return emaValues;
  };

  const prices = data.map(d => d.close);
  const fastEma = ema(prices, fastPeriod);
  const slowEma = ema(prices, slowPeriod);

  const macdLine = fastEma.map((f, i) => f - slowEma[i]);
  const signalLine = ema(macdLine, signalPeriod);

  return data.map((item, i) => ({
    ...item,
    macd: macdLine[i],
    signal: signalLine[i],
    histogram: macdLine[i] - signalLine[i],
  }));
}
