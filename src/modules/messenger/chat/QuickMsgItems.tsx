import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text, type StyleProp, type TextStyle } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { dialogApi } from '../../../sync/api';
import type { Dialog } from '../../../sync/api/dialog';
import { aiModelLabel, aiQuickMsgs, quickMsgs, quickMsgHtml } from '../../../sync/messenger';
import { Icon } from '../../../ui/Icon';
import { Popover } from '../../../ui/popover';
import { showToast } from '../../../ui/Toast';
import { Touchable, type TouchableProps } from '../../../ui/Touchable';
import { api, useErrorText } from '../../session';
import { useMessenger, useMessengerState } from '../hooks';
import { AiSessionHistory } from './AiSessionHistory';

export function QuickMsgItems({ dialog, onSent, itemStyle, labelStyle, quickStyle, quickLabelStyle }: { dialog: Dialog; onSent: () => void; itemStyle: TouchableProps['style']; labelStyle: StyleProp<TextStyle>; quickStyle?: TouchableProps['style']; quickLabelStyle?: StyleProp<TextStyle> }) {
  const t = useT();
  const { theme } = useUnistyles();
  const messenger = useMessenger();
  const selected = useMessengerState((s) => s.aiModels[dialog.id]);
  const errorText = useErrorText();
  const [history, setHistory] = useState(false);
  const [creating, setCreating] = useState(false);
  if (!messenger) return null;
  const create = async () => {
    if (creating) return;
    setCreating(true);
    try {
      await dialogApi.sessionCreate(api, dialog.id);
      await messenger.reloadDialog(dialog.id);
      onSent();
    } catch (err) { showToast(errorText(err)); }
    finally { setCreating(false); }
  };
  return (
    <>
      {aiQuickMsgs(dialog).map((item) => {
        if (item.key === '~ai-model-select') {
          const active = selected || item.config?.model;
          return <Popover key={item.key} testID="ai-model-trigger" accessibilityLabel={t('messenger:ai.selectModel')} side="top" align="start" style={itemStyle} panelStyle={styles.menu}
            content={(close) => <ScrollView testID="ai-model-menu" style={styles.options} keyboardShouldPersistTaps="handled">
              {(item.config?.models ?? []).map((model) => <Touchable key={model.value} testID={`ai-model-option-${model.value}`} disabled={model.value === active} accessibilityRole="menuitem" aria-disabled={model.value === active}
                onPress={() => { messenger.selectAiModel(dialog.id, model.value); close(); }} style={styles.option}>
                <Text style={styles.optionText(model.value === active)}>{model.label}</Text>
                {model.value === active && <Icon icon={Check} size={theme.size.aiInline.check} color={theme.colors.primary} />}
              </Touchable>)}
            </ScrollView>}>
            <Text style={labelStyle}>{aiModelLabel(item, selected)}</Text>
          </Popover>;
        }
        const isNew = item.key === '~ai-session-create';
        return <Touchable key={item.key} testID={isNew ? 'ai-new-session' : 'ai-history'} accessibilityRole="button" disabled={isNew && creating} onPress={isNew ? () => void create() : () => setHistory(true)} style={itemStyle}>
          <Text style={labelStyle}>{isNew ? t('messenger:ai.newSession') : t('messenger:ai.history')}</Text>
        </Touchable>;
      })}
      {quickMsgs(dialog).map((item) => <Touchable key={item.key} accessibilityRole="button" style={quickStyle ?? itemStyle} onPress={() => { messenger.sendText({ dialog_id: dialog.id, text: quickMsgHtml(item) }); onSent(); }}>
        <Text style={quickLabelStyle ?? labelStyle} numberOfLines={1}>{item.label}</Text>
      </Touchable>)}
      {history && <AiSessionHistory dialog={dialog} visible onClose={() => setHistory(false)} onChanged={onSent} />}
    </>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  menu: { width: rt.breakpoint === 'xs' ? theme.size.aiInline.widthNarrow : theme.size.aiInline.width, paddingVertical: theme.size.aiInline.padY, paddingHorizontal: 0, backgroundColor: theme.colors.surface, borderRadius: theme.radius.block, boxShadow: theme.shadow.menuRoomy },
  options: { maxHeight: theme.size.aiInline.maxHeight },
  option: { minHeight: theme.size.aiInline.row, paddingHorizontal: theme.size.aiInline.padX, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionText: (disabled: boolean) => ({ ...theme.typography.aiInline, color: disabled ? theme.colors.aiInline.disabled : theme.colors.regularText }),
}));
