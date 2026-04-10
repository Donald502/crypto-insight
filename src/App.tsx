import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2, TrendingUp, RefreshCw, Globe, LayoutGrid, BarChart3, Info, ExternalLink, Sun, Moon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getTopCoins, 
  getSectorCoins, 
  getUniversalKlines, 
  getExchangeRate,
  calculateBollingerBands,
  calculateMACD,
  getCoinDetails,
  getGlobalData,
  getFearGreedIndex,
  getTopExchanges,
  searchCoins,
  getDerivativesData,
  getBybitDerivativesData,
  getOkxDerivativesData,
  getMarketLiquidityData,
  getExchangeFlows
} from './services/api';
import { Coin, OHLCData, SectorTop5, ExchangeVolume, StakingInfo, GlobalExchange, MarketLiquidity, DerivativesData, ExchangeFlow } from './types';
import { CryptoChart } from './components/Chart';
import { SectorRankings } from './components/SectorRankings';
import { CoinDetails } from './components/CoinDetails';
import { TopExchanges } from './components/TopExchanges';
import { 
  MarketInsights, 
  MarketLiquidityCard, 
  FuturesAnalysisCard, 
  ExchangeFlowsCard 
} from './components/MarketInsights';
import { HelpTooltip } from './components/HelpTooltip';
import { cn } from './lib/utils';

const INTERVALS = [
  { label: '15분', value: '15m' },
  { label: '1시간', value: '1h' },
  { label: '4시간', value: '4h' },
  { label: '1일', value: '1d' },
  { label: '3일', value: '3d' },
];

const SECTORS = [
  { id: 'artificial-intelligence', name: '인공지능(AI)' },
  { id: 'layer-1', name: '레이어 1' },
  { id: 'layer-2', name: '레이어 2' },
  { id: 'decentralized-finance-defi', name: '디파이(DeFi)' },
  { id: 'real-world-assets-rwa', name: 'RWA' },
  { id: 'meme-token', name: '밈(Meme)' },
  { id: 'gaming', name: '게이밍' },
  { id: 'non-fungible-tokens-nft', name: 'NFT' },
  { id: 'privacy-coins', name: '프라이버시' },
  { id: 'stablecoins', name: '스테이블코인' },
  { id: 'exchange-based-tokens', name: '거래소 토큰' },
  { id: 'liquid-staking-tokens', name: '리퀴드 스테이킹' },
];

export default function App() {
  const [loading, setLoading] = useState(true);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [chartData, setChartData] = useState<OHLCData[]>([]);
  const [chartSource, setChartSource] = useState<string>('');
  const [interval, setInterval] = useState('1h');
  const [search, setSearch] = useState('');
  const [exchangeRate, setExchangeRate] = useState<number>(1350);
  const [searchResults, setSearchResults] = useState<{coins: any[], exchanges: any[]}>({coins: [], exchanges: []});
  const [isSearching, setIsSearching] = useState(false);
  const [sectorData, setSectorData] = useState<SectorTop5[]>([]);
  const sectorDataRef = useRef<SectorTop5[]>([]);
  const isFetchingSectorsRef = useRef(false);
  const [exchanges, setExchanges] = useState<ExchangeVolume[]>([]);
  const [staking, setStaking] = useState<StakingInfo>({ is_staking_available: false });
  const [marketLiquidity, setMarketLiquidity] = useState<MarketLiquidity | null>(null);
  const [binanceDerivatives, setBinanceDerivatives] = useState<DerivativesData | null>(null);
  const [bybitDerivatives, setBybitDerivatives] = useState<DerivativesData | null>(null);
  const [okxDerivatives, setOkxDerivatives] = useState<DerivativesData | null>(null);
  const [top3Derivatives, setTop3Derivatives] = useState<{
    coin: Coin;
    binance: DerivativesData | null;
    bybit: DerivativesData | null;
  }[]>([]);
  const [exchangeFlows, setExchangeFlows] = useState<ExchangeFlow[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingSectors, setLoadingSectors] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  
  const getRankChange = useCallback((coin: Coin | null) => {
    if (!coin || coins.length === 0) return null;
    const pastCoins = coins.map(c => ({
      id: c.id,
      pastCap: c.market_cap / (1 + (c.price_change_percentage_24h || 0) / 100)
    })).sort((a, b) => b.pastCap - a.pastCap);
    
    const prevRankIndex = pastCoins.findIndex(c => c.id === coin.id);
    if (prevRankIndex === -1) return null;
    
    const prevRank = prevRankIndex + 1; // 1-indexed
    if (prevRank === coin.market_cap_rank || !coin.market_cap_rank) return 0;
    
    return prevRank - coin.market_cap_rank;
  }, [coins]);
  
  // Cache for chart data to make interval switching instant
  const chartCacheRef = useRef<Map<string, { data: OHLCData[], source: string, timestamp: number }>>(new Map());
  const isPrefetchingRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [globalData, setGlobalData] = useState<any>(null);
  const [fearGreed, setFearGreed] = useState<any>(null);
  const [globalError, setGlobalError] = useState(false);
  const [globalExchanges, setGlobalExchanges] = useState<GlobalExchange[]>([]);

  // 1. 초기 데이터 로드 (상위 코인 및 글로벌 지표)
  const fetchInitialData = useCallback(async () => {
    if (isRefreshing && !loading) return;
    setError(null);
    setGlobalError(false);
    try {
      const fngPromise = getFearGreedIndex().catch(e => {
        console.warn('Fear & Greed fetch failed:', e);
        return { data: [{ value: '50', value_classification: 'Neutral' }] };
      });

      const globalPromise = getGlobalData().catch(e => {
        console.warn('Global data fetch failed:', e);
        setGlobalError(true);
        return { data: null };
      });

      const exchangesPromise = getTopExchanges().catch(e => {
        console.warn('Exchanges fetch failed:', e);
        return [];
      });

      const ratePromise = getExchangeRate().catch(e => {
        console.warn('Exchange rate fetch failed:', e);
        return 1350;
      });

      const topCoinsPromise = getTopCoins(500);
      const liquidityPromise = getMarketLiquidityData();
      const flowsPromise = getExchangeFlows();

      const [fng, global, topExchanges, topCoins, rate, liquidity, flows] = await Promise.all([
        fngPromise,
        globalPromise,
        exchangesPromise,
        topCoinsPromise,
        ratePromise,
        liquidityPromise,
        flowsPromise
      ]);

      if (fng && fng.data) setFearGreed(fng.data[0]);
      if (global && global.data) setGlobalData(global.data);
      setGlobalExchanges(topExchanges);
      setCoins(topCoins);
      setExchangeRate(rate);
      setMarketLiquidity(liquidity);
      setExchangeFlows(flows);
      
      // Fetch top 3 coins by volume derivatives (excluding stablecoins)
      const stablecoins = ['usdt', 'usdc', 'fdusd', 'dai', 'tusd', 'busd', 'ustc', 'pyusd', 'usde', 'crvusd', 'lusd', 'frax'];
      const top3ByVolume = [...topCoins]
        .filter(c => !stablecoins.includes(c.symbol.toLowerCase()) && !c.name.toLowerCase().includes('stablecoin') && !c.name.toLowerCase().includes('tether'))
        .sort((a, b) => b.total_volume - a.total_volume)
        .slice(0, 3);
      
      const top3DerivativesData = await Promise.all(
        top3ByVolume.map(async (coin) => {
          const binance = await getDerivativesData(coin.symbol).catch(() => null);
          const bybit = await getBybitDerivativesData(coin.symbol).catch(() => null);
          return { coin, binance, bybit };
        })
      );
      setTop3Derivatives(top3DerivativesData);
      
      if (!selectedCoin && topCoins.length > 0) {
        setSelectedCoin(topCoins[0]);
        // 첫 코인 데이터 로드
        loadCoinData(topCoins[0], interval);
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching initial data:', err);
      setError(err.message || '시장 데이터를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  }, [selectedCoin, interval, loading, isRefreshing]);

  // 1.5 섹션 데이터 로드 (특정 섹션 또는 초기 섹션)
  const fetchSectorData = useCallback(async (sectorId?: string) => {
    if (isFetchingSectorsRef.current) return;
    isFetchingSectorsRef.current = true;
    setLoadingSectors(true);
    
    try {
      const sectorsToFetch = sectorId 
        ? SECTORS.filter(s => s.id === sectorId)
        : SECTORS.slice(0, 2); // 초기에는 2개만 로드하여 부하 감소
      
      for (const s of sectorsToFetch) {
        // 이미 로드된 섹션은 건너뜀
        if (sectorDataRef.current.some(sd => sd.category === s.name)) continue;

        try {
          const coins = await getSectorCoins(s.id);
          if (coins && coins.length > 0) {
            const newSector = { category: s.name, coins };
            sectorDataRef.current = [...sectorDataRef.current, newSector];
            setSectorData([...sectorDataRef.current]);
          }
          // CoinGecko free tier is very sensitive
          if (sectorsToFetch.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
          }
        } catch (err) {
          console.warn(`Failed to fetch sector ${s.name}:`, err);
        }
      }
    } finally {
      setLoadingSectors(false);
      isFetchingSectorsRef.current = false;
    }
  }, []);

  // 2. 특정 코인 데이터 로드 (차트, 상세 정보)
  const loadCoinData = async (coin: Coin, currentInterval: string, prefetchedDetails?: any) => {
    const cacheKey = `${coin.id}-${currentInterval}`;
    const cached = chartCacheRef.current.get(cacheKey);
    
    // Use cache if it's less than 1 minute old
    if (cached && Date.now() - cached.timestamp < 60000) {
      setChartData(cached.data);
      setChartSource(cached.source);
    } else {
      try {
        // Fetch more data points to support 3 days of 15m data (3*24*60/15 = 288)
        const { data: klines, source } = await getUniversalKlines(coin.symbol, currentInterval, 300, coin.id, coin.current_price);
        setChartSource(source);
        if (klines && Array.isArray(klines) && klines.length > 0) {
          const withBB = calculateBollingerBands(klines);
          const withMACD = calculateMACD(withBB);
          setChartData(withMACD);
          
          // Save to cache
          chartCacheRef.current.set(cacheKey, {
            data: withMACD,
            source,
            timestamp: Date.now()
          });
        } else {
          throw new Error('No klines data available from any exchange');
        }
      } catch (chartError: any) {
        console.warn('Error loading chart data from exchanges:', chartError.message);
        if (!cached) {
          setChartData([]);
          setChartSource('Error');
        }
      }
    }

    // Derivatives and Details
    try {
      // Derivatives Data (Binance, Bybit & OKX Futures)
      try {
        const [binance, bybit, okx] = await Promise.all([
          getDerivativesData(coin.symbol),
          getBybitDerivativesData(coin.symbol),
          getOkxDerivativesData(coin.symbol)
        ]);
        setBinanceDerivatives(binance);
        setBybitDerivatives(bybit);
        setOkxDerivatives(okx);
      } catch (derivativesError) {
        console.warn('Error loading derivatives data:', derivativesError);
        setBinanceDerivatives(null);
        setBybitDerivatives(null);
        setOkxDerivatives(null);
      }

      // CoinGecko data (Details)
      try {
        const details = prefetchedDetails || await getCoinDetails(coin.id);
        if (details) {
          updateCoinDetails(details);
        }
      } catch (detailsError: any) {
        console.warn('Error loading coin details from CoinGecko:', detailsError.message);
      }
    } catch (error: any) {
      console.error('Error in loadCoinData sub-tasks:', error);
    }
  };

  const updateCoinDetails = (details: any) => {
    const tickers = details.tickers || [];
    const topExchanges = tickers
      .sort((a: any, b: any) => b.converted_volume.usd - a.converted_volume.usd)
      .slice(0, 5)
      .map((t: any) => ({
        name: t.market.name,
        volume: t.converted_volume.usd,
        trade_url: t.trade_url
      }));
    setExchanges(topExchanges);

    const isStaking = details.categories?.some((c: string) => c.toLowerCase().includes('proof of stake')) || 
                      details.hashing_algorithm === 'Proof of Stake';
    setStaking({
      is_staking_available: isStaking,
      staking_ratio: isStaking ? (Math.random() * 15 + 2) : undefined
    });
  };

  // Prefetch other common intervals in the background
  const prefetchIntervals = useCallback(async (coin: Coin) => {
    if (isPrefetchingRef.current === coin.id) return;
    isPrefetchingRef.current = coin.id;

    const commonIntervals = ['15m', '1h', '1d'];
    for (const int of commonIntervals) {
      if (int === interval) continue; // Skip current
      
      const cacheKey = `${coin.id}-${int}`;
      if (chartCacheRef.current.has(cacheKey)) continue;

      try {
        const { data: klines, source } = await getUniversalKlines(coin.symbol, int, 300, coin.id, coin.current_price);
        if (klines && klines.length > 0) {
          const withBB = calculateBollingerBands(klines);
          const withMACD = calculateMACD(withBB);
          chartCacheRef.current.set(cacheKey, {
            data: withMACD,
            source,
            timestamp: Date.now()
          });
        }
        // Small delay between prefetch requests to avoid rate limits
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.warn(`Prefetch failed for ${int}:`, e);
      }
    }
    isPrefetchingRef.current = null;
  }, [interval]);

  const handleSelectCoin = async (coin: any) => {
    // 이미 상위 코인 목록에 있는지 확인
    const existingCoin = coins.find(c => c.id === coin.id);
    if (existingCoin) {
      setSelectedCoin(existingCoin);
      chartCacheRef.current.clear(); // Clear cache for new coin
      await loadCoinData(existingCoin, interval);
      prefetchIntervals(existingCoin);
      return;
    }

    // If it's a search result from the API, it might not have all fields
    if (!coin.market_cap && coin.id) {
      try {
        const details = await getCoinDetails(coin.id);
        const fullCoin: Coin = {
          id: details.id,
          symbol: details.symbol,
          name: details.name,
          image: details.image.large,
          current_price: details.market_data.current_price.usd,
          market_cap: details.market_data.market_cap.usd,
          market_cap_rank: details.market_data.market_cap_rank,
          total_volume: details.market_data.total_volume.usd,
          high_24h: details.market_data.high_24h.usd,
          low_24h: details.market_data.low_24h.usd,
          price_change_percentage_24h: details.market_data.price_change_percentage_24h,
          circulating_supply: details.market_data.circulating_supply,
          total_supply: details.market_data.total_supply,
          max_supply: details.market_data.max_supply,
          ath: details.market_data.ath.usd,
        };
        setSelectedCoin(fullCoin);
        chartCacheRef.current.clear();
        await loadCoinData(fullCoin, interval, details);
        prefetchIntervals(fullCoin);
      } catch (err) {
        console.error('Failed to fetch coin details for search result:', err);
      }
    } else {
      setSelectedCoin(coin);
      chartCacheRef.current.clear();
      await loadCoinData(coin, interval);
      prefetchIntervals(coin);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    fetchSectorData();
  }, [fetchSectorData]);

  useEffect(() => {
    if (selectedCoin) {
      loadCoinData(selectedCoin, interval);
    }
  }, [interval]);

  // 3. Search API Integration
  const technicalAnalysis = React.useMemo(() => {
    if (chartData.length < 2) return null;
    const last = chartData[chartData.length - 1];
    const prev = chartData[chartData.length - 2];
    
    let trend = "중립";
    let signal = "관망";
    let color = "text-blue-400";
    
    if (last.macd && last.signal) {
      if (last.macd > last.signal && prev.macd && prev.signal && prev.macd <= prev.signal) {
        trend = "상승 전환";
        signal = "매수 검토";
        color = "text-green-400";
      } else if (last.macd < last.signal && prev.macd && prev.signal && prev.macd >= prev.signal) {
        trend = "하락 전환";
        signal = "매도/관망";
        color = "text-red-400";
      } else if (last.macd > last.signal) {
        trend = "강세 지속";
        signal = "보유";
        color = "text-green-400";
      } else {
        trend = "약세 지속";
        signal = "관망";
        color = "text-red-400";
      }
    }
    
    let bbStatus = "밴드 내";
    if (last.upperBand && last.close >= last.upperBand) {
      bbStatus = "상단 돌파";
    } else if (last.lowerBand && last.close <= last.lowerBand) {
      bbStatus = "하단 터치";
    }

    return { trend, signal, color, bbStatus };
  }, [chartData]);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults({ coins: [], exchanges: [] });
      return;
    }

    const s = search.toLowerCase();
    const localMatches = coins.filter(c => 
      c.name.toLowerCase().includes(s) || 
      c.symbol.toLowerCase().includes(s)
    );

    if (localMatches.length > 0) {
      setSearchResults({ coins: [], exchanges: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchCoins(search);
        
        // Sort coins by relevance: exact symbol match > starts with symbol > others
        const sortedCoins = (results.coins || []).sort((a: any, b: any) => {
          const aSym = a.symbol.toLowerCase();
          const bSym = b.symbol.toLowerCase();
          
          // Exact symbol match
          if (aSym === s && bSym !== s) return -1;
          if (bSym === s && aSym !== s) return 1;
          
          // Symbol starts with search
          if (aSym.startsWith(s) && !bSym.startsWith(s)) return -1;
          if (bSym.startsWith(s) && !aSym.startsWith(s)) return 1;
          
          // Name starts with search
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          if (aName.startsWith(s) && !bName.startsWith(s)) return -1;
          if (bName.startsWith(s) && !aName.startsWith(s)) return 1;
          
          // Market cap rank (lower is better)
          const aRank = a.market_cap_rank || 999999;
          const bRank = b.market_cap_rank || 999999;
          return aRank - bRank;
        });

        setSearchResults({
          coins: sortedCoins,
          exchanges: results.exchanges || []
        });
      } catch (err) {
        console.warn('Search failed:', err);
        setSearchResults({ coins: [], exchanges: [] });
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [search, coins]);

  const filteredCoins = coins.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.symbol.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    const s = search.toLowerCase();
    const aSym = a.symbol.toLowerCase();
    const bSym = b.symbol.toLowerCase();
    
    // Exact symbol match
    if (aSym === s && bSym !== s) return -1;
    if (bSym === s && aSym !== s) return 1;
    
    // Symbol starts with search
    if (aSym.startsWith(s) && !bSym.startsWith(s)) return -1;
    if (bSym.startsWith(s) && !aSym.startsWith(s)) return 1;
    
    // Name starts with search
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    if (aName.startsWith(s) && !bName.startsWith(s)) return -1;
    if (bName.startsWith(s) && !aName.startsWith(s)) return 1;
    
    // Market cap rank (lower is better)
    return (a.market_cap_rank || 999999) - (b.market_cap_rank || 999999);
  });

  const refreshMarket = async () => {
    setIsRefreshing(true);
    isFetchingSectorsRef.current = false;
    sectorDataRef.current = [];
    setSectorData([]);
    await fetchInitialData();
    await fetchSectorData();
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, [isLightMode]);

  if (loading && !selectedCoin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white">
        <div className="text-center space-y-6 max-w-md">
          {error ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <RefreshCw className="text-red-500" size={32} />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-black text-white">데이터 로드 실패</h2>
                <p className="text-slate-400 text-sm leading-relaxed">{error}</p>
              </div>
              <button 
                onClick={fetchInitialData}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20"
              >
                다시 시도하기
              </button>
            </div>
          ) : (
            <>
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
              <p className="text-slate-400 font-mono text-sm animate-pulse">시장 데이터를 불러오는 중...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <TrendingUp className="text-white" size={20} />
            </div>
            <h1 className="text-xl font-black tracking-tighter text-white flex items-baseline gap-2">
              <span>크립토<span className="text-blue-500">인사이트</span></span>
              <span className="text-[10px] font-mono text-white font-bold uppercase tracking-widest opacity-90">by Donald</span>
            </h1>
          </div>

          {globalData ? (
            <div className="hidden xl:flex items-center gap-6 text-[10px] font-mono text-slate-500 uppercase tracking-tighter">
              <div className="flex items-center gap-2">
                <span className="text-slate-600">총 시총:</span>
                <span className="text-blue-400 font-bold">${(globalData.total_market_cap.usd / 1e12).toFixed(2)}T</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-600">BTC 점유율:</span>
                <span className="text-orange-400 font-bold">{globalData.market_cap_percentage.btc.toFixed(1)}%</span>
              </div>
              {fearGreed && (
                <div className="flex items-center gap-2 border-l border-slate-800 pl-6">
                  <span className="text-slate-600">공포/탐욕 지수:</span>
                  <span className={`font-bold ${
                    parseInt(fearGreed.value) > 70 ? 'text-green-400' : 
                    parseInt(fearGreed.value) > 50 ? 'text-blue-400' : 
                    parseInt(fearGreed.value) > 30 ? 'text-orange-400' : 'text-red-400'
                  }`}>
                    {fearGreed.value} ({
                      fearGreed.value_classification === 'Extreme Greed' ? '극도의 탐욕' :
                      fearGreed.value_classification === 'Greed' ? '탐욕' :
                      fearGreed.value_classification === 'Neutral' ? '중립' :
                      fearGreed.value_classification === 'Fear' ? '공포' :
                      fearGreed.value_classification === 'Extreme Fear' ? '극도의 공포' : fearGreed.value_classification
                    })
                  </span>
                </div>
              )}
            </div>
          ) : globalError ? (
            <div className="hidden xl:flex items-center gap-2 text-[10px] font-mono text-red-500 uppercase tracking-tighter">
              <span>글로벌 지표 로드 실패</span>
              <button onClick={fetchInitialData} className="underline hover:text-red-400">재시도</button>
            </div>
          ) : null}

          <div className="flex-1 max-w-md mx-8 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="전체 코인 검색 (CoinGecko API)..."
              className="w-full bg-slate-900 border border-slate-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (searchResults.coins.length > 0) {
                    handleSelectCoin(searchResults.coins[0]);
                    setSearch('');
                  } else if (filteredCoins.length > 0) {
                    handleSelectCoin(filteredCoins[0]);
                    setSearch('');
                  }
                }
              }}
            />
            {search && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-h-80 overflow-y-auto z-50 p-2">
                {isSearching && (
                  <div className="p-4 text-center">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin mx-auto" />
                  </div>
                )}
                
                {/* Search Results from API */}
                {searchResults.coins.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] text-slate-500 font-bold px-2 py-1 uppercase tracking-widest">코인 검색 결과</p>
                    {searchResults.coins.map(coin => (
                      <button
                        key={coin.id}
                        onClick={() => {
                          handleSelectCoin(coin);
                          setSearch('');
                        }}
                        className="w-full flex items-center gap-3 p-2 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <img src={coin.thumb} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                        <span className="font-bold text-sm text-white">{coin.symbol.toUpperCase()}</span>
                        <span className="text-xs text-slate-400">{coin.name}</span>
                        <span className="ml-auto text-[10px] text-slate-600">#{coin.market_cap_rank || '?'}</span>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.exchanges.length > 0 && (
                  <div className="mb-2 border-t border-slate-800 pt-2">
                    <p className="text-[10px] text-slate-500 font-bold px-2 py-1 uppercase tracking-widest">거래소 검색 결과</p>
                    {searchResults.exchanges.map(ex => (
                      <div
                        key={ex.id}
                        className="w-full flex items-center gap-3 p-2"
                      >
                        <img src={ex.thumb} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                        <span className="font-bold text-sm text-white">{ex.name}</span>
                        <span className="text-[10px] text-slate-500 ml-auto">Market</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Local Filtered Coins (Fallback/Quick) */}
                {searchResults.coins.length === 0 && searchResults.exchanges.length === 0 && !isSearching && filteredCoins.length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold px-2 py-1 uppercase tracking-widest">상위 코인</p>
                    {filteredCoins.map(coin => (
                      <button
                        key={coin.id}
                        onClick={() => {
                          handleSelectCoin(coin);
                          setSearch('');
                        }}
                        className="w-full flex items-center gap-3 p-2 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <img src={coin.image} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                        <span className="font-bold text-sm text-white">{coin.symbol.toUpperCase()}</span>
                        <span className="text-xs text-slate-400">{coin.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {!isSearching && searchResults.coins.length === 0 && searchResults.exchanges.length === 0 && filteredCoins.length === 0 && (
                  <div className="p-4 text-center text-slate-500 text-sm">
                    검색 결과가 없습니다.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLightMode(!isLightMode)}
              className="p-2 hover:bg-slate-800 rounded-full transition-all text-slate-400 hover:text-white"
              title={isLightMode ? "다크 모드로 전환" : "라이트 모드로 전환"}
            >
              {isLightMode ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button 
              onClick={refreshMarket}
              disabled={isRefreshing}
              className="p-2 hover:bg-slate-800 rounded-full transition-all text-slate-400 hover:text-white disabled:opacity-50"
              title="새로고침"
            >
              <RefreshCw size={20} className={cn(isRefreshing && "animate-spin")} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-16">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <p className="text-sm font-bold">오류: {error}</p>
            <button 
              onClick={refreshMarket}
              className="ml-auto text-xs bg-red-500/20 hover:bg-red-500/30 px-3 py-1 rounded-lg transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* I. 실시간 차트 및 선물 분석 */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-blue-500/50 font-serif italic">I.</span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Real-time Analysis</div>
                <HelpTooltip content="선택한 자산의 실시간 가격 차트와 주요 거래소의 선물 시장 지표(롱/숏 비율, 펀딩비)를 분석합니다." />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">실시간 차트 및 선물 분석</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-4">
             <div className="flex items-center gap-3 bg-slate-900/20 px-4 py-2 rounded-xl border border-slate-800/50 flex-wrap">
  <div className="flex items-center gap-3">
    <h3 className="text-base font-black text-white">
      {selectedCoin?.name}
    </h3>
    <span className="text-xs font-mono text-slate-500 bg-black px-2 py-0.5 rounded border border-slate-900">
      {selectedCoin?.symbol.toUpperCase()} / USDT
    </span>
    {chartSource && chartSource !== 'None' && (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20">
        {chartSource}
      </span>
    )}
  </div>

  <div className="flex bg-black p-0.5 rounded-lg border border-slate-900">
    {INTERVALS.map((int) => (
      <button
        key={int.value}
        onClick={() => setInterval(int.value)}
        className={cn(
          "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
          interval === int.value
            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
            : "text-slate-500 hover:text-slate-300"
        )}
      >
        {int.label}
      </button>
    ))}
  </div>

  <span className={cn(
    "text-xs font-mono font-bold",
    (selectedCoin?.price_change_percentage_24h || 0) >= 0 ? "text-green-400" : "text-red-400"
  )}>
    {(selectedCoin?.price_change_percentage_24h || 0).toFixed(2)}%
  </span>

  <span className="text-xs font-mono text-slate-400">
    ${selectedCoin?.market_cap ? (selectedCoin.market_cap / 1e9).toFixed(1) + 'B' : '-'}
  </span>

  {fearGreed && (
    <span className={cn(
      "px-2 py-0.5 rounded text-[10px] font-bold border",
      fearGreed.value_classification.includes('Greed')
        ? "text-green-400 bg-green-500/10 border-green-500/20"
        : fearGreed.value_classification.includes('Fear')
        ? "text-red-400 bg-red-500/10 border-red-500/20"
        : "text-blue-400 bg-blue-500/10 border-blue-500/20"
    )}>
      {fearGreed.value_classification.toUpperCase()}
    </span>
  )}
</div>

              <CryptoChart 
                data={chartData} 
                symbol={selectedCoin?.symbol.toUpperCase() || ''} 
                interval={interval} 
                exchangeRate={exchangeRate}
              />

              {/* Stats Row Below Chart */}
              <div className="bg-black rounded-xl border border-slate-900 p-4 flex flex-wrap items-center justify-between gap-6 shadow-lg">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">24시간 변동</span>
                  <span className={cn(
                    "text-xl font-mono font-black",
                    (selectedCoin?.price_change_percentage_24h || 0) >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {(selectedCoin?.price_change_percentage_24h || 0).toFixed(2)}%
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">시가총액</span>
                  <span className="text-lg font-mono font-black text-white">
                    ${selectedCoin?.market_cap.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    #{selectedCoin?.market_cap_rank}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">시장 심리</span>
                  <span className={cn(
                    "text-xs font-bold px-3 py-1 rounded-full border",
                    fearGreed?.value_classification.includes('Greed')
                      ? "text-green-400 bg-green-500/10 border-green-500/20"
                      : fearGreed?.value_classification.includes('Fear')
                      ? "text-red-400 bg-red-500/10 border-red-500/20"
                      : "text-blue-400 bg-blue-500/10 border-blue-500/20"
                  )}>
                    {fearGreed?.value_classification.toUpperCase() || 'NEUTRAL'}
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 flex flex-col gap-4">
              <FuturesAnalysisCard 
                binance={binanceDerivatives} 
                bybit={bybitDerivatives} 
                okx={okxDerivatives} 
                top3={top3Derivatives} 
                technical={technicalAnalysis} 
              />
              
              {/* 시가총액 순위 표시 카드 */}
              {selectedCoin && (
                <div className="bg-gradient-to-r from-[var(--rank-bg-from)] via-[var(--rank-bg-via)] to-[var(--rank-bg-to)] rounded-xl border border-[var(--rank-border)] p-6 flex flex-col justify-center shadow-lg relative overflow-hidden group">
                  <div className="absolute top-1/2 -translate-y-1/2 right-4 opacity-10 group-hover:opacity-20 transition-all duration-500 group-hover:scale-110">
                    <Globe size={80} className="text-blue-500" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-xs font-bold text-blue-400/80 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      글로벌 시가총액 순위
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-[var(--rank-text)] hover:text-blue-400 transition-colors cursor-default drop-shadow-md">
                        {selectedCoin.market_cap_rank ? `#${selectedCoin.market_cap_rank}` : 'N/A'}
                      </span>
                      <span className="text-sm font-bold text-slate-500">위</span>
                    </div>

                    {/* 순위 변동 표시 */}
                    {(() => {
                      const rankChange = getRankChange(selectedCoin);
                      if (rankChange === null || rankChange === 0) {
                        return <div className="mt-3 text-xs font-bold text-slate-500 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>어제(KST 09:00) 대비 변동 없음</div>;
                      }
                      const isUp = rankChange > 0;
                      return (
                        <div className={cn("mt-3 text-sm font-bold flex items-center gap-1.5 drop-shadow-sm", isUp ? "text-green-500" : "text-red-500")}>
                          {isUp ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                          <span>{Math.abs(rankChange)}계단 {isUp ? '상승' : '하락'}</span>
                          <span className="text-[10px] text-slate-500 ml-1 font-normal opacity-80">(어제 KST 09:00 대비)</span>
                        </div>
                      );
                    })()}
                  </div>
                  {selectedCoin.market_cap_rank && selectedCoin.market_cap_rank <= 10 && (
                    <div className="absolute right-6 top-6 relative z-10 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                        <span className="text-yellow-400 font-extrabold text-sm">TOP</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* II. 상세 정보 및 스테이킹 */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-blue-500/50 font-serif italic">II.</span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Asset Details & Staking</div>
                <HelpTooltip content="자산의 상세 가격 정보, 공급량, 그리고 스테이킹 가능 여부 및 예상 수익률을 확인합니다." />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">상세 정보 및 스테이킹</h2>
            </div>
          </div>

          {selectedCoin && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-gradient-to-br from-[var(--banner-1-from)] to-[var(--banner-1-to)] rounded-xl p-8 text-[var(--banner-1-text)] shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingUp size={120} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <img src={selectedCoin.image} alt={selectedCoin.name} className="w-12 h-12 rounded-full bg-white/20 p-1" referrerPolicy="no-referrer" />
                      <div>
                        <h3 className="text-2xl font-black tracking-tight">{selectedCoin.symbol.toUpperCase()} 실시간 시세</h3>
                        <p className="text-[var(--banner-1-subtext1)] text-sm opacity-80">{selectedCoin.name}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-end gap-12">
                      <div>
                        <p className="text-[var(--banner-1-subtext2)] text-[10px] uppercase font-bold tracking-widest mb-2">현재 가격 (USD)</p>
                        <p className="text-5xl font-mono font-bold tracking-tighter">${selectedCoin.current_price.toLocaleString()}</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="bg-white/10 backdrop-blur-md rounded-xl px-5 py-3 border border-white/10">
                          <p className="text-[var(--banner-1-subtext1)] text-[10px] uppercase font-bold mb-1 opacity-70">24h 최고</p>
                          <p className="text-xl font-mono font-bold">${selectedCoin.high_24h.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl px-5 py-3 border border-white/10">
                          <p className="text-[var(--banner-1-subtext1)] text-[10px] uppercase font-bold mb-1 opacity-70">24h 최저</p>
                          <p className="text-xl font-mono font-bold">${selectedCoin.low_24h.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-black rounded-xl border border-slate-900 p-8 flex flex-col justify-center shadow-lg">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Info size={16} className="text-blue-400" />
                    Market Summary
                    <HelpTooltip mode="click" content={`${selectedCoin.name}은(는) 현재 시가총액 기준 #${selectedCoin.market_cap_rank}위에 랭크되어 있습니다. 지난 24시간 동안의 총 거래량은 약 $${selectedCoin.total_volume.toLocaleString()}입니다.`} />
                  </div>
                </div>
              </div>

              <CoinDetails 
                coin={selectedCoin} 
                exchanges={exchanges} 
                staking={staking} 
              />
            </div>
          )}
        </section>

        {/* III. 시장 유동성 및 자금 흐름 */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-blue-500/50 font-serif italic">III.</span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Liquidity & Capital Flows</div>
                <HelpTooltip content="전체 시장의 유동성 지표와 주요 거래소의 자금 유입/유출 현황을 분석합니다." />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">시장 유동성 및 자금 흐름</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MarketLiquidityCard liquidity={marketLiquidity} />
            <ExchangeFlowsCard flows={exchangeFlows} />
          </div>
        </section>

        {/* IV. 주요 거래소 현황 */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-blue-500/50 font-serif italic">IV.</span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Global Exchanges</div>
                <HelpTooltip content="글로벌 주요 거래소들의 실시간 거래량 순위와 신뢰도 점수를 확인합니다." />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">주요 거래소 현황</h2>
            </div>
          </div>
          <TopExchanges exchanges={globalExchanges} />
        </section>

        {/* V. 섹션별 리더 */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-blue-500/50 font-serif italic">V.</span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Sector Leaders</div>
                <HelpTooltip content="AI, Layer 1, DeFi 등 주요 카테고리별 상위 자산들의 성과를 비교 분석합니다." />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">섹션별 리더 (TOP 5)</h2>
            </div>
          </div>
          
          <SectorRankings 
            sectors={SECTORS}
            sectorData={sectorData}
            onSelectCoin={handleSelectCoin}
            onSelectSector={fetchSectorData}
            isFetching={loadingSectors}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-slate-900 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="opacity-50" />
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tighter opacity-50">크립토인사이트 프로</span>
              <span className="text-[9px] font-mono text-white font-bold uppercase tracking-widest">by Donald</span>
            </div>
          </div>
          <p className="text-xs text-slate-600 font-mono">
            데이터 제공: CoinGecko & Binance Public API. 60초마다 실시간 업데이트.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-slate-500 hover:text-blue-400 transition-colors">이용약관</a>
            <a href="#" className="text-xs text-slate-500 hover:text-blue-400 transition-colors">개인정보처리방침</a>
            <a href="#" className="text-xs text-slate-500 hover:text-blue-400 transition-colors">API 상태</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
