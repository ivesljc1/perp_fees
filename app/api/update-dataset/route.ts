import { NextRequest, NextResponse } from 'next/server';
import { validateDataset } from '@/lib/data-validation';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const updatedDataset = await request.json();
    
    // Validate the dataset structure
    const validatedData = validateDataset(updatedDataset);
    
    // Write the updated dataset to the JSON file
    const datasetPath = path.join(process.cwd(), 'public', 'dataset.json');
    
    // Format the JSON with proper indentation for readability
    const jsonContent = JSON.stringify(validatedData, null, 2);
    
    // Write to file
    await fs.writeFile(datasetPath, jsonContent, 'utf-8');
    
    console.log('Dataset updated successfully and saved to file');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Dataset updated and persisted to file' 
    });
  } catch (error) {
    console.error('Error updating dataset:', error);
    return NextResponse.json(
      { error: 'Failed to update dataset' },
      { status: 500 }
    );
  }
}