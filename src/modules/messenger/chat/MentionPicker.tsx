import { AtSign, Bot, ClipboardList, FileText, ListTodo, SquareSlash } from 'lucide-react-native';
import { useEffect, useMemo, useState, type RefObject } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { mentionQuery, type MentionChar, type MentionGroup, type MentionGroupKind, type MentionSession, type PickerChar, type StoredDialog } from '../../../sync/messenger';
import { DialogAvatar, UserAvatar } from '../../../ui/Avatar';
import { Icon, type LucideIcon } from '../../../ui/Icon';
import { Touchable } from '../../../ui/Touchable';
import { useUsers } from '../hooks';
import { useComposeState, type ComposeStore } from './composeStore';

/** 一个候选：@ 的成员带头像资料，id 0 为所有人；tip 显示在右侧（/ 菜单里是符号或命令） */
export interface Candidate {
  id: number;
  name: string;
  tip?: string;
  user?: { userimg?: string | null; online?: boolean | null; bot?: boolean };
}

export interface CandidateSection {
  label: string;
  items: Candidate[];
}

/** 输入框按键先交给候选列表（Web 上下键选择、回车选中、Esc 关闭），处理了返回 true */
export type PickerKeys = RefObject<((key: string) => boolean) | null>;

/** 候选列表最多露出几行，多的在框内滚动 */
const MAX_ROWS = 4.5;
/** 边打字边搜，停下来才发请求 */
const SEARCH_DELAY = 250;
/** 机器人命令只在 / 写在内容开头、内容不长时出（与旧前端一致） */
export const BOT_COMMAND_MAX_TEXT = 100;

const ICONS: Partial<Record<PickerChar, LucideIcon>> = { '#': ListTodo, '~': FileText, '%': ClipboardList, '/': SquareSlash };
/** / 菜单里换成另一种候选的项，图标同那种候选 */
const SLASH_ICONS: Record<string, LucideIcon> = { '@': AtSign, '#': ListTodo, '~': FileText, '%': ClipboardList };

/** / 菜单：换成另一种候选（tip 为符号），或填入机器人命令（tip 为命令） */
const SLASH_PICKERS = [
  { tip: '@', label: 'messenger:mention.slash.mention' },
  { tip: '#', label: 'messenger:mention.slash.task' },
  { tip: '~', label: 'messenger:mention.slash.file' },
  { tip: '%', label: 'messenger:mention.slash.report' },
] as const;
const MANAGER_COMMANDS = {
  list: 'messenger:mention.command.list',
  newbot: 'messenger:mention.command.newbot',
} as const;
const BOT_COMMANDS = {
  help: 'messenger:mention.command.help',
  api: 'messenger:mention.command.api',
  info: 'messenger:mention.command.info',
  setname: 'messenger:mention.command.setname',
  deletebot: 'messenger:mention.command.deletebot',
  token: 'messenger:mention.command.token',
  revoke: 'messenger:mention.command.revoke',
  clearday: 'messenger:mention.command.clearday',
  webhook: 'messenger:mention.command.webhook',
  dialog: 'messenger:mention.command.dialog',
} as const;
const GROUP_LABELS = {
  outsiders: 'messenger:mention.group.outsiders',
  projectTasks: 'messenger:mention.group.projectTasks',
  myTasks: 'messenger:mention.group.myTasks',
  assistTasks: 'messenger:mention.group.assistTasks',
  otherTasks: 'messenger:mention.group.otherTasks',
  files: 'messenger:mention.group.files',
  myReports: 'messenger:mention.group.myReports',
  receivedReports: 'messenger:mention.group.receivedReports',
} as const satisfies Record<MentionGroupKind, string>;

/**
 * / 菜单的候选（与旧前端一致）：提及、任务、文件、工作报告；机器人会话里 / 在行首时再加机器人命令。
 * 按名称或命令过滤
 */
function useSlashSections(keyword: string, chars: readonly PickerChar[], botCommands: 'manager' | 'own' | null): CandidateSection[] {
  const t = useT();
  const lower = keyword.toLowerCase();
  const keep = (item: Candidate) => !lower || item.name.toLowerCase().includes(lower) || item.tip!.toLowerCase().includes(lower);
  const pickers = SLASH_PICKERS.filter((item) => chars.includes(item.tip))
    .map((item, index) => ({ id: index, name: t(item.label), tip: item.tip }))
    .filter(keep);
  const commands = Object.entries(botCommands ? { ...(botCommands === 'manager' ? MANAGER_COMMANDS : {}), ...BOT_COMMANDS } : {})
    .map(([command, label], index) => ({ id: index, name: t(label), tip: `/${command}` }))
    .filter(keep);
  const sections: CandidateSection[] = [];
  if (pickers.length > 0) sections.push({ label: commands.length > 0 ? t('messenger:mention.quickMenu') : '', items: pickers });
  if (commands.length > 0) sections.push({ label: t('messenger:mention.botCommands'), items: commands });
  return sections;
}

/** / 菜单选中项要换掉「/关键词」的文字：另一种候选换成它的符号（接着弹它的候选），命令填入命令加空格 */
export function slashReplacement(item: Candidate) {
  return item.tip!.length === 1 ? item.tip! : `${item.tip} `;
}

const EMPTY: number[] = [];

/** @ 候选：在线的人在前，机器人在最后 */
const memberRank = (user: Candidate['user']) => (user?.bot ? 2 : user?.online ? 0 : 1);

/**
 * 输入栏候选：@ 的群内成员按用户目录本地过滤，群外成员和 # ~ % 按关键词向服务端取
 */
function useMentionSections(query: { char: MentionChar; query: string } | null, session: MentionSession, userId: number): { sections: CandidateSection[]; loading: boolean } {
  const t = useT();
  const char = query?.char;
  const keyword = query?.query ?? '';
  const [memberIds, setMemberIds] = useState<number[] | null>(null);
  const [remote, setRemote] = useState<{ char: MentionChar; keyword: string; groups: MentionGroup[] } | null>(null);
  const users = useUsers(memberIds ?? EMPTY);

  const wantMembers = char === '@' && !memberIds;
  useEffect(() => {
    if (!wantMembers) return;
    session
      .members()
      .then((rows) => setMemberIds(rows.map((row) => row.userid)))
      .catch(() => setMemberIds([]));
  }, [wantMembers, session]);

  const ready = char === '@' ? !!memberIds : !!char;
  useEffect(() => {
    if (!ready || !char) return;
    let stale = false;
    const done = (groups: MentionGroup[]) => !stale && setRemote({ char, keyword, groups });
    // 刚弹出（还没输入关键词）时立刻取，边打字边搜时停下来才取
    const timer = setTimeout(
      () => {
        session.search(char, keyword, memberIds ?? EMPTY).then(done, () => done([]));
      },
      keyword ? SEARCH_DELAY : 0,
    );
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [ready, char, keyword, memberIds, session]);

  return useMemo(() => {
    if (!char) return { sections: [], loading: false };
    // 换了符号时上一种的结果不能用；同一符号换关键词时先留着旧结果，取回再换，列表不闪空
    const groups = remote?.char === char ? remote.groups : [];
    const fetched = groups.map(({ kind, items }) => ({
      label: t(GROUP_LABELS[kind]),
      items: items.map(({ id, name, done, user }) => ({
        id,
        name,
        tip: done ? t('messenger:mention.completed') : undefined,
        user: user && { userimg: user.userimg, online: user.online, bot: !!user.bot },
      })),
    }));
    const loading = !ready || remote?.char !== char || remote.keyword !== keyword;
    if (char !== '@') return { sections: fetched, loading };
    if (!memberIds) return { sections: [], loading };
    const lower = keyword.toLowerCase();
    const others = memberIds.filter((id) => id !== userId);
    const items: Candidate[] = others
      .filter((id) => {
        const user = users[id];
        return !lower || `${user?.nickname ?? ''} ${user?.email ?? ''} ${user?.pinyin ?? ''}`.toLowerCase().includes(lower);
      })
      .map((id) => ({ id, name: users[id]?.nickname ?? '', user: { userimg: users[id]?.userimg, online: users[id]?.online, bot: !!users[id]?.bot } }))
      .filter((item) => item.name)
      .sort((a, b) => memberRank(a.user) - memberRank(b.user));
    const sections: CandidateSection[] = [];
    const everyone = t('messenger:mention.everyone');
    if (others.length > 1 && (!lower || everyone.toLowerCase().includes(lower))) sections.push({ label: '', items: [{ id: 0, name: everyone }] });
    if (items.length > 0) sections.push({ label: fetched.length > 0 ? t('messenger:mention.groupMembers') : '', items });
    return { sections: [...sections, ...fetched], loading };
  }, [char, keyword, memberIds, ready, remote, userId, users, t]);
}

const CHARS: readonly MentionChar[] = ['#', '~', '%'];
const GROUP_CHARS: readonly MentionChar[] = ['@', ...CHARS];
const BOT_MANAGER_EMAIL = 'bot-manager@bot.system';

/** 会话里可用的候选符号：单聊没有 @，都有 / 快捷菜单 */
export function pickerChars(dialog: StoredDialog | undefined): PickerChar[] {
  return [...(dialog?.type === 'group' ? GROUP_CHARS : CHARS), '/'];
}

/** 输入 / 时可用的机器人命令：机器人管理员会话（含管理命令）或自己创建的机器人单聊 */
function botCommandsOf(dialog: StoredDialog | undefined, userId: number): 'manager' | 'own' | null {
  if (dialog?.type !== 'user' || !dialog.bot) return null;
  if (dialog.email === BOT_MANAGER_EMAIL) return 'manager';
  return dialog.bot === userId ? 'own' : null;
}

/** 正在输入的候选查询；commands 为能出机器人命令（/ 写在内容开头、内容不长） */
export interface PickerQuery {
  char: PickerChar;
  query: string;
  commands: boolean;
}

/**
 * 候选浮层：@ # ~ % 弹出对应候选，/ 弹出快捷菜单。一直挂着（候选数据跨多次弹出保留），没有候选也不在加载时不显示。
 * 输入栏和全屏编辑共用，查询由调用方给
 */
export function MentionCandidates({ query, dialog, session, userId, keysRef, onPick, onDismiss }: {
  query: PickerQuery | null;
  dialog: StoredDialog | undefined;
  session: MentionSession;
  userId: number;
  keysRef: PickerKeys;
  onPick: (char: PickerChar, item: Candidate) => void;
  /** Web 上按 Esc 收起 */
  onDismiss: () => void;
}) {
  const chars = pickerChars(dialog).filter((char) => char !== '/');
  const slash = query?.char === '/';
  const slashSections = useSlashSections(slash ? query.query : '', chars, slash && query.commands ? botCommandsOf(dialog, userId) : null);
  const remote = useMentionSections(query && !slash ? { char: query.char as MentionChar, query: query.query } : null, session, userId);
  if (!query) return null;
  const sections = slash ? slashSections : remote.sections;
  const loading = !slash && remote.loading;
  if (sections.length === 0 && !loading) return null;
  return <PickerCard sections={sections} loading={loading} char={query.char} keysRef={keysRef} onPick={onPick} onDismiss={onDismiss} />;
}

/** 输入栏上方的候选：光标前正在输入的查询；带格式的内容在全屏编辑里改，这里不弹 */
export function MentionAccessory({ store, dialog, session, userId, keysRef, onPick }: {
  store: ComposeStore;
  dialog: StoredDialog | undefined;
  session: MentionSession;
  userId: number;
  keysRef: PickerKeys;
  /** start 为候选符号在文字里的位置，到光标为止是查询文字 */
  onPick: (start: number, char: PickerChar, item: Candidate) => void;
}) {
  const { value, cursor } = useComposeState(store);
  const found = value.html ? null : mentionQuery(value, cursor, pickerChars(dialog));
  // Esc 收起的那个符号不再弹，换了位置或删掉后恢复
  const [dismissed, setDismissed] = useState<number | null>(null);
  if (dismissed !== null && found?.start !== dismissed) setDismissed(null);
  const query = found && found.start !== dismissed ? found : null;
  const commands = !!query && !value.text.slice(0, query.start).trim() && value.text.length <= BOT_COMMAND_MAX_TEXT;
  return (
    <MentionCandidates
      query={query && { char: query.char, query: query.query, commands }}
      dialog={dialog}
      session={session}
      userId={userId}
      keysRef={keysRef}
      onPick={(char, item) => query && onPick(query.start, char, item)}
      onDismiss={() => query && setDismissed(query.start)}
    />
  );
}

type Row = { label: string } | { item: Candidate; index: number };

function PickerCard({ sections, loading, char, keysRef, onPick, onDismiss }: {
  sections: CandidateSection[];
  loading: boolean;
  char: PickerChar;
  keysRef: PickerKeys;
  onPick: (char: PickerChar, item: Candidate) => void;
  onDismiss: () => void;
}) {
  const { theme } = useUnistyles();
  const rows = useMemo(() => {
    let index = 0;
    return sections.flatMap<Row>(({ label, items }) => [...(label ? [{ label }] : []), ...items.map((item) => ({ item, index: index++ }))]);
  }, [sections]);
  const items = useMemo(() => rows.flatMap((row) => ('item' in row ? [row.item] : [])), [rows]);

  // Web 键盘选择：候选变了回到第一项
  const [active, setActive] = useState({ items, index: 0 });
  if (active.items !== items) setActive({ items, index: 0 });
  useEffect(() => {
    keysRef.current = (key) => {
      if (key === 'Escape') {
        onDismiss();
        return true;
      }
      if (items.length === 0) return false;
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        const step = key === 'ArrowDown' ? 1 : -1;
        setActive((a) => ({ items, index: (a.index + step + items.length) % items.length }));
        return true;
      }
      if (key === 'Enter' || key === 'Tab') {
        onPick(char, items[active.index] ?? items[0]!);
        return true;
      }
      return false;
    };
    return () => {
      keysRef.current = null;
    };
  }, [keysRef, items, active.index, char, onPick, onDismiss]);

  return (
    <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(100)} style={styles.card}>
      <FlatList
        style={styles.list}
        data={rows}
        keyExtractor={(row) => ('item' in row ? `i${row.index}` : `l${row.label}`)}
        keyboardShouldPersistTaps="always"
        ListFooterComponent={loading ? <ActivityIndicator style={rows.length > 0 ? styles.moreLoading : styles.loading} color={theme.colors.text3} /> : undefined}
        renderItem={({ item: row }) =>
          'item' in row ? (
            <CandidateRow item={row.item} char={char} active={row.index === active.index} onPress={() => onPick(char, row.item)} />
          ) : (
            <Text style={styles.label} numberOfLines={1}>
              {row.label}
            </Text>
          )
        }
      />
    </Animated.View>
  );
}

function CandidateRow({ item, char, active, onPress }: { item: Candidate; char: PickerChar; active: boolean; onPress: () => void }) {
  const { theme } = useUnistyles();
  const icon = (char === '/' && item.tip && SLASH_ICONS[item.tip]) || ICONS[char];
  return (
    <Touchable accessibilityRole="button" onPress={onPress} style={({ pressed, hovered }) => styles.row(pressed, hovered || active)}>
      {icon ? (
        <View style={styles.iconBox}>
          <Icon icon={icon} color={theme.colors.text2} size={theme.size.icon} />
        </View>
      ) : (
        <View>
          {item.id === 0 ? (
            <DialogAvatar size={theme.size.avatar.md} />
          ) : (
            <UserAvatar uri={item.user?.userimg} userid={item.id} name={item.name} bot={item.user?.bot} size={theme.size.avatar.md} />
          )}
          {!!item.user?.online && !item.user.bot && <View style={styles.online} />}
        </View>
      )}
      <Text style={styles.name} numberOfLines={1}>
        {item.name}
      </Text>
      {!!item.user?.bot && <Icon icon={Bot} color={theme.colors.text3} size={theme.size.iconSmall} />}
      {!!item.tip && <Text style={styles.tip}>{item.tip}</Text>}
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    marginHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    maxWidth: theme.size.dialogWidth,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    boxShadow: theme.shadow.popover,
  },
  list: { maxHeight: theme.size.rowSingle * MAX_ROWS, borderRadius: theme.radius.card },
  label: {
    ...theme.typography.footnote,
    color: theme.colors.text3,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  row: (pressed: boolean, highlighted: boolean) => ({
    height: theme.size.rowSingle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: pressed ? theme.colors.fillPressed : highlighted ? theme.colors.hover : undefined,
  }),
  iconBox: { width: theme.size.avatar.md, alignItems: 'center' },
  name: { ...theme.typography.callout, color: theme.colors.text, flex: 1 },
  tip: { ...theme.typography.footnote, color: theme.colors.text3 },
  loading: { height: theme.size.rowSingle },
  moreLoading: { height: theme.size.menuRow },
  online: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: theme.size.dot + 2,
    height: theme.size.dot + 2,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    backgroundColor: theme.colors.online,
  },
}));
