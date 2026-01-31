export interface TranslationResult {
  title: string;
  content?: string;
  excerpt?: string;
  description?: string;
}

export const TranslationService = {
  async translateContent(
    source: TranslationResult,
    targetLang: string,
    sourceLang: string = 'es'
  ): Promise<TranslationResult> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

    if (!apiKey) {
      console.warn('OpenAI API key not found. Returning source content.');
      return source;
    }

    const fieldsToTranslate = Object.entries(source)
      .filter(([_, value]) => value && typeof value === 'string' && value.trim() !== '')
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    if (!fieldsToTranslate) return source;

    const prompt = `
      Translate the following content from ${sourceLang} to ${targetLang}. 
      Return only a JSON object with the corresponding keys.
      Maintain the same tone and format.

      ${fieldsToTranslate}
    `;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: 'You are a professional translator for a school AFA (Associació de Famílies d\'Alumnes). Translate to Catalan, Spanish, or English as requested.' 
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.statusText}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);
      
      const translatedResult: TranslationResult = { ...source };
      for (const key in source) {
        if (result[key]) {
          (translatedResult as any)[key] = result[key];
        }
      }
      
      return translatedResult;
    } catch (error) {
      console.error('Translation failed:', error);
      return source;
    }
  },

  // Backward compatibility wrapper
  async translateNews(source: TranslationResult, targetLang: string, sourceLang: string = 'es') {
    return this.translateContent(source, targetLang, sourceLang);
  }
};
