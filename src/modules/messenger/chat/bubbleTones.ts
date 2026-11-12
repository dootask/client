import type { AppTheme } from '../../../ui/theme';
import type { BubbleTone } from './RichText';

/** App 气泡配色（docs/ui-spec.md 1.3）：自己浅绿底深字、对方白底 */
export function bubbleTones({ colors }: AppTheme): { own: BubbleTone; peer: BubbleTone } {
  const base = { link: colors.link, overlay: colors.bubbleOverlay, separator: colors.separator, scrim: colors.mediaScrim, danger: colors.danger, accent: colors.primaryText };
  return {
    own: { ...base, text: colors.bubbleOutText, muted: colors.bubbleOutMeta },
    peer: { ...base, text: colors.bubbleInText, muted: colors.bubbleInMeta },
  };
}
