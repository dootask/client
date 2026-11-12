import { SquarePen, X } from 'lucide-react-native';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View, type ListRenderItemInfo } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { dialogApi } from '../../../sync/api';
import type { Dialog, DialogSession } from '../../../sync/api/dialog';
import { DooButton, DooModal } from '../../../ui/DooModal';
import { Icon } from '../../../ui/Icon';
import { TextField } from '../../../ui/TextField';
import { showToast } from '../../../ui/Toast';
import { Touchable } from '../../../ui/Touchable';
import { api, useErrorText } from '../../session';
import { useToday } from '../clock';
import { useMessenger } from '../hooks';
import { listTimeText } from '../listModel';
import { AiHistoryFrame } from './AiHistoryFrame';
import { historyTouch } from './aiHistoryTraits';

const keyOf = (item: DialogSession) => String(item.id);

export function AiSessionHistory({ dialog, visible, onClose, onChanged }: { dialog: Dialog; visible: boolean; onClose: () => void; onChanged: () => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const errorText = useErrorText();
  const messenger = useMessenger();
  const [rows, setRows] = useState<DialogSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState(0);
  const [rename, setRename] = useState<DialogSession | null>(null);
  const [renaming, setRenaming] = useState(0);
  const paging = useRef({ next: 1, last: 1, busy: false });
  const alive = useRef(true);
  const load = useCallback(async () => {
    const p = paging.current;
    if (p.busy || p.next > p.last) return;
    p.busy = true;
    setLoading(true);
    try {
      const result = await dialogApi.sessionList(api, { dialog_id: dialog.id, page: p.next, pagesize: 50 });
      if (!alive.current) return;
      p.next = result.current_page + 1;
      p.last = result.last_page;
      setRows((prev) => [...prev, ...result.data.filter((item) => !prev.some((row) => row.id === item.id))]);
    } catch (err) {
      if (alive.current) showToast(errorText(err));
    } finally {
      p.busy = false;
      if (alive.current) setLoading(false);
    }
  }, [dialog.id, errorText]);
  useEffect(() => {
    alive.current = true;
    void load();
    return () => { alive.current = false; };
  }, [load]);
  const open = useCallback(async (row: DialogSession) => {
    if (opening || !messenger) return;
    if (row.is_open) return onClose();
    setOpening(row.id);
    try {
      await dialogApi.sessionOpen(api, row.id);
      await messenger.reloadDialog(dialog.id);
      onChanged();
      onClose();
    } catch (err) {
      showToast(errorText(err));
    } finally {
      if (alive.current) setOpening(0);
    }
  }, [opening, messenger, dialog.id, onChanged, onClose, errorText]);
  const saveName = async (row: DialogSession, title: string) => {
    setRename(null);
    setRenaming(row.id);
    try {
      const changed = await dialogApi.sessionRename(api, row.id, title);
      if (alive.current) setRows((prev) => prev.map((item) => item.id === changed.id ? { ...item, title: changed.title } : item));
    } catch (err) { showToast(errorText(err)); }
    finally { if (alive.current) setRenaming(0); }
  };
  const renderItem = useCallback(({ item, index }: ListRenderItemInfo<DialogSession>) => (
    <HistoryRow row={item} last={index === rows.length - 1} opening={opening === item.id} renaming={renaming === item.id} disabled={!!opening || !!renaming} onOpen={open} onRename={setRename} />
  ), [opening, renaming, open, rows.length]);
  return (
    <AiHistoryFrame visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text testID="ai-history-title" numberOfLines={1} style={styles.title}>{t('messenger:ai.historyTitle', { name: dialog.name })}</Text>
        <Touchable accessibilityLabel={t('close')} onPress={onClose} style={styles.close}>
          <Icon icon={X} size={theme.size.iconSmall} color={theme.colors.descText} />
        </Touchable>
      </View>
      <FlatList data={rows} renderItem={renderItem} keyExtractor={keyOf} contentContainerStyle={styles.list} onEndReached={() => void load()} onEndReachedThreshold={0.05}
        ListFooterComponent={loading ? <View style={styles.more}><ActivityIndicator size={theme.size.aiHistory.moreIcon} color={theme.colors.descText} /></View> : undefined} />
      {rename && <RenameSession row={rename} onClose={() => setRename(null)} onSave={(title) => void saveName(rename, title)} />}
    </AiHistoryFrame>
  );
}

const HistoryRow = memo(function HistoryRow({ row, last, opening, renaming, disabled, onOpen, onRename }: { row: DialogSession; last: boolean; opening: boolean; renaming: boolean; disabled: boolean; onOpen: (row: DialogSession) => void; onRename: (row: DialogSession) => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const today = useToday();
  const touch = historyTouch();
  const [focused, setFocused] = useState(false);
  return (
    <Touchable testID={`ai-history-row-${row.id}`} onPress={() => onOpen(row)} disabled={disabled} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ hovered }) => styles.row(!touch && hovered, last)}>
      {({ hovered }) => <>
        {opening && <ActivityIndicator size={theme.size.aiHistory.loading} color={theme.colors.descText} />}
        {!!row.is_open && <Text style={styles.current}>{t('messenger:ai.current')}</Text>}
        <Text numberOfLines={1} style={styles.rowTitle}>{row.title || t('messenger:ai.untitled')}</Text>
        <Touchable disabled={disabled} accessibilityLabel={t('messenger:ai.rename')} onPress={(event) => { event.stopPropagation(); onRename(row); }} style={styles.pencil(renaming || touch || hovered || focused)}>
          {renaming ? <ActivityIndicator size={theme.size.aiHistory.loading} color={theme.colors.aiHistory.icon} /> : <Icon icon={SquarePen} size={theme.size.aiHistory.icon} color={theme.colors.aiHistory.icon} />}
        </Touchable>
        <Text style={styles.time}>{listTimeText(row.created_at, today, t('messenger:yesterday'))}</Text>
      </>}
    </Touchable>
  );
});

function RenameSession({ row, onClose, onSave }: { row: DialogSession; onClose: () => void; onSave: (title: string) => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const [title, setTitle] = useState(row.title ?? '');
  const save = () => {
    const clean = title.trim();
    if (!clean) return showToast(t('messenger:ai.renamePlaceholder'));
    if (clean === row.title) return onClose();
    onSave(clean);
  };
  return (
    <DooModal visible onClose={onClose} title={t('messenger:ai.renameTitle')} width={theme.size.aiHistory.renameWidth}
      footer={<><DooButton label={t('cancel')} onPress={onClose} /><DooButton label={t('confirm')} primary onPress={save} /></>}>
      <TextField autoFocus value={title} onChangeText={setTitle} placeholder={t('messenger:ai.renamePlaceholder')} onSubmitEditing={save} />
    </DooModal>
  );
}

const styles = StyleSheet.create((theme, rt) => {
  const h = theme.size.aiHistory;
  const narrow = rt.breakpoint === 'xs' || historyTouch();
  return {
    header: { height: h.header, paddingHorizontal: h.padX, justifyContent: 'center', borderBottomWidth: h.line, borderBottomColor: theme.colors.aiHistory.line },
    title: { ...theme.typography.aiHistoryTitle, color: theme.colors.titleText, textAlign: 'center', paddingHorizontal: h.close },
    close: { position: 'absolute', top: h.closeInset, right: h.closeInset, width: h.close, height: h.close, alignItems: 'center', justifyContent: 'center' },
    list: { padding: h.listPad },
    row: (hovered: boolean, last: boolean) => ({ flexDirection: 'row', alignItems: 'center', padding: h.rowPad, marginHorizontal: h.rowMargin, borderBottomWidth: last ? 0 : h.line, borderBottomColor: theme.colors.aiHistory.line, backgroundColor: hovered ? theme.colors.aiHistory.hover : undefined }),
    current: { ...theme.typography.aiHistoryTag, paddingHorizontal: h.tagPad, marginRight: h.tagPad, borderRadius: h.tagRadius, backgroundColor: theme.colors.aiHistory.current, color: theme.colors.onPrimary, overflow: 'hidden' },
    rowTitle: { ...theme.typography.aiHistoryRow, color: theme.colors.regularText, flex: 1 },
    pencil: (shown: boolean) => ({ opacity: shown ? 1 : 0, marginRight: h.iconGap }),
    time: { ...(narrow ? theme.typography.aiHistoryTimeNarrow : theme.typography.aiHistoryTime), color: theme.colors.regularText, opacity: theme.opacity.pressedIcon },
    more: { height: h.more, alignItems: 'center', justifyContent: 'center' },
  };
});
