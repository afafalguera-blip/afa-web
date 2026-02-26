
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
