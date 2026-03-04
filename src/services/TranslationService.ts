export interface TranslationResult {
  title: string;
  content?: string;
  excerpt?: string;
  description?: string;
  details?: string;
  impact?: string;
  participants?: string;
}

export const TranslationService = {
  /**
   * Traducción gratuita con protección de HTML mejorada.
   */
  async translateContent(
    source: TranslationResult,
    targetLang: string,
    sourceLang: string = 'es'
  ): Promise<TranslationResult> {
    
    const langMap: Record<string, string> = { 'ca': 'ca', 'es': 'es', 'en': 'en' };
    const sl = langMap[sourceLang] || 'auto';
    const tl = langMap[targetLang] || 'es';

    const translatedResult: TranslationResult = { ...source };

    for (const key of Object.keys(source) as (keyof TranslationResult)[]) {
      const text = source[key];
      if (!text || typeof text !== 'string' || text.trim() === '') continue;

      try {
        // --- PROTECCIÓN DE HTML ---
        // Extraemos las etiquetas HTML para que Google no las toque ni las rompa
        const placeholders: string[] = [];
        const protectedText = text.replace(/<[^>]+>/g, (match) => {
          placeholders.push(match);
          return ` [[${placeholders.length - 1}]] `;
        });

        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(protectedText)}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error en Google Translate');
        
        const data = await response.json();
        
        if (data && data[0]) {
          let translatedText = (data[0] as string[][]).map((part) => part[0]).join('');

          // --- RESTAURAR HTML ---
          // Volvemos a poner las etiquetas originales en su sitio
          placeholders.forEach((tag, i) => {
            const regex = new RegExp(`\\s?\\[\\[${i}\\]\\]\\s?`, 'g');
            translatedText = translatedText.replace(regex, tag);
          });

          // Limpieza final de guiones manuales que a veces mete la IA
          translatedText = translatedText.replace(/(\w)-\s+(\w)/g, '$1$2'); // quita sumar- vos -> sumarvos
          
          translatedResult[key] = translatedText;
        }
      } catch (error) {
        console.error(`Error en campo ${key}:`, error);
      }
    }

    return translatedResult;
  },

  async translateNews(source: TranslationResult, targetLang: string, sourceLang: string = 'es') {
    return this.translateContent(source, targetLang, sourceLang);
  }
};
