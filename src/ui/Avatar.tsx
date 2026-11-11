import { Image } from 'expo-image';
import { Bot, Layers, ListTodo, User, Users } from 'lucide-react-native';
import { memo, type ReactNode, useState } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { AppTheme } from './theme';
import { Icon, type LucideIcon } from './Icon';

export type AvatarSize = AppTheme['size']['avatar'][keyof AppTheme['size']['avatar']];

/**
 * 头像（docs/ui-spec.md 1.5、第 5 节），全应用只有这一个实现：
 * - 成员：有图显示图；没图或加载失败时按 userid 取色板底加首字，机器人用 Bot 图标
 * - 会话：有图显示图；没图按群类型显示彩色底图标，单聊没有对方资料时显示单人图标
 */
export const UserAvatar = memo(function UserAvatar({
  uri,
  userid,
  name,
  bot,
  size,
  online,
}: {
  uri?: string | null;
  userid: number;
  name: string;
  bot?: boolean;
  size: AvatarSize;
  /** 传了才画右下角的在线点（同旧版）：在线品牌色、离线橙色 */
  online?: boolean;
}) {
  const { theme } = useUnistyles();
  const colors = theme.palette.avatarUser;
  const color = bot ? theme.palette.avatarGroup.default : colors[Math.abs(userid) % colors.length]!;
  const avatar = (
    <ImageOr uri={uri} size={size} color={color}>
      {bot ? (
        <Icon icon={Bot} color={theme.palette.onAvatar} size={Math.round(size * 0.55)} />
      ) : (
        <Text style={styles.initial(size)} allowFontScaling={false}>
          {avatarInitial(name)}
        </Text>
      )}
    </ImageOr>
  );
  if (online === undefined) return avatar;
  return (
    <View>
      {avatar}
      <View style={styles.dot(online)} />
    </View>
  );
});

/** 首字：中文取一个字，其他取前两个字符（同旧前端），没名字时为 D */
export function avatarInitial(name: string): string {
  const chars = Array.from(name.trim()).slice(0, 2);
  if (chars.length === 0) return 'D';
  return chars.every((c) => /[一-龥]/.test(c)) ? chars[0]! : chars.join('');
}

// 各字形在方框里的视觉占比不同，换算到同样的视觉大小（同旧前端 DialogAvatar）
const GROUP_ICONS: Record<string, { icon: LucideIcon; ratio: number }> = {
  department: { icon: Users, ratio: 0.5 },
  project: { icon: Layers, ratio: 0.6 },
  task: { icon: ListTodo, ratio: 0.57 },
  okr: { icon: ListTodo, ratio: 0.57 },
};

export const DialogAvatar = memo(function DialogAvatar({ uri, groupType, person, size }: { uri?: string | null; groupType?: string | null; person?: boolean; size: AvatarSize }) {
  const { theme } = useUnistyles();
  const groups = theme.palette.avatarGroup;
  const kind = person ? undefined : GROUP_ICONS[groupType ?? ''];
  const color = (!person && groups[groupType as keyof typeof groups]) || groups.default;
  const { icon, ratio } = kind ?? { icon: person ? User : Users, ratio: 0.5 };
  return (
    <ImageOr uri={uri} size={size} color={color}>
      <Icon icon={icon} color={theme.palette.onAvatar} size={Math.round(size * ratio)} />
    </ImageOr>
  );
});

/** 圆形图片；没有图或加载失败时为底色加 children。换了地址会重新加载 */
function ImageOr({ uri, size, color, children }: { uri?: string | null; size: number; color: string; children: ReactNode }) {
  const [failed, setFailed] = useState<string>();
  if (uri && uri !== failed) {
    // expo-image 不是 unistyles 接管的组件，Web 上收不到 StyleSheet 生成的样式，尺寸直接传
    return <Image source={uri} style={{ width: size, height: size, borderRadius: size / 2 }} onError={() => setFailed(uri)} recyclingKey={uri} cachePolicy="memory-disk" />;
  }
  return <View style={[styles.shape(size), styles.fallback(color)]}>{children}</View>;
}

const styles = StyleSheet.create((theme) => ({
  shape: (size: number) => ({ width: size, height: size, borderRadius: size / 2 }),
  fallback: (color: string) => ({ alignItems: 'center', justifyContent: 'center', backgroundColor: color }),
  dot: (online: boolean) => ({
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: theme.size.dot,
    height: theme.size.dot,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.surface,
    backgroundColor: online ? theme.colors.primary : theme.colors.offline,
  }),
  initial: (size: number) => ({ color: theme.palette.onAvatar, fontSize: Math.round(size * 0.42), fontWeight: '500' }),
}));
