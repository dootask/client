const { withAndroidStyles } = require('expo/config-plugins');

// Android 15 起 TextView 默认按字形墨迹边界断行（useBoundsForWidth），RN 量文本尺寸时仍按字宽，
// 收缩到内容宽度的文本（如消息气泡）实际排版比量出的宽一点就换行，多出的一行被裁掉。
// 把 TextView 默认样式的 useBoundsForWidth 关掉，与 RN 的测量一致（低版本系统忽略这个属性）
const STYLE = 'AppTextView';

module.exports = function withTextBounds(config) {
  return withAndroidStyles(config, (mod) => {
    const styles = (mod.modResults.resources.style ??= []);
    const theme = styles.find((item) => item.$.name === 'AppTheme');
    if (!theme) throw new Error('with-text-bounds: 未找到 AppTheme');
    const items = (theme.item ??= []);
    const current = items.find((entry) => entry.$.name === 'android:textViewStyle');
    if (!current) items.push({ $: { name: 'android:textViewStyle' }, _: `@style/${STYLE}` });
    else if (current._ !== `@style/${STYLE}`) throw new Error(`with-text-bounds: AppTheme 已有 textViewStyle（${current._}）`);
    if (!styles.some((item) => item.$.name === STYLE)) {
      styles.push({
        $: { name: STYLE, parent: 'android:Widget.Material.TextView' },
        item: [{ $: { name: 'android:useBoundsForWidth' }, _: 'false' }],
      });
    }
    return mod;
  });
};
