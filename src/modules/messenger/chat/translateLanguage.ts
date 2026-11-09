import { currentLanguage, LANGUAGES, type Language } from '../../../i18n';
import { kv, KV_KEYS } from '../../../sync/storage';

/** 消息翻译的目标语言：在译文上换过就一直用它，没换过跟随界面语言 */
export const translateLanguage = {
  get(): Language {
    const stored = kv.getString(KV_KEYS.translateLanguage);
    const known = LANGUAGES.find((l) => l.code === stored);
    return known ? known.code : currentLanguage();
  },
  set(language: Language) {
    kv.set(KV_KEYS.translateLanguage, language);
  },
};
