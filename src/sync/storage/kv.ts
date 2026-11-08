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
  listPaneWidth: (id: string) => `pref.listPaneWidth.${id}`,
} as const;
