import React from 'react';
import { Coin, ExchangeVolume, StakingInfo } from '../types';
import { Info, Activity, Database, PieChart, ExternalLink, ShieldCheck } from 'lucide-react';
import { HelpTooltip } from './HelpTooltip';

interface CoinDetailsProps {
  coin: Coin;
  exchanges: ExchangeVolume[];
  staking: StakingInfo;
}

export const CoinDetails: React.FC<CoinDetailsProps> = ({ coin, exchanges, staking }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Market Stats */}
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-black rounded-xl border border-slate-900 p-6 shadow-lg">
          <div className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="text-blue-400" size={20} />
            시장 인사이트
            <HelpTooltip content="시가총액, 거래량, 공급량 등 해당 자산의 주요 시장 지표를 요약하여 보여줍니다." />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard 
              label="시가총액" 
              value={`$${coin.market_cap.toLocaleString()}`} 
              icon={<Database size={14} />} 
              sub={`순위 #${coin.market_cap_rank}`}
            />
            <StatCard 
              label="24시간 거래량" 
              value={`$${coin.total_volume.toLocaleString()}`} 
              icon={<Activity size={14} />} 
            />
            <StatCard 
              label="유통 공급량" 
              value={coin.circulating_supply.toLocaleString()} 
              icon={<PieChart size={14} />} 
              sub={`${coin.symbol.toUpperCase()}`}
            />
            <StatCard 
              label="총 발행량" 
              value={coin.total_supply ? coin.total_supply.toLocaleString() : '정보 없음'} 
              icon={<Database size={14} />} 
            />
          </div>

          <div className="mt-8 pt-8 border-t border-slate-900">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="text-green-400" size={16} />
                스테이킹 정보
                <HelpTooltip content="해당 자산의 네트워크 보안에 기여하고 보상을 받을 수 있는 스테이킹 지원 여부와 비율을 확인합니다." />
              </div>
            </div>
            <div className="bg-black rounded-lg border border-slate-900 flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">상태</p>
                <p className={`text-sm font-bold ${staking.is_staking_available ? 'text-green-400' : 'text-slate-400'}`}>
                  {staking.is_staking_available ? '스테이킹 가능' : '지원하지 않음'}
                </p>
              </div>
              {staking.is_staking_available && staking.staking_ratio && (
                <div className="text-right">
                  <p className="text-xs text-slate-500 mb-1">스테이킹 비율</p>
                  <p className="text-lg font-mono font-bold text-blue-400">{staking.staking_ratio.toFixed(2)}%</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top 3 Exchanges */}
        <div className="bg-black rounded-xl border border-slate-900 p-6 shadow-lg">
          <div className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <ExternalLink className="text-purple-400" size={20} />
            TOP 3 EXCHANGE VOLUME
            <HelpTooltip content="해당 코인이 가장 많이 거래되고 있는 상위 3개 거래소입니다." />
          </div>
          <div className="space-y-3">
            {exchanges.slice(0, 3).map((ex, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-black rounded-lg border border-slate-900">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-600">{idx + 1}</span>
                  <span className="text-sm font-bold text-slate-200">{ex.name}</span>
                </div>
                <div className="flex items-center gap-6">
                  <a 
                    href={ex.trade_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-blue-400"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, sub }: { label: string; value: string; icon: React.ReactNode; sub?: string }) => (
  <div className="space-y-1">
    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-1">
      {icon}
      {label}
    </p>
    <p className="text-lg font-mono font-bold text-white">{value}</p>
    {sub && <p className="text-[10px] text-blue-400 font-bold">{sub}</p>}
  </div>
);
