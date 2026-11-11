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
  /** 未读角标（同旧版 iView 角标） */
  badge: '#ED4014',
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
  badgeMuted: '#E6EBF1',
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
  /**
   * 旧版 Vue 页面的颜色（2026-11-11 起界面照旧版，docs/ui-spec.md 1.6）：会话列表、下拉菜单、角标这些照旧版做的地方用
   */
  titleText: '#303133',
  regularText: '#606266',
  descText: '#909399',
  /** 列表里的 [待办]、[@]、[草稿] */
  alert: '#FF0000',
  searchFill: '#F7F7F7',
  searchIcon: '#808695',
  /** 窄屏列表头部（大标题、搜索、分类条）的底色和底部分隔线；窄屏的搜索框是白底 */
  headerBg: '#F8F8F8',
  headerLine: '#E8E8E8',
  headerSearchIcon: '#999999',
  /** 置顶行、当前打开的行 */
  rowTop: '#F4F5F7',
  rowActive: '#EEEFF1',
  /** 窄屏行间的分隔线 */
  rowLine: '#F2F2F2',
  /** 分类条文字：常态、悬停、选中 */
  tabText: '#888888',
  tabTextHover: '#777777',
  tabTextActive: '#555555',
  /** 宽屏列表栏和右侧之间的竖线、列表栏底部栏的顶线 */
  paneLine: '#F4F5F5',
  /** 列表栏底部栏的图标 */
  barIcon: '#AAAAAA',
  /** 右侧空白页：图标圆底、图标、提示文字 */
  emptyFill: '#F4F5F7',
  emptyIcon: '#D1D8DD',
  emptyText: '#BEC6CC',
  /** 下拉菜单：悬停底色、禁用文字、分组线 */
  menuHover: '#F3F3F3',
  menuDisabled: '#C5C8CE',
  /** 旧版输入框的占位文字 */
  placeholder: '#C5C8CE',
  menuDivider: '#E8EAEC',
  /** 分类下拉菜单（旧版 Element 样式）的描边 */
  menuBorder: '#EBEEF5',
  /** 头像右下的离线点（在线用品牌色） */
  offline: '#FF9900',
  /** 免打扰会话的未读角标文字（底色 badgeMuted） */
  badgeMutedText: '#808695',
  /** 已完成任务群右下角的大勾 */
  success: '#19BE6B',
  /** 列表摘要里回应表情的底 */
  emojiPill: 'rgba(144,147,153,0.25)',
  /** 列表行内标签（已归档 / 已删除），同旧版 iView 标签 */
  tagText: '#515A6E',
  tagRedText: '#F5222D',
  tagRedFill: '#FFF1F0',
  tagRedLine: '#FFA39E',
  /** 旧版网页正文的默认字色（iView @text-color） */
  pageText: '#515A6E',
  /** App 会话列表顶部「未开启通知权限」条的底色和边线 */
  noticeFill: '#FEF7EE',
  noticeLine: '#FAE0B5',
  /** App 会话标题旁「已完成」「已删除」标签的底色（主色、危险色 15%，同旧 App） */
  tagSuccessFill: '#84C56A26',
  tagDangerFill: '#F04A4A26',
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
  badgeMuted: '#3A3A3C',
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
  titleText: '#E5E6EB',
  regularText: '#C9CDD4',
  descText: '#86909C',
  alert: '#FF4D4F',
  searchFill: '#2C2C2E',
  searchIcon: '#8E8E93',
  headerBg: '#000000',
  headerLine: '#38383A',
  headerSearchIcon: '#8E8E93',
  rowTop: '#26262A',
  rowActive: '#303034',
  rowLine: '#2C2C2E',
  tabText: '#8E8E93',
  tabTextHover: '#AEAEB2',
  tabTextActive: '#E5E5EA',
  paneLine: '#2C2C2E',
  barIcon: '#7C7C80',
  emptyFill: '#2C2C2E',
  emptyIcon: '#545458',
  emptyText: '#7C7C80',
  menuHover: '#3A3A3C',
  menuDisabled: '#545458',
  placeholder: '#636366',
  menuDivider: '#38383A',
  menuBorder: '#38383A',
  offline: '#FF9F0A',
  badgeMutedText: '#AEAEB2',
  success: '#30D158',
  emojiPill: 'rgba(144,147,153,0.3)',
  tagText: '#C9CDD4',
  tagRedText: '#FF7875',
  tagRedFill: 'rgba(245,34,45,0.15)',
  tagRedLine: 'rgba(255,163,158,0.4)',
  pageText: '#C9CDD4',
  noticeFill: 'rgba(245,165,36,0.12)',
  noticeLine: 'rgba(245,165,36,0.3)',
  tagSuccessFill: '#84C56A26',
  tagDangerFill: '#FF696126',
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
  /** 旧版会话列表（docs/ui-spec.md 1.6）：行标题、行内小字、窄屏大标题、窄屏顶部条标题 */
  listTitle: font(14, 24, '400'),
  listDesc: font(12, 24, '400'),
  largeTitle: font(24, 32, '600'),
  barTitle: font(16, 22, '500'),
  /** 旧版下拉菜单项 */
  menuItem: font(14, 18, '400'),
  /** 旧版分类条（行高同字号） */
  navItem: font(14, 14, '400'),
  /** 会话列表没有内容时的提示 */
  listHint: font(14, 22, '400'),
  /** 旧版网页正文行高 1.5（消息页空白区的提示胶囊） */
  emptyPill: font(14, 21, '400'),
  /** 会话列表顶部的提示条（旧版正文 14、行高 1.5） */
  notice: font(14, 21, '400'),
  /** App 聊天页置顶发送人、待办横条的加粗小字（旧版 App） */
  footnoteStrong: font(13, 18, '600'),
  /** App 分类条上待办数角标的数字（旧版 App） */
  countMini: font(10, 12, '600'),
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
  /** 旧版下拉菜单、菜单里的颜色方块 */
  menu: 4,
  swatch: 2,
  tag: 3,
  /** App 聊天页标题旁的标签（旧版 App） */
  headerTag: 4,
  /** 会话列表搜索框（宽屏 / 窄屏）、右侧空白页的提示胶囊 */
  dialogSearch: 12,
  dialogSearchNarrow: 10,
  emptyPill: 14,
  /** 宽屏会话列表顶部的提示条 */
  notice: 6,
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
  /** 消息页列表栏同旧版：占内容区 30%，限制在 240–320，不能拖 */
  dialogPaneRatio: 0.3,
  dialogPaneMin: 240,
  dialogPaneMax: 320,
  /** 旧版会话列表：行高、搜索行高、搜索框高（宽屏 / 窄屏）、分类条高、列表栏底部栏高、右侧空白页图标圆 */
  dialogRow: 80,
  /** 会话行细节：头像外边距、已读勾、免打扰铃、标签高和左右内边距、回应表情胶囊、未读角标（顶距、右缘到行左）、窄屏分隔线左缩进、已完成大勾 */
  avatarGap: 2,
  readMark: 11,
  silenceIcon: 15,
  tag: 22,
  tagPadding: 5,
  emojiPill: { width: 26, height: 20 },
  rowBadgeTop: 10,
  rowBadgeRight: 60,
  rowLineLeft: 68,
  completedMark: 28,
  completedPad: 36,
  completedBottom: 5,
  dialogSearchRow: 54,
  dialogSearch: 32,
  dialogSearchNarrow: 36,
  /** 搜索框左边放图标的格子（宽屏 / 窄屏） */
  dialogSearchPre: 32,
  dialogSearchPreNarrow: 28,
  /**
   * 会话列表头部的零碎间距（同旧版）：窄屏搜索行下边距、搜索框左右内边距（宽屏 / 窄屏左侧）、
   * 输入框文字左右内边距、清除按钮的格子、分类条左右和下边距、窄屏分类条上边距、页签上下内边距、
   * 放大镜 / ☰ / 清除的图标、☰ 下拉的最小宽（宽屏 / 窄屏）
   */
  dialogChrome: { searchPadBottom: 6, searchInset: 6, searchInsetNarrow: 4, inputPad: 7, clear: 32, clearDot: 13, clearX: 9, navPad: 10, navTopNarrow: 5, navItemPadY: 2, icon: 16, menu: 120, menuNarrow: 140 },
  /** 分类条左边 ☰ 的宽度（宽屏 / 窄屏）；分类上的未读角标相对文字右上角的偏移 */
  dialogNavIcon: 28,
  dialogNavIconNarrow: 46,
  navBadgeOffset: { top: -12, right: -8 },
  /** 列表栏底部栏：高、图标、未读角标顶距和相对图标中线的右移 */
  dialogBar: 52,
  barIcon: 24,
  barBadgeTop: 4,
  barBadgeShift: 3,
  /** 右侧空白页的图标、提示胶囊的左右内边距 */
  emptyIcon: 46,
  emptyPillPadX: 15,
  /** 会话列表顶部提示条：宽屏上下内边距（窄屏通栏用 spacing.sm）、右侧箭头 */
  noticePadY: 6,
  noticeIcon: 16,
  /**
   * 窄屏 Tab 根页的大标题（同旧版 MobileLargeHeader）：大标题行高、收起后的顶部条高；
   * 顶部条底色在分界线前多少像素开始渐显、越过后标题再滚多少像素完全显示
   */
  largeTitleRow: 44,
  compactBar: 44,
  compactBarFade: 24,
  compactTitleFade: 20,
  /** 小标题条的标题左右留白 */
  compactBarInset: 64,
  /** 宽屏居中弹窗 */
  dialogWidth: 480,
  /** 全屏编辑：中屏、宽屏上弹窗的宽度，格式工具栏的按钮宽 */
  editorWidth: 720,
  toolButton: 36,
  icon: 22,
  /** 底部弹层顶部的拖拽条 */
  grabberWidth: 36,
  grabberHeight: 5,
  /** 底部弹层：撑满时顶边离状态栏的距离、标题栏高（下面再隔 sm，同旧版 App） */
  sheetTopGap: 40,
  sheetBar: 48,
  iconSmall: 18,
  /** 小圆钮（输入栏的全屏编辑按钮）和里面的图标 */
  miniButton: 24,
  iconTiny: 14,
  /**
   * 自绘菜单（Web / 桌面）同旧版两种下拉菜单：iView 样式（默认）行高 32、左右内边距 16、上下留 5、离触发元素 5；
   * Element 样式（消息分类下拉）行高 36、左右内边距 20、上下留 10、离触发元素 12
   */
  menuRow: 34,
  menuPadX: 16,
  menuPadY: 5,
  menuGap: 5,
  menuRowRoomy: 36,
  menuPadXRoomy: 20,
  menuPadYRoomy: 10,
  menuGapRoomy: 12,
  menuMinWidth: 100,
  menuMaxWidth: 320,
  /** 菜单里颜色项的方块 */
  swatch: 13,
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
  avatar: { xs: 20, sm: 24, md: 32, lg: 40, list: 42, xl: 48, xxl: 64, huge: 80 },
  /** 未读角标的最小宽高（旧版 iView 角标） */
  badge: 20,
  badgePadding: 6,
  /** 分类胶囊、列表顶部搜索框的高度 */
  chip: 30,
  searchField: 36,
  /** 多选勾选圈、分段控件、选项胶囊（提醒时间这类快捷选择） */
  checkMark: 22,
  /** App 多选：左侧勾选圈所在格宽、底栏按钮最小高（旧版 App） */
  checkMarkCell: 44,
  selectionBar: 56,
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
  /** App 聊天页导航栏右侧的会话头像（旧版 App） */
  headerAvatar: 36,
  /** App 聊天页标题旁标签的内边距（旧版 App） */
  headerTagPadX: 5,
  headerTagPadY: 1,
  /** App 聊天页标题下的分类条（旧版 App）：胶囊高、待办数角标 */
  typeChip: 28,
  typeCount: 16,
  /** App「我的待办」弹层（旧版 App）：列表最高、打钩图标、提醒时间的闹钟图标，正文与提醒时间、闹钟与时间的间距 */
  todoListMax: 420,
  todoCheck: 26,
  remindIcon: 13,
  todoTextGap: 2,
  remindGap: 3,
  /**
   * App 选人（转发，旧版 App UserPicker）：分节标题高、首页入口行高和图块、部门 / 项目图块、已选数角标、
   * 成员页顶部条高、字母索引每格高和宽及离右缘、已选列表的移除钮、底部「确定」最小宽、没结果时的上留白和放大镜、
   * 行里名字和副标题的间距、底部已选头像串的白圈粗细和相互叠压
   */
  pickHeader: 28,
  pickEntry: 56,
  pickEntryTile: 32,
  pickTile: 36,
  pickBadge: 22,
  pickBar: 44,
  pickLetter: 16,
  pickLetterWidth: 20,
  pickRemove: 28,
  pickSubmit: 88,
  pickEmptyTop: 70,
  pickEmptyIcon: 28,
  pickLetterInset: 2,
  pickTextGap: 2,
  pickStackRing: 2,
  pickStackOverlap: 6,
  /** App「确认转发」的留言框最小、最大高度（旧版 App） */
  forwardMessageMin: 40,
  forwardMessageMax: 120,
  /** App 聊天页置顶 / 待办横条（旧版 App）：行高、左侧色条宽、关闭图标 */
  banner: 40,
  bannerAccent: 3,
  bannerClose: 16,
  /** 加号面板：最近照片的缩略图、功能入口的方块 */
  photoThumb: 96,
  moreTile: 56,
  /** App 加号面板的入口图块和里面的图标（旧版 App） */
  moreEntry: 60,
  moreEntryIcon: 26,
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
  markSwatch: { default: '#DDDDDD', yellow: '#F2D86D', blue: '#51ABEA', green: '#73B45C', pink: '#FF819C', purple: '#B583E3' },
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
  /** 消息分类的图标色（同旧版网页 public/images/dialog/*.svg，深浅主题相同）：消息、标注、待办、图片、文件、链接 */
  msgType: { msg: '#8BCF70', tag: '#9D95E5', todo: '#F27B6B', image: '#53CBAE', file: '#F9B552', link: '#619BF2' },
  /** 选人页部门、项目的图块底色（旧版 App）：全部成员、部门轮换、默认部门、「按部门」入口、项目 */
  pickSource: {
    all: '#7BA7D9',
    departments: ['#7BA7D9', '#8FC1A9', '#D9A27B', '#B49AD6', '#D98F9F', '#7FBFC9', '#C9B26F', '#9AA6B8'],
    noDepartment: '#C2C6CC',
    departmentEntry: '#5BC7B0',
    project: '#6E99EB',
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
    /** 旧版下拉菜单：iView、Element 两种 */
    menu: '0px 1px 6px rgba(0,0,0,0.2)',
    menuRoomy: '0px 2px 12px rgba(0,0,0,0.1)',
  },
  dark: {
    popover: '0px 8px 28px rgba(0,0,0,0.5), 0px 0px 0px 1px rgba(255,255,255,0.08)',
    float: '0px 2px 8px rgba(0,0,0,0.4), 0px 0px 0px 1px rgba(255,255,255,0.08)',
    menu: '0px 1px 6px rgba(0,0,0,0.6), 0px 0px 0px 1px rgba(255,255,255,0.08)',
    menuRoomy: '0px 2px 12px rgba(0,0,0,0.5)',
  },
};

/** 按窗口宽度分三档，不看设备类型：窄屏 < 768、中屏 768–1199、宽屏 ≥ 1200 */
export const breakpoints = { xs: 0, md: 768, lg: 1200 } as const;

const shared = { typography, spacing, radius, size, opacity, palette };

export const lightTheme = { colors: light, shadow: shadow.light, ...shared };
export const darkTheme: typeof lightTheme = { colors: dark, shadow: shadow.dark, ...shared };

export type AppTheme = typeof lightTheme;
