import type { ApiClient } from '../api/client';
import * as dialogApi from '../api/dialog';
import type { Msg } from '../api/dialog';
import * as fileApi from '../api/file';
import * as projectApi from '../api/project';
import * as reportApi from '../api/report';
import * as usersApi from '../api/users';
import type { Messenger } from './engine';
import { STICKER_ASSET, type Emoticon } from './emoticon';
import { createMentionSession, type MentionApi } from './mention';

/** 消息操作用到的接口，client 已绑定；测试时注入假的 */
export interface MsgActionsApi extends MentionApi {
  msgTop: (msgId: number) => ReturnType<typeof dialogApi.msgTop>;
  msgTag: (msgId: number) => ReturnType<typeof dialogApi.msgTag>;
  msgTodo: (params: dialogApi.MsgTodoParams) => ReturnType<typeof dialogApi.msgTodo>;
  forward: (params: dialogApi.ForwardParams) => ReturnType<typeof dialogApi.forward>;
  msgTranslation: (params: Parameters<typeof dialogApi.msgTranslation>[1]) => ReturnType<typeof dialogApi.msgTranslation>;
  msgVoice2text: (msgId: number) => ReturnType<typeof dialogApi.msgVoice2text>;
  msgTopInfo: (dialogId: number) => ReturnType<typeof dialogApi.msgTopInfo>;
  msgReadList: (msgId: number) => ReturnType<typeof dialogApi.msgReadList>;
  favoriteCheck: (msgId: number) => Promise<boolean>;
  favoriteToggle: (msgId: number) => ReturnType<typeof usersApi.favoriteToggle>;
  favoriteRemark: (msgId: number, remark: string) => Promise<string>;
  msgTodoList: (msgId: number) => ReturnType<typeof dialogApi.msgTodoList>;
  msgTodoRemind: (params: Parameters<typeof dialogApi.msgTodoRemind>[1]) => Promise<string>;
  myTodos: (dialogId: number) => ReturnType<typeof dialogApi.myTodos>;
  msgDone: (todoId: number) => ReturnType<typeof dialogApi.msgDone>;
  stickerSearch: (key: string) => ReturnType<typeof dialogApi.stickerSearch>;
  voteCreate: (params: dialogApi.VoteCreateParams) => ReturnType<typeof dialogApi.voteCreate>;
  wordChainCreate: (params: Parameters<typeof dialogApi.wordChainCreate>[1]) => ReturnType<typeof dialogApi.wordChainCreate>;
  sendAnon: (userid: number, text: string) => ReturnType<typeof dialogApi.sendAnon>;
  tel: (dialogId: number) => ReturnType<typeof dialogApi.tel>;
}

export function bindMsgActionsApi(client: ApiClient): MsgActionsApi {
  return {
    msgTop: (id) => dialogApi.msgTop(client, id),
    msgTag: (id) => dialogApi.msgTag(client, id),
    msgTodo: (p) => dialogApi.msgTodo(client, p),
    forward: (p) => dialogApi.forward(client, p),
    msgTranslation: (p) => dialogApi.msgTranslation(client, p),
    msgVoice2text: (id) => dialogApi.msgVoice2text(client, id),
    msgTopInfo: (id) => dialogApi.msgTopInfo(client, id),
    msgReadList: (id) => dialogApi.msgReadList(client, id),
    favoriteCheck: (id) => usersApi.favoriteCheck(client, id),
    favoriteToggle: (id) => usersApi.favoriteToggle(client, id),
    favoriteRemark: (id, remark) => usersApi.favoriteRemark(client, id, remark),
    msgTodoList: (id) => dialogApi.msgTodoList(client, id),
    msgTodoRemind: (p) => dialogApi.msgTodoRemind(client, p),
    members: (id) => dialogApi.members(client, id),
    myTodos: (id) => dialogApi.myTodos(client, id),
    msgDone: (id) => dialogApi.msgDone(client, id),
    stickerSearch: (key) => dialogApi.stickerSearch(client, key),
    voteCreate: (p) => dialogApi.voteCreate(client, p),
    wordChainCreate: (p) => dialogApi.wordChainCreate(client, p),
    sendAnon: (userid, text) => dialogApi.sendAnon(client, userid, text),
    tel: (id) => dialogApi.tel(client, id),
    searchUsers: (key, opts) => usersApi.search(client, key, opts),
    taskList: (p) => projectApi.taskList(client, p),
    fileSearch: (key) => fileApi.search(client, key),
    reportList: (box, key) => reportApi.list(client, box, key),
  };
}

/**
 * 长按菜单里的消息操作：置顶、标注、待办、转发、收藏、翻译、转文字，以及置顶消息、已读名单等查询。
 * 接口结果立即合并进数据层（推送稍后带来同样的内容，按 id 去重）；失败抛出服务端的错误
 */
export function createMsgActions(api: MsgActionsApi, messenger: Messenger) {
  const { store } = messenger;

  async function withBusy<T>(id: number, kind: 'voice2text' | 'translate', task: () => Promise<T>): Promise<T> {
    store.setState((s) => ({ busy: { ...s.busy, [id]: kind } }));
    try {
      return await task();
    } finally {
      store.setState((s) => {
        const { [id]: _, ...busy } = s.busy;
        return { busy };
      });
    }
  }

  const setFavorite = (id: number, favorited: boolean) => store.setState((s) => ({ favorites: { ...s.favorites, [id]: favorited } }));

  return {
    /** 置顶 / 取消置顶，返回置顶后的状态 */
    async toggleTop(msg: Msg): Promise<boolean> {
      const { data } = await api.msgTop(msg.id);
      messenger.applyResult({ add: data.add });
      const update = data.update ?? {};
      const topMsgId = Number(update.top_msg_id) || 0;
      messenger.patchDialog({ id: msg.dialog_id, top_msg_id: topMsgId, top_userid: Number(update.top_userid) || 0 });
      return topMsgId === msg.id;
    },

    /** 标注 / 取消标注，返回标注后的状态 */
    async toggleTag(msg: Msg): Promise<boolean> {
      const { data } = await api.msgTag(msg.id);
      messenger.applyResult(data);
      return !!Number(data.update?.tag);
    },

    /** 设待办（全部成员或指定成员）或取消待办（type user、userids 为空）；返回服务端的提示语 */
    async setTodo(params: dialogApi.MsgTodoParams): Promise<string> {
      const { data, msg } = await api.msgTodo(params);
      messenger.applyResult(data);
      return msg;
    },

    /** 转发；产生的消息插进各目标会话 */
    async forward(params: dialogApi.ForwardParams): Promise<void> {
      const { msgs } = await api.forward(params);
      messenger.applyResult({ add: msgs });
    },

    /** 翻译成 language；译文只存在本地 */
    async translate(msg: Msg, language: string, force = false): Promise<void> {
      const res = await withBusy(msg.id, 'translate', () => api.msgTranslation({ msg_id: msg.id, language, force }));
      store.setState((s) => ({ translations: { ...s.translations, [msg.id]: { language: res.language, content: res.content } } }));
    },

    hideTranslation(id: number) {
      store.setState((s) => {
        const { [id]: _, ...translations } = s.translations;
        return { translations };
      });
    },

    /** 会话当前置顶的消息：窗口里有就直接用，没有再向服务端要 */
    async topMsg(dialogId: number, msgId: number): Promise<Msg | null> {
      const local = store.getState().windows[dialogId]?.list.find((m) => m.id === msgId);
      return local ?? api.msgTopInfo(dialogId);
    },

    readList: (msgId: number) => api.msgReadList(msgId),
    todoList: (msgId: number) => api.msgTodoList(msgId),
    todoRemind: (params: Parameters<MsgActionsApi['msgTodoRemind']>[0]) => api.msgTodoRemind(params),
    members: (dialogId: number) => api.members(dialogId),
    myTodos: (dialogId: number) => api.myTodos(dialogId),
    searchUsers: (key: string) => api.searchUsers(key, { bots: false }),

    /** 搜索在线贴纸，结果直接可以当表情发出 */
    searchStickers: async (key: string): Promise<Emoticon[]> => (await api.stickerSearch(key)).map(({ name, src }) => ({ name, src, asset: STICKER_ASSET })),

    /** 会话页的输入栏候选来源，打开会话时建一个 */
    mentionSession: (dialogId: number, userId: number) => createMentionSession(api, store.getState, dialogId, userId),

    /** 完成自己的一条待办（结果里不带待办字段，会话的待办数另外刷新）；返回服务端的提示语 */
    async done(todoId: number, dialogId: number): Promise<string> {
      const { data, msg } = await api.msgDone(todoId);
      messenger.applyResult(data);
      messenger.refreshTodo(dialogId);
      return msg;
    },

    /** 查收藏状态，结果记进 favorites */
    async checkFavorite(id: number): Promise<void> {
      const favorited = await api.favoriteCheck(id);
      setFavorite(id, favorited);
    },

    /** 收藏 / 取消收藏；返回新状态和服务端提示语 */
    async toggleFavorite(id: number): Promise<{ favorited: boolean; msg: string }> {
      const res = await api.favoriteToggle(id);
      setFavorite(id, res.favorited);
      return res;
    },

    favoriteRemark: (id: number, remark: string) => api.favoriteRemark(id, remark),

    /** 发起投票；发出的消息立即插进会话 */
    async createVote(params: dialogApi.VoteCreateParams): Promise<void> {
      messenger.applyResult({ add: await api.voteCreate(params) });
    },

    /** 发起接龙；发出的消息立即插进会话 */
    async createWordChain(params: Parameters<MsgActionsApi['wordChainCreate']>[0]): Promise<void> {
      messenger.applyResult({ add: await api.wordChainCreate(params) });
    },

    /** 发匿名消息给单聊的对方；返回服务端的提示语 */
    sendAnon: (userid: number, text: string) => api.sendAnon(userid, text),

    /** 取单聊对方的电话；服务端发出的「查看了联系电话」通知插进会话 */
    async tel(dialogId: number): Promise<string> {
      const { tel, add } = await api.tel(dialogId);
      messenger.applyResult({ add });
      return tel;
    },

    /** 语音转文字：转写内容写进消息（msg.text），所有人可见 */
    async voice2text(msg: Msg): Promise<void> {
      const res = await withBusy(msg.id, 'voice2text', () => api.msgVoice2text(msg.id));
      messenger.applyResult({ update: res });
    },
  };
}

export type MsgActions = ReturnType<typeof createMsgActions>;
