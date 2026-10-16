/**
 * "Acting as" name sent as X-Actor. Demo-only (no auth): it labels activity entries so two tabs can be two users.
 *
 * sessionStorage, not localStorage: it is per tab. With localStorage, typing "User B" in a second tab would also
 * change who the first tab acts as (the name is read on every request), which defeats the two-tab conflict demo.
 */
export const ACTOR_KEY = 'crm.actor';

export function getStoredActor(): string | undefined {
  try {
    return sessionStorage.getItem(ACTOR_KEY)?.trim() || undefined;
  } catch {
    return undefined; // storage can be blocked (private mode); the app works without it
  }
}

export function storeActor(name: string) {
  try {
    if (name.trim()) sessionStorage.setItem(ACTOR_KEY, name);
    else sessionStorage.removeItem(ACTOR_KEY);
  } catch {
    /* ignore */
  }
}
