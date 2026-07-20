import { PrismaClient } from '../lib/generated/prisma'; // Corrected import path

const prisma = new PrismaClient();

async function main() {
  // Try to find an existing MerchantSettings record
  let merchantSettings = await prisma.merchantSettings.findFirst();

  if (!merchantSettings) {
    console.log('Seeding default MerchantSettings...');
    merchantSettings = await prisma.merchantSettings.create({
      data: {
        inventoryThreshold: 10, // Default: AI considers price changes if inventory drops below 10
        maxPrice: 500.00,      // Default: AI won't set a price higher than 500
        reviewFrequency: 7,    // Default: AI reviews prices every 7 days
        aiBehaviourPrompt: 'Optimize for profit while maintaining customer satisfaction. Avoid drastic price changes.',
      },
    });
    console.log(`Created default MerchantSettings with ID: ${merchantSettings.id}`);
  } else {
    console.log(`MerchantSettings already exist with ID: ${merchantSettings.id}. Skipping seed.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
