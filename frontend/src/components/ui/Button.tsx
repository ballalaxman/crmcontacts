import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';
import { Icon, type IconName } from './Icon';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

interface ButtonLook {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Full width. */
  block?: boolean;
}

/** The button look as a class name, for links that should look like buttons (react-router <Link>). */
export const buttonClassName = ({ variant = 'secondary', size = 'md', block = false }: ButtonLook = {}, extra?: string) =>
  cx('ui-btn', `ui-btn--${variant}`, size === 'sm' && 'ui-btn--sm', block && 'ui-btn--block', extra);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonLook {
  /** Shows a spinner and disables the button, so a pending action can't be fired twice. */
  loading?: boolean;
  icon?: IconName;
  iconEnd?: IconName;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, loading = false, icon, iconEnd, className, disabled, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClassName({ variant, size, block }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : icon && <Icon name={icon} size="sm" />}
      {children !== undefined && children !== null && <span className="ui-btn__label">{children}</span>}
      {iconEnd && !loading && <Icon name={iconEnd} size="sm" />}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  /** Required: an icon has no text, so this is the button's accessible name (and its hover hint). */
  label: string;
  variant?: Exclude<ButtonVariant, 'primary'>;
  size?: ButtonSize;
  loading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'ghost', size = 'md', loading = false, className, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx(buttonClassName({ variant, size }), 'ui-btn--icon', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : <Icon name={icon} size="sm" />}
    </button>
  );
});
