import { describe, it, expect } from 'vitest';
import { computeRemainingReturnableQty } from './returns';
import { SaleItem, SaleReturn } from '../types';

const saleItems: SaleItem[] = [
  { productId: 'p1', name: 'Product 1', price: 10, qty: 5 },
  { productId: 'p2', name: 'Product 2', price: 20, qty: 2 },
];

const returnWith = (items: { productId: string; qty: number }[]): Pick<SaleReturn, 'items'> => ({
  items: items.map(i => ({ ...i, name: '', price: 0 })),
});

describe('computeRemainingReturnableQty', () => {
  it('returns the full original quantity when there are no prior returns', () => {
    const remaining = computeRemainingReturnableQty(saleItems, []);
    expect(remaining).toEqual({ p1: 5, p2: 2 });
  });

  it('subtracts a single prior return from the matching product', () => {
    const remaining = computeRemainingReturnableQty(saleItems, [
      returnWith([{ productId: 'p1', qty: 2 }]),
    ]);
    expect(remaining).toEqual({ p1: 3, p2: 2 });
  });

  it('accumulates multiple partial returns across separate transactions', () => {
    const remaining = computeRemainingReturnableQty(saleItems, [
      returnWith([{ productId: 'p1', qty: 2 }]),
      returnWith([{ productId: 'p1', qty: 1 }, { productId: 'p2', qty: 2 }]),
    ]);
    expect(remaining).toEqual({ p1: 2, p2: 0 });
  });

  it('never goes negative even if returns somehow exceed the original quantity', () => {
    const remaining = computeRemainingReturnableQty(saleItems, [
      returnWith([{ productId: 'p2', qty: 5 }]),
    ]);
    expect(remaining.p2).toBe(0);
  });
});
