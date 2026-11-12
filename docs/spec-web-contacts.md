# 旧版 Web 通讯录规格（spec-contacts）

- 站点：`测试服`（旧版前端，Vue 2 + iView/Element UI），通讯录路由 `/manage/messenger/contacts`（消息模块 `/manage/messenger` 内的第二个子页）
- 登录态：`~/qa/state-old-admin.json`（admin，未重新登录）
- 视口：宽 1280×860；窄 390×844（`isMobile + hasTouch`，按该视口加载）
- 方法：DOM + `getComputedStyle` 逐部件测量；交互状态用真实 hover/click/tap 探测；截图仅存局部/页面裁切
- box 约定：`(x, y) w×h`，为**视口绝对坐标**，单位 px；宽视口通讯录列起点 x=255（左侧全局导航 255 宽），窄视口通讯录列即整屏 x=0
- 样式缩写：fs=font-size，fw=font-weight，lh=line-height，m=margin，p=padding，bd=border，r=border-radius，bg=background-color，op=opacity，sh=box-shadow
- 颜色统一 hex；`〃` 表示同部件另一视口（其余列照抄上一行）
- 产物目录：`n78-spec/shots/`（截图）、`n78-spec/measure/`（原始 log/json）、`n78-spec/scripts/`（可复跑脚本）；本文件为最终规格
- 测试账号基线：admin（何翔），通讯录共 62 人（见第 8 节验收数据）

## 1. 入口与整体布局

入口共 3 条，均可达 `/manage/messenger/contacts`：

1. **宽视口 · 全局左导航**：左侧全局导航（`.manage-item` 所在列，255 宽，bg #f4f5f7）点「消息」进入消息页。导航项 `li` 204×36，p 0 8.156，m 12 0 5，r 4；文字 `.menu-title` fs 14、lh 21、color #6b6e72。
2. **宽视口 · 消息页底部切换**：消息页左列（`.messenger-select`）底部 `.messenger-menu` 有两个纯图标切换：左=会话列表，右=通讯录。实测 307.5×52，位于 y808；`.menu-icon` 72×51，图标 24×24；非激活色 #aaaaaa，激活色 #84c56a；会话图标右上带 `.menu-num` badge「1」。
3. **窄视口 · 底部 tabbar**：`.mobile-tabbar` 390×60（y784），5 个 tab 各 78×60：仪表盘（badge 37）/ 项目 / 消息（badge「1·待办6」）/ 通讯录 / 应用；标题 `.tabbar-title` fs 12；激活 tab（通讯录）图标与文字均为 #84c56a，其余 #606266。

布局：

- 宽：全局导航 255 + 通讯录列 307.5 + 1px 分隔线 + 右侧会话面板 716.5。无选中会话时右栏占位内容**未确认**。
- 窄：整屏单列。`mobile-large-header` 44（滚动后切换为 `.mobile-compact-bar` 44，标题 16/500）；`.messenger-search` 54；列表区从 y98 起；底部 tabbar 60。

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 全局导航列 | 宽 | `.manage-item` | (0,0) 255×860 | bg #f4f5f7 | 导航列表 m 16 0 0 |
| 导航项「消息」 | 宽 | `.manage-item li` | (25.5,?) 204×36 | fs 14px; fw 400; lh 21px; color #6b6e72; p 0 8.156px; m 12px 0 5px; r 4px | 点击进入消息页 |
| 通讯录列 | 宽 | `.messenger-select` | (255,0) 307.5×860 | fs 14px; fw 400; lh 21px; color #606266; bg 透明 | display flex |
| 列分隔线 | 宽 | `.messenger-line` | (562.5,0) 1×860 | bg #f4f5f5 |  |
| 右侧会话面板 | 宽 | `.messenger-msg` | (563.5,0) 716.5×860 | bg 透明 | 点联系人后在此打开私聊 |
| messenger-menu | 宽 | `.messenger-menu` | (255,808) 307.5×52 | bg 透明; display flex | 底部两个切换图标 |
| menu-icon（会话） | 宽 | `.messenger-menu .menu-icon:nth-child(1)` | (336.8,809) 72×51 | 图标 24×24 color #aaaaaa | 带 badge「1」`.menu-num` |
| menu-icon（通讯录，激活） | 宽 | `.messenger-menu .menu-icon:nth-child(2)` | (408.8,809) 72×51 | 图标 24×24 color #84c56a | 无文字标题 |
| 窄页头 | 窄 | `.mobile-large-header` | (0,0) 390×44 | bg #f8f8f8 | `.large-header-row` p 12px 16px 0; display flex; align center; gap 8px |
| 页标题「通讯录」 | 窄 | `.large-header-title` | (16,12) 318×32 | fs 24px; fw 600; lh 32px; color #303133 | 滚动后紧凑条 `.compact-bar-title` fs 16px、fw 500、lh 44px、color #333333 |
| 视图切换按钮 | 窄 | `.mobile-header-btn` | (342,12) 32×32 | bg #ffffff; r 10px; 图标 18×18 color #5f6368 | 图标为双人剪影；无 title 属性，tooltip **未确认** |
| 搜索容器 | 窄 | `.messenger-search` | (0,44) 390×54 | bg #f8f8f8; p 12px 16px 6px | display flex; center |
| 底部 tabbar | 窄 | `.mobile-tabbar` | (0,784) 390×60 | display flex | 5 项，各 78×60 |
| tabbar 标题 | 窄 | `.tabbar-title` | 例 (21,822) 36×18 | fs 12px; fw 400; color #606266（激活 #84c56a） | 图标 24×24，与文字同色 |
| 私聊页头（点联系人后） | 窄 | `.dialog-nav` | (0,0) 390×52 | — | 返回区 `.dialog-back` 52×52，箭头 26×26 color #606266，右上角标「1」；标题 h2 (125.6,6) fs 17px、fw 600、lh 22px、color #606266；副行「最后在线于…」fs 14px；⋯ 按钮 (353,15) 22×22 color #606266；头像在窄视口隐藏（display none） |

## 2. 字母视图

- 默认视图。搜框在列顶；宽视口右上角有「按部门显示」切换（`.search-mode`，icon 40×32），部门视图中该按钮 title 变为「按字母显示」。
- 分组头 `.label`：按姓名首字母（#、A、C、D、E、H、J、L、M、P、Q、R、T、V、W），**无右侧字母索引条（旧版无）**；`#` 组在最前，收纳数字/英文/特殊字符开头账号。
- 联系人行：头像 30×30（窄 36×36）+ 在线状态点 + 姓名 + 右侧灰字标签（部门负责人 / 系统管理员 / 合作帐号 / 新帐号 等）；行本身无 hover 背景变化（见 HOVER）。
- 列表最初只渲染 50 行（总数 62），滚动继续加载；footer 显示总数。虚拟滚动/分页机制**未确认**。
- 空列表态不适用（通讯录恒有数据）；加载态**未确认**（未捕捉到 loading 结构）。

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 搜索图标 | 宽 | `.messenger-select .search-pre` | (277,11) 32×32 | fs 16px; color #808695 | display flex; center |
| 搜索输入 | 宽 | `.messenger-select .ivu-input.ivu-input-default` | (?) 197.5×32 | fs 14px; color #606266; p 4px 7px; bd 1px solid rgba(0,0,0,0); r 4px; placeholder「搜索」 | 无边框，底为搜索容器 |
| 视图切换 | 宽 | `.search-mode` | (510.5,11) 40×32 | r 8px; color #808695; 图标 18×18; cursor pointer; title「按部门显示」 | 点击切到部门视图，title 变「按字母显示」；hover 样式**未确认** |
| 分组头 | 宽 | `ul.contacts li.label` | (255,60) 305.5×34 | fs 14px; fw 400; lh 34px; color #606266; bg #ffffff; p 0 0 0 28px; m 6px 2px 6px 0 | 文字如「#」「A」 |
| 〃 | 窄 | 〃 | (0,104) 388×34 | 同上 |  |
| 联系人行 | 宽 | `ul.contacts li[data-type="contacts"]` | (279,100) 283.5×52 | fs 14px; lh 21px; color #606266; bg 透明; display flex; align center | 行内无 padding；左缩进 24 |
| 〃 | 窄 | 〃 | (24,144) 366×58 | 同上 | 行高 58 |
| 头像 | 宽 | `.avatar .el-avatar` | 30×30 | 圆形，图片 object-fit cover | 默认头像为字母块 |
| 〃 | 窄 | 〃 | 36×36 | 同上 |  |
| 在线状态点 | 宽 | `.avatar-box > em` | 7.5×7.5 | bg #84c56a（在线）/ #ff9900（离线）; bd 1px solid #ffffff; 圆形; transform scale(.9375) | 在线时 `.avatar-box` 加 `online` 类；位置在头像右下角 |
| 〃 | 窄 | 〃 | 9×9 | transform scale(1.125) |  |
| 姓名区 | 宽 | `.nickname` | (309,?) 253.5×21 | p 0 0 0 12px; display flex; justify-content space-between; align center |  |
| 〃 | 窄 | 〃 | (60,162.5) 330×21 | 同上 |  |
| 姓名 | 宽 | `.nickname > em` | 示例 (321,?) 高 21 | fs 14px; fw 400; lh 21px; color #606266; p 0 12px 0 0 | 过长省略号 |
| 〃 | 窄 | 〃 | (72,162.5) 117.9×21 | 同上 |  |
| 右侧标签组 | 宽 | `.nickname > .tags` | 右对齐 | fs 12px; lh 18px; color #909399; p 0 12px 0 0; display block; 右对齐 | 多个 span 直接相连无间距 |
| 〃 | 窄 | 〃 | (378,173) 12×0（空标签时） | 同上 |  |
| 标签文本 | 宽/窄 | `.nickname > .tags span` | — | fs 12px; fw 400; lh 18px; color #909399; 无 bg/bd | 原文照抄，如「事业部 负责人」「拓展部（编外） 负责人」「系统管理员」「合作帐号」「新帐号」 |
| 底部计数 | 宽 | `.contacts li.loaded` | (255,3344) 307.5×52 | fs 14px; lh 21px; color #606266; display flex; justify-content center; align center | 文本「共62位联系人」 |
| 〃 | 窄 | 〃 | (0,3688) 390×58 | 同上 | 位于列表末尾（需滚到底） |

- HOVER（宽/窄）联系人行及行内 `.nickname` / `em` / `.tags` / `.avatar`：背景均保持透明，颜色不变（旧版无 hover 高亮）。
- PRESSED / 选中态：**未确认**（点击即跳转右栏私聊，未捕捉到选中行样式）。
- 字母索引条：**旧版无**。

## 3. 部门视图

- 切换位置：宽 `.search-mode`（搜索框右侧，见第 2 节）；窄 `.mobile-header-btn`（页头右侧）。
- 结构：部门分组标签 + 该部门直属成员；子部门缩进一级；支持展开/收起（点击分组标签整行）。
- 层级：标签 padding-left 一级 28px、二级 42px（`style="--contacts-indent: 38px"`）；成员行缩进一级 24px、二级 38px（行宽相应 -14px）。旧版当前数据最多两级。
- 部门标签右侧显示人数；有子部门的标签前有箭头（12×12，收起时朝右，展开旋转 90deg）。无子部门的标签同样渲染箭头，但展开状态不变（当前数据中叶子部门默认收起）。
- 负责人标记：在成员行右侧标签组显示「<部门> 负责人」（纯灰字，无徽标）；兼任多职时多个标签相连，如「拓展部（编外） 负责人系统管理员」。
- 默认部门：名为「默认部门」的分组，排序在最后（一级），当前人数 23，默认收起。
- 记住选择：切到部门视图后刷新页面仍保持部门视图（实测 reload 后仍有 13 个 `.department-label`）；存储机制**未确认**（localStorage/cookie 未核实）。
- 折叠时该部门及其子部门成员整体隐藏：研发部（含子部门）展开 48 行 → 收起 29 行。
- 加载态**未确认**。

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 部门标签（一级） | 宽 | `li.label.department-label` | (255,60) 305.5×34 | fs 14px; fw 400; lh 34px; color #606266; bg #ffffff; p 0 0 0 28px; m 6px 2px 6px 0; display flex | 如「事业部 7」 |
| 〃 | 窄 | 〃 | (0,104) 388×34 | 同上 |  |
| 部门标签（二级） | 宽 | `li.label.department-label[style]` | (255,2514) 305.5×34 | 同上，p 0 0 0 42px；style `--contacts-indent: 38px` | 如「开发 14」 |
| 〃 | 窄 | 〃 | (0,2804) 388×34 | 同上 |  |
| 箭头 | 宽/窄 | `.department-label .arrow` | 12×12 | color #808695; m 0 6px 0 0; 收起 transform none；展开 `rotate(90deg)`（matrix(0,1,-1,0,0,0)） | `<i class="doo-icon arrow">`，展开时加 `expanded` |
| 部门名 | 宽 | `.department-label .name` | (301,1480) 230.1×34（一级） | fs 14px; lh 34px; color #606266 | flex 占满剩余宽度 |
| 〃 | 窄 | 〃 | (46,1656) 312.6×34 | 同上 |  |
| 人数 | 宽 | `.department-label .count` | 右端 (539.1,1480) 21.4×34 | fs 12px; lh 34px; color #808695; p 0 8px 0 0; m 0 0 0 8px | 纯数字，无背景 |
| 〃 | 窄 | 〃 | 右端 (366.6,1656) 21.4×34 | 同上 |  |
| 成员行（一级部门下） | 宽 | `li[data-type="contacts"]` | (279,?) 283.5×52 | 同第 2 节行样式 | 左缩进 24 |
| 〃 | 窄 | 〃 | (24,?) 366×58 | 同上 |  |
| 成员行（二级部门下） | 宽 | `li[data-type="contacts"]` | (293,?) 269.5×52 | 同上，x+14、宽-14 | 缩进随层级 +14 |
| 〃 | 窄 | 〃 | (38,?) 352×58 | 同上 |  |
| 负责人标签 | 宽/窄 | `.nickname > .tags span` | — | fs 12px; fw 400; lh 18px; color #909399 | 文本如「事业部 负责人」「运维部 负责人」，无图标/底色 |

- HOVER（宽/窄）部门标签：样式**未确认**（未捕捉到背景/文字变化）。
- 点击行为：有子部门 → 展开/收起；无子部门 → 箭头与成员不变（当前叶子部门默认收起，点击后是否展开**未确认**）。
- 记住选择：已确认刷新后保持部门视图；具体存储机制**未确认**。

## 4. 搜索

- 输入框：宽在列顶（图标 + 无边框输入，宽 197.5，placeholder「搜索」）；窄在页头下（白色胶囊 358×36，r 10，内 input 326×32，placeholder「搜索」，图标 #999）。
- 实时过滤（无需回车），保留字母分组头；当前数据匹配规则（实测）：
  - 匹配中文姓名子串（「何」→ 何翔）；
  - 匹配姓名全拼子串（「he」→ 陈春广/陈瑜媛/何翔/梁茂深/张振威/曾振华；「hexiang」→ 何翔）；
  - 匹配中文职位/职称子串（「运维」→ 刘林旺/周海源/曾杰林），命中的人若职位不在可见标签中，会把职位作为额外 `.tags > span` 显示（如「运维开发工程师」）；
  - **不匹配**拼音首字母（hx、ls、zjw → 0 结果）；**不匹配**职位/部门的拼音（yunwei → 0 结果）。
- 结果行与普通行同构；底部计数变为「搜索到N位联系人」。
- 无结果：`li.nothing` 文案「没有任何与"<关键词>"相关的结果」（引号为直引号），无插画。
- 加载/防抖态**未确认**（输入即出结果，未见 loading 结构）。

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 搜索框容器 | 窄 | `.messenger-search .search-wrapper` | (16,56) 358×36 | bg #ffffff; r 10px; p 0 6px 0 4px; display flex; center |  |
| 搜索图标 | 窄 | `.search-pre` | (20,58) 28×32 | color #999999; display flex; center; m 0 -6px 0 0 |  |
| 搜索输入 | 窄 | `.messenger-search .ivu-input` | (42,58) 326×32 | fs 14px; p 4px 7px; bd 1px solid rgba(0,0,0,0); r 4px; placeholder「搜索」 |  |
| 命中职位标签 | 宽/窄 | `.nickname > .tags span` | 右对齐 | fs 12px; fw 400; lh 18px; color #909399; 无 bg/bd | 与普通标签同一样式，无高亮 |
| 结果计数 | 宽 | `.contacts li.loaded` | (255,152) 307.5×52 | fs 14px; lh 21px; color #606266; display flex; center | 「搜索到1位联系人」 |
| 〃 | 窄 | 〃 | (0,364) 390×58 | 同上 | 「搜索到3位联系人」 |
| 空结果 | 宽 | `li.nothing` | (255,54) 307.5×70 | fs 14px; fw 400; lh 22px; color #606266; p 24px; bg 透明 | 「没有任何与"hx"相关的结果」 |
| 〃 | 窄 | 〃 | (0,98) 390×70 | 同上 |  |

- HOVER/PRESSED：结果行同普通行（无变化，见第 2 节）；清除按钮（清空输入）样式**未确认**。

## 5. 总人数

- 宽：固定在通讯录列表末尾（`.contacts li.loaded`，y3344 处，列表底部），307.5×52，居中，文本「共62位联系人」，fs 14、lh 21、color #606266。
- 窄：同样在列表末尾（滚动到底才可见），390×58，居中，文本「共62位联系人」，其余同宽。
- 搜索时同一个节点变为「搜索到N位联系人」。页头/列头**没有**总人数展示（旧版无）。

## 6. 点击联系人后的操作

- 点击联系人行 = 直接「发消息」：宽视口在右栏打开私聊（`.messenger-msg`），窄视口整页跳转私聊（页头 390×52，见第 1 节）。
- 私聊页头 ⋯ 菜单（`.el-dropdown-menu.el-popper`）4 项：搜索消息 / 查看详情 / 创建群组 / 举报投诉。
- 输入框右侧「＋」弹出 6 项：新会议 / 发送图片 / 上传文件 / 匿名消息 / AI 生成 / 全屏输入。
- 查看详情：打开个人资料弹窗，含「开始聊天」「创建群组」两个按钮、个人信息（职位/职称、部门、邮箱、电话、标签）与「添加标签」按钮。
- 「发起会议」不在资料弹窗里，而在「＋ → 新会议」。资料弹窗里**无**「发起会议」按钮（旧版无）。

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| ⋯ 菜单面板 | 宽 | `.dialog-nav .el-dropdown-menu.el-popper` | (1173,62) 102×166（页面坐标） | bg #ffffff; p 10px 0; m 12px 0 5px; bd 1px solid #ebeeF5; r 4px | 悬停「查看详情」 |
| 〃 | 窄 | 〃 | (283,64) 102×166 | 同上 |  |
| 菜单项 | 宽 | `.el-dropdown-menu__item` | (1174,73) 100×36 | fs 14px; fw 400; lh 36px; color #606266; p 0 20px; bg 透明 | 四项等距 |
| 〃 | 窄 | 〃 | (284,75) 100×36 | 同上 |  |
| ＋ 弹层 | 宽 | `.el-popover.chat-input-more-popover` | (1133,564) 116×232 | bg #ffffff; p 8px; r 4px; sh rgba(0,0,0,.2) 0 1px 6px 0 | 6 项 |
| 〃 | 窄 | 〃 | (257,556) 116×232 | 同上（窄为 position fixed） |  |
| ＋ 菜单项 | 宽 | `.chat-input-popover-item` | (1141,572) 100×36 | fs 14px; lh 36px; color #606266; p 0 8px; r 4px; display flex; 图标 20×20 | 新会议/发送图片/上传文件/匿名消息/AI 生成/全屏输入 |
| 〃 | 窄 | 〃 | (265,564) 100×36 | 同上 |  |
| 资料弹窗 | 宽 | `.doo-modal-card` | (400,116.8) 480×626.5 | bg #ffffff; r 18px; margin 92.75px 384px; display flex | 覆盖右栏与通讯录列 |
| 〃 | 窄 | 〃 | (10,108.8) 370×626.5 | 同上 |  |
| 封面区 | 宽/窄 | `.profile-header .cover-photo` | 顶部整宽 | 渐变背景（视觉，截图 `shots/contacts-profile-wide.png`；具体渐变色**未确认**） |  |
| 弹窗头像 | 宽/窄 | `.profile-avatar .el-avatar` | 96×96 | 圆形，白色描边（视觉） | 压住封面下缘 |
| 用户名 | 宽/窄 | `.username` | (424,312.8) 432×30（宽） | fs 20px; fw 700; lh 30px; color #606266 | 「何翔」 |
| 元信息行 | 宽/窄 | `.meta` | fs 13px; lh 19.5px; color #808695 | 「共同群组:6个 | 项目与任务 | 最后在线: 1小时前」 | 「6个」color #84c56a，「|」m 0 8px |
| 开始聊天 | 宽 | `.profile-actions button:nth-child(1)` | (524,386.3) 110×32 | fs 14px; color #606266; bg #ffffff; bd 1px solid #ececec; r 6px; p 0 15px | 前图标 16×16 |
| 创建群组 | 宽 | `.profile-actions button:nth-child(2)` | (646,386.3) 110×32 | 同上 |  |
| 〃（两按钮） | 窄 | 〃 | (79,378.3) / (201,378.3) 各 110×32 | 同上 |  |
| 个人信息标题 | 宽/窄 | `.profile-information h2` | (440,458.3) 400×24（宽） | fs 16px; fw 700; lh 24px; color #606266; m 0 0 12px | 「个人信息」 |
| 信息行 | 宽/窄 | `.profile-information li` | 宽 290×38；窄 (50,486.3) 290×38 | p 8px 0; display flex | 左侧图标 + 标签 + 值 |
| 字段标签 | 宽/窄 | `.profile-information .label` | (472,616.3) 64×22（宽） | fs 14px; fw 400; lh 22px; color #808695; m 0 8px 0 0 | 职位/职称、部门、邮箱、电话 |
| 字段值 | 宽/窄 | `.profile-information .value` | (544,616.3) 296×21（宽） | fs 14px; fw 500; lh 21px; color #303133 | 邮箱值带 `clickable` 类，可点击 |
| 添加标签 | 宽 | `.add-tag-btn.ivu-btn-dashed` | (440,671.3) 109×32 | fs 14px; color #606266; bg #ffffff; bd 1px dashed #dcdee2; r 6px; p 0 15px | 前「＋」 |
| 〃 | 窄 | 〃 | (50,663.3) 109×32 | 同上 |  |

- HOVER（宽）页头菜单项：bg #f4f5f7，文字色不变。
- HOVER（宽）＋ 菜单项：bg #ecf5ff，文字色不变；窄未单独测（同组件）。
- HOVER 资料弹窗两个按钮：**未确认**（未捕捉到 hover 样式变化）。
- 行点击后右侧私聊的输入框/消息区不属于通讯录范围，本表只记入口与页头。

## 7. 机器人列表

- 通讯录内**无独立机器人分组/列表（旧版无）**。列表中「DooTask」「2222」等为普通账号；AI 机器人「Doo AI」只出现在消息会话列表，不在通讯录。
- 联系人行没有机器人标识/badge。

## 8. 验收数据（admin 账号，2026-11-12 实测）

- 总人数：**62**（footer「共62位联系人」；字母视图首屏只渲染 50 行，滚动加载余量）。
- 字母分组（顺序）：「#」、A、C、D、E、H、J、L、M、P、Q、R、T、V、W；**无字母索引条**。
- 部门（13 个标签，顺序与人数，部门视图）：
  1. 事业部 7（一级，默认展开）
  2. 运维部 4（一级，默认展开）
  3. 财务部 1（一级，默认展开）
  4. 设计部 3（一级，默认展开）
  5. 拓展部（编外） 4（一级，默认展开）
  6. 运营部 3（一级，默认展开）
  7. 研发部 20（一级，默认展开）
  8. 开发 14（二级，默认收起；成员行缩进 +14）
  9. 产品测试 7（二级，默认收起）
  10. E2E部门主副 4（一级，默认展开）
  11. 总经办 3（一级，默认展开）
  12. 人力行政部 2（二级，默认收起）
  13. 默认部门 23（一级，默认收起，排最后）
- 部门人数之和大于总人数（成员可属于多个部门且父部门含子部门成员），验收时以标签原文为准。
- 负责人标签原文：「事业部 负责人」「运维部 负责人」「财务部 负责人」「设计部 负责人」「拓展部（编外） 负责人」「人力行政部 负责人」「产品组 负责人」等；兼任者显示多个标签相连（如 DooTask「拓展部（编外） 负责人」+「系统管理员」）。
- 其他标签原文：「系统管理员」「合作帐号」「新帐号」。
- 联系方式样例（何翔）：职位/职称「前端开发工程师」；部门「开发, 前端组, 研发部」；邮箱 `<普通账号邮箱>`；电话 `-`；共同群组 6 个。

## 缺失项 / INCONCLUSIVE

- 宽视口无会话时右侧面板的占位内容与样式：**未确认**。
- 联系人行 hover / pressed / 选中态：hover 实测无变化；pressed 与选中态**未确认**。
- 视图切换按钮（宽 `.search-mode` / 窄 `.mobile-header-btn`）的 hover、切换后图标变化：icon 会随视图变化（双人/字母），hover 样式**未确认**；窄按钮无 title，tooltip 文案**未确认**。
- 部门标签 hover、无子部门部门标签点击后的行为：**未确认**。
- 视图选择持久化机制（localStorage / cookie / 服务端）：**未确认**（现象已确认：刷新后保持部门视图）。
- 通讯录加载态（骨架屏/loading）：**未确认**；首屏 50 行的加载策略（滚动加载/虚拟列表）**未确认**。
- 搜索清空按钮、搜索防抖/加载态：**未确认**。
- 资料弹窗封面渐变具体色值、弹窗关闭按钮尺寸、按钮 hover：**未确认**。
- 私人聊天输入区（表情/文件/语音等）与消息气泡：不属于通讯录，未在本表展开。
