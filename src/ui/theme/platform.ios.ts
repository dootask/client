/** iOS 26 的圆角和触控尺寸 */
export const platformRadius = { sheet: 14, dialog: 32 };
export const platformSize = { touch: 44 };
/** 等宽字体（代码块、行内代码） */
export const monoFont = 'Menlo';
/** 底边要让出的高度：键盘弹出时让到键盘上沿（ime 是键盘全高，已含底部安全区）。传值不传 rt.insets：unistyles 靠字面上的 rt.insets.ime 识别依赖 */
export const bottomInset = (bottom: number, ime: number) => Math.max(bottom, ime);
