import { KeyboardSettings, SettingsPage } from '../../../modules/setting';

export default function Screen() {
  return (
    <SettingsPage title="setting:keyboard.title">
      <KeyboardSettings />
    </SettingsPage>
  );
}
