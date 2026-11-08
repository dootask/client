import type { LucideIcon } from 'lucide-react-native';

export type { LucideIcon };

/** lucide 图标；颜色从主题取后传进来，不写字面量 */
export function Icon({ icon: Glyph, color, size, strokeWidth = 2 }: { icon: LucideIcon; color: string; size: number; strokeWidth?: number }) {
  return <Glyph color={color} size={size} strokeWidth={strokeWidth} />;
}
