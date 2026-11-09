import { Image } from 'expo-image';
import { Film, Send, Trash2, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { FlatList, Modal, Text, TextInput, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { PickedFile } from '../../../platform/files';
import { CAN_COMPRESS } from '../../../platform/photos';
import { CheckMark } from '../../../ui/CheckMark';
import { Icon } from '../../../ui/Icon';
import { bottomInset } from '../../../ui/theme';
import { Touchable } from '../../../ui/Touchable';
import type { SendOptions } from './attach';

/**
 * 发送前预览图片、视频：左右翻页，可删掉不要的，选原图（能压缩的平台），加一句说明（跟在文件后面发）。
 * 删光了就关闭
 */
export function SendPreview({ files: initial, original: initialOriginal, onClose, onSend }: {
  files: PickedFile[];
  original: boolean;
  onClose: () => void;
  onSend: (files: PickedFile[], options: SendOptions) => void;
}) {
  const t = useT();
  const { theme } = useUnistyles();
  const { width } = useWindowDimensions();
  const [files, setFiles] = useState(initial);
  const [index, setIndex] = useState(0);
  const [original, setOriginal] = useState(initialOriginal);
  const [caption, setCaption] = useState('');
  // 每页撑满翻页区的高度：Web 上横向列表的项不会自动撑高
  const [pageHeight, setPageHeight] = useState(0);
  const pager = useRef<FlatList<PickedFile>>(null);
  const hasImage = files.some((file) => file.media?.kind === 'image');
  const current = Math.min(index, files.length - 1);

  const go = (next: number) => {
    setIndex(next);
    pager.current?.scrollToIndex({ index: next, animated: true });
  };
  const remove = () => {
    if (files.length === 1) return onClose();
    setFiles(files.filter((_, i) => i !== current));
    setIndex(Math.min(current, files.length - 2));
  };
  // 用 onScroll：Web 不触发 onMomentumScrollEnd
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const iconButton = (icon: typeof X, label: string, onPress: () => void) => (
    <Touchable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Icon icon={icon} color={theme.colors.onMedia} size={theme.size.icon} />
    </Touchable>
  );

  return (
    <Modal visible animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.top}>
          {iconButton(X, t('messenger:chat.cancel'), onClose)}
          <Text style={styles.counter}>{files.length > 1 ? `${current + 1} / ${files.length}` : ''}</Text>
          {iconButton(Trash2, t('messenger:chat.delete'), remove)}
        </View>
        <FlatList
          ref={pager}
          style={styles.pager}
          onLayout={(event) => setPageHeight(event.nativeEvent.layout.height)}
          data={files}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(file) => file.uri}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onScroll={onScroll}
          scrollEventThrottle={100}
          renderItem={({ item }) => (
            <View style={[styles.page, { width, height: pageHeight }]}>
              {item.media?.kind === 'image' ? (
                <Image source={item.uri} style={StyleSheet.absoluteFill} contentFit="contain" recyclingKey={item.uri} />
              ) : (
                <Icon icon={Film} color={theme.colors.onMedia} size={theme.size.mediaPlay} />
              )}
            </View>
          )}
        />
        {files.length > 1 && (
          <FlatList
            style={styles.thumbList}
            data={files}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(file) => file.uri}
            contentContainerStyle={styles.thumbs}
            renderItem={({ item, index: i }) => (
              <Touchable accessibilityRole="button" accessibilityLabel={item.name} onPress={() => go(i)} style={[styles.thumb, i === current && styles.thumbOn]}>
                {item.media?.kind === 'image' ? (
                  <Image source={item.uri} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={item.uri} />
                ) : (
                  <Icon icon={Film} color={theme.colors.onMedia} size={theme.size.iconSmall} />
                )}
              </Touchable>
            )}
          />
        )}
        <View style={styles.bottom}>
          <TextInput
            style={styles.caption}
            value={caption}
            onChangeText={setCaption}
            placeholder={t('messenger:chat.caption')}
            placeholderTextColor={theme.colors.viewerMuted}
            accessibilityLabel={t('messenger:chat.caption')}
            multiline
          />
          <View style={styles.actions}>
            {CAN_COMPRESS && hasImage && (
              <Touchable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: original }}
                onPress={() => setOriginal(!original)}
                style={({ pressed }) => [styles.original, pressed && styles.pressed]}
              >
                <CheckMark checked={original} />
                <Text style={styles.originalText}>{t('messenger:chat.original')}</Text>
              </Touchable>
            )}
            <View style={styles.spacer} />
            <Touchable
              accessibilityRole="button"
              accessibilityLabel={t('messenger:chat.send')}
              onPress={() => {
                onSend(files, { compress: CAN_COMPRESS && !original, caption });
                onClose();
              }}
              style={({ pressed }) => [styles.send, pressed && styles.pressed]}
            >
              <Icon icon={Send} color={theme.colors.onPrimary} size={theme.size.iconSmall} />
              <Text style={styles.sendText}>{files.length > 1 ? t('messenger:chat.sendCount', { n: files.length }) : t('messenger:chat.send')}</Text>
            </Touchable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: { flex: 1, backgroundColor: theme.colors.viewer, paddingTop: rt.insets.top, paddingBottom: bottomInset(rt.insets.bottom, rt.insets.ime) },
  pressed: { opacity: theme.opacity.pressedIcon },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.xs },
  iconButton: { width: theme.size.touch, height: theme.size.touch, alignItems: 'center', justifyContent: 'center' },
  counter: { ...theme.typography.subhead, color: theme.colors.onMedia },
  pager: { flex: 1 },
  page: { alignItems: 'center', justifyContent: 'center' },
  thumbList: { flexGrow: 0 },
  thumbs: { gap: theme.spacing.xs, paddingHorizontal: theme.spacing.page, paddingVertical: theme.spacing.sm },
  thumb: {
    width: theme.size.moreTile,
    height: theme.size.moreTile,
    borderRadius: theme.radius.bubbleTight,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: theme.colors.viewerField,
  },
  thumbOn: { borderColor: theme.colors.primary },
  bottom: { gap: theme.spacing.sm, paddingHorizontal: theme.spacing.page, paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.sm },
  caption: {
    ...theme.typography.body,
    color: theme.colors.onMedia,
    minHeight: theme.size.chatInput,
    maxHeight: theme.typography.body.lineHeight * 4 + (theme.size.chatInput - theme.typography.body.lineHeight),
    paddingVertical: (theme.size.chatInput - theme.typography.body.lineHeight) / 2,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.block,
    backgroundColor: theme.colors.viewerField,
    outlineStyle: 'solid',
    outlineWidth: 0,
  },
  actions: { flexDirection: 'row', alignItems: 'center' },
  original: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: theme.size.touch },
  originalText: { ...theme.typography.subhead, color: theme.colors.onMedia },
  spacer: { flex: 1 },
  send: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    height: theme.size.chatInput,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
  },
  sendText: { ...theme.typography.subhead, fontWeight: '600', color: theme.colors.onPrimary },
}));
