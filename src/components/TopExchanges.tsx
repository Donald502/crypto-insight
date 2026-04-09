import React from 'react';
import { GlobalExchange } from '../types';
import { Award, BarChart3 } from 'lucide-react';
import { HelpTooltip } from './HelpTooltip';

interface TopExchangesProps {
  exchanges: GlobalExchange[];
}

export const TopExchanges: React.FC<TopExchangesProps> = ({ exchanges }) => {
  return (
    <div className="bg-black rounded-xl border border-slate-900 p-6 shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Award className="text-yellow-400" size={24} />
          <div>
            <div className="flex items-center">
              <div className="text-lg font-black text-white uppercase tracking-tight">TOP 5 EXCHANGE VOLUME</div>
              <HelpTooltip 
                mode="click"
                content="BTC 환산 거래량 기준 상위 5개 글로벌 거래소의 24시간 거래량 랭킹입니다. 거래소의 신뢰도 점수(SCORE)와 함께 실시간 거래 규모를 확인할 수 있습니다." 
              />
            </div>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">
              24시간 거래량 기준 랭킹
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {exchanges.map((ex, idx) => (
          <div key={ex.id} className="bg-black rounded-xl p-4 border border-slate-900 hover:border-blue-500/30 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">RANK #{idx + 1}</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-green-400">SCORE</span>
                <span className="text-xs font-mono font-bold text-white">{ex.trust_score}</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center text-center gap-3">
              <img src={ex.image} alt={ex.name} className="w-10 h-10 rounded-lg shadow-lg group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
              <div>
                <p className="text-sm font-black text-white truncate w-full">{ex.name}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <BarChart3 size={10} className="text-slate-500" />
                  <p className="text-[10px] font-mono text-slate-400">{ex.trade_volume_24h_btc.toFixed(2)} BTC</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
