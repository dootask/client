import { openCache } from '../storage/cache';
import type { StructuredCache } from '../storage/types';

let pending: Promise<StructuredCache> | undefined;

export function openContactsCache(): Promise<StructuredCache> {
  return pending ??= openCache('dootask-contacts', { snapshots: { keyPath: 'owner' } }, 1);
}
