import { type BackendModule, createInstance } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import { applyDocumentLanguage } from './document';
import { type Language, resolveLanguage, SOURCE_LANGUAGE } from './languages';
import { NAMESPACES, sourceResources } from './resources';

export { dateFormats, type DateFormats } from './dates';
export { LANGUAGES, type Language } from './languages';
export type { Namespace } from './resources';

// 源语言打进主包，其他语言按需加载（Web 上每个 JSON 单独成块）
const lazyLocales = require.context('../../locales', true, /^\.\/(?!zh\/)[^/]+\/[^/]+\.json$/, 'lazy');

const lazyBackend: BackendModule = {
  type: 'backend',
  init() {},
  read(language, namespace, callback) {
    (
      lazyLocales(`./${language}/${namespace}.json`) as Promise<{
        default: object;
      }>
    ).then(
      (mod) => callback(null, mod.default),
      (error: Error) => callback(error, false),
    );
  },
};

/** 应用唯一的 i18next 实例，经 initReactI18next 交给 react-i18next */
const i18n = createInstance();

function deviceLocale(): string | null {
  return Intl.DateTimeFormat().resolvedOptions().locale ?? null;
}

/**
 * 启动时调用一次，语言包加载完再渲染界面，避免先闪一下源语言。
 * stored：用户选过的语言（键值存储里读出来的，没有传 null）
 */
export async function initI18n(stored: string | null): Promise<void> {
  if (i18n.isInitialized) return;
  const language = resolveLanguage(stored, deviceLocale());
  await i18n
    .use(lazyBackend)
    .use(initReactI18next)
    .init({
      lng: language,
      fallbackLng: SOURCE_LANGUAGE,
      ns: NAMESPACES,
      defaultNS: 'common',
      resources: { [SOURCE_LANGUAGE]: sourceResources },
      partialBundledLanguages: true,
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
      returnNull: false,
    });
  applyDocumentLanguage(language);
}

/** 切换界面语言：语言包加载完才切，界面不会先变回源语言 */
export async function setLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
  applyDocumentLanguage(language);
}

/** 当前界面语言，组件外用（如请求头 language） */
export function currentLanguage(): Language {
  return resolveLanguage(i18n.resolvedLanguage ?? i18n.language ?? null, null);
}

/**
 * 取翻译函数：所有命名空间都可用，键写成 'ns:key'（common 可以省略前缀），写错键编译不过。
 * 语言切换时重渲染
 */
export function useT() {
  return useTranslation(NAMESPACES).t;
}

/** 当前界面语言，切换时重渲染 */
export function useLanguage(): Language {
  const { i18n: current } = useTranslation();
  return resolveLanguage(current.resolvedLanguage ?? current.language, null);
}
