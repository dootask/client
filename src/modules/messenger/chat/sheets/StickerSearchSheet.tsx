import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View, type TextInputInstance } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../../i18n';
import type { Emoticon } from '../../../../sync/messenger';
import { Sheet } from '../../../../ui/layout';
import { SearchField } from '../../../../ui/SearchField';
import { useMsgActions } from '../../hooks';
import { StickerGrid } from '../EmojiPanel';

/** 停止输入多久后搜索 */
const SEARCH_DELAY = 400;

type Result = { key: string; items: Emoticon[] | null };

/** 搜索在线贴纸：空关键词时服务器给热门的；点一个直接发送并关闭 */
export function StickerSearchSheet({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (item: Emoticon) => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const actions = useMsgActions();
  const input = useRef<TextInputInstance>(null);
  const [key, setKey] = useState('');
  /** items 为 null 是加载失败 */
  const [result, setResult] = useState<Result | null>(null);
  const keyword = key.trim();

  useEffect(() => {
    if (!actions) return;
    let stale = false;
    const timer = setTimeout(() => {
      actions
        .searchStickers(keyword)
        .then((items) => !stale && setResult({ key: keyword, items }))
        .catch(() => !stale && setResult({ key: keyword, items: null }));
    }, SEARCH_DELAY);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [actions, keyword]);

  return (
    <Sheet visible={visible} onClose={onClose} title={t('messenger:chat.searchSticker')} fill onShow={() => input.current?.focus()}>
      <View style={styles.top}>
        <SearchField ref={input} value={key} onChangeText={setKey} placeholder={t('messenger:chat.searchSticker')} clearLabel={t('clear')} />
      </View>
      {result?.key !== keyword ? (
        <ActivityIndicator style={styles.hint} color={theme.colors.text3} />
      ) : !result.items ? (
        <Text style={styles.hint}>{t('loadFailed')}</Text>
      ) : result.items.length === 0 ? (
        <Text style={styles.hint}>{t('messenger:chat.noSticker')}</Text>
      ) : (
        <StickerGrid
          items={result.items}
          onPick={(item) => {
            onPick(item);
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create((theme) => ({
  top: { paddingHorizontal: theme.spacing.page, paddingBottom: theme.spacing.sm },
  hint: { ...theme.typography.subhead, color: theme.colors.text3, textAlign: 'center', marginTop: theme.spacing.xxl },
}));
