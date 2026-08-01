import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../components/common/ConfirmDialog';

export interface DirtyGuard {
  /** Resolves true when it is safe to discard (not dirty, or user confirmed). */
  confirmDiscard: () => Promise<boolean>;
}

/**
 * Warns about unsaved changes on tab close (beforeunload) and exposes an
 * in-app confirmation for router navigation or tab switches.
 */
export function useDirtyGuard(isDirty: boolean, message?: string): DirtyGuard {
  const { t } = useTranslation();
  const confirm = useConfirm();

  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Browsers ignore custom text but still require a truthy returnValue.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const confirmDiscard = useCallback(async () => {
    if (!isDirty) return true;
    return confirm({
      title: t('admin.unsaved.title', 'Hi ha canvis sense desar'),
      message: message ?? t('admin.unsaved.message', 'Si continues, es perdran els canvis no desats.'),
      confirmLabel: t('admin.unsaved.discard', 'Descartar canvis'),
      destructive: true
    });
  }, [confirm, isDirty, message, t]);

  return { confirmDiscard };
}

export default useDirtyGuard;
