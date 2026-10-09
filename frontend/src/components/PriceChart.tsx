import { useEffect, useRef } from "react";
import { AreaSeries, ColorType, createChart } from "lightweight-charts";

import type { Candle } from "../api/types";

interface PriceChartProps {
  candles: Candle[];
  height?: number;
}

/** lightweight-charts alan grafiği — kırmızı çizgi, siyah zemin, keskin grid. */
export default function PriceChart({ candles, height = 320 }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || candles.length === 0) return;

    const chart = createChart(el, {
      autoSize: true, // genişliği/yüksekliği kendisi izler — manuel RO yarışı olmaz
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#121212" },
        textColor: "#8f8f8f",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "#1e1e1e" },
        horzLines: { color: "#1e1e1e" },
      },
      rightPriceScale: { borderColor: "#272727" },
      timeScale: { borderColor: "#272727", rightOffset: 3 },
      localization: {
        locale: "tr-TR",
        priceFormatter: (p: number) =>
          p.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      },
      crosshair: {
        vertLine: { color: "#e10600", labelBackgroundColor: "#e10600" },
        horzLine: { color: "#e10600", labelBackgroundColor: "#e10600" },
      },
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: "#e10600",
      topColor: "rgba(225, 6, 0, 0.30)",
      bottomColor: "rgba(225, 6, 0, 0.02)",
      lineWidth: 2,
      priceLineColor: "#e10600",
    });

    const data = candles
      .filter((c) => c.close !== null && c.close !== undefined)
      .map((c) => ({ time: String(c.date).slice(0, 10), value: c.close as number }))
      // aynı güne ait birden çok mum (intraday) varsa günün kapanışını al
      .filter((v, i, arr) => i === 0 || v.time !== arr[i - 1].time)
      .sort((a, b) => a.time.localeCompare(b.time));

    series.setData(data);
    chart.timeScale().fitContent();
    // autoSize ilk ölçümünü yaptıktan sonra bir kez daha oturt
    const settle = setTimeout(() => chart.timeScale().fitContent(), 120);

    return () => {
      clearTimeout(settle);
      chart.remove();
    };
  }, [candles, height]);

  if (candles.length === 0) {
    return (
      <div className="flex items-center justify-center border border-line bg-panel text-sm text-muted" style={{ height }}>
        Grafik verisi yok
      </div>
    );
  }
  return (
    <div>
      <div ref={containerRef} className="border border-line bg-panel" style={{ height }} />
      <p className="mt-1 text-right font-mono text-[9px] uppercase tracking-widest text-faint">
        grafik: TradingView lightweight-charts
      </p>
    </div>
  );
}
