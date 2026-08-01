/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Name of the record involved. Shown verbatim so the user knows WHAT is affected. */
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// Outside the provider we degrade to window.confirm instead of throwing so any
// component can adopt useConfirm() before the provider reaches its tree/tests.
const fallbackConfirm: ConfirmFn = (options) => {
  console.warn('useConfirm() used outside ConfirmProvider; falling back to window.confirm');
  const text = [options.title, options.itemName, options.message].filter(Boolean).join('\n');
  return Promise.resolve(window.confirm(text));
};

interface PendingRequest {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        setPending({ options, resolve });
      }),
    []
  );

  const settle = useCallback(
    (value: boolean) => {
      setPending((current) => {
        current?.resolve(value);
        return null;
      });
    },
    []
  );

  const options = pending?.options;
  const destructive = options?.destructive ?? false;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={pending !== null}
        onClose={() => settle(false)}
        title={options?.title ?? ''}
        size="sm"
        initialFocusRef={destructive ? cancelRef : undefined}
        footer={
          <>
            <button
              ref={cancelRef}
              type="button"
              onClick={() => settle(false)}
              className="px-3.5 py-2 rounded-md border border-neutral-300 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              {options?.cancelLabel ?? t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => settle(true)}
              className={`px-3.5 py-2 rounded-md text-[13px] font-medium text-white transition-colors ${
                destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-neutral-900 hover:bg-neutral-800'
              }`}
            >
              {options?.confirmLabel ?? t('common.confirm')}
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          {destructive && (
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-600" aria-hidden="true" />
          )}
          <div className="space-y-3 min-w-0">
            {options?.message && <p className="text-[13px] leading-5 text-neutral-600">{options.message}</p>}
            {options?.itemName && (
              <p className="px-3 py-2 rounded-md border border-neutral-200 bg-neutral-50 text-[13px] font-medium text-neutral-900 break-words">
                {options.itemName}
              </p>
            )}
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext) ?? fallbackConfirm;
}
