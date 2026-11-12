import { router, useLocalSearchParams } from 'expo-router';
import { ChevronDown, ChevronLeft, ChevronUp, Search, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { bodyImages, findInBlocks, type Block } from '../../../sync/messenger/body';
import { Icon } from '../../../ui/Icon';
import { IconButton } from '../../../ui/IconButton';
import { PageHeader } from '../../../ui/PageHeader';
import { Touchable } from '../../../ui/Touchable';
import { openMedia } from '../../media';
import { bubbleTones } from './bubbleTones';
import { useLongBlocks } from './longText';
import { useOpenHref } from './openHref';
import { RichBlocks, RichHandlersContext, type RichHandlers } from './RichText';

/** 列表拆成一项一块，查找定位才能落到具体的项上 */
const splitLists = (blocks: Block[]) => blocks.flatMap((block): Block[] => (block.t === 'list' ? block.items.map((item) => ({ t: 'list', items: [item] })) : [block]));

/** App 的长文阅读页（同旧版 App）：气泡里只有开头，这里取全文显示，文字可选择，可在页内查找 */
export function LongTextRoute() {
  const t = useT();
  const { theme } = useUnistyles();
  const msgId = Number(useLocalSearchParams<{ msgId: string }>().msgId) || 0;
  const { blocks: full, failed } = useLongBlocks(msgId);
  const doc = useMemo(() => full && splitLists(full), [full]);
  const [finding, setFinding] = useState(false);
  const [query, setQuery] = useState('');
  const [current, setCurrent] = useState(0);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const offsets = useRef<number[]>([]);

  const { blocks, matches } = useMemo(() => findInBlocks(doc ?? [], finding ? query.trim() : '', current), [doc, finding, query, current]);
  const target = matches[current];
  useEffect(() => {
    if (target !== undefined) scroller.current?.scrollTo({ y: Math.max(0, (offsets.current[target] ?? 0) - theme.spacing.xxl), animated: true });
  }, [target, current, theme]);

  const step = (delta: number) => {
    if (matches.length > 0) setCurrent((current + delta + matches.length) % matches.length);
  };
  const closeFind = () => {
    setFinding(false);
    setQuery('');
    setCurrent(0);
  };
  const openHref = useOpenHref();
  const handlers = useMemo<RichHandlers>(
    () => ({
      selectable: true,
      onPressRun: (run) => run.href && openHref(run.href),
      onPressImage: (block) => {
        if (!block.url || !full) return;
        const urls = bodyImages({ kind: 'rich', blocks: full });
        openMedia({ kind: 'pictures', items: urls.map((url) => ({ url })), position: Math.max(0, urls.indexOf(block.url)) });
      },
    }),
    [full, openHref],
  );
  const tone = bubbleTones(theme).peer;
  const searched = finding && query.trim().length > 0;
  const found = matches.length > 0;

  return (
    <View style={styles.page}>
      <PageHeader
        title={t('messenger:long.title')}
        left={<IconButton icon={ChevronLeft} label={t('back')} onPress={() => (router.canGoBack() ? router.back() : router.navigate('/messenger'))} />}
        right={doc && !finding ? <IconButton icon={Search} label={t('messenger:search')} onPress={() => setFinding(true)} /> : undefined}
      />
      {finding && (
        <View style={styles.findBar}>
          <TextInput
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setCurrent(0);
            }}
            autoFocus
            placeholder={t('messenger:search')}
            placeholderTextColor={theme.colors.text3}
            returnKeyType="search"
            submitBehavior="submit"
            onSubmitEditing={() => step(1)}
            style={styles.findInput}
          />
          {searched && <Text style={styles.findCount}>{found ? `${current + 1}/${matches.length}` : t('messenger:long.notFound')}</Text>}
          <Touchable hitSlop={theme.spacing.xs} disabled={!found} onPress={() => step(-1)}>
            <Icon icon={ChevronUp} color={found ? theme.colors.text : theme.colors.text4} size={theme.size.icon} />
          </Touchable>
          <Touchable hitSlop={theme.spacing.xs} disabled={!found} onPress={() => step(1)}>
            <Icon icon={ChevronDown} color={found ? theme.colors.text : theme.colors.text4} size={theme.size.icon} />
          </Touchable>
          <Touchable hitSlop={theme.spacing.xs} accessibilityLabel={t('close')} onPress={closeFind}>
            <Icon icon={X} color={theme.colors.text} size={theme.size.icon} />
          </Touchable>
        </View>
      )}
      {!doc ? (
        failed ? <Text style={styles.failed}>{t('loadFailed')}</Text> : <ActivityIndicator style={styles.placeholder} color={theme.colors.text3} />
      ) : (
        <RichHandlersContext.Provider value={handlers}>
          <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            {blocks.map((block, index) => (
              <View
                key={index}
                onLayout={(event) => {
                  offsets.current[index] = event.nativeEvent.layout.y;
                }}
              >
                <RichBlocks blocks={[block]} tone={tone} />
              </View>
            ))}
          </ScrollView>
        </RichHandlersContext.Provider>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  page: { flex: 1, backgroundColor: theme.colors.surface },
  placeholder: { marginTop: theme.spacing.xxl * 2 },
  failed: { ...theme.typography.subhead, marginTop: theme.spacing.xxl * 2, textAlign: 'center', color: theme.colors.text3 },
  findBar: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingHorizontal: theme.spacing.page, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface },
  findInput: {
    ...theme.typography.body,
    flex: 1,
    minHeight: theme.size.findInput,
    paddingVertical: 0,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.block,
    backgroundColor: theme.colors.fill,
    color: theme.colors.text,
  },
  findCount: { ...theme.typography.footnote, color: theme.colors.text3 },
  body: { padding: theme.spacing.page, paddingBottom: rt.insets.bottom + theme.spacing.xxl, gap: theme.spacing.sm },
}));
