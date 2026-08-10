import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Modal } from '../components/common/Modal';

afterEach(cleanup);

/**
 * El Modal es la base de todo el panel de admin. Sus reglas de accesibilidad
 * (foco atrapado, Escape, foco devuelto al cerrar) no se ven en pantalla: se
 * rompen en silencio y solo lo nota quien navega con teclado o lector.
 */
function openModal(props: Partial<React.ComponentProps<typeof Modal>> = {}) {
  const onClose = vi.fn();
  const view = render(
    <Modal open onClose={onClose} title="Editar recibo" {...props}>
      <button type="button">Primero</button>
      <button type="button">Segundo</button>
    </Modal>,
  );
  return { onClose, ...view };
}

describe('Modal — semántica', () => {
  it('se anuncia como diálogo modal etiquetado por su título', () => {
    openModal();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Editar recibo');
  });

  it('no pinta nada cuando está cerrado', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Editar recibo">
        <button type="button">Primero</button>
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('se monta en el body, fuera del árbol del padre', () => {
    const { container } = openModal();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('pinta el pie solo si se le pasa', () => {
    const { rerender } = openModal();
    expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull();

    rerender(
      <Modal open onClose={vi.fn()} title="Editar recibo" footer={<button>Guardar</button>}>
        <button type="button">Primero</button>
      </Modal>,
    );
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });
});

describe('Modal — cierre', () => {
  it('cierra con Escape', () => {
    const { onClose } = openModal();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cierra al pulsar el fondo', () => {
    const { onClose } = openModal();
    fireEvent.click(document.querySelector('[aria-hidden="true"]')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('no cierra por el fondo si se desactiva', () => {
    // Los formularios largos lo desactivan para no perder lo escrito de un clic.
    const { onClose } = openModal({ closeOnBackdrop: false });
    fireEvent.click(document.querySelector('[aria-hidden="true"]')!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('cierra con el botón de aspa', () => {
    const { onClose } = openModal();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

/**
 * Orden real de tabulación dentro del diálogo: el aspa de cerrar va en la
 * cabecera, así que es el PRIMER elemento enfocable; el último es el final del
 * contenido. Los tests se escriben contra ese orden, no contra la intuición.
 */
describe('Modal — foco', () => {
  it('lleva el foco dentro al abrirse', async () => {
    openModal();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    });
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement | null);
  });

  it('respeta el elemento inicial que se le indique', async () => {
    const ref = { current: null } as React.RefObject<HTMLElement | null>;
    render(
      <Modal open onClose={vi.fn()} title="Editar recibo" initialFocusRef={ref}>
        <button type="button">Primero</button>
        <button type="button" ref={ref as React.RefObject<HTMLButtonElement>}>
          Segundo
        </button>
      </Modal>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Segundo' })).toHaveFocus();
    });
  });

  it('devuelve el foco a quien lo abrió', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Abrir';
    document.body.appendChild(opener);
    opener.focus();

    const { unmount } = openModal();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus());

    unmount();

    // Sin esto, al cerrar un diálogo el foco vuelve al <body> y quien navega con
    // teclado tiene que recorrer la página entera otra vez.
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it('Tab desde el último elemento vuelve al primero', () => {
    openModal();
    const ultimo = screen.getByRole('button', { name: 'Segundo' });

    ultimo.focus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' });

    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('Shift+Tab desde el primero salta al último', () => {
    openModal();
    const primero = screen.getByRole('button', { name: 'Close' });

    primero.focus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true });

    expect(screen.getByRole('button', { name: 'Segundo' })).toHaveFocus();
  });

  it('el foco no se escapa a la página de detrás', () => {
    const fuera = document.createElement('button');
    document.body.appendChild(fuera);
    openModal();

    fuera.focus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' });

    expect(fuera).not.toHaveFocus();
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement | null);
    fuera.remove();
  });
});

describe('Modal — bloqueo del scroll', () => {
  it('bloquea el scroll del fondo mientras está abierto y lo restaura al cerrar', () => {
    document.body.style.overflow = '';
    const { unmount } = openModal();
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('con modales anidados, cerrar el interior no desbloquea la página', () => {
    document.body.style.overflow = '';

    const exterior = render(
      <Modal open onClose={vi.fn()} title="Exterior">
        <button type="button">Fuera</button>
      </Modal>,
    );
    const interior = render(
      <Modal open onClose={vi.fn()} title="Interior">
        <button type="button">Dentro</button>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe('hidden');

    interior.unmount();
    expect(document.body.style.overflow).toBe('hidden');

    exterior.unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
