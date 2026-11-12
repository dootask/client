import { createMMKV } from 'react-native-mmkv';

/**
 * 同步键值存储：原生是 MMKV，Web 是 MMKV 自带的 localStorage 实现。
 * 同步读写，冷启动时首屏渲染前就能读到。只放小数据，列表类数据进结构化缓存
 */
export const kv = createMMKV({ id: 'dootask' });

/** 所有键集中在这里，避免散落的字符串互相冲突 */
export const KV_KEYS = {
  server: 'auth.server',
  token: 'auth.token',
  /** 上次取到的我的信息（JSON），冷启动先用它，后台再取新的 */
  user: 'auth.user',
  themeMode: 'pref.themeMode',
  language: 'pref.language',
  /** 按 Enter 直接发送消息（'1' / '0'），没设过按平台默认 */
  enterSend: 'pref.enterSend',
  /** 消息翻译的目标语言，没设过用界面语言 */
  translateLanguage: 'pref.translateLanguage',
  aiComposeModel: 'pref.aiComposeModel',
  listPaneWidth: (id: string) => `pref.listPaneWidth.${id}`,
  contactsView: (owner: string) => `contacts.view.${owner}`,
  /** 最近用来回应消息的表情（JSON，最多 3 个），App 长按菜单表情条排在最前 */
  recentEmojis: 'pref.recentEmojis',
  /** 会话列表分类条各分类最近一次选中的时间（JSON），决定下次打开时分类条的顺序 */
  dialogNavHistory: 'pref.dialogNavHistory',
  /** 结构化缓存里数据所属的账号（服务器地址 + 用户 id），和当前登录对不上就清空缓存 */
  cacheOwner: 'cache.owner',
  /** 消息数据层按账号存的小数据：sync 同步时间、beyond 上次取列表外会话的时间、drafts 草稿、outbox 发送队列 */
  messenger: (userid: number, name: 'sync' | 'beyond' | 'drafts' | 'outbox' | 'aiModels') => `messenger.${userid}.${name}`,
} as const;
