import { Product } from './types';

// This fetchProducts function now calls our own Next.js API route
export const fetchProducts = async (searchTerm?: string): Promise<Product[]> => {
  try {
    const url = new URL('/api/shopify/products', window.location.origin);
    if (searchTerm) {
      url.searchParams.set('searchTerm', searchTerm);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // No-store cache for client-side fetches to ensure fresh data
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to fetch products from API route: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const products: Product[] = await response.json();
    return products;
  } catch (error) {
    console.error('Failed to fetch products from internal API:', error);
    return [];
  }
};
