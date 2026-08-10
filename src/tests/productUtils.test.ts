import { describe, expect, it } from 'vitest';
import { calculateChandalStock, sortSizes } from '../utils/productUtils';

describe('sortSizes', () => {
  const sizes = (list: string[]) => sortSizes(list.map(size => ({ size }))).map(v => v.size);

  it('ordena las tallas de adulto por convención, no alfabéticamente', () => {
    expect(sizes(['XL', 'S', 'M', 'XXS'])).toEqual(['XXS', 'S', 'M', 'XL']);
  });

  it('ordena numéricamente las tallas infantiles', () => {
    expect(sizes(['12', '4', '10'])).toEqual(['4', '10', '12']);
  });

  it('pone las tallas infantiles antes que las de letra', () => {
    expect(sizes(['M', '8', 'S'])).toEqual(['8', 'S', 'M']);
  });

  it('deja "única" al final', () => {
    expect(sizes(['ÚNICA', 'S', 'M'])).toEqual(['S', 'M', 'ÚNICA']);
  });

  it('normaliza mayúsculas y espacios sobrantes', () => {
    expect(sizes([' m ', 's'])).toEqual(['s', ' m ']);
  });

  it('no muta el array recibido', () => {
    const original = [{ size: 'XL' }, { size: 'S' }];
    sortSizes(original);
    expect(original.map(v => v.size)).toEqual(['XL', 'S']);
  });

  it('tolera variantes sin talla', () => {
    expect(() => sortSizes([{ size: undefined }, { size: 'M' }])).not.toThrow();
  });
});

describe('calculateChandalStock', () => {
  const catalogo = () => [
    {
      id: 'pants',
      name: 'Pantaló xandall',
      variants: [
        { size: 'S', stock: 5 },
        { size: 'M', stock: 2 },
      ],
    },
    {
      id: 'sweat',
      name: 'Sudadera xandall',
      variants: [
        { size: 'S', stock: 3 },
        { size: 'M', stock: 7 },
      ],
    },
    {
      id: 'full',
      name: 'Xandall complet',
      variants: [
        { size: 'S', stock: 99 },
        { size: 'M', stock: 99 },
      ],
    },
  ];

  it('calcula el stock del conjunto como el mínimo de sus piezas', () => {
    const result = calculateChandalStock(catalogo());
    const full = result.find(p => p.id === 'full')!;

    expect(full.variants).toEqual([
      { size: 'S', stock: 3, isCalculated: true },
      { size: 'M', stock: 2, isCalculated: true },
    ]);
  });

  it('no toca las piezas sueltas', () => {
    const result = calculateChandalStock(catalogo());
    expect(result.find(p => p.id === 'pants')!.variants).toEqual([
      { size: 'S', stock: 5 },
      { size: 'M', stock: 2 },
    ]);
  });

  it('devuelve el catálogo intacto si falta alguna de las tres piezas', () => {
    const sinConjunto = catalogo().filter(p => p.id !== 'full');
    expect(calculateChandalStock(sinConjunto)).toEqual(sinConjunto);
  });

  it('deja la talla sin tocar si no existe en las dos piezas', () => {
    const productos = catalogo();
    productos[2].variants.push({ size: 'XL', stock: 42 });

    const full = calculateChandalStock(productos).find(p => p.id === 'full')!;
    expect(full.variants).toContainEqual({ size: 'XL', stock: 42 });
  });
});
