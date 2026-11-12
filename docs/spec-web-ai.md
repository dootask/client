# 旧版 Web AI 会话规格（spec-ai）

- 站点：`测试服`（旧版前端，Vue 2 + iView/Element UI + Quill），AI 相关路由均在消息页 `/manage/messenger` 内
- 登录态：`~/qa/state-old-admin.json`（admin，未重新登录）
- 视口：宽 1280×860；窄 390×844（`isMobile + hasTouch`，按该视口加载）
- 方法：DOM + `getComputedStyle` 逐部件测量；真实点击/悬停/tap；AI 后端当前对所有模型返回 `503 Service temporarily unavailable`，实时「思考→流式输出」只能测到等待/失败态，成功回复的 DOM 取自站内历史会话
- box 约定：`(x, y) w×h`，为**视口绝对坐标**，单位 px；宽视口消息列起点 x=563.5，窄视口 x=0
- 样式缩写：fs=font-size，fw=font-weight，lh=line-height，m=margin，p=padding，bd=border，r=border-radius，bg=background-color，op=opacity，sh=box-shadow
- 颜色统一 hex；`〃` 表示同部件另一视口
- 产物目录：`n78-spec/shots/`（截图）、`n78-spec/measure/`（原始 log/json）、`n78-spec/scripts/`（可复跑脚本）

## 0. AI 入口总览（三条，互相独立）

1. **全局浮动 AI 助手面板**：任意页面右下角绿色圆形按钮 `.ai-float-button-wrapper .ai-float-button`，点开为固定定位的 `.ai-assistant-chat` 面板（宽 460×600，可拖动，标题栏 cursor: move）。
2. **消息页内联 AI 会话**：消息列表里名为「Doo AI」的会话（头像 title=Doo AI），点开即普通聊天界面，但输入区上方多一行 AI 工具条（模型名 / 开启新会话 / 历史会话），回复走 AI 助手同款过程组件。
3. **普通会话的「AI 生成」**：任意会话输入框右侧「＋」→「AI 生成」，弹出「AI 消息助手」生成弹窗，生成结果点「应用此内容」写回输入框（不自动发送）。

窄视口三条入口均可用；入口 1 为浮动按钮，入口 2/3 在消息页内。

## 1. 进入 AI 助手会话

### 1.1 浮动面板（入口 1）

- 宽：右下角浮动按钮 → 面板 `.ai-assistant-chat`（796,236）460×600，fixed，bg #fff，r 16，sh rgba(0,0,0,.12) 0 10px 30px 0；标题栏 `.ai-assistant-header` 362×38，m 6px 82px 6px 16px，cursor move（可拖动）。
- 窄：按钮先展开再点开；面板变为 `.ai-assistant-chat.is-fullscreen.is-mobile-fullscreen`，390×798，位于移动页头下方（y=46），r 18 18 0 0，bg #fff；遮罩 390×844 bg rgba(55,55,55,.6)，遮罩 z-index 2006、面板 z-index 2007。浮动按钮收起态 12×48，位于 (378,587)，bg #8bcf70，r 6px 0 0 6px；第一次点按展开成圆形，第二次点按打开面板。
- 面板结构：标题栏（图标 + 标题 + 新建会话/历史会话 + 关闭）→ 内容区（会话列表或欢迎页）→ 输入区（上下文标签 / 文本框 / 模型选择 / 上传图片 / 发送）。

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 浮动按钮 | 宽 | `.ai-float-button-wrapper .ai-float-button` | 右下角 | bg #8bcf70，圆形 | 未单独量 box（未确认） |
| 浮动按钮（收起） | 窄 | 同上 | (378,587) 12×48 | bg #8bcf70; r 6px 0 0 6px | 点一次展开为圆形，点二次打开 |
| 面板 | 宽 | `.ai-assistant-chat` | (796,236) 460×600 | bg #ffffff; r 16px; sh rgba(0,0,0,.12) 0px 10px 30px 0px; position fixed | display flex |
| 〃 | 窄 | `.ai-assistant-chat.is-fullscreen.is-mobile-fullscreen` | (0,46) 390×798 | bg #ffffff; r 18px 18px 0 0; position fixed | 遮罩另有 z 2006 |
| 标题栏 | 宽 | `.ai-assistant-header` | (812,242) 362×38 | m 6px 82px 6px 16px; cursor move; display flex; align center |  |
| 〃 | 窄 | 〃 | (16,54) 322×38 | m 8px 52px 8px 16px |  |
| 标题图标（星芒） | 宽/窄 | `.ai-assistant-header-title .doo-icon` | 18×18 | color #303133 | 窄 (16,64) |
| 标题「AI 助手」 | 宽 | `.ai-assistant-header-title` | (838,248.3) 296×25.5 | fs 17px; fw 500; lh 25.5px; color #303133 | 窄 (42,60.3) 214×25.5 |
| 新建会话 | 宽 | `.ai-assistant-header-btn[title="新建会话"]` | (1112,247) 28×28 | color #606266; br 6px; cursor pointer | 图标按钮 |
| 〃 | 窄 | 〃 | (268,57) 32×32 | br 6px; display flex; center |  |
| 历史会话 | 宽 | `.ai-assistant-header-btn[title="历史会话"]` | (1146,247) 28×28 | 同上 | 点击弹历史下拉 |
| 〃 | 窄 | 〃 | (306,57) 32×32 | 同上 |  |
| 关闭 | 宽 | `.ai-assistant-close` | (1208,242) 38×38 | fs 38px; color #999999; br 50%; cursor pointer |  |
| 〃 | 窄 | 〃 | 右上角 38×38 | 同上 | 截图 `shots/ai-header-narrow.png` |

### 1.2 欢迎页（新会话/空历史）

- 欢迎区 `.ai-assistant-welcome`：宽 (796,286) 460×457，bg #f8f9fb，p 12px 24px 44px，m 0 0 12px，display flex。
- 图标 52×52，bg #8bcf70，圆形，m 95px 0 24px，内含 28×28 白色星芒 SVG；标题「AI 助手」fs 16、fw 500、lh 24、color #303133，m 0 0 24px。
- 提示卡 `.ai-assistant-prompt-card`：白底，bd 1px solid #e8e8e8，r 8，fs 13、lh 19.5、color #303133，p 8px 12px，gap 8，图标 16×16；内容随当前上下文变化（示例：「生成礼貌催办话术」「整理最近沟通待办」「按名字/邮箱找人」「回顾与 易洋平 最近对话要点」「给 易洋平 写催办消息（委婉版）」），一行最多两张，居中换行。
- 点击提示卡只把文字填进输入框，不自动发送（实测 textarea 有值、未发出）。
- 无欢迎副标题/说明元素（`.ai-assistant-welcome-desc` 不存在，旧版无）。
- 窄视口直接用同一套组件（宽度 390，p 仍为 12px 24px 44px）；窄欢迎页各卡 box **未确认**（未单独量）。

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 欢迎区 | 宽 | `.ai-assistant-welcome` | (796,286) 460×457 | bg #f8f9fb; p 12px 24px 44px; m 0 0 12px; display flex |  |
| 欢迎图标 | 宽 | `.ai-assistant-welcome-icon` | (1000,393) 52×52 | bg #8bcf70; br 50%; m 95px 0 24px; display flex | 内含 28×28 白星芒 |
| 欢迎标题 | 宽 | `.ai-assistant-welcome-title` | (966,469) 120×24 | fs 16px; fw 500; lh 24px; color #303133; m 0 0 24px | 「AI 助手」 |
| 提示卡 | 宽 | `.ai-assistant-prompt-card` | 例 (866,517) 154×37.5 | fs 13px; fw 400; lh 19.5px; color #303133; bg #ffffff; bd 1px solid #e8e8e8; r 8px; p 8px 12px; gap 8px; cursor pointer | 图标 16×16 |
| 〃 | 窄 | 〃 | 满宽内换行 | 同上 |  |

- HOVER（宽）提示卡：bd #8bcf70，bg 仍 #ffffff，文字色不变。
- PRESSED：未确认。

### 1.3 内联 AI 会话（入口 2）

消息列表点「Doo AI」（`ul.dialog li` 内头像 title=Doo AI）进入普通会话界面：

- 页头：标题「Doo AI」+ 标签「机器人」+ 在线状态；宽视口标题 h2 与普通会话一致（17/600）。
- 工具条 `.chat-bottom-menu`（宽 (587.5,756) 668.5×42，p 8px 0，display flex；窄为白底胶囊）：模型名 / 开启新会话 / 历史会话。
- 输入区 `.chat-input-wrapper` 668.5×46，bg #f4f5f7，r 10；Quill 编辑区 `.ql-editor` fs 14。
- 回复气泡：`.dialog-item` 内 `.dialog-head` bg #f4f5f7，p 8px，r 2px 8px 8px 8px；`.dialog-view.text` max-width 70%；头像 30×30；内容 `.content-text-ai` p 2px；思考/工具过程与 markdown 正文嵌在气泡内。
- 空会话：「暂无消息」`.describe.filled` fs 14、color #909399，居中。
- 「开启新会话」清空消息回空态；「历史会话」打开右侧抽屉 `.doo-modal.common-drawer.drawer-right.dialog-wrapper-list.is-wide.is-fullscreen`（宽视口内容 500×860 bg #fff，行 476×44、p 12px、m 0 6px；标题 `.history-title` fs 14、lh 20、color #606266；日期 fs 13、color #606266）。
- 窄视口历史抽屉为底部全屏：`.doo-modal.common-drawer.drawer-bottom.drawer-fullscreen...is-narrow.is-fullscreen.is-no-mask` 390×844，bg #f8f8f8；关闭 `.overlay-close` 40×40 位于 (342,8)；行 366×44、p 12px；当前会话带「当前」标签 36×20（fs 12、白字、bg #666、p 0 6px、r 6px）；行内有铅笔图标 18×18 color #999、m-right 8，时间 fs 14、color #606266。
- 窄工具条胶囊：白底，高 26，r 13；「开启新会话」89 宽，「历史会话」76 宽。

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 工具条 | 宽 | `.chat-bottom-menu` | (587.5,756) 668.5×42 | p 8px 0; display flex; align center |  |
| 工具项（胶囊） | 宽 | `.chat-bottom-menu ul > li` | 例 (599.5,764) 128.6×26 | fs 13px; lh 26px; color #606266; bg #f0f1f3; r 13px; p 0 12px; m-right 8px | 文本在 `.bottom-menu-desc`，其自身 fs 13/lh 26 |
| 〃 | 窄 | 〃 | 白底胶囊 高 26 | bg #ffffff; r 13px; fs 13px; lh 26px | 开启新会话 89 宽、历史会话 76 宽 |
| 输入区 | 宽 | `.chat-input-wrapper` | 668.5×46 | bg #f4f5f7; r 10px | Quill `.ql-editor` fs 14px |
| AI 回复气泡 | 宽/窄 | `.dialog-head` | max-width 70%（`.dialog-view.text`） | bg #f4f5f7; p 8px; r 2px 8px 8px 8px | 头像 30×30 |
| 空会话文案 | 宽/窄 | `.describe.filled` | 居中 | fs 14px; color #909399 | 「暂无消息」 |
| 历史抽屉（宽） | 宽 | `.common-drawer.drawer-right...` | 内容 500×860 | bg #ffffff | 全高 |
| 历史行（宽） | 宽 | 抽屉内行 | 476×44 | p 12px; m 0 6px | 标题 fs 14/lh 20/#606266；日期 fs 13/#606266 |
| 历史抽屉（窄） | 窄 | `.common-drawer.drawer-bottom.drawer-fullscreen...` | 390×844 | bg #f8f8f8 | 无遮罩 |
| 历史行（窄） | 窄 | 抽屉内行 | 366×44 | p 12px | 当前 tag 36×20 fs 12 白字 bg #666 p 0 6px r 6px；铅笔 18×18 #999 mr 8；时间 fs 14 #606266 |
| 关闭抽屉 | 窄 | `.overlay-close` | (342,8) 40×40 | — |  |

## 2. 提问与回复过程（浮动面板 / 内联会话共用组件）

### 2.1 输入与发送

- 输入区宽 460×81，p 4px 12px 12px；上下文行 p 12px 8px 8px，标签「消息列表页」107×24（fs 12、lh 18、color #555、bg #fff、r 12、p 0 5px 0 8px、sh rgba(0,0,0,.06) 0 2px 6px 0），右侧删除 × 14×14 color #999；窄上下文标签 fs 13、高 28、r 14、p 0 7px 0 10px。
- 文本域 `.ivu-input`（textarea）fs 14、lh 21、color #333、p 0 4px，placeholder「请输入你的问题...」；宽 (808,759) 436×21 起，窄 (12,767) 366×21。
- 底部行 436×32，gap 12，justify space-between：左模型选择 `.ivu-select` 113.6×32（选中值 fs 14、lh 30、color #606266，右箭头），右「上传图片」按钮 32×32（icon 18×18 color #666，title「上传图片」）+ 发送圆钮 `.ivu-btn-circle` 32×32 bg #8bcf70、白字、bd 1px solid #8bcf70、r 50%。
- 点击发送 → 生成一条输出项；等待期间输入框清空（实测），无自动滚动异常。

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 输入区 | 宽 | `.ai-assistant-input` | (796,755) 460×81 | p 4px 12px 12px |  |
| 上下文行 | 宽 | `.ai-assistant-context` | (796,699) 460×44 | p 12px 8px 8px |  |
| 上下文标签 | 宽 | `.ai-assistant-context-tag` | (804,711) 107×24 | fs 12px; lh 18px; color #555555; bg #ffffff; r 12px; p 0 5px 0 8px; sh rgba(0,0,0,.06) 0 2px 6px 0 | 文本「消息列表页」 |
| 〃 | 窄 | 〃 | (8,715) 117×28 | fs 13px; lh 19.5px; color #555555; bg #ffffff; r 14px; p 0 7px 0 10px |  |
| 删除图标 | 宽/窄 | `.ai-assistant-context-tag-remove` | 14×14 | color #999999 |  |
| 文本域 | 宽 | `.ai-assistant-input textarea.ivu-input` | (808,759) 436×21 | fs 14px; lh 21px; color #333333; p 0 4px; bd 0; placeholder「请输入你的问题...」 |  |
| 〃 | 窄 | 〃 | (12,767) 366×21 | 同上 |  |
| 底部行 | 宽 | `.ai-assistant-footer` | (808,792) 436×32 | display flex; gap 12px; justify-content space-between |  |
| 模型选择 | 宽 | `.ai-assistant-footer-models .ivu-select-selection` | (808,792) 113.6×32 | fs 14px; color #606266; 选中值 lh 30px | 点击弹模型下拉 |
| 〃 | 窄 | 〃 | (12,800) 113.6×32 | 同上 |  |
| 上传图片 | 宽 | `.ai-assistant-image-btn` | (1172,792) 32×32 | icon 18×18 color #666666; br 50%; title「上传图片」 |  |
| 〃 | 窄 | 〃 | (313,807) 18×18（图标） | 同上 |  |
| 发送 | 宽 | `.ai-assistant-footer-btns .ivu-btn-circle` | (1212,792) 32×32 | bg #8bcf70; color #ffffff; bd 1px solid #8bcf70; r 50% | 白色箭头图标 16×16 |
| 〃 | 窄 | 〃 | (346,800) 32×32 | 同上 |  |

- HOVER：发送/上传按钮 hover 样式**未确认**；发送禁用态**未确认**（空文本时按钮仍为绿色，未测点击拦截）。

### 2.2 等待 / 思考 / 工具过程

- 发送后面板显示输出项（`.ai-assistant-output`，bg #f8f9fb，p 12px 24px 44px）。
- 顶部：模型 chip（fs 12、fw 600、lh 18、color #2f54eb、bg rgba(47,84,235,.08)、p 2px 8px、r 4px）+ 原问题（fs 12、lh 16.8、color #666；hover 出现编辑铅笔 20×20 color #777，title「编辑问题」，默认可编辑入口 op 0）。
- 等待态占位 `.ai-assistant-output-placeholder`：fs 13、lh 22、color #999、bg rgba(0,0,0,.02)、p 6px 10px、r 6，m 12px 0 0；文本「等待 AI 回复...」；同时 `.ai-assistant-output-icon.icon-loading` 22×22 color #52c41a，icon-loading 旋转动画，**不可点击**。
- 思考内容：折叠在过程头 `.ai-part-process-head`（宽 412×26，fs 13、lh 19.5、color #666、gap 8、cursor pointer）内；左侧折叠按钮 `.ai-part-process-toggle` 20×20，bd 1px solid rgba(0,0,0,.18)，r 5，内 13×13 下箭头；标题示例「已处理」「执行工具 31 次，其中 1 次失败」。
- 展开后为工具/思考行列表 `.ai-part-process-list`（388 宽，gap 4）：每行 `.ai-part-row` 高 24、fs 13、lh 24；左侧状态图标 14×14（完成 #84c56a / 失败 #f56c6c）；行名 `.ai-part-row-name` color #555（如「已思考」「列出任务」「查询项目」）；描述 `.ai-part-row-desc` color #aaa，单行省略（nowrap + ellipsis）；「已思考」行的描述即思考正文（英文推理文本），工具行描述为命令/参数。
- 行点击可再展开明细 `.ai-part-row-body`（m 4px 0 6px 20px）：两段 `pre`，fs 13、lh 20、color #888、bg rgba(0,0,0,.05)、p 8px 10px、r 6、max-height 200、white-space pre-wrap；第二段 `.ai-part-tool-result` 样式相同（命令与结果）。仅宽视口实测；窄视口**未确认**。
- 本阶段后端 503，流式逐字输出**未观察到（未确认）**；历史成功回复的正文为一次性 markdown 渲染。

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 输出区 | 宽 | `.ai-assistant-output` | 面板宽 460，高随内容 | bg #f8f9fb; p 12px 24px 44px; m 0 0 12px | 可滚动 |
| 〃 | 窄 | 〃 | (0,100) 390×651 | bg #f8f9fb; p 12px 24px 44px |  |
| 模型 chip | 宽 | `.ai-assistant-output-model` | 例 (820,301) 108.5×22 | fs 12px; fw 600; lh 18px; color #2f54eb; bg rgba(47,84,235,.08); p 2px 8px; r 4px |  |
| 〃 | 窄 | 〃 | (24,115) 92.9×22 | 同上 |  |
| 原问题 | 宽 | `.ai-assistant-output-question-text` | (820,332) 388×16.8 | fs 12px; lh 16.8px; color #666666; cursor pointer; overflow hidden | 点击可编辑（铅笔 op 0） |
| 〃 | 窄 | 〃 | (24,146) 342×16.8 | 同上 |  |
| 编辑铅笔 | 宽/窄 | `.ai-assistant-output-question-edit` | 20×20 | color #777777; op 0（默认隐藏）; title「编辑问题」 | 显示条件未确认 |
| 等待占位 | 宽/窄 | `.ai-assistant-output-placeholder` | 输出区宽 | fs 13px; lh 22px; color #999999; bg rgba(0,0,0,.02); p 6px 10px; r 6px; m 12px 0 0 | 「等待 AI 回复...」 |
| 加载图标 | 宽/窄 | `.ai-assistant-output-icon.icon-loading` | 22×22 | color #52c41a; 动画 icon-loading | 非按钮，无停止功能 |
| 过程头 | 宽 | `.ai-part-process-head` | (820,362) 412×26 | fs 13px; lh 19.5px; color #666666; display flex; gap 8px; cursor pointer | 标题「执行工具 31 次，其中 1 次失败」 |
| 〃 | 窄 | 〃 | (24,507.6) 342×26 | 同上 | 标题「已处理」 |
| 折叠按钮 | 宽 | `.ai-part-process-toggle` | (823.5,368.5) 20×20 | bd 1px solid rgba(0,0,0,.18); r 5px; 箭头 13×13 color #888 | 展开后箭头翻转 |
| 〃 | 窄 | 〃 | (24,510.6) 20×20 | 同上 |  |
| 工具行 | 宽 | `.ai-part-row` | (844,?) 388×24 | fs 13px; lh 24px; bg 透明 | 状态类 done / error |
| 行图标 | 宽/窄 | `.ai-part-row .doo-icon` | 14×14 | color #84c56a（done）/ #f56c6c（error） | 圆形勾/叉 |
| 行名 | 宽/窄 | `.ai-part-row-name` | 例 39×24 | fs 13px; lh 24px; color #555555; nowrap; ellipsis | 「已思考」「列出任务」 |
| 行描述 | 宽/窄 | `.ai-part-row-desc` | 例 323×24 | fs 13px; lh 24px; color #aaaaaa; nowrap; ellipsis | 思考正文或命令 |
| 展开明细 | 宽 | `.ai-part-row-body > pre` | 行内缩进 20 | fs 13px; lh 20px; color #888888; bg rgba(0,0,0,.05); p 8px 10px; r 6px; max-height 200px; white-space pre-wrap | 两段：命令 / 结果；m 4px 0 6px 20px |
| 〃 | 窄 | 〃 | — | 同宽（未实测） | **未确认** |

- HOVER（宽）工具行：无背景变化（bg 透明）；点击才展开明细。
- 折叠/展开：默认折叠；点过程头切换 `.expanded`。
- 停止生成按钮：**旧版无**（等待中仅有不可点击的 loading 图标，无「停止」控件）。停止后的展示态**未确认**（无停止入口，只能等失败/完成；失败态见 2.3）。

### 2.3 成功回复 / 失败态

- 成功回复（取自历史会话）：正文 `.markdown-body.dialog-markdown` fs 14、lh 21、color #303133；段落 m 0 0 16px；列表项 384×21；正文内链接 chip `.ai-deeplink-chip` fs 14、color #1677ff、bg rgba(22,119,255,.08)、p 1px 6px、r 5px、m 0 1px，可点击跳转；粗体 `<strong>` 正常加粗。
- 失败态：输出项顶部 `.ai-assistant-output-apply` 显示「发送失败」`.ai-assistant-output-error`（fs 14、color #ff4d4f）+「重试」`.ai-assistant-output-retry`（fs 14、color #2f54eb、m-left 6、cursor pointer）；占位区显示错误原文「Error code: 503 - {'error': {'message': 'Service temporarily unavailable', 'type': 'api_error', 'param': '', 'code': None}}」（fs 13、lh 22、color #999、bg rgba(0,0,0,.02)、p 6px 10px、r 6）。
- 每条输出底部反馈行 `.ai-assistant-output-feedback`（宽 412×26，m 8px 0 0，右对齐，gap 3；窄 gap 6）：4 个 26×26 图标按钮 r 6、color #999，title 依次「复制」「有帮助」「没帮助」「重新生成」；时间 `.ai-assistant-output-time` fs 12、lh 18、color #bbb、m-left 4（如「周三 00:23」「15:16」）。
- 编辑问题：原问题行 hover 出现铅笔（默认 op 0），点击进入编辑（编辑后行为**未确认**）。

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 失败标记 | 宽/窄 | `.ai-assistant-output-error` | 例 56×21 | fs 14px; lh 21px; color #ff4d4f | 「发送失败」 |
| 重试 | 宽/窄 | `.ai-assistant-output-retry` | — | fs 14px; color #2f54eb; m-left 6px; cursor pointer |  |
| 错误原文 | 宽/窄 | `.ai-assistant-output-placeholder` | 输出区宽 | fs 13px; lh 22px; color #999999; bg rgba(0,0,0,.02); p 6px 10px; r 6px | 原文照抄 503 文本 |
| 正文 | 宽/窄 | `.markdown-body.dialog-markdown` | 例 (820,644) 412×344 | fs 14px; lh 21px; color #303133 | 段落底距 16px |
| 链接 chip | 宽/窄 | `.ai-deeplink-chip` | 例 53.7×19 | fs 14px; color #1677ff; bg rgba(22,119,255,.08); p 1px 6px; r 5px; m 0 1px | 如「仪表盘」 |
| 反馈行 | 宽 | `.ai-assistant-output-feedback` | (820,996) 412×26 | m 8px 0 0; display flex; justify-content flex-end; gap 3px |  |
| 〃 | 窄 | 〃 | (24,614.6) 342×26 | gap 6px |  |
| 反馈按钮 | 宽/窄 | `.ai-assistant-feedback-btn` | 26×26 | color #999999; r 6px; bg 透明 | title：复制/有帮助/没帮助/重新生成 |
| 时间 | 宽/窄 | `.ai-assistant-output-time` | 例 57.4×26 | fs 12px; lh 18px; color #bbbbbb; m-left 4px |  |

- HOVER（宽）反馈按钮：bg rgba(0,0,0,.05)，icon color #666666。
- HOVER 重试：样式**未确认**。
- 流式输出逐字态：**未确认**（后端 503，无法观察）。

## 3. 需确认的工具调用（确认/拒绝）

- 本次所有可触发的对话要么直接 503，要么历史会话中的工具调用均为自动执行；**未观察到任何确认/拒绝 UI**，历史记录里工具行只有 done/error 两种状态。
- 因此「工具调用确认」按钮：**未确认**（倾向旧版无；未触发到需要确认的工具）。
- 面板/内联会话中也没有「允许/拒绝」弹窗或行内按钮；失败时只提供「重试」。

## 4. 模型切换

两套模型选择器：

1. **浮动面板底部**（`.ai-assistant-footer-models .ivu-select`）：点击弹下拉 `.ivu-select-dropdown`，202.8×360，位于 (808,427)，bg #fff，r 4，p 5px 0，sh rgba(0,0,0,.2) 0 1px 6px，max-height 360 可滚动；分组标题 30 高（fs 14、color #999、padding-left 8），共 10 组：Doo AI、ChatGPT、Claude、DeepSeek、Gemini、Grok、Ollama、智谱清言、通义千问、文心一言；选项 30 高（fs 14、p 7px 16px、color #606266），共 41 项，最后一项「ERNIE 4.5 Turbo VL 32K」；选中项文字 color #8bcf70（示例「GPT-5.6 Terra」）。
2. **内联 Doo AI 会话工具条**（点模型名胶囊）：`ul` 弹出层 202.2×320，位于 (563,425)，bg #fff，class `.el-dropdown-menu.el-popper.general-operation-more-dropdown.menu-dropdown.el-dropdown-menu--small`；选项 202.2×27，p 0 15px，fs 13、lh 27、color #606266，共 13 项；当前选中项 disabled、文字 #bbb，右侧绿色对勾 #84c56a。窄视口 204.2×334，位于 (5,410)，sh rgba(0,0,0,.1) 0 2px 12px，p 6px 0。

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 模型下拉（面板） | 宽 | `.ivu-select-dropdown` | (808,427) 202.8×360 | bg #ffffff; r 4px; p 5px 0; sh rgba(0,0,0,.2) 0 1px 6px 0; max-height 360px; overflow auto | 10 组 41 项 |
| 分组标题 | 宽 | 下拉内分组标题 | 高 30 | fs 14px; color #999999; padding-left 8px |  |
| 选项 | 宽 | 下拉内选项 | 高 30 | fs 14px; p 7px 16px; color #606266 | 选中文字 #8bcf70 |
| 模型下拉（内联） | 宽 | `.el-dropdown-menu.el-popper.general-operation-more-dropdown` | (563,425) 202.2×320 | bg #ffffff | 13 项 |
| 〃 | 窄 | 〃 | (5,410) 204.2×334 | bg #ffffff; sh rgba(0,0,0,.1) 0 2px 12px; p 6px 0 |  |
| 内联选项 | 宽 | 下拉内 `li` | 202.2×27 | fs 13px; lh 27px; color #606266; p 0 15px | 当前项 disabled、#bbb，右勾 #84c56a |

- HOVER（面板）选项：bg #f3f3f3，文字色不变。
- HOVER（内联）选项：样式**未确认**（未逐项测）。
- 切换后立即生效并显示在新提问的模型 chip 上；已生成的历史回复保留原模型 chip。

## 5. 新会话 / 历史会话

### 5.1 浮动面板

- 新建会话按钮（title「新建会话」）：清空当前输出，回到欢迎页；新会话是否自动命名**未确认**。
- 历史会话按钮（title「历史会话」）：弹出下拉 `.ivu-select-dropdown.ivu-dropdown-transfer`，260×330，位于宽 (914,280) / 窄 (78,94)，bg #fff，r 4，p 5px 0，sh rgba(0,0,0,.2) 0 1px 6px；列表 260×320；每项 52 高、p 7px 16px；标题 `.history-item-title` fs 13、lh 20、color #303133；时间 `.history-item-time` fs 11、color #909399；删除按钮 20×20（icon 12×12 color #909399，title「删除」，默认不可见/占位，显示条件**未确认**）；当前会话项 bg rgba(45,140,240,.1)。实测 51 条历史。
- 点击历史项：面板内容切换为该会话的完整输出（模型 chip、原问题、过程、正文、反馈、时间），滚动到该会话位置。

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 历史下拉 | 宽 | `.ivu-select-dropdown.ivu-dropdown-transfer` | (914,280) 260×330 | bg #ffffff; r 4px; p 5px 0; sh rgba(0,0,0,.2) 0 1px 6px 0 |  |
| 〃 | 窄 | 〃 | (78,94) 260×330 | 同上 |  |
| 历史项 | 宽/窄 | `.ivu-dropdown-item` | 260×52 | p 7px 16px | 当前项 bg rgba(45,140,240,.1) |
| 标题 | 宽/窄 | `.history-item-title` | 202×20 | fs 13px; lh 20px; color #303133 | 单行省略 |
| 时间 | 宽/窄 | `.history-item-time` | — | fs 11px; color #909399 | 「今天 15:16」 |
| 删除 | 宽/窄 | `.history-item-delete` | 20×20 | icon 12×12 color #909399; br 4px; title「删除」 | 默认不可见（显示条件未确认） |

- HOVER（宽）历史项：未测（**未确认**）；当前项高亮为常驻。
- 新建会话后空态：欢迎页（见 1.2）。

### 5.2 内联 Doo AI 会话

- 「开启新会话」：清空消息区，显示「暂无消息」空态。
- 「历史会话」：右侧抽屉（宽）/底部全屏抽屉（窄），样式见 1.3；点行切换会话内容；抽屉内当前会话带「当前」标签（窄）。

## 6. 普通会话输入「AI 生成」

- 入口：任意会话输入框右侧「＋」→ 弹层 `.chat-input-more-popover` 内的「AI 生成」项（普通会话弹层 116×232，6 项：新会议/发送图片/上传文件/匿名消息/AI 生成/全屏输入；Doo AI 会话弹层 116×124，3 项：上传文件/AI 生成/全屏输入）。项高 36、fs 14、p 0 8px、r 4、图标 20×20；hover bg #ecf5ff。
- 点击后弹出「AI 消息助手」生成弹窗（`.doo-modal-card`）：
  - 宽 600×478.8，位于 (340,35)，bg #fff，r 18，sh rgba(0,0,0,.15) 0 4px 12px 0；关闭按钮 `.doo-modal-close` 38×38 位于 (892,47)，icon color #999。
  - 头部 `.doo-modal-header` 600×59，p 22px 24px 20px；标题「AI 消息助手」fs 18、fw 500、color #303133，前有 18×18 星芒；右上「＋」18×18 color #606266 位于 (869,56)，点击清空输出区只留当前模型旧结果。
  - 主体 `.doo-modal-body` 600×419.8；`.ai-assistant-content` flex、max-height 724；`.ai-assistant-output` bg #f8f9fb、p 12px 24px、m 0 0 12px、overflow auto（高 322.8）；输出项 `.ai-assistant-output-item` 552 宽，第二条带 p 12px 0 0、m 12px 0 0、border-top 分隔。
  - 每条输出：模型 chip、原始提示（fs 12、lh 16.8、color #666）、过程头（已处理）、生成正文 markdown（fs 14、lh 21、color #303133，可含 `<strong>`）、右上「应用此内容」按钮 `.ai-assistant-apply-btn` 83×26（bg #8bcf70、白字、fs 13、p 0 8px、r 4、bd 1px solid #8bcf70；hover bg/bd #a2d98d）、失败时「发送失败/重试」、反馈按钮与时间。
  - 输入区 `.ai-assistant-input` 600×85，p 4px 16px 16px，gap 12；文本域 568×21，placeholder「请简要描述消息的主题、语气或要点，AI 将生成完整消息」；底部 `.ai-assistant-footer` 568×32（模型选择 + 上传图片 + 发送圆钮 32）。
  - 生成过程：点击发送 → 新增输出项先显示「等待 AI 回复...」+ loading（实测），随后 503 失败卡「发送失败 / 重试」；历史成功项展示过程「已处理」与正文（如「请各位在周一前提交本周的周报，谢谢配合。」）。
  - 「应用此内容」（真实鼠标点击）：弹窗关闭，生成文本以富文本 HTML 写入会话 Quill 输入框（实测 `<p>请各位在<strong>周一前</strong>提交本周的周报，谢谢配合。</p>`），**不自动发送**，需用户再点发送。
- 窄视口弹窗 370×521.8，位于 (10,35)，r 18；头部 370×59；主体 370×462.8；输出 370×344.8；输入区 370×106；底部行 338×32。

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| ＋ 弹层（普通会话） | 宽 | `.el-popover.chat-input-more-popover` | (1133,564) 116×232 | bg #ffffff; p 8px; r 4px; sh rgba(0,0,0,.2) 0 1px 6px 0 | 6 项 |
| ＋ 弹层（Doo AI 会话） | 宽 | 〃 | (1133,672) 116×124 | 同上 | 3 项：上传文件/AI 生成/全屏输入 |
| 菜单项 | 宽 | `.chat-input-popover-item` | 100×36 | fs 14px; lh 36px; color #606266; p 0 8px; r 4px; 图标 20×20 |  |
| 生成弹窗 | 宽 | `.doo-modal-card` | (340,35) 600×478.8 | bg #ffffff; r 18px; sh rgba(0,0,0,.15) 0 4px 12px 0 | display flex |
| 〃 | 窄 | 〃 | (10,35) 370×521.8 | 同上 |  |
| 关闭 | 宽 | `.doo-modal-close` | (892,47) 38×38 | color #999999; cursor pointer |  |
| 头部 | 宽 | `.doo-modal-header` | (340,35) 600×59 | p 22px 24px 20px |  |
| 〃 | 窄 | 〃 | 370×59 | 同上 |  |
| 标题 | 宽 | `.doo-modal-header` 标题 | — | fs 18px; fw 500; color #303133 | 「AI 消息助手」 |
| 头部＋ | 宽 | `.doo-modal-header .doo-icon` | (869,56) 18×18 | color #606266 | 清空输出 |
| 主体 | 宽 | `.doo-modal-body` | (340,94) 600×419.8 | — | 内含 `.ai-assistant-content` max-height 724 |
| 输出区 | 宽 | `.ai-assistant-output` | (340,94) 600×322.8 | bg #f8f9fb; p 12px 24px; m 0 0 12px; overflow auto |  |
| 输出项 | 宽 | `.ai-assistant-output-item` | (364,106) 552×153.8 | 第 1 条 p 0；第 2 条 p 12px 0 0、m 12px 0 0、border-top |  |
| 应用按钮 | 宽 | `.ai-assistant-apply-btn.ivu-btn-primary.ivu-btn-small` | (833,106) 83×26 | fs 13px; color #ffffff; bg #8bcf70; bd 1px solid #8bcf70; r 4px; p 0 8px; display flex | 「应用此内容」 |
| 原始提示 | 宽 | `.ai-assistant-output-question-text` | (364,140) 552×16.8 | fs 12px; lh 16.8px; color #666666 | 如「Tell team to submit weekly notes」 |
| 过程标题 | 宽 | `.ai-part-process-title` | (392,172) 39×19.5 | fs 13px; lh 19.5px; color #666666 | 「已处理」 |
| 时间 | 宽 | `.ai-assistant-output-time` | (851.3,233.8) 64.7×26 | fs 12px; lh 18px; color #bbbbbb | 「10-31 19:37」 |
| 输入区 | 宽 | `.ai-assistant-input` | (340,428.8) 600×85 | p 4px 16px 16px; display flex; gap 12px |  |
| 〃 | 窄 | 〃 | 370×106 | 同上 |  |
| 文本域 | 宽 | `.ai-assistant-input textarea` | (356,432.8) 568×21 | fs 14px; lh 21px; placeholder「请简要描述消息的主题、语气或要点，AI 将生成完整消息」 |  |
| 底部行 | 宽 | `.ai-assistant-footer` | (356,465.8) 568×32 | gap 12px |  |
| 〃 | 窄 | 〃 | 338×32 | 同上 |  |

- HOVER（宽）「应用此内容」：bg #a2d98d、bd #a2d98d、文字 #fff。
- HOVER 菜单项：bg #ecf5ff；窄同组件。
- 生成中 loading：复用 `.ai-assistant-output-placeholder` + `.icon-loading`（见 2.2），无停止按钮。

## 7. AI 回复的建议按钮（创建子任务 / 忽略 等）

- 浮动面板、内联 Doo AI 会话、AI 生成弹窗中均**未观察到**「创建子任务」「忽略」类建议按钮（旧版无）。
- 现有可操作按钮只有：复制 / 有帮助 / 没帮助 / 重新生成（反馈行）、重试（失败）、应用此内容（生成弹窗）、编辑问题（铅笔）。
- 特定工具结果后是否会出现建议按钮：**未确认**（后端 503，无法触发完整工具链）。

## 缺失项 / INCONCLUSIVE

- 实时流式输出（逐字出现）与「思考中」逐段展开过程：**未确认**（后端 503，所有模型均失败）。
- 停止生成：**旧版无**（等待态无停止控件）；停止后展示态**未确认**。
- 工具调用「确认/拒绝」UI：**未确认**（未触发；历史会话中无此 UI，倾向旧版无）。
- 建议按钮（创建子任务/忽略等）：**旧版无**（已查面板/内联/生成弹窗）；特殊工具结果后的出现条件**未确认**。
- 浮动按钮宽视口 box、面板缩放（resize）能力、面板拖动边界：**未确认**（仅确认标题栏 cursor move）。
- 窄视口欢迎页各卡 box、窄面板模型下拉（面板内）逐项样式：**未确认**（组件与宽视口同源）。
- 发送按钮 hover/disabled 态、上传图片 hover、模型选项内联 hover：**未确认**。
- 历史项 hover、历史删除按钮显示条件、历史时间格式规则：**未确认**。
- 编辑问题（铅笔）点击后的编辑态与提交行为：**未确认**。
- 上下文标签删除后的效果、上下文下拉（`.ai-assistant-context-inner.ivu-dropdown`）内容：**未确认**。
- 内联 Doo AI 会话中「机器人」标签的具体样式、在线状态点样式：**未确认**（页头与普通私聊同构，未单独量）。
