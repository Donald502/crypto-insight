import React, { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  Cell,
} from 'recharts';
import { format, startOfHour, startOfDay, startOfMonth, addHours, addDays, addMonths, isBefore } from 'date-fns';
import { BarChart3 } from 'lucide-react';
import { OHLCData } from '../types';

interface ChartProps {
  data: OHLCData[];
  symbol: string;
  interval: string;
  exchangeRate?: number;
}

const CustomTooltip = ({ active, payload, label, exchangeRate }: any) => {
  if (active && payload && payload.length) {
    const closePrice = payload.find((p: any) => p.dataKey === 'close')?.value;
    const krwPrice = closePrice && exchangeRate ? closePrice * exchangeRate : null;

    return (
      <div className="bg-slate-900/90 border border-slate-700 p-3 rounded-lg shadow-xl backdrop-blur-sm text-xs min-w-[180px]">
        <p className="text-slate-400 mb-2 border-b border-slate-800 pb-1">{format(label, 'yyyy-MM-dd HH:mm')}</p>
        <div className="space-y-1.5">
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">가격 (USD):</span>
              <span className="text-white font-mono font-bold">${closePrice?.toLocaleString()}</span>
            </div>
            {krwPrice && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">가격 (KRW):</span>
                <span className="text-blue-400 font-mono font-bold">₩{Math.round(krwPrice).toLocaleString()}</span>
              </div>
            )}
          </div>
          {payload.find((p: any) => p.dataKey === 'volume') && (
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">거래량:</span>
              <span className="text-slate-300 font-mono">{payload.find((p: any) => p.dataKey === 'volume').value.toLocaleString()}</span>
            </div>
          )}
          {payload.find((p: any) => p.dataKey === 'macd') && (
            <div className="pt-1 border-t border-slate-800 mt-1">
              <div className="flex justify-between gap-4">
                <span className="text-blue-400">MACD:</span>
                <span className="text-blue-300 font-mono">{payload.find((p: any) => p.dataKey === 'macd').value.toFixed(4)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-yellow-400">Signal:</span>
                <span className="text-yellow-300 font-mono">{payload.find((p: any) => p.dataKey === 'signal').value.toFixed(4)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const CryptoChart: React.FC<ChartProps> = ({ data, symbol, interval, exchangeRate }) => {
  const minPrice = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.min(...data.map(d => d.low)) * 0.998;
  }, [data]);
  
  const maxPrice = useMemo(() => {
    if (data.length === 0) return 100;
    return Math.max(...data.map(d => d.high)) * 1.002;
  }, [data]);

  const maxVolume = useMemo(() => {
    if (data.length === 0) return 100;
    return Math.max(...data.map(d => d.volume || 0));
  }, [data]);

  const maxMacd = useMemo(() => {
    if (data.length === 0) return 1;
    const values = data.flatMap(d => [d.macd || 0, d.signal || 0, d.histogram || 0]);
    return Math.max(...values.map(Math.abs)) * 1.1;
  }, [data]);

  // Generate ticks based on actual data points to ensure perfect alignment
  const ticks = useMemo(() => {
    if (data.length < 2) return [];
    
    // Extract exact timestamps from the data
    const result = data.map(d => d.time);

    // Limit ticks to avoid cluttering the X-axis grid (max ~12 lines)
    if (result.length > 12) {
      const filtered = [];
      const skip = Math.ceil(result.length / 12);
      for (let i = 0; i < result.length; i += skip) {
        filtered.push(result[i]);
      }
      // Ensure the very last tick is included
      if (filtered[filtered.length - 1] !== result[result.length - 1]) {
        filtered.push(result[result.length - 1]);
      }
      return filtered;
    }

    return result;
  }, [data]);

  const xTickFormatter = (time: number) => {
    const date = new Date(time);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    return `${hours}:00`;
  };

  if (data.length === 0) {
    return (
      <div className="w-full h-[600px] bg-black rounded-xl p-4 border border-slate-900 flex flex-col items-center justify-center gap-4">
        <BarChart3 className="text-slate-800" size={48} />
        <div className="text-center">
          <p className="text-slate-400 font-bold">차트 데이터를 불러올 수 없습니다.</p>
          <p className="text-slate-600 text-xs mt-1">주요 거래소(Binance, Bybit, OKX 등)에 해당 코인이 상장되어 있지 않거나,<br/>네트워크 연결에 문제가 있을 수 있습니다.</p>
        </div>
      </div>
    );
  }

  const commonXAxisProps = {
    dataKey: "time",
    type: "number" as const,
    domain: [Math.min(...data.map(d => d.time)), Math.max(...data.map(d => d.time))] as [number, number],
    ticks: ticks,
    tickFormatter: () => '', // Remove time labels as requested
    stroke: "var(--chart-axis)",
    fontSize: 10,
    tickLine: false,
    axisLine: false,
    hide: true, // Hidden by default
  };

  return (
    <div className="w-full h-[700px] bg-black rounded-xl p-4 border border-slate-900 flex flex-col gap-2">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-4">
          <h3 className="text-slate-200 font-bold flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {symbol} / USDT 실시간 분석
          </h3>
          <div className="flex gap-2">
            <span className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-bold">
              {interval}
            </span>
            <span className="text-[10px] bg-slate-900 text-slate-500 px-2 py-0.5 rounded border border-slate-800 font-bold uppercase">
              {interval === '15m' ? '3-Day Analysis' : 'Historical View'}
            </span>
          </div>
        </div>
        <div className="flex gap-4 text-[10px] uppercase tracking-wider font-bold">
          <span className="text-blue-400">BB Upper</span>
          <span className="text-purple-400">BB Lower</span>
          <span className="text-[var(--chart-price-line)] drop-shadow-sm">Price</span>
        </div>
      </div>
      
      {/* Price Chart (50%) */}
      <div className="flex-[5] min-h-0 relative">
        <div className="absolute top-2 left-2 z-10 text-[10px] font-bold text-[var(--chart-label)] uppercase tracking-widest">Price & Bollinger Bands</div>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-price-line)" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="var(--chart-price-line)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="bbArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.05}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={true} />
            <XAxis {...commonXAxisProps} />
            <YAxis 
              domain={[minPrice, maxPrice]}
              orientation="right"
              stroke="var(--chart-axis)"
              fontSize={10}
              tickFormatter={(val) => {
                const usd = `$${val.toLocaleString()}`;
                if (exchangeRate) {
                  const krw = `₩${(val * exchangeRate / 1000).toFixed(0)}k`;
                  return `${usd} (${krw})`;
                }
                return usd;
              }}
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <Tooltip content={<CustomTooltip exchangeRate={exchangeRate} />} />
            <Area type="monotone" dataKey={['lowerBand', 'upperBand'] as any} stroke="none" fill="url(#bbArea)" connectNulls={true} />
            <Line type="monotone" dataKey="upperBand" stroke="#3b82f6" strokeWidth={1} dot={false} strokeDasharray="3 3" connectNulls={true} />
            <Line type="monotone" dataKey="middleBand" stroke="#475569" strokeWidth={1} dot={false} connectNulls={true} />
            <Line type="monotone" dataKey="lowerBand" stroke="#8b5cf6" strokeWidth={1} dot={false} strokeDasharray="3 3" connectNulls={true} />
            <Area type="monotone" dataKey="close" stroke="var(--chart-price-line)" strokeWidth={2.5} fill="url(#colorPrice)" dot={false} connectNulls={true} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Volume Chart (20%) */}
      <div className="flex-[2] min-h-0 relative border-t border-slate-900 pt-2">
        <div className="absolute top-2 left-2 z-10 text-[10px] font-bold text-[var(--chart-label)] uppercase tracking-widest">Volume</div>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={true} />
            <XAxis {...commonXAxisProps} />
            <YAxis 
              domain={[0, maxVolume]}
              orientation="right"
              stroke="var(--chart-axis)"
              fontSize={10}
              tickFormatter={(val) => val > 1000 ? `${(val/1000).toFixed(1)}k` : val.toString()}
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <Tooltip content={<CustomTooltip exchangeRate={exchangeRate} />} />
            <Bar dataKey="volume">
              {data.map((entry, index) => (
                <Cell 
                  key={`vol-cell-${index}`} 
                  fill={index > 0 && entry.close >= data[index-1].close ? '#10b981' : '#ef4444'} 
                  opacity={0.4}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* MACD Chart (25%) */}
      <div className="flex-[2.5] min-h-0 relative border-t border-slate-900 pt-2">
        <div className="absolute top-2 left-2 z-10 text-[10px] font-bold text-[var(--chart-label)] uppercase tracking-widest">MACD (12, 26, 9)</div>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={true} />
            <XAxis 
              {...commonXAxisProps} 
              hide={false} 
              label={{ value: `Time (UTC) | ${interval} Intervals`, position: 'insideBottom', offset: -5, fill: 'var(--chart-label)', fontSize: 10 }}
            />
            <YAxis 
              domain={[-maxMacd, maxMacd]}
              orientation="right"
              stroke="var(--chart-axis)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <Tooltip content={<CustomTooltip exchangeRate={exchangeRate} />} />
            <Bar dataKey="histogram">
              {data.map((entry, index) => (
                <Cell 
                  key={`macd-hist-${index}`} 
                  fill={(entry.histogram || 0) >= 0 ? '#10b981' : '#ef4444'} 
                  opacity={0.5}
                />
              ))}
            </Bar>
            <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={1.5} dot={false} connectNulls={true} />
            <Line type="monotone" dataKey="signal" stroke="#eab308" strokeWidth={1.5} dot={false} connectNulls={true} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
