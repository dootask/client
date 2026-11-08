import { type Language, setLanguage } from '../../i18n';
import { kv, KV_KEYS } from '../../sync/storage';
import { setThemeMode, THEME_MODES, type ThemeMode } from '../../ui/theme';

/** 启动时首屏渲染前调用：恢复深浅色，返回用户选过的语言（交给 initI18n） */
export function restorePreferences(): { language: string | null } {
  const mode = kv.getString(KV_KEYS.themeMode);
  if (THEME_MODES.includes(mode as ThemeMode)) setThemeMode(mode as ThemeMode);
  return { language: kv.getString(KV_KEYS.language) ?? null };
}

export function changeThemeMode(mode: ThemeMode): void {
  setThemeMode(mode);
  kv.set(KV_KEYS.themeMode, mode);
}

export async function changeLanguage(language: Language): Promise<void> {
  await setLanguage(language);
  kv.set(KV_KEYS.language, language);
}
