'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { Exchange } from '@/lib/data-validation';

interface NadoEditFormProps {
  nadoData: Exchange;
  onSave: (updatedData: Exchange) => void;
}

interface FeeRow {
  volume: number;
  makerFee: number;
  takerFee: number;
}

export default function NadoEditForm({ nadoData, onSave }: NadoEditFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [dayBasis, setDayBasis] = useState(nadoData.day_basis);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState<FeeRow[]>(() => {
    // Combine maker and taker fees into rows
    return nadoData.maker_fees.map((makerPoint, index) => ({
      volume: makerPoint.volume,
      makerFee: makerPoint.fee,
      takerFee: nadoData.taker_fees[index]?.fee || 0,
    }));
  });

  const resetForm = () => {
    setDayBasis(nadoData.day_basis);
    setFormData(
      nadoData.maker_fees.map((makerPoint, index) => ({
        volume: makerPoint.volume,
        makerFee: makerPoint.fee,
        takerFee: nadoData.taker_fees[index]?.fee || 0,
      }))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      const updatedNadoData: Exchange = {
        ...nadoData,
        day_basis: dayBasis,
        maker_fees: formData.map(row => ({
          volume: row.volume,
          fee: row.makerFee,
        })),
        taker_fees: formData.map(row => ({
          volume: row.volume,
          fee: row.takerFee,
        })),
      };

      await onSave(updatedNadoData);
      
      setSaveMessage({ type: 'success', text: 'Nado fees updated successfully! Changes are now saved to the dataset.' });
      setIsEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save changes. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const updateRow = (index: number, field: keyof FeeRow, value: number) => {
    setFormData(prev => prev.map((row, i) => 
      i === index ? { ...row, [field]: value } : row
    ));
  };

  const addRow = () => {
    const lastRow = formData[formData.length - 1];
    const newVolume = lastRow ? lastRow.volume + 1000 : 1000; // Add 1B to last volume or start at 1B
    
    setFormData(prev => [...prev, {
      volume: newVolume,
      makerFee: 0,
      takerFee: 2.5,
    }]);
  };

  const removeRow = (index: number) => {
    if (formData.length > 1) { // Prevent removing the last row
      setFormData(prev => prev.filter((_, i) => i !== index));
    }
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}B`;
    } else {
      return `$${volume.toFixed(0)}M`;
    }
  };

  if (!isEditing) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Nado Fee Configuration</CardTitle>
            <div className="text-sm text-gray-600">
              Rolling Period: {nadoData.day_basis} days
            </div>
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
              Edit Fees
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Success Message Display */}
          {saveMessage && saveMessage.type === 'success' && (
            <div className="mb-4 p-3 bg-green-50 text-green-800 border border-green-200 rounded text-sm">
              {saveMessage.text}
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Volume Threshold</th>
                  <th className="text-left py-2 px-3">Taker Fee (bps)</th>
                  <th className="text-left py-2 px-3">Maker Fee (bps)</th>
                </tr>
              </thead>
              <tbody>
                {formData.map((row, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 px-3 font-medium">{formatVolume(row.volume)}</td>
                    <td className="py-2 px-3">{row.takerFee.toFixed(1)}</td>
                    <td className="py-2 px-3">{row.makerFee.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Edit Nado Fee Configuration</CardTitle>
          <div className="flex gap-2">
            <Button onClick={resetForm} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button onClick={handleSave} size="sm" disabled={isSaving}>
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
              Cancel
            </Button>
          </div>
        </div>
        
        {/* Save Message Display */}
        {saveMessage && (
          <div className={`mt-3 p-3 rounded text-sm ${
            saveMessage.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {saveMessage.text}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="mb-4">
          <Label htmlFor="day-basis" className="text-sm font-medium">
            Rolling Period
          </Label>
          <Select value={dayBasis.toString()} onValueChange={(value) => setDayBasis(parseInt(value))}>
            <SelectTrigger className="w-32 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="overflow-x-auto">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-gray-700">Fee Schedule</h4>
            <Button onClick={addRow} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Tier
            </Button>
          </div>
          
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3">Volume Threshold</th>
                <th className="text-left py-2 px-3">Taker Fee (bps)</th>
                <th className="text-left py-2 px-3">Maker Fee (bps)</th>
                <th className="text-left py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {formData.map((row, index) => (
                <tr key={index} className="border-b">
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">$</span>
                      <Input
                        type="number"
                        value={row.volume}
                        onChange={(e) => updateRow(index, 'volume', parseFloat(e.target.value) || 0)}
                        className="w-24 h-8 text-xs"
                        min="0"
                        step="1"
                      />
                      <span className="text-xs text-gray-500">M</span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <Input
                      type="number"
                      value={row.takerFee}
                      onChange={(e) => updateRow(index, 'takerFee', parseFloat(e.target.value) || 0)}
                      className="w-20 h-8 text-xs"
                      step="0.1"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <Input
                      type="number"
                      value={row.makerFee}
                      onChange={(e) => updateRow(index, 'makerFee', parseFloat(e.target.value) || 0)}
                      className="w-20 h-8 text-xs"
                      step="0.1"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <Button
                      onClick={() => removeRow(index)}
                      variant="ghost"
                      size="sm"
                      disabled={formData.length === 1}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 text-xs text-gray-500">
          <p>• Volume thresholds are in millions USD (e.g., 5 = $5M)</p>
          <p>• Fees are in basis points (e.g., 1.5 = 1.5 bps = 0.015%)</p>
          <p>• Rolling period determines the volume calculation timeframe</p>
          <p>• Add tiers to create more granular fee structures</p>
          <p>• Changes will update the chart immediately after saving</p>
        </div>
      </CardContent>
    </Card>
  );
}