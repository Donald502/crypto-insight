export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath?: number;
}

export interface OHLCData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  upperBand?: number;
  middleBand?: number;
  lowerBand?: number;
  macd?: number;
  signal?: number;
  histogram?: number;
}

export interface ExchangeVolume {
  name: string;
  volume: number;
  trade_url: string;
}

export interface GlobalExchange {
  id: string;
  name: string;
  image: string;
  trust_score: number;
  trade_volume_24h_btc: number;
  trade_volume_24h_btc_normalized: number;
}

export interface StakingInfo {
  is_staking_available: boolean;
  staking_ratio?: number;
}

export interface SectorTop5 {
  category: string;
  coins: Coin[];
}

export interface DerivativesData {
  symbol: string;
  longShortRatio: number;
  fundingRate: number;
  openInterest: number;
  timestamp: number;
}

export interface MarketLiquidity {
  total_volume: number;
  total_market_cap: number;
  liquidity_ratio: number;
  market_dominance: Record<string, number>;
  active_cryptocurrencies: number;
}

export interface ExchangeFlow {
  exchange: string;
  inflow: number;
  outflow: number;
  netflow: number;
  timestamp: number;
}
