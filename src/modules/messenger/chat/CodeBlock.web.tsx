import * as Clipboard from 'expo-clipboard';
import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { Touchable } from '../../../ui/Touchable';
import type { BubbleTone } from './RichText';

/** 代码块（同旧版网页 code-block-wrapper）：children 是显示的内容，复制的是 text；白底圆角，右上角语言和「复制」，复制不提示；超宽横向滚动 */
export function CodeBlock({ lang, text, children }: { lang: string; text: string; tone: BubbleTone; children: ReactNode }) {
  const t = useT();
  return (
    <View style={styles.code}>
      <View style={styles.head}>
        {!!lang && <Text style={styles.meta}>{lang}</Text>}
        <Touchable accessibilityRole="button" onPress={() => void Clipboard.setStringAsync(text).catch(() => {})} style={styles.copyWrap}>
          {({ hovered }) => <Text style={styles.copy(hovered)}>{t('messenger:chat.copy')}</Text>}
        </Touchable>
      </View>
      <ScrollView horizontal>
        <Text style={styles.text}>{children}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme) => {
  const m = theme.size.markdown;
  return {
    code: {
      paddingTop: m.codeTop,
      paddingHorizontal: m.codePadX,
      paddingBottom: m.codeBottom,
      borderRadius: m.codeRadius,
      backgroundColor: theme.colors.mdCodeBg,
    },
    head: { position: 'absolute', top: m.codeHeadTop, left: 0, right: 0, paddingHorizontal: m.codePadX, flexDirection: 'row', justifyContent: 'flex-end', gap: m.codeCopyGap },
    meta: { ...theme.typography.mdCodeMeta, color: theme.colors.mdCodeMeta },
    copyWrap: { cursor: 'pointer', userSelect: 'none' },
    copy: (hovered: boolean) => ({ ...theme.typography.mdCodeMeta, color: hovered ? theme.colors.mdCodeCopyHover : theme.colors.mdCodeMeta }),
    text: { ...theme.typography.mdCode, color: theme.colors.mdCodeText, whiteSpace: 'pre' },
  };
});
