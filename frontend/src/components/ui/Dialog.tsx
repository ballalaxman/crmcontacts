import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../lib/cx';
import { Button, IconButton, type ButtonVariant } from './Button';
import { useFocusTrap } from './useFocusTrap';

export interface DialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Escape, the close button and a backdrop click call this. Omit it to force an explicit choice. */
  onClose?: () => void;
  /** alertdialog for confirmations that interrupt the user. */
  role?: 'dialog' | 'alertdialog';
  initialFocus?: RefObject<HTMLElement>;
  size?: 'sm' | 'md';
}

/**
 * Modal dialog: rendered in a portal, focus trapped and restored on close, page scroll locked,
 * labelled by its title and described by its description.
 */
export function Dialog(props: DialogProps) {
  if (!props.open) return null;
  return createPortal(<DialogPanel {...props} />, document.body);
}

function DialogPanel({ title, description, children, footer, onClose, role = 'dialog', initialFocus, size = 'md' }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useFocusTrap(panelRef, { initialFocus, onEscape: onClose });
  useBodyScrollLock();

  return (
    <div
      className="ui-dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cx('ui-dialog', `ui-dialog--${size}`)}
      >
        <div className="ui-dialog__header">
          <h2 id={titleId} className="ui-dialog__title">{title}</h2>
          {onClose && <IconButton icon="x" label="Close" size="sm" onClick={onClose} />}
        </div>
        {description && <div id={descriptionId} className="ui-dialog__description">{description}</div>}
        {children && <div className="ui-dialog__body">{children}</div>}
        {footer && <div className="ui-dialog__footer">{footer}</div>}
      </div>
    </div>
  );
}

function useBodyScrollLock() {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Yes/no question. Focus starts on Cancel and Escape cancels, so the safe answer is always the easy one. */
export function ConfirmDialog({
  open, title, description, confirmLabel, cancelLabel = 'Cancel', confirmVariant = 'primary', onConfirm, onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      open={open}
      role="alertdialog"
      size="sm"
      title={title}
      description={description}
      onClose={onCancel}
      initialFocus={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    />
  );
}
