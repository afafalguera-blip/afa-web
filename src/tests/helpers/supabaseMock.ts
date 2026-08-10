/**
 * Doble de pruebas del cliente de Supabase.
 *
 * Los servicios no solo devuelven datos: construyen la consulta. Un `neq` que
 * falta o un `or` mal montado no rompe nada visible, simplemente devuelve las
 * filas equivocadas — y en `payments` eso son recibos de familias reales.
 *
 * Por eso el mock no se limita a responder: **registra cada operación** de la
 * cadena para poder afirmar sobre ella.
 *
 * Uso desde un test:
 *
 *   vi.mock('../lib/supabase', async () => {
 *     const { createSupabaseMock } = await import('./helpers/supabaseMock');
 *     const mock = createSupabaseMock();
 *     return { supabase: mock.client, __supabaseMock: mock };
 *   });
 */

export interface RecordedOp {
  op: string;
  args: unknown[];
}

export interface RecordedQuery {
  kind: 'from' | 'rpc';
  /** Nombre de la tabla o de la función RPC. */
  name: string;
  ops: RecordedOp[];
  /** Azúcar: `eq('status', 'paid')` → `{ 'eq:status': 'paid' }`. */
  arg(op: string, column: string): unknown;
  /** Todos los argumentos de la primera llamada a `op`, o undefined. */
  first(op: string): unknown[] | undefined;
  has(op: string): boolean;
}

export interface MockResponse {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}

/** Métodos de PostgrestFilterBuilder que devuelven el propio builder. */
const CHAINABLE = [
  'select', 'insert', 'update', 'upsert', 'delete',
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
  'like', 'ilike', 'is', 'in', 'contains', 'containedBy',
  'or', 'not', 'filter', 'match',
  'order', 'limit', 'range', 'single', 'maybeSingle', 'csv', 'throwOnError',
] as const;

const EMPTY: MockResponse = { data: [], error: null, count: 0 };

export interface SupabaseMock {
  client: unknown;
  /** Consultas ejecutadas, en orden. */
  queries: RecordedQuery[];
  /** Encola una respuesta para la siguiente consulta a esa tabla/RPC. */
  queue(name: string, response: MockResponse): void;
  /** Respuesta fija para todas las consultas a esa tabla/RPC. */
  always(name: string, response: MockResponse): void;
  /** Consultas sobre una tabla/RPC concreta. */
  on(name: string): RecordedQuery[];
  reset(): void;
}

/**
 * Instancia única colgada de globalThis.
 *
 * Los servicios que cachean estado entre llamadas (p. ej. la tabla detectada en
 * AdminInscriptionsService) obligan a usar `vi.resetModules()` entre tests, y
 * eso vuelve a evaluar la factoría de `vi.mock`. Sin este singleton, cada reset
 * crearía un mock nuevo y el test perdería la referencia al que usa el servicio.
 */
export function getSharedSupabaseMock(): SupabaseMock {
  const store = globalThis as typeof globalThis & { __afaSupabaseMock?: SupabaseMock };
  store.__afaSupabaseMock ??= createSupabaseMock();
  return store.__afaSupabaseMock;
}

export function createSupabaseMock(): SupabaseMock {
  let queries: RecordedQuery[] = [];
  let queued = new Map<string, MockResponse[]>();
  let fixed = new Map<string, MockResponse>();

  const takeResponse = (name: string): MockResponse => {
    const pending = queued.get(name);
    if (pending && pending.length > 0) return pending.shift()!;
    return fixed.get(name) ?? EMPTY;
  };

  const record = (kind: 'from' | 'rpc', name: string): RecordedQuery => {
    const query: RecordedQuery = {
      kind,
      name,
      ops: [],
      arg(op, column) {
        return query.ops.find((o) => o.op === op && o.args[0] === column)?.args[1];
      },
      first(op) {
        return query.ops.find((o) => o.op === op)?.args;
      },
      has(op) {
        return query.ops.some((o) => o.op === op);
      },
    };
    queries.push(query);
    return query;
  };

  const makeBuilder = (query: RecordedQuery) => {
    // `any` deliberado: imitamos un builder encadenable de PostgREST, cuyo tipo
    // real es recursivo y no aporta nada dentro del doble de pruebas.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {};

    for (const op of CHAINABLE) {
      builder[op] = (...args: unknown[]) => {
        query.ops.push({ op, args });
        return builder;
      };
    }

    // Thenable: `await supabase.from('x').select()` resuelve aquí.
    builder.then = (
      onFulfilled?: (value: MockResponse) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(takeResponse(query.name)).then(onFulfilled, onRejected);

    return builder;
  };

  const client = {
    from(table: string) {
      return makeBuilder(record('from', table));
    },
    rpc(name: string, params?: unknown) {
      const query = record('rpc', name);
      query.ops.push({ op: 'params', args: [params] });
      return makeBuilder(query);
    },
  };

  return {
    client,
    get queries() {
      return queries;
    },
    queue(name, response) {
      const pending = queued.get(name) ?? [];
      pending.push(response);
      queued.set(name, pending);
    },
    always(name, response) {
      fixed.set(name, response);
    },
    on(name) {
      return queries.filter((q) => q.name === name);
    },
    reset() {
      queries = [];
      queued = new Map();
      fixed = new Map();
    },
  };
}
