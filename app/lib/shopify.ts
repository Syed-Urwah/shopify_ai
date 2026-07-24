// 'use server';

import 'server-only';

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ADMIN_ACCESS_TOKEN) {
  throw new Error(
    'Shopify store domain and admin access token are not configured. Please add SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN to your .env.local file.'
  );
}

// Using a slightly older, well-established stable API version
const SHOPIFY_API_VERSION = '2026-07'; // Changed API version
const shopifyAdminUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

export async function shopifyGraphqlRequest(query: string, variables: Record<string, any> = {}) {
  console.log('--- Shopify GraphQL Request ---');
  console.log('URL:', shopifyAdminUrl);
  console.log('Query:', query);
  console.log('Variables:', JSON.stringify(variables, null, 2));
  console.log('-----------------------------');

  const response = await fetch(shopifyAdminUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store', // Or 'force-cache' depending on your caching strategy
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Shopify GraphQL API raw error response:', errorBody);
    throw new Error(`Shopify GraphQL API error: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const jsonResponse = await response.json();

  if (jsonResponse.errors) {
    console.error('Shopify GraphQL errors details:', JSON.stringify(jsonResponse.errors, null, 2));
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(jsonResponse.errors)}`);
  }

  return jsonResponse.data;
}

// GraphQL query to fetch products
export const GET_PRODUCTS_QUERY = `
  query getProducts($first: Int!, $query: String) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          productType
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          totalInventory
          status
          variants(first: 1) { # Fetch the default variant to get its ID
            edges {
              node {
                id
                price
              }
            }
          }
        }
      }
    }
  }
`;

// GraphQL mutation to update a product variant's price
export const UPDATE_PRODUCT_VARIANT_PRICE_MUTATION = `
  mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
        price
      }
      userErrors {
        field
        message
      }
    }
  }
`;
