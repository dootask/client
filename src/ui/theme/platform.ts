/** Web / 桌面：窄屏底部弹层沿用 iOS 圆角，宽屏弹窗用桌面常见的小圆角 */
export const platformRadius = { sheet: 14, dialog: 12 };
export const platformSize = { touch: 44 };
/** 等宽字体（代码块、行内代码） */
export const monoFont = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
/** 底边要让出的高度：键盘弹出时让到键盘上沿（ime 是键盘全高，已含底部安全区）。传值不传 rt.insets：unistyles 靠字面上的 rt.insets.ime 识别依赖 */
export const bottomInset = (bottom: number, ime: number) => Math.max(bottom, ime);
