import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  /** Optional element to focus on open instead of the first focusable child. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

// Nested modals share one body-scroll lock: only the outermost unlock restores
// the original overflow, otherwise closing an inner dialog unlocks the page.
let openModalCount = 0;
let previousBodyOverflow = '';

function getFocusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  initialFocusRef
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    if (openModalCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    openModalCount += 1;
    return () => {
      openModalCount -= 1;
      if (openModalCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const raf = window.requestAnimationFrame(() => {
      const target = initialFocusRef?.current ?? getFocusable(panelRef.current)[0] ?? panelRef.current;
      target?.focus();
    });
    return () => {
      window.cancelAnimationFrame(raf);
      restoreFocusRef.current?.focus?.();
    };
  }, [open, initialFocusRef]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const nodes = getFocusable(panelRef.current);
      if (nodes.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      const inside = panelRef.current?.contains(active) ?? false;

      if (event.shiftKey && (!inside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onKeyDown={handleKeyDown}
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative w-full ${SIZE_CLASS[size]} bg-white border border-neutral-200 rounded-t-lg sm:rounded-lg max-h-[92vh] flex flex-col focus:outline-none`}
      >
        <div className="flex items-start gap-4 px-5 py-4 border-b border-neutral-200">
          <h2 id={titleId} className="flex-1 text-[15px] font-semibold text-neutral-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-0.5 p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-neutral-700">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-neutral-200 bg-neutral-50 rounded-b-lg">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
