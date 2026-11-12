import { Image } from 'expo-image';
import { Camera, FolderOpen, Images, Maximize2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { CAN_CAPTURE, type PickedFile } from '../../../platform/files';
import { HAS_RECENT_PHOTOS, loadRecentPhotos, openPhotoSettings, photoAccess, type PhotoAccess } from '../../../platform/photos';
import { useChat } from '../../../ui/chat';
import { CheckOption } from '../../../ui/CheckMark';
import { Icon } from '../../../ui/Icon';
import type { AppTheme } from '../../../ui/theme';
import { Touchable } from '../../../ui/Touchable';
import type { Attach, PickSource } from './attach';
import type { Extra } from './extras';

/** 最近照片一次最多选几张 */
const SELECT_LIMIT = 9;
/** 读到照片前先占位的格数（铺满一屏宽即可） */
const PLACEHOLDERS = 6;
const COLUMNS = 4;
/** 相册、文件，能拍照时还有拍摄 */
const BASE_COUNT = CAN_CAPTURE ? 3 : 2;

/** 面板高度（同旧版 App）：一排最近照片 + 两排入口（只有一排时按一排），更多入口往下滚 */
export function morePanelHeight(theme: AppTheme, extraCount: number, aiBot = false): number {
  const rows = Math.min(2, Math.ceil(((aiBot ? 2 : BASE_COUNT) + extraCount) / COLUMNS));
  const strip = HAS_RECENT_PHOTOS && !aiBot ? theme.spacing.md + theme.size.photoThumb : 0;
  const cell = theme.size.moreEntry + theme.spacing.sm + theme.typography.caption.lineHeight + theme.spacing.xl;
  return strip + theme.spacing.xl + rows * cell;
}

/**
 * 加号面板（App）：上方最近照片（点选带序号，选了之后出现原图、预览、发送），下方相册、拍摄、文件入口。
 * 后面接投票、接龙等按会话类型给的入口。点入口先收起面板再打开系统选择器或弹层；整块上下滚
 */
export function MorePanel({ attach, extras, aiBot = false, onFullInput }: { attach: Attach; extras: Extra[]; aiBot?: boolean; onFullInput?: () => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const controller = useChat();
  const pick = (source: PickSource) => () => attach.pick(source);
  const entries: Extra[] = [
    ...(!aiBot ? [{ key: 'media', icon: Images, label: t('messenger:chat.album'), onPress: pick('media') }] : []),
    ...(CAN_CAPTURE && !aiBot ? [{ key: 'capture', icon: Camera, label: t('messenger:chat.capture'), onPress: pick('capture') }] : []),
    { key: 'file', icon: FolderOpen, label: t('messenger:chat.file'), onPress: pick('file') },
    ...extras,
    ...(aiBot && onFullInput ? [{ key: 'fullInput', icon: Maximize2, label: t('messenger:chat.fullInput'), onPress: onFullInput }] : []),
  ];
  return (
    <ScrollView style={styles.root} keyboardShouldPersistTaps="handled">
      {HAS_RECENT_PHOTOS && !aiBot && (
        <PhotoStrip
          onSend={(files, original) => {
            controller.closePanel();
            attach.send(files, { compress: !original });
          }}
          onPreview={(files, original) => {
            controller.closePanel();
            attach.offer(files, original);
          }}
        />
      )}
      <View style={styles.entries}>
        {entries.map(({ key, icon, label, onPress }) => (
          <Touchable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => {
              controller.closePanel();
              onPress();
            }}
            style={styles.entry}
          >
            {({ pressed }) => (
              <>
                <View style={styles.tile(pressed)}>
                  <Icon icon={icon} color={theme.colors.text} size={theme.size.moreEntryIcon} />
                </View>
                <Text style={styles.label} numberOfLines={1}>{label}</Text>
              </>
            )}
          </Touchable>
        ))}
      </View>
    </ScrollView>
  );
}

/** 最近照片：没授权时是一行授权提示，读到之前用灰块占位，面板不跳 */
function PhotoStrip({ onSend, onPreview }: {
  onSend: (files: PickedFile[], original: boolean) => void;
  onPreview: (files: PickedFile[], original: boolean) => void;
}) {
  const t = useT();
  const { theme } = useUnistyles();
  const [access, setAccess] = useState<PhotoAccess | null>(null);
  const [photos, setPhotos] = useState<PickedFile[] | null>(null);
  const [selected, setSelected] = useState<PickedFile[]>([]);
  const [original, setOriginal] = useState(false);

  useEffect(() => {
    let stale = false;
    photoAccess()
      .then((next) => !stale && setAccess(next))
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, []);

  useEffect(() => {
    if (access !== 'granted') return;
    let stale = false;
    loadRecentPhotos()
      .then((list) => !stale && setPhotos(list))
      .catch(() => !stale && setPhotos([]));
    return () => {
      stale = true;
    };
  }, [access]);

  if (access === 'ask' || access === 'denied') {
    return (
      <Touchable
        accessibilityRole="button"
        onPress={() => (access === 'ask' ? void photoAccess(true).then(setAccess).catch(() => {}) : openPhotoSettings())}
        style={({ pressed }) => [styles.ask, pressed && styles.askPressed]}
      >
        <Icon icon={Images} color={theme.colors.text2} size={theme.size.icon} />
        <Text style={styles.askText}>{t('messenger:chat.photoAccess')}</Text>
        {access === 'denied' && <Text style={styles.askAction}>{t('messenger:chat.openSettings')}</Text>}
      </Touchable>
    );
  }

  if (photos === null) {
    return (
      <View style={[styles.list, styles.placeholders]}>
        {Array.from({ length: PLACEHOLDERS }, (_, index) => <View key={index} style={styles.thumb} />)}
      </View>
    );
  }
  if (photos.length === 0) return null;

  const toggle = (photo: PickedFile) => {
    setSelected((list) => {
      if (list.some((item) => item.uri === photo.uri)) return list.filter((item) => item.uri !== photo.uri);
      return list.length < SELECT_LIMIT ? [...list, photo] : list;
    });
  };

  return (
    <View>
      <FlatList
        horizontal
        data={photos}
        extraData={selected}
        keyExtractor={(photo) => photo.uri}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const order = selected.findIndex((photo) => photo.uri === item.uri) + 1;
          return (
            <Touchable
              accessibilityRole="checkbox"
              aria-checked={order > 0}
              accessibilityLabel={item.name}
              onPress={() => toggle(item)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Image source={item.uri} style={styles.thumb} contentFit="cover" transition={120} recyclingKey={item.uri} />
              <View style={[styles.badge, order > 0 ? styles.badgeOn : styles.badgeOff]}>
                {order > 0 && <Text style={styles.badgeText}>{order}</Text>}
              </View>
            </Touchable>
          );
        }}
      />
      {/* 选了照片才出现操作条，面板往下滚出位置（同旧版 App） */}
      {selected.length > 0 && (
        <View style={styles.bar}>
          <CheckOption label={t('messenger:chat.original')} checked={original} onChange={setOriginal} />
          <View style={styles.spacer} />
          <Touchable
            accessibilityRole="button"
            onPress={() => {
              // 选中的交给预览，面板这边清掉，发完回来不留旧勾选
              onPreview(selected, original);
              setSelected([]);
            }}
            style={({ pressed }) => [styles.barButton, pressed && styles.pressed]}
          >
            <Text style={styles.barText}>{t('messenger:chat.preview')}</Text>
          </Touchable>
          <Touchable
            accessibilityRole="button"
            onPress={() => {
              onSend(selected, original);
              setSelected([]);
            }}
            style={({ pressed }) => [styles.barButton, styles.send, pressed && styles.pressed]}
          >
            <Text style={styles.sendText}>{t('messenger:chat.sendCount', { n: selected.length })}</Text>
          </Touchable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1 },
  pressed: { opacity: theme.opacity.pressedIcon },
  list: { gap: theme.spacing.xs, paddingHorizontal: theme.spacing.page, paddingTop: theme.spacing.md },
  placeholders: { flexDirection: 'row', overflow: 'hidden' },
  thumb: { width: theme.size.photoThumb, height: theme.size.photoThumb, borderRadius: theme.radius.bubbleTight, backgroundColor: theme.colors.fill },
  badge: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    width: theme.size.checkMark,
    height: theme.size.checkMark,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOn: { backgroundColor: theme.colors.primary },
  badgeOff: { borderWidth: 1.5, borderColor: theme.colors.onMedia, backgroundColor: theme.colors.mediaScrim },
  badgeText: { ...theme.typography.caption, fontWeight: '600', color: theme.colors.onPrimary },
  bar: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingHorizontal: theme.spacing.page, paddingTop: theme.spacing.sm },
  spacer: { flex: 1 },
  barButton: { height: theme.size.segment, justifyContent: 'center', paddingHorizontal: theme.spacing.sm },
  barText: { ...theme.typography.subhead, color: theme.colors.text },
  send: { borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.md, backgroundColor: theme.colors.primary },
  sendText: { ...theme.typography.subhead, fontWeight: '600', color: theme.colors.onPrimary },
  ask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.page,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.block,
    backgroundColor: theme.colors.fill,
  },
  askPressed: { backgroundColor: theme.colors.fillPressed },
  askText: { ...theme.typography.subhead, flex: 1, color: theme.colors.text2 },
  askAction: { ...theme.typography.subhead, color: theme.colors.primaryText },
  // 每行四个，多了换行
  entries: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: theme.spacing.sm, paddingTop: theme.spacing.xl },
  entry: { width: `${100 / COLUMNS}%`, alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xl },
  tile: (pressed: boolean) => ({
    width: theme.size.moreEntry,
    height: theme.size.moreEntry,
    borderRadius: theme.radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pressed ? theme.colors.fillPressed : theme.colors.fill,
  }),
  label: { ...theme.typography.caption, color: theme.colors.text2 },
}));
