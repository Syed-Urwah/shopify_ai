import { NextResponse } from 'next/server';
import { shopifyGraphqlRequest, GET_PRODUCTS_QUERY } from '../../../lib/shopify';
import { ShopifyProductNode, Product } from '../../../lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('searchTerm');

    const queryVariables: { first: number; query?: string } = { first: 250 };

    if (searchTerm) {
      queryVariables.query = `title:*${searchTerm}*`;
    }

    const data = await shopifyGraphqlRequest(GET_PRODUCTS_QUERY, queryVariables);

    const shopifyProducts: ShopifyProductNode[] = data.products.edges.map((edge: any) => edge.node);

    const products: Product[] = shopifyProducts.map((shopifyProduct) => {
      const idMatch = shopifyProduct.id.match(/\/(\d+)$/);
      const numericId = idMatch ? idMatch[1] : shopifyProduct.id;

      let status: Product['status'];
      if (shopifyProduct.status === 'ACTIVE' && (shopifyProduct.totalInventory === null || shopifyProduct.totalInventory > 0)) {
        status = 'available';
      } else if (shopifyProduct.status === 'ACTIVE' && shopifyProduct.totalInventory === 0) {
        status = 'out_of_stock';
      } else {
        status = 'discontinued';
      }

      return {
        id: shopifyProduct.id,
        numericId: numericId,
        name: shopifyProduct.title,
        category: shopifyProduct.productType || 'Uncategorized',
        price: parseFloat(shopifyProduct.priceRange.minVariantPrice.amount),
        stock: shopifyProduct.totalInventory !== null ? shopifyProduct.totalInventory : 0,
        status: status,
      };
    });

    return NextResponse.json(products);
  } catch (error: any) {
    console.error('Shopify API Route Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch products' }, { status: 500 });
  }
}
