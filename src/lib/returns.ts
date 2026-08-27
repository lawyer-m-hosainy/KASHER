import { SaleItem, SaleReturn } from '../types';

// Caps returnable quantity per product at (original qty - already returned
// qty), so a sale can be partially returned across several separate return
// transactions without ever refunding more than was originally sold.
export function computeRemainingReturnableQty(
  saleItems: SaleItem[],
  priorReturns: Pick<SaleReturn, 'items'>[]
): Record<string, number> {
  const alreadyReturned: Record<string, number> = {};
  for (const ret of priorReturns) {
    for (const item of ret.items) {
      alreadyReturned[item.productId] = (alreadyReturned[item.productId] || 0) + item.qty;
    }
  }

  const remaining: Record<string, number> = {};
  for (const item of saleItems) {
    const used = alreadyReturned[item.productId] || 0;
    remaining[item.productId] = Math.max(0, item.qty - used);
  }
  return remaining;
}
