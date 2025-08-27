'use client';

import { useMemo, useCallback, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
  Brush,
} from 'recharts';
import { Exchange, getFeeAtVolume, getCumulativeFeesAtVolume } from '@/lib/data-validation';
import { formatVolume, formatFee, formatCumulativeFees, generateTicks, generateBpsTicks } from '@/lib/chart-utils';

interface FeeChartProps {
  exchanges: Exchange[];
  feeType: 'maker' | 'taker';
  volumeDomain: [number, number];
  feeDomain: [number, number];
  isLogScale: boolean;
  hoverVolume: number | null;
  onHoverChange: (volume: number | null) => void;
  colors: Record<string, string>;
}

export default function FeeChart({
  exchanges,
  feeType,
  volumeDomain,
  feeDomain,
  isLogScale,
  hoverVolume,
  onHoverChange,
  colors,
}: FeeChartProps) {
  const [brushDomain, setBrushDomain] = useState<[number, number] | null>(null);
  const [isMouseInChart, setIsMouseInChart] = useState(false);

  // Generate chart data with step points
  const { chartData, stepMarkers } = useMemo(() => {
    // Generate optimized data points - fewer points for better performance
    const minVolume = volumeDomain[0];
    const maxVolume = volumeDomain[1];
    const range = maxVolume - minVolume;
    
    // Adaptive tick interval based on range
    let tickInterval: number;
    if (range <= 30000000) { // <= 30M
      tickInterval = 1000000; // 1M intervals for smooth hovering
    } else if (range <= 50000000) { // <= 50M
      tickInterval = 2000000; // 2M intervals
    } else if (range <= 200000000) { // <= 200M
      tickInterval = 5000000; // 5M intervals
    } else if (range <= 1000000000) { // <= 1B
      tickInterval = 10000000; // 10M intervals
    } else {
      tickInterval = 20000000; // 20M intervals
    }
    
    // Calculate number of ticks based on range and interval
    const numTicks = Math.ceil(range / tickInterval);
    
    const data: Array<{ volume: number; [key: string]: number }> = [];
    
    // Always include step boundary points for accuracy
    const stepVolumes = new Set<number>();
    const stepBoundaries = new Set<string>(); // Track which points are step boundaries
    exchanges.forEach(exchange => {
      const makerSchedule = exchange.maker_fees;
      const takerSchedule = exchange.taker_fees;
      [...makerSchedule, ...takerSchedule].forEach(point => {
        if (point.volume >= minVolume && point.volume <= maxVolume) {
          stepVolumes.add(point.volume);
          stepBoundaries.add(`${point.volume}-${exchange.exchange}`);
        }
      });
    });
    
    // Generate regular tick points
    const regularTicks = new Set<number>();
    
    // Always start with $0 and ensure we cover the full domain
    const allVolumes = new Set<number>([0]);
    
    // Add the minimum volume if it's not 0
    if (minVolume > 0) {
      allVolumes.add(minVolume);
    }
    
    // Generate regular tick points
    for (let i = 0; i <= numTicks; i++) {
      const volume = minVolume + (i * tickInterval);
      if (volume > maxVolume) break;
      allVolumes.add(volume);
    }
    
    // Always include the maximum volume to ensure lines extend to the edge
    allVolumes.add(maxVolume);
    
    // Add a small buffer beyond max volume for better line extension
    const bufferVolume = maxVolume + (maxVolume * 0.05); // 5% buffer for better line extension
    allVolumes.add(bufferVolume);
    
    // Add an even larger buffer to ensure lines extend fully
    const extendedVolume = maxVolume + (maxVolume * 0.1); // 10% extended buffer
    allVolumes.add(extendedVolume);
    
    // Add step volumes
    stepVolumes.forEach(vol => allVolumes.add(vol));
    
    // Convert to sorted array
    const sortedVolumes = Array.from(allVolumes).sort((a, b) => a - b);
    
    // Generate data points
    sortedVolumes.forEach(volume => {
      const dataPoint: { volume: number; [key: string]: number } = { volume };
      
      exchanges.forEach(exchange => {
        const feeSchedule = feeType === 'maker' ? exchange.maker_fees : exchange.taker_fees;
        
        // For volumes beyond the last fee tier, use the last fee value
        // This ensures lines extend to the full chart width
        let fee = getFeeAtVolume(feeSchedule, volume);
        
        // If no fee found, use the last tier's fee to ensure line continuity
        if (fee === null && feeSchedule.length > 0) {
          const lastTier = feeSchedule[feeSchedule.length - 1];
          fee = lastTier.fee;
        }
        
        // If still no fee (edge case), use 0 as fallback
        if (fee === null) {
          fee = 0;
        }
        
        dataPoint[exchange.exchange] = fee;
        
        // Mark if this is a step boundary for this exchange
        if (stepBoundaries.has(`${volume}-${exchange.exchange}`)) {
          dataPoint[`${exchange.exchange}_isStep`] = 1;
        }
      });
      
      data.push(dataPoint);
    });
    
    return { chartData: data, stepMarkers: [] };
  }, [exchanges, feeType, volumeDomain]);

  const majorTicks = generateTicks(volumeDomain[0], volumeDomain[1], isLogScale);
  const bpsTicks = generateBpsTicks(feeDomain[0], feeDomain[1]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    // Sort payload by fee value (lowest to highest)
    const sortedPayload = [...payload].sort((a, b) => a.value - b.value);



    return (
      <div className="bg-white border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium mb-2">Volume: {formatVolume(label)}</p>
        {sortedPayload.map((entry: any, index: number) => {
          // Find the exchange data to calculate cumulative fees
          const exchange = exchanges.find(e => e.exchange === entry.dataKey);
          const feeSchedule = exchange ? (feeType === 'maker' ? exchange.maker_fees : exchange.taker_fees) : [];
          

          
          const cumulativeFees = getCumulativeFeesAtVolume(feeSchedule, label);
          
          return (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="font-medium">{entry.dataKey}:</span>
              <span>{formatFee(entry.value)}</span>
              <span className="text-gray-500 text-xs">
                ({formatCumulativeFees(cumulativeFees)})
              </span>
              {entry.value < 0 && (
                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-medium">
                  Rebate
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Custom dot component that only shows dots at step boundaries
  const CustomDot = (props: any) => {
    const { cx, cy, payload, dataKey } = props;
    if (!payload || !payload[`${dataKey}_isStep`]) {
      return null;
    }
    
    return (
      <circle
        cx={cx}
        cy={cy}
        r={3}
        fill={colors[dataKey] || '#6b7280'}
        stroke="#ffffff"
        strokeWidth={1}
      />
    );
  };

  const handleMouseMove = useCallback((data: any) => {
    setIsMouseInChart(true);
    if (data && data.activeLabel !== undefined) {
      const volume = data.activeLabel;
      // Use the original volume domain for snapping, not the brush domain
      const originalMaxVolume = volumeDomain[1];
      // For volumes under $30M in the original domain, snap to 1M increments
      if (originalMaxVolume <= 30000000 && volume < 30000000) {
        onHoverChange(Math.round(volume / 500000) * 500000);
      } else {
        onHoverChange(volume);
      }
    }
  }, [onHoverChange]);

  const handleMouseLeave = useCallback(() => {
    setIsMouseInChart(false);
    onHoverChange(null);
  }, [onHoverChange]);

  const handleBrushChange = useCallback((brushData: any) => {
    if (brushData && brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
      const startVolume = chartData[brushData.startIndex]?.volume;
      const endVolume = chartData[brushData.endIndex]?.volume;
      if (startVolume !== undefined && endVolume !== undefined) {
        setBrushDomain([startVolume, endVolume]);
      }
    } else {
      setBrushDomain(null);
    }
  }, [chartData]);

  // Use brush domain if available, otherwise use the full volume domain
  const activeDomain = brushDomain || volumeDomain;
  const dynamicTicks = useMemo(() => {
    return generateTicks(activeDomain[0], activeDomain[1], isLogScale);
  }, [activeDomain, isLogScale]);

  return (
    <div className="h-[600px] w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 30, bottom: 100 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          
          <XAxis
            dataKey="volume"
            scale={isLogScale ? 'log' : 'linear'}
            domain={isLogScale ? [1, activeDomain[1]] : [0, activeDomain[1]]}
            ticks={dynamicTicks}
            tickFormatter={formatVolume}
            stroke="#6b7280"
            fontSize={12}
            orientation="bottom"
            axisLine={false}
            tickLine={{ stroke: '#6b7280' }}
            type="number"
            padding={{ left: 0, right: 0 }}
          />
          
          <YAxis
            domain={feeDomain}
            ticks={bpsTicks}
            tickFormatter={formatFee}
            stroke="#6b7280"
            fontSize={12}
            axisLine={{ stroke: '#374151', strokeWidth: 2 }}
            tickLine={{ stroke: '#6b7280', strokeWidth: 1 }}
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Zero baseline with enhanced visibility */}
          <ReferenceLine y={0} stroke="#374151" strokeWidth={2} />
          
          {/* Add tick marks at zero line */}
          <ReferenceLine 
            y={0} 
            stroke="#374151" 
            strokeWidth={2}
            strokeDasharray="0"
          />
          
          {/* Tick marks at zero line */}
          <g>
            {/* Left tick mark */}
            <line
              x1={30}
              y1={0}
              x2={40}
              y2={0}
              stroke="#374151"
              strokeWidth={2}
              transform="translate(0, 0)"
            />
            {/* Right tick mark */}
            <line
              x1={-10}
              y1={0}
              x2={0}
              y2={0}
              stroke="#374151"
              strokeWidth={2}
              transform="translate(0, 0)"
            />
          </g>
          
          {/* Hover crosshair */}
          {hoverVolume && (
            <ReferenceLine x={hoverVolume} stroke="#ef4444" strokeWidth={1} />
          )}
          
          {/* Exchange lines */}
          {exchanges.map(exchange => (
            <Line
              key={exchange.exchange}
              type="stepAfter"
              dataKey={exchange.exchange}
              stroke={colors[exchange.exchange] || '#6b7280'}
              strokeWidth={exchange.exchange === 'Nado' && isMouseInChart ? 4 : exchange.exchange === 'Nado' ? 3 : 2}
              strokeDasharray={exchange.exchange === 'Nado' && isMouseInChart ? '8 4' : undefined}
              filter={exchange.exchange === 'Nado' && isMouseInChart ? 'url(#glow)' : undefined}
              dot={<CustomDot />}
              connectNulls={true}
              isAnimationActive={false}
            />
          ))}
          
          {/* SVG filter for glow effect */}
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Range selector brush - positioned at bottom */}
          <Brush
            dataKey="volume"
            height={35}
            stroke="#3b82f6"
            fill="#eff6ff"
            tickFormatter={formatVolume}
            y={520}
            onChange={handleBrushChange}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}