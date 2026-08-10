/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';

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
