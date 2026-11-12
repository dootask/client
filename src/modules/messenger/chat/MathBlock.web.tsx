import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { cachedMathML, toMathML } from './mathml';
import type { BubbleTone } from './RichText';

/** 网页的公式（同旧版网页 .katex-display）：浏览器直接排 MathML，居中；KaTeX 加载好之前先显示源码 */
export function MathBlock({ text, tone }: { text: string; tone: BubbleTone }) {
  const { theme } = useUnistyles();
  const [mathml, setMathml] = useState(() => cachedMathML(text));
  useEffect(() => {
    let alive = true;
    void toMathML(text).then((html) => alive && setMathml(html));
    return () => {
      alive = false;
    };
  }, [text]);
  if (mathml === undefined) return <Text style={[styles.source, { color: tone.text }]}>{text}</Text>;
  // 原生 DOM 节点不经 Unistyles，样式直接写（行高要带单位，否则按倍数算）
  const { fontSize, lineHeight } = theme.typography.mdCell;
  return <div style={{ fontSize, lineHeight: `${lineHeight}px`, color: tone.text, textAlign: 'center', overflowX: 'auto' }} dangerouslySetInnerHTML={{ __html: mathml }} />;
}

const styles = StyleSheet.create((theme) => ({
  source: { ...theme.typography.mdCode, textAlign: 'center' },
}));
