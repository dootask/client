import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Mail, MessageCircle, UsersRound, type LucideIcon } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { dateFormats, useLanguage, useT } from '../../../i18n';
import { groupApi, usersApi } from '../../../sync/api';
import type { UserTag } from '../../../sync/api/users';
import { UserAvatar } from '../../../ui/Avatar';
import { Icon } from '../../../ui/Icon';
import { IconButton } from '../../../ui/IconButton';
import { ListItem, ListSection } from '../../../ui/List';
import { PageHeader } from '../../../ui/PageHeader';
import { showToast } from '../../../ui/Toast';
import { Touchable } from '../../../ui/Touchable';
import { openMedia } from '../../media';
import { api, useErrorText, useSession } from '../../session';
import { onlineText } from '../chat/format';
import { useNow } from '../clock';
import { useMessenger, useUser } from '../hooks';
import { openDialogRoute } from '../DialogList';

/** 资料里另外请求的部分：生日、简介、前几个标签、共同群组数、能否看其项目与任务 */
interface ProfileMore {
  birthday: string;
  introduction: string;
  tags: UserTag[];
  tagTotal: number;
  groups: number;
  works: boolean;
}

async function loadMore(userid: number): Promise<ProfileMore> {
  const [extra, groups] = await Promise.all([usersApi.extra(api, userid), groupApi.commonCount(api, userid).catch(() => 0)]);
  return {
    birthday: extra.birthday ?? '',
    introduction: extra.introduction ?? '',
    tags: extra.personal_tags,
    tagTotal: extra.personal_tags_total,
    groups,
    works: !!extra.works_visible,
  };
}

/** 资料页路由（App）：/user/[userid] */
export function ProfileRoute() {
  const { userid } = useLocalSearchParams<{ userid: string }>();
  return <ProfileScreen userid={Number(userid) || 0} />;
}

/**
 * 用户资料页（同旧版 App UserProfileScreen）：点头像、@某人、成员「查看资料」进入。
 * 基本资料取用户目录（有缓存先显示），生日、简介、标签、共同群组另外请求，到了再换上；
 * 从标签页回来时标签可能变了，每次回到本页都重新请求
 */
export function ProfileScreen({ userid }: { userid: number }) {
  const t = useT();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const errorText = useErrorText();
  const messenger = useMessenger();
  const self = useSession((s) => s.user?.userid === userid);
  const user = useUser(userid);
  const [more, setMore] = useState<ProfileMore | null>(null);
  // 大名字滚出导航栏之后，导航栏才显示名字
  const [nameBottom, setNameBottom] = useState(0);
  const [nameCovered, setNameCovered] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let stale = false;
      loadMore(userid)
        .then((data) => !stale && setMore(data))
        .catch(() => {});
      return () => {
        stale = true;
      };
    }, [userid]),
  );

  const failed = (err: unknown) => showToast(errorText(err));
  // 机器人的邮箱是系统内部地址，不展示也不联系
  const email = user && !user.bot ? (user.email ?? '') : '';
  const actions: { icon: LucideIcon; label: string; run: () => void }[] = [];
  if (user && !self) {
    actions.push(
      { icon: MessageCircle, label: t('messenger:profile.chat'), run: () => messenger?.openUser(userid).then((id) => openDialogRoute(id)).catch(failed) },
      { icon: UsersRound, label: t('messenger:profile.createGroup'), run: () => router.push({ pathname: '/group/create', params: { userids: String(userid) } }) },
    );
    if (email) actions.push({ icon: Mail, label: t('messenger:profile.sendEmail'), run: () => Linking.openURL(`mailto:${email}`).catch(() => {}) });
  }

  const infos = user
    ? [
        { label: t('messenger:profile.profession'), value: user.profession ?? '' },
        { label: t('messenger:profile.department'), value: user.department_name ?? '' },
        { label: t('messenger:profile.email'), value: email, url: `mailto:${email}` },
        { label: t('messenger:profile.birthday'), value: more?.birthday ?? '' },
      ].filter((item) => !!item.value)
    : [];

  const openTags = () => router.push({ pathname: '/user/[userid]/tags', params: { userid } });

  return (
    <View style={styles.page}>
      <PageHeader
        title={nameCovered ? (user?.nickname ?? '') : ''}
        left={<IconButton icon={ChevronLeft} label={t('back')} onPress={() => (router.canGoBack() ? router.back() : router.navigate('/messenger'))} />}
      />
      <ScrollView
        scrollEventThrottle={16}
        onScroll={(event) => setNameCovered(nameBottom > 0 && event.nativeEvent.contentOffset.y >= nameBottom)}
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + theme.spacing.xxl }]}
      >
        <View style={styles.hero}>
          {user ? (
            <Touchable disabled={!user.userimg} onPress={() => user.userimg && openMedia({ kind: 'pictures', items: [{ url: user.userimg }], position: 0 })}>
              <UserAvatar uri={user.userimg} userid={userid} name={user.nickname} bot={!!user.bot} size={theme.size.avatar.huge} />
            </Touchable>
          ) : (
            <View style={styles.avatarBlank} />
          )}
          {user ? (
            <Text style={styles.name} numberOfLines={2} selectable onLayout={(event) => setNameBottom(event.nativeEvent.layout.y + event.nativeEvent.layout.height)}>
              {user.nickname}
            </Text>
          ) : (
            <Blank width={120} lineHeight={theme.typography.title1.lineHeight} />
          )}
          <View style={styles.status}>
            {user?.bot ? <Text style={styles.statusText}>{t('messenger:profile.bot')}</Text> : user ? <Online online={!!user.online} lineAt={user.line_at} /> : <Blank width={64} lineHeight={theme.typography.footnote.lineHeight} />}
          </View>
          {!!more?.introduction && (
            <Text style={styles.intro} selectable>
              {more.introduction}
            </Text>
          )}
        </View>

        {actions.length > 0 && (
          <View style={styles.actions}>
            {actions.map(({ icon, label, run }) => (
              <Touchable key={label} onPress={run} style={({ pressed }) => styles.action(pressed)}>
                <Icon icon={icon} color={theme.colors.primaryText} size={theme.size.icon} />
                <Text style={styles.actionLabel} numberOfLines={1}>
                  {label}
                </Text>
              </Touchable>
            ))}
          </View>
        )}

        {user ? (
          <ListSection title={t('messenger:profile.info')}>
            {infos.map((item) => (
              <InfoRow key={item.label} {...item} />
            ))}
          </ListSection>
        ) : (
          <BlankSection />
        )}

        {user && (
          <ListSection title={t('messenger:profile.tags')}>
            {!more && (
              <View style={styles.chips}>
                {CHIP_BLANKS.map((width) => (
                  <View key={width} style={[styles.chipBlank, { width }]} />
                ))}
              </View>
            )}
            {!!more?.tags.length && (
              <Touchable onPress={openTags} style={({ pressed }) => [styles.chips, pressed && styles.pressed]}>
                {more.tags.map((tag) => (
                  <View key={tag.id} style={styles.chip(tag.recognized)}>
                    <Text style={styles.chipName(tag.recognized)}>{tag.name}</Text>
                    {tag.recognition_total > 0 && <Text style={styles.chipCount(tag.recognized)}>{tag.recognition_total}</Text>}
                  </View>
                ))}
              </Touchable>
            )}
            <ListItem
              label={t(more?.tagTotal === 0 ? 'messenger:profile.addTag' : 'messenger:profile.manageTags')}
              value={more?.tagTotal ? t('messenger:profile.count', { n: more.tagTotal }) : undefined}
              chevron
              onPress={openTags}
            />
          </ListSection>
        )}

        {user && (
          <ListSection>
            <ListItem
              label={t(self ? 'messenger:profile.myGroups' : 'messenger:profile.commonGroups')}
              value={more ? t('messenger:profile.count', { n: more.groups }) : undefined}
              chevron
              onPress={() => router.push({ pathname: '/user/[userid]/groups', params: { userid } })}
            />
            {more?.works && <ListItem label={t('messenger:profile.works')} chevron onPress={() => router.push({ pathname: '/user/[userid]/works', params: { userid } })} />}
          </ListSection>
        )}
      </ScrollView>
    </View>
  );
}

/** 在线带绿点，离线显示最后在线时间 */
function Online({ online, lineAt }: { online: boolean; lineAt: string | null | undefined }) {
  const t = useT();
  const language = useLanguage();
  const now = useNow();
  const text = onlineText(online, lineAt, now, t, dateFormats(language));
  return (
    <>
      <View style={styles.dot(online)} />
      {!!text && <Text style={styles.statusText}>{text}</Text>}
    </>
  );
}

/** 标签没到前的占位宽度 */
const CHIP_BLANKS = [56, 72, 48];

/** 文字没到前的占位条，与该行文字同高 */
function Blank({ width, lineHeight }: { width: number; lineHeight?: number }) {
  return (
    <View style={[styles.blankLine, { height: lineHeight }]}>
      <View style={[styles.blankBar, { width }]} />
    </View>
  );
}

/** 基本资料没到前的分组占位：个人信息几行 */
function BlankSection() {
  const { theme } = useUnistyles();
  return (
    <ListSection>
      {[72, 96, 140].map((width) => (
        <View key={width} style={styles.infoRow(false)}>
          <Blank width={48} lineHeight={theme.typography.footnote.lineHeight} />
          <Blank width={width} lineHeight={theme.typography.body.lineHeight} />
        </View>
      ))}
    </ListSection>
  );
}

/** 资料行：上为字段名，下为值；邮箱点了交给系统 */
function InfoRow({ label, value, url }: { label: string; value: string; url?: string }) {
  return (
    <Touchable disabled={!url} onPress={() => url && Linking.openURL(url).catch(() => {})} style={({ pressed }) => styles.infoRow(pressed)}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue(!!url)} selectable={!url}>
        {value}
      </Text>
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
  page: { flex: 1, backgroundColor: theme.colors.surface },
  body: { paddingTop: theme.spacing.xl },
  hero: { alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.page * 2, paddingBottom: theme.spacing.xl },
  name: { ...theme.typography.title1, textAlign: 'center', color: theme.colors.text },
  intro: { ...theme.typography.subhead, textAlign: 'center', color: theme.colors.text2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  statusText: { ...theme.typography.footnote, color: theme.colors.text3 },
  dot: (online: boolean) => ({ width: theme.spacing.sm, height: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: online ? theme.colors.online : theme.colors.text4 }),
  avatarBlank: { width: theme.size.avatar.huge, height: theme.size.avatar.huge, borderRadius: theme.radius.pill, backgroundColor: theme.colors.fill },
  blankLine: { justifyContent: 'center' },
  blankBar: { height: theme.size.profile.blankBar, borderRadius: theme.radius.pill, backgroundColor: theme.colors.fill },
  actions: { flexDirection: 'row', gap: theme.spacing.sm, marginHorizontal: theme.spacing.page, marginBottom: theme.spacing.xl },
  action: (pressed: boolean) => ({
    flex: 1,
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.card,
    backgroundColor: pressed ? theme.colors.fillPressed : theme.colors.fill,
  }),
  actionLabel: { ...theme.typography.caption, color: theme.colors.text },
  infoRow: (pressed: boolean) => ({ paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm, gap: theme.size.listLineGap, backgroundColor: pressed ? theme.colors.fillPressed : undefined }),
  infoLabel: { ...theme.typography.footnote, color: theme.colors.text3 },
  infoValue: (link: boolean) => ({ ...theme.typography.body, color: link ? theme.colors.link : theme.colors.text }),
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, padding: theme.spacing.lg },
  pressed: { backgroundColor: theme.colors.fillPressed },
  chipBlank: { height: theme.size.profile.chipBlank, borderRadius: theme.radius.pill, backgroundColor: theme.colors.fill },
  chip: (recognized: boolean) => ({
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    backgroundColor: recognized ? theme.colors.primarySoft : theme.colors.fill,
  }),
  chipName: (recognized: boolean) => ({ ...theme.typography.subhead, color: recognized ? theme.colors.primaryText : theme.colors.text }),
  chipCount: (recognized: boolean) => ({ ...theme.typography.caption, color: recognized ? theme.colors.primaryText : theme.colors.text3 }),
}));
