import { AppState } from 'react-native';
import { create } from 'zustand';

import { fileIO } from '../../platform/files';
import { createAiRuns, type AiRuns } from '../../sync/ai/runs';
import { assistantApi, usersApi } from '../../sync/api';
import { bindGroupApi, bindMessengerApi, bindMsgActionsApi, createGroupActions, createMessenger, createMsgActions, type GroupActions, type Messenger, type MsgActions } from '../../sync/messenger';
import { kv, KV_KEYS, openAppCache, type StructuredCache } from '../../sync/storage';
import { createMsgStreams, type MsgStreams } from '../../sync/stream/msgStreams';
import { createUserDirectory, type UserDirectory } from '../../sync/users';
import { api, onGone, socket, useSession, type SessionState } from '../session';
import { openSse } from './streamTransport';

const KV_NAMES = ['sync', 'beyond', 'drafts', 'outbox'] as const;

/** 当前账号的消息数据层和用户目录，未登录为 null。界面通过 hooks 读，不直接用 */
export const useMessengerInstance = create<{ messenger: Messenger | null; actions: MsgActions | null; group: GroupActions | null; users: UserDirectory | null; streams: MsgStreams | null; runs: AiRuns | null }>()(() => ({
  messenger: null,
  actions: null,
  group: null,
  users: null,
  streams: null,
  runs: null,
}));

let cachePromise: Promise<StructuredCache> | null = null;
const appCache = () => (cachePromise ??= openAppCache());

/** 登录态对应的账号标识：服务器地址 + 用户 id；未登录或服务器版本过低为空串 */
const ownerOf = (s: SessionState) => (s.token && s.user && !s.outdated ? `${s.server}|${s.user.userid}` : '');

/** 缓存里是别的账号（或上次退出没清干净）的数据：先清空，再给新账号用 */
async function claimCache(cache: StructuredCache, owner: string, userId: number) {
  if (kv.getString(KV_KEYS.cacheOwner) === owner) return;
  await cache.clear('messages');
  await cache.clear('dialogs');
  await cache.clear('users');
  for (const name of KV_NAMES) kv.remove(KV_KEYS.messenger(userId, name));
  kv.set(KV_KEYS.cacheOwner, owner);
}

/** 账号切换按顺序处理，避免上一个账号的清理和下一个账号的启动交错 */
let queue: Promise<void> = Promise.resolve();

function switchTo(owner: string) {
  queue = queue
    .then(async () => {
      const { messenger: previous, users: previousUsers, streams: previousStreams, runs: previousRuns } = useMessengerInstance.getState();
      previousUsers?.stop();
      previousStreams?.stop();
      previousRuns?.stop();
      if (previous) {
        useMessengerInstance.setState({ messenger: null, actions: null, group: null, users: null, streams: null, runs: null });
        previous.stop();
        socket.disconnect();
      }
      if (!owner) {
        // 退出登录：清掉上一个账号的数据
        if (previous) {
          await previous.clear();
          await (await appCache()).clear('users');
        }
        kv.remove(KV_KEYS.cacheOwner);
        return;
      }
      const cache = await appCache();
      const userId = useSession.getState().user!.userid;
      await claimCache(cache, owner, userId);
      // 等待期间状态又变了，交给下一轮
      if (ownerOf(useSession.getState()) !== owner) return;
      const messenger = createMessenger({
        api: bindMessengerApi(api, fileIO),
        socket,
        cache,
        kv: {
          get: (name) => kv.getString(KV_KEYS.messenger(userId, name)),
          set: (name, value) => kv.set(KV_KEYS.messenger(userId, name), value),
          remove: (name) => kv.remove(KV_KEYS.messenger(userId, name)),
        },
        userId,
        log: console.warn,
      });
      const users = createUserDirectory({ fetchBasic: (ids) => usersApi.basic(api, ids), cache, log: console.warn });
      const streams = createMsgStreams({ open: openSse, origin: () => useSession.getState().server, baseText: (msgId) => msgText(messenger, msgId) });
      const runs = createAiRuns({ open: openSse, origin: () => useSession.getState().server, eventsUrl: (msgId) => assistantApi.runStream(api, msgId) });
      useMessengerInstance.setState({ messenger, actions: createMsgActions(bindMsgActionsApi(api), messenger), group: createGroupActions(bindGroupApi(api), messenger), users, streams, runs });
      await messenger.start();
      socket.connect();
    })
    .catch((err) => console.warn('[messenger] switch failed', err));
}

/** 窗口里某条消息的文字（流式回复第一段是追加时接在它后面） */
function msgText(messenger: Messenger, msgId: number): string | undefined {
  for (const win of Object.values(messenger.store.getState().windows)) {
    const msg = win.list.find((m) => m.id === msgId);
    if (msg) {
      const text = (msg.msg as { text?: unknown } | null)?.text;
      return typeof text === 'string' ? text : undefined;
    }
  }
  return undefined;
}

/** 启动消息服务：跟着登录状态启停，应用启动时调一次 */
export function startMessengerService(): () => void {
  let owner = ownerOf(useSession.getState());
  switchTo(owner);
  const unsubs = [
    useSession.subscribe((state) => {
      const next = ownerOf(state);
      if (next === owner) return;
      owner = next;
      switchTo(next);
    }),
    onGone((kind, id) => {
      if (kind === 'dialog') useMessengerInstance.getState().messenger?.forgetDialogs([id]);
    }),
    // AI 回复的流式文字（H1）
    socket.on('msgStream', (msg) => {
      if (typeof msg.stream_url === 'string') useMessengerInstance.getState().streams?.subscribe(msg.stream_url);
    }),
    // 别人上线、下线
    socket.on<{ userid?: number; online?: boolean }>('line', ({ data }) => {
      if (data?.userid) useMessengerInstance.getState().users?.setOnline(data.userid, !!data.online);
    }),
  ];
  // 回到前台：连接还活着就增量同步一次；断了 check 会重连，重连后自动同步
  let background = AppState.currentState !== 'active';
  const appState = AppState.addEventListener('change', (state) => {
    if (state !== 'active') {
      background = true;
      return;
    }
    if (!background) return;
    background = false;
    void socket.check().then((alive) => {
      if (alive) useMessengerInstance.getState().messenger?.catchUp();
    });
  });
  return () => {
    unsubs.forEach((fn) => fn());
    appState.remove();
  };
}
