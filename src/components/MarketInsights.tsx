import React from 'react';
import { Coin, MarketLiquidity, DerivativesData, ExchangeFlow, OHLCData } from '../types';
import { Activity, ArrowUpRight, ArrowDownRight, Droplets, BarChart3, Globe, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { HelpTooltip } from './HelpTooltip';

interface MarketInsightsProps {
  liquidity: MarketLiquidity | null;
  binanceDerivatives: DerivativesData | null;
  bybitDerivatives: DerivativesData | null;
  okxDerivatives: DerivativesData | null;
  top3Derivatives: {
    coin: Coin;
    binance: DerivativesData | null;
    bybit: DerivativesData | null;
  }[];
  flows: ExchangeFlow[];
  chartData: OHLCData[];
}

export const MarketLiquidityCard: React.FC<{ liquidity: MarketLiquidity | null }> = ({ liquidity }) => (
  <div className="bg-black rounded-xl border border-slate-900 p-6 shadow-lg h-full">
    <div className="text-lg font-bold text-white mb-6 flex items-center gap-2">
      <Droplets className="text-blue-400" size={20} />
      시장 유동성 및 지배력
      <HelpTooltip content="유동성은 자산을 가격 하락 없이 얼마나 빨리 현금화할 수 있는지를 나타내며, 지배력은 특정 코인이 전체 시장에서 차지하는 비중을 의미합니다." />
    </div>
    
    {liquidity ? (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] text-slate-500 uppercase font-bold">시장 전체 유동성 비율</div>
              <HelpTooltip content="전체 시장 24h 거래량 대비 시총 비율입니다. 높을수록 시장이 활성화되어 있음을 의미합니다." />
            </div>
            <p className="text-xl font-mono font-bold text-blue-400">{liquidity.liquidity_ratio.toFixed(2)}%</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] text-slate-500 uppercase font-bold">활성 암호화폐</div>
              <HelpTooltip content="현재 시장에서 실제로 거래되고 있는 코인의 총 개수입니다." />
            </div>
            <p className="text-xl font-mono font-bold text-white">{liquidity.active_cryptocurrencies.toLocaleString()}</p>
          </div>
        </div>

        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Globe size={14} />
            시장 점유율 (Dominance)
            <HelpTooltip content="비트코인 지배력이 높을수록 시장이 안정적이며, 낮을수록 알트코인 장세가 강해지는 경향이 있습니다." />
          </div>
          <div className="space-y-3">
            {Object.entries(liquidity.market_dominance).slice(0, 3).map(([coin, percent]) => {
              const p = percent as number;
              return (
                <div key={coin} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-bold uppercase">{coin} 지배력</span>
                    <span className="text-blue-400 font-mono">{p.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${p}%` }}
                      className="h-full bg-blue-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    ) : (
      <div className="h-48 flex items-center justify-center text-slate-600 text-sm italic">
        데이터를 불러오는 중...
      </div>
    )}
  </div>
);

export const FuturesAnalysisCard: React.FC<{
  binance: DerivativesData | null;
  bybit: DerivativesData | null;
  okx: DerivativesData | null;
  top3: { coin: Coin; binance: DerivativesData | null; bybit: DerivativesData | null; }[];
  technical: { trend: string; signal: string; color: string; bbStatus: string; } | null;
}> = ({ binance, bybit, okx, top3, technical }) => (
  <div className="bg-black rounded-xl border border-slate-900 p-4 shadow-lg flex flex-col">
    <div className="text-base font-bold text-white mb-3 flex items-center gap-2">
      <Zap className="text-yellow-400" size={18} />
      선물 시장 분석
      <HelpTooltip content="주요 선물 거래소의 실시간 롱/숏 비율과 펀딩비, 그리고 차트 기반의 기술적 분석 요약을 제공합니다." />
    </div>
    
    <div className="space-y-3 flex-1">
      {(binance || bybit || okx) && (
        <div className="bg-blue-600/10 rounded-xl p-3 border border-blue-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">롱/숏 비율 & 펀딩비</div>
            <HelpTooltip content="롱/숏 비율은 시장의 심리를, 펀딩비는 선물 가격과 현물 가격의 차이를 조절하기 위해 롱/숏 포지션 간에 주고받는 비용입니다." />
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <p className="text-[8px] font-black text-yellow-500/80 text-center uppercase">Binance</p>
              {binance ? (
                <div className="text-center">
                  <p className="text-xs font-mono font-bold text-white">{binance.longShortRatio.toFixed(2)}</p>
                  <p className={`text-[8px] font-mono ${binance.fundingRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {binance.fundingRate.toFixed(4)}%
                  </p>
                </div>
              ) : <p className="text-[8px] text-slate-700 italic text-center">N/A</p>}
            </div>
            <div className="space-y-1 border-l border-slate-800/50 px-1">
              <p className="text-[8px] font-black text-orange-500/80 text-center uppercase">Bybit</p>
              {bybit ? (
                <div className="text-center">
                  <p className="text-xs font-mono font-bold text-white">{bybit.longShortRatio.toFixed(2)}</p>
                  <p className={`text-[8px] font-mono ${bybit.fundingRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {bybit.fundingRate.toFixed(4)}%
                  </p>
                </div>
              ) : <p className="text-[8px] text-slate-700 italic text-center">N/A</p>}
            </div>
            <div className="space-y-1 border-l border-slate-800/50 pl-1">
              <p className="text-[8px] font-black text-white/80 text-center uppercase">OKX</p>
              {okx ? (
                <div className="text-center">
                  <p className="text-xs font-mono font-bold text-white">{okx.longShortRatio.toFixed(2)}</p>
                  <p className={`text-[8px] font-mono ${okx.fundingRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {okx.fundingRate.toFixed(4)}%
                  </p>
                </div>
              ) : <p className="text-[8px] text-slate-700 italic text-center">N/A</p>}
            </div>
          </div>
        </div>
      )}

      {technical && (
        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">기술적 지표</div>
              <HelpTooltip content="MACD 골든/데드 크로스 및 볼린저 밴드 위치를 기반으로 한 단기 추세 요약입니다." />
            </div>
            <BarChart3 size={12} className="text-slate-600" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500">추세</span>
              <span className={cn("text-[10px] font-bold", technical.color)}>{technical.trend}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500">BB 위치</span>
              <span className="text-[10px] font-bold text-slate-300">{technical.bbStatus}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);

export const ExchangeFlowsCard: React.FC<{ flows: ExchangeFlow[] }> = ({ flows }) => (
  <div className="bg-black rounded-xl border border-slate-900 p-6 shadow-lg h-full">
    <div className="text-lg font-bold text-white mb-6 flex items-center gap-2">
      <Activity className="text-purple-400" size={20} />
      거래소 자금 흐름 (Net Flow)
      <HelpTooltip content="순유입(+)은 매수 대기 자금 증가, 순유출(-)은 지갑 이동 또는 매도 준비로 해석될 수 있습니다." />
    </div>
    
    <div className="space-y-4">
      {flows.map((flow, idx) => (
        <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-800/50">
          <span className="text-xs font-bold text-slate-300 uppercase">{flow.exchange}</span>
          <div className="flex items-center gap-1">
            {flow.netflow >= 0 ? (
              <ArrowUpRight size={12} className="text-green-400" />
            ) : (
              <ArrowDownRight size={12} className="text-red-400" />
            )}
            <span className={`text-sm font-mono font-bold ${flow.netflow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {flow.netflow >= 0 ? '+' : ''}${Math.abs(flow.netflow).toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const MarketInsights: React.FC<MarketInsightsProps> = ({ 
  liquidity, 
  binanceDerivatives, 
  bybitDerivatives, 
  okxDerivatives, 
  top3Derivatives, 
  flows,
  chartData
}) => {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <MarketLiquidityCard liquidity={liquidity} />
      <FuturesAnalysisCard 
        binance={binanceDerivatives} 
        bybit={bybitDerivatives} 
        okx={okxDerivatives} 
        top3={top3Derivatives} 
        technical={technicalAnalysis} 
      />
      <ExchangeFlowsCard flows={flows} />
    </div>
  );
};
