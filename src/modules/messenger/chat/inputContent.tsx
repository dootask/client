import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { composeSegments, type ComposeValue } from '../../../sync/messenger';

/**
 * App：有 mention 时输入框内容用分段文字代替 value，mention 片段标成 link 并高亮；
 * 原生模块 modules/mention-input 据此在退格删到 mention 时整段删除
 */
export function inputContent(value: ComposeValue): { value?: string; children?: ReactNode } {
  if (value.mentions.length === 0) return { value: value.text };
  return {
    children: composeSegments(value).map((segment, index) =>
      segment.mention ? (
        <Text key={index} role="link" style={styles.mention}>
          {segment.text}
        </Text>
      ) : (
        <Text key={index}>{segment.text}</Text>
      ),
    ),
  };
}

const styles = StyleSheet.create((theme) => ({
  mention: { color: theme.colors.link },
}));
