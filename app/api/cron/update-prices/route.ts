import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { shopifyGraphqlRequest, GET_PRODUCTS_QUERY, UPDATE_PRODUCT_VARIANT_PRICE_MUTATION } from '@/app/lib/shopify';
import { Product, ShopifyProductNode } from '@/app/lib/types';
import { getGeminiResponse } from '@/app/lib/gemini'; // Import Gemini utility

// Helper function to get AI price recommendation using Gemini
async function getAIRecommendedPrice(
  productTitle: string,
  currentPrice: number,
  inventoryLevel: number,
  aiBehaviourPrompt: string | null
): Promise<number | null> {
  try {
    const prompt = `
      You are an AI pricing assistant for an e-commerce store.
      Your goal is to recommend a new price for a product based on its current status and the merchant's specific pricing strategy.

      Product Information:
      - Product Name: "${productTitle}"
      - Current Price: $${currentPrice.toFixed(2)}
      - Current Inventory Level: ${inventoryLevel} units

      Merchant's AI Pricing Strategy:
      "${aiBehaviourPrompt || 'Optimize for profit while maintaining customer satisfaction.'}"

      Based on the above information, recommend a new price for "${productTitle}".
      Provide ONLY the numerical value of the recommended price, without any currency symbols, text, or explanation.
      For example: "123.45"
    `;

    const geminiResponse = await getGeminiResponse(prompt);

    // --- Rule 4: Invalid or malformed AI responses must be ignored safely. ---
    if (!geminiResponse) {
      console.warn(`Gemini returned no response for product: ${productTitle}`);
      return null;
    }

    const recommendedPrice = parseFloat(geminiResponse.trim());

    if (isNaN(recommendedPrice)) {
      console.warn(`Gemini returned a non-numeric price for product: ${productTitle}. Response: "${geminiResponse}"`);
      return null;
    }

    return parseFloat(recommendedPrice.toFixed(2)); // Ensure it's a number rounded to 2 decimal places
  } catch (e) {
    console.error(`Error getting AI recommended price for ${productTitle} from Gemini:`, e);
    return null; // Safely ignore errors during AI call
  }
}

export async function GET(request: Request) {
  // --- Cron Job Security ---
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  console.log('Starting AI price update cron job...');

  try {
    // 1. Fetch Merchant Settings
    const merchantSettings = await prisma.merchantSettings.findFirst();
    if (!merchantSettings) {
      console.warn('No merchant settings found. Skipping price update.');
      return NextResponse.json({ message: 'No merchant settings found. Skipping price update.' }, { status: 200 });
    }

    const { inventoryThreshold, maxPrice, aiBehaviourPrompt } = merchantSettings;

    // 2. Fetch Shopify Products
    // We need to fetch products with their variant IDs and current prices
    const shopifyData = await shopifyGraphqlRequest(GET_PRODUCTS_QUERY, { first: 250 }); // Fetch up to 250 products
    const shopifyProducts: ShopifyProductNode[] = shopifyData.products.edges.map((edge: any) => edge.node);

    let productsProcessed = 0;
    let pricesUpdated = 0;
    let errorsEncountered = 0;

    for (const shopifyProduct of shopifyProducts) {
      productsProcessed++;

      const numericProductId = shopifyProduct.id.match(/\/(\d+)$/)?.[1];
      const currentPrice = parseFloat(shopifyProduct.priceRange.minVariantPrice.amount);
      const totalInventory = shopifyProduct.totalInventory !== null ? shopifyProduct.totalInventory : 0;
      const defaultVariantId = shopifyProduct.variants.edges[0]?.node.id; // Assuming first variant is the default

      if (!numericProductId || !defaultVariantId) {
        console.warn(`Skipping product ${shopifyProduct.title}: Missing ID or default variant.`);
        errorsEncountered++;
        continue;
      }

      // --- Rule 3: Only products below or equal to the threshold should be processed. ---
      if (totalInventory > inventoryThreshold) {
        console.log(`Skipping product ${shopifyProduct.title}: Inventory (${totalInventory}) above threshold (${inventoryThreshold}).`);
        continue;
      }

      console.log(`Processing product: ${shopifyProduct.title} (Current Price: ${currentPrice}, Inventory: ${totalInventory})`);

      // 3. AI Price Recommendation
      const recommendedPrice = await getAIRecommendedPrice(
        shopifyProduct.title,
        currentPrice,
        totalInventory,
        aiBehaviourPrompt
      );

      // --- Rule 4: Invalid or malformed AI responses must be ignored safely. ---
      if (recommendedPrice === null || isNaN(recommendedPrice)) {
        console.warn(`Skipping product ${shopifyProduct.title}: AI returned invalid or null recommendation.`);
        errorsEncountered++;
        continue;
      }

      let finalRecommendedPrice = recommendedPrice;

      // --- Rule 1: Recommended price must NOT exceed the maximum allowed price. ---
      if (finalRecommendedPrice > maxPrice) {
        console.warn(`Adjusting recommended price for ${shopifyProduct.title}: ${finalRecommendedPrice} exceeds maxPrice ${maxPrice}. Setting to ${maxPrice}.`);
        finalRecommendedPrice = maxPrice;
      }

      // --- Rule 2: The recommended price must NOT be lower than the current price. ---
      if (finalRecommendedPrice < currentPrice) {
        console.warn(`Skipping price update for ${shopifyProduct.title}: Recommended price (${finalRecommendedPrice}) is lower than current price (${currentPrice}).`);
        continue; // Do not update if lower
      }

      // Only update if there's a meaningful change
      if (finalRecommendedPrice === currentPrice) {
        console.log(`Skipping price update for ${shopifyProduct.title}: Recommended price is same as current price.`);
        continue;
      }

      // 4. Update Shopify Product Price
      console.log(`Updating ${shopifyProduct.title} price from ${currentPrice} to ${finalRecommendedPrice}`);
      try {
        const updateResponse = await shopifyGraphqlRequest(UPDATE_PRODUCT_VARIANT_PRICE_MUTATION, {
          input: {
            id: defaultVariantId,
            price: finalRecommendedPrice.toString(), // Shopify expects price as a string
          },
        });

        if (updateResponse.productVariantUpdate.userErrors && updateResponse.productVariantUpdate.userErrors.length > 0) {
          console.error(`Shopify update errors for ${shopifyProduct.title}:`, updateResponse.productVariantUpdate.userErrors);
          errorsEncountered++;
          continue;
        }

        pricesUpdated++;

        // 5. Record Price History
        await prisma.priceHistory.create({
          data: {
            productId: numericProductId,
            oldPrice: currentPrice,
            newPrice: finalRecommendedPrice,
            reason: aiBehaviourPrompt || 'AI price adjustment',
            inventory_level: totalInventory.toString(), // Store inventory level at time of change
          },
        });
        console.log(`Price history recorded for ${shopifyProduct.title}.`);

      } catch (updateError) {
        console.error(`Failed to update price for ${shopifyProduct.title} on Shopify:`, updateError);
        errorsEncountered++;
      }
    }

    console.log(`AI price update cron job finished. Processed: ${productsProcessed}, Updated: ${pricesUpdated}, Errors: ${errorsEncountered}`);
    return NextResponse.json({
      message: 'AI price update cron job completed',
      productsProcessed,
      pricesUpdated,
      errorsEncountered,
    }, { status: 200 });

  } catch (error: any) {
    console.error('AI Price Update Cron Job Fatal Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
