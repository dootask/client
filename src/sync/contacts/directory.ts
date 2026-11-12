import { createStore } from 'zustand/vanilla';

import type { Departments } from '../api/contacts';
import type { UserBasic } from '../api/users';
import type { StructuredCache } from '../storage/types';

export interface ContactsSnapshot {
  owner: string;
  users: UserBasic[];
  departments: Departments;
}

interface ContactsDeps {
  owner: string;
  cache: () => Promise<StructuredCache>;
  departments: () => Promise<Departments>;
  page: (page: number, key?: string) => Promise<{ data: UserBasic[]; current_page: number; last_page: number; total: number }>;
}

export function createContactsDirectory(deps: ContactsDeps) {
  const store = createStore<{ snapshot: ContactsSnapshot | null; loading: boolean }>(() => ({ snapshot: null, loading: false }));
  let stopped = false;
  let pending: Promise<void> | undefined;

  async function fetchUsers(key?: string): Promise<UserBasic[]> {
    const users = new Map<number, UserBasic>();
    for (let page = 1; !stopped; page++) {
      const data = await deps.page(page, key);
      if (stopped) return [];
      for (const user of data.data) users.set(user.userid, user);
      if (data.current_page >= data.last_page) break;
    }
    return [...users.values()];
  }

  async function load() {
    store.setState({ loading: true });
    try {
      if (!store.getState().snapshot) {
        const cached = await (await deps.cache()).get<ContactsSnapshot>('snapshots', deps.owner);
        if (stopped) return;
        if (cached) store.setState({ snapshot: cached });
      }
      const [departments, users] = await Promise.all([deps.departments(), fetchUsers()]);
      if (stopped) return;
      const snapshot = { owner: deps.owner, departments, users };
      store.setState({ snapshot });
      const cache = await deps.cache();
      if (stopped) return;
      await cache.put('snapshots', snapshot);
    } finally {
      if (!stopped) store.setState({ loading: false });
    }
  }

  function refresh(): Promise<void> {
    stopped = false;
    if (!pending) pending = load().finally(() => { pending = undefined; });
    return pending;
  }

  function stop() {
    stopped = true;
  }

  return { store, refresh, search: fetchUsers, stop };
}

export type ContactsDirectory = ReturnType<typeof createContactsDirectory>;
