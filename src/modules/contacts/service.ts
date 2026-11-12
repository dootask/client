import { createStore, type StoreApi } from 'zustand/vanilla';

import { contactsApi, usersApi } from '../../sync/api';
import { kv, KV_KEYS } from '../../sync/storage';
import { openContactsCache } from '../../sync/contacts/cache';
import { createContactsDirectory, type ContactsDirectory } from '../../sync/contacts/directory';
import { api, useSession, type SessionState } from '../session';
import { useContactsDialog } from './navigation';

export const contactsOwner = (state: SessionState) => state.user && state.token && !state.outdated ? `${state.server}|${state.user.userid}` : '';

interface ContactsView {
  mode: 'letter' | 'department';
  keyword: string;
  expanded: Set<number> | null;
}

let active: { owner: string; directory: ContactsDirectory; view: StoreApi<ContactsView> } | undefined;

useSession.subscribe((state) => {
  if (!active || contactsOwner(state) === active.owner) return;
  const previous = active;
  active = undefined;
  previous.directory.stop();
  useContactsDialog.setState({ dialogId: 0 });
  void openContactsCache().then((cache) => cache.delete('snapshots', previous.owner)).catch(console.warn);
});

export function contactsService(owner: string) {
  if (active?.owner === owner) return active;
  active?.directory.stop();
  const directory = createContactsDirectory({ owner, cache: openContactsCache, departments: () => contactsApi.departments(api), page: (page, key) => usersApi.memberPage(api, { page, key }) });
  const view = createStore<ContactsView>(() => ({ mode: kv.getString(KV_KEYS.contactsView(owner)) === 'department' ? 'department' : 'letter', keyword: '', expanded: null }));
  active = { owner, directory, view };
  return active;
}
