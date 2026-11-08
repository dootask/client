import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { Copy, Square, SquareCheck } from 'lucide-react-native';
import { createContext, useContext, type ReactNode } from 'react';
import { ScrollView, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { Block, ImageBlock, ListItem, Run } from '../../../sync/messenger/body';
import { Icon } from '../../../ui/Icon';
import { showToast } from '../../../ui/Toast';
import { Touchable } from '../../../ui/Touchable';
import { fitSize, INLINE_IMAGE_BOX, STICKER_BOX } from './media';

/** 气泡里文字的配色：自己与对方的气泡底色不同 */
export interface BubbleTone {
  text: string;
  /** 次要文字（引用正文、思考过程、列表符号、时间） */
  muted: string;
  /** 引用竖线、复选框、回复数 */
  accent: string;
  link: string;
  /** 叠在气泡底色上的二级块 */
  overlay: string;
  separator: string;
  /** 图片上的浮层 */
  scrim: string;
  danger: string;
}

export interface RichHandlers {
  /** 点链接、@ 成员等 */
  onPressRun?: (run: Run) => void;
  /** 点正文里的图片（有原图的才响应） */
  onPressImage?: (block: ImageBlock) => void;
}

/** 正文里的链接、图片怎么响应，由聊天页统一给 */
export const RichHandlersContext = createContext<RichHandlers>({});

/**
 * 块结构渲染：所有尺寸由内容和图片比例决定，图片晚到不改变高度
 */
export function RichBlocks({ blocks, tone, compact = false }: {
  blocks: readonly Block[];
  tone: BubbleTone;
  /** 块间距收紧（列表项、引用里） */
  compact?: boolean;
}) {
  return (
    <View style={styles.blocks(compact)}>
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} tone={tone} />
      ))}
    </View>
  );
}

function BlockView({ block, tone }: { block: Block; tone: BubbleTone }) {
  const t = useT();
  const { theme } = useUnistyles();
  switch (block.t) {
    case 'p':
      return <Runs runs={block.runs} tone={tone} style={[styles.body, { color: tone.text }]} />;
    case 'h':
      return <Runs runs={block.runs} tone={tone} style={[block.level <= 2 ? styles.heading : styles.subheading, { color: tone.text }]} />;
    case 'quote':
      return (
        <View style={[styles.quote, { borderLeftColor: tone.accent }]}>
          <RichBlocks blocks={block.blocks} tone={{ ...tone, text: tone.muted }} compact />
        </View>
      );
    case 'reasoning':
      return (
        <View style={[styles.quote, { borderLeftColor: tone.separator }]}>
          <Text style={[styles.reasoningLabel, { color: tone.muted }]}>{t('messenger:chat.reasoning')}</Text>
          <RichBlocks blocks={block.blocks} tone={{ ...tone, text: tone.muted }} compact />
        </View>
      );
    case 'list':
      return (
        <View style={styles.list}>
          {block.items.map((item, index) => (
            <ListItemView key={index} item={item} tone={tone} />
          ))}
        </View>
      );
    case 'code':
      return (
        <View style={[styles.code, { backgroundColor: tone.overlay }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text style={[styles.codeText, { color: tone.text }]}>{block.text}</Text>
          </ScrollView>
          <Touchable
            hitSlop={theme.spacing.sm}
            accessibilityRole="button"
            accessibilityLabel={t('messenger:chat.copy')}
            onPress={() => {
              Clipboard.setStringAsync(block.text)
                .then(() => showToast(t('messenger:chat.copied')))
                .catch(() => {});
            }}
            style={({ pressed }) => [styles.codeCopy, { backgroundColor: tone.overlay }, pressed && styles.pressed]}
          >
            <Icon icon={Copy} color={tone.muted} size={theme.size.iconSmall} />
          </Touchable>
        </View>
      );
    case 'table':
      return <Table rows={block.rows} head={block.head} tone={tone} />;
    case 'img':
      return <InlineImage block={block} tone={tone} />;
    case 'hr':
      return <View style={[styles.hr, { backgroundColor: tone.separator }]} />;
  }
}

function InlineImage({ block, tone }: { block: ImageBlock; tone: BubbleTone }) {
  const { onPressImage } = useContext(RichHandlersContext);
  const box = fitSize(block.width, block.height, block.emoticon ? STICKER_BOX : INLINE_IMAGE_BOX);
  const onPress = block.url && onPressImage ? () => onPressImage(block) : undefined;
  const image = (
    <Image
      source={block.src}
      style={[box, styles.image, !block.emoticon && { backgroundColor: tone.overlay }]}
      contentFit={block.emoticon ? 'contain' : 'cover'}
      recyclingKey={block.src}
      cachePolicy="memory-disk"
      transition={150}
      accessibilityLabel={block.alt}
    />
  );
  if (!onPress) return image;
  return (
    <Touchable onPress={onPress} accessibilityRole="imagebutton" style={box}>
      {image}
    </Touchable>
  );
}

function ListItemView({ item, tone }: { item: ListItem; tone: BubbleTone }) {
  const { theme } = useUnistyles();
  let marker: ReactNode;
  switch (item.mark) {
    case 'checked':
    case 'unchecked':
      marker = <Icon icon={item.mark === 'checked' ? SquareCheck : Square} color={tone.accent} size={theme.size.iconSmall} />;
      break;
    case 'ordered':
      marker = <Text style={[styles.body, { color: tone.muted }]}>{item.num}.</Text>;
      break;
    default:
      marker = <Text style={[styles.body, { color: tone.muted }]}>•</Text>;
  }
  const done = item.mark === 'checked';
  return (
    <View style={styles.listItem(item.indent ?? 0)}>
      <View style={styles.listMarker}>{marker}</View>
      <View style={styles.listBody}>
        <RichBlocks blocks={item.blocks} tone={done ? { ...tone, text: tone.muted } : tone} compact />
      </View>
    </View>
  );
}

/** 表格：按列排（每列一个竖向容器），列宽自然对齐；单元格不换行，超宽时横向滚动 */
function Table({ rows, head, tone }: { rows: Run[][][]; head: boolean; tone: BubbleTone }) {
  const columns = Math.max(...rows.map((row) => row.length));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={[styles.table, { borderColor: tone.separator }]}>
        {Array.from({ length: columns }, (_, col) => (
          <View key={col} style={col > 0 && [styles.column, { borderLeftColor: tone.separator }]}>
            {rows.map((row, rowIndex) => {
              const isHead = head && rowIndex === 0;
              return (
                <View key={rowIndex} style={[styles.cell, rowIndex > 0 && [styles.cellRow, { borderTopColor: tone.separator }], isHead && { backgroundColor: tone.overlay }]}>
                  <Runs runs={row[col] ?? []} tone={tone} numberOfLines={1} style={[styles.cellText, { color: tone.text }, isHead && styles.bold]} />
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Runs({ runs, tone, style, numberOfLines }: { runs: Run[]; tone: BubbleTone; style: StyleProp<TextStyle>; numberOfLines?: number }) {
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {runs.length === 0 ? ' ' : runs.map((run, index) => <RunText key={index} run={run} tone={tone} />)}
    </Text>
  );
}

function RunText({ run, tone }: { run: Run; tone: BubbleTone }) {
  const { onPressRun } = useContext(RichHandlersContext);
  const linked = !!run.href || !!run.mention || !!run.app || !!run.fill;
  let decoration: TextStyle['textDecorationLine'];
  if (run.u || run.s) decoration = run.u && run.s ? 'underline line-through' : run.u ? 'underline' : 'line-through';
  const style: TextStyle = {
    fontWeight: run.b || run.mention === 'me' ? '600' : undefined,
    fontStyle: run.i ? 'italic' : undefined,
    textDecorationLine: decoration,
    color: linked ? tone.link : undefined,
  };
  const pressable = !!onPressRun && (!!run.href || (!!run.mention && !!run.id));
  return (
    <Text style={[style, run.code && [styles.inlineCode, { backgroundColor: tone.overlay }]]} onPress={pressable ? () => onPressRun(run) : undefined}>
      {run.text}
    </Text>
  );
}

const styles = StyleSheet.create((theme) => ({
  blocks: (compact: boolean) => ({ gap: compact ? theme.spacing.xs : theme.spacing.sm }),
  body: { ...theme.typography.body },
  heading: { ...theme.typography.title2 },
  subheading: { ...theme.typography.body, fontWeight: '600' },
  bold: { fontWeight: '600' },
  pressed: { opacity: theme.opacity.pressedIcon },
  quote: { borderLeftWidth: 3, paddingLeft: theme.spacing.sm },
  reasoningLabel: { ...theme.typography.caption, marginBottom: theme.spacing.xs },
  list: { gap: theme.spacing.xs },
  listItem: (indent: number) => ({ flexDirection: 'row', paddingLeft: indent * theme.spacing.lg }),
  // 高度与正文行高一致，符号与首行对齐
  listMarker: { minWidth: theme.spacing.xl, height: theme.typography.body.lineHeight, marginRight: theme.spacing.xs, justifyContent: 'center' },
  listBody: { flexShrink: 1 },
  code: { borderRadius: theme.radius.bubbleTight, overflow: 'hidden' },
  codeText: { ...theme.typography.code, padding: theme.spacing.sm, paddingRight: theme.spacing.xxl + theme.spacing.sm },
  codeCopy: { position: 'absolute', top: theme.spacing.xs, right: theme.spacing.xs, padding: theme.spacing.xs, borderRadius: theme.radius.bubbleTight },
  inlineCode: { fontFamily: theme.typography.code.fontFamily },
  image: { borderRadius: theme.radius.block },
  hr: { height: StyleSheet.hairlineWidth, marginVertical: theme.spacing.xs },
  table: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderRadius: theme.radius.bubbleTight, overflow: 'hidden' },
  column: { borderLeftWidth: StyleSheet.hairlineWidth },
  cell: { paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, maxWidth: theme.size.bubbleMaxWidth - theme.spacing.xl * 2 },
  cellRow: { borderTopWidth: StyleSheet.hairlineWidth },
  cellText: { ...theme.typography.subhead },
}));
