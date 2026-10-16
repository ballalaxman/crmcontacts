import { useId, useState } from 'react';
import { getStoredActor, storeActor } from '../../lib/actor';
import { Icon } from '../ui';

/**
 * "Acting as" name, kept per tab (sessionStorage) and sent as X-Actor on every request.
 * To demo a conflict: open two tabs, name them "User A" and "User B", edit the same contact in both, save B then A.
 */
export function ActorSwitcher() {
  const [name, setName] = useState(() => getStoredActor() ?? '');
  const id = useId();

  return (
    <div className="actor">
      <label htmlFor={id} className="actor__label">
        <Icon name="users" size="sm" />
        {/* Visually hidden on narrow screens (the icon and placeholder carry it), always read out. */}
        <span className="actor__text">Acting as</span>
      </label>
      <input
        id={id}
        className="ui-input actor__input"
        value={name}
        maxLength={50}
        placeholder="e.g. User A"
        autoComplete="off"
        onChange={(e) => {
          setName(e.target.value);
          storeActor(e.target.value);
        }}
      />
    </div>
  );
}
