import { Image } from 'expo-image';
import { ChevronDown, ChevronRight, Square, SquareCheck } from 'lucide-react-native';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { ScrollView, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { Msg } from '../../../sync/api/dialog';
import type { Block, ImageBlock, ListItem, Run } from '../../../sync/messenger/body';
import { Icon } from '../../../ui/Icon';
import { Touchable } from '../../../ui/Touchable';
import { useSession } from '../../session';
import { useCardMsg } from './cards/cardMsg';
import { CodeBlock } from './CodeBlock';
import { MathBlock } from './MathBlock';
import { fitSize, INLINE_IMAGE_BOX, STICKER_BOX } from './media';
import { richTraits } from './richTraits';
import { rowTraits } from './rowTraits';

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
  /** 卡片消息的强调色（投票标题、接龙的展开和参与） */
  card: string;
  /** @ 提及的字色，没有时同链接 */
  mention?: string;
  /** @ 我的样式，没有时只加粗 */
  mentionMe?: TextStyle;
  /** 点了填进输入栏的命令（机器人帮助里的 /help 等）的字色，没有时同链接 */
  fill?: string;
}

export interface RichHandlers {
  /** 点链接、@ 成员等 */
  onPressRun?: (run: Run) => void;
  /** 点正文里的图片（有原图的才响应） */
  onPressImage?: (block: ImageBlock) => void;
  /** 勾选自己消息里的待办项（不能发言时不给）；只在 richTraits.checkable 的平台上响应 */
  onToggleCheck?: (msg: Msg, index: number, checked: boolean) => void;
  /** 文字可选（App 的长文阅读页；聊天行按 rowTraits） */
  selectable?: boolean;
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
        <BlockView key={index} block={block} tone={tone} first={index === 0} />
      ))}
    </View>
  );
}

function BlockView({ block, tone, first }: { block: Block; tone: BubbleTone; first: boolean }) {
  const t = useT();
  const { theme, rt } = useUnistyles();
  const body = rowTraits.body(theme, rt.breakpoint === 'xs');
  switch (block.t) {
    case 'p':
      return <Runs runs={block.runs} tone={tone} style={[styles.body, { color: tone.text }]} />;
    case 'h':
      return (
        <Runs
          runs={block.runs}
          tone={tone}
          style={[richTraits.heading(theme, block.level, body), !first && { marginTop: richTraits.headTop(theme) }, { color: tone.text }]}
        />
      );
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
    case 'details':
      return <Details summary={block.summary} blocks={block.blocks} tone={tone} titleStyle={richTraits.summary(theme, body)} />;
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
        <CodeBlock lang={block.lang} text={block.text} tone={tone}>
          {block.runs ? block.runs.map((run, index) => <RunText key={index} run={run} tone={tone} />) : block.text}
        </CodeBlock>
      );
    case 'math':
      return <MathBlock text={block.text} tone={tone} />;
    case 'table':
      return <Table rows={block.rows} head={block.head} tone={tone} />;
    case 'img':
      return <InlineImage block={block} tone={tone} />;
    case 'hr':
      return <View style={richTraits.hr(theme, tone)} />;
  }
}

/** 可折叠段落：默认收起，点标题展开 */
function Details({ summary, blocks, tone, titleStyle }: { summary: Run[]; blocks: Block[]; tone: BubbleTone; titleStyle: TextStyle }) {
  const { theme } = useUnistyles();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: richTraits.gap(theme) }}>
      <Touchable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={styles.summary}>
        <Icon icon={open ? ChevronDown : ChevronRight} color={tone.text} size={theme.size.markdown.marker} />
        <Runs runs={summary} tone={tone} style={[titleStyle, styles.shrink, { color: tone.text }]} />
      </Touchable>
      {open && <RichBlocks blocks={blocks} tone={tone} />}
    </View>
  );
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
  const msg = useCardMsg();
  const userId = useSession((s) => s.user?.userid ?? 0);
  const { onToggleCheck } = useContext(RichHandlersContext);
  let marker: ReactNode;
  switch (item.mark) {
    case 'checked':
    case 'unchecked': {
      const box = <Icon icon={item.mark === 'checked' ? SquareCheck : Square} color={tone.accent} size={theme.size.iconSmall} />;
      // 同旧版 App：只有自己的消息能勾选
      const index = item.index;
      marker = richTraits.checkable && onToggleCheck && msg?.userid === userId && index !== undefined ? (
        <Touchable
          hitSlop={theme.spacing.sm}
          accessibilityRole="checkbox"
          aria-checked={item.mark === 'checked'}
          onPress={() => onToggleCheck(msg, index, item.mark !== 'checked')}
          style={({ pressed }) => pressed && styles.pressed}
        >
          {box}
        </Touchable>
      ) : box;
      break;
    }
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
  const { theme } = useUnistyles();
  const columns = Math.max(...rows.map((row) => row.length));
  const traits = richTraits.table(theme, tone);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={[styles.table, { borderColor: traits.line, borderRadius: traits.radius }]}>
        {Array.from({ length: columns }, (_, col) => (
          <View key={col} style={col > 0 && [styles.column, { borderLeftColor: traits.line }]}>
            {rows.map((row, rowIndex) => {
              const isHead = head && rowIndex === 0;
              return (
                <View
                  key={rowIndex}
                  style={[traits.cell, rowIndex > 0 && [styles.cellRow, { borderTopColor: traits.line }], { backgroundColor: richTraits.rowFill(theme, tone, rowIndex, head) }]}
                >
                  <Runs runs={row[col] ?? []} tone={tone} numberOfLines={1} style={[traits.text, { color: tone.text }, isHead && styles.bold]} />
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
  const { selectable } = useContext(RichHandlersContext);
  return (
    <Text selectable={rowTraits.selectableText || selectable} style={style} numberOfLines={numberOfLines}>
      {/* 空单元格放一个不折叠的空格，撑满行高 */}
      {runs.every((run) => !run.text) ? '\u00A0' : runs.map((run, index) => <RunText key={index} run={run} tone={tone} />)}
    </Text>
  );
}

function RunText({ run, tone }: { run: Run; tone: BubbleTone }) {
  const { onPressRun } = useContext(RichHandlersContext);
  const linked = !!run.href || !!run.mention || !!run.app || !!run.fill;
  let decoration: TextStyle['textDecorationLine'];
  if (run.u || run.s) decoration = run.u && run.s ? 'underline line-through' : run.u ? 'underline' : 'line-through';
  const style: TextStyle = {
    fontWeight: run.b || (run.mention === 'me' && !tone.mentionMe) ? '600' : undefined,
    fontStyle: run.i ? 'italic' : undefined,
    textDecorationLine: decoration,
    color: run.mention ? (tone.mention ?? tone.link) : run.fill ? (tone.fill ?? tone.link) : linked ? tone.link : undefined,
    ...(run.mention === 'me' && tone.mentionMe),
  };
  const pressable = !!onPressRun && (!!run.href || !!run.fill || (!!run.mention && !!run.id));
  return (
    <Text style={[style, pressable && styles.pressableRun, run.code && [styles.inlineCode, { backgroundColor: tone.overlay }], run.hl && styles.found(run.hl)]} onPress={pressable ? () => onPressRun(run) : undefined}>
      {run.text}
    </Text>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  blocks: (compact: boolean) => ({ gap: compact ? theme.spacing.xs : richTraits.gap(theme) }),
  body: rowTraits.body(theme, rt.breakpoint === 'xs'),
  summary: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  bold: { fontWeight: '600' },
  shrink: { flexShrink: 1 },
  pressed: { opacity: theme.opacity.pressedIcon },
  quote: { borderLeftWidth: 3, paddingLeft: theme.spacing.sm },
  reasoningLabel: { ...theme.typography.caption, marginBottom: theme.spacing.xs },
  list: { gap: theme.spacing.xs },
  listItem: (indent: number) => ({ flexDirection: 'row', paddingLeft: indent * theme.spacing.lg }),
  // 高度与正文行高一致，符号与首行对齐
  listMarker: { minWidth: theme.spacing.xl, height: rowTraits.body(theme, rt.breakpoint === 'xs').lineHeight, marginRight: theme.spacing.xs, justifyContent: 'center' },
  listBody: { flexShrink: 1 },
  inlineCode: { fontFamily: theme.typography.code.fontFamily },
  // 正文可选中时默认是文字光标，可点的片段换成手形
  pressableRun: { cursor: 'pointer' },
  found: (hl: 'match' | 'current') => ({ color: theme.colors.findText, backgroundColor: hl === 'current' ? theme.colors.findCurrent : theme.colors.findMatch }),
  image: { borderRadius: theme.radius.block },
  table: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  column: { borderLeftWidth: StyleSheet.hairlineWidth },
  cellRow: { borderTopWidth: StyleSheet.hairlineWidth },
}));
