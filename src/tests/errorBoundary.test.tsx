import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

// vi.mock se iza al principio del fichero, asi que su factoria no puede leer
// una const normal. vi.hoisted sube la creacion del espia con ella.
const { reportar } = vi.hoisted(() => ({ reportar: vi.fn() }));
vi.mock('../core/errors/reporter', () => ({ reportarError: reportar }));

import { ErrorBoundary } from '../core/errors/ErrorBoundary';

function Explota({ falla }: { falla: boolean }) {
  if (falla) throw new Error('render roto');
  return <p>contenido</p>;
}

beforeEach(() => {
  reportar.mockClear();
  // React escribe el error en consola aunque lo captures; se silencia para que
  // la salida de los tests no parezca un fallo.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('deja pasar los hijos cuando no hay fallo', () => {
    render(
      <ErrorBoundary>
        <Explota falla={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('contenido')).toBeInTheDocument();
    expect(reportar).not.toHaveBeenCalled();
  });

  it('sustituye la pantalla en blanco por un mensaje con salida', () => {
    render(
      <ErrorBoundary>
        <Explota falla />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tornar-ho a provar/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /anar a l'inici/i })).toHaveAttribute('href', '/');
  });

  it('reporta el error con la zona', () => {
    render(
      <ErrorBoundary zona="portada">
        <Explota falla />
      </ErrorBoundary>,
    );

    expect(reportar).toHaveBeenCalledWith(
      'render',
      expect.objectContaining({ message: 'render roto' }),
      expect.objectContaining({ source: 'portada' }),
    );
  });

  it('el botón de reintentar vuelve a montar los hijos', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Explota falla />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Se arregla la causa y se pulsa reintentar: debe volver el contenido.
    rerender(
      <ErrorBoundary>
        <Explota falla={false} />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /tornar-ho a provar/i }));

    expect(screen.getByText('contenido')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('acepta un fallback a medida', () => {
    render(
      <ErrorBoundary fallback={<p>vaya</p>}>
        <Explota falla />
      </ErrorBoundary>,
    );
    expect(screen.getByText('vaya')).toBeInTheDocument();
  });
});
