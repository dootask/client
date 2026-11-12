import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { HtmlView } from '../../../embed';
import { useT } from '../../../i18n';
import { IconButton } from '../../../ui/IconButton';
import { PageHeader } from '../../../ui/PageHeader';
import { cachedMathML, toMathML } from './mathml';

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** App 的公式查看页（同旧版 App）：原生文字排不了公式，用静态网页显示 MathML，下面附源码 */
export function MathRoute() {
  const t = useT();
  const { theme } = useUnistyles();
  const source = useLocalSearchParams<{ source: string }>().source ?? '';
  const [mathml, setMathml] = useState(() => cachedMathML(source));
  useEffect(() => {
    let alive = true;
    void toMathML(source).then((html) => alive && setMathml(html));
    return () => {
      alive = false;
    };
  }, [source]);
  const { colors, typography, spacing, radius } = theme;
  const html =
    mathml === undefined
      ? null
      : `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{margin:0;padding:${spacing.xxl}px ${spacing.page}px;background:${colors.bg};color:${colors.text};font-family:serif}
.formula{overflow-x:auto;font-size:${typography.mathFormula.fontSize}px;padding:${spacing.lg}px 0}
pre{margin:${spacing.xxl}px 0 0;padding:${spacing.md}px;border-radius:${radius.block}px;background:${colors.surface};color:${colors.text3};font:${typography.footnote.fontSize}px/${typography.footnote.lineHeight}px monospace;white-space:pre-wrap;word-break:break-all}
</style><div class="formula">${mathml}</div><pre>${escape(source)}</pre>`;
  return (
    <View style={styles.page}>
      <PageHeader
        title={t('messenger:math.title')}
        left={<IconButton icon={ChevronLeft} label={t('back')} onPress={() => (router.canGoBack() ? router.back() : router.navigate('/messenger'))} />}
      />
      {html ? <HtmlView html={html} style={styles.page} /> : <ActivityIndicator style={styles.loading} color={colors.text3} />}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  page: { flex: 1, backgroundColor: theme.colors.bg },
  loading: { marginTop: theme.spacing.xxl * 2 },
}));
