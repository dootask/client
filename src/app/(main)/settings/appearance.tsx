import { AppearanceSettings, SettingsPage } from '../../../modules/setting';

export default function Screen() {
  return (
    <SettingsPage title="setting:theme.title">
      <AppearanceSettings />
    </SettingsPage>
  );
}
