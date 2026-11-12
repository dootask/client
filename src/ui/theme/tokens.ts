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
  /** 旧版网页聊天页：窄屏标题下的在线状态、分类条选中底（主色 18%） */
  headDesc: '#AAAAAA',
  typeActiveFill: 'rgba(132,197,106,0.18)',
  /** 旧版网页置顶卡片：描边、阴影色、图钉圆底、置顶人的灰字；待办条里每条的底色和字色 */
  topCardLine: '#EBEBEB',
  topCardShadow: 'rgba(205,205,205,0.5)',
  topPin: '#FF821A',
  topPinner: '#AFAFAF',
  todoChipFill: '#FDF1DC',
  todoChipText: '#B86E00',
  tagSuccessFill: '#84C56A26',
  tagDangerFill: '#F04A4A26',
  /**
   * 旧版网页消息：对方气泡底、自己气泡里的次要字、二级块（代码、引用）底、正文链接、@ 提及、时间；引用竖线（主色 70%）；
   * 表情回应的底（对方气泡里 / 自己气泡里，各分「我也回应了」）和名字
   */
  msgBubbleIn: '#F4F5F7',
  msgOwnMuted: 'rgba(255,255,255,0.8)',
  msgOwnOverlay: 'rgba(255,255,255,0.2)',
  msgLink: '#436FF6',
  msgMention: '#0BC037',
  msgTime: '#BBBBBB',
  msgReplyBar: 'rgba(132,197,106,0.7)',
  msgReaction: 'rgba(225,225,225,0.5)',
  msgReactionMine: '#E1E1E1',
  msgReactionOwn: 'rgba(91,169,60,0.5)',
  msgReactionOwnMine: '#5BA93C',
  msgReactionNames: '#818181',
  msgNotice: '#EFEFEF',
  /** 旧版网页输入栏：输入框底色（窄屏白底）、窄屏输入栏底色、占位文字 */
  webInput: '#F4F5F7',
  webFooterNarrow: '#F8F8F8',
  webQuickMsg: '#F0F1F3',
  webPlaceholder: '#CCCCCC',
  /** 表情面板分类栏底色、图标色 */
  emojiNav: '#F8F8F8',
  emojiNavIcon: '#5E6D82',
  /** 表情面板底部（表情包切换）底色；⊕ 菜单悬停 */
  emojiMenu: '#F2F4F7',
  webMenuHover: '#ECF5FF',
  /** 旧版网页多选：未选的勾选圈、底部操作条底色和顶线 */
  selectCircle: '#C5C5C5',
  selectBar: '#F4F5F7',
  selectBarLine: '#F4F5F5',
  /** 旧版 iView 按钮：主色按钮底色、默认按钮描边；DooButton 默认按钮底色和字色 */
  ivuPrimary: '#8BCF70',
  ivuBorder: '#DCDEE2',
  dooButton: '#E9EAEE',
  dooButtonText: '#1F2329',
  /** 主色弹窗按钮悬停时叠的白 */
  dooButtonHover: 'rgba(255,255,255,0.15)',
  /** 旧版弹窗（DooModal）：遮罩、右上关闭 */
  modalMask: 'rgba(55,55,55,0.6)',
  modalClose: '#999999',
  modalCloseHover: '#444444',
  /** 旧版网页选择成员（.usp）：栏底、填充、悬停、按下、四级文字、主色字、选中底（常态 / 悬停） */
  uspPanel: '#F7F7F8',
  uspFill: '#F1F2F4',
  uspSearchFocus: '#F2F3F5',
  uspHover: 'rgba(15,20,30,0.045)',
  uspPressed: 'rgba(15,20,30,0.08)',
  uspText: '#16181D',
  uspText2: '#5B616B',
  uspText3: '#8B9099',
  uspText4: '#B9BDC4',
  uspPrimaryText: '#3F8A28',
  uspPrimarySoft: 'rgba(132,197,106,0.14)',
  uspPrimarySoftHover: 'rgba(132,197,106,0.2)',
  uspLine: 'rgba(15,20,30,0.1)',
  /** 确认转发：「不显示原发送者」未选的圈、留言框底色 */
  radioIcon: 'rgba(144,147,153,0.7)',
  /** 旧版选择成员：已选满的进度条、手机已选浮层的遮罩、主按钮上的快捷键底 */
  uspMeterFull: '#E8A33D',
  uspMask: 'rgba(0,0,0,0.32)',
  uspKbdOnPrimary: 'rgba(255,255,255,0.2)',
  /** 旧版确认转发：合并预览块（底、标题、摘要、条数、分隔线）、留言框底 */
  mergeFill: '#F7F7F7',
  mergeTitle: '#333333',
  mergeText: '#666666',
  mergeCount: '#999999',
  mergeLine: '#E8E8E8',
  forwardInput: '#F4F5F7',
  /**
   * 旧版网页卡片消息：强调色（投票标题、接龙的展开和参与；对方气泡 / 自己气泡）、会议操作行顶线、投票标签字和底、
   * 结果进度条轨道；iView 成功色、警告按钮（常态 / 悬停）、灰色禁用按钮（底、字）；合并转发卡片悬停底
   */
  msgCard: '#0BC037',
  msgCardOwn: '#23241F',
  voteTag: '#7076E4',
  voteTagFill: '#DEE2FA',
  voteTrack: '#E2E2E2',
  ivuSuccess: '#19BE6B',
  ivuWarning: '#FF9900',
  ivuWarningHover: '#FFAD33',
  ivuGrey: '#F7F7F7',
  ivuGreyText: '#C5C8CE',
  mergeFillHover: '#EFEFEF',
  /** 旧版网页 Markdown（markdown-body）：表格边框和分割线、表格隔行底；审批卡片正文顶线 */
  mdBorder: '#D0D7DE',
  mdStripe: '#F6F8FA',
  /** 代码块：底、正文（atom-one-light 基色）、语言和「复制」、「复制」悬停 */
  mdCodeBg: '#FFFFFF',
  mdCodeText: '#383A42',
  mdCodeMeta: '#B3B3B3',
  mdCodeCopyHover: '#65A665',
  /** 长文页内查找：命中、当前定位的那处，及其上的文字 */
  findMatch: '#FFE082',
  findCurrent: '#FFB300',
  findText: '#000000',
  /** 长文气泡底部「查看详情」上的分隔线 */
  longLine: 'rgba(227,227,227,0.42)',
  approveLine: '#E3E3E3',
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
  headDesc: '#7C7C80',
  typeActiveFill: 'rgba(132,197,106,0.24)',
  topCardLine: '#38383A',
  topCardShadow: 'rgba(0,0,0,0.4)',
  topPin: '#FF8A2A',
  topPinner: '#7C7C80',
  todoChipFill: 'rgba(245,165,36,0.16)',
  todoChipText: '#F5B54A',
  tagSuccessFill: '#84C56A26',
  tagDangerFill: '#FF696126',
  msgBubbleIn: '#2C2C2E',
  msgOwnMuted: 'rgba(255,255,255,0.8)',
  msgOwnOverlay: 'rgba(255,255,255,0.2)',
  msgLink: '#6B8FFF',
  msgMention: '#30D158',
  msgTime: '#7C7C80',
  msgReplyBar: 'rgba(132,197,106,0.7)',
  msgReaction: 'rgba(255,255,255,0.08)',
  msgReactionMine: 'rgba(255,255,255,0.16)',
  msgReactionOwn: 'rgba(91,169,60,0.5)',
  msgReactionOwnMine: '#5BA93C',
  msgReactionNames: '#AEAEB2',
  msgNotice: 'rgba(255,255,255,0.08)',
  webInput: '#2C2C2E',
  webFooterNarrow: '#1C1C1E',
  webQuickMsg: '#2C2C2E',
  webPlaceholder: '#636366',
  emojiNav: '#1C1C1E',
  emojiNavIcon: '#8E9AAB',
  emojiMenu: '#2C2C2E',
  webMenuHover: 'rgba(132,197,106,0.12)',
  selectCircle: '#545458',
  selectBar: '#1C1C1E',
  selectBarLine: '#2C2C2E',
  ivuPrimary: '#84C56A',
  ivuBorder: '#3A3A3C',
  dooButton: '#2C2C2E',
  dooButtonText: '#F2F2F2',
  dooButtonHover: 'rgba(255,255,255,0.1)',
  modalMask: 'rgba(0,0,0,0.6)',
  modalClose: '#8E8E93',
  modalCloseHover: '#F2F2F2',
  uspPanel: '#242426',
  uspFill: '#2C2C2E',
  uspSearchFocus: '#3A3A3C',
  uspHover: 'rgba(255,255,255,0.06)',
  uspPressed: 'rgba(255,255,255,0.1)',
  uspText: '#F2F2F2',
  uspText2: '#AEAEB2',
  uspText3: '#8E8E93',
  uspText4: '#636366',
  uspPrimaryText: '#84C56A',
  uspPrimarySoft: 'rgba(132,197,106,0.18)',
  uspPrimarySoftHover: 'rgba(132,197,106,0.24)',
  uspLine: 'rgba(255,255,255,0.12)',
  radioIcon: 'rgba(174,174,178,0.7)',
  uspMeterFull: '#D9952F',
  uspMask: 'rgba(0,0,0,0.5)',
  uspKbdOnPrimary: 'rgba(255,255,255,0.2)',
  mergeFill: '#2C2C2E',
  mergeTitle: '#F2F2F2',
  mergeText: '#AEAEB2',
  mergeCount: '#8E8E93',
  mergeLine: '#3A3A3C',
  forwardInput: '#2C2C2E',
  msgCard: '#30D158',
  msgCardOwn: '#23241F',
  voteTag: '#A5A9F5',
  voteTagFill: 'rgba(112,118,228,0.24)',
  voteTrack: '#3A3A3C',
  ivuSuccess: '#30D158',
  ivuWarning: '#FF9F0A',
  ivuWarningHover: '#FFB340',
  ivuGrey: '#2C2C2E',
  ivuGreyText: '#636366',
  mergeFillHover: '#3A3A3C',
  mdBorder: '#3D444D',
  mdStripe: 'rgba(255,255,255,0.04)',
  mdCodeBg: '#282C34',
  mdCodeText: '#ABB2BF',
  mdCodeMeta: '#7D8590',
  mdCodeCopyHover: '#65A665',
  findMatch: '#FFE082',
  findCurrent: '#FFB300',
  findText: '#000000',
  longLine: 'rgba(255,255,255,0.12)',
  approveLine: 'rgba(255,255,255,0.12)',
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
  /** Web 消息菜单表情条里的表情 */
  msgReactEmoji: font(24, 28, '400'),
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
  /** 旧版网页聊天页：标题后的人数、宽屏 / 窄屏分类条、窄屏返回键旁的未读数 */
  chatPeople: font(17, 22, '500'),
  chatType: font(12, 24, '400'),
  chatTypeNarrow: font(14, 28, '400'),
  backNum: font(14, 24, '500'),
  /** 图片查看：App 长按菜单项、倍速；网页窄屏页码（旧版 14/30） */
  previewMenu: font(17, 22, '400'),
  previewRate: font(14, 19, '600'),
  previewCounter: font(14, 30, '400'),
  /** App 设置、资料页的分组标题（旧版 App ListSection） */
  sectionTitle: font(16, 22, '700'),
  /** Web 聊天页置顶卡片的正文、待办条标签和胶囊（旧版网页） */
  topContent: font(14, 22, '400'),
  todoLabel: font(14, 22, '500'),
  todoChip: font(13, 26, '400'),
  /**
   * 旧版网页消息：正文（窄屏 msgTextNarrow）、群里气泡上方的名字、引用的名字和摘要、底部一行（时间、回复数）、
   * @ 我的绿底标签、表情回应的表情（窄屏 reactionSymbolNarrow）和名字
   */
  msgText: font(14, 20, '400'),
  msgTextNarrow: font(15, 20, '400'),
  msgName: font(14, 22, '400'),
  msgReplyName: font(13, 20, '500'),
  msgReplyDesc: font(13, 19.5, '400'),
  msgFoot: font(12, 12, '400'),
  mentionMe: font(13, 20, '600'),
  reactionSymbol: font(16, 22, '400'),
  reactionSymbolNarrow: font(14, 22, '400'),
  reactionNames: font(12, 22, '400'),
  msgNotice: font(12, 18, '400'),
  webInput: font(14, 22, '400'),
  webInputNarrow: font(16, 22, '400'),
  webQuickMsg: font(13, 26, '400'),
  webQuote: font(13, 19, '400'),
  webQuoteName: font(13, 19, '500'),
  webEmoji: font(22, 40, '400'),
  /** 旧版网页多选操作条：已选计数、到上限的提示；iView 小按钮文字 */
  selectInfo: font(14, 21, '400'),
  selectMax: font(12, 18, '400'),
  ivuButton: font(14, 20, '400'),
  /** 旧版弹窗标题、弹窗按钮（宽 / 窄屏） */
  modalTitle: font(18, 20, '500'),
  dooButton: font(14, 20, '500'),
  dooButtonNarrow: font(16, 22, '600'),
  /** 旧版网页确认框（$A.modalConfirm）：宽屏标题、正文，窄屏标题、正文 */
  layerTitle: font(16, 24, '500'),
  layerMessage: font(14, 21, '400'),
  layerTitleNarrow: font(17, 23, '600'),
  layerMessageNarrow: font(14.5, 22, '400'),
  /** 旧版选择成员（宽屏 / 手机全屏），名字照旧版类名 */
  uspTitle: font(15, 20, '600'),
  uspSearch: font(15, 20, '400'),
  uspSearchNarrow: font(16, 22, '400'),
  uspSideTitle: font(11, 14, '600'),
  uspNav: font(13, 18, '400'),
  uspNavOn: font(13, 18, '600'),
  uspCount: font(11, 14, '400'),
  uspBadge: font(11, 17, '600'),
  uspBadgeNarrow: font(12, 19, '600'),
  uspChTitle: font(15, 20, '600'),
  uspChSub: font(12, 16, '400'),
  uspGrp: font(11, 14, '600'),
  uspGrpNarrow: font(13, 17, '600'),
  uspName: font(14, 19, '500'),
  uspNameNarrow: font(16, 22, '400'),
  uspDesc: font(12, 16, '400'),
  uspDescNarrow: font(13, 18, '400'),
  uspEmpty: font(13, 18, '400'),
  uspEmptyNarrow: font(14, 20, '400'),
  uspRh: font(12, 16, '600'),
  uspRhCount: font(12, 16, '400'),
  uspPrName: font(13, 18, '400'),
  uspPrNameNarrow: font(16, 22, '400'),
  uspRempty: font(12, 19, '400'),
  uspFoot: font(11, 14, '400'),
  uspBarButton: font(16, 22, '400'),
  uspBarTitle: font(17, 22, '600'),
  uspEntry: font(16, 22, '400'),
  uspEntryCount: font(13, 18, '400'),
  uspStack: font(14, 20, '400'),
  uspStackMore: font(11, 14, '600'),
  uspSubmit: font(16, 22, '600'),
  uspIndex: font(10, 15, '600'),
  uspSelTitle: font(17, 22, '600'),
  uspSelCount: font(14, 20, '400'),
  uspSelClear: font(15, 20, '400'),
  /** 旧版确认转发：合并预览标题、摘要行、条数；单选项、留言 */
  mergeTitle: font(13, 18, '500'),
  mergeItem: font(12, 22, '400'),
  mergeCount: font(12, 16, '400'),
  forwardOption: font(14, 22, '400'),
  webEmojiNarrow: font(28, 50, '400'),
  /**
   * 旧版网页卡片消息：正文行（接龙名单、会议、位置标题）、投票标题、投票标签、投票选项、小字（位置地址、投票结果、会议操作行、合并条数）、
   * 合并转发卡片标题
   */
  cardText: font(14, 21, '400'),
  cardHead: font(14, 18, '700'),
  /** 旧版网页 Markdown 标题（h1–h4，h5、h6 同 h4）、可折叠段落的标题、表格单元格 */
  mdH1: font(28, 35, '600'),
  mdH2: font(21, 26.25, '600'),
  mdH3: font(17.5, 21.875, '600'),
  mdH4: font(14, 17.5, '600'),
  mdSummary: font(17.5, 26.25, '700'),
  mdCell: font(14, 21, '400'),
  /** 代码块正文（12 的 85%、1.45 倍行高）和右上角的语言、「复制」 */
  mdCode: { ...font(11.9, 17.255, '400'), fontFamily: monoFont },
  mdCodeMeta: font(11.9, 17.25, '400'),
  /** App 公式卡片上一行的公式源码；公式查看页的公式 */
  mathSource: { ...font(12, 16, '400'), fontFamily: monoFont },
  mathFormula: font(24, 32, '400'),
  /** 网页长文气泡底部的「查看详情」 */
  mdLongMore: font(14, 21, '400'),
  voteTag: font(12, 18, '400'),
  voteOption: font(14, 34, '400'),
  cardSmall: font(12, 18, '400'),
  mergeCardTitle: font(13, 19.5, '500'),
} satisfies Record<string, TextStyle>;

/** 按下态：图标按钮降透明度，主按钮略降（docs/ui-spec.md 第 4 节）；不可用的按钮；旧版网页卡片里的次要字（位置地址）、已结束的会议 */
const opacity = { previewButton: 0.8, previewCounter: 0.85, pressedIcon: 0.5, pressedPrimary: 0.85, disabled: 0.4, cardSub: 0.6, cardEnded: 0.7 };

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
  /** 旧版网页聊天页：分类条每项、置顶卡片、待办条每条 */
  chatType: 5,
  topCard: 10,
  todoChip: 13,
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
  /** 宽屏完整侧栏（同旧版默认宽 255，不能拖） */
  sidebar: 255,
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
  /** 长文阅读页的页内查找框高 */
  findInput: 36,
  /** App 公式卡片左侧的 Σ */
  mathIcon: 20,
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
  /** Web 消息菜单：列表最小宽度；上方表情条的格子、内边距、右端展开按钮；展开后全部表情显示几行（超出滚动） */
  msgReact: { menuMinWidth: 148, cell: 34, pad: 3, more: 28, moreIcon: 18, allRows: 8 },
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
  avatar: { vote: 18, micro: 16, xs: 20, sm: 24, pickChip: 28, msg: 30, md: 32, pick: 34, pickSel: 36, lg: 40, list: 42, xl: 48, xxl: 64, huge: 80 },
  /** 未读角标的最小宽高（旧版 iView 角标） */
  badge: 20,
  badgePadding: 6,
  /** 列表行、资料行里上下两行文字的间距 */
  listLineGap: 2,
  /** 资料页：文字占位条、标签占位的高度 */
  profile: { blankBar: 10, chipBlank: 28 },
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
  /**
   * 旧版网页聊天页头部：宽屏高和左右内边距、头像和标题的间距；窄屏返回键 / 「…」的格子、标题两侧留白、返回键图标、
   * 未读数离左缘和高；分类条：窄屏那一行的高和左右内边距、每项上边距、项间距、宽屏 / 窄屏的项内边距和图标、图标与文字间距
   */
  chatHead: 68,
  chatHeadPadX: 22,
  chatHeadAvatarGap: 14,
  chatHeadCell: 52,
  chatHeadInset: 84,
  chatHeadBack: 26,
  backNumLeft: 32,
  backNum: 24,
  /** 已完成任务群标题栏右侧的大勾：大小、离右缘（宽屏 / 窄屏） */
  chatHeadDone: 40,
  chatHeadDoneNarrow: 36,
  chatHeadDoneRight: 60,
  chatHeadDoneRightNarrow: 44,
  chatTypesNarrow: 32,
  chatTypesPadX: 8,
  chatTypeTop: 4,
  chatTypeGap: 6,
  chatTypePadX: 6,
  chatTypePadXNarrow: 8,
  chatTypeIcon: 14,
  chatTypeIconNarrow: 16,
  chatTypeIconGap: 4,
  chatTypeIconGapNarrow: 3,
  /** 旧版网页置顶卡片：图钉圆的内边距、右侧按钮图标和内边距；待办条每条的高和最大宽 */
  /** 置顶卡片图钉格的高（旧版 line-height 42）、iView 大号按钮的高 */
  topPinCell: 42,
  buttonLarge: 40,
  topPinPad: 5,
  topPin: 16,
  topPinTop: 2,
  topAction: 18,
  topActionPad: 4,
  todoChip: 26,
  todoChipMax: 180,
  dot: 8,
  /**
   * 旧版网页消息（头像用 avatar.msg）：列表左右内边距（宽屏 / 窄屏）、头像底下留空、头像与气泡的间距、名字行高和下距、气泡圆角（大 / 尖角）和内边距、
   * 底部一行的高和上距、底部图标（标注、待办、已编辑）和间距、已读的勾和群里的已读环、回应胶囊的内边距和间距、引用竖线宽和文字左距、
   * 文字气泡最宽（占列表宽的比例）、窄屏气泡对侧留空
   */
  msgPadX: 32,
  msgPadXNarrow: 14,
  msgAvatarBottom: 20,
  msgAvatarGap: 8,
  msgNameGap: 6,
  msgBubbleRadius: 8,
  msgBubbleTip: 2,
  msgBubblePad: 8,
  msgTextPad: 2,
  msgFoot: 21,
  msgFootTop: 4,
  msgFootIcon: 13,
  msgFootGap: 6,
  msgReadIcon: 12,
  msgReadRing: 14,
  msgReactionPadX: 8,
  msgReactionPadY: 2,
  msgReactionGap: 8,
  msgReactionTop: 6,
  msgReactionUsers: 6,
  /** 旧版网页消息右键菜单（.dialog-wrapper-operate）：宽、操作区内边距、项宽高、项下间距、图标；表情行的格子、内边距、右侧「更多」 */
  /**
   * 旧版网页输入栏（.dialog-footer / .chat-input-wrapper）：外边距、输入框圆角和内边距、编辑区外边距和最高、
   * 工具条按钮、发送按钮和绿圆、回复条（左右内边距、竖线、关闭按钮）、⊕ 菜单（宽、内边距、项高、图标）、
   * 机器人快捷消息胶囊（高、左右内边距、间距、所在行上下内边距）
   */
  webComposer: {
    padX: 24, bottom: 16, padXNarrow: 10, padYNarrow: 8, radius: 10, padY: 8, padX2: 2, editorY: 4, editorX: 12, editorMax: 200,
    tool: 30, toolIcon: 22, send: 48, sendCircle: 36, sendIcon: 20,
    quoteLeft: 24, quoteRight: 48, quoteBottom: 8, quoteLine: 3, quoteLineLeft: 12, quoteClose: 48, quoteCloseIcon: 22,
    popGap: 10, moreMin: 100, morePad: 8, moreRow: 36, moreItemPad: 8, moreIcon: 20, moreIconGap: 8,
    quick: 26, quickPadX: 12, quickGap: 8, quickBarY: 8,
  },
  /**
   * 旧版网页表情面板：宽屏浮层宽 376、内容区高 280、每行 9 格 40；窄屏内嵌每行 7 格 50；顶部分类栏 46×40、图标 18；
   * 底部表情包切换栏（宽 40 高 / 窄 48 高带 4 内边距，每项左右 13）；表情包格子 72 / 80；窄屏的删除键
   */
  webEmoji: {
    width: 376, height: 280, cell: 40, columns: 9, cellNarrow: 50, columnsNarrow: 7, pad: 8, nav: 40, navItem: 46, navIcon: 18,
    menu: 40, menuNarrow: 48, menuPadNarrow: 4, menuItemPad: 13, menuIcon: 22, stickerColumns: 5, stickerColumnsNarrow: 4, stickerPad: 8,
    deleteRight: 12, deletePadY: 10, deletePadX: 14, deleteIcon: 20,
  },
  /** 旧版网页多选：勾选格 28（上距 1、与头像隔 4）、圈 22；底部操作条高 52、左右内边距 24；小按钮高 28、左右内边距 9、间距 8 */
  /**
   * 旧版弹窗（DooModal）：卡片圆角、外边距（宽 / 窄屏）、右上关闭（位置、大小、图标）、标题区 / 正文 / 底部内边距、底部按钮间距；
   * 弹窗按钮（DooButton）宽屏高 36 最窄 88、窄屏胶囊高 48
   */
  dooModal: {
    radius: 18, wrapY: 24, wrapX: 16, wrapXNarrow: 10, closeTop: 12, closeRight: 10, close: 38, closeIcon: 24,
    headerTop: 22, headerX: 24, headerBottom: 20, titleEnd: 24, bodyTop: 16, bodyX: 32, bodyBottom: 2,
    footerTop: 20, footerX: 24, footerXNarrow: 22, footerBottom: 22, footerGap: 10,
    button: 36, buttonMin: 88, buttonPadX: 18, buttonNarrow: 48, buttonPadXNarrow: 16, buttonRadiusNarrow: 24,
  },
  /**
   * 旧版网页确认框（$A.modalConfirm）：宽屏卡片宽、内边距、圆角，标题行最低高、右留白，图标（26，左右各留 1）与标题间距，正文缩进，按钮行上距、按钮最窄；
   * 窄屏卡片宽、离屏边、内边距（上 / 左右 / 下）、圆角，正文上距，按钮行上距、间距
   */
  layer: {
    width: 416, padY: 22, padX: 32, radius: 18, head: 42, headEnd: 12, icon: 26, iconSide: 1, iconGap: 12, messageIndent: 40, footerTop: 22, buttonMin: 68,
    narrowWidth: 300, narrowSide: 24, narrowTop: 24, narrowX: 20, narrowBottom: 20, narrowRadius: 28, narrowMessageTop: 6, narrowFooterTop: 22, gap: 10,
  },
  webSelect: { cell: 28, cellTop: 1, cellGap: 4, icon: 22, bar: 52, barPadX: 24, button: 28, buttonPadX: 9, buttonGap: 8 },
  /** 旧版选择成员（宽屏三栏弹窗），名字照旧版类名：顶栏、左栏来源、中间列表、右栏已选、底栏 */
  usp: {
    width: 860, height: 620,
    top: 64, topPadL: 22, topPadR: 16, topGap: 12,
    search: 40, searchRadius: 12, searchPadX: 14, searchGap: 10, searchIcon: 17, clear: 18, clearIcon: 10,
    close: 32, closeRadius: 9, closeIcon: 18,
    mainGap: 8, mainPadX: 12, panelRadius: 14,
    side: 200, sidePad: 6, sideTitleTop: 14, sideTitleX: 10, sideTitleBottom: 4,
    nav: 32, navGap: 9, navPadX: 10, navRadius: 8, navIcon: 15, navIconBox: 18, navIndent: 12, dot: 8, dotRadius: 3, dotMargin: 5, badgePadX: 6,
    ch: 46, chPadL: 12, chPadR: 8, chGap: 8,
    grpTop: 10, grpX: 12, grpBottom: 4,
    row: 52, rowPadX: 12, rowRadius: 10, rowGap: 12, rowIndent: 16, avatar: 34, descTop: 1, chev: 16, sq: 34, sqRadius: 9, sqIcon: 17,
    tick: 20, tickIcon: 12, tickRing: 1.5, listBottom: 10, loading: 16, empty: 90, emptyIcon: 28, emptyGap: 8,
    rPadX: 6, rh: 42, rhTop: 14, rhX: 10, rhGap: 6, meter: 3, meterX: 10, meterBottom: 6, meterRadius: 2, rlBottom: 8,
    pr: 38, prPadL: 10, prPadR: 8, prRadius: 8, prGap: 10, rm: 22, rmRadius: 6, rmIcon: 13,
    remptyGap: 10, remptyX: 18, remptyBottom: 40, remptyDot: 28, remptyOverlap: 8, remptyRing: 2,
    foot: 68, footPadL: 22, footPadR: 14, footGap: 16, keyGap: 5, kbdPadY: 2, kbdPadX: 6, kbdRadius: 5, kbdGap: 4, actsGap: 8,
  },
  /** 旧版选择成员（手机全屏）：标题栏、搜索、首页入口、分组、行、字母索引、底栏、已选浮层 */
  uspNarrow: {
    bar: 50, barPadX: 8, barButton: 40, barButtonPadX: 8, barButtonGap: 2, barButtonIcon: 24, barTitleX: 100,
    search: 38, searchTop: 2, searchX: 16, searchBottom: 8, searchPadX: 12, searchGap: 8,
    entriesTop: 4, entriesX: 16, entriesBottom: 6, entriesPad: 4, entry: 50, entryPadL: 12, entryPadR: 10, entryGap: 12, entryRadius: 10,
    entryIcon: 30, entryIconRadius: 9, entryGlyph: 16, badgePadX: 7,
    grpTop: 14, grpX: 20, grpBottom: 6,
    row: 60, rowPadX: 20, avatar: 40, sq: 40, sqRadius: 11, sqIcon: 19, tick: 22, tickIcon: 13, listBottom: 12, empty: 70,
    indexRight: 2, indexWidth: 18, indexPad: 26,
    footY: 10, footX: 12, footGap: 10,
    stack: 44, stackPadL: 8, stackPadR: 10, stackRadius: 14, stackGap: 10, stackAvatar: 28, stackOverlap: 8, stackRing: 2, stackChev: 14,
    submit: 44, submitMin: 104, submitPadX: 20, submitRadius: 14,
    selTop: 8, selBottom: 12, selHeadTop: 6, selHeadX: 20, selHeadBottom: 8, selRadius: 14, selMax: 0.62,
    pr: 56, prPadL: 20, prPadR: 12, prGap: 12, rm: 40, rmIcon: 16,
  },
  /** 旧版确认转发：收件人头像行、转发方式单选、合并预览块、消息预览、选项、留言框 */
  forward: {
    width: 420, headerBottom: 14, padX: 24,
    avatar: 32, avatarGap: 6, nameGap: 5, recipientsTop: 4, recipientsBottom: 16,
    modeBottom: 12, modeGap: 4, radio: 14, radioDot: 8, radioGap: 4, radioItemGap: 8,
    mergePad: 12, mergeRadius: 8, mergeBottom: 8, mergeTitleBottom: 8, mergeItemGap: 4, mergeCountTop: 8,
    previewItemBottom: 16,
    option: 22, optionGap: 6, optionLast: 16,
    inputPadY: 9, inputPadX: 12, inputMin: 40, inputMax: 84, inputRadius: 8, inputBottom: 4,
  },
  /**
   * 旧版网页卡片消息：投票（宽度、标题行、标签、选项和单选圈、按钮行和转圈、结果）、接龙（名单上距、行距、参与行、箭头）、
   * 位置（宽、预览图高和圆角）、会议（内边距、最窄、行距、标签下距、创建人行高、操作行上距）、合并转发（宽度、冒号左右）；
   * app* 是 App 卡片（旧版 App）：最窄、投票和会议最窄、按钮高、加入会议高、标签图标、选项图标
   */
  card: {
    voteMin: 200, voteMax: 300, headBottom: 8, headPad: 4, headIcon: 16, tagPadX: 4, tagPadY: 2, tagGap: 4,
    optionsTop: 10, option: 34, radio: 16, radioDot: 10, radioGap: 4, check: 12,
    buttonsTop: 10, buttonsBottom: 5, buttonGap: 10, button: 32, buttonPadX: 15, spinner: 12,
    resultTop: 14, resultGap: 14, resultLast: 10, resultTitle: 3, ticketGap: 10, track: 5, votersTop: 4, voterGap: 2,
    chainTop: 20, chainGap: 5, joinTop: 10, chevron: 12, chevronGap: 2,
    location: 260, locationPreview: 110, locationRadius: 6,
    meetingPadX: 6, meetingPadY: 4, meetingMin: 220, meetingGap: 16, meetingLabel: 2, meetingCreator: 16, meetingOpTop: 12,
    mergeMin: 200, mergeMax: 300, mergeColon: 2,
    appMin: 200, appWide: 240, appButton: 38, appJoin: 36, appIcon: 14, appOptionIcon: 18,
  },
  /** 旧版网页 Markdown：块间距、标题比块间距多空的上距、分割线粗细和多空的上下距、单元格内边距、折叠三角；代码块的内边距、圆角和右上角的位置；长文「查看详情」的上距、内边距和下拉；长文阅读页内边距 */
  markdown: { gap: 16, headTop: 8, hr: 3.5, hrPad: 8, cellPadX: 13, cellPadY: 6, marker: 10, codeTop: 24, codePadX: 16, codeBottom: 16, codeHeadTop: 5, codeRadius: 6, codeCopyGap: 8, longTop: 12, longPad: 12, longPull: 10, page: 16 },
  /** 模板消息：审批卡片宽（窄屏）、正文上距和下距、首行上下内边距、行距、小标题下距、图片最大边；下载按钮上距 */
  template: { approve: 280, approveNarrow: 300, causeTop: 10, causeBottom: 10, firstPad: 15, lineGap: 3, labelGap: 5, thumb: 220, buttonTop: 10 },
  /**
   * 图片、视频查看：App（旧版 App）的页码圆点和间距、页码离底、角上按钮离边、倍速胶囊内边距、画中画按钮内边距和图标、长按菜单行高和分隔、菜单圆角；
   * web* 是旧版网页：关闭按钮和图标、按钮离边、左右切换和图标、底部工具条（高、左右内边距、离底、图标、间距、分隔）、
   * 窄屏顶栏高和按钮宽、按钮图标、页码离左离上、视频宽高
   */
  preview: {
    dot: 6, dotGap: 6, indicatorBottom: 20, chipTop: 12, chipSide: 16, rateX: 10, rateY: 4, pipPad: 6, pipIcon: 18,
    menuRow: 52, menuGap: 8, menuRadius: 14,
    webClose: 40, webCloseIcon: 26, webEdge: 40, webArrow: 44, webArrowIcon: 24,
    webToolbar: 44, webToolbarPadX: 23, webToolbarBottom: 30, webTool: 23, webToolGap: 17, webToolSep: 26,
    webTopBar: 60, webTopButton: 50, webTopIcon: 24, webCounterLeft: 20, webCounterTop: 15, webVideoWidth: 640, webVideoHeight: 360,
  },
  msgReplyBar: 3,
  msgReplyPad: 9,
  msgTextMax: 0.7,
  msgFarNarrow: 80,
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
  /**
   * 图片、视频查看页固定深色，不跟随主题（旧版 App、旧版网页）：底色、字和图标、页码圆点未选中、角上按钮底、
   * 长按菜单底和按下、菜单遮罩；网页的半透明底和按钮底
   */
  preview: {
    bg: '#000000',
    text: '#FFFFFF',
    dotOff: 'rgba(255,255,255,0.4)',
    chip: 'rgba(0,0,0,0.5)',
    menu: '#1C1C1E',
    menuPressed: 'rgba(255,255,255,0.08)',
    menuBackdrop: 'rgba(0,0,0,0.4)',
    webMask: 'rgba(0,0,0,0.8)',
    webButton: '#606266',
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
    /** 旧版弹窗卡片 */
    modal: '0px 4px 12px rgba(0,0,0,0.15)',
    /** 旧版窄屏确认框 */
    layerNarrow: '0px 14px 44px rgba(0,0,0,0.2)',
    /** 旧版选择成员：左栏选中项、浮层 */
    uspNav: '0px 1px 2px rgba(15,20,30,0.06)',
    uspPop: '0px 0px 0px 1px rgba(15,20,30,0.06), 0px 12px 32px -6px rgba(15,20,30,0.22)',
  },
  dark: {
    popover: '0px 8px 28px rgba(0,0,0,0.5), 0px 0px 0px 1px rgba(255,255,255,0.08)',
    float: '0px 2px 8px rgba(0,0,0,0.4), 0px 0px 0px 1px rgba(255,255,255,0.08)',
    menu: '0px 1px 6px rgba(0,0,0,0.6), 0px 0px 0px 1px rgba(255,255,255,0.08)',
    menuRoomy: '0px 2px 12px rgba(0,0,0,0.5)',
    modal: '0px 4px 12px rgba(0,0,0,0.5), 0px 0px 0px 1px rgba(255,255,255,0.08)',
    layerNarrow: '0px 14px 44px rgba(0,0,0,0.6), 0px 0px 0px 1px rgba(255,255,255,0.08)',
    uspNav: '0px 1px 2px rgba(0,0,0,0.3)',
    uspPop: '0px 0px 0px 1px rgba(255,255,255,0.08), 0px 12px 32px -6px rgba(0,0,0,0.6)',
  },
};

/** 按窗口宽度分三档，不看设备类型：窄屏 < 768、中屏 768–1199、宽屏 ≥ 1200 */
export const breakpoints = { xs: 0, md: 768, lg: 1200 } as const;

const shared = { typography, spacing, radius, size, opacity, palette };

export const lightTheme = { colors: light, shadow: shadow.light, ...shared };
export const darkTheme: typeof lightTheme = { colors: dark, shadow: shadow.dark, ...shared };

export type AppTheme = typeof lightTheme;
