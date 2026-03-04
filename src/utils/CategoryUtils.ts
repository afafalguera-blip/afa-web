import type { TFunction } from 'i18next';

/**
 * Utility to centralize category translations and fallbacks
 */
export const CategoryUtils = {
  translate: (t: TFunction, category: string): string => {
    if (!category || category === 'all') return t('common.all');
    
    const cat = category.toLowerCase();
    const key = `admin.editor.categories.${cat}`;
    const translated = t(key as any);
    
    // If translation returns the key itself (no translation found)
    if (translated === key) {
      // Manual fallbacks for common category naming variations
      if (cat === 'sport' || cat === 'sports') return t('admin.editor.categories.sports');
      if (cat === 'music') return t('admin.editor.categories.music');
      if (cat === 'language' || cat === 'languages') return t('admin.editor.categories.languages');
      if (cat === 'art' || cat === 'artistic') return t('admin.editor.categories.artistic');
      if (cat === 'education' || cat === 'educational') return t('admin.editor.categories.educational');

      // Ultimate fallback: Capitalize
      return category.charAt(0).toUpperCase() + category.slice(1);
    }
    
    return translated as string;
  }
};
