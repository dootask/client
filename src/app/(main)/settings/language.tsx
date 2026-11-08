import { LanguageSettings, SettingsPage } from '../../../modules/setting';

export default function Screen() {
  return (
    <SettingsPage title="setting:language.title">
      <LanguageSettings />
    </SettingsPage>
  );
}
