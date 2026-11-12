import type { ApiClient } from '../api/client';
import * as groupApi from '../api/group';
import * as systemApi from '../api/system';
import type { Messenger } from './engine';

/** 群操作用到的接口，client 已绑定；测试时注入假的 */
export function bindGroupApi(client: ApiClient) {
  return {
    members: (dialogId: number) => groupApi.members(client, dialogId),
    create: (params: Parameters<typeof groupApi.create>[1]) => groupApi.create(client, params),
    edit: (dialogId: number, patch: { name?: string; avatar?: string }, admin: boolean) => groupApi.edit(client, dialogId, patch, admin),
    addMembers: (dialogId: number, userids: number[]) => groupApi.addMembers(client, dialogId, userids),
    removeMember: (dialogId: number, userid: number) => groupApi.removeMember(client, dialogId, userid),
    exit: (dialogId: number) => groupApi.exit(client, dialogId),
    setDeputy: (dialogId: number, userid: number, deputy: boolean) => groupApi.setDeputy(client, dialogId, userid, deputy),
    transfer: (dialogId: number, userid: number) => groupApi.transfer(client, dialogId, userid),
    disband: (dialogId: number) => groupApi.disband(client, dialogId),
    /** 头像裁成 512 方图 */
    uploadAvatar: (image64: string) => systemApi.imageUpload(client, image64, { width: 512, height: 512, fit: 'cover' }),
  };
}
export type GroupApi = ReturnType<typeof bindGroupApi>;

/**
 * 群资料与成员管理（会话信息页、成员页、建群）：接口结果立即合进会话数据，
 * 服务端只回提示语的（管理员、转让、增删成员）重新取一次会话；失败抛出服务端的错误。
 * 返回值是服务端的提示语
 */
export function createGroupActions(api: GroupApi, messenger: Messenger) {
  // 变更已成功，读取失败不能把已提交的操作标成失败。
  const refetch = (dialogId: number) => messenger.fetchDialog(dialogId).catch(() => {});

  return {
    /** 群成员；顺便更新会话上的人数 */
    async members(dialogId: number) {
      const list = await api.members(dialogId);
      const bots = list.filter((m) => m.bot).length;
      messenger.patchDialog({ id: dialogId, people: list.length, people_user: list.length - bots, people_bot: bots });
      return list;
    },

    /** 建群（userids 不用含自己），返回新会话 id */
    async create(params: { userids: number[]; name: string; image64?: string; self: number }) {
      const avatar = params.image64 ? await api.uploadAvatar(params.image64) : undefined;
      const { dialog, msg } = await api.create({ userids: [params.self, ...params.userids.filter((id) => id !== params.self)], chat_name: params.name, avatar });
      messenger.patchDialog(dialog);
      return { dialogId: dialog.id, msg };
    },

    /** 改群名、头像；admin 见 groupApi.edit */
    async edit(dialogId: number, params: { name?: string; image64?: string }, admin: boolean) {
      const avatar = params.image64 ? await api.uploadAvatar(params.image64) : undefined;
      const { dialog, msg } = await api.edit(dialogId, { ...(params.name !== undefined ? { name: params.name.trim() } : {}), ...(avatar ? { avatar } : {}) }, admin);
      messenger.patchDialog(dialog);
      return msg;
    },

    async addMembers(dialogId: number, userids: number[]) {
      const msg = await api.addMembers(dialogId, userids);
      await refetch(dialogId);
      return msg;
    },

    async removeMember(dialogId: number, userid: number) {
      const msg = await api.removeMember(dialogId, userid);
      await refetch(dialogId);
      return msg;
    },

    /** 任命 / 罢免群管理员 */
    async setDeputy(dialogId: number, userid: number, deputy: boolean) {
      const msg = await api.setDeputy(dialogId, userid, deputy);
      const ids = messenger.store.getState().dialogs[dialogId]?.deputy_ids ?? [];
      messenger.patchDialog({ id: dialogId, deputy_ids: deputy ? [...new Set([...ids, userid])] : ids.filter((id) => id !== userid) });
      await refetch(dialogId);
      return msg;
    },

    async transfer(dialogId: number, userid: number) {
      const msg = await api.transfer(dialogId, userid);
      const ids = messenger.store.getState().dialogs[dialogId]?.deputy_ids ?? [];
      messenger.patchDialog({ id: dialogId, owner_id: userid, deputy_ids: ids.filter((id) => id !== userid) });
      await refetch(dialogId);
      return msg;
    },

    /** 退出、解散后会话从本地移除，调用方退出会话页 */
    async exit(dialogId: number) {
      const msg = await api.exit(dialogId);
      messenger.forgetDialogs([dialogId]);
      return msg;
    },

    async disband(dialogId: number) {
      const msg = await api.disband(dialogId);
      messenger.forgetDialogs([dialogId]);
      return msg;
    },
  };
}
export type GroupActions = ReturnType<typeof createGroupActions>;
