import type { TextStyle } from 'react-native';

import { monoFont, platformRadius, platformSize } from './platform';

/**
 * 设计令牌。取值见 docs/ui-spec.md（来自 resources/app 的 docs/native-ui-spec.md，补了宽屏 / 桌面部分）。
 * 页面只引用主题里的令牌，不写颜色、字号、间距、圆角字面量
 */

const light = {
  bg: '#F2F3F5',
  surface: '#FFFFFF',
  surface2: '#F7F8FA',
  fill: '#F0F1F3',
  fillPressed: '#E6E7EA',
  fillButton: '#E9EAEE',
  segmentActive: '#FFFFFF',
  separator: '#E5E6EB',
  text: '#1F2329',
  text2: '#646A73',
  text3: '#8F959E',
  text4: '#BBBFC4',
  overlay: 'rgba(0,0,0,0.4)',
  menuScrim: 'rgba(0,0,0,0.2)',
  primary: '#84C56A',
  primaryText: '#4F9A37',
  primarySoft: '#EDF7E8',
  /** 品牌色底上的文字和图标 */
  onPrimary: '#FFFFFF',
  rowHighlight: 'rgba(132,197,106,0.14)',
  danger: '#F04A4A',
  warning: '#F5A524',
  link: '#2F7AE5',
  online: '#34C759',
  badge: '#F04A4A',
  /** 宽屏侧栏底色，比列表栏深一档 */
  nav: '#EBEDF0',
  /** 鼠标悬停：叠在任意底色上 */
  hover: 'rgba(31,35,41,0.05)',
  /** 键盘焦点环 */
  focusRing: 'rgba(132,197,106,0.6)',
  /** 会话颜色标记的行底色（旧前端存的就是这几个浅色值，暗色下换成同色相的低透明度） */
  markYellow: '#FFFAE6',
  markBlue: '#E5F5FF',
  markGreen: '#ECFFE5',
  markPink: '#FFEAEE',
  markPurple: '#F6ECFF',
  /** 免打扰会话的未读角标 */
  badgeMuted: '#BBBFC4',
  /** 轻提示：深底白字 */
  toast: 'rgba(31,35,41,0.88)',
  onToast: '#FFFFFF',
  /** 聊天气泡（docs/ui-spec.md 1.3） */
  bubbleIn: '#FFFFFF',
  bubbleInText: '#1F2329',
  bubbleInMeta: '#8F959E',
  bubbleOut: '#D9F2CC',
  bubbleOutText: '#1F2329',
  bubbleOutMeta: '#5E8A4E',
  /** 气泡里的二级块：引用、代码、表情回应 */
  bubbleOverlay: 'rgba(0,0,0,0.05)',
  /** 图片上的时间浮层（配白字） */
  mediaScrim: 'rgba(0,0,0,0.45)',
  onMedia: '#FFFFFF',
  /** 全屏看图、发送前预览的底色（配 onMedia） */
  viewer: '#000000',
  /** 看图页上的输入框底色、次要文字 */
  viewerField: 'rgba(255,255,255,0.12)',
  viewerMuted: 'rgba(255,255,255,0.6)',
};

export type Colors = typeof light;

const dark: Colors = {
  bg: '#000000',
  surface: '#1C1C1E',
  surface2: '#2C2C2E',
  fill: '#2C2C2E',
  fillPressed: '#3A3A3C',
  fillButton: '#3A3A3C',
  segmentActive: '#636366',
  separator: '#38383A',
  text: '#F2F2F2',
  text2: '#AEAEB2',
  text3: '#7C7C80',
  text4: '#545458',
  overlay: 'rgba(0,0,0,0.6)',
  menuScrim: 'rgba(0,0,0,0.4)',
  primary: '#84C56A',
  primaryText: '#9AD682',
  primarySoft: '#1F2D1A',
  onPrimary: '#FFFFFF',
  rowHighlight: 'rgba(132,197,106,0.22)',
  danger: '#FF6961',
  warning: '#FFB340',
  link: '#5B9CF0',
  online: '#30D158',
  badge: '#FF453A',
  nav: '#111113',
  hover: 'rgba(255,255,255,0.06)',
  focusRing: 'rgba(154,214,130,0.7)',
  markYellow: 'rgba(242,216,109,0.16)',
  markBlue: 'rgba(81,171,234,0.16)',
  markGreen: 'rgba(115,180,92,0.16)',
  markPink: 'rgba(255,129,156,0.16)',
  markPurple: 'rgba(181,131,227,0.16)',
  badgeMuted: '#636366',
  toast: 'rgba(72,72,74,0.95)',
  onToast: '#F2F2F2',
  bubbleIn: '#1C1C1E',
  bubbleInText: '#F2F2F2',
  bubbleInMeta: '#7C7C80',
  bubbleOut: '#2B4A22',
  bubbleOutText: '#F2F2F2',
  bubbleOutMeta: '#9CC28C',
  bubbleOverlay: 'rgba(255,255,255,0.08)',
  mediaScrim: 'rgba(0,0,0,0.55)',
  onMedia: '#FFFFFF',
  viewer: '#000000',
  viewerField: 'rgba(255,255,255,0.12)',
  viewerMuted: 'rgba(255,255,255,0.6)',
};

const font = (fontSize: number, lineHeight: number, fontWeight: TextStyle['fontWeight']) => ({ fontSize, lineHeight, fontWeight });

const typography = {
  title1: font(22, 28, '700'),
  title2: font(17, 22, '600'),
  body: font(16, 22, '400'),
  callout: font(15, 20, '400'),
  subhead: font(14, 19, '400'),
  footnote: font(13, 18, '400'),
  caption: font(12, 16, '400'),
  caption2: font(11, 13, '500'),
  /** 表情面板里的表情 */
  emoji: font(26, 32, '400'),
  /** 代码块、行内代码 */
  code: { ...font(14, 20, '400'), fontFamily: monoFont },
} satisfies Record<string, TextStyle>;

/** 按下态：图标按钮降透明度，主按钮略降（docs/ui-spec.md 第 4 节）；不可用的按钮 */
const opacity = { pressedIcon: 0.5, pressedPrimary: 0.85, disabled: 0.4 };

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, page: 16 };

const radius = {
  bubble: 18,
  bubbleTight: 6,
  card: 12,
  block: 10,
  image: 12,
  pill: 999,
  ...platformRadius,
};

const size = {
  navBar: 52,
  rowSingle: 52,
  rowDouble: 64,
  /** 窄屏底部 Tab 栏（不含安全区） */
  tabBar: 56,
  /** 中屏图标侧栏 */
  rail: 72,
  /** 宽屏完整侧栏 */
  sidebar: 220,
  /** 列表栏：中屏固定宽度；宽屏默认宽度和拖动范围 */
  listPane: 320,
  listPaneMin: 260,
  listPaneMax: 480,
  /** 宽屏居中弹窗 */
  dialogWidth: 480,
  /** 全屏编辑：中屏、宽屏上弹窗的宽度，格式工具栏的按钮宽 */
  editorWidth: 720,
  toolButton: 36,
  icon: 22,
  /** 底部弹层顶部的拖拽条 */
  grabberWidth: 36,
  grabberHeight: 5,
  iconSmall: 18,
  /** 小圆钮（输入栏的全屏编辑按钮）和里面的图标 */
  miniButton: 24,
  iconTiny: 14,
  /** 自绘菜单（Web / 桌面）的行高和宽度范围 */
  menuRow: 32,
  menuMinWidth: 180,
  menuMaxWidth: 320,
  /** App 长按消息菜单：宽度、行高、表情条每格 */
  actionMenuWidth: 220,
  actionMenuRow: 40,
  emojiCell: 40,
  /** Web 悬停消息时旁边操作条的按钮 */
  hoverAction: 28,
  /** 确认气泡、悬停提示的最大宽度 */
  bubbleMaxWidth: 280,
  tooltipMaxWidth: 240,
  /** 输入框、整行按钮的高度 */
  control: 48,
  /** 多行输入框的最小高度（约三行） */
  textArea: 96,
  /** 登录类页面表单的最大宽度（宽屏上居中） */
  formMaxWidth: 360,
  /** 登录页的应用图标 */
  logo: 72,
  /** 图形验证码的显示宽度（高度同输入框） */
  captchaWidth: 120,
  /** 头像只用这几档（docs/ui-spec.md 第 3 节） */
  avatar: { xs: 20, sm: 24, md: 32, lg: 40, xl: 48, xxl: 64, huge: 80 },
  /** 未读角标的最小宽高 */
  badge: 18,
  /** 分类胶囊、列表顶部搜索框的高度 */
  chip: 30,
  searchField: 36,
  /** 多选勾选圈、分段控件、选项胶囊（提醒时间这类快捷选择） */
  checkMark: 22,
  segment: 32,
  option: 36,
  /** 聊天：输入框单行高、浮动圆钮（回到底部、@ 我）、回应胶囊高、文件卡片左侧色块、气泡对侧至少留出的空白 */
  chatInput: 36,
  floatButton: 40,
  reaction: 26,
  fileTile: 44,
  bubbleFarGap: 40,
  /** 视频消息中间的播放圆钮、语音消息的播放圆钮、语音进度条粗细、未读红点 */
  mediaPlay: 48,
  /** 回复引用右侧的缩略图 */
  quoteThumb: 36,
  voicePlay: 32,
  /** 加号面板：最近照片的缩略图、功能入口的方块 */
  photoThumb: 96,
  moreTile: 56,
  /** 输入栏上方快捷表情的贴纸 */
  quickSticker: 72,
  /** 输入栏上方快捷消息胶囊的最大宽度（文字过长截断） */
  quickMsgMax: 150,
  voiceTrack: 4,
  dot: 8,
  ...platformSize,
};

/** 两种主题通用的语义色（docs/ui-spec.md 1.5）：头像底色配白色图标或首字，颜色标记在菜单里的色块 */
const palette = {
  avatarGroup: { department: '#5BC7B0', project: '#6E99EB', task: '#9B96DF', okr: '#9B96DF', default: '#61B2F9' },
  avatarUser: ['#7FB5E5', '#86C79A', '#E5A27F', '#B49BE0', '#E58FA8', '#6CC2C2', '#D9B866', '#8F9BB3'],
  onAvatar: '#FFFFFF',
  markSwatch: { yellow: '#F2D86D', blue: '#51ABEA', green: '#73B45C', pink: '#FF819C', purple: '#B583E3' },
  /** 消息卡片左侧的色块（docs/ui-spec.md 1.4），配白色图标 */
  tile: {
    pdf: '#E8584F',
    doc: '#4A86E8',
    sheet: '#3BA55C',
    slide: '#EE8A3C',
    archive: '#B58A4C',
    image: '#9B7BE0',
    video: '#E05A8A',
    audio: '#2FB5A9',
    code: '#6B7A90',
    other: '#8F959E',
    location: '#F0883E',
    meeting: '#4A86E8',
  },
  /** 色块上的图标 */
  onTile: '#FFFFFF',
  /** 色块上表示进度的填充 */
  tileProgress: 'rgba(255,255,255,0.35)',
};

/** 浮起的面板（菜单、弹窗、气泡）的阴影 */
const shadow = {
  light: {
    popover: '0px 8px 28px rgba(0,0,0,0.12), 0px 0px 1px rgba(0,0,0,0.18)',
    float: '0px 2px 8px rgba(0,0,0,0.12), 0px 0px 1px rgba(0,0,0,0.18)',
  },
  dark: {
    popover: '0px 8px 28px rgba(0,0,0,0.5), 0px 0px 0px 1px rgba(255,255,255,0.08)',
    float: '0px 2px 8px rgba(0,0,0,0.4), 0px 0px 0px 1px rgba(255,255,255,0.08)',
  },
};

/** 按窗口宽度分三档，不看设备类型：窄屏 < 768、中屏 768–1199、宽屏 ≥ 1200 */
export const breakpoints = { xs: 0, md: 768, lg: 1200 } as const;

const shared = { typography, spacing, radius, size, opacity, palette };

export const lightTheme = { colors: light, shadow: shadow.light, ...shared };
export const darkTheme: typeof lightTheme = { colors: dark, shadow: shadow.dark, ...shared };

export type AppTheme = typeof lightTheme;
