import { useEffect, useRef, useState } from 'react';
import { TextField, type IconName } from '../../../components/ui';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';

interface DebouncedFieldProps {
  /** The committed value (from the URL). */
  value: string;
  /** Called once the user stops typing. */
  onCommit: (value: string) => void;
  label: string;
  hideLabel?: boolean;
  placeholder?: string;
  type?: 'search' | 'text';
  icon?: IconName;
  maxLength?: number;
  className?: string;
}

/**
 * A text box that keeps what you type locally and commits it after a pause, so the URL (and the request)
 * changes once per pause, not once per keystroke. If `value` changes from outside (e.g. "Clear filters" or
 * the back button), the box follows it without clobbering text that was just typed.
 */
export function DebouncedField({ value, onCommit, label, hideLabel, placeholder, type = 'text', icon, maxLength, className }: DebouncedFieldProps) {
  const [text, setText] = useState(value);
  const committed = useRef(value); // the last value both sides agreed on
  const onCommitRef = useRef(onCommit);
  const debounced = useDebouncedValue(text);

  useEffect(() => {
    onCommitRef.current = onCommit;
  });

  useEffect(() => {
    if (value !== committed.current) {
      committed.current = value;
      setText(value);
    }
  }, [value]);

  useEffect(() => {
    if (debounced !== committed.current) {
      committed.current = debounced;
      onCommitRef.current(debounced);
    }
  }, [debounced]);

  return (
    <TextField
      className={className}
      label={label}
      hideLabel={hideLabel}
      type={type}
      leadingIcon={icon}
      value={text}
      placeholder={placeholder}
      maxLength={maxLength}
      autoComplete="off"
      onChange={(e) => setText(e.target.value)}
    />
  );
}
