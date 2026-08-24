export interface FearGreedData {
  value: number;
  value_classification: string;
  timestamp: string;
}

export interface MarketPulseData {
  trading_volume: number;
  volatility: number;
  liquidity: number;
  network_activity: number;
  timestamp: string;
  source: string;
}

export interface SentimentData {
  overall_sentiment: string;
  confidence_score: number;
  social_media: number;
  news_sentiment: number;
  whale_activity: number;
  on_chain_metrics: number;
  timestamp: string;
  source: string;
}

export interface GlobalMarketData {
  total_market_cap: number;
  total_volume: number;
  btc_dominance: number;
  active_cryptocurrencies: number;
  market_cap_change_percentage_24h: number;
  source: string;
  timestamp: string;
}

const fetchJson = async <T>(url: string, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Market data request failed (${response.status})`);
  return response.json() as Promise<T>;
};

export const fetchFearGreedIndex = async (signal?: AbortSignal): Promise<FearGreedData> => {
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  const endpoint = apiBase ? `${apiBase}/api/market/fear-greed` : 'https://api.alternative.me/fng/?limit=1';
  const payload = await fetchJson<{ data?: Array<{ value: string; value_classification: string; timestamp: string }> }>(
    endpoint, signal
  );
  const item = payload.data?.[0];
  if (!item) throw new Error('Fear & Greed data unavailable');
  return {
    value: Number(item.value),
    value_classification: item.value_classification,
    timestamp: new Date(Number(item.timestamp) * 1000).toISOString(),
  };
};

interface CoinGeckoGlobalResponse {
  data: {
    total_market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    market_cap_percentage: Record<string, number>;
    active_cryptocurrencies: number;
    market_cap_change_percentage_24h_usd: number;
  };
}

export const fetchGlobalMarketData = async (signal?: AbortSignal): Promise<GlobalMarketData> => {
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  const endpoint = apiBase ? `${apiBase}/api/market/global` : 'https://api.coingecko.com/api/v3/global';
  const payload = await fetchJson<CoinGeckoGlobalResponse>(endpoint, signal);
  return {
    total_market_cap: payload.data.total_market_cap.usd ?? 0,
    total_volume: payload.data.total_volume.usd ?? 0,
    btc_dominance: payload.data.market_cap_percentage.btc ?? 0,
    active_cryptocurrencies: payload.data.active_cryptocurrencies ?? 0,
    market_cap_change_percentage_24h: payload.data.market_cap_change_percentage_24h_usd ?? 0,
    source: 'CoinGecko',
    timestamp: new Date().toISOString(),
  };
};

export const fetchMarketPulse = async (signal?: AbortSignal): Promise<MarketPulseData> => {
  const [global, fearGreed] = await Promise.all([
    fetchGlobalMarketData(signal),
    fetchFearGreedIndex(signal),
  ]);

  // These are transparent proxy indicators derived from real public data.
  // They are intentionally not presented as proprietary AI/on-chain metrics.
  const volumeScore = Math.min(100, Math.max(0, 50 + Math.log10(Math.max(global.total_volume, 1)) * 5));
  const liquidityScore = Math.min(100, Math.max(0, 45 + global.btc_dominance * 0.5));
  const volatilityScore = Math.min(100, Math.max(0, Math.abs(global.market_cap_change_percentage_24h) * 10));
  const networkActivity = Math.min(100, Math.max(0, 50 + (global.active_cryptocurrencies / 10000) * 10));

  return {
    trading_volume: Math.round(volumeScore),
    volatility: Math.round(volatilityScore),
    liquidity: Math.round(liquidityScore),
    network_activity: Math.round((networkActivity + fearGreed.value) / 2),
    timestamp: new Date().toISOString(),
    source: 'CoinGecko + Alternative.me',
  };
};

export const fetchSentimentData = async (signal?: AbortSignal): Promise<SentimentData> => {
  const fearGreed = await fetchFearGreedIndex(signal);
  const score = fearGreed.value;
  const sentiment = score >= 55 ? 'Bullish' : score <= 45 ? 'Bearish' : 'Neutral';

  return {
    overall_sentiment: sentiment,
    confidence_score: score,
    social_media: score,
    news_sentiment: score,
    whale_activity: score,
    on_chain_metrics: score,
    timestamp: fearGreed.timestamp,
    source: 'Alternative.me Fear & Greed Index',
  };
};
