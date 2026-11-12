# 旧版 Web 媒体消息规格（spec-media.md）

- 环境：旧版 Web `<测试服>`（/manage/messenger），已登录态 `state-old-admin.json`，未重新登录。
- 视口：宽屏 1280×860；窄屏 390×844（isMobile、hasTouch，加载即该视口）。
- 颜色/尺寸均来自 `getComputedStyle` 与 `getBoundingClientRect`；box 单位 px，宽屏坐标相对视口。
- 截图与 JSON 证据目录：`~/qa/n5-spec/media/`（下文只写文件名）。

---

## 1. 图片 / 画廊

会话 751；消息 2211094（png，320×480）、2211072（jpg，320×240）；gif 908004 在 14642 未找到（见 INCONCLUSIVE）。
截图：`img-wide-bubble-2211094.png`、`img-wide-bubble-2211072.png`、`img-wide-viewer-2211094.png`、`img-wide-viewer-switched.png`、`img-narrow-bubble-2211094.png`、`gallery-narrow-open.png`、`gallery-narrow-ui-hidden.png`、`gallery-narrow-swiped.png`、`gallery-narrow-zoomed.png`、`narrow-image-after-esc.png`。

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 图片气泡 | 宽 | `[data-id="2211094"] .dialog-head` | 162.7×236 @1047.3,187 | bg `#84C56A`；radius `8px 2px 8px 8px`；padding 8px；flex | 自身消息右对齐；气泡=图片+16 |
| 图片气泡 | 窄 | `[data-id="2211094"] .dialog-head` | 162.7×236（同宽屏） | 同上 | 窄屏在会话弹层内，右对齐 |
| 图片本体 png | 宽/窄 | `.content-file.img .dialog-file > img.file-img` | 146.7×220 | inline `width:146.667px;height:220px`；radius 6px；bg 透明；cursor pointer | 原图 320×480，按 220×220 内等比缩放 |
| 图片本体 jpg | 宽/窄 | `[data-id="2211072"] img.file-img` | 220×165 | inline `width:220px;height:165px`；radius 6px | 原图 320×240，按宽 220 等比 |
| 图片最大框 | 宽/窄 | `.content-file.img` | 220×220 | `max-width:220px;max-height:220px`；overflow hidden | 未发现最大放大上限以外的规则 |
| 时间 | 宽 | `[data-id="2211094"] .dialog-foot` | 47.4×21 | padding-top 4px；14px | 气泡底部、右对齐 |
| 加载占位 | 宽/窄 | `img.file-img` | — | bg 透明；无骨架/DOM 占位节点 | 测试时命中缓存，未捕获加载态 |
| 宽屏查看器根 | 宽 | `.common-preview-image-modal` | 1280×860 @0,0 | fixed；z-index 1009；bg 透明；`is-wide is-fullscreen is-no-mask` | 无遮罩元素，内层自己铺底 |
| 宽屏查看器底色 | 宽 | `.common-preview-view` | 1280×860 | bg `rgba(0,0,0,0.8)`；absolute | 80% 黑遮罩 |
| 关闭按钮（宽） | 宽 | `.preview-image-close` | 40×40 @1200,40 | bg `#606266`；radius 50%；color `#FFF`；font-size 26px | X 线性图标 |
| 上一张/下一张（宽） | 宽 | `.preview-view-prev` / `.preview-view-next` | 44×44 @40,408 / @1196,408 | bg `#606266`；radius 50%；opacity 0.8；z-index 2 | 白色 chevron；垂直居中 |
| 底部工具条（宽） | 宽 | `.preview-view-actions` | 282×44 @499,786 | bg `#606266`；radius 22px；padding 0 23px；opacity 0.8 | 内部 `.actions-inner` 236×44 @522 |
| 工具图标（宽） | 宽 | `.actions-inner > i` | 23×23；y 796.5 | 白色；间距约 40.3px | 依次：缩小、放大、分隔、适应屏幕、分隔、左旋、右旋（分隔宽 0） |
| 画布（宽） | 宽 | `.preview-view-canvas` | 1280×860 | 全屏定位 | 图片居中 |
| 查看图片（宽） | 宽 | `.preview-view-img` | 400×600 @440,130 | 原图 400×600；inline `transform: scale(1) rotate(0deg); max-height:100%; max-width:100%` | 无页码指示 |
| 移动端查看器 | 窄 | `.pswp.preview-image-swipe-*` | 390×844 | `pswp--open pswp--touch pswp--zoom-allowed pswp--click-to-zoom` | PhotoSwipe；触摸模式 |
| 移动端底色 | 窄 | `.pswp__bg` | 390×844 | bg `#000`；opacity 0.8 | 80% 黑 |
| 页码（窄） | 窄 | `.pswp__counter` | 28×30 @20,15 | 14px/30px `#FFF`；opacity 0.85 | 文本 `2 / 9` |
| 顶栏（窄） | 窄 | `.pswp__top-bar` | 390×60；z 10 | bg 透明；flex | 顶部操作区 |
| 关闭（窄） | 窄 | `.pswp__button--close` | 50×60 @334,0 | 透明底；opacity 0.85；32×32 SVG | 右上角 |
| 缩放按钮（窄） | 窄 | `.pswp__button--zoom` | 50×60 @284,0 | 与关闭同高 | 点击切换缩放 |
| 当前图片（窄） | 窄 | `.pswp__img` | 390×585 @0,130 | inline `width:390px;height:585px` | 相邻 slide 在 x=-429/+429 |
| 左右箭头（窄） | 窄 | `.pswp__button--arrow--left/right` | 不存在 | — | touch 模式不渲染箭头 |

交互（宽）：
- 点击图片打开查看器；`Esc` 关闭；点击遮罩**不关闭**；右上 X 关闭。
- 滚轮上滚 3 次：`scale(1)` → `1.015` → `1.03` → `1.045`；下滚 3 次回 `1`（每个 wheel 事件约 +1.5%）。
- 双击图片：无变化（不缩放）。
- 工具条：缩小两次 `1→0.8→0.6`；放大一次 `0.6→0.8`；适应屏幕 `→1`；左旋 `rotate(-90deg)`、右旋回 `rotate(0deg)`。
- 下一张/上一张按钮与 `ArrowRight`/`ArrowLeft` 均可切图（src `165d…png` ↔ `abe094…png`）。
- 无页码、无滑动切图（桌面）。

交互（窄）：
- 单指 tap 图片打开 PhotoSwipe；单 tap 画面：顶栏淡出（opacity 0.005，`pswp--ui-visible` 移除）；再 tap 恢复。
- 左滑：页码 `2 / 9 → 3 / 9`，图片切换；右滑回 `2 / 9`。
- 双击：进入 `pswp--zoomed-in`，当前图 390×585 → 400×600。
- 右上关闭按钮可关闭；`Esc` 也可关闭。

---

## 2. 视频

会话 33283；消息 2210764（mp4，60s）；mov 1204783 不可用（见 INCONCLUSIVE）。
截图：`video-wide-bubble.png`、`video-wide-player.png`、`video-narrow-bubble.png`、`narrow-viewer-video.png`、`narrow-video-after-tap.png`。

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 视频气泡 | 宽 | `[data-id="2210764"] .dialog-head` | 236×139.8 @974,115.3 | bg `#84C56A`；radius `8px 2px 8px 8px`；padding 8px | 内容 220×123.75 |
| 视频气泡 | 窄 | 同上 | 236×139.8 | 同上 | x=102（右对齐） |
| 封面/视频框 | 宽/窄 | `.file-video` | 220×123.75 | inline `width:220px;height:123.75px`；overflow 可见 | 16:9 固定 |
| 封面图 | 宽/窄 | `.file-video > img` | 220×123.8 | radius 6px；object-fit 默认；原图 640×360 | `*.mp4_thumb.jpg` |
| 播放覆盖层 | 宽/窄 | `.file-play` | 220×123.8 | absolute；bg `rgba(255,255,255,0.1)` | 整面可点 |
| 播放图标 | 宽/窄 | `.play-icon i` | 22×22 | color `#FFF`；font-size 22px；SVG viewBox 0 0 24 24 | 白色三角形，居中 |
| 时长 | 宽/窄 | — | — | 无时长元素 | 气泡上不显示时长 |
| 播放器模态（宽） | 宽 | `.common-preview-image-modal` | 1280×860 @0,0 | fixed；z 1009；bg 透明；`is-wide is-fullscreen is-no-mask` | 全屏、无背景遮罩 |
| 播放器容器（宽） | 宽 | `.common-preview-video` | 1280×860 | fixed；flex 居中 | 视频 640×360 @320,250 |
| video（宽） | 宽 | `.common-preview-video video` | 640×360 | `controls autoplay`；`preload=metadata`；原生控件 | 源 mp4，duration 60 |
| 关闭（宽） | 宽 | `.preview-image-close` | 40×40 @1200,40 | bg `#606266`；radius 50%；白色 X | 与图片查看器同款 |
| 窄屏播放器 | 窄 | `.common-preview-image-modal.is-swipe` | 0×0，`display:none` | `is-swipe is-narrow is-fullscreen`；z 1010 | 视频元素存在但不可见（见 INCONCLUSIVE） |
| video（窄） | 窄 | `.common-preview-video video` | 0×0 | width=390 height=219.375；controls autoplay | 隐藏播放，`currentTime` 会前进 |

交互：
- 宽屏点击封面/播放图标 → 打开原生播放器并自动播放（1.2s 后 `currentTime` 由 0 到 4.68s，`paused=false`）。
- 全屏、音量、倍速、画中画均由浏览器原生控件提供（`controls=true`；`volume=1`；`playbackRate=1`；`requestPictureInPicture/requestFullscreen` 为 function）；页面无自定义倍速/画中画/全屏按钮。
- `Esc` 关闭模态；右上 X 关闭。
- 窄屏 tap 播放区域：请求 mp4、隐藏 video 自动播放（t≈2.39s），但 `.is-swipe` 模态 `display:none`，用户看不到播放器（记录为窄屏异常）。
- 双击封面无额外行为。

---

## 3. 文件

会话 2367；消息 2209832(pdf)、2209488(docx)、2209629(xlsx)、2209630(zip)。
截图：`file-wide-dialog.png`、`file-wide-{pdf,docx,xlsx,zip}-confirm.png`、`file-wide-{pdf,docx,xlsx,zip}-after.png`、`file-narrow-{pdf,docx,xlsx,zip}-confirm.png`、`file-narrow-{pdf,docx,xlsx,zip}-after.png`。

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 文件卡片 | 宽/窄 | `.file-box` | 220×81 | bg `#FFF`；radius 3px；padding 10px 14px；flex；cursor pointer；shadow none | 卡片位置随消息右对齐 |
| 类型图标 | 宽/窄 | `.file-thumb` | 36×36 | 无圆角；`/images/ext/{pdf,doc,xls,zip}.png` | 距卡片左 14px |
| 文件名 | 宽/窄 | `.file-name` | 120×36 | 14px/18px `#303133`；overflow hidden | 最多两行 |
| 文件大小 | 宽/窄 | `.file-size` | 120×25 | 14px/21px `#606266`；padding-top 4px | 如 `2.41 MB` |
| 卡片按钮 | 宽/窄 | — | — | 无按钮/悬浮按钮 | hover 后 bg/shadow/子元素数量不变 |
| 下载确认遮罩 | 宽/窄 | `.layer-stack-mask` | 全屏 | bg `rgba(55,55,55,0.6)`；z 1009 | 居中 layer 卡片 |
| 确认卡片（宽） | 宽 | `.layer-card.layer-wide` | 416×165 @432,347.5 | bg `#FFF`；radius 18px；padding 22px 32px；shadow `0 4px 12px rgba(0,0,0,.15)` | 标题+文件名+按钮 |
| 确认标题（宽） | 宽 | `.layer-title` | 64×24 @504,378.5 | 16px/24px；500；`#303133` | 文本「下载文件」；左侧橙色警告图标 |
| 确认正文（宽） | 宽 | `.layer-card` 文本节点 | — | 14px/21px `#606266` | `文件名 (大小)` |
| 取消（宽） | 宽 | `.doo-button.is-default` | 68×36 @646,454.5 | bg `#E9EAEE`；color `#1F2329`；radius 10px；padding 0 18px；14px/500 | — |
| 立即下载（宽） | 宽 | `.doo-button.is-primary` | 92×36 @724,454.5 | bg `#84C56A`；color `#FFF`；radius 10px；padding 0 18px；14px/500 | — |
| 确认卡片（窄） | 窄 | `.layer-card.layer-narrow` | 300×165 @45,339.5 | bg `#FFF`；radius 28px；padding 24px 20px 20px | 窄屏布局 |
| 确认标题（窄） | 窄 | `.layer-title` | 260×23 @65,363.5 | 17px/23px；600；`#1F2329`；居中 | 文本「下载文件」 |
| 按钮行（窄） | 窄 | `.layer-narrow-buttons` | 260×48 @65,436.5 | flex；两个按钮各 125×48 | — |
| 取消/下载（窄） | 窄 | `.doo-button.is-default/is-primary` | 125×48 | radius 24px；padding 0 16px；16px；primary bg `#84C56A` 白字 | 并排等宽 |

交互：
- 点击卡片任意处 → 弹出下载确认；`取消` 关闭且无网络下载。
- `立即下载` → 触发浏览器下载并关闭弹窗；已确认文件名并立即 cancel：
  - pdf：`1_收银管理系统.pdf`（2.41 MB）
  - docx：`江西朴拙医疗设备有限公司.docx`（50.17 KB）
  - xlsx：`审批数据_20260616_1332.xlsx`（8.12 KB）
  - zip：`logioptionsplus_installer 2.zip`（19.38 MB）
- 无新窗口、无 iframe、无 PDF/Office 预览框和预览工具栏；点击行为只有「下载确认→下载」。
- 无应用内下载进度条/百分比；下载进度由浏览器接管，弹窗在触发后立即消失。

---

## 4. 长文本

会话 33283；消息 2210756。
截图：`longtext-wide-bubble.png`、`longtext-wide-page.png`、`longtext-narrow-bubble.png`、`longtext-narrow-page.png`。

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 气泡 | 宽 | `.dialog-view.longtext` | 456.8×841.4 @753.3,12 | 自身消息右对齐 | 占满消息区高度 |
| 预览正文 | 宽 | `.markdown-body.dialog-markdown` | 338.9×724.4 | 14px/20px `#FFF`；overflow auto；白字 | 截断至 Section 8，末尾省略号 |
| 查看详情栏 | 宽 | `.content-longtext-footer` | 338.9×36 @861.1,786.3 | margin-top 12px；flex | 文本「查看详情」 |
| 查看详情文字 | 宽 | `.content-longtext-footer > span` | 338.9×45 | 14px/21px `#FFF`；padding 12px；margin-bottom -10px；cursor pointer | 点击整行 |
| 气泡（窄） | 窄 | `.dialog-view.longtext` | 253.4×1001.4 @84.6,-67 | 同宽屏 | 窄屏气泡更窄 |
| 预览正文（窄） | 窄 | `.markdown-body.dialog-markdown` | 233.4×884.4 | 14px/20px `#FFF` | 截断规则一致 |
| 阅读页根 | 宽/窄 | `.single-file-msg.child-view` | 1280×860 / 390×844 | 全屏；无顶栏、无关闭按钮 | 独立页面（新标签） |
| 阅读页正文 | 宽/窄 | `.markdown-body.dialog-markdown.view-longtext` | 宽 1280×860；窄 390×844 | position absolute；padding 16px；overflow-y auto；`#303133` | 可滚动 |
| 段落 | 宽/窄 | `.markdown-body p` | 宽 1248×21；窄 358×21 | 14px/21px；margin-bottom 16px | — |
| 标题 h2 | 宽/窄 | `.markdown-body h2` | 宽 1248×33.5；窄 358×33.5 | 21px/26.25px；600；padding-bottom 6.3px；margin-bottom 16px | — |

交互：
- 点击「查看详情」→ `window.open` 新标签 `/single/file/msg/2210756`，不是页内模态。
- 阅读页 `document.title = 消息详情`；无标题栏、无关闭/返回控件；`Esc` 无效，只能关闭浏览器标签或后退。
- 阅读页可纵向滚动（宽屏 scrollHeight 37827 / 视口 860；窄屏 37911 / 844）。
- 气泡内预览容器 `overflow:auto`，但本样本已截断，未出现滚动条。

---

## 5. 语音

会话 751；消息 2211139（2″）。
截图：`voice-wide-bar.png`、`voice-wide-playing.png`、`voice-narrow-bar.png`、`voice-narrow-playing.png`。

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 语音气泡 | 宽 | `[data-id="2211139"] .dialog-head` | 78×40 @1132,402 | bg `#84C56A`；radius `8px 2px 8px 8px`；padding 8px | 宽度=语音条+16 |
| 语音条 | 宽/窄 | `.dialog-record` | 62×24 | inline `width:62px`（2″）；flex；cursor pointer | 无背景色 |
| 时长 | 宽/窄 | `.record-time` | 19.1×24 | 14px/24px `#FFF`；padding-right 4px | 文本 `2″` |
| 播放图标 | 宽/窄 | `.record-icon` + `::before` | 14.4×21.6；伪元素 16×16 | `#FFF`；SVG speaker mask | 无波形 |
| 宽度规则 | 宽/窄 | `.dialog-record[style]` | 高 24 | inline width | 1″ 58–59；2″ 60–62；5″ 78；9″ 95（同秒数也可能差 2px） |
| 播放态 | 宽/窄 | `.dialog-record.playing` | 同条 | `::before` animation `record-playing 1s infinite` | 播放结束 class 移除 |
| 未读红点 | 宽/窄 | — | — | 未发现 dot/badge 元素 | 无未读接收语音样本 |

交互：
- 点击语音条 → 请求 `record_*.m4a`（JS Audio，无 `<audio>` DOM），语音条加 `playing`，扬声器图标出现波纹动画；播放结束移除。
- 自动连播：连续语音 2211132→2211133… 场景下播放 2211132，6 秒内只请求自身 m4a，未请求下一段 → **不自动播放下一段**。
- 无波形、无进度条、无拖动定位；时长不可点击。
- 未读红点未测（见 INCONCLUSIVE）。

---

## 6. 富文本（链接 / @ / 代码块 / 清单）

会话 751：2211252（链接）、2211253（@）；会话 33283：2211254（代码块）、2211255（清单）。文本均由旧端编辑器发送。
截图：`rich-wide-link.png`、`rich-wide-mention.png`、`rich-wide-code.png`、`rich-wide-code-copied.png`、`rich-wide-checklist-msg.png`、`rich-wide-checklist-editor.png`、`rich-narrow-link.png`、`rich-narrow-mention.png`、`rich-narrow-code.png`、`rich-narrow-code-copied.png`、`rich-narrow-checklist-msg.png`。

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 链接 | 宽 | `.markdown-body a[href="https://example.com"]` | 131.3×17 | color `rgb(67,111,246)`(#436FF6)；14px/20px；无下划线；cursor pointer | `target=_blank` |
| 链接 | 窄 | 同上 | 139.3×18 | 15px/20px；其余同宽屏 | 窄屏字号 15 |
| @ 提及 | 宽 | `.dialog-msgs .mention.user` | 40.5×17 | color `#303133`；14px；radius 6px；padding 0；bg 透明；cursor auto | `data-id="10"`，文本 `@何翔` |
| @ 提及 | 窄 | 同上 | 43.3×18 | 15px；其余同宽屏 | — |
| 代码块 | 宽/窄 | `pre.code-block-wrapper` | 139.5×79.3 | bg `#FFF`；radius 6px；padding 24px 16px 16px；margin-bottom 16px；overflow 可见 | 位于绿色气泡内 |
| 代码头 | 宽/窄 | `.code-block-header` | 139.5×17.3 | position absolute；top 0；padding 0 16px；flex | 语言 + 复制 |
| 语言标签 | 宽/窄 | `.code-block-header__lang` | 14.3×17.3 | 11.9px/17.255px `#B3B3B3` | 文本 `js` |
| 复制按钮 | 宽/窄 | `.code-block-header__copy` | 32×17.3 | 11.9px；`#B3B3B3`；hover `#65A665`；cursor pointer | 文本「复制」，点击后不改变文本 |
| 代码正文 | 宽/窄 | `code.code-block-body` | 139.5×38 | 11.9px/17.255px；`ui-monospace, SFMono-Regular, Menlo, Consolas…`；white-space pre | hljs 配色 |
| 清单气泡 | 宽 | `[data-id="2211255"] .dialog-view` | 89.3×40（pre/ol） | 14px/20px `#FFF`；white-space pre-wrap | `pre > ol` |
| 清单列表 | 宽 | `ol` / `li[data-list="unchecked"]` | ol 89.3×40，padding-left 21px；li 68.3×20 | list-style none；无 checkbox | 0 个 input/.ql-ui |
| 清单气泡 | 窄 | 同上 | 282×109（view）；li 72.5×20 | 15px/20px | 列表项仍无 checkbox |
| 编辑器伪复选框 | 宽 | `.chat-input-full-input .ql-ui` | 0×22；`::before` 16.8×22 | `::before` content U+200B；bg `#777`；display inline-block | 仅全屏编辑器内；消息内不保留 |

交互：
- 链接：hover 颜色/下划线均不变；点击打开新标签 `https://example.com/`。
- @：cursor 为 auto（无链接手型）；点击无弹层、无跳转、无任何可见结果（`mentionClick: []`）。
- 代码块「复制」：点击复制到剪贴板，实测剪贴板为 `const a = 1;\nconsole.log(a);\n`；按钮文案保持「复制」，无 toast。
- 清单：输入 `- [ ]`/`- [x]` 不会生成复选框（服务端渲染成普通 `<li>`）；全屏编辑器用「unchecked 列表」按钮可生成 `li[data-list=unchecked]` + `.ql-ui` 伪复选框；发送后 `ql-ui` 丢失，消息内仅 `li[data-list]`，无 input/checkbox、不可点击，显示为缺字方框。

---

## 7. 数学公式

会话 33283；消息 2210755（历史消息，服务端已存 KaTeX HTML）；对照 2211256（旧端直接发送 `$$E=mc^2$$`）。
截图：`math-wide-bubble.png`、`math-narrow-bubble.png`、`math-send-wide.png`、`math-wide-eks.png`。

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 公式消息气泡 | 宽 | `[data-id="2210755"] .dialog-head` | 133.1×120.5 @1076.9,376.5 | bg `#84C56A`；radius `8px 2px 8px 8px`；padding 8px | 发送者 DooTask，右侧绿气泡 |
| 公式消息气泡 | 窄 | 同上 | 133.1×120.5 | 同上 | x=204.9 |
| 正文容器 | 宽/窄 | `.markdown-body.dialog-markdown` | 113.1×100.5 | 14px/20px `#FFF`；overflow auto | — |
| 普通文本 | 宽/窄 | `.markdown-body p` | 113.1×20 | 14px/20px；margin-bottom 16px | 文本 `math test` |
| 公式块 | 宽/窄 | `p.katex-block.katexmath-block.rounded-md.p-[10px]` | 113.1×64.5 | computed bg 透明；padding 0；radius 0；display block | Tailwind 类名存在但旧构建无对应样式 |
| 展示层 | 宽/窄 | `.katex-display` | 113.1×44.6 | display inline（computed）；margin 0 | 内部 `.katex` 14px `#FFF` |
| MathML | 宽/窄 | `.katex-mathml math` | 113.1×26.6 | display `block math` | 可见 KaTeX HTML 层 |
| 旧端直发公式 | 宽 | `[data-id="2211256"] pre` | — | 纯文本 `$$E=mc^2$$`；无 `.katex` | hasKatex=false |

交互：
- 公式为静态渲染，无点击/悬浮行为。
- 现有 2210755 在宽/窄均正常显示 KaTeX；旧端编辑器发送 `$$E=mc^2$$`（2211256）不会渲染，仍为 `<pre><p>` 原文。
- 结论：旧端具备「展示已渲染 KaTeX 消息」的样式能力；但旧端「发送即渲染」不成立。

---

## INCONCLUSIVE / 未测项

1. **GIF 图片 908004（会话 14642）**：翻页 160 次仍未找到该消息；全量扫描仅发现表情类 `.gif`（`/images/emoticon/*`、`emo工具`），未发现图片消息型 gif。gif 专属尺寸/播放规则未测；图片规则以 png/jpg 为准。
2. **MOV 视频 1204783（会话 19）**：会话列表仅 76 个会话，滚动查找无 `li[data-id="19"]`，会话 19 无法打开；也未找到其他 `.mov` 视频。mov 气泡/播放器未测；mp4 已测。
3. **图片加载中占位**：`img.file-img` 背景透明、无骨架/占位节点；测试时图片命中缓存，未捕获真实加载过程 → 加载占位是否存在未确认。
4. **消息内清单复选框样式/点击**：旧端发送后 `span.ql-ui` 丢失，消息仅为 `li[data-list="unchecked"]`（list-style none），无 input/checkbox，无法测点击态；仅测得编辑器内 `.ql-ui::before` 16.8×22 灰块。
5. **窄屏视频播放器 UI**：点击后 `.common-preview-image-modal.is-swipe` 为 `display:none`，mp4 已请求且隐藏 video 自动播放（t≈2.39s），但无可见播放器、无关闭/控制条可测；宽度、倍速、画中画等窄屏 UI 无法测量。
6. **语音未读红点**：现有接收语音均已读（`voiceOther` 为空），未见 dot/badge 元素 → 未读红点样式/出现条件未测；播放/进度/自动连播已测。
7. **数学公式「旧端发送即渲染」**：旧端发送 `$$E=mc^2$$` 为原文（2211256）；仅历史/新端消息 2210755 渲染 KaTeX。若验收要求旧端编辑器发送后立即渲染，则该场景 INCONCLUSIVE（当前表现为不支持）；已渲染消息的展示规格完整测于第 7 节。
