import { Check } from 'lucide-react-native';
import { ScrollView, Text, type StyleProp, type TextStyle } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { Dialog } from '../../../sync/api/dialog';
import { aiModelLabel, aiQuickMsgs, quickMsgs, quickMsgHtml } from '../../../sync/messenger';
import { Icon } from '../../../ui/Icon';
import { Popover } from '../../../ui/popover';
import { Touchable, type TouchableProps } from '../../../ui/Touchable';
import { useMessenger, useMessengerState } from '../hooks';
import { AiSessionHistory } from './AiSessionHistory';
import { useAiSession } from './useAiSession';

/** 网页快捷消息条的各项：AI 会话的模型、新会话、历史在前，机器人快捷指令在后（App 的 AI 入口在导航栏，见 ChatHeader） */
export function QuickMsgItems({ dialog, onSent, itemStyle, labelStyle }: { dialog: Dialog; onSent: () => void; itemStyle: TouchableProps['style']; labelStyle: StyleProp<TextStyle> }) {
  const t = useT();
  const { theme } = useUnistyles();
  const messenger = useMessenger();
  const selected = useMessengerState((s) => s.aiModels[dialog.id]);
  const session = useAiSession(dialog, onSent);
  if (!messenger) return null;
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
        return <Touchable key={item.key} testID={isNew ? 'ai-new-session' : 'ai-history'} accessibilityRole="button" disabled={isNew && session.creating} onPress={isNew ? () => void session.create() : session.openHistory} style={itemStyle}>
          <Text style={labelStyle}>{isNew ? t('messenger:ai.newSession') : t('messenger:ai.history')}</Text>
        </Touchable>;
      })}
      {quickMsgs(dialog).map((item) => <Touchable key={item.key} accessibilityRole="button" style={itemStyle} onPress={() => { messenger.sendText({ dialog_id: dialog.id, text: quickMsgHtml(item) }); onSent(); }}>
        <Text style={labelStyle} numberOfLines={1}>{item.label}</Text>
      </Touchable>)}
      {session.history && <AiSessionHistory dialog={dialog} visible onClose={session.closeHistory} onChanged={onSent} />}
    </>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  menu: { width: rt.breakpoint === 'xs' ? theme.size.aiInline.widthNarrow : theme.size.aiInline.width, paddingVertical: theme.size.aiInline.padY, paddingHorizontal: 0, backgroundColor: theme.colors.surface, borderRadius: theme.radius.block, boxShadow: theme.shadow.menuRoomy },
  options: { maxHeight: theme.size.aiInline.maxHeight },
  option: { minHeight: theme.size.aiInline.row, paddingHorizontal: theme.size.aiInline.padX, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionText: (disabled: boolean) => ({ ...theme.typography.aiInline, color: disabled ? theme.colors.aiInline.disabled : theme.colors.regularText }),
}));
