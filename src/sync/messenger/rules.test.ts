import { describe, expect, it } from 'vitest';

import type { Dialog, Msg } from '../api/dialog';
import {
  aiModelLabel,
  aiQuickMsgs,
  applyAroundPage,
  applyEarlierPage,
  applyLatestPage,
  applyNewerPage,
  atLatest,
  badgeText,
  categoryUnread,
  compareDialog,
  composerBlock,
  dialogNum,
  dialogUnread,
  earlierCursor,
  hasEarlier,
  isListed,
  lastMsgPatch,
  matchesFilter,
  mergeDialog,
  mergeMsg,
  newerCursor,
  quickMsgs,
  toUnix,
  unreadTotals,
  upsertMsgs,
  type AiQuickMsg,
} from './rules';

const dialog = (over: Partial<Dialog> = {}): Dialog => ({ id: 1, type: 'group', group_type: 'user', name: 'g', last_at: '2026-11-01 10:00:00', ...over });
const msg = (id: number, over: Partial<Msg> = {}): Msg => ({ id, dialog_id: 1, userid: 2, type: 'text', msg: { text: `m${id}` }, created_at: '2026-11-01 10:00:00', ...over });
const never = () => false;

describe('R4 mergeDialog', () => {
  it('本地没有时只接收完整会话', () => {
    expect(mergeDialog(undefined, { id: 1, unread: 3 }, never)).toBeUndefined();
    expect(mergeDialog(undefined, { id: 1, type: 'user' }, never)).toEqual({ id: 1, type: 'user' });
  });

  it('last_at 带微秒时按秒比较，同一秒的新消息能替换最后消息', () => {
    const orig = mergeDialog(dialog({}), { id: 1, last_at: '2026-11-08 19:22:37.000000', last_msg: { id: 5, type: 'text', msg: {} } }, never)!;
    expect(orig.last_at).toBe('2026-11-08 19:22:37');
    const next = mergeDialog(orig, { id: 1, last_at: '2026-11-08 19:22:37', last_msg: { id: 6, type: 'text', msg: {} } }, never)!;
    expect(next.last_msg?.id).toBe(6);
  });

  it('user_ms 更旧时丢掉未读字段，其它字段照常合并', () => {
    const orig = dialog({ user_ms: 200, unread: 1, mention: 0 });
    const next = mergeDialog(orig, { id: 1, user_ms: 100, unread: 5, mention: 2, mention_ids: [9], unread_one: 9, name: 'x' }, never)!;
    expect(next).toMatchObject({ unread: 1, mention: 0, name: 'x', user_ms: 200 });
    expect(next.mention_ids).toBeUndefined();
  });

  it('user_ms 较新或没带时覆盖未读', () => {
    expect(mergeDialog(dialog({ user_ms: 100, unread: 1 }), { id: 1, user_ms: 200, unread: 0 }, never)!.unread).toBe(0);
    expect(mergeDialog(dialog({ user_ms: 100, unread: 1 }), { id: 1, unread: 4 }, never)!.unread).toBe(4);
  });

  it('本地已读的 unread_one、mention_ids 去掉', () => {
    const read = (id: number) => id === 5;
    const next = mergeDialog(dialog({ unread_one: 3 }), { id: 1, unread_one: 5, mention_ids: [5, 6] }, read)!;
    expect(next.unread_one).toBe(3);
    expect(next.mention_ids).toEqual([6]);
  });

  it('last_at 更旧时不覆盖最后消息，last_force 例外', () => {
    const orig = dialog({ last_at: '2026-11-02 10:00:00', last_msg: { id: 9, type: 'preview', msg: {} } });
    const old = { id: 1, last_at: '2026-11-01 10:00:00', last_msg: { id: 7, type: 'preview', msg: {} } };
    expect(mergeDialog(orig, old, never)!.last_msg!.id).toBe(9);
    const forced = mergeDialog(orig, { ...old, last_force: true }, never)!;
    expect(forced.last_msg!.id).toBe(7);
    expect(forced).not.toHaveProperty('last_force');
  });
});

describe('R5 lastMsgPatch', () => {
  it('按消息类型置 has_* 标记', () => {
    const p = lastMsgPatch(msg(3, { mtype: 'image', link: 1 }));
    expect(p).toMatchObject({ id: 1, last_at: '2026-11-01 10:00:00', has_image: true, has_link: true });
    expect(p.has_file).toBeUndefined();
  });
});

describe('R6 未读', () => {
  it('免打扰不算未读，但 @ 和标记未读照算', () => {
    expect(dialogNum(dialog({ unread: 3 }))).toBe(3);
    expect(dialogNum(dialog({ unread: 3, silence: 1 }))).toBe(0);
    expect(dialogNum(dialog({ unread: 3, silence: 1, mention: 1 }))).toBe(1);
    expect(dialogNum(dialog({ silence: 1, mark_unread: 1 }))).toBe(1);
    expect(dialogUnread(dialog({ unread: 3, silence: 1 }), true)).toBe(3);
    expect(dialogUnread(dialog({ unread: 3, silence: 1 }), false)).toBe(0);
  });
});

describe('R7 分类', () => {
  const list = [
    dialog({ id: 1, group_type: 'project', unread: 1 }),
    dialog({ id: 2, group_type: 'task', unread: 2 }),
    dialog({ id: 3, type: 'user', group_type: '', unread: 4 }),
    dialog({ id: 4, type: 'user', group_type: '', bot: 1, unread: 8 }),
    dialog({ id: 5, group_type: 'user', unread: 16, silence: 1 }),
    dialog({ id: 6, group_type: 'all', unread: 32 }),
  ];
  it('按类型累加 dialogNum', () => {
    expect(categoryUnread(list, 'project')).toBe(1);
    expect(categoryUnread(list, 'task')).toBe(2);
    expect(categoryUnread(list, 'user')).toBe(4);
    expect(categoryUnread(list, 'bot')).toBe(8);
    expect(categoryUnread(list, 'group')).toBe(32);
  });
});

describe('R8 badgeText', () => {
  const t = (unread: number, mention: number, todo: number) => badgeText({ unread, mention, todo }, '待办');
  it('组合格式与旧前端一致', () => {
    expect(t(0, 0, 0)).toBe('');
    expect(t(12, 0, 0)).toBe('12');
    expect(t(12, 3, 0)).toBe('12·@3');
    expect(t(0, 3, 0)).toBe('@3');
    expect(t(12, 0, 2)).toBe('12·待办2');
    expect(t(12, 3, 2)).toBe('@3·待办2');
    expect(t(0, 0, 1)).toBe('待办');
    expect(t(1000, 0, 0)).toBe('999+');
    expect(t(0, 0, 100)).toBe('待办99+');
  });
});

describe('R9 unreadTotals', () => {
  it('角标用 dialogNum，Tab 用不含免打扰的未读', () => {
    const totals = unreadTotals([dialog({ unread: 2 }), dialog({ unread: 5, silence: 1, mention: 1, todo_num: 2 }), dialog({ mark_unread: 1 })]);
    expect(totals).toEqual({ unread: 3, mention: 1, todo: 2, badge: 4 });
  });
});

describe('R10 isListed', () => {
  const now = toUnix('2026-11-10 10:00:00');
  const ctx = { now, openId: 0, aiHidden: false };
  it('基本过滤', () => {
    expect(isListed(dialog(), ctx)).toBe(true);
    expect(isListed(dialog({ hide: 1 }), ctx)).toBe(false);
    expect(isListed(dialog({ last_at: null }), ctx)).toBe(false);
    expect(isListed(dialog({ name: undefined }), ctx)).toBe(false);
    expect(isListed(dialog({ dialog_delete: 1 }), ctx)).toBe(false);
  });
  it('正在看的、置顶、待办、未读一定显示', () => {
    expect(isListed(dialog({ hide: 1 }), { ...ctx, openId: 1 })).toBe(true);
    expect(isListed(dialog({ hide: 1, top_at: '2026-01-01 00:00:00' }), ctx)).toBe(true);
    expect(isListed(dialog({ hide: 1, todo_num: 1 }), ctx)).toBe(true);
    expect(isListed(dialog({ hide: 1, unread: 1 }), ctx)).toBe(true);
  });
  it('任务完成 5 天、删除 2 天、归档 3 天后隐藏', () => {
    const task = (info: Record<string, unknown>, lastAt = '2026-11-01 10:00:00') => dialog({ group_type: 'task', last_at: lastAt, group_info: info });
    expect(isListed(task({ complete_at: '2026-11-05 11:00:00' }), ctx)).toBe(true);
    expect(isListed(task({ complete_at: '2026-11-05 09:00:00' }), ctx)).toBe(false);
    expect(isListed(task({ complete_at: '2026-11-01 10:00:00' }, '2026-11-08 10:00:00'), ctx)).toBe(true);
    expect(isListed(task({ deleted_at: '2026-11-08 09:00:00' }), ctx)).toBe(false);
    expect(isListed(task({ archived_at: '2026-11-07 09:00:00' }), ctx)).toBe(false);
    expect(isListed(task({ archived_at: '2026-11-07 11:00:00' }), ctx)).toBe(true);
  });
  it('aiHidden 隐藏 AI 机器人单聊', () => {
    const ai = dialog({ type: 'user', bot: 1, email: 'ai-openai@bot.system', unread: 1 });
    expect(isListed(ai, ctx)).toBe(true);
    expect(isListed(ai, { ...ctx, aiHidden: true })).toBe(false);
  });
});

describe('R11 compareDialog', () => {
  it('置顶 → 待办 → 草稿 → 最后消息时间', () => {
    const a = dialog({ id: 1, last_at: '2026-11-05 00:00:00' });
    const b = dialog({ id: 2, last_at: '2026-11-04 00:00:00' });
    const c = dialog({ id: 3, last_at: '2026-11-01 00:00:00', todo_num: 1 });
    const d = dialog({ id: 4, last_at: '2026-10-01 00:00:00', top_at: '2026-01-01 00:00:00' });
    const e = dialog({ id: 5, last_at: '2026-10-02 00:00:00' });
    const sorted = [a, b, c, d, e].sort((x, y) => compareDialog(x, y, (id) => id === 5)).map((x) => x.id);
    expect(sorted).toEqual([4, 3, 5, 1, 2]);
  });
});

describe('R13 消息合并', () => {
  it('保留本地已读和两端标记', () => {
    const merged = mergeMsg(msg(1, { read_at: '2026-11-01 10:00:01', prev_id: 0, next_id: 5 }), msg(1, { read_at: null, msg: { text: 'edited' } }));
    expect(merged).toMatchObject({ read_at: '2026-11-01 10:00:01', next_id: 5, msg: { text: 'edited' } });
  });

  it('去重并按 id 倒序', () => {
    expect(upsertMsgs([msg(5), msg(3)], [msg(4), msg(5), msg(9)]).map((m) => m.id)).toEqual([9, 5, 4, 3]);
  });
});

describe('消息窗口', () => {
  const time = toUnix('2026-11-01 12:00:00');

  it('最新一页与窗口重叠：页内删掉服务端没有的，更早的保留', () => {
    const list = [msg(10), msg(9), msg(8), msg(5), msg(4)];
    const page = [msg(10, { next_id: 0 }), msg(8, { prev_id: 5 })];
    expect(applyLatestPage(list, page, time).map((m) => m.id)).toEqual([10, 8, 5, 4]);
  });

  it('最新一页与窗口不连：换成这一页', () => {
    const list = [msg(5), msg(4)];
    const page = [msg(20), msg(18, { prev_id: 17 })];
    expect(applyLatestPage(list, page, time).map((m) => m.id)).toEqual([20, 18]);
  });

  it('最新一页刚好接上窗口（prev_id 指向窗口里的消息）', () => {
    const list = [msg(5), msg(4)];
    const page = [msg(8), msg(7, { prev_id: 5 })];
    expect(applyLatestPage(list, page, time).map((m) => m.id)).toEqual([8, 7, 5, 4]);
  });

  it('最新一页已是全部消息：更早的都删掉；请求期间推来的新消息保留', () => {
    const list = [msg(30, { created_at: '2026-11-01 12:00:05' }), msg(29), msg(5), msg(1)];
    const page = [msg(10), msg(5, { prev_id: 0 })];
    expect(applyLatestPage(list, page, time).map((m) => m.id)).toEqual([30, 10, 5]);
  });

  it('翻到头：空页把端点标记清零', () => {
    const list = [msg(5, { next_id: 6 }), msg(4, { prev_id: 3 })];
    expect(hasEarlier(list)).toBe(true);
    const earlier = applyEarlierPage(list, []);
    expect(hasEarlier(earlier)).toBe(false);
    expect(atLatest(list)).toBe(false);
    expect(atLatest(applyNewerPage(list, []))).toBe(true);
  });

  it('翻页游标：有确切 id 用它，-1（不知道）用相邻 id', () => {
    expect(earlierCursor([msg(5), msg(4, { prev_id: 2 })])).toBe(2);
    expect(earlierCursor([msg(5), msg(4, { prev_id: -1 })])).toBe(3);
    expect(newerCursor([msg(5, { next_id: 9 })])).toBe(9);
    expect(newerCursor([msg(5)])).toBe(6);
  });

  it('跳转定位：连得上合并，连不上换成这一页', () => {
    const list = [msg(50), msg(49, { prev_id: 40 })];
    expect(applyAroundPage(list, [msg(40, { next_id: 49 }), msg(39)]).map((m) => m.id)).toEqual([50, 49, 40, 39]);
    expect(applyAroundPage(list, [msg(20, { next_id: 21 }), msg(19)]).map((m) => m.id)).toEqual([20, 19]);
  });
});

describe('D15 composerBlock', () => {
  it('禁言只拦普通成员，管理员照常发言', () => {
    expect(composerBlock(dialog({ dialog_mute: 'close' }), false)).toBe('muted');
    expect(composerBlock(dialog({ dialog_mute: 'close' }), true)).toBeNull();
    expect(composerBlock(dialog({ dialog_mute: 'open' }), false)).toBeNull();
  });
  it('对方停用：布尔、停用时间、1 都算；禁言优先', () => {
    for (const is_disable of [true, 1, '2026-11-01 10:00:00']) expect(composerBlock(dialog({ type: 'user', is_disable }), true)).toBe('disabled');
    expect(composerBlock(dialog({ type: 'user', is_disable: false }), false)).toBeNull();
    expect(composerBlock(dialog({ type: 'user', is_disable: 1, dialog_mute: 'close' }), false)).toBe('muted');
  });
});

describe('B7 quickMsgs', () => {
  it('去掉 AI 指令、会议、位置签到，保留其余按钮', () => {
    const items = [
      { key: '~ai-session-create', label: '开启新会话' },
      { key: 'meeting-create', label: '新会议' },
      { key: 'locat-checkin', label: '定位签到' },
      { key: 'manual-checkin', label: '手动签到' },
      { key: '/help', label: '帮助指令' },
    ];
    expect(quickMsgs(dialog({ quick_msgs: items })).map((i) => i.key)).toEqual(['manual-checkin', '/help']);
    expect(quickMsgs(dialog({}))).toEqual([]);
  });
});

describe('H3 aiQuickMsgs', () => {
  const ai = (over: Partial<Dialog> = {}) => dialog({ type: 'user', bot: 1, email: 'ai-openai@bot.system', ...over });
  const commands: AiQuickMsg[] = [
    { key: '~ai-session-history', label: '历史会话' },
    { key: '~ai-model-select', label: '选择模型', config: { model: 'mini', models: [{ value: 'mini', label: 'Mini' }] } },
    { key: '~ai-session-create', label: '新会话' },
  ];

  it('AI 机器人单聊只保留三个受支持的 ~ 命令，顺序和配置原样保留', () => {
    const items: AiQuickMsg[] = [
      commands[0]!, { key: '~unknown', label: '未知' }, commands[1]!,
      { key: '/help', label: '帮助' }, { key: 'meeting-create', label: '会议' },
      commands[2]!, { key: 'locat-checkin', label: '签到' },
      { key: '~ai-model-select-extra', label: '相似指令' }, { key: 'ai-session-create', label: '缺少 ~' },
      { key: ' ~ai-session-history', label: '前缀空白' }, { key: '~AI-session-history', label: '大小写不同' },
      { key: '', label: '空 key' },
    ];
    const d = ai({ quick_msgs: items });
    const before = structuredClone(d);
    const result = aiQuickMsgs(d);
    expect(result).toEqual(commands);
    expect(result[1]).toBe(commands[1]);
    expect(d).toEqual(before);
    expect(quickMsgs(d).map(({ key }) => key)).not.toContain('~ai-model-select');
  });

  it.each<Partial<Dialog>>([
    { type: 'group' }, { bot: 0 }, { bot: null }, { bot: undefined },
    { email: undefined }, { email: null }, { email: '' },
    { email: 'notice@bot.system' }, { email: 'ai-@bot.system' },
    { email: 'ai-openai@other.system' }, { email: 'ai-openai@bot.system.extra' },
    { email: 'ai-openai@nested@bot.system' },
  ])('非 AI 机器人单聊不暴露命令：%j', (over) => {
    expect(aiQuickMsgs(ai({ quick_msgs: commands, ...over }))).toEqual([]);
  });

  it.each(['ai-openai@bot.system', 'ai-deepseek@bot.system', 'ai-custom-model@bot.system'])('支持 AI 机器人邮箱 %s', (email) => {
    expect(aiQuickMsgs(ai({ email, quick_msgs: commands }))).toEqual(commands);
  });

  it.each([undefined, null, []])('quick_msgs 为 %s 时返回空列表', (quick_msgs) => {
    expect(aiQuickMsgs(ai({ quick_msgs }))).toEqual([]);
  });
});

describe('H3 aiModelLabel', () => {
  const item: AiQuickMsg = {
    key: '~ai-model-select', label: '选择模型',
    config: { model: 'default', models: [{ value: 'default', label: '默认模型' }, { value: 'chosen', label: '所选模型' }] },
  };

  it.each([
    [undefined, '默认模型'], ['', '默认模型'], ['chosen', '所选模型'], ['default', '默认模型'], ['unknown', 'unknown'],
  ])('选择值 %s 优先于配置默认值，显示 %s', (chosen, expected) => {
    expect(aiModelLabel(item, chosen)).toBe(expected);
  });

  it('配置默认值没有匹配标签时返回默认值，不回退到按钮标签', () => {
    expect(aiModelLabel({ ...item, config: { ...item.config, model: 'removed' } })).toBe('removed');
  });

  it.each([undefined, null, {}, { model: null }, { model: '' }, { models: null }])('配置 %j 没有模型时回退到按钮标签或显式选择值', (config) => {
    const button = { key: '~ai-model-select', label: '选择模型', config };
    expect(aiModelLabel(button)).toBe('选择模型');
    expect(aiModelLabel(button, '')).toBe('选择模型');
    expect(aiModelLabel(button, 'chosen')).toBe('chosen');
  });

  it('缺少默认模型时也能把回退的按钮标签映射为模型标签', () => {
    expect(aiModelLabel({ ...item, label: 'chosen', config: { models: item.config!.models } })).toBe('所选模型');
  });

  it.each([undefined, null, []])('可选模型列表为 %s 时返回模型原值', (models) => {
    expect(aiModelLabel({ ...item, config: { model: 'default', models } })).toBe('default');
    expect(aiModelLabel({ ...item, config: { model: 'default', models } }, 'chosen')).toBe('chosen');
  });

  it('匹配到空标签时回退原值；不改变快捷消息或配置', () => {
    const button: AiQuickMsg = { ...item, config: { model: 'default', models: [{ value: 'default', label: '' }] } };
    const before = structuredClone(button);
    expect(aiModelLabel(button)).toBe('default');
    expect(button).toEqual(before);
    expect(aiModelLabel({ key: '~ai-model-select', label: '' })).toBe('');
  });
});

it('分类筛选的判断和服务端 msg_type 一致', () => {
  const m = (over: Partial<Msg>): Msg => ({ id: 1, dialog_id: 1, userid: 1, type: 'text', msg: {}, created_at: '', ...over });
  expect(matchesFilter(m({ tag: 3 }), 'tag')).toBe(true);
  expect(matchesFilter(m({ tag: 0 }), 'tag')).toBe(false);
  expect(matchesFilter(m({ todo: 3 }), 'todo')).toBe(true);
  expect(matchesFilter(m({ link: 1 }), 'link')).toBe(true);
  expect(matchesFilter(m({ mtype: 'image' }), 'image')).toBe(true);
  expect(matchesFilter(m({ mtype: 'image' }), 'file')).toBe(false);
});
