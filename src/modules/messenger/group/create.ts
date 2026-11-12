import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useT } from '../../../i18n';
import { ApiError, usersApi } from '../../../sync/api';
import { BASIC_BATCH, type UserBasic } from '../../../sync/api/users';
import { showToast } from '../../../ui/Toast';
import { api, useErrorText, useSession } from '../../session';
import { useGroupActions, useMessenger } from '../hooks';
import { isGroup, type Picked, type PickUser, recentsOf } from '../picker/pickerData';
import { pickAvatar } from './pickImages';

/** 自己由群操作加入，不占选择器的 100 人额度。 */
export const MAX_CREATE_MEMBERS = 100;
export type CreateGroupParams = { userids?: string | string[] };
export type CreateGroupResult = { dialogId: number; msg: string };

export const CREATE_GROUP_MODAL_OPTIONS = {
  presentation: 'transparentModal',
  animation: 'none',
  gestureEnabled: false,
  contentStyle: { backgroundColor: 'transparent' },
} as const;

export function closeCreateGroupRoute() {
  if (router.canGoBack()) router.back();
  else router.replace('/messenger');
}

/** 退出建群并打开新会话，避免返回时再次落到已提交的表单。 */
export function openCreatedGroup({ dialogId, msg }: CreateGroupResult) {
  router.dismissTo({ pathname: '/messenger/[dialogId]', params: { dialogId: String(dialogId) } });
  if (msg) showToast(msg);
}

function toPicked(user: UserBasic): PickUser {
  return {
    userid: user.userid,
    nickname: user.nickname,
    userimg: user.userimg ?? '',
    bot: !!user.bot,
    sub: user.department_name || user.profession || user.email || '',
    az: user.az ?? '',
  };
}

function memberIds(value: string, self: number): number[] {
  const ids = value.split(/[,\s\[\]]+/).map(Number).filter((id) => Number.isSafeInteger(id) && id > 0 && id !== self);
  return [...new Set(ids)].slice(0, MAX_CREATE_MEMBERS);
}

/** 两端共用建群状态；名称用 ref 收集，输入状态留在输入组件，不带动成员列表重渲染。 */
export function useCreateGroup({ userids }: CreateGroupParams, onCreated: (result: CreateGroupResult) => void) {
  const t = useT();
  const errorText = useErrorText();
  const actions = useGroupActions();
  const messenger = useMessenger();
  const self = useSession((s) => s.user?.userid ?? 0);
  const rawIds = Array.isArray(userids) ? userids.join(',') : userids ?? '';
  const ids = useMemo(() => memberIds(rawIds, self), [rawIds, self]);
  const [selection, setSelection] = useState<PickUser[]>(() => {
    if (!ids.length) return [];
    // 首屏复用单聊缓存；只在打开时取快照，不订阅整张会话表。
    const recentUsers = recentsOf(messenger?.store.getState().dialogs ?? {}).filter((item): item is PickUser => !isGroup(item));
    const known = new Map(recentUsers.map((item) => [item.userid, item]));
    return ids.map((userid) => known.get(userid) ?? { userid, nickname: '', userimg: '', bot: false, sub: '', az: '' });
  });
  const selected = useMemo(() => selection.filter((item) => item.userid !== self), [selection, self]);
  const disabledIds = useMemo(() => [self], [self]);
  const [image64, setImage64] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [avatarPicking, setAvatarPicking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const name = useRef('');
  const submitting = useRef(false);
  const choosingAvatar = useRef(false);
  const alive = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    if (!ids.length) return;
    let stale = false;
    // users/basic 每批最多 50；只补齐还在表单里的预选项，不覆盖用户的增删。
    const batches: Promise<UserBasic[]>[] = [];
    for (let start = 0; start < ids.length; start += BASIC_BATCH) batches.push(usersApi.basic(api, ids.slice(start, start + BASIC_BATCH)));
    Promise.all(batches).then((lists) => {
      if (stale) return;
      const users = new Map(lists.flat().map((user) => [user.userid, toPicked(user)]));
      setSelection((current) => current.map((item) => users.get(item.userid) ?? item));
    }).catch((err: unknown) => { if (!stale && !submitting.current) setError(errorText(err)); });
    return () => { stale = true; };
  }, [ids, errorText]);

  const onNameChange = useCallback((value: string) => { name.current = value; }, []);
  const remove = useCallback((userid: number) => {
    if (!submitting.current) setSelection((current) => current.filter((item) => item.userid !== userid));
  }, []);
  const openPicker = useCallback(() => {
    if (!submitting.current) setPicking(true);
  }, []);
  const closePicker = useCallback(() => setPicking(false), []);
  const confirmMembers = useCallback((picked: Picked[]) => {
    const seen = new Set<number>();
    setSelection(picked.filter((item): item is PickUser => {
      if (isGroup(item) || item.userid === self || !Number.isSafeInteger(item.userid) || item.userid <= 0 || seen.has(item.userid)) return false;
      seen.add(item.userid);
      return true;
    }).slice(0, MAX_CREATE_MEMBERS));
    setPicking(false);
  }, [self]);
  const changeAvatar = useCallback(async () => {
    if (submitting.current || choosingAvatar.current) return;
    choosingAvatar.current = true;
    setAvatarPicking(true);
    setError('');
    try {
      const next = await pickAvatar();
      if (next && alive.current) setImage64(next);
    } catch (err: unknown) {
      if (alive.current) setError(err instanceof ApiError ? errorText(err) : t('messenger:group.create.failed'));
    } finally {
      choosingAvatar.current = false;
      if (alive.current) setAvatarPicking(false);
    }
  }, [errorText, t]);
  const clearAvatar = useCallback(() => {
    if (!submitting.current && !choosingAvatar.current) setImage64(null);
  }, []);

  const canCreate = self > 0 && !!actions && selected.length > 0 && !creating && !avatarPicking;
  const create = useCallback(async () => {
    if (!canCreate || !actions || submitting.current) return;
    submitting.current = true;
    setCreating(true);
    setError('');
    try {
      const result = await actions.create({ self, userids: selected.map((item) => item.userid), name: name.current.trim(), ...(image64 ? { image64 } : {}) });
      if (alive.current) onCreated(result);
    } catch (err: unknown) {
      submitting.current = false;
      if (alive.current) {
        setCreating(false);
        setError(errorText(err));
      }
    }
  }, [canCreate, actions, self, selected, image64, onCreated, errorText]);
  const canClose = useCallback(() => !submitting.current && !choosingAvatar.current, []);

  return { selected, disabledIds, image64, picking, avatarPicking, creating, error, canCreate, canClose, onNameChange, remove, openPicker, closePicker, confirmMembers, changeAvatar, clearAvatar, create };
}

export type CreateGroupState = ReturnType<typeof useCreateGroup>;
