import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { AdminTable, type AdminTableColumn } from '../components/admin/common/AdminTable';

afterEach(cleanup);

/**
 * La numeración de filas existe para responder de un vistazo «¿cuántas hay?».
 * Si volviera a empezar en 1 en cada página, la respuesta sería falsa justo
 * cuando importa: cuando hay más de una página.
 */
interface Fila {
  id: string;
  nombre: string;
}

const COLUMNAS: AdminTableColumn<Fila>[] = [
  { key: 'nombre', header: 'Nom', render: (row) => row.nombre },
];

const FILAS: Fila[] = [
  { id: 'a', nombre: 'Adriana' },
  { id: 'b', nombre: 'Bruno' },
  { id: 'c', nombre: 'Carla' },
];

function pintar(props: Partial<React.ComponentProps<typeof AdminTable<Fila>>> = {}) {
  return render(
    <AdminTable columns={COLUMNAS} rows={FILAS} keyExtractor={(row) => row.id} {...props} />,
  );
}

/** El texto de cada fila del cuerpo, en orden. */
function celdasDeLaPrimeraColumna(): string[] {
  const filas = screen.getAllByRole('row').slice(1);
  return filas.map((fila) => within(fila).getAllByRole('cell')[0].textContent ?? '');
}

describe('AdminTable — numeración de filas', () => {
  it('no numera si no se pide: la primera columna sigue siendo la de datos', () => {
    pintar();

    expect(screen.queryByRole('columnheader', { name: '#' })).toBeNull();
    expect(celdasDeLaPrimeraColumna()).toEqual(['Adriana', 'Bruno', 'Carla']);
  });

  it('numera desde 1 en la primera página', () => {
    pintar({ rowNumberStart: 1 });

    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(celdasDeLaPrimeraColumna()).toEqual(['1', '2', '3']);
  });

  it('sigue contando en la segunda página en vez de volver a empezar', () => {
    // Página 2 de 25 en 25: la primera fila es la 26 del listado entero.
    pintar({ rowNumberStart: 26 });

    expect(celdasDeLaPrimeraColumna()).toEqual(['26', '27', '28']);
  });

  it('la fila de «sin resultados» ocupa también la columna del número', () => {
    pintar({ rows: [], rowNumberStart: 1, emptyMessage: 'Sense resultats' });

    expect(screen.getByText('Sense resultats')).toHaveAttribute('colspan', '2');
  });
});
