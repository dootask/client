/** Material 3 的圆角和触控尺寸 */
export const platformRadius = { sheet: 28, dialog: 28 };
export const platformSize = { touch: 48 };
/** 等宽字体（代码块、行内代码） */
export const monoFont = 'monospace';
/** 底边要让出的高度：键盘弹出时让到键盘上沿（unistyles 的 ime 已减去导航栏，要加回来）。传值不传 rt.insets：unistyles 靠字面上的 rt.insets.ime 识别依赖 */
export const bottomInset = (bottom: number, ime: number) => (ime > 0 ? bottom + ime : bottom);
