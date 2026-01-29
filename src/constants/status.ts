/**
 * @fileoverview Constants for status values
 * Avoids magic strings throughout the application
 */

/** Inscription status values */
export const INSCRIPTION_STATUS = {
  ACTIVE: 'active',
  BAJA: 'baja',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
} as const;

/** Filter options for status dropdown */
export const STATUS_FILTER = {
  ALL: 'all',
  ACTIVE: 'active',
  BAJA: 'baja',
} as const;

/** Payment status values */
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

/** Order status values */
export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
