import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

/**
 * Humo de la pantalla: que pinte la familia, su deuda total y que al abrirla
 * aparezca el desglose por hijo. Sin esto, un error de JSX en una tabla que solo
 * se ve con datos reales no salta hasta que alguien entra en producción.
 */

const fixtures = vi.hoisted(() => ({
  payments: [
    {
      student_name: 'Eva', student_surname: 'Luque', course: '3PRI',
      concept: 'extraescolar', activities: ['Futbol'], amount: 54,
      due_date: '2026-09-05', status: 'pending',
      parent_name: 'Eva Luque Rodriguez', parent_email: 'eva@example.com',
      parent_phone: '600000000', afa_member: true, payment_month: 9, payment_year: 2026,
    },
    {
      student_name: 'Marc', student_surname: 'Luque', course: 'I5',
      concept: 'soci', activities: null, amount: 20,
      due_date: '2026-09-05', status: 'paid',
      parent_name: 'Eva Luque Rodriguez', parent_email: 'eva@example.com',
      parent_phone: '600000000', afa_member: true, payment_month: 9, payment_year: 2026,
    },
  ],
  orders: [
    {
      id: 'o1', customer_name: 'Eva Luque Rodriguez', customer_email: null,
      total_amount: 28, created_at: '2026-09-01T10:00:00Z', payment_status: 'pending',
    },
    {
      id: 'o2', customer_name: 'Ningú Coneixdut', customer_email: null,
      total_amount: 40, created_at: '2026-09-02T10:00:00Z', payment_status: 'pending',
    },
  ],
}));

vi.mock('../services/ConfigService', () => ({
  ConfigService: { getSeasonConfig: async () => ({ active_year: '2026-27' }) },
}));

vi.mock('../services/admin/AdminAccountsService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/admin/AdminAccountsService')>();
  return {
    ...actual,
    AdminAccountsService: {
      listAcademicYears: async () => ['2026-27'],
      getSnapshot: async () =>
        actual.buildSnapshot(
          fixtures.payments as never,
          fixtures.orders as never,
          '2026-09-10',
        ),
    },
  };
});

const { AccountsPage } = await import('../pages/admin/accounts/AccountsPage');

afterEach(cleanup);

describe('AccountsPage', () => {
  it('pinta la familia con su deuda y el desglose al desplegar', async () => {
    render(<AccountsPage />);

    const familia = await screen.findByText('Eva Luque Rodriguez');
    const fila = familia.closest('button')!;

    // 54 € de extraescolars del hijo + 28 € de un pedido de tienda de la familia.
    expect(fila).toHaveTextContent('82,00 €');
    expect(fila).toHaveTextContent('Extraescolares 54,00 €');
    expect(fila).toHaveTextContent('Tienda 28,00 €');
    expect(screen.getByText('Pendiente de cobro').parentElement).toHaveTextContent('82,00 €');

    // Cerrada, el desglose no está: los hijos se resumen en una línea.
    expect(screen.queryByText('Futbol')).not.toBeInTheDocument();

    fireEvent.click(familia);

    expect(screen.getByText('Futbol')).toBeInTheDocument();
    expect(screen.getByText('Eva Luque')).toBeInTheDocument();
    expect(screen.getByText('eva@example.com')).toBeInTheDocument();
  });

  it('aparta el pedido de tienda que no es de ninguna familia', async () => {
    render(<AccountsPage />);

    await screen.findByText('Eva Luque Rodriguez');
    expect(screen.getByText(/Pedidos de tienda sin familia \(1\)/)).toBeInTheDocument();
    expect(screen.getByText('Ningú Coneixdut')).toBeInTheDocument();
  });
});
