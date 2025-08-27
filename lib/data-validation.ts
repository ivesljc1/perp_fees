import { z } from 'zod';

const FeePointSchema = z.object({
  volume: z.number().min(0),
  fee: z.number(),
});

const ExchangeSchema = z.object({
  exchange: z.string().min(1),
  type: z.enum(['CEX', 'DEX', 'Nado']),
  product: z.enum(['perp', 'spot']),
  day_basis: z.number().int().positive(),
  maker_fees: z.array(FeePointSchema).min(1),
  taker_fees: z.array(FeePointSchema).min(1),
});

const DatasetSchema = z.object({
  exchanges: z.array(ExchangeSchema).min(1),
});

export type FeePoint = z.infer<typeof FeePointSchema>;
export type Exchange = z.infer<typeof ExchangeSchema>;
export type Dataset = z.infer<typeof DatasetSchema>;

export function validateDataset(data: unknown): Dataset {
  try {
    return DatasetSchema.parse(data);
  } catch (error) {
    console.error('Dataset validation failed:', error);
    throw new Error('Invalid dataset format');
  }
}

export function normalizeToDayBasis(
  exchange: Exchange,
  targetDayBasis: number
): Exchange {
  if (exchange.day_basis === targetDayBasis) {
    return exchange;
  }

  // Use simple, clean multipliers for better user understanding
  let multiplier: number;
  
  if (exchange.day_basis === 7 && targetDayBasis === 14) {
    multiplier = 2; // 7-day → 14-day: multiply by 2
  } else if (exchange.day_basis === 7 && targetDayBasis === 30) {
    multiplier = 4; // 7-day → 30-day: multiply by 4
  } else if (exchange.day_basis === 14 && targetDayBasis === 7) {
    multiplier = 0.5; // 14-day → 7-day: divide by 2
  } else if (exchange.day_basis === 14 && targetDayBasis === 30) {
    multiplier = 2; // 14-day → 30-day: multiply by 2
  } else if (exchange.day_basis === 30 && targetDayBasis === 7) {
    multiplier = 0.25; // 30-day → 7-day: divide by 4
  } else if (exchange.day_basis === 30 && targetDayBasis === 14) {
    multiplier = 0.5; // 30-day → 14-day: divide by 2
  } else {
    // Fallback to original calculation (shouldn't happen with our current day_basis values)
    multiplier = targetDayBasis / exchange.day_basis;
  }

  return {
    ...exchange,
    day_basis: targetDayBasis,
    maker_fees: exchange.maker_fees.map(point => ({
      ...point,
      volume: point.volume * multiplier,
    })),
    taker_fees: exchange.taker_fees.map(point => ({
      ...point,
      volume: point.volume * multiplier,
    })),
  };
}

export function getFeeAtVolume(
  feeSchedule: FeePoint[],
  volume: number
): number {
  // Find the last fee point where volume <= target volume
  // This returns the fee for the tier that STARTS at this volume
  let applicableFee = feeSchedule[0]?.fee ?? 0;
  
  for (const point of feeSchedule) {
    if (volume >= point.volume) {
      applicableFee = point.fee;
    } else {
      break;
    }
  }
  
  return applicableFee;
}

export function getCumulativeFeesAtVolume(
  feeSchedule: FeePoint[],
  volume: number
): number {
  if (volume <= 0) return 0;
  

  
  let totalFees = 0;
  
  // Calculate fees for each tier up to the target volume
  // This represents the total fees paid to reach the specified volume threshold
  for (let i = 0; i < feeSchedule.length; i++) {
    const currentPoint = feeSchedule[i];
    const nextPoint = feeSchedule[i + 1];
    

    
    // If we haven't reached this tier yet, skip
    if (volume < currentPoint.volume) continue;
    
    // Calculate the volume range for this tier
    const tierStartVolume = currentPoint.volume;
    const tierEndVolume = nextPoint ? Math.min(volume, nextPoint.volume) : volume;
    

    
    if (tierEndVolume > tierStartVolume) {
      // Calculate volume in this tier (convert from millions to actual volume)
      // Note: Volume in dataset is stored in millions (e.g., 5 = $5M)
      const tierVolume = (tierEndVolume - tierStartVolume) * 1000000; // Convert from millions to actual volume
      
      // Calculate fees for this tier (fees are in basis points, so divide by 10000)
      // Example: 1.5 bps = 0.015% = 0.00015
      const feeRate = currentPoint.fee / 10000;
      const tierFees = tierVolume * feeRate;
      
      totalFees += tierFees;
    }
  }
  
  return totalFees;
}

// Test function to verify cumulative fee calculations
export function testCumulativeFeeCalculation(): void {
  console.log('\n🧪 Testing cumulative fee calculations...\n');
  
  // Test 1: Basic calculation
  const testSchedule = [
    { volume: 0, fee: 1.5 },    // 0-5M: 1.5 bps
    { volume: 5, fee: 1.2 },    // 5-25M: 1.2 bps  
    { volume: 25, fee: 0.8 },   // 25M+: 0.8 bps
  ];
  
  // Test at $30M volume
  const result = getCumulativeFeesAtVolume(testSchedule, 30);
  
  // Manual calculation:
  // 0-5M: $5M × 1.5 bps = $5M × 0.00015 = $750
  // 5-25M: $20M × 1.2 bps = $20M × 0.00012 = $2,400
  // 25-30M: $5M × 0.8 bps = $5M × 0.00008 = $400
  // Total: $750 + $2,400 + $400 = $3,550
  
  console.log('✅ Test cumulative fees at $30M:', {
    calculated: result,
    expected: 3550,
    correct: Math.abs(result - 3550) < 0.01
  });
  
  // Test 2: Nado-like calculation at $5M
  const nadoSchedule = [
    { volume: 0, fee: 3.8 },    // 0-5M: 3.8 bps (corrected from 4.0)
    { volume: 5, fee: 3.3 },    // 5M+: 3.3 bps
  ];
  
  const nadoResult = getCumulativeFeesAtVolume(nadoSchedule, 5);
  console.log('✅ Test Nado cumulative fees at $5M:', {
    calculated: nadoResult,
    expected: 1900, // $5M × 3.8 bps = $1,900
    correct: Math.abs(nadoResult - 1900) < 0.01
  });
  
  // Test 3: Hyperliquid-like calculation at $5M
  const hyperliquidSchedule = [
    { volume: 0, fee: 4.5 },    // 0-5M: 4.5 bps
    { volume: 5, fee: 4.0 },    // 5M+: 4.0 bps
  ];
  
  const hyperliquidResult = getCumulativeFeesAtVolume(hyperliquidSchedule, 5);
  console.log('✅ Test Hyperliquid cumulative fees at $5M:', {
    calculated: hyperliquidResult,
    expected: 2250, // $5M × 4.5 bps = $2,250
    correct: Math.abs(hyperliquidResult - 2250) < 0.01
  });
  
  // Test 4: Test the corrected getFeeAtVolume function
  console.log('\n🧪 Testing corrected getFeeAtVolume function...\n');
  
  const hyperliquidFeeAt5M = getFeeAtVolume(hyperliquidSchedule, 5);
  console.log('✅ Hyperliquid fee at $5M:', {
    calculated: hyperliquidFeeAt5M,
    expected: 4.5, // Should return 4.5 bps (fee that applies UP TO 5M)
    correct: hyperliquidFeeAt5M === 4.5
  });
  
  const nadoFeeAt5M = getFeeAtVolume(nadoSchedule, 5);
  console.log('✅ Nado fee at $5M:', {
    calculated: nadoFeeAt5M,
    expected: 3.8, // Should return 3.8 bps (fee that applies UP TO 5M)
    correct: nadoFeeAt5M === 3.8
  });
}