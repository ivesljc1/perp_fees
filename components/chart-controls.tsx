'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ChartControlsProps {
  dayBasis: number;
  onDayBasisChange: (basis: number) => void;
  isLogScale: boolean;
  onLogScaleChange: (isLog: boolean) => void;
}

export default function ChartControls({
  dayBasis,
  onDayBasisChange,
  isLogScale,
  onLogScaleChange,
}: ChartControlsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Chart Settings</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Day Basis Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">
            Volume Period Normalization
          </Label>
          <div className="flex gap-1">
            {[7, 14, 30].map(basis => (
              <Button
                key={basis}
                variant={dayBasis === basis ? "default" : "outline"}
                size="sm"
                onClick={() => onDayBasisChange(basis)}
                className="flex-1"
              >
                {basis}D
              </Button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Normalizes all volume thresholds to {dayBasis}-day basis using simple multipliers
          </p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>• 7D → 14D: ×2 | 7D → 30D: ×4</p>
            <p>• 14D → 7D: ÷2 | 14D → 30D: ×2</p>
            <p>• 30D → 7D: ÷4 | 30D → 14D: ÷2</p>
          </div>
          
          {/* Cumulative Fees Explanation */}
          <div className="mt-3 p-4 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs text-blue-800 font-medium mb-1">💡 Cumulative Fees</p>
            <p className="text-xs text-blue-700">
              Hover over charts to see total fees paid to reach each volume threshold. 
              Numbers in brackets show cumulative fees (area under the fee curve).
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}