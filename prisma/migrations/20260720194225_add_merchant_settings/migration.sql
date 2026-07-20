-- CreateTable
CREATE TABLE "merchant_settings" (
    "id" TEXT NOT NULL,
    "inventoryThreshold" INTEGER NOT NULL,
    "maxPrice" DOUBLE PRECISION NOT NULL,
    "reviewFrequency" INTEGER NOT NULL,
    "aiBehaviourPrompt" TEXT,

    CONSTRAINT "merchant_settings_pkey" PRIMARY KEY ("id")
);
