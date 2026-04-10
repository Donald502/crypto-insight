import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import { BarChart3 } from 'lucide-react';
import { OHLCData } from '../types';

interface ChartProps {
  data: OHLCData[];
  symbol: string;
  interval: string;
  exchangeRate?: number;
}

export const CryptoChart: React.FC<ChartProps> = ({ data, symbol, interval, exchangeRate }) => {
  const priceRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const macdRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!priceRef.current || !volumeRef.current || !macdRef.current || data.length === 0) return;

    const commonOptions = {
      layout: { background: { type: ColorType.Solid, color: '#000000' }, textColor: '#475569' },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#1e293b' },
      timeScale: { borderColor: '#1e293b', timeVisible: true, secondsVisible: false },
    };

    // 가격 차트
    const priceChart = createChart(priceRef.current, {
      ...commonOptions,
      width: priceRef.current.clientWidth,
      height: priceRef.current.clientHeight,
    });

    const candleSeries = priceChart.addSeries({
      seriesType: 'Candlestick',
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    } as any);

    const upperBandSeries = priceChart.addSeries({ seriesType: 'Line', color: '#3b82f6', lineWidth: 1, lineStyle: 2, priceLineVisible: false } as any);
    const middleBandSeries = priceChart.addSeries({ seriesType: 'Line', color: '#475569', lineWidth: 1, priceLineVisible: false } as any);
    const lowerBandSeries = priceChart.addSeries({ seriesType: 'Line', color: '#8b5cf6', lineWidth: 1, lineStyle: 2, priceLineVisible: false } as any);

    const candleData = data.map(d => ({ time: Math.floor(d.time / 1000) as any, open: d.open, high: d.high, low: d.low, close: d.close }));
    const upperData = data.filter(d => d.upperBand).map(d => ({ time: Math.floor(d.time / 1000) as any, value: d.upperBand! }));
    const middleData = data.filter(d => d.middleBand).map(d => ({ time: Math.floor(d.time / 1000) as any, value: d.middleBand! }));
    const lowerData = data.filter(d => d.lowerBand).map(d => ({ time: Math.floor(d.time / 1000) as any, value: d.lowerBand! }));

    candleSeries.setData(candleData);
    upperBandSeries.setData(upperData);
    middleBandSeries.setData(middleData);
    lowerBandSeries.setData(lowerData);
    priceChart.timeScale().fitContent();

    // 거래량 차트
    const volumeChart = createChart(volumeRef.current, {
      ...commonOptions,
      width: volumeRef.current.clientWidth,
      height: volumeRef.current.clientHeight,
    });

    const volumeSeries = volumeChart.addSeries({ seriesType: 'Histogram', priceFormat: { type: 'volume' }, priceScaleId: '' } as any);
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0 } });

    const volumeData = data.map((d, i) => ({
      time: Math.floor(d.time / 1000) as any,
      value: d.volume || 0,
      color: i > 0 && d.close >= data[i - 1].close ? '#10b98166' : '#ef444466',
    }));
    volumeSeries.setData(volumeData);
    volumeChart.timeScale().fitContent();

    // MACD 차트
    const macdChart = createChart(macdRef.current, {
      ...commonOptions,
      width: macdRef.current.clientWidth,
      height: macdRef.current.clientHeight,
    });

    const histogramSeries = macdChart.addSeries({ seriesType: 'Histogram', priceScaleId: 'right' } as any);
    const macdLineSeries = macdChart.addSeries({ seriesType: 'Line', color: '#3b82f6', lineWidth: 1, priceLineVisible: false } as any);
    const signalLineSeries = macdChart.addSeries({ seriesType: 'Line', color: '#eab308', lineWidth: 1, priceLineVisible: false } as any);

    const histData = data.filter(d => d.histogram !== undefined).map(d => ({
      time: Math.floor(d.time / 1000) as any,
      value: d.histogram!,
      color: (d.histogram || 0) >= 0 ? '#10b98180' : '#ef444480',
    }));
    const macdData = data.filter(d => d.macd !== undefined).map(d => ({ time: Math.floor(d.time / 1000) as any, value: d.macd! }));
    const signalData = data.filter(d => d.signal !== undefined).map(d => ({ time: Math.floor(d.time / 1000) as any, value: d.signal! }));

    histogramSeries.setData(histData);
    macdLineSeries.setData(macdData);
    signalLineSeries.setData(signalData);
    macdChart.timeScale().fitContent();

    // 시간축 동기화
    priceChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (range) {
        volumeChart.timeScale().setVisibleLogicalRange(range);
        macdChart.timeScale().setVisibleLogicalRange(range);
      }
    });
    volumeChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (range) {
        priceChart.timeScale().setVisibleLogicalRange(range);
        macdChart.timeScale().setVisibleLogicalRange(range);
      }
    });
    macdChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (range) {
        priceChart.timeScale().setVisibleLogicalRange(range);
        volumeChart.timeScale().setVisibleLogicalRange(range);
      }
    });

    // 리사이즈
    const handleResize = () => {
      if (priceRef.current) priceChart.applyOptions({ width: priceRef.current.clientWidth });
      if (volumeRef.current) volumeChart.applyOptions({ width: volumeRef.current.clientWidth });
      if (macdRef.current) macdChart.applyOptions({ width: macdRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      priceChart.remove();
      volumeChart.remove();
      macdChart.remove();
    };
  }, [data, exchangeRate]);

  if (data.length === 0) {
    return (
      <div className="w-full h-[600px] bg-black rounded-xl p-4 border border-slate-900 flex flex-col items-center justify-center gap-4">
        <BarChart3 className="text-slate-800" size={48} />
        <div className="text-center">
          <p className="text-slate-400 font-bold">차트 데이터를 불러올 수 없습니다.</p>
          <p className="text-slate-600 text-xs mt-1">주요 거래소에 해당 코인이 상장되어 있지 않거나,<br/>네트워크 연결에 문제가 있을 수 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-black rounded-xl border border-slate-900 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-900">
        <div className="flex items-center gap-3">
          <h3 className="text-slate-200 font-bold flex items-center gap-2 text-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {symbol} / USDT 실시간 분석
          </h3>
          <span className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-bold">{interval}</span>
        </div>
        <div className="flex gap-4 text-[10px] uppercase tracking-wider font-bold">
          <span className="text-blue-400">BB Upper</span>
          <span className="text-slate-500">BB Mid</span>
          <span className="text-purple-400">BB Lower</span>
          <span className="text-green-400">상승</span>
          <span className="text-red-400">하락</span>
        </div>
      </div>

      <div className="px-1 pt-1">
        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-2 pt-1">Price & Bollinger Bands</div>
        <div ref={priceRef} style={{ height: '380px', width: '100%' }} />
      </div>

      <div className="px-1 border-t border-slate-900">
        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-2 pt-1">Volume</div>
        <div ref={volumeRef} style={{ height: '120px', width: '100%' }} />
      </div>

      <div className="px-1 border-t border-slate-900">
        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-2 pt-1">MACD (12, 26, 9)</div>
        <div ref={macdRef} style={{ height: '150px', width: '100%' }} />
      </div>
    </div>
  );
};
