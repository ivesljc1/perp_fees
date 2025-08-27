'use client';

import { useState } from 'react';
import { Exchange } from '@/lib/data-validation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ExchangeControlsProps {
  exchanges: Exchange[];
  originalExchanges: Exchange[];
  selectedExchanges: string[];
  onSelectionChange: (selected: string[]) => void;
}

export default function ExchangeControls({
  exchanges,
  originalExchanges,
  selectedExchanges,
  onSelectionChange,
}: ExchangeControlsProps) {
  const cexExchanges = exchanges.filter(e => e.type === 'CEX' && e.product === 'perp');
  const dexExchanges = exchanges.filter(e => e.type === 'DEX' && e.product === 'perp');
  const nadoExchanges = exchanges.filter(e => e.type === 'Nado' && e.product === 'perp');
  
  // Get original data for basis day display
  const originalCexExchanges = originalExchanges.filter(e => e.type === 'CEX' && e.product === 'perp');
  const originalDexExchanges = originalExchanges.filter(e => e.type === 'DEX' && e.product === 'perp');
  const originalNadoExchanges = originalExchanges.filter(e => e.type === 'Nado' && e.product === 'perp');

  const handleExchangeToggle = (exchangeName: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedExchanges, exchangeName]);
    } else {
      onSelectionChange(selectedExchanges.filter(name => name !== exchangeName));
    }
  };

  const handleQuickToggle = (type: 'CEX' | 'DEX' | 'Nado', enabled: boolean) => {
    const typeExchanges = exchanges.filter(e => e.type === type).map(e => e.exchange);
    
    if (enabled) {
      const newSelection = [...new Set([...selectedExchanges, ...typeExchanges])];
      onSelectionChange(newSelection);
    } else {
      const newSelection = selectedExchanges.filter(name => !typeExchanges.includes(name));
      onSelectionChange(newSelection);
    }
  };

  const selectAll = () => {
    onSelectionChange(exchanges.map(e => e.exchange));
  };

  const selectNone = () => {
    onSelectionChange([]);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Exchange Selection</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            All
          </Button>
          <Button variant="outline" size="sm" onClick={selectNone}>
            None
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick toggles */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Quick Select</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={cexExchanges.every(e => selectedExchanges.includes(e.exchange)) ? "default" : "outline"}
              size="sm"
              onClick={() => handleQuickToggle('CEX', !cexExchanges.every(e => selectedExchanges.includes(e.exchange)))}
            >
              CEX
            </Button>
            <Button
              variant={dexExchanges.every(e => selectedExchanges.includes(e.exchange)) ? "default" : "outline"}
              size="sm"
              onClick={() => handleQuickToggle('DEX', !dexExchanges.every(e => selectedExchanges.includes(e.exchange)))}
            >
              DEX
            </Button>
            <Button
              variant={nadoExchanges.every(e => selectedExchanges.includes(e.exchange)) ? "default" : "outline"}
              size="sm"
              onClick={() => handleQuickToggle('Nado', !nadoExchanges.every(e => selectedExchanges.includes(e.exchange)))}
            >
              Nado
            </Button>
          </div>
        </div>

        {/* CEX Section */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Centralized Exchanges</h4>
          <div className="space-y-2">
            {cexExchanges.map(exchange => {
              const originalExchange = originalCexExchanges.find(e => e.exchange === exchange.exchange);
              return (
                <div key={exchange.exchange} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cex-${exchange.exchange}`}
                    checked={selectedExchanges.includes(exchange.exchange)}
                    onCheckedChange={(checked) => 
                      handleExchangeToggle(exchange.exchange, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`cex-${exchange.exchange}`}
                    className="text-sm cursor-pointer"
                  >
                    {exchange.exchange} <span className="text-gray-500">({originalExchange?.day_basis || exchange.day_basis}D)</span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* DEX Section */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Decentralized Exchanges</h4>
          <div className="space-y-2">
            {dexExchanges.map(exchange => {
              const originalExchange = originalDexExchanges.find(e => e.exchange === exchange.exchange);
              return (
                <div key={exchange.exchange} className="flex items-center space-x-2">
                  <Checkbox
                    id={`dex-${exchange.exchange}`}
                    checked={selectedExchanges.includes(exchange.exchange)}
                    onCheckedChange={(checked) => 
                      handleExchangeToggle(exchange.exchange, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`dex-${exchange.exchange}`}
                    className="text-sm cursor-pointer"
                  >
                    {exchange.exchange} <span className="text-gray-500">({originalExchange?.day_basis || exchange.day_basis}D)</span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Nado Section */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Nado</h4>
          <div className="space-y-2">
            {nadoExchanges.map(exchange => {
              const originalExchange = originalNadoExchanges.find(e => e.exchange === exchange.exchange);
              return (
                <div key={exchange.exchange} className="flex items-center space-x-2">
                  <Checkbox
                    id={`nado-${exchange.exchange}`}
                    checked={selectedExchanges.includes(exchange.exchange)}
                    onCheckedChange={(checked) => 
                      handleExchangeToggle(exchange.exchange, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`nado-${exchange.exchange}`}
                    className="text-sm cursor-pointer"
                  >
                    {exchange.exchange} <span className="text-gray-500">({originalExchange?.day_basis || exchange.day_basis}D)</span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}