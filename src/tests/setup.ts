/// <reference types="vitest/globals" />
// jest-dom 7 dejó de augmentar Vitest desde la raíz del paquete: sin el sufijo
// /vitest los matchers existen en tiempo de ejecución pero no en los tipos.
import '@testing-library/jest-dom/vitest';

// jsdom no calcula layout, así que `offsetParent` es null hasta para elementos
// perfectamente visibles. El Modal lo usa para descartar lo oculto al atrapar el
// foco, y sin este apaño su trampa de foco parece vacía en los tests aunque
// funcione en el navegador. Se aproxima: conectado al documento = visible.
Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
  configurable: true,
  get(this: HTMLElement) {
    return this.isConnected ? (this.parentElement ?? document.body) : null;
  },
});
