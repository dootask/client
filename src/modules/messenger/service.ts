import { AppState } from 'react-native';
import { create } from 'zustand';

import { usersApi } from '../../sync/api';
import { createMessenger, bindMessengerApi, type Messenger } from '../../sync/messenger';
import { kv, KV_KEYS, openAppCache, type StructuredCache } from '../../sync/storage';
import { createUserDirectory, type UserDirectory } from '../../sync/users';
import { api, onGone, socket, useSession, type SessionState } from '../session';

const KV_NAMES = ['sync', 'beyond', 'drafts', 'outbox'] as const;

/** 当前账号的消息数据层和用户目录，未登录为 null。界面通过 hooks 读，不直接用 */
export const useMessengerInstance = create<{ messenger: Messenger | null; users: UserDirectory | null }>()(() => ({ messenger: null, users: null }));

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
      const { messenger: previous, users: previousUsers } = useMessengerInstance.getState();
      previousUsers?.stop();
      if (previous) {
        useMessengerInstance.setState({ messenger: null, users: null });
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
        api: bindMessengerApi(api),
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
      useMessengerInstance.setState({ messenger, users });
      await messenger.start();
      socket.connect();
    })
    .catch((err) => console.warn('[messenger] switch failed', err));
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
