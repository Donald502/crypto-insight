import React, { useState } from 'react';
import { Coin, SectorTop5 } from '../types';
import { TrendingUp, TrendingDown, ChevronRight, Loader2, BarChart3 } from 'lucide-react';
import { HelpTooltip } from './HelpTooltip';

interface SectorRankingsProps {
  sectors: { id: string; name: string }[];
  sectorData: SectorTop5[];
  onSelectCoin: (coin: Coin) => void;
  onSelectSector: (sectorId: string) => void;
  isFetching: boolean;
}

export const SectorRankings: React.FC<SectorRankingsProps> = ({ 
  sectors, 
  sectorData, 
  onSelectCoin, 
  onSelectSector,
  isFetching
}) => {
  const [activeTab, setActiveTab] = useState(0);

  const currentSectorInfo = sectors[activeTab];
  const currentSectorData = sectorData.find(sd => sd.category === currentSectorInfo.name);

  const handleTabClick = (idx: number) => {
    setActiveTab(idx);
    const sector = sectors[idx];
    if (!sectorData.find(sd => sd.category === sector.name)) {
      onSelectSector(sector.id);
    }
  };

  return (
    <div className="bg-black rounded-2xl border border-slate-900 overflow-hidden shadow-2xl">
      <div className="flex flex-col lg:flex-row">
        {/* Sector Tabs */}
        <div className="lg:w-1/3 border-b lg:border-b-0 lg:border-r border-slate-900 bg-black">
          <div className="p-4 border-b border-slate-900 bg-black">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              섹션 카테고리 선택
            </h3>
          </div>
          <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
            {sectors.map((sector, idx) => (
              <button
                key={sector.id}
                onClick={() => handleTabClick(idx)}
                className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300 group mb-1 ${
                  activeTab === idx 
                    ? 'bg-blue-600/10 border border-blue-500/30 text-blue-400 shadow-lg shadow-blue-500/5' 
                    : 'text-slate-400 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black font-mono ${activeTab === idx ? 'text-blue-400' : 'text-slate-600'}`}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className={`text-sm font-bold tracking-tight ${activeTab === idx ? 'text-white' : 'group-hover:text-slate-200'}`}>
                    {sector.name}
                  </span>
                </div>
                {activeTab === idx && <ChevronRight size={14} className="text-blue-400" />}
              </button>
            ))}
          </div>
        </div>

        {/* Sector Content */}
        <div className="lg:w-2/3 p-6 lg:p-8 bg-black min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
                {currentSectorInfo.name}
                <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded uppercase tracking-widest">TOP 5</span>
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">
                  실시간 시장 데이터 기준 랭킹
                </p>
                <HelpTooltip content="24시간 거래량(Volume) 기준 해당 카테고리 내 상위 5개 자산의 실시간 데이터입니다." />
              </div>
            </div>
          </div>

          {!currentSectorData ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
              {isFetching ? (
                <>
                  <Loader2 className="animate-spin text-blue-500" size={32} />
                  <p className="text-sm font-bold animate-pulse">데이터를 불러오는 중입니다...</p>
                </>
              ) : (
                <>
                  <BarChart3 size={32} className="opacity-20" />
                  <p className="text-sm">카테고리를 선택하여 데이터를 확인하세요.</p>
                  <button 
                    onClick={() => onSelectSector(currentSectorInfo.id)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    데이터 불러오기
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {currentSectorData.coins.map((coin, idx) => (
                <button
                  key={coin.id}
                  onClick={() => onSelectCoin(coin)}
                  className="w-full flex items-center justify-between p-4 bg-black hover:bg-slate-900 border border-slate-900 hover:border-blue-500/30 rounded-2xl transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-blue-500 transition-all" />
                  
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <span className="absolute -top-1 -left-1 w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-700 z-10">
                        {idx + 1}
                      </span>
                      <img 
                        src={coin.image} 
                        alt={coin.name} 
                        className="w-10 h-10 rounded-full shadow-lg group-hover:scale-110 transition-transform" 
                        referrerPolicy="no-referrer" 
                      />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-black text-slate-100 group-hover:text-blue-400 transition-colors">
                          {coin.symbol.toUpperCase()}
                        </p>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded uppercase">
                          #{coin.market_cap_rank}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-500 font-medium">{coin.name}</p>
                        <span className="text-[9px] text-slate-600 font-mono">Vol: ${(coin.total_volume / 1e6).toFixed(1)}M</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-mono font-black text-slate-100">${coin.current_price.toLocaleString()}</p>
                    <div className={`flex items-center justify-end gap-1.5 text-xs font-bold ${coin.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {coin.price_change_percentage_24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
