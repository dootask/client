import { router, useLocalSearchParams } from 'expo-router';
import { BellOff, EyeOff, Flag, Images, MailOpen, Palette, Pin, Plus, Search, Settings, Tags, UsersRound, VenetianMask } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { dialogUnread } from '../../../sync/messenger';
import { availableMsgTypes } from '../../../sync/messenger/rules';
import { DialogAvatar, UserAvatar } from '../../../ui/Avatar';
import { Icon } from '../../../ui/Icon';
import { ListItem, ListSection } from '../../../ui/List';
import { Sheet, SidePage } from '../../../ui/layout';
import { Touchable } from '../../../ui/Touchable';
import { openMedia } from '../../media';
import { DIALOG_COLORS, colorName } from '../colors';
import { AnonSheet } from '../chat/sheets/AnonSheet';
import { confirmGroup } from './confirm';
import { GroupForms, type GroupFormKind } from './GroupForms';
import { headerCommands, memberList } from './rules';
import { groupTypeText } from './typeText';
import { closeGroupPage, useGroupManage, useGroupMembers } from './useGroup';

export function InfoRoute() {
  const { dialogId } = useLocalSearchParams<{ dialogId: string }>();
  return <InfoScreen dialogId={Number(dialogId)} />;
}

function InfoScreen({ dialogId }: { dialogId: number }) {
  const t = useT();
  const { theme } = useUnistyles();
  const { d, me, can, admin, messenger, failed, leave } = useGroupManage(dialogId);
  const group = d?.type === 'group';
  const { members, load } = useGroupMembers(group ? dialogId : 0);
  const [form, setForm] = useState<GroupFormKind | null>(null);
  const [sheet, setSheet] = useState<'color' | 'anon' | 'avatar' | null>(null);
  const preview = useMemo(() => memberList(members ?? [], d, '').slice(0, theme.size.group.gridColumns * theme.size.group.gridRows - (can.add ? 1 : 0)), [members, d, theme.size.group.gridColumns, theme.size.group.gridRows, can.add]);
  const currentColor = colorName(d?.color);
  const peer = d?.dialog_user?.userid ?? 0;
  const title = t(group ? 'messenger:group.info.title' : 'messenger:group.info.dmTitle');
  const run = (task: Promise<unknown> | undefined) => void task?.catch(failed);
  const profile = (userid: number) => router.push({ pathname: '/user/[userid]', params: { userid } });
  const membersPage = () => router.push({ pathname: '/messenger/members/[dialogId]', params: { dialogId } });
  const viewAvatar = () => d?.avatar && openMedia({ kind: 'pictures', items: [{ url: d.avatar }], position: 0 });
  const hide = () => confirmGroup({ title: t('messenger:group.info.hide'), message: t('messenger:group.info.hideConfirm'), cancelLabel: t('cancel'), okLabel: t('messenger:group.info.hideAction'), onOk: () => run(messenger?.hideDialog(dialogId).then(() => router.dismissTo('/messenger'))) });
  return <SidePage title={title} onClose={() => closeGroupPage(dialogId)}>
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      {!!d && <>
        <View style={styles.hero}>
          <Touchable onPress={() => group ? setSheet('avatar') : profile(peer)}>
            {group ? <DialogAvatar uri={d.avatar} groupType={d.group_type} size={theme.size.avatar.xxl} /> : <UserAvatar userid={peer} name={d.name ?? ''} uri={d.userimg} bot={!!d.bot} size={theme.size.avatar.xxl} />}
          </Touchable>
          <View style={styles.heroText}><Touchable disabled={group && !can.rename} onPress={() => group ? setForm('edit') : profile(peer)}><Text style={styles.name}>{d.name}</Text></Touchable><Text style={styles.subtitle}>{group ? `${groupTypeText(d.group_type, t)} · ${t('messenger:group.info.people', { n: d.people ?? 0 })}` : d.bot ? t('messenger:tag.bot') : ''}</Text></View>
        </View>
        {group && <ListSection first>
          <ListItem label={t('messenger:group.members.title')} value={t('messenger:group.members.viewAll')} chevron onPress={membersPage} />
          <View style={styles.grid}>
            {preview.map((m) => <Touchable key={m.userid} style={styles.tile} onPress={() => profile(m.userid)}><UserAvatar userid={m.userid} name={m.nickname ?? ''} uri={m.userimg} bot={!!m.bot} size={theme.size.avatar.xl} /><Text style={styles.tileText} numberOfLines={1}>{m.nickname}</Text></Touchable>)}
            {can.add && <Touchable disabled={!members} style={styles.tile} onPress={() => setForm('add')}><View style={styles.add}><Icon icon={Plus} size={theme.size.icon} color={theme.colors.text2} /></View><Text style={styles.tileText}>{t('messenger:group.members.addShort')}</Text></Touchable>}
          </View>
        </ListSection>}
        <ListSection icons>
          <ListItem icon={Pin} label={t('messenger:group.info.top')} switchValue={!!d.top_at} onSwitch={() => run(messenger?.toggleTop(dialogId))} />
          <ListItem icon={BellOff} label={t('messenger:group.info.silence')} disabled={group && d.group_type !== 'user'} switchValue={!!d.silence} onSwitch={(value) => run(messenger?.setSilence(dialogId, value))} />
          <ListItem icon={MailOpen} label={t(dialogUnread(d, true) ? 'messenger:menu.read' : 'messenger:menu.unread')} onPress={() => run(messenger?.markDialog(dialogId, dialogUnread(d, true) ? 'read' : 'unread'))} />
          <ListItem icon={Palette} label={t('messenger:group.info.color')} value={currentColor ? t(currentColor === 'yellow' ? 'messenger:color.yellow' : currentColor === 'blue' ? 'messenger:color.blue' : currentColor === 'green' ? 'messenger:color.green' : currentColor === 'pink' ? 'messenger:color.pink' : 'messenger:color.purple') : t('messenger:color.default')} chevron onPress={() => setSheet('color')} />
        </ListSection>
        <ListSection icons>
          <ListItem icon={Search} label={t('messenger:group.info.search')} chevron onPress={() => router.push({ pathname: '/messenger/search/[dialogId]', params: { dialogId } })} />
          {availableMsgTypes(d).length > 0 && <ListItem icon={Images} label={t('messenger:group.info.media')} chevron onPress={() => router.push({ pathname: '/messenger/media/[dialogId]', params: { dialogId } })} />}
          {!group && !d.bot && <ListItem icon={Tags} label={t('messenger:profile.tags')} chevron onPress={() => router.push({ pathname: '/user/[userid]/tags', params: { userid: peer } })} />}
          {headerCommands(d, me, admin).includes('editBot') && <ListItem icon={Settings} label={t('messenger:group.info.botSettings')} chevron onPress={() => router.push({ pathname: '/messenger/bot/[dialogId]', params: { dialogId, mode: 'editBot' } })} />}
          {headerCommands(d, me, admin).includes('prompt') && <ListItem icon={Settings} label={t('messenger:group.info.prompt')} chevron onPress={() => router.push({ pathname: '/messenger/bot/[dialogId]', params: { dialogId, mode: 'prompt' } })} />}
          {!group && <ListItem icon={UsersRound} label={t('messenger:group.create.title')} chevron onPress={() => router.push({ pathname: '/group/create', params: { userids: peer === me ? '' : String(peer) } })} />}
          {can.transfer && <ListItem icon={UsersRound} label={t('messenger:group.info.transfer')} chevron onPress={() => router.push({ pathname: '/messenger/members/[dialogId]', params: { dialogId, mode: 'transfer' } })} />}
          {can.anon && <ListItem icon={VenetianMask} label={t('messenger:anon.entry')} chevron onPress={() => setSheet('anon')} />}
          {can.report && <ListItem icon={Flag} label={t('messenger:group.info.report')} chevron onPress={() => router.push({ pathname: '/messenger/report/[dialogId]', params: { dialogId } })} />}
          {!d.top_at && <ListItem icon={EyeOff} label={t('messenger:group.info.hide')} onPress={hide} />}
        </ListSection>
        {(can.exit || can.disband) && <ListSection>{can.exit && <ListItem danger label={t('messenger:group.info.exit')} onPress={() => leave(false)} />}{can.disband && <ListItem danger label={t('messenger:group.info.disband')} onPress={() => leave(true)} />}</ListSection>}
      </>}
    </ScrollView>
    {form && <GroupForms dialogId={dialogId} kind={form} members={members ?? []} onClose={() => setForm(null)} onChanged={() => run(load())} />}
    {sheet === 'anon' && <AnonSheet visible userid={peer} onClose={() => setSheet(null)} />}
    {sheet === 'avatar' && <Sheet visible title={t('messenger:group.info.avatar')} onClose={() => setSheet(null)}>{!!d?.avatar && <ListItem label={t('messenger:group.info.viewAvatar')} onPress={() => { setSheet(null); viewAvatar(); }} />}{can.edit && <ListItem label={t('messenger:group.info.changeAvatar')} onPress={() => { setSheet(null); setForm('edit'); }} />}</Sheet>}
    {sheet === 'color' && <Sheet visible title={t('messenger:group.info.color')} onClose={() => setSheet(null)}><ListItem label={t('messenger:color.default')} onPress={() => { run(messenger?.setColor(dialogId, '')); setSheet(null); }} />{DIALOG_COLORS.map((color) => <ListItem key={color.name} label={t(color.name === 'yellow' ? 'messenger:color.yellow' : color.name === 'blue' ? 'messenger:color.blue' : color.name === 'green' ? 'messenger:color.green' : color.name === 'pink' ? 'messenger:color.pink' : 'messenger:color.purple')} onPress={() => { run(messenger?.setColor(dialogId, color.value)); setSheet(null); }} />)}</Sheet>}
  </SidePage>;
}

const styles = StyleSheet.create((theme) => ({
  body: { paddingBottom: theme.spacing.xxl },
  hero: { padding: theme.spacing.page, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg, backgroundColor: theme.colors.surface },
  heroText: { flex: 1, gap: theme.spacing.xs },
  name: { ...theme.typography.title2, color: theme.colors.text },
  subtitle: { ...theme.typography.footnote, color: theme.colors.text3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: theme.spacing.sm },
  tile: { width: '20%', alignItems: 'center', gap: theme.spacing.xs, paddingVertical: theme.spacing.sm },
  tileText: { ...theme.typography.caption, maxWidth: '100%', color: theme.colors.text2 },
  add: { width: theme.size.group.preview, height: theme.size.group.preview, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.text4, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center' },
}));
