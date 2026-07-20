// 'use server';

import 'server-only';

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN

if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ADMIN_ACCESS_TOKEN) {
  throw new Error(
    'Shopify store domain and admin access token are not configured. Please add SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN to your .env.local file.'
  );
}

const shopifyAdminUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2026-07/graphql.json`; // Using a recent stable API version

export async function shopifyGraphqlRequest(query: string, variables: Record<string, any> = {}) {
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
    throw new Error(`Shopify GraphQL API error: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const jsonResponse = await response.json();

  if (jsonResponse.errors) {
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
        }
      }
    }
  }
`;
