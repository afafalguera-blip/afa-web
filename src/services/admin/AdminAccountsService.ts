import { supabase } from '../../lib/supabase';
import { normalizeName } from '../../utils/bankStatement';
import { PAYMENT_CONCEPTS, type PaymentConcept } from '../../types/payment';

/**
 * "Estado de cuentas": what every family owes, across the four billable
 * concepts and the shop, in one screen.
 *
 * Aggregated in the browser rather than in SQL because the source rows are
 * already the ones the payments panel reads, and a view would need a migration
 * for every column the panel later wants. A cohort is ~76 pupils * 4 concepts *
 * 10 months, so a few thousand rows: two paged selects.
 *
 * Identity is the same text the receipts carry: the family is `parent_name`
 * normalized, the pupil is name+surname+course. That is what `payments` has,
 * and — not by chance — the same key the bank reconciliation learns aliases
 * against, so a family matched from an extract is the family shown here. When
 * the padró (`children` / `child_enrollments`) becomes the census of record,
 * `childKey` is the seam to move onto `children.id`.
 */

export interface ConceptStatus {
  pending: number;
  pendingCount: number;
  paid: number;
  paidCount: number;
  /** Earliest unpaid due date, ISO. Null when nothing is owed. */
  oldestDue: string | null;
  /** An unpaid receipt whose due date has passed. */
  overdue: boolean;
}

export type ConceptKey = PaymentConcept | 'botiga';

export interface ChildAccount {
  key: string;
  name: string;
  surname: string;
  course: string;
  /** Billable activities from the most recent extraescolar receipt. */
  activities: string[];
  concepts: Record<PaymentConcept, ConceptStatus>;
  pending: number;
}

export interface FamilyAccount {
  key: string;
  parentName: string;
  email: string | null;
  phone: string | null;
  member: boolean;
  children: ChildAccount[];
  /** Pending shop orders, which bill the family and not a single pupil. */
  shop: ConceptStatus;
  /** Everything still owed: receipts of every pupil plus the shop. */
  pending: number;
  /** Any unpaid receipt already past its due date. */
  overdue: boolean;
}

export interface AccountsSnapshot {
  families: FamilyAccount[];
  /** Sum of every family's debt. */
  pendingTotal: number;
  familiesInDebt: number;
  /** Pending orders that carry a name matching no family in this cohort. */
  orphanOrders: Array<{ id: string; customerName: string; amount: number; date: string }>;
}

export interface PaymentRow {
  student_name: string;
  student_surname: string;
  course: string;
  concept: PaymentConcept;
  activities: string[] | null;
  amount: number | string;
  due_date: string;
  status: string;
  parent_name: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  afa_member: boolean | null;
  payment_month: number;
  payment_year: number;
}

export interface OrderRow {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  total_amount: number | string;
  created_at: string | null;
  payment_status: string | null;
}

const PAGE = 1000;

/** PostgREST caps a select at 1000 rows; walk the ranges until a short page. */
async function fetchAll<T>(
  table: string,
  columns: string,
  academicYear: string,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq('academic_year', academicYear)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data || []) as unknown as T[];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

const emptyStatus = (): ConceptStatus => ({
  pending: 0,
  pendingCount: 0,
  paid: 0,
  paidCount: 0,
  oldestDue: null,
  overdue: false,
});

function emptyConcepts(): Record<PaymentConcept, ConceptStatus> {
  const out = {} as Record<PaymentConcept, ConceptStatus>;
  for (const { value } of PAYMENT_CONCEPTS) out[value] = emptyStatus();
  return out;
}

/** Fold one unpaid/paid row into a running status. */
function addToStatus(status: ConceptStatus, amount: number, dueDate: string, paid: boolean, today: string) {
  if (paid) {
    status.paid += amount;
    status.paidCount += 1;
    return;
  }
  status.pending += amount;
  status.pendingCount += 1;
  if (!status.oldestDue || dueDate < status.oldestDue) status.oldestDue = dueDate;
  if (dueDate < today) status.overdue = true;
}

const childKey = (r: { student_name: string; student_surname: string; course: string }) =>
  `${normalizeName(r.student_name)}|${normalizeName(r.student_surname)}|${normalizeName(r.course)}`;

export const AdminAccountsService = {
  /** Academic years that have receipts, newest first. */
  async listAcademicYears(): Promise<string[]> {
    const { data, error } = await supabase.from('payments').select('academic_year');
    if (error) throw error;
    const years = new Set<string>();
    for (const row of data || []) {
      const y = (row as { academic_year: string | null }).academic_year;
      if (y) years.add(y);
    }
    return [...years].sort().reverse();
  },

  async getSnapshot(academicYear: string): Promise<AccountsSnapshot> {
    const [payments, orders] = await Promise.all([
      fetchAll<PaymentRow>(
        'payments',
        'student_name, student_surname, course, concept, activities, amount, due_date, status, parent_name, parent_email, parent_phone, afa_member, payment_month, payment_year',
        academicYear,
      ),
      fetchAll<OrderRow>(
        'shop_orders',
        'id, customer_name, customer_email, total_amount, created_at, payment_status',
        academicYear,
      ),
    ]);

    return buildSnapshot(payments, orders);
  },
};

/**
 * The fold, kept apart from the fetching so it can be tested with plain rows:
 * this is the arithmetic a treasurer will trust before chasing anyone for money.
 */
export function buildSnapshot(
  payments: PaymentRow[],
  orders: OrderRow[],
  today: string = new Date().toISOString().slice(0, 10),
): AccountsSnapshot {
  const families = new Map<string, FamilyAccount>();
  const childrenByFamily = new Map<string, Map<string, ChildAccount>>();
  // Latest extraescolar receipt per pupil decides which activities to show.
  const latestActivityMonth = new Map<string, number>();

  for (const row of payments) {
    const parentName = (row.parent_name || '').trim();
    const famKey = normalizeName(parentName) || `__sense_familia__${childKey(row)}`;

    let family = families.get(famKey);
    if (!family) {
      family = {
        key: famKey,
        parentName: parentName || '(sense familiar)',
        email: row.parent_email || null,
        phone: row.parent_phone || null,
        member: !!row.afa_member,
        children: [],
        shop: emptyStatus(),
        pending: 0,
        overdue: false,
      };
      families.set(famKey, family);
      childrenByFamily.set(famKey, new Map());
    }
    family.email ||= row.parent_email || null;
    family.phone ||= row.parent_phone || null;
    family.member = family.member || !!row.afa_member;

    const kids = childrenByFamily.get(famKey)!;
    const cKey = childKey(row);
    let child = kids.get(cKey);
    if (!child) {
      child = {
        key: cKey,
        name: row.student_name,
        surname: row.student_surname,
        course: row.course,
        activities: [],
        concepts: emptyConcepts(),
        pending: 0,
      };
      kids.set(cKey, child);
    }

    const status = child.concepts[row.concept] ?? (child.concepts[row.concept] = emptyStatus());
    const amount = Number(row.amount) || 0;
    addToStatus(status, amount, row.due_date, row.status === 'paid', today);

    if (row.concept === 'extraescolar' && (row.activities?.length ?? 0) > 0) {
      const month = row.payment_year * 100 + row.payment_month;
      if (month >= (latestActivityMonth.get(cKey) ?? 0)) {
        latestActivityMonth.set(cKey, month);
        child.activities = row.activities!;
      }
    }
  }

  // Shop orders bill the family, so they hang off the family and not a pupil.
  const orphanOrders: AccountsSnapshot['orphanOrders'] = [];
  for (const order of orders) {
    if ((order.payment_status || 'pending') === 'paid') continue;
    const name = (order.customer_name || '').trim();
    const famKey = normalizeName(name);
    const family = families.get(famKey);
    const amount = Number(order.total_amount) || 0;
    const date = (order.created_at || '').slice(0, 10);

    if (!family) {
      orphanOrders.push({ id: order.id, customerName: name || '(sense nom)', amount, date });
      continue;
    }
    addToStatus(family.shop, amount, date || today, false, today);
  }

  let pendingTotal = 0;
  let familiesInDebt = 0;

  for (const family of families.values()) {
    family.children = [...childrenByFamily.get(family.key)!.values()].sort((a, b) =>
      `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`, 'ca'),
    );

    for (const child of family.children) {
      child.pending = Object.values(child.concepts).reduce((a, s) => a + s.pending, 0);
      family.overdue ||= Object.values(child.concepts).some(s => s.overdue);
    }

    family.pending =
      family.children.reduce((a, c) => a + c.pending, 0) + family.shop.pending;
    family.overdue ||= family.shop.overdue;

    pendingTotal += family.pending;
    if (family.pending > 0) familiesInDebt += 1;
  }

  const sorted = [...families.values()].sort(
    (a, b) => b.pending - a.pending || a.parentName.localeCompare(b.parentName, 'ca'),
  );

  return { families: sorted, pendingTotal, familiesInDebt, orphanOrders };
}
