import { describe, expect, it, vi } from 'vitest';

import type { Dialog } from '../api/dialog';
import type { Messenger } from './engine';
import { createGroupActions, type GroupApi } from './groupActions';

function setup() {
  const dialogs: Record<number, Dialog> = { 1: { id: 1, type: 'group', owner_id: 10, deputy_ids: [20] } };
  const patchDialog = vi.fn((patch: Partial<Dialog> & { id: number }) => { dialogs[patch.id] = { ...dialogs[patch.id]!, ...patch }; });
  const fetchDialog = vi.fn(async () => dialogs[1]!);
  const forgetDialogs = vi.fn();
  const messenger = { store: { getState: () => ({ dialogs }) }, patchDialog, fetchDialog, forgetDialogs } as unknown as Messenger;
  const api: GroupApi = {
    members: vi.fn(async () => [{ userid: 10, bot: 0 }, { userid: 30, bot: 30 }]),
    create: vi.fn(async () => ({ dialog: { id: 2, type: 'group' }, msg: 'created' })),
    edit: vi.fn(async () => ({ dialog: { id: 1, name: 'new' }, msg: 'saved' })),
    addMembers: vi.fn(async () => 'added'), removeMember: vi.fn(async () => 'removed'),
    setDeputy: vi.fn(async () => 'changed'), transfer: vi.fn(async () => 'transferred'),
    exit: vi.fn(async () => 'exited'), disband: vi.fn(async () => 'disbanded'), uploadAvatar: vi.fn(async () => 'avatar-path'),
  };
  return { actions: createGroupActions(api, messenger), api, dialogs, fetchDialog, forgetDialogs, patchDialog };
}

describe('群操作本地同步', () => {
  it('合并群名头像，裁图上传成功后只发一次编辑请求', async () => {
    const { actions, api, dialogs } = setup();
    expect(await actions.edit(1, { name: ' new ', image64: 'image' }, true)).toBe('saved');
    expect(api.uploadAvatar).toHaveBeenCalledWith('image');
    expect(api.edit).toHaveBeenCalledExactlyOnceWith(1, { name: 'new', avatar: 'avatar-path' }, true);
    expect(dialogs[1]?.name).toBe('new');
  });
  it('上传失败不修改资料', async () => {
    const { actions, api } = setup();
    vi.mocked(api.uploadAvatar).mockRejectedValue(new Error('upload'));
    await expect(actions.edit(1, { image64: 'image' }, false)).rejects.toThrow('upload');
    expect(api.edit).not.toHaveBeenCalled();
  });
  it('创建时自己只加一次，新群立即进入缓存', async () => {
    const { actions, api, dialogs } = setup();
    expect(await actions.create({ self: 10, userids: [10, 20], name: '' })).toEqual({ dialogId: 2, msg: 'created' });
    expect(api.create).toHaveBeenCalledWith({ userids: [10, 20], chat_name: '', avatar: undefined });
    expect(dialogs[2]?.type).toBe('group');
  });
  it('成员接口更新真人和机器人人数', async () => {
    const { actions, dialogs } = setup();
    await actions.members(1);
    expect(dialogs[1]).toMatchObject({ people: 2, people_user: 1, people_bot: 1 });
  });
  it('任免管理员即时更新且不重复', async () => {
    const { actions, dialogs } = setup();
    await actions.setDeputy(1, 30, true);
    await actions.setDeputy(1, 30, true);
    expect(dialogs[1]?.deputy_ids).toEqual([20, 30]);
    await actions.setDeputy(1, 20, false);
    expect(dialogs[1]?.deputy_ids).toEqual([30]);
  });
  it('转让立即更新权限，刷新失败不误报转让失败', async () => {
    const { actions, dialogs, fetchDialog } = setup();
    fetchDialog.mockRejectedValue(new Error('refresh'));
    await expect(actions.transfer(1, 20)).resolves.toBe('transferred');
    expect(dialogs[1]).toMatchObject({ owner_id: 20, deputy_ids: [] });
  });
  it('刷新失败不重发已经成功的增删成员请求，成员列表仍可单独刷新', async () => {
    const { actions, api, dialogs, fetchDialog } = setup();
    fetchDialog.mockRejectedValue(new Error('refresh'));
    await expect(actions.addMembers(1, [30])).resolves.toBe('added');
    await expect(actions.removeMember(1, 20)).resolves.toBe('removed');
    expect(api.addMembers).toHaveBeenCalledExactlyOnceWith(1, [30]);
    expect(api.removeMember).toHaveBeenCalledExactlyOnceWith(1, 20);
    await actions.members(1);
    expect(dialogs[1]).toMatchObject({ people: 2, people_user: 1, people_bot: 1 });
    vi.mocked(api.members).mockRejectedValue(new Error('members'));
    await expect(actions.members(1)).rejects.toThrow('members');
  });
  it('操作失败不修改权限也不移除会话', async () => {
    const { actions, api, dialogs, forgetDialogs } = setup();
    vi.mocked(api.transfer).mockRejectedValue(new Error('denied'));
    await expect(actions.transfer(1, 20)).rejects.toThrow('denied');
    expect(dialogs[1]?.owner_id).toBe(10);
    vi.mocked(api.exit).mockRejectedValue(new Error('denied'));
    await expect(actions.exit(1)).rejects.toThrow('denied');
    expect(forgetDialogs).not.toHaveBeenCalled();
  });
  it('退出和解散成功即移除会话', async () => {
    const { actions, forgetDialogs } = setup();
    await actions.exit(1);
    await actions.disband(1);
    expect(forgetDialogs).toHaveBeenCalledTimes(2);
    expect(forgetDialogs).toHaveBeenCalledWith([1]);
  });
});
