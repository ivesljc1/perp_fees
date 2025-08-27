'use client';

import { formatVolume, formatFee, formatCumulativeFees } from '@/lib/chart-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RankingData {
  exchange: string;
  type: 'CEX' | 'DEX' | 'Nado';
  makerFee: number;
  takerFee: number;
  makerCumulativeFees?: number;
  takerCumulativeFees?: number;
}

interface RankingPanelProps {
  rankings: {
    maker: RankingData[];
    taker: RankingData[];
  };
  hoverVolume: number;
  chartColors: Record<string, string>;
}

export default function RankingPanel({
  rankings,
  hoverVolume,
  chartColors,
}: RankingPanelProps) {
  const RankingList = ({ data, sortBy }: { data: RankingData[]; sortBy: 'maker' | 'taker' }) => (
    <div className="space-y-2">
      {data.map((item, index) => (
        <div
          key={`${item.exchange}-${index}`}
          className="flex items-center justify-between p-3 rounded-lg border bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: chartColors[item.exchange] || '#6b7280' }}
              />
              <span className="font-medium text-sm">{item.exchange}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {item.type}
            </Badge>
          </div>
          
                      <div className="flex items-center gap-3 text-sm">
              <div className="text-right">
                <div className="text-xs text-gray-500">Maker</div>
                <div className="flex items-center gap-1">
                  <span className={sortBy === 'maker' ? 'font-bold' : ''}>
                    {formatFee(item.makerFee)}
                  </span>
                  {item.makerCumulativeFees !== undefined && (
                    <span className="text-gray-500 text-xs">
                      ({formatCumulativeFees(item.makerCumulativeFees)})
                    </span>
                  )}
                  {item.makerFee < 0 && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      Rebate
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-xs text-gray-500">Taker</div>
                <div className="flex items-center gap-1">
                  <span className={sortBy === 'taker' ? 'font-bold' : ''}>
                    {formatFee(item.takerFee)}
                  </span>
                  {item.takerCumulativeFees !== undefined && (
                    <span className="text-gray-500 text-xs">
                      ({formatCumulativeFees(item.takerCumulativeFees)})
                    </span>
                  )}
                </div>
              </div>
            </div>
        </div>
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          Rankings at {formatVolume(hoverVolume)}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="maker" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="maker">Maker Fees</TabsTrigger>
            <TabsTrigger value="taker">Taker Fees</TabsTrigger>
          </TabsList>
          
          <TabsContent value="maker" className="mt-4">
            <RankingList data={rankings.maker} sortBy="maker" />
          </TabsContent>
          
          <TabsContent value="taker" className="mt-4">
            <RankingList data={rankings.taker} sortBy="taker" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}