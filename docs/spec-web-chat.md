# DooTask 旧版 Web 聊天页 · 分区勘测规格

- 勘测对象：旧版 测试服 `/manage/messenger`（新版不在范围内）
- 登录态：`state-old-admin.json`（管理员，未登出、未改系统设置）
- 视口：**宽屏 1280×860**（deviceScaleFactor 1）；**窄屏 390×844**（isMobile/hasTouch，deviceScaleFactor 1）
- 坐标：视口坐标 px，box 格式 `x,y w×h`。y 为负表示元素在滚动容器的可视区之外（宽高、样式仍然有效）
- 颜色：十六进制；`#xxxxxx /α` 表示 rgba 带透明度
- 会话：群聊「运维部」id 5805（5 人、部门标签、有置顶条）；单聊「周海源」id 915；全员群 2889（用于全员标签/待办徽标）；机器人会话 32752 Doo AI、6331 机器人管理、6449 任务提醒、11827 会议通知
- 测试数据（仅测试服，未删除任何会话、未退群）：`QA 规格测试消息 01`（自己）、`QA 提及测试 @周海源`、`QA 引用回复测试`（引用回复）、`QA 已编辑消息`（已编辑）、`cpu占用高一般都是查询导致` 上的 👍 回应（DooTask 点过）、`1条回复`
- 说明：Popper 类浮层多为 `position: fixed` 或挂载到 body，selector 以实际可见元素为准；`offsetParent` 对 fixed 元素为 null，可见性判断一律用 getBoundingClientRect

---

## 1. R2 头部与分类行

### 1.1 头部 / 分类 / 置顶条 / …菜单

| 元素 | 视口 | 选择器 | box | 关键样式 | 文字/备注 |
|---|---|---|---|---|---|
| 头部容器 | 1280×860 | `.dialog-nav` | 564,0 717×68 | fs 14px · color #606266 | 运维部 / (5) / 部门 / 消息 / 待办 / 标注 / 图片 / 文件 / 链接 |
| 头部内层 | 1280×860 | `.nav-wrapper` | 564,0 717×68 | pad 0/22/0/22 · disp flex · pos relative | 同上 |
| 群头像 | 1280×860 | `.dialog-block .dialog-avatar` | 586,13 44×42 | mar 0/12/0/0 |  |
| 群头像内块 | 1280×860 | `.dialog-block .common-dialog-avatar` | 586,13 42×42 | bg #5bc7b0 · radius 50% · disp inline-flex |  |
| 群名 | 1280×860 | `.dialog-title .main-title h2` | 642,12 51×22 | fs 17px · fw 600 · color #606266 | 运维部 |
| 人数 | 1280×860 | `.dialog-title .main-title em` | 699,12 19×22 | fs 17px · fw 500 · color #606266 · mar 0/0/0/6 | (5) |
| 标签(部门) | 1280×860 | `.dialog-title .ivu-tag` | 723,12 36×22 | fs 12px · color #606266 · bg #f7f7f7 · radius 3px · pad 0/5/0/5 · mar 0/0/0/6 · border 1px solid #e8eaec | 部门 |
| 标签文字 | 1280×860 | `.dialog-title .ivu-tag .ivu-tag-text` | 729,12 24×22 | fs 12px · color #606266 | 部门 |
| 右侧…按钮 | 1280×860 | `.dialog-menu-icon` | 1236,22 22×22 | fs 22px · color #606266 · mar 0/22/0/22 |  |
| 分类行 | 1280×860 | `.dialog-title .title-types` | 642,34 573×22 | fs 14px · disp flex | 消息 / 待办 / 标注 / 图片 / 文件 / 链接 |
| 分类-消息 | 1280×860 | `.title-types li.msg` | 642,38 54×24 | fs 12px · fw 500 · color #84c56a · bg #84c56a /0.18 · radius 5px · pad 0/6/0/6 · mar 4/6/-6/0 | 消息 |
| 分类-待办 | 1280×860 | `.title-types li.todo` | 702,38 54×24 | fs 12px · color #303133 · radius 5px · pad 0/6/0/6 · mar 4/6/-6/0 | 待办 |
| 分类-标注 | 1280×860 | `.title-types li.tag` | 762,38 54×24 | 同上 | 标注 |
| 分类-图片 | 1280×860 | `.title-types li.image` | 822,38 54×24 | 同上 | 图片 |
| 分类-文件 | 1280×860 | `.title-types li.file` | 882,38 54×24 | 同上 | 文件 |
| 分类-链接 | 1280×860 | `.title-types li.link` | 942,38 54×24 | 同上 | 链接 |
| 分类选中项 | 1280×860 | `.title-types li.active`（以 `.msg.active` 为例） | 642,38 54×24 | fs 12px · fw 500 · color #84c56a · bg #84c56a /0.18 · radius 5px · pad 0/6/0/6 | 五个分类选中态样式一致，仅文字不同 |
| 分类图标 i | 1280×860 | `.title-types li.msg i` | 648,43 14×14 | fs 14px · fw 500 · color #84c56a · mar 0/4/0/0 |  |
| 待办数量徽标（5805 无） | 1280×860 | `.title-types .type-count` | — | — | INCONCLUSIVE 未找到（该会话待办数为 0，不渲染徽标） |
| 头部…按钮 | 1280×860 | `.dialog-menu-icon` | 1236,22 22×22 | fs 22px · color #606266 |  |
| …菜单容器 | 1280×860 | `body > .el-dropdown-menu.el-popper` | 1173,62 102×166 | bg #ffffff · radius 4px · pad 10/0/10/0 · border 1px solid #ebeef5 · shadow rgba(0,0,0,.1) 0 2 12 | 搜索消息 / 群组设置 / 举报投诉 / 退出群组 |
| …菜单项1 | 1280×860 | `body > .el-dropdown-menu.el-popper > li.el-dropdown-menu__item` | 1174,73 100×36 | fs 14px · lh 36px · color #606266 · pad 0/20/0/20 | 搜索消息 |
| 菜单项2–4 | 1280×860 | 同上 nth 1/2/3 | 1174,109 / 1174,145 / 1174,181（各 100×36） | 同上 | 群组设置 / 举报投诉 / 退出群组（顺序固定，无分隔线） |
| 置顶条容器 | 1280×860 | `.dialog-top-message` | 564,68 717×74 | bg #ffffff | 周海源 / : / ~值班表.xlsx / 置顶人员 / 黄承武 |
| 置顶条内层 | 1280×860 | `.dialog-top-message-warp` | 580,78 685×64 | radius 10px · pad 10/5/10/5 · mar 10/16/0/16 · border 1px solid #ebebeb · shadow rgba(205,205,205,.5) 0 0 5 |  |
| 置顶条内容 | 1280×860 | `.dialog-top-message-content` | 632,89 545×42 | fs 14px · color #606266 | 周海源 / : / ~值班表.xlsx / 置顶人员 / 黄承武 |
| 置顶条图标 | 1280×860 | `.dialog-top-message-font i` | 596,91 26×26 | fs 16px · color #ffffff · bg #ff821a · radius 50% · pad 5/5/5/5 |  |
| 置顶条名称 | 1280×860 | `.dialog-top-message-content .avatar-name` | 632,90 42×20 | fs 14px · color #606266 · disp flex | 周海源 |
| 置顶条操作区 | 1280×860 | `.dialog-top-message-btn` | 1176,89 82×42 | pad 0/10/0/10 · gap 10px · disp flex |  |
| 头部容器 | 390×844 | `.dialog-nav` | 0,0 390×86 | fs 14px · color #606266 | 运维部 / (5) / 部门 / 消息 / 待办 / 标注 / 图片 / 文件 / 链接 |
| 头部内层 | 390×844 | `.nav-wrapper` | 0,0 390×52 | mar 0/0/34/0 · disp flex · pos relative |  |
| 返回按钮 | 390×844 | `.dialog-back` | 0,0 52×52 | 图标 `.dialog-back .doo-icon` 10,13 26×26 · fs 26px · color #606266 | 窄屏左侧返回箭头 |
| 群头像 | 390×844 | `.dialog-block .dialog-avatar` | 0,0 0×0 | disp none · mar 0/12/0/0 | 窄屏无（头像隐藏，群名居中） |
| 群名 | 390×844 | `.dialog-title .main-title h2` | 136,15 51×22 | fs 17px · fw 600 · color #606266 | 运维部 |
| 人数 | 390×844 | `.dialog-title .main-title em` | 193,15 19×22 | fs 17px · fw 500 · mar 0/0/0/6 | (5) |
| 标签(部门) | 390×844 | `.dialog-title .ivu-tag` | 218,15 36×22 | fs 12px · bg #f7f7f7 · radius 3px · pad 0/5/0/5 · border 1px solid #e8eaec | 部门 |
| 标签文字 | 390×844 | `.dialog-title .ivu-tag .ivu-tag-text` | 224,15 24×22 | fs 12px | 部门 |
| 右侧…按钮 | 390×844 | `.dialog-menu-icon` | 353,15 22×22 | fs 22px |  |
| 分类行 | 390×844 | `.dialog-title .title-types` | 0,48 390×32 | bg #f8f8f8 · pad 0/8/0/8 · disp flex · pos absolute | 六个分类横向铺满 |
| 分类-消息 | 390×844 | `.title-types li.msg` | 8,52 63×28 | fs 14px · fw 500 · color #84c56a · bg #84c56a /0.18 · radius 5px · pad 0/8/0/8 · mar 4/6/-6/0 | 消息 |
| 分类-待办 | 390×844 | `.title-types li.todo` | 77,52 63×28 | fs 14px · color #303133 · radius 5px · pad 0/8/0/8 | 待办 |
| 分类-标注 | 390×844 | `.title-types li.tag` | 146,52 63×28 | 同上 | 标注 |
| 分类-图片 | 390×844 | `.title-types li.image` | 215,52 63×28 | 同上 | 图片 |
| 分类-文件 | 390×844 | `.title-types li.file` | 284,52 63×28 | 同上 | 文件 |
| 分类-链接 | 390×844 | `.title-types li.link` | 353,52 63×28 | 同上 | 链接 |
| 分类选中态 | 390×844 | `.title-types li.active` | 如 `.todo.active` 77,52 63×28 | fs 14px · fw 500 · color #84c56a · bg #84c56a /0.18 · radius 5px · pad 0/8/0/8 | 五个分类共用 |
| 分类图标 i | 390×844 | `.title-types li.msg i` | 16,58 16×16 | fs 16px · color #84c56a · mar 0/3/0/0 |  |
| 待办数量徽标（5805 无） | 390×844 | `.title-types .type-count` | — | — | INCONCLUSIVE 未找到 |
| 头部…菜单 | 390×844 | `body > .el-dropdown-menu.el-popper` | 283,64 102×166 | bg #ffffff · radius 4px · pad 10/0 · border 1px solid #ebeef5 · pos fixed | 搜索消息 / 群组设置 / 举报投诉 / 退出群组 |
| 菜单项1 | 390×844 | 同上 `> li` | 284,75 100×36 | fs 14px · lh 36px · pad 0/20 | 搜索消息 |
| 置顶条容器 | 390×844 | `.dialog-top-message` | 0,86 390×74 | bg #ffffff | 周海源 / : / ~值班表.xlsx / 置顶人员 / 黄承武 |
| 置顶条内层 | 390×844 | `.dialog-top-message-warp` | 16,96 358×64 | radius 10px · pad 10/5 · mar 10/16/0/16 · border 1px solid #ebebeb · shadow rgba(205,205,205,.5) 0 0 5 |  |
| 置顶条内容 | 390×844 | `.dialog-top-message-content` | 68,107 218×42 | fs 14px |  |
| 置顶条图标 | 390×844 | `.dialog-top-message-font i` | 32,109 26×26 | bg #ff821a · radius 50% |  |
| 置顶条名称 | 390×844 | `.dialog-top-message-content .avatar-name` | 68,108 42×20 | fs 14px | 周海源 |
| 置顶条操作区 | 390×844 | `.dialog-top-message-btn` | 286,107 82×42 | gap 10px |  |

补充（宽屏，其他会话/会话类型）：

| 元素 | 视口 | 选择器 | box | 关键样式 | 文字/备注 |
|---|---|---|---|---|---|
| 全员标签 | 1280×860 | `.dialog-title .ivu-tag` | 750,12 36×22 | 同部门标签（#f7f7f7 底） | 全员（文字不同，样式一致） |
| 全员群名/人数 | 1280×860 | `.dialog-title h2` / `.main-title em` | 642,12 68×22 / 716,12 28×22 | fs 17px · fw 600 / fw 500 | 全体成员 / (31) |
| 待办数量徽标（2889） | 1280×860 | `.title-types .type-count` | 754,42 16×16 | fs 10px · fw 600 · color #ffffff · bg #f5a524 · radius 8px · pad 0/4/0/4 · mar 0/0/0/4 | 1 |
| 机器人标签 | 1280×860 | `.dialog-title .ivu-tag` | 716,23 48×22 | 同部门标签 | 机器人 |
| 机器人/单聊状态位 | 1280×860 | `.dialog-title .title-desc li` | 0,0 0×0 | fs 12px · lh 16px · color #84c56a（机器人）/ #aaaaaa（单聊）· pad 2/0/0/0 | 在线 / 最后在线于2025-12-19（两者实测均 0×0，容器在该布局下不占位） |
| 单聊头像 | 1280×860 | `.dialog-block .common-avatar` | 586,13 42×42 | disp flex · pos relative | 单聊头像 42×42 圆形 |

### 1.2 分类页内容（待办 / 图片 / 文件）

| 元素 | 视口 | 选择器 | box | 关键样式 | 文字/备注 |
|---|---|---|---|---|---|
| 待办标记（每行） | 1280×860 | `.dialog-msgs .dialog-item .todo` | 1110,-4644 13×13 | fs 14px · lh 14px · mar 0/6/0/0 · disp flex · pos relative | 待办 Tab 下每条消息行尾的小标记；无独立“待办卡片”容器（TODO_CARD null） |
| 待办标记图标 | 1280×860 | `.dialog-msgs .dialog-item .todo i` | 0,0 0×0 | fs 32px · color #c5c8ce | 图标由 SVG/伪元素绘制，实测盒子为 0×0 |
| 图片 Tab 消息行 | 1280×860 | `.dialog-msgs .dialog-item` | 596,-5622 653×36 | pad 0/0/16/0 · disp flex | 复用普通消息行布局，不是九宫格相册 |
| 图片 Tab 图片 | 1280×860 | `.dialog-msgs .dialog-item .content-text img` | 644,-1136 220×218 | bg #000000 /0.06 · radius 6px · disp inline | 内联渲染，固定宽 220，高按原图比例；点击可预览（本次未打开预览） |
| 图片 Tab 内容层 | 1280×860 | `.dialog-msgs .dialog-item .content-text` | 642,-1158 321×242 | pad 2/2/2/2 · color #303133 |  |
| 文件 Tab 消息行 | 1280×860 | `.dialog-msgs .dialog-item` | 596,-2376 653×36 | pad 0/0/16/0 |  |
| 文件卡 | 1280×860 | `.dialog-msgs .dialog-item .file-box` | 642,-618 220×81 | bg #ffffff · radius 3px · pad 10/14/10/14 · disp flex |  |
| 文件缩略图 | 1280×860 | `.dialog-msgs .dialog-item .file-thumb` | 656,-595 36×36 | — | 按扩展名取图标（pdf 等） |
| 文件名 | 1280×860 | `.dialog-msgs .dialog-item .file-name` | 704,-608 120×36 | fs 14px · lh 18px · color #303133 | 运维整改实施和设计.pdf（最多两行） |
| 文件大小 | 1280×860 | `.dialog-msgs .dialog-item .file-size` | 704,-572 120×25 | fs 14px · color #606266 · pad 4/0/0/0 | 108.80 KB |
| 图片 Tab 图片 | 390×844 | `.dialog-msgs .dialog-item .content-text img` | 62,-1158 220×218 | 同宽屏（固定 220 宽） | 窄屏图片宽度不变，超出部分靠气泡换行 |
| 图片 Tab 内容层 | 390×844 | `.dialog-msgs .dialog-item .content-text` | 60,-1180 266×262 | pad 2/2/2/2 |  |
| 文件卡 | 390×844 | `.dialog-msgs .dialog-item .file-box` | 60,-600 220×81 | bg #ffffff · radius 3px · pad 10/14 |  |
| 文件缩略图 | 390×844 | `.dialog-msgs .dialog-item .file-thumb` | 74,-577 36×36 | — |  |
| 文件名 | 390×844 | `.dialog-msgs .dialog-item .file-name` | 122,-590 120×36 | fs 14px · lh 18px | 运维整改实施和设计.pdf |
| 文件大小 | 390×844 | `.dialog-msgs .dialog-item .file-size` | 122,-554 120×25 | fs 14px · pad 4/0/0/0 | 108.80 KB |

**截图**：`r2-wide-header.png`、`r2-wide-header-quan.png`（全员标签）、`r2-wide-header-bot.png`（机器人标签）、`r2-wide-header-dm.png`（单聊）、`r2-wide-menu.png`、`r2-wide-pinned.png`、`r2-wide-todo.png`、`r2-wide-todochip.png`、`r2-wide-image.png`/`r2-wide-image-region.png`、`r2-wide-file.png`/`r2-wide-file-region.png`；窄屏对应 `r2-narrow-header.png`、`r2-narrow-menu.png`、`r2-narrow-pinned.png`、`r2-narrow-todo.png`、`r2-narrow-image.png`/`r2-narrow-image-region.png`、`r2-narrow-file.png`/`r2-narrow-file-region.png`

**行为**
- 头部右侧「…」下拉固定四项顺序：搜索消息 → 群组设置 → 举报投诉 → 退出群组；每项 36px 高、无分隔线；宽屏绝对定位在按钮下方，窄屏为 fixed 浮层。
- 分类行点击切换的是**消息列表的过滤视图**（消息/待办/标注/图片/文件/链接），选中项变为绿色文字 + 浅绿底（`#84c56a` / 0.18）；待办页会在每条消息行尾加 13×13 待办标记，图片页按普通消息流内联渲染图片（固定 220 宽），文件页渲染 220×81 文件卡（缩略图 36 + 名称/大小）。
- 「待办」徽标 `.type-count` 只在有未完成待办时出现（2889 有，5805 无）。
- 置顶条常驻在头部下方（高 74），显示置顶消息摘要 + 置顶人员；窄屏内层左右各留 16。
- 窄屏头部：左侧 `.dialog-back` 52×52 返回箭头，群头像隐藏（display:none），群名居中，分类行绝对定位在 48、高 32、字号 14（宽屏为 12）。
- 单聊/机器人头部不显示人数，`.title-desc li`（在线/最后在线）实测为 0×0，不占位。

**未测/INCONCLUSIVE**：5805 的 `.type-count` 不存在（会话无待办）；`.title-desc` 在线状态元素 0×0，无法给出可视样式；待办页未渲染独立卡片容器（仅行尾标记）。

---

## 2. R3 消息区

### 2.1 容器与气泡

| 元素 | 视口 | 选择器 | box | 关键样式 | 文字/备注 |
|---|---|---|---|---|---|
| 消息区容器 | 1280×860 | `.dialog-msgs` | 564,142 717×656 | pos relative |  |
| 消息滚动层 | 1280×860 | `.dialog-scroller` | 564,142 717×656 | pad 16/32/0/32 · pos absolute |  |
| 消息行 | 1280×860 | `.dialog-item` | 596,-4033 653×36 | pad 0/0/16/0 · disp flex | 行间距靠 padding-bottom 16 |
| 自己的消息行 | 1280×860 | `.dialog-item.self` | 596,335 653×105 | pad 0/0/16/0 · disp flex |  |
| 对方消息行 | 1280×860 | `.dialog-item:not(.self)` | 596,-4033 653×36 | 同上 | y 为负表示滚动区外 |
| 自己气泡底色层 | 1280×860 | `.dialog-item.self .dialog-head` | 1065,363 145×40 | bg #84c56a · radius 8px 2px 8px 8px · pad 8px | 气泡背景/圆角实际在 `.dialog-head` 上 |
| 自己气泡外框 | 1280×860 | `.dialog-item.self .dialog-content` | 1073,371 129×24 | disp flex · pos relative |  |
| 自己气泡内层 | 1280×860 | `.dialog-item.self .content-text` | 1073,371 129×24 | color #ffffff · pad 2/2/2/2 · max-width 100% |  |
| 自己气泡段落 | 1280×860 | `.dialog-item.self .content-text pre p` | 1075,373 125×20 | fs 14px · lh 20px · color #ffffff | QA 规格测试消息 01 |
| 自己气泡宽度限制 | 1280×860 | `.dialog-item.self .dialog-view` | — | max-width 70% · mar 0/8/0/0 | 宽屏最大 70% |
| 对方气泡底色层 | 1280×860 | `.dialog-item:not(.self) .dialog-head` | 634,226 197×40 | bg #f4f5f7 · radius 2px 8px 8px · pad 8px |  |
| 对方气泡外框 | 1280×860 | `.dialog-item:not(.self) .dialog-content` | 642,234 181×24 | disp flex · pos relative |  |
| 对方气泡内层 | 1280×860 | `.dialog-item:not(.self) .content-text` | 642,234 181×24 | color #303133 · pad 2/2/2/2 |  |
| 对方气泡段落 | 1280×860 | `.dialog-item:not(.self) .content-text pre p` | 644,236 177×20 | fs 14px · lh 20px · color #303133 | cpu占用高一般都是查询导致 |
| 对方气泡宽度限制 | 1280×860 | `.dialog-item:not(.self) .dialog-view` | — | max-width 70% · mar 0/0/0/8 |  |
| 消息区头像(对方) | 1280×860 | `.dialog-item:not(.self) .dialog-avatar .el-avatar` | 596,198 30×30 | radius 50% |  |
| 头像外层(对方) | 1280×860 | `.dialog-item:not(.self) .dialog-avatar` | 596,198 30×30 | mar 0/0/20/0 · pos relative |  |
| 消息区头像(自己) | 1280×860 | `.dialog-item.self .dialog-avatar .el-avatar` | 1218,335 30×30 | bg #c0c4cc · radius 50% |  |
| 自己消息行头像外层 | 1280×860 | `.dialog-item.self .dialog-avatar` | 1218,335 30×30 | mar 0/0/20/0 |  |
| 对方名称 | 1280×860 | `.dialog-item:not(.self) .dialog-username .avatar-name` | 634,198 42×20 | fs 14px · color #606266 · opacity .8 | 周海源（名称行 mar-bottom 6） |
| 时间（今天） | 1280×860 | `.dialog-item.self .dialog-foot .time` | 1162,409 30×12 | fs 12px · lh 12px · color #bbbbbb | 23:26（title 为完整时间） |
| 时间（昨天） | 1280×860 | `.dialog-item .dialog-foot .time` | — | fs 12px · color #bbbbbb | 昨天 23:26（title=2026-11-11 23:26:26） |
| 时间（更早） | 1280×860 | `.dialog-item .dialog-foot .time` | 697,304 63×12 | fs 12px · color #bbbbbb | 2025-12-18（超过前天只显示日期） |
| 已读回执圈 | 1280×860 | `.dialog-item.self .common-circle` | 1196,408 14×14 | radius 50% · SVG 描边 | 14×14 圆形进度/勾选控件（无文字） |
| 编辑标记 | 1280×860 | `.dialog-item .dialog-foot .modify` | 1143,662 13×13 | mar 0/6/0/0 · disp flex |  |
| 编辑标记图标 | 1280×860 | `.dialog-item .dialog-foot .modify i` | 1143,662 13×13 | fs 13px |  |
| 消息区容器 | 390×844 | `.dialog-msgs` | 0,160 390×622 | pos relative |  |
| 消息滚动层 | 390×844 | `.dialog-scroller` | 0,160 390×622 | bg #ffffff · pad 16/14/0/14 |  |
| 消息行 | 390×844 | `.dialog-item` | 14,-4349 362×36 | pad 0/0/16/0 |  |
| 自己的消息行 | 390×844 | `.dialog-item.self` | 14,298 362×105 | pad 0/0/16/0 |  |
| 自己气泡底色层 | 390×844 | `.dialog-item.self .dialog-head` | — | bg #84c56a · radius 8px 2px 8px 8px · pad 8px |  |
| 自己气泡内层 | 390×844 | `.dialog-item.self .content-text` | 192,334 138×24 | color #ffffff · pad 2/2 |  |
| 自己气泡段落 | 390×844 | `.dialog-item.self .content-text pre p` | 194,336 134×20 | fs 15px · lh 20px | 窄屏正文 15px（宽屏 14px） |
| 自己气泡宽度限制 | 390×844 | `.dialog-item.self .dialog-view` | — | max-width calc(100% - 80px) · mar 0/8/0/0 | 窄屏改为容器宽 -80px |
| 对方气泡底色层 | 390×844 | `.dialog-item:not(.self) .dialog-head` | 52,189 209×40 | bg #f4f5f7 · radius 2px 8px 8px · pad 8px |  |
| 对方气泡段落 | 390×844 | `.dialog-item:not(.self) .content-text pre p` | 62,199 189×20 | fs 15px · lh 20px | cpu占用高一般都是查询导致 |
| 对方气泡宽度限制 | 390×844 | `.dialog-item:not(.self) .dialog-view` | — | max-width calc(100% - 80px) · mar 0/0/0/8 |  |
| 消息区头像(对方) | 390×844 | `.dialog-item:not(.self) .dialog-avatar .el-avatar` | 14,161 30×30 | radius 50% |  |
| 对方名称 | 390×844 | `.dialog-item:not(.self) .dialog-username .avatar-name` | 52,161 42×20 | fs 14px | 周海源 |
| 时间（更早） | 390×844 | `.dialog-item .dialog-foot .time` | 116,268 63×12 | fs 12px · color #bbbbbb | 2025-12-18 |
| 自己时间 | 390×844 | `.dialog-item.self .dialog-foot .time` | 290,373 30×12 | fs 12px · color #bbbbbb | 23:26 |
| 已读回执圈 | 390×844 | `.dialog-item.self .common-circle` | 324,372 14×14 | radius 50% |  |
| 编辑标记 | 390×844 | `.dialog-item .dialog-foot .modify` | 271,646 13×13 | mar 0/6/0/0 |  |

### 2.2 回应 / @ / 引用 / 系统消息

| 元素 | 视口 | 选择器 | box | 关键样式 | 文字/备注 |
|---|---|---|---|---|---|
| 回应胶囊（hasme） | 1280×860 | `.dialog-item .dialog-emoji li.hasme` | 642,264 88×26 | fs 14px · lh 22px · bg #e1e1e1 · radius 14px · pad 2/8 · mar 6/8/0/0 | 👍 / DooTask（自己点过：不透明底） |
| 回应胶囊（未点过） | 1280×860 | `.dialog-item .dialog-emoji li` | 642,22 88×26 | 同尺寸；bg rgba(225,225,225,.5)（半透明） | 🎉 / DooTask（别人点过） |
| 回应 emoji | 1280×860 | `.emoji-symbol` | 650,266 20×22 | fs 16px · lh 22px | 👍 |
| 回应人名容器 | 1280×860 | `.emoji-users` | 670,266 52×22 | pad 0/0/0/6 | DooTask |
| 回应人名 | 1280×860 | `.emoji-users .avatar-name` | 676,270 46×14 | fs 12px · color #818181 | DooTask |
| @ 胶囊 | 1280×860 | `.content-text .mention` | 1069,732 54×17 | fs 14px · lh 20px · color #303133 · radius 6px · disp inline | @周海源 |
| 引用块 | 1280×860 | `.dialog-reply` | 805,476 397×40 | color #ffffff · pad 0/0/0/9 · mar 0/0/4/0 · pos relative | 周海源 / cpu占用高一般都是查询导致 |
| 引用块人名 | 1280×860 | `.dialog-reply .reply-avatar .avatar-name` | 814,476 39×18 | fs 13px · fw 500 · color #ffffff | 周海源 |
| 引用块正文 | 1280×860 | `.dialog-reply .reply-desc` | 814,496 388×20 | fs 13px · lh 19.5px · color #ffffff | cpu占用高一般都是查询导致 |
| 系统消息 | 1280×860 | `.dialog-notice` | 864,120 115×26 | fs 12px · lh 18px · color #909399 · bg #efefef · radius 8px · pad 4/8 · 居中 | 贾晰雯 已加入群组 |
| 回应胶囊（hasme） | 390×844 | `.dialog-emoji li.hasme` | 60,227 85×26 | 同宽屏（bg #e1e1e1 · radius 14px） | 👍 / DooTask |
| 回应胶囊（未点过） | 390×844 | `.dialog-emoji li` | 60,-15 85×26 | bg rgba(225,225,225,.5) | 🎉 / DooTask |
| 回应 emoji | 390×844 | `.emoji-symbol` | 68,229 18×22 | fs 14px · mar 0/-1/0/0 | 👍 |
| 回应人名 | 390×844 | `.emoji-users .avatar-name` | 91,233 46×14 | fs 12px · color #818181 | DooTask |
| @ 胶囊 | 390×844 | `.content-text .mention` | 187,716 58×18 | fs 15px · lh 20px · radius 6px | @周海源 |
| 引用块 | 390×844 | `.dialog-reply` | 64,439 266×40 | 同宽屏 | 周海源 / cpu占用高一般都是查询导致 |
| 引用块正文 | 390×844 | `.dialog-reply .reply-desc` | 73,459 257×20 | fs 13px · lh 19.5px |  |
| 系统消息 | 390×844 | `.dialog-notice` | 137,104 115×26 | fs 12px · bg #efefef · radius 8px · pad 4/8 | 贾晰雯 已加入群组 |

**截图**：`r3-wide-msgs.png`/`r3-wide-msgs-loc.png`、`r3-wide-reply.png`、`r3-wide-edited.png`、`r3-wide-sys.png`/`r3-wide-sys-full.png`；窄屏 `r3-narrow-msgs.png`/`r3-narrow-msgs-loc.png`、`r3-narrow-reply.png`、`r3-narrow-edited.png`、`r3-narrow-sys.png`/`r3-narrow-sys-full.png`

**行为**
- 气泡背景与不对称圆角落在 `.dialog-head`：自己 `#84c56a` + `8px 2px 8px 8px`；对方 `#f4f5f7` + `2px 8px 8px`，内边距均 8px，正文层再补 2px。消息最大宽：宽屏 70%，窄屏 `calc(100% - 80px)`。
- 自己消息整行右对齐（头像在最右，x≈1218/346），对方左对齐；头像 30×30 圆形，行间距 16。
- 时间格式：今天 `HH:mm`、昨天 `昨天 HH:mm`、更早 `YYYY-MM-DD`，统一 12px `#bbb`，`title` 属性为完整时间戳。
- 回应胶囊：自己点过与未点过的尺寸/圆角/内距完全一致，区别仅在底色不透明度（`#e1e1e1` vs `rgba(225,225,225,.5)`）；胶囊内显示 emoji（16/14px）+ 点击人昵称（12px `#818181`），多行时名字会聚合。
- @ 胶囊是正文内联元素（radius 6），颜色随气泡正文色，不是独立浮层。
- 引用（回复）块位于气泡内部上方：13px 白色文字（在绿气泡中）、左侧留 9px、与正文间距 4px。
- 系统消息是居中的浅灰圆角条（12px `#909399`，`#efefef` 底，radius 8）。
- **日期分隔**：未找到独立分隔元素；每天第一条消息仅靠自身 `.time`（如 `2025-12-18`）区分 → INCONCLUSIVE（该版本无日期分隔条）。
- 已读回执为 14×14 圆形 SVG，无文字；未读/已读差异体现在 SVG 描边/勾选路径，本次未逐状态取色 → INCONCLUSIVE（仅测得尺寸与位置）。

**未测/INCONCLUSIVE**：无日期分隔元素；已读回执不同状态的颜色未单独取色；系统消息种类仅测到“加入群组”一种。

---

## 3. R4 消息菜单（悬停 / 右键 / 长按）

| 元素 | 视口 | 选择器 | box | 关键样式 | 文字/备注 |
|---|---|---|---|---|---|
| 悬停消息 | 1280×860 | `.dialog-item .dialog-content` | — | 无浮层/浮条（DOM 元素数 5033→5033），光标 auto | 悬停气泡无操作条出现（仅右键/长按触发） |
| 右键菜单（对方） | 1280×860 | `.dialog-wrapper-operate` | 503,303 316×256 | fs 14px · color #606266 · bg #ffffff · radius 4px · pad 5px 0 · shadow rgba(0,0,0,.2) 0 1 6 | 单项 60×52；回复 / 翻译 / 复制 / 选择复制 / 转发 / 多选 / 标注 / 收藏 / 新任务 / 设待办 / 置顶 |
| 菜单表情行（对方） | 1280×860 | `.operate-emoji` | 相对菜单 y+211 h40 | 单项 44×30 · fs 22px | 👌 👍 😂 🎉 ❤️ 🥳️ 🥰 😥 😭 [更多+] |
| 右键菜单（自己） | 1280×860 | `.dialog-wrapper-operate` | 934,102 316×256 | 同上（bg/radius/pad/shadow 均相同） | 回复 / **编辑** / 翻译 / 复制 / 选择复制 / 转发 / 多选 / **撤回** / 标注 / 收藏 / 新任务 / 设待办 / 置顶 |
| 菜单分隔线 | 1280×860 | — | — | 无分隔线（单个 ul 平铺；表情行与操作区靠 40px 行区分） | — |
| 悬停消息 | 390×844 | `.dialog-item .dialog-content` | — | 无浮层/浮条（5037→5037） | 窄屏无 hover 操作条 |
| 长按菜单（对方） | 390×844 | `.dialog-wrapper-operate` | 37,266 316×256 | 同宽屏（bg #fff · radius 4px · pad 5/0 · shadow） | 长按后出现同一菜单；项 60×52；顺序同宽屏 |
| 菜单表情行（对方） | 390×844 | `.operate-emoji` | 相对菜单 y+211 h40 | 单项 44×30 · fs 24px（窄屏字号 +2） | 👌 👍 😂 🎉 ❤️ 🥳️ 🥰 😥 😭 [更多+] |
| 长按菜单（自己） | 390×844 | `.dialog-wrapper-operate` | 37,65 316×256 | 同上 | 顺序同宽屏自己菜单（含编辑/撤回） |

**截图**：`r4-wide-hover.png`、`r4-wide-menu-other.png`、`r4-wide-menu-self.png`；窄屏 `r4-narrow-hover.png`、`r4-narrow-longpress.png`、`r4-narrow-menu-other.png`、`r4-narrow-menu-self.png`

**行为**
- 桌面端**悬停气泡不出现任何操作条**；菜单仅在右键 `.dialog-content` 时弹出。移动端为长按（touchStart ~900ms）同一菜单，位置改为按触点对齐并夹在视口内。
- 菜单固定宽 316，表情行在最上（y+211 为相对位置），下方为 60×52 的操作项网格；**无分隔线**。
- 对方菜单项顺序：回复 / 翻译 / 复制 / 选择复制 / 转发 / 多选 / 标注 / 收藏 / 新任务 / 设待办 / 置顶。
- 自己菜单多两项：在「回复」后插入「编辑」、在「多选」后插入「撤回」；其余项与对方菜单一致（同样包含“回复”）。
- 快捷表情行固定 9 个常用表情 + `[+]` 更多入口；点选即加回应（本次仅观察，未逐一点击）。

**未测/INCONCLUSIVE**：悬停无操作条（本身就是结论）；菜单展开后各子项 hover 态未取色。

---

## 4. R5 输入区

### 4.1 结构与工具栏

| 元素 | 视口 | 选择器 | box | 关键样式 | 文字/备注 |
|---|---|---|---|---|---|
| 输入区容器 | 1280×860 | `.dialog-footer` | 564,798 717×46 | pad 0/24 · mar 0/0/16/0 · pos relative |  |
| 输入框外框 | 1280×860 | `.chat-input-box` | 588,798 669×46 | disp inline-block |  |
| 编辑区容器 | 1280×860 | `.chat-input-wrapper` | 588,798 669×46 | bg #f4f5f7 · radius 10px · pad 8/2 · pos relative |  |
| Quill 容器 | 1280×860 | `.chat-input-wrapper .ql-container` | 590,806 495×30 | fs 13px · lh 19.5px |  |
| 编辑器 | 1280×860 | `.ql-editor` | 602,810 471×22 | fs 14px · lh 22px · color #606266 · mar 4/12 |  |
| 空白点击层 | 1280×860 | `.chat-space` | 1084,806 170×30 | — | 点击聚焦编辑器 |
| 工具条 | 1280×860 | `ul.chat-toolbar` | 1086,806 168×30 | disp flex · pos absolute |  |
| 工具栏第1项（😊） | 1280×860 | `ul.chat-toolbar > li` nth0 | 1086,806 30×30 | — | tooltip「表情」 |
| 工具栏第2项（@） | 1280×860 | nth1 | 1116,806 30×30 | — | tooltip「选择成员」 |
| 工具栏第3项（#） | 1280×860 | nth2 | 1146,806 30×30 | — | tooltip「选择任务」 |
| 工具栏第4项（⊕/展开） | 1280×860 | nth3 | 1176,806 30×30 | — | tooltip「展开」 |
| 工具栏第5项（发送/录音） | 1280×860 | nth4 | 1206,806 48×30 | pos relative | tooltip「长按录音」（空）/「发送」（有字） |
| 发送按钮 | 1280×860 | `.chat-send` | 1206,806 48×30 | pos relative |  |
| 录音浮层 | 1280×860 | `.chat-record` | 588,798 669×46 | bg #ffffff · pos absolute · opacity 0 | 常驻覆盖层，默认不可见 |
| 录音遮罩 | 1280×860 | `.chat-cover` | 0,0 0×0 | disp none |  |
| 占位文字 | 1280×860 | `.ql-editor::before` | — | content "输入消息..." · color #cccccc · fs 14px | data-placeholder 同文案 |
| 发送按钮（空） | 1280×860 | `.chat-send.recorder` | 1206,806 48×30；::before 圆 36×36 bg #84c56a radius 50% inset 15/-12/-21/24 | 图标 20×20 白色 = 麦克风 | 空输入：绿色圆 = 录音（长按） |
| 发送按钮（有字） | 1280×860 | `.chat-send.sender` | 1206,806 48×30；::before 36×36 #84c56a | 图标 = 发送箭头；tooltip「发送」 | 有字时点击即发送 |
| AI 悬浮按钮 | 1280×860 | `.ai-float-button` | 1212,716 44×44 | bg #8bcf70 · radius 50% · shadow · 外层 fixed z2001 | 输入区右上方悬浮 |
| 输入区容器 | 390×844 | `.dialog-footer` | 0,782 390×62 | bg #f8f8f8 · pad 8/10 · pos relative |  |
| 输入框外框 | 390×844 | `.chat-input-box` | 10,790 370×46 | disp inline-block |  |
| 编辑区容器 | 390×844 | `.chat-input-wrapper` | 10,790 370×46 | bg #ffffff · radius 10px · pad 8/2 | 窄屏输入条为白底 |
| Quill 容器 | 390×844 | `.ql-container` | 12,798 196×30 | fs 13px |  |
| 编辑器 | 390×844 | `.ql-editor` | 24,802 172×22 | fs 16px · lh 22px · color #303133 · mar 4/12 | 窄屏正文 16px |
| 工具条 | 390×844 | `ul.chat-toolbar` | 210,798 168×30 | disp flex · pos absolute | 5 项位置与宽屏相同（30×30 ×4 + 48×30） |
| 工具栏第5项 | 390×844 | `ul.chat-toolbar > li` nth4 | 330,798 48×30 | — |  |
| 录音浮层 | 390×844 | `.chat-record` | 10,790 370×46 | bg #f8f8f8 · opacity 0 |  |
| 占位文字 | 390×844 | `.ql-editor::before` | — | content "输入消息..." · color #cccccc · fs 16px |  |
| 发送按钮（空/有字） | 390×844 | `.chat-send.recorder` / `.sender` | 330,798 48×30；::before 36×36 #84c56a | 图标 20×20 白色；wide tooltip 长按录音/发送 | 窄屏有字时 tooltip 实测为空字符串 |
| AI 悬浮按钮 | 390×844 | `.ai-float-button` | 378,587 12×48 | bg #8bcf70 · radius 6/0/0/6 · shadow | 窄屏缩为右侧贴边手柄 |

### 4.2 表情 / ⊕ / @ / # / 回复 / 编辑 / 全屏 / 快捷表情

| 元素 | 视口 | 选择器 | box | 关键样式 | 文字/备注 |
|---|---|---|---|---|---|
| 表情浮层 | 1280×860 | `.chat-input-emoji-popover` | 899,476 376×320 | bg #ffffff · radius 4px · pad 0 · shadow rgba(0,0,0,.2) 0 1 6 | 206 个表情；点外部或再次点 😊 关闭 |
| 表情分类栏 | 1280×860 | `.chat-emoji-nav` | 376×40（8 项 46×40） | 类目 people/nature/food/symbols/activity/travel/objects/flags；激活 `i-people active` |  |
| 表情格子 | 1280×860 | `ul.emoji li` | 40×40 | 每行 9 个 · emoji 22px | 悬停 title 显示名称 |
| 表情面板（窄屏内嵌） | 390×844 | `.chat-input-box.show-emoji .chat-emoji-wrapper` | 0,550 390×294 | bg #ffffff · radius 0 · shadow none · pos relative | 非浮层：输入框展开（box 高 340），整栏内嵌 |
| 表情分类栏（窄屏） | 390×844 | `.chat-emoji-nav` | 390×40 | 同 8 分类 |  |
| 表情格子（窄屏） | 390×844 | `ul.emoji li` | 50×50 | 每行 7 个 · emoji 28px |  |
| ⊕ 菜单 | 1280×860 | `.chat-input-more-popover` | 1133,528 116×268 | bg #ffffff · radius 4px · pad 8 · shadow rgba(0,0,0,.2) 0 1 6 | 7 项、单项 100×36 fs14：新会议 / 发送图片 / 上传文件 / 发起接龙 / 发起投票 / AI 生成 / 全屏输入 |
| ⊕ 菜单（窄屏） | 390×844 | `.chat-input-more-popover` | 257,520 116×268 | 同宽屏（fixed） | 同上 7 项、顺序一致 |
| @ 成员浮层（群） | 1280×860 | `.ql-mention-list-container.user-mention` | 602,490 222×322 | fixed · bg #ffffff · radius 4px · border 1px solid #f0f0f0 · shadow rgba(30,30,30,.08) 0 2 12 | 点 @ 按钮：插入「@」并弹层；@/所有人 44h（选中）→ 群成员 40h → 成员 44h（刘林旺/周海源/DooTask/陆军-666/dev***@hitosea.com，含头像+在线点） |
| @ 过滤（输入“周”） | 1280×860 | 同上 | — | 项 204 宽 | 列表收窄为「群成员」+「周海源」 |
| @ 成员浮层（单聊） | 1280×860 | 同上 | 602,706 222×106 | 同群聊样式 | 无「所有人/群成员」分组，仅 2 名成员：DooTask / 周海源 |
| # 任务浮层 | 1280×860 | `.ql-mention-list-container.task-mention` | 602,450 282×362 | bg #ffffff · radius 4px · border 1px solid #f0f0f0 · shadow 同 @ | 点 # 按钮：插入「#」；标题「我的待完成任务」高 40；127 项，任务 264×40 fs16 |
| @ 成员浮层（窄屏） | 390×844 | `.ql-mention-list-container.user-mention` | 24,482 222×322 | 同宽屏 | 同上 |
| # 任务浮层（窄屏） | 390×844 | `.ql-mention-list-container.task-mention` | 24,442 282×362 | 同宽屏 | 同上 |
| 回复条 | 1280×860 | `.chat-input-wrapper .chat-quote` | 590,761 665×46（容器高 92） | pad 0/48/8/24 · bg 透明；左线 ::after 3×37.5 bg rgba(132,197,106,.7) radius 2 inset 0/649.5/8/12 | 名称「周海源」13px fw500 #84c56a；正文 13px #606266；关闭 48×38（图标 22） |
| 回复条（窄屏） | 390×844 | `.chat-input-wrapper .chat-quote` | 12,753 366×46（容器高 92） | 同宽屏；左线 ::after 3×37.5 inset 0/351/8/12 |  |
| 编辑条 | 1280×860 | `.chat-input-wrapper .chat-quote` | 590,759 665×47（容器高 93） | pad 0/48/8/24；标签「编辑消息」13px #84c56a；正文 13px | 编辑器预填原消息；关闭按钮同回复条 |
| 编辑条（窄屏） | 390×844 | `.chat-input-wrapper .chat-quote` | 12,721 366×47（容器高 123） | 同上 | 预填「QA 提及测试 @周海源 有空看下吗」 |
| 全屏输入 | 1280×860 | `.doo-modal.chat-input-full-input` | 模态 0,0 1280×860；卡片 0,46 1280×814 | 卡片 bg #ffffff · radius 18px 18px 0 0 · shadow rgba(0,0,0,.15) 0 4 12；body pad 24/24/0；编辑器 1218×730；关闭 34×34 白色圆 | 入口 ⊕→全屏输入；底部格式栏 9 项（bold/strike/italic/underline/blockquote/link/有序列表/无序列表/未选中列表）；无发送按钮 |
| 全屏输入（窄屏） | 390×844 | 同上 | 卡片 0,46 390×798 | 编辑器 316×714 fs16 | 同上，无发送按钮 |
| 快捷表情行 | 1280×860 | `.chat-input-quick-emoji` | 0×0 | — | 空容器（未使用表情回复时为 0 项，不显示） |
| 快捷表情行 | 390×844 | `.chat-input-quick-emoji` | 0×0 | — | 同上 |

**截图**：`r5-wide-input-typed.png`、`r5-wide-emoji.png`/`r5-wide-emoji-loc.png`、`r5-wide-more.png`、`r5-wide-mention.png`、`r5-wide-mention-dm.png`、`r5-wide-hash.png`、`r5-wide-replybar.png`、`r5-wide-editbar.png`、`r5-wide-fullscreen.png`；窄屏 `r5-narrow-input-typed.png`、`r5-narrow-emoji.png`/`r5-narrow-emoji-loc.png`、`r5-narrow-more.png`、`r5-narrow-mention.png`、`r5-narrow-hash.png`、`r5-narrow-replybar.png`、`r5-narrow-editbar.png`、`r5-narrow-fullscreen.png`

**行为**
- 工具条 5 个入口顺序固定：表情 / 选择成员(@) / 选择任务(#) / 展开(⊕) / 发送（空输入时为长按录音）。
- 发送按钮两种状态共用绿圆（36px，`:before`）：空输入为麦克风+「长按录音」，有字切换发送箭头+「发送」，点击立即发送；窄屏有字时 tooltip 为空。
- 表情面板：宽屏是右下浮层 376×320（点外部/再点 😊 关闭）；窄屏没有浮层，改为输入框内联展开，占 550–844，格子 50×50、每行 7 个、emoji 28px。
- ⊕ 菜单 7 项顺序：新会议 / 发送图片 / 上传文件 / 发起接龙 / 发起投票 / AI 生成 / 全屏输入；宽窄同构（窄屏浮层 x 随视口调整）。
- @：点按钮立即插入「@」并弹出成员列表（无需再键入 @）；群里首行「@/所有人」+「群成员」分组，下面是成员（头像+在线点）；输入“周”会过滤为「群成员」+「周海源」；单聊没有分组，仅列两名成员。
- #：插入「#」并弹出任务列表，标题「我的待完成任务」，任务项 40 高、16px。
- 回复：从消息菜单点「回复」后，输入框上方出现引用条（名称绿、正文灰、左侧绿竖线、右侧关闭按钮），并在编辑器里自动插入「@发送者」；关闭按钮移除引用条。
- 编辑：引用条变为「编辑消息」标签，编辑器预填原消息；保存后消息行尾出现编辑标记（见 R3）。
- 全屏输入：⊕→全屏输入，卡片从 y46 铺到页面底部（圆角仅上方 18），顶部右角 34×34 圆形关闭；底部只有格式菜单（9 项），**没有发送按钮**，需退出全屏后发送。
- 快捷表情行 `.chat-input-quick-emoji` 在当前数据下为空容器（0×0），未观察到胶囊。

**未测/INCONCLUSIVE**：`快捷表情行` 未出现内容（空容器）；窄屏全屏输入底部格式栏仅按项读取，未逐项取尺寸；表情搜索框/最近使用区（底部条）未逐项量化。

---

## 5. R6 多选与转发

### 5.1 多选态（勾选框 / 底部操作条）

| 元素 | 视口 | 选择器 | box | 关键样式 | 文字/备注 |
|---|---|---|---|---|---|
| 勾选框（他人消息，未选） | 1280×860 | `.dialog-item.multi-select-mode:not(.self) .dialog-multi-check` | 596,-3986 28×28 | mar 1/4/0/0 · disp flex | 位于气泡左侧（x=596，头像列）；该行在视口外，x/w 有效 |
| 勾选框图标（未选） | 1280×860 | 同上 `i.doo-icon` | 599,-3983 22×22 | fs 22px · color #c5c5c5 | 灰色圆圈 |
| 勾选框（自己消息） | 1280×860 | `.dialog-item.multi-select-mode.self .dialog-multi-check` | 1216,346 28×28 | 同尺寸 | 自己消息勾选框在右侧（x=1216） |
| 已选消息行 | 1280×860 | `.dialog-item.multi-selected` | 596,208 653×137 | pad 0/0/16/0 · disp flex | 进入多选时被右键的那条自动选中 |
| 勾选框图标（已选） | 1280×860 | `.dialog-item.multi-selected .dialog-multi-check i.doo-icon` | 599,212 22×22 | fs 22px · color #84c56a | 选中变绿 |
| 顶部标题栏（多选前后） | 1280×860 | `.dialog-nav` | 564,0 717×68 | 同 R2 | 未观察到变化（仍显示 运维部/(5)/部门/分类） |
| 输入区（多选时） | 1280×860 | `.dialog-footer` | — | display: none | 多选时输入区整体隐藏，消息区下延到 808 |
| 底部操作条 | 1280×860 | `.dialog-multi-select-bar` | 564,808 717×52 | bg #f4f5f7 · pad 0/24 · border 1px solid #f4f5f5 · disp flex | 已选1条 / 转发 / 取消 |
| 选中计数 | 1280×860 | `.dialog-multi-select-bar .multi-select-info` | 588,824 50×21 | fs 14px · color #515a6e | 已选1条 |
| 按钮组 | 1280×860 | `.multi-select-actions` | 1152,821 104×28 | gap 8px · disp flex | 转发 / 取消 |
| 转发按钮 | 1280×860 | `.dialog-multi-select-bar .ivu-btn-primary` | 1152,821 48×28 | fs 14px · color #ffffff · bg #8bcf70 · radius 3px · pad 0/9 · border 1px solid #8bcf70 | 转发 |
| 取消按钮 | 1280×860 | `.dialog-multi-select-bar .ivu-btn-default` | 1208,821 48×28 | fs 14px · color #606266 · bg #ffffff · radius 3px · pad 0/9 · border 1px solid #dcdee2 | 取消 |
| 勾选框（他人消息，未选） | 390×844 | `.dialog-item.multi-select-mode:not(.self) .dialog-multi-check` | 14,-4302 28×28 | 同宽屏 | 左侧 x=14 |
| 勾选框图标（未选） | 390×844 | 同上 `i.doo-icon` | 17,-4299 22×22 | color #c5c5c5 |  |
| 勾选框（自己消息） | 390×844 | `.dialog-item.multi-select-mode.self .dialog-multi-check` | 344,309 28×28 | 同宽屏 | 右侧 x=344 |
| 已选消息行 | 390×844 | `.dialog-item.multi-selected` | 14,171 362×137 | pad 0/0/16/0 | 进入多选时同样自动选中 |
| 勾选框图标（已选） | 390×844 | `.dialog-item.multi-selected .dialog-multi-check i.doo-icon` | 17,175 22×22 | color #84c56a |  |
| 顶部标题栏（多选前后） | 390×844 | `.dialog-nav` | 0,0 390×86 | 同 R2 | 未观察到变化 |
| 底部操作条 | 390×844 | `.dialog-multi-select-bar` | 0,792 390×52 | bg #f4f5f7 · pad 0/24 · border 1px solid #f4f5f5 | 已选1条 / 转发 / 取消 |
| 选中计数 | 390×844 | `.multi-select-info` | 24,808 50×21 | fs 14px · color #515a6e | 已选1条 |
| 按钮组 | 390×844 | `.multi-select-actions` | 262,805 104×28 | gap 8px | 转发 / 取消 |
| 转发按钮 | 390×844 | `.ivu-btn-primary` | 262,805 48×28 | bg #8bcf70 · radius 3px | 转发 |
| 取消按钮 | 390×844 | `.ivu-btn-default` | 318,805 48×28 | bg #ffffff · border #dcdee2 · radius 3px | 取消 |

### 5.2 转发弹窗（两步）

**宽屏 第一步**（`.common-user-select-modal` → `.usp.is-whole`，卡片 860×620）

| 元素 | 视口 | 选择器 | box | 关键样式 | 文字/备注 |
|---|---|---|---|---|---|
| 遮罩 | 1280×860 | `.common-user-select-modal` | 0,0 1280×860 | pad 24/16 · disp flex · pos fixed |  |
| 卡片 | 1280×860 | `.common-user-select-modal .doo-modal-card` | 210,120 860×620 | bg #ffffff · radius 18px · shadow rgba(0,0,0,.15) 0 4 12 |  |
| 内容容器 | 1280×860 | `.usp.is-whole` | 210,120 860×620 | disp flex · color #16181d |  |
| 顶部栏 | 1280×860 | `.usp-top` | 210,120 860×64 | pad 0/16/0/22 · gap 12px · disp flex | 转发 |
| 顶部-标题 | 1280×860 | `.usp-title` | 232,142 30×21 | fs 15px · fw 600 · color #16181d | 转发 |
| 顶部-搜索框 | 1280×860 | `.usp-search` | 274,132 736×40 | radius 12px · pad 0/14 · gap 10px | placeholder「搜索成员、群组、部门或项目」 |
| 顶部-搜索输入 | 1280×860 | `.usp-search input` | 315,144 681×17 | fs 15px |  |
| 顶部-关闭 | 1280×860 | `.usp-close` | 1022,136 32×32 | fs 18px · color #8b9099 · radius 9px |  |
| 主体区 | 1280×860 | `.usp-main` | 210,184 860×488 | pad 0/12 · gap 8px · disp flex |  |
| 左列 | 1280×860 | `.usp-side` | 222,184 200×488 | bg #f7f7f8 · radius 14px · pad 6 | 最近会话 / 全部成员(62) / 部门树 / 项目 |
| 左列-当前入口 | 1280×860 | `.usp-side .usp-nav` nth0 | 228,190 188×32 | fs 14px · fw 600 · bg #ffffff · radius 8px · pad 0/10 · gap 9px · shadow rgba(15,20,30,.06) 0 1 2 | 最近会话（选中） |
| 左列-全部成员 | 1280×860 | `.usp-side .usp-nav` nth1 | 228,222 188×32 | fs 14px · color #5b616b · radius 8px · pad 0/10 · gap 9px | 全部成员 / 62 |
| 左列-分组标题 | 1280×860 | `.usp-side-title` | 228,254 188×34 | fs 11px · fw 600 · color #8b9099 · pad 14/10/4/10 | 部门（项目分组同构） |
| 左列-部门色点 | 1280×860 | `.usp-nav-dot` | 243,300 8×8 | bg #7ba7d9 · radius 3px · mar 0/5 | 各部门不同色（#7ba7d9/#8fc1a9/#d9a27b/#b49ad6/#d98f9f…） |
| 左列-计数 | 1280×860 | `.usp-nav-count` | 400,298 6×12 | fs 11px · color #b9bdc4 | 7 |
| 中列 | 1280×860 | `.usp-center` | 430,184 420×488 | disp flex · pos relative | 列表行：DooTask / 全体成员 31人 / 【产品交付】通知群 6人 / 事业部 7人… |
| 中列-列头 | 1280×860 | `.usp-ch` | 430,184 420×46 | pad 0/8/0/12 · gap 8px | 最近会话 |
| 中列-列表行 | 1280×860 | `.usp-center .usp-row` | 430,230 420×52 | radius 10px · pad 0/12 · gap 12px | DooTask / （管理员邮箱） |
| 中列-行头像 | 1280×860 | `.usp-row .el-avatar` | 442,239 34×34 | bg #c0c4cc · radius 50% |  |
| 中列-行主名 | 1280×860 | `.usp-row .usp-nm` | 488,240 318×17 | fs 14px · fw 500 · color #16181d |  |
| 中列-行副名 | 1280×860 | `.usp-row .usp-ds` | 488,258 318×14 | fs 12px · color #8b9099 · mar 1/0/0/0 | 邮箱/人数 |
| 右列 | 1280×860 | `.usp-right` | 858,184 200×488 | bg #f7f7f8 · radius 14px · pad 0/6 | 已选 0 / 50 |
| 右列-计数栏 | 1280×860 | `.usp-rh` | 864,184 188×42 | pad 14/10/0/10 · gap 6px | 已选 / 0 / 50 |
| 右列-进度条 | 1280×860 | `.usp-meter` | 874,226 168×3 | bg #f1f2f4 · radius 2px · mar 0/10/6/10 |  |
| 右列-已选列表 | 1280×860 | `.usp-rl` | 864,235 188×437 | pad 0/0/8/0 | 空态：「勾选的成员会出现在这里」 |
| 底部栏 | 1280×860 | `.usp-foot` | 210,672 860×68 | fs 11px · color #8b9099 · pad 0/14/0/22 · gap 16px | ↑↓移动 / ↵选择 / ⌫移除最后一位 / 取消 / 确定 |
| 快捷键提示 | 1280×860 | `.usp-key` | 232,697 78×18 | fs 11px · color #8b9099 · gap 5px | ↑ / ↓ / 移动 |
| 按钮组 | 1280×860 | `.usp-acts` | 872,688 184×36 | gap 8px | 取消 / 确定 |
| 取消按钮 | 1280×860 | `.usp-acts .doo-button.is-default` | 872,688 88×36 | fs 14px · fw 500 · color #1f2329 · bg #e9eaee · radius 10px · pad 0/18 | 取消 |
| 确定按钮（0 选） | 1280×860 | `.usp-acts .doo-button.is-primary` | 968,688 88×36 | bg #84c56a · radius 10px · opacity 0.4（禁用） | 确定 |
| 右列-计数（选1） | 1280×860 | `.usp-rh` | 864,184 188×42 | 同上 | 已选 / 1 / 50 / 清空（新增“清空”） |
| 右列-已选条目 | 1280×860 | `.usp-pr` | 864,235 188×38 | radius 8px · pad 0/8/0/10 · gap 10px | DooTask |
| 右列-条目头像 | 1280×860 | `.usp-pr .el-avatar` | 874,240 28×28 | radius 50% |  |
| 右列-移除按钮 | 1280×860 | `.usp-pr-rm` | 1022,243 22×22 | fs 13px · color #8b9099 · radius 6px · opacity 0（悬停显示） |  |
| 中列-选中行 | 1280×860 | `.usp-row.sel`（选中后） | 430,230 420×52 | bg #84c56a /0.14 · radius 10px |  |
| 中列-勾选图标 | 1280×860 | `.usp-tick.on` | 818,246 20×20 | bg #84c56a · radius 50% · color #ffffff | 选中行右侧对勾 |

**宽屏 第二步**（`.forwarder-message-modal`，卡片 420×357）

| 元素 | 视口 | 选择器 | box | 关键样式 | 文字/备注 |
|---|---|---|---|---|---|
| 二次确认弹窗 | 1280×860 | `.forwarder-message-modal` | 0,0 1280×860 | pad 24/16 · disp flex · pos fixed | 确认转发 / DooTask / 逐条转发 / 合并转发 / 预览 / 不显示原发送者信息 / 确定(1) |
| 二次确认卡片 | 1280×860 | `.forwarder-message-modal .doo-modal-card` | 430,252 420×357 | bg #ffffff · radius 18px · shadow rgba(0,0,0,.15) 0 4 12 |  |
| 标题 | 1280×860 | `.doo-modal-title` | 454,274 372×20 | fs 18px · fw 500 · color #303133 · pad 0/24/0/0 | 确认转发 |
| 收件人列表 | 1280×860 | `.search-selected` | 454,312 92×32 | — | DooTask（头像 32×32 圆形） |
| 收件人头像 | 1280×860 | `.search-selected li .el-avatar` | 454,312 32×32 | radius 50% |  |
| 转发方式 | 1280×860 | `.forward-mode-select` | 454,360 372×33 | pad 0/0/12/0 | 逐条转发（默认选中）/ 合并转发 |
| 方式-逐条 | 1280×860 | `.forward-mode-select .ivu-radio-wrapper` nth0 | 454,360 74×21 | fs 14px · mar 0/8 | 逐条转发 |
| 方式-合并 | 1280×860 | 同上 nth1 | 540,360 74×21 | 同左 | 合并转发 |
| 消息预览区 | 1280×860 | `.dialog-wrapper.inde-list` | 454,393 372×56 | bg #ffffff |  |
| 预览消息 | 1280×860 | `.dialog-item.reply-item` | 454,393 372×56 | pad 0/0/16/0 | cpu占用高一般都是查询导致 |
| 预览消息内容 | 1280×860 | `.dialog-item .dialog-content` | 462,401 356×24 | fs 14px · color #606266 |  |
| 选项列表 | 1280×860 | `.radio-group` | 454,449 372×38 | disp flex | 不显示原发送者信息 |
| 选项-不显示原发送者 | 1280×860 | `.radio-group li` | 454,449 372×22 | fs 14px · lh 22px · mar 0/0/16/0 | 不显示原发送者信息（默认未勾选） |
| 选项图标 | 1280×860 | `.radio-group .radio-icon` | 454,449 22×22 | fs 22px · color #909399 /0.7 |  |
| 留言框 | 1280×860 | `.leave-message textarea` | 454,487 372×40 | fs 14px · lh 22px · bg #f4f5f7 · radius 8px · pad 9/12 | placeholder「留言」，最多 84px 高 |
| 底部按钮 | 1280×860 | `.doo-modal-footer .doo-button` | 738,551 88×36 | fs 14px · fw 500 · color #ffffff · bg #84c56a · radius 10px · pad 0/18 | 确定 (1) |

**窄屏 第一步**（`.usp.is-mobile.is-whole` 全屏）

| 元素 | 视口 | 选择器 | box | 关键样式 | 文字/备注 |
|---|---|---|---|---|---|
| 全屏容器 | 390×844 | `.common-user-select-modal .usp.is-mobile.is-whole` | 0,0 390×844 | disp flex · color #16181d | 单列布局，无左右分栏 |
| 顶部栏 | 390×844 | `.usp-bar` | 0,0 390×50 | pad 0/8 · disp flex · pos relative | 取消 / 转发 |
| 顶部-取消 | 390×844 | `.usp-bar-btn` | 8,5 48×40 | fs 16px · color #5b616b · radius 20px · pad 0/8 | 取消 |
| 顶部-标题 | 390×844 | `.usp-bar-title` | 100,13 190×24 | fs 17px · fw 600 · color #16181d · pos absolute | 转发（居中） |
| 搜索框 | 390×844 | `.usp-search` | 16,52 358×38 | bg #f1f2f4 · radius 12px · pad 0/12 · mar 2/16/8/16 | placeholder「搜索成员、群组、部门或项目」 |
| 搜索输入 | 390×844 | `.usp-search input` | 53,62 309×18 | fs 16px |  |
| 主体区 | 390×844 | `.usp-main` | 0,98 390×682 | gap 8px · disp flex |  |
| 入口行（全部成员） | 390×844 | `.usp-entry` | 20,106 350×50 | fs 14px · radius 10px · pad 0/10/0/12 · gap 12px | 全部成员 / 62 |
| 入口图标 | 390×844 | `.usp-entry-icon` | 32,116 30×30 | bg #7ba7d9 · radius 9px · color #ffffff |  |
| 入口计数 | 390×844 | `.usp-entry-count` | 318,124 14×15 | fs 13px · color #8b9099 | 62 |
| 分组标题 | 390×844 | `.usp-grp` | 0,266 390×38 | fs 13px · fw 600 · color #8b9099 · bg #ffffff · pad 14/20/6 · pos sticky | 最近会话 |
| 列表行 | 390×844 | `.usp-center .usp-row` | 0,304 390×60 | pad 0/20 · gap 12px | DooTask / （管理员邮箱） |
| 行头像 | 390×844 | `.usp-row .el-avatar` | 20,314 40×40 | radius 50% · bg #c0c4cc | 窄屏 40px |
| 行主名 | 390×844 | `.usp-row .usp-nm` | 72,317 264×18 | fs 16px · color #16181d |  |
| 行副名 | 390×844 | `.usp-row .usp-ds` | 72,336 264×15 | fs 13px · color #8b9099 |  |
| 底部栏 | 390×844 | `.usp-foot` | 0,780 390×64 | pad 10/12 · gap 10px | 最多可选50项 / 确定 |
| 底部已选摘要 | 390×844 | `.usp-stack` | 12,790 252×44 | radius 14px · pad 0/10/0/8 · gap 10px · color #b9bdc4 | 空态：「最多可选50项」 |
| 底部确定（0 选） | 390×844 | `.usp-acts .usp-btn` | 274,790 104×44 | fs 16px · fw 600 · color #b9bdc4 · bg #f1f2f4 · radius 14px · pad 0/20 | 确定（`.off` 禁用态） |
| 选中行 | 390×844 | `.usp-row.sel` | 0,304 390×60 | bg #84c56a /0.14 |  |
| 选中行勾选 | 390×844 | `.usp-row.sel .usp-tick.on` | 348,323 22×22 | bg #84c56a · radius 50% · color #ffffff |  |
| 已选摘要（选1） | 390×844 | `.usp-stack` | 12,790 252×44 | color #5b616b | 已选 1 / 50（头像堆叠 28px） |
| 已选文字（选1） | 390×844 | `.usp-stack-text` | 58,802 68×20 | fs 14px · color #5b616b | 已选 1 / 50 |
| 底部确定（选1） | 390×844 | `.usp-acts .usp-btn` | 274,790 104×44 | bg #84c56a · color #ffffff · fs 16px · fw 600 · radius 14px | 确定 |

**窄屏 第二步**（`.forwarder-message-modal.is-narrow`）

| 元素 | 视口 | 选择器 | box | 关键样式 | 文字/备注 |
|---|---|---|---|---|---|
| 弹窗 | 390×844 | `.forwarder-message-modal` | 0,0 390×844 | pad 24/10 · disp flex · pos fixed |  |
| 卡片 | 390×844 | `.forwarder-message-modal .doo-modal-card` | 10,238 370×369 | bg #ffffff · radius 18px · shadow rgba(0,0,0,.15) 0 4 12 |  |
| 标题 | 390×844 | `.doo-modal-title` | 34,260 322×20 | fs 18px · fw 500 · color #303133 · pad 0/24/0/0 | 确认转发 |
| 收件人条目 | 390×844 | `.search-selected li` | 32,298 326×32 | 同宽屏 | DooTask |
| 收件人头像 | 390×844 | `.search-selected li .el-avatar` | 32,298 32×32 | radius 50% |  |
| 转发方式 | 390×844 | `.forward-mode-select` | 34,346 322×33 | 同宽屏 | 逐条转发（默认）/ 合并转发 |
| 消息预览区 | 390×844 | `.dialog-wrapper.inde-list` | 34,379 322×56 | 同宽屏 |  |
| 预览消息内容 | 390×844 | `.dialog-item .dialog-content` | 42,387 306×24 | fs 14px · color #606266 | cpu占用高一般都是查询导致 |
| 选项-不显示原发送者 | 390×844 | `.radio-group li` | 34,435 322×22 | fs 14px · lh 22px | 不显示原发送者信息 |
| 选项图标 | 390×844 | `.radio-icon` | 34,435 22×22 | color #909399 /0.7 |  |
| 留言框 | 390×844 | `.leave-message textarea` | 34,473 322×40 | bg #f4f5f7 · radius 8px · pad 9/12 | placeholder「留言」 |
| 底部按钮 | 390×844 | `.doo-modal-footer .doo-button` | 32,537 326×48 | fs 16px · fw 600 · color #ffffff · bg #84c56a · radius 24px · pad 0/16 | 确定 (1) |

**截图**：`r6-wide-multi.png`、`r6-wide-forward.png`、`r6-wide-forward-selected.png`、`r6-wide-forward2.png`；窄屏 `r6-narrow-multi.png`、`r6-narrow-forward.png`、`r6-narrow-forward-selected.png`、`r6-narrow-forward2.png`

**行为**
- 进入多选：桌面右键消息 → 菜单「多选」；移动端长按消息 → 同一菜单 →「多选」。进入时**自动勾选**触发菜单的那条消息（计数显示“已选1条”）。
- 多选态：每行最左侧出现 28×28 勾选框（自己消息在右侧），未选图标 22×22 灰色 `#c5c5c5`，选中变绿 `#84c56a`；选中行 `multi-selected`；输入区 `.dialog-footer` 隐藏（display:none），消息区下延，底部出现 52 高操作条 `#f4f5f7`（左“已选N条”，右“转发 / 取消”两个 48×28 小按钮）。
- 顶部 `.dialog-nav` 无变化（无“全选/退出多选”入口，退出靠底部“取消”）。
- 点“转发”进入收件人选择：
  - 宽屏：860×620 卡片；三段式——左列 200（最近会话/全部成员/部门树/项目，行高 32，色点 8×8），中列 420（行高 52、头像 34、主名 14/副名 12），右列 200（“已选 n / 50”、进度条、已选成员 38 高、悬浮出现 22×22 移除按钮）；底部快捷键提示 + 取消/确定（确定在 0 选时 40% 透明禁用）。
  - 窄屏：整页全屏单列；“取消/转发”顶栏 50 高，搜索框 358×38，入口行（全部成员/按部门/按项目）50 高，最近会话列表行 60 高（头像 40、主名 16）；底部 64 高显示“已选 n / 50”与 44 高圆角“确定”按钮（0 选时灰底禁用）。
- 选中一名收件人后：宽屏右列出现该成员条目（28 头像，悬停显示移除），计数“已选 1 / 50”并出现“清空”；窄屏底部摘要变“已选 1 / 50”，确定按钮变绿可用。
- 点“确定”进入**二次确认**（同一层叠 z1011/1012）：
  - 宽屏 420×357 卡片，标题“确认转发”；顶部收件人头像条（32 圆）；“逐条转发（默认）/合并转发”单选；消息预览（原消息气泡，56 高）；“不显示原发送者信息”复选项（22 图标，默认未勾选）；留言框（placeholder“留言”，40 高，可长到 84）；底部单个绿色“确定 (1)”按钮（括号内为收件人数）。
  - 窄屏 370×369 卡片（同样结构，确定按钮 48 高、radius 24）。
- 本次只走到二次确认页即**关闭取消**（未实际转发、未选“不显示原发送者”、未填留言），多选也以“取消”退出；核实会话最后一条仍为原消息，转发弹窗与多选条均已关闭（CLEANUP 计数全 0）。

**未测/INCONCLUSIVE**：转发目标的搜索结果页/部门树展开后的行样式未逐项量化（仅首屏）；“逐条转发/合并转发”切换后的预览差异未测（未真正发送）；转发成功后的消息样式不在本次范围。

---

## 6. 快捷消息（机器人会话）

| 元素 | 视口 | 选择器 | box | 关键样式 | 文字/备注 |
|---|---|---|---|---|---|
| 机器人快捷菜单（Doo AI） | 1280×860 | `.chat-bottom-menu` | 588,756 669×42 | pad 8/0 · disp flex | Doubao-Seed-2.1-pro / 开启新会话 / 历史会话 |
| 快捷菜单列表 | 1280×860 | `.chat-bottom-menu ul` | 588,764 669×26 | disp flex |  |
| 快捷菜单条目 | 1280×860 | `.chat-bottom-menu li` | 588,764 153×26 | fs 13px · lh 26px · color #606266 · bg #f0f1f3 · radius 13px · pad 0/12 · mar 0/8/0/0 | 胶囊形；文字层 `.bottom-menu-desc` 600,764 129×26 |
| 条目2/3 | 1280×860 | `.bottom-menu-desc` nth1/2 | 760,764 65×26 / 857,764 52×26 | 同左 | 开启新会话 / 历史会话 |
| 悬停态 | 1280×860 | `.chat-bottom-menu li` hover | 748,764 89×26（以条目2 为例） | 颜色/底色无变化（#606266 / #f0f1f3） | 实测无 hover 高亮 |
| 输入区 | 1280×860 | `.dialog-footer .chat-input-box` | 588,798 669×46 | 同 R5 | 快捷菜单紧贴输入框上方 |
| 快捷菜单（Doo AI） | 390×844 | `.chat-bottom-menu` | 10,756 370×34 | pad 0/0/8/0 | 同样 3 项；条目底色为白色（#ffffff，区别宽屏 #f0f1f3） |
| 快捷菜单条目 | 390×844 | `.chat-bottom-menu li` | 10,756 144×26 | fs 13px · lh 26px · radius 13px · pad 0/12 |  |
| 条目2/3 | 390×844 | `.bottom-menu-desc` nth1/2 | 174,756 65×26 / 271,756 52×26 | 同左 | 开启新会话 / 历史会话 |
| 输入区 | 390×844 | `.dialog-footer .chat-input-box` | 10,790 370×46 | 同 R5 |  |

其他机器人会话实测（仅记录条目文字，样式同上）：

| 会话 | 菜单条目 | 说明 |
|---|---|---|
| 机器人管理 6331 | 帮助指令 / API接口文档 / 我的机器人 | 点击「帮助指令」会**直接发送 /help 命令**给机器人（编辑器不变、消息区出现机器人命令列表回复），本次已在测试服触发一次 |
| 会议通知 11827 | 新会议 / 加入会议 | 无该会话时“快捷菜单”不显示（任务提醒 6449 无 `.chat-bottom-menu`） |
| DeepSeek AI 25266 | DeepSeek V4 Pro / 开启新会话 / 历史会话 | 与 Doo AI 同构 |

**截图**：`r6-wide-quick.png`、`r6-wide-quick-hover.png`、`dbg-wide-quick-click.png`；窄屏 `r6-narrow-quick.png`

**行为**
- 旧版机器人会话输入框上方没有“气泡式快捷消息”，而是一条胶囊菜单 `.chat-bottom-menu`：每个条目 26 高、radius 13、13px 文字、右间距 8；宽屏底 `#f0f1f3`、窄屏白底（在 #f8f8f8 输入条上）。
- 条目内容随机器人配置变化（模型名/开启新会话/历史会话；帮助指令/API接口文档/我的机器人；新会议/加入会议）；任务提醒类机器人无此菜单。
- 点击条目会**立即执行对应动作**：如“帮助指令”直接向机器人发送 `/help` 并收到命令列表回复（不是填入输入框）；模型名条目为模型切换入口；“开启新会话/历史会话”为会话操作。
- 悬停无视觉反馈（宽屏实测颜色不变）。

**未测/INCONCLUSIVE**：模型切换弹层、历史会话弹层未展开测量；`API接口文档`为外链未点击。

---

## 附：全部 INCONCLUSIVE 汇总

1. R2：5805 无 `.type-count`（会话无待办）；窄屏群头像 `display:none`（0×0）。
2. R2：机器人/单聊在线状态 `.title-desc li` 实测 0×0，不占位，无法给出可视样式。
3. R2 待办页：无独立待办卡片容器（仅消息行尾 13×13 待办标记）。
4. R3：**无日期分隔条**（仅每条消息的时间文字区分日期）。
5. R3：已读回执不同状态（已读/未读）的描边颜色未逐状态取色，仅测得 14×14 尺寸位置。
6. R3：系统消息仅测到“加入群组”一种。
7. R4：悬停本身无操作条（结论）；菜单项 hover 态未取色。
8. R5：快捷表情行 `.chat-input-quick-emoji` 为空容器（0×0）；全屏格式栏/表情底部搜索区未逐项量化。
9. R6：转发第一步的搜索、部门树展开、项目页未逐项展开量化；转发方式切换后的预览差异未测（未真正发送）。
10. R6：未选中态他人消息勾选框在视口外（y 为负），x/w 有效。

---

## 附：测量脚本与数据

- 脚本：`r2.mjs`、`r2-extra.mjs`、`r2-extra2.mjs`、`r2-tabactive.mjs`、`r3-bubble.mjs`、`r3-chain.mjs`、`r3-extra.mjs`、`r4.mjs`、`r5.mjs`、`r6.mjs`、`quick.mjs`（均使用 `browser.mjs` 的 `launch()` 与 `lib.mjs`）
- 数据：`r2-wide.json`、`r2-narrow.json`、`r3-wide.json`、`r3-narrow.json`、`r4-wide-*.json`、`r4-narrow-*.json`、`r5-wide.json`、`r5-narrow.json`、`r6-wide.json`、`r6-narrow.json`、`quick-wide.json`、`quick-narrow.json`
- 过程日志：`r2-extra.log`、`r2-todo.log`、`r3-chain.log`、`r3-chain-narrow.log`、`r5-wide.log`、`r5-narrow.log`、`r6-wide.log`、`r6-narrow.log`、`quick-recon*.log`
