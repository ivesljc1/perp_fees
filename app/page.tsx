import FeeVisualization from '@/components/fee-visualization';
import { validateDataset } from '@/lib/data-validation';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  // Load and validate dataset on server
  const datasetPath = path.join(process.cwd(), 'public', 'dataset.json');
  const datasetContent = await fs.readFile(datasetPath, 'utf-8');
  const dataset = JSON.parse(datasetContent);
  
  // Validate dataset structure
  const validatedData = validateDataset(dataset);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Perpetual Futures Fee Comparison
          </h1>
          <p className="text-lg text-gray-600">
            Interactive comparison of maker and taker fees across major centralized and decentralized exchanges
          </p>
        </div>
        
        <FeeVisualization initialData={validatedData} />
      </div>
    </div>
  );
}