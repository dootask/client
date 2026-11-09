import * as Haptics from 'expo-haptics';

/** 触感（ui-spec 第 4 节）：Web 上 expo-haptics 是空操作；失败（设备不支持）不处理 */
export const haptics = {
  /** 打开弹窗、长按菜单弹出 */
  light: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  /** 开始录音 */
  medium: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  /** 切换分段、勾选、选项 */
  selection: () => void Haptics.selectionAsync().catch(() => {}),
};
