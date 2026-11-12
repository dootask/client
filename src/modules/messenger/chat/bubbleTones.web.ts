import type { AppTheme } from '../../../ui/theme';
import type { BubbleTone } from './RichText';

/**
 * 旧版网页气泡配色：对方浅灰底深字、@ 绿字、命令主色字，@ 我是绿底白字的小标签；自己主色底白字，@ 是深字、不再画标签
 */
export function bubbleTones({ colors, typography, spacing, radius }: AppTheme): { own: BubbleTone; peer: BubbleTone } {
  const base = { link: colors.msgLink, scrim: colors.mediaScrim, danger: colors.danger };
  return {
    own: {
      ...base,
      text: colors.onPrimary,
      muted: colors.msgOwnMuted,
      accent: colors.onPrimary,
      card: colors.msgCardOwn,
      overlay: colors.msgOwnOverlay,
      separator: colors.msgOwnMuted,
      mention: colors.titleText,
      mentionMe: {},
    },
    peer: {
      ...base,
      text: colors.titleText,
      muted: colors.descText,
      accent: colors.primary,
      card: colors.msgCard,
      fill: colors.primary,
      overlay: colors.bubbleOverlay,
      separator: colors.separator,
      mention: colors.msgMention,
      mentionMe: {
        ...typography.mentionMe,
        paddingHorizontal: spacing.xs,
        paddingVertical: 3,
        borderRadius: radius.bubbleTight,
        color: colors.onPrimary,
        backgroundColor: colors.primary,
      },
    },
  };
}
