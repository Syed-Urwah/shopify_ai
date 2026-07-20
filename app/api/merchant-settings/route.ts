import { NextResponse } from 'next/server';
import {PrismaClient} from '../../../lib/generated/prisma'; // Adjust path as needed
import prisma from '@/app/lib/prisma'
// GET /api/merchant-settings
// Fetches the single merchant settings record
export async function GET() {
  try {
    // const prisma = new PrismaClient();
    const settings = await prisma.merchantSettings.findFirst(); // Find the first (and likely only) record

    if (!settings) {
      return NextResponse.json({ error: 'Merchant settings not found' }, { status: 404 });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('GET MerchantSettings API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch merchant settings' }, { status: 500 });
  }
}

// POST /api/merchant-settings
// Creates the initial merchant settings record
export async function POST(request: Request) {
  try {
    const existingSettings = await prisma.merchantSettings.findFirst();
    if (existingSettings) {
      return NextResponse.json({ error: 'Merchant settings already exist. Use PUT to update.' }, { status: 409 });
    }

    const body = await request.json();
    const { inventoryThreshold, maxPrice, reviewFrequency, aiBehaviourPrompt } = body;

    if (inventoryThreshold === undefined || maxPrice === undefined || reviewFrequency === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newSettings = await prisma.merchantSettings.create({
      data: {
        inventoryThreshold,
        maxPrice,
        reviewFrequency,
        aiBehaviourPrompt,
      },
    });

    return NextResponse.json(newSettings, { status: 201 });
  } catch (error: any) {
    console.error('POST MerchantSettings API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create merchant settings' }, { status: 500 });
  }
}

// PUT /api/merchant-settings
// Updates the single existing merchant settings record
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { inventoryThreshold, maxPrice, reviewFrequency, aiBehaviourPrompt } = body;

    // Find the existing settings to get its ID
    const existingSettings = await prisma.merchantSettings.findFirst();
    if (!existingSettings) {
      return NextResponse.json({ error: 'Merchant settings not found. Use POST to create.' }, { status: 404 });
    }

    const updatedSettings = await prisma.merchantSettings.update({
      where: { id: existingSettings.id }, // Update by the found ID
      data: {
        inventoryThreshold,
        maxPrice,
        reviewFrequency,
        aiBehaviourPrompt,
      },
    });

    return NextResponse.json(updatedSettings);
  } catch (error: any) {
    console.error('PUT MerchantSettings API Error:', error);
    if (error.code === 'P2025') { // Record not found (though findFirst should prevent this)
      return NextResponse.json({ error: 'Merchant settings not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update merchant settings' }, { status: 500 });
  }
}

// DELETE /api/merchant-settings
// Deletes the single existing merchant settings record
export async function DELETE() {
  try {
    const existingSettings = await prisma.merchantSettings.findFirst();
    if (!existingSettings) {
      return NextResponse.json({ error: 'Merchant settings not found' }, { status: 404 });
    }

    await prisma.merchantSettings.delete({
      where: { id: existingSettings.id },
    });

    return NextResponse.json({ message: 'Merchant settings deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('DELETE MerchantSettings API Error:', error);
    if (error.code === 'P2025') { // Record not found (though findFirst should prevent this)
      return NextResponse.json({ error: 'Merchant settings not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || 'Failed to delete merchant settings' }, { status: 500 });
  }
}
