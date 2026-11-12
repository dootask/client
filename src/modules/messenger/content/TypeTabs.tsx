import { ScrollView, Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { MsgFilterType } from '../../../sync/messenger/rules';
import { Icon } from '../../../ui/Icon';
import { useSplitView } from '../../../ui/layout';
import { Touchable } from '../../../ui/Touchable';
import { MSG_TYPE_ICONS, MSG_TYPE_LABELS } from '../chat/msgTypes';

export function TypeTabs({ types, selected, todoNum, onSelect }: { types: readonly MsgFilterType[]; selected: MsgFilterType; todoNum: number; onSelect: (type: MsgFilterType) => void }) {
  const t = useT();
  const wide = useSplitView();
  const { theme } = useUnistyles();
  return (
    <ScrollView testID="content-types" horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.tabs}>
      {types.map((type) => (
        <Touchable key={type} testID={`content-type-${type}`} accessibilityRole="tab" aria-selected={type === selected} onPress={() => onSelect(type)} style={styles.tab(wide, type === selected)}>
          <Icon icon={MSG_TYPE_ICONS[type]} color={theme.palette.msgType[type]} size={wide ? theme.size.chatTypeIcon : theme.size.chatTypeIconNarrow} />
          <Text style={styles.text(wide, type === selected)}>{t(MSG_TYPE_LABELS[type])}{type === 'todo' && todoNum > 0 ? ` ${todoNum}` : ''}</Text>
        </Touchable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  scroll: { flexGrow: 0 },
  tabs: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm, gap: theme.size.chatTypeGap },
  tab: (wide: boolean, active: boolean) => ({ flexDirection: 'row', alignItems: 'center', gap: wide ? theme.size.chatTypeIconGap : theme.size.chatTypeIconGapNarrow, paddingHorizontal: wide ? theme.size.chatTypePadX : theme.size.chatTypePadXNarrow, borderRadius: theme.radius.chatType, backgroundColor: active ? theme.colors.typeActiveFill : 'transparent' }),
  text: (wide: boolean, active: boolean) => ({ ...(wide ? theme.typography.chatType : theme.typography.chatTypeNarrow), fontWeight: active ? '500' : '400', color: active ? theme.colors.primary : theme.colors.titleText }),
}));
