'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Dataset, Exchange, normalizeToDayBasis, getFeeAtVolume, getCumulativeFeesAtVolume, validateDataset } from '@/lib/data-validation';
import { snapToMillionTick, generateTicks, EXCHANGE_COLORS } from '@/lib/chart-utils';
import FeeChart from './fee-chart';
import ExchangeControls from './exchange-controls';
import RankingPanel from './ranking-panel';
import ChartControls from './chart-controls';
import NadoEditForm from './nado-edit-form';

interface FeeVisualizationProps {
  initialData: Dataset;
}

export default function FeeVisualization({ initialData }: FeeVisualizationProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // State for dataset (can be updated by Nado form)
  const [dataset, setDataset] = useState<Dataset>(initialData);
  
  // State management
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>(
    () => {
      const urlExchanges = searchParams.get('exchanges');
      return urlExchanges ? urlExchanges.split(',') : ['Nado'];
    }
  );
  
  const [dayBasis, setDayBasis] = useState<number>(
    () => {
      const urlDayBasis = searchParams.get('dayBasis');
      return urlDayBasis ? parseInt(urlDayBasis) : 14;
    }
  );
  
  const [isLogScale, setIsLogScale] = useState(false);
  const [hoverVolume, setHoverVolume] = useState<number | null>(2000000000); // Default to $2B

  // Handle Nado data updates
  const handleNadoUpdate = async (updatedNadoData: Exchange) => {
    try {
      // Update the dataset
      const updatedDataset = {
        ...dataset,
        exchanges: dataset.exchanges.map(exchange => 
          exchange.exchange === 'Nado' ? updatedNadoData : exchange
        )
      };
      
      // Update local state
      setDataset(updatedDataset);
      
      // Save to server
      const response = await fetch('/api/update-dataset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedDataset),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save dataset');
      }
      
      console.log('Nado data updated successfully');
    } catch (error) {
      console.error('Error updating Nado data:', error);
      // You could add a toast notification here
    }
  };

  // Sync URL state
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedExchanges.length > 0) {
      params.set('exchanges', selectedExchanges.join(','));
    }
    if (dayBasis !== 14) {
      params.set('dayBasis', dayBasis.toString());
    }
    
    // Don't redirect to /fees when no exchanges are selected
    // Just update the query parameters or stay on current page
    const newUrl = params.toString() ? `?${params.toString()}` : '';
    if (newUrl) {
      router.replace(newUrl);
    } else {
      // Clear query parameters but stay on current page
      router.replace(window.location.pathname);
    }
  }, [selectedExchanges, dayBasis, router]);

  // Normalize data based on day basis
  const normalizedData = useMemo(() => {
    return dataset.exchanges
      .filter(exchange => exchange.product === 'perp')
      .map(exchange => normalizeToDayBasis(exchange, dayBasis));
  }, [dataset, dayBasis]);

  // Filter selected exchanges
  const filteredExchanges = useMemo(() => {
    return normalizedData.filter(exchange => 
      selectedExchanges.includes(exchange.exchange)
    );
  }, [normalizedData, selectedExchanges]);

  // Calculate domains
  const { volumeDomain, makerFeeDomain, takerFeeDomain } = useMemo(() => {
    if (filteredExchanges.length === 0) {
      return {
        volumeDomain: [0, 10000000],
        makerFeeDomain: [-5, 10],
        takerFeeDomain: [0, 10],
      };
    }

    let minVolume = Infinity;
    let maxVolume = 0;
    let minMakerFee = Infinity;
    let maxMakerFee = -Infinity;
    let minTakerFee = Infinity;
    let maxTakerFee = -Infinity;

    filteredExchanges.forEach(exchange => {
      exchange.maker_fees.forEach(point => {
        minVolume = Math.min(minVolume, point.volume);
        maxVolume = Math.max(maxVolume, point.volume);
        minMakerFee = Math.min(minMakerFee, point.fee);
        maxMakerFee = Math.max(maxMakerFee, point.fee);
      });
      
      exchange.taker_fees.forEach(point => {
        minVolume = Math.min(minVolume, point.volume);
        maxVolume = Math.max(maxVolume, point.volume);
        minTakerFee = Math.min(minTakerFee, point.fee);
        maxTakerFee = Math.max(maxTakerFee, point.fee);
      });
    });

    // Add more generous padding for better visual appearance
    const volumePadding = (maxVolume - minVolume) * 0.1; // Increased from 2% to 10%
    const makerFeePadding = Math.max(1, (maxMakerFee - minMakerFee) * 0.3); // Increased from 20% to 30%
    const takerFeePadding = Math.max(1, (maxTakerFee - minTakerFee) * 0.3); // Increased from 20% to 30%

    return {
      volumeDomain: [
        0, // Always start at $0
        maxVolume + volumePadding
      ] as [number, number],
      makerFeeDomain: [
        Math.min(minMakerFee - makerFeePadding, -3.0), // Increased from -2.5 to -3.0
        maxMakerFee + makerFeePadding
      ] as [number, number],
      takerFeeDomain: [
        Math.min(minTakerFee - takerFeePadding, -1.0), // Increased from -0.5 to -1.0
        maxTakerFee + takerFeePadding
      ] as [number, number],
    };
  }, [filteredExchanges]);

  // Generate rankings for hover volume
  const rankings = useMemo(() => {
    if (!hoverVolume || filteredExchanges.length === 0) return { maker: [], taker: [] };

    const makerRankings = filteredExchanges.map(exchange => ({
      exchange: exchange.exchange,
      type: exchange.type,
      makerFee: getFeeAtVolume(exchange.maker_fees, hoverVolume),
      takerFee: getFeeAtVolume(exchange.taker_fees, hoverVolume),
      makerCumulativeFees: getCumulativeFeesAtVolume(exchange.maker_fees, hoverVolume),
      takerCumulativeFees: getCumulativeFeesAtVolume(exchange.taker_fees, hoverVolume),
    })).sort((a, b) => {
      if (a.makerFee !== b.makerFee) return a.makerFee - b.makerFee;
      if (a.takerFee !== b.takerFee) return a.takerFee - b.takerFee;
      return a.exchange.localeCompare(b.exchange);
    });

    const takerRankings = [...makerRankings].sort((a, b) => {
      if (a.takerFee !== b.takerFee) return a.takerFee - b.takerFee;
      if (a.makerFee !== b.makerFee) return a.makerFee - b.makerFee;
      return a.exchange.localeCompare(b.exchange);
    });

    return { maker: makerRankings, taker: takerRankings };
  }, [filteredExchanges, hoverVolume]);

  const handleHoverChange = (volume: number | null) => {
    if (volume === null) {
      setHoverVolume(null);
      return;
    }
    
    // The snapping is now handled in the chart component
    setHoverVolume(volume);
  };

  // Find Nado exchange data
  const nadoExchange = dataset.exchanges.find(e => e.exchange === 'Nado');
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Controls Panel */}
      <div className="lg:col-span-1 space-y-6">
        <ExchangeControls
          exchanges={normalizedData}
          originalExchanges={dataset.exchanges.filter(exchange => exchange.product === 'perp')}
          selectedExchanges={selectedExchanges}
          onSelectionChange={setSelectedExchanges}
        />
        
        <ChartControls
          dayBasis={dayBasis}
          onDayBasisChange={setDayBasis}
          isLogScale={isLogScale}
          onLogScaleChange={setIsLogScale}
        />
        
      </div>

      {/* Charts Panel */}
      <div className="lg:col-span-3 space-y-6">
        {/* Nado Edit Form */}
        {nadoExchange && (
          <NadoEditForm
            nadoData={nadoExchange}
            onSave={handleNadoUpdate}
          />
        )}
        
        {filteredExchanges.length > 0 && (
          <>
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Taker Fees (bps)
              </h2>
              <FeeChart
                exchanges={filteredExchanges}
                feeType="taker"
                volumeDomain={volumeDomain as [number, number]}
                feeDomain={takerFeeDomain as [number, number]}
                isLogScale={isLogScale}
                hoverVolume={hoverVolume}
                onHoverChange={handleHoverChange}
                colors={EXCHANGE_COLORS}
              />
            </div>
            
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Maker Fees (bps)
              </h2>
              <FeeChart
                exchanges={filteredExchanges}
                feeType="maker"
                volumeDomain={volumeDomain as [number, number]}
                feeDomain={makerFeeDomain as [number, number]}
                isLogScale={isLogScale}
                hoverVolume={hoverVolume}
                onHoverChange={handleHoverChange}
                colors={EXCHANGE_COLORS}
              />
            </div>
          </>
        )}
        
        {hoverVolume && filteredExchanges.length > 0 && (
          <RankingPanel
            rankings={rankings}
            hoverVolume={hoverVolume}
            chartColors={EXCHANGE_COLORS}
          />
        )}
        
      </div>
    </div>
  );
}