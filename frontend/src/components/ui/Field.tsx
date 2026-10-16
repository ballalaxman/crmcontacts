import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { cx } from '../../lib/cx';
import { Icon, type IconName } from './Icon';

interface FieldShellProps {
  label: ReactNode;
  /** Keep the label for screen readers but don't show it (e.g. a search box with a visible icon). */
  hideLabel?: boolean;
  hint?: ReactNode;
  error?: string;
  className?: string;
}

/** Wires label, hint and error to the control by id, so the error is read out when the field is focused. */
function useFieldIds(id: string | undefined, hint: ReactNode, error: string | undefined, describedBy?: string) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const hintId = hint && !error ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedByIds = [describedBy, hintId, errorId].filter(Boolean).join(' ') || undefined;
  return { controlId, hintId, errorId, describedByIds };
}

function FieldMessages({ hint, hintId, error, errorId }: { hint: ReactNode; hintId?: string; error?: string; errorId?: string }) {
  return (
    <>
      {hintId && <p id={hintId} className="ui-field__hint">{hint}</p>}
      {errorId && (
        <p id={errorId} className="ui-field__error">
          <Icon name="alert" size="sm" />
          {error}
        </p>
      )}
    </>
  );
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>, FieldShellProps {
  leadingIcon?: IconName;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hideLabel, hint, error, className, id, leadingIcon, 'aria-describedby': describedBy, ...input },
  ref,
) {
  const ids = useFieldIds(id, hint, error, describedBy);
  return (
    <div className={cx('ui-field', className)}>
      <label htmlFor={ids.controlId} className={cx('ui-field__label', hideLabel && 'sr-only')}>{label}</label>
      <div className={cx('ui-control', leadingIcon && 'ui-control--icon')}>
        {leadingIcon && <Icon name={leadingIcon} size="sm" className="ui-control__icon" />}
        <input
          ref={ref}
          id={ids.controlId}
          className="ui-input"
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.describedByIds}
          {...input}
        />
      </div>
      <FieldMessages hint={hint} hintId={ids.hintId} error={error} errorId={ids.errorId} />
    </div>
  );
});

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'>, FieldShellProps {
  options: readonly { value: string; label: string }[];
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, hideLabel, hint, error, className, id, options, 'aria-describedby': describedBy, ...select },
  ref,
) {
  const ids = useFieldIds(id, hint, error, describedBy);
  return (
    <div className={cx('ui-field', className)}>
      <label htmlFor={ids.controlId} className={cx('ui-field__label', hideLabel && 'sr-only')}>{label}</label>
      <div className="ui-control ui-control--select">
        <select
          ref={ref}
          id={ids.controlId}
          className="ui-input ui-select"
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.describedByIds}
          {...select}
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Icon name="chevronDown" size="sm" className="ui-control__chevron" />
      </div>
      <FieldMessages hint={hint} hintId={ids.hintId} error={error} errorId={ids.errorId} />
    </div>
  );
});

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hideLabel?: boolean;
  /** The "some but not all" state of a select-all box. */
  indeterminate?: boolean;
}

/** A checkbox with a 40px hit area, even though the box itself is drawn smaller. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, hideLabel, indeterminate = false, className, ...input },
  ref,
) {
  const inner = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inner.current as HTMLInputElement);
  useEffect(() => {
    if (inner.current) inner.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label className={cx('ui-checkbox', className)}>
      <input ref={inner} type="checkbox" className="ui-checkbox__input" {...input} />
      <span className={hideLabel ? 'sr-only' : 'ui-checkbox__label'}>{label}</span>
    </label>
  );
});

interface SegmentedControlProps<T extends string> {
  legend: string;
  name: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  hideLegend?: boolean;
}

/** Mutually exclusive choice drawn as joined buttons; native radios underneath, so arrow keys work. */
export function SegmentedControl<T extends string>({ legend, name, value, options, onChange, hideLegend }: SegmentedControlProps<T>) {
  return (
    <fieldset className="ui-segmented">
      <legend className={hideLegend ? 'sr-only' : 'ui-field__label'}>{legend}</legend>
      <div className="ui-segmented__options">
        {options.map((o) => (
          <label key={o.value} className="ui-segmented__option">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="ui-segmented__input"
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
