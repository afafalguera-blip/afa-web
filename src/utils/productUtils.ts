import type { ShopVariant } from '../features/shop/types/shop';

export const SIZE_ORDER: Record<string, number> = {
  'XXS': 1,
  'XS': 2,
  'S': 3,
  'M': 4,
  'L': 5,
  'XL': 6,
  'XXL': 7,
  'XXXL': 8,
  'ÚNICA': 99, // Usually at the end if mixed with standard sizes
  'UNICA': 99,
};

export function sortSizes<T extends { size?: string }>(variants: T[]): T[] {
  return [...variants].sort((a, b) => {
    const sizeA = (a.size || '').trim().toUpperCase();
    const sizeB = (b.size || '').trim().toUpperCase();

    // 1. Both are in SIZE_ORDER map
    if (SIZE_ORDER[sizeA] !== undefined && SIZE_ORDER[sizeB] !== undefined) {
      return SIZE_ORDER[sizeA] - SIZE_ORDER[sizeB];
    }

    // 2. Try to extract numbers (e.g., "10", "12", "Anys 4")
    // We only consider it a numeric size if it contains digits
    const numMatchA = sizeA.match(/\d+/);
    const numMatchB = sizeB.match(/\d+/);
    
    const numA = numMatchA ? parseFloat(numMatchA[0]) : NaN;
    const numB = numMatchB ? parseFloat(numMatchB[0]) : NaN;

    if (!isNaN(numA) && !isNaN(numB)) {
      if (numA !== numB) return numA - numB;
      return sizeA.localeCompare(sizeB);
    }

    // 3. One is a number and the other is a predefined string size
    // Numbers (children sizes) always come before string sizes (adult sizes)
    if (!isNaN(numA) && SIZE_ORDER[sizeB] !== undefined) return -1;
    if (!isNaN(numB) && SIZE_ORDER[sizeA] !== undefined) return 1;

    // 4. One has a number and the other doesn't (and isn't in SIZE_ORDER)
    if (!isNaN(numA)) return -1;
    if (!isNaN(numB)) return 1;

    // 5. One is in SIZE_ORDER and the other is a random custom string
    if (SIZE_ORDER[sizeA] !== undefined) return -1;
    if (SIZE_ORDER[sizeB] !== undefined) return 1;

    // 6. Last fallback: alphabetical
    return sizeA.localeCompare(sizeB);
  });
}


// Chandal Stock Calculation Logic
export const isChandalPants = (name: string) => {
  const n = name.toLowerCase();
  return (n.includes('pantaló') && n.includes('xandall')) || (n.includes('pantalon') && n.includes('chandal'));
};

export const isChandalSweatshirt = (name: string) => {
  const n = name.toLowerCase();
  return (n.includes('sudadera') || n.includes('jaqueta')) && (n.includes('xandall') || n.includes('chandal'));
};

export const isChandalComplete = (name: string) => {
  const n = name.toLowerCase();
  return n.includes('complet') && (n.includes('xandall') || n.includes('chandal'));
};

export function calculateChandalStock<T extends { id: string; name: string; variants?: Partial<ShopVariant>[] }>(products: T[]): T[] {
  const pantsProduct = products.find(p => isChandalPants(p.name));
  const sweatshirtProduct = products.find(p => isChandalSweatshirt(p.name));
  const completeProduct = products.find(p => isChandalComplete(p.name));

  if (!pantsProduct || !sweatshirtProduct || !completeProduct) {
    return products;
  }

  return products.map(p => {
    if (p.id !== completeProduct.id) return p;

    // Update complete tracksuit variants
    const updatedVariants = p.variants?.map(v => {
      // Find same size in pants and sweatshirts
      const matchingPants = pantsProduct.variants?.find(pv => pv.size === v.size);
      const matchingSweatshirt = sweatshirtProduct.variants?.find(sv => sv.size === v.size);

      if (matchingPants && matchingSweatshirt && matchingPants.stock !== undefined && matchingSweatshirt.stock !== undefined) {
        // Full tracksuit stock is the minimum of both
        const calculatedStock = Math.min(matchingPants.stock, matchingSweatshirt.stock);
        return { ...v, stock: calculatedStock, isCalculated: true } as Partial<ShopVariant>;
      }
      return v;
    });

    return { ...p, variants: updatedVariants, isCalculated: true } as T;
  });
}
