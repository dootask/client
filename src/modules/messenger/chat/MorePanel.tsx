import { Image } from 'expo-image';
import { Camera, FolderOpen, Images, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { CAN_CAPTURE, type PickedFile } from '../../../platform/files';
import { HAS_RECENT_PHOTOS, loadRecentPhotos, openPhotoSettings, photoAccess, type PhotoAccess } from '../../../platform/photos';
import { useChat } from '../../../ui/chat';
import { CheckOption } from '../../../ui/CheckMark';
import { Icon } from '../../../ui/Icon';
import { Touchable } from '../../../ui/Touchable';
import type { Attach, PickSource } from './attach';

/** 最近照片一次最多选几张 */
const SELECT_LIMIT = 9;
/** 读到照片前先占位的格数（铺满一屏宽即可） */
const PLACEHOLDERS = 6;

/**
 * 加号面板（App）：上方最近照片（点选带序号，选了之后出现原图、预览、发送），下方相册、拍摄、文件入口。
 * 点入口先收起面板再打开系统选择器
 */
export function MorePanel({ attach }: { attach: Attach }) {
  const t = useT();
  const { theme } = useUnistyles();
  const controller = useChat();
  const entries: [PickSource, LucideIcon, string][] = [
    ['media', Images, t('messenger:chat.album')],
    ...(CAN_CAPTURE ? [['capture', Camera, t('messenger:chat.capture')] as [PickSource, LucideIcon, string]] : []),
    ['file', FolderOpen, t('messenger:chat.file')],
  ];
  return (
    <View style={styles.root}>
      {HAS_RECENT_PHOTOS && (
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
        {entries.map(([source, icon, label]) => (
          <Touchable
            key={source}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => {
              controller.closePanel();
              attach.pick(source);
            }}
            style={({ pressed }) => [styles.entry, pressed && styles.pressed]}
          >
            <View style={styles.tile}>
              <Icon icon={icon} color={theme.colors.text2} size={theme.size.icon} />
            </View>
            <Text style={styles.label} numberOfLines={1}>{label}</Text>
          </Touchable>
        ))}
      </View>
    </View>
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
      <View style={styles.strip}>
        <Touchable
          accessibilityRole="button"
          onPress={() => (access === 'ask' ? void photoAccess(true).then(setAccess).catch(() => {}) : openPhotoSettings())}
          style={({ pressed }) => [styles.ask, pressed && styles.askPressed]}
        >
          <Icon icon={Images} color={theme.colors.text2} size={theme.size.icon} />
          <Text style={styles.askText}>{t('messenger:chat.photoAccess')}</Text>
          {access === 'denied' && <Text style={styles.askAction}>{t('messenger:chat.openSettings')}</Text>}
        </Touchable>
      </View>
    );
  }

  if (photos === null) {
    return (
      <View style={styles.strip}>
        <View style={[styles.list, styles.placeholders]}>
          {Array.from({ length: PLACEHOLDERS }, (_, index) => <View key={index} style={styles.thumb} />)}
        </View>
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
    <View style={styles.strip}>
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
              accessibilityState={{ checked: order > 0 }}
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
      {/* 操作条的位置一直留着，选了照片才出现，面板不跳；高度取触控高度，原图勾选项（顶对齐）才和按钮居中对齐 */}
      <View style={styles.bar}>
        {selected.length > 0 && (
          <>
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
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1 },
  pressed: { opacity: theme.opacity.pressedIcon },
  strip: { height: theme.spacing.md + theme.size.photoThumb + theme.spacing.xs + theme.size.touch },
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
  bar: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, height: theme.size.touch, marginTop: theme.spacing.xs, paddingHorizontal: theme.spacing.page },
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
  entries: { flexDirection: 'row', paddingHorizontal: theme.spacing.page, paddingTop: theme.spacing.lg, gap: theme.spacing.xl },
  entry: { alignItems: 'center', gap: theme.spacing.xs, width: theme.size.moreTile + theme.spacing.md },
  tile: {
    width: theme.size.moreTile,
    height: theme.size.moreTile,
    borderRadius: theme.radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.fill,
  },
  label: { ...theme.typography.caption, color: theme.colors.text2 },
}));
