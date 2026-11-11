import { memo, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../../../i18n';
import { UserAvatar } from '../../../../ui/Avatar';
import { CheckMark } from '../../../../ui/CheckMark';
import { Touchable } from '../../../../ui/Touchable';
import { useSession } from '../../../session';
import { useUser } from '../../hooks';

/**
 * 成员行：头像、昵称（自己带「自己」标签）；checked 有值时右侧是勾选圈，否则放 trailing。
 * 不传 onPress 时不可点
 */
export const UserCheckRow = memo(function UserCheckRow({
  userid,
  checked,
  trailing,
  onPress,
}: {
  userid: number;
  checked?: boolean;
  trailing?: ReactNode;
  onPress?: (userid: number) => void;
}) {
  const t = useT();
  const user = useUser(userid);
  const self = useSession((s) => s.user?.userid ?? 0) === userid;
  const name = user?.nickname ?? '';
  // 整行的点按层垫在底下，内容浮在上面不接事件；trailing 里可以再放按钮，不会嵌进行的按钮里
  return (
    <View style={styles.row}>
      <Touchable
        accessibilityRole={checked === undefined ? 'button' : 'checkbox'}
        aria-checked={checked}
        accessibilityLabel={name}
        disabled={!onPress}
        onPress={() => onPress?.(userid)}
        style={({ pressed, hovered }) => styles.press(!!onPress && pressed, !!onPress && hovered)}
      />
      <View style={styles.main} pointerEvents="none">
        <UserAvatar uri={user?.userimg} userid={userid} name={name} bot={!!user?.bot} size={32} />
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {self && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>{t('messenger:todos.self')}</Text>
          </View>
        )}
      </View>
      {checked === undefined ? trailing : <CheckMark checked={checked} />}
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: theme.size.rowSingle,
    paddingHorizontal: theme.spacing.page,
  },
  press: (pressed: boolean, hovered: boolean) => ({
    ...StyleSheet.absoluteFillObject,
    backgroundColor: pressed ? theme.colors.fillPressed : hovered ? theme.colors.hover : 'transparent',
  }),
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  name: { ...theme.typography.body, color: theme.colors.text, flexShrink: 1 },
  tag: {
    paddingHorizontal: theme.spacing.xs + 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.fill,
  },
  tagText: { ...theme.typography.caption, color: theme.colors.text3 },
}));
