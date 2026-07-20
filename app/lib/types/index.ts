export type Product = {
  id: string; // Shopify's GID (e.g., "gid://shopify/Product/1234567890")
  numericId: string; // Extracted numeric ID (e.g., "1234567890")
  name: string; // Maps to Shopify's 'title'
  category: string; // Maps to Shopify's 'productType'
  price: number; // Maps to Shopify's 'priceRange.minVariantPrice.amount'
  stock: number; // Maps to Shopify's 'totalInventory'
  status: 'available' | 'out_of_stock' | 'discontinued'; // Mapped from Shopify's 'status' and 'totalInventory'
};

// Type for the raw data received from Shopify GraphQL
export type ShopifyProductNode = {
  id: string;
  title: string;
  productType: string;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
    maxVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  totalInventory: number | null;
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
};
