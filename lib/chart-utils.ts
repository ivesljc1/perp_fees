export function formatVolume(volume: number): string {
  // Volume is stored in millions format (e.g., 5 = $5M)
  if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(1)}B`;
  } else if (volume >= 1) {
    return `$${volume.toFixed(1)}M`;
  } else {
    return `$${(volume * 1000).toFixed(0)}K`;
  }
}

export function formatFee(fee: number): string {
  return `${fee >= 0 ? '+' : ''}${fee.toFixed(1)}bps`;
}

export function formatCumulativeFees(fees: number): string {
  // Format as full dollar amount with commas and 0 decimal places
  return `$${fees.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
}

export function generateTicks(min: number, max: number, isLog: boolean): number[] {
  if (isLog) {
    // For log scale, generate powers of 10
    const minLog = Math.floor(Math.log10(Math.max(1, 1)));
    const maxLog = Math.ceil(Math.log10(max));
    const ticks: number[] = [];
    
    for (let i = minLog; i <= maxLog; i++) {
      const base = Math.pow(10, i);
      ticks.push(base);
      if (base * 5 <= max) ticks.push(base * 5);
    }
    
    return ticks.filter(tick => tick >= 1 && tick <= max);
  } else {
    // For linear scale, generate clean ticks in millions format
    const range = max - min;
    let tickInterval: number;
    
    // Use clean intervals based on range (values are in millions)
    if (range <= 20) { // <= $20M
      tickInterval = 5; // $5M intervals
    } else if (range <= 100) { // <= $100M
      tickInterval = 10; // $10M intervals
    } else if (range <= 500) { // <= $500M
      tickInterval = 50; // $50M intervals
    } else if (range <= 2000) { // <= $2B
      tickInterval = 100; // $100M intervals
    } else if (range <= 5000) { // <= $5B
      tickInterval = 500; // $500M intervals
    } else {
      tickInterval = 1000; // $1B intervals
    }
    
    // Start from 0 or first clean interval
    const startTick = Math.max(0, Math.floor(min / tickInterval) * tickInterval);
    const endTick = Math.ceil(max / tickInterval) * tickInterval;
    
    const ticks: number[] = [];
    for (let tick = startTick; tick <= endTick; tick += tickInterval) {
      if (tick >= min && tick <= max) {
        ticks.push(tick);
      }
    }
    
    // Ensure we always have at least a few ticks
    if (ticks.length < 3) {
      const smallerInterval = tickInterval / 2;
      const newTicks: number[] = [];
      for (let tick = startTick; tick <= endTick; tick += smallerInterval) {
        if (tick >= min && tick <= max) {
          newTicks.push(tick);
        }
      }
      return newTicks;
    }
    
    return ticks;
  }
}

export function generateBpsTicks(min: number, max: number): number[] {
  // Generate ticks every 1 basis point
  const minTick = Math.floor(min);
  const maxTick = Math.ceil(max);
  
  const ticks: number[] = [];
  for (let tick = minTick; tick <= maxTick; tick += 1) {
    ticks.push(tick);
  }
  
  return ticks;
}
export function snapToMillionTick(volume: number): number {
  // Don't snap - return the exact volume for precise alignment
  return Math.round(volume);
}

export function createStepData(
  feeSchedule: { volume: number; fee: number }[],
  maxVolume: number
): { volume: number; fee: number }[] {
  const stepData: { volume: number; fee: number }[] = [];
  
  for (let i = 0; i < feeSchedule.length; i++) {
    const current = feeSchedule[i];
    const next = feeSchedule[i + 1];
    
    // Add the step start point
    stepData.push({ volume: current.volume, fee: current.fee });
    
    // Add the step end point (right before next volume)
    if (next) {
      stepData.push({ volume: next.volume - 1, fee: current.fee });
    } else {
      // Last step extends to max volume
      stepData.push({ volume: maxVolume, fee: current.fee });
    }
  }
  
  return stepData;
}

export const EXCHANGE_COLORS = {
  'Binance': '#F0B90B',
  'Bybit': '#F7931A',
  'Kraken': '#5C4B99',
  'OKX': '#0066CC',
  'Coinbase': '#0052FF',
  'Hyperliquid': '#00D2FF',
  'EdgeX': '#FF6B35',
  'Jupiter': '#C147E9',
  'Drift': '#9945FF',
  'ApeX Protocol': '#00FFB3',
  'Aster': '#FF4081',
  'GMX': '#4DABF7',
  'Vertex': '#7C3AED',
  'ParaDex': '#10B981',
  'Nado': '#FF1744',
} as const;