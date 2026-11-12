import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useStore } from 'zustand';

import { contactRows, departmentGroups, initialExpanded } from '../../sync/contacts/model';
import type { UserBasic } from '../../sync/api/users';
import { kv, KV_KEYS } from '../../sync/storage';
import { showToast } from '../../ui/Toast';
import { useErrorText, useSession } from '../session';
import { contactsOwner, contactsService } from './service';

const NO_USERS: UserBasic[] = [];

export function useContacts() {
  const owner = useSession(contactsOwner);
  const { directory, view: state } = useMemo(() => contactsService(owner), [owner]);
  const errorText = useErrorText();
  const snapshot = useStore(directory.store, (s) => s.snapshot);
  const mode = useStore(state, (s) => s.mode);
  const keyword = useStore(state, (s) => s.keyword);
  const setKeyword = useCallback((word: string) => state.setState({ keyword: word }), [state]);
  const [results, setResults] = useState<{ key: string; users: UserBasic[] } | null>(null);
  const departments = useMemo(() => snapshot ? departmentGroups(snapshot.departments) : [], [snapshot]);
  const expanded = useStore(state, (s) => s.expanded);
  const open = useMemo(() => expanded ?? initialExpanded(departments), [expanded, departments]);

  useFocusEffect(useCallback(() => {
    if (owner) void directory.refresh().catch((err) => showToast(errorText(err)));
  }, [directory, owner, errorText]));

  useFocusEffect(useCallback(() => {
    if (!keyword || !owner) return;
    let stale = false;
    directory.search(keyword).then((users) => {
      if (!stale) setResults({ key: keyword, users });
    }).catch((err) => { if (!stale) showToast(errorText(err)); });
    return () => { stale = true; };
  }, [directory, owner, keyword, errorText]));

  const users = useMemo(() => {
    const local = snapshot?.users ?? NO_USERS;
    if (results?.key !== keyword || !keyword) return local;
    return [...new Map([...local, ...results.users].map((user) => [user.userid, user])).values()];
  }, [snapshot, results, keyword]);
  const view = useMemo(() => contactRows(users, departments, open, mode, keyword), [users, departments, open, mode, keyword]);
  const toggleMode = useCallback(() => {
    const mode = state.getState().mode === 'letter' ? 'department' : 'letter';
    kv.set(KV_KEYS.contactsView(owner), mode);
    state.setState({ mode });
  }, [owner, state]);
  const toggleDepartment = useCallback((id: number) => {
    const expanded = new Set(state.getState().expanded ?? initialExpanded(departments));
    if (expanded.has(id)) expanded.delete(id);
    else expanded.add(id);
    state.setState({ expanded });
  }, [departments, state]);
  return { ...view, ready: !!snapshot, keyword, setKeyword, mode, toggleMode, toggleDepartment };
}
