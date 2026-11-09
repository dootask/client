import { EyeOff, RefreshCw } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { LANGUAGES, type Language, useT } from '../../../../i18n';
import type { Msg } from '../../../../sync/api/dialog';
import { Sheet } from '../../../../ui/layout';
import { ListRow } from '../../../../ui/ListRow';
import { showToast } from '../../../../ui/Toast';
import { useErrorText } from '../../../session';
import { useMessengerState, useMsgActions } from '../../hooks';
import { translateLanguage } from '../translateLanguage';

/** 点译文：换目标语言（之后翻译都用它）、重新翻译、隐藏翻译（C12） */
export function TranslateSheet({ msg, visible, onClose }: { msg: Msg | null; visible: boolean; onClose: () => void }) {
  const t = useT();
  const actions = useMsgActions();
  const errorText = useErrorText();
  const active = useMessengerState((s) => (msg ? s.translations[msg.id]?.language : undefined)) ?? translateLanguage.get();

  const run = (task: (m: Msg) => Promise<void> | void) => () => {
    onClose();
    if (msg) void Promise.resolve(task(msg)).catch((err) => showToast(errorText(err)));
  };
  const pick = (language: Language) =>
    run((m) => {
      translateLanguage.set(language);
      if (language !== active) return actions?.translate(m, language);
    });

  return (
    <Sheet visible={visible} onClose={onClose} title={t('messenger:translate.pickLanguage')}>
      <ScrollView>
        {LANGUAGES.map((l) => (
          <ListRow key={l.code} title={l.name} accessory={l.code === active ? 'check' : 'none'} onPress={pick(l.code)} />
        ))}
        <View style={styles.band} />
        <ListRow title={t('messenger:translate.retranslate')} icon={RefreshCw} onPress={run((m) => actions?.translate(m, active, true))} />
        <ListRow title={t('messenger:action.hideTranslation')} icon={EyeOff} onPress={run((m) => actions?.hideTranslation(m.id))} />
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create((theme) => ({
  band: { height: theme.spacing.sm, backgroundColor: theme.colors.bg },
}));
