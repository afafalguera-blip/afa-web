
export const SIZE_ORDER: Record<string, number> = {
  'Única': 0,
  'XS': 1,
  'S': 2,
  'M': 3,
  'L': 4,
  'XL': 5,
  'XXL': 6,
  'XXXL': 7,
  'XXS': 0.5,
};

export function sortSizes<T extends { size?: string }>(variants: T[]): T[] {
  return [...variants].sort((a, b) => {
    const sizeA = (a.size || '').trim();
    const sizeB = (b.size || '').trim();

    // Check if both are defined in the SIZE_ORDER map
    if (SIZE_ORDER[sizeA] !== undefined && SIZE_ORDER[sizeB] !== undefined) {
      return SIZE_ORDER[sizeA] - SIZE_ORDER[sizeB];
    }

    // Try to extract numbers (e.g., "38", "4-6y", "10")
    const numA = parseFloat(sizeA.match(/\d+/)?.[0] || '');
    const numB = parseFloat(sizeB.match(/\d+/)?.[0] || '');

    if (!isNaN(numA) && !isNaN(numB)) {
      if (numA !== numB) return numA - numB;
      // If numbers are the same, compare the full string for cases like "4y" vs "4a"
      return sizeA.localeCompare(sizeB);
    }

    // Fallback if one has a number and the other doesn't
    if (!isNaN(numA)) return -1;
    if (!isNaN(numB)) return 1;

    // Last fallback: just compare alphabetically
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

export function calculateChandalStock<T extends { id: string; name: string; variants?: any[] }>(products: T[]): T[] {
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

      if (matchingPants && matchingSweatshirt) {
        // Full tracksuit stock is the minimum of both
        const calculatedStock = Math.min(matchingPants.stock, matchingSweatshirt.stock);
        return { ...v, stock: calculatedStock, isCalculated: true };
      }
      return v;
    });

    return { ...p, variants: updatedVariants, isCalculated: true };
  });
}
