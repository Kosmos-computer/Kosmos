/**
 * In-flight profile activity — Agents app “running” status without polling
 * private session lanes. Refcounted so nested/overlapping turns stay marked.
 */
const busy = new Map<string, number>();

export function beginProfileActivity(profileId: string): void {
  if (!profileId) return;
  busy.set(profileId, (busy.get(profileId) ?? 0) + 1);
}

export function endProfileActivity(profileId: string): void {
  if (!profileId) return;
  const next = (busy.get(profileId) ?? 0) - 1;
  if (next <= 0) busy.delete(profileId);
  else busy.set(profileId, next);
}

export function listBusyProfileIds(): string[] {
  return [...busy.keys()];
}

export function isProfileBusy(profileId: string): boolean {
  return (busy.get(profileId) ?? 0) > 0;
}

/** Run `task` while marking `profileId` as active. */
export async function withProfileActivity<T>(
  profileId: string | undefined | null,
  task: () => Promise<T>,
): Promise<T> {
  if (profileId) beginProfileActivity(profileId);
  try {
    return await task();
  } finally {
    if (profileId) endProfileActivity(profileId);
  }
}
