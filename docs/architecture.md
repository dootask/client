# DooTask 全端客户端架构方案

> 2026-11-07 定。前身是主仓库 `feature/rn-next` 分支的 `docs/rn-next/architecture.md`（2026-10-26），本文在它的基础上改为独立项目，并调整了国际化、代码来源和性能要求。

## 1. 目标

用一套 Expo + react-native-web 代码，重写 DooTask 的 iOS、Android、Web、桌面四端前端，按窗口宽度自适应布局。全部完成并整体验收后，一次性替换：

- 主仓库的 Vue 2 前端（`resources/assets/js`，Web 和 Electron 桌面端在用）
- App 工程 `resources/app`（Expo 壳 + 全屏 WebView 加载 Vue 前端，部分页面已原生化）

**终点**：本项目是 DooTask 唯一的前端工程。`resources/app` 在切换前只维护、不加功能，切换后停用。

## 2. 相关仓库与资料

| 位置 | 是什么 | 本项目怎么用 |
| --- | --- | --- |
| `/home/coder/workspaces/dootask` | 主仓库：Laravel 后端 + Vue 2 前端 + Electron | 读接口和业务规则；后端改动在那里按它的规矩做 |
| 主仓库 `routes/api-map.md` | API 地址 ↔ 控制器方法对照 | 写接口定义时查 |
| 主仓库 `resources/ai-kb/` | 40 个功能模块的用户侧说明 | 业务规格的主要来源 |
| 主仓库 `resources/assets/js` | 旧 Vue 前端 | 只用来找隐藏的业务规则（尤其 `store/actions.js`），不移植代码 |
| 主仓库 `docs/events-map.md` | 前端事件总线收发对照 | 核对交互入口有没有漏 |
| 主仓库 `language/translate.json` | 旧前端 9 种语言的译文库 | 新增翻译键时按中文原文查现成译文 |
| 主仓库 `electron/` | 桌面壳（自动更新、多窗口、托盘、下载） | M4 改为加载本项目的 Web 构建 |
| `resources/app`（`github.com/dootask/app`） | 现有 Expo App | 可直接复制的代码来源，见第 3 节 |
| `resources/app` 的 `feature/rn-next` 分支（提交 `da6404433`） | 上一轮全端重写尝试的底座代码 | 数据层、存储、加密、嵌入容器、布局原语可参考或直接搬 |
| `/home/coder/workspaces/happy-next/packages/happy-app` | 用户另一个一套代码出三端的 RN 项目 | 架构参照；性能问题的经验见 [performance.md](./performance.md) |

## 3. 代码来源

**按业务重写，不移植旧 Vue 代码**。需求以 ai-kb 和 api-map 为准，旧代码只用来逐条核对业务规则。

**可以从 `resources/app` 直接复制**的是最近按新规范写的部分：

- 会话窗口 v2（`src/features/dialog/`、`packages/chat-ui/`）、任务详情（`src/features/task/`）
- 公共 UI（`src/ui/`）和原生页 UI 规范 `docs/native-ui-spec.md`（颜色、字号、间距等设计令牌以它为准）
- 本地 Expo 模块（`modules/`）和 config plugin（`plugins/`）：推送（DooPush）、会议、分享、媒体、键盘、输入框等
- 推送、签名、出包相关配置（`push/`、`scripts/`、`app.config.ts`）

复制时必须做的改造：

- **取数方式换掉**。App 里的原生页通过壳协议向 WebView 里的 Vue 前端拿数据；这里一律改为走本项目的数据层（`src/sync`）直连后端
- 文案改用 i18next 的翻译键
- 按本项目的目录分层放置，不保留「在网页中打开」之类的过渡入口

**不复制**：eeui 兼容桥（`src/bridge/`）、共享 WebView（`modules/shared-webview`）、`legacy-*` 模块等只为承载旧前端存在的代码。

## 4. 技术选型

版本与 `resources/app` 保持一致，原生模块才能直接复制。安装一律用 `npx expo install`。

| 事项 | 决议 | 备注 |
| --- | --- | --- |
| 框架 | Expo SDK 58、React Native 0.88、React 19.3、新架构、CNG | 不手改 `ios/`、`android/` |
| Web | react-native-web（SDK 58 自带版本） | `expo export --platform web` |
| 桌面 | 沿用主仓库的 Electron，加载 Web 构建 | Tauri 等迁移完成后再评估 |
| 路由 | expo-router（文件路由，Web 端是真实 URL） | 深链、推送点击、分享链接共用一套路径 |
| 样式与主题 | react-native-unistyles 3 | 2026-11-08 已在 RN 0.88 新架构的 Android Release 包和 Web 上验证通过（3.8.1 + nitro-modules 0.37.2），见 [reuse-inventory.md](./reuse-inventory.md) 第 5 节 |
| 全局状态 | zustand | 组件外也能读写，WebSocket 推送直接写 store |
| 服务端数据 | 自建同步层 + zustand | 会话、消息要做增量合并和离线缓存；低频配置类数据可局部用 TanStack Query |
| 长列表 | @shopify/flash-list 2 | 聊天消息列表例外，按平台分开实现，见下方说明 |
| 本地存储 | 键值：react-native-mmkv 4（自带 Web 实现，底层是 localStorage；2026-11-08 已验证）；结构化缓存：原生 expo-sqlite、Web 用 IndexedDB | Web 不用 expo-sqlite：它要求全站开跨源隔离响应头，会破坏 iframe 嵌入和第三方登录弹窗 |
| 动画手势 | reanimated 4 + gesture-handler | Web 端动画另有要求，见性能规范 |
| 国际化 | i18next + react-i18next | 见第 8 节 |
| 图标 | lucide-react-native | 与旧前端、App 同一套图标，名字能对上 |
| 校验 | zod | 接口返回值校验 |
| 测试 | vitest（数据层和纯函数）、Playwright（Web 端回归） | 组件不写单元测试 |
| 语言 | TypeScript strict | — |

### 聊天消息列表：按平台分开实现（2026-11-08 定）

两端效果一样：最新消息在底部，打开时停在底部，往上滚加载历史。

- **原生端（iOS / 安卓）**：沿用 `resources/app` 的 `packages/chat-ui`，也就是倒序 FlatList 加 VirtualizedList 插入跳位补丁，再加 KeyboardDock。这套已经在真机上验证过
- **网页端**：不用倒序（inverted）FlatList。react-native-web 实现倒序的办法是给网页元素加 `scaleY(-1)` 上下翻转，浏览器并不知道列表被翻了，所以：
  - 滚轮方向要手动反过来，触控板惯性滚动不自然
  - 网页元素的顺序是反的，选中文字、页内查找、读屏的顺序都是反的
  - `maintainVisibleContentPosition` 在网页上基本不起作用

  网页端改为参考 Happy Next 的实现：用 `column-reverse` 做滚动容器，加一套从底部算起的虚拟列表模型。这套实现已经打磨过 41 个提交。只借用底层的布局模型和滚动控制；折叠、小地图这些是 Happy 自己的功能，不搬。参考文件在 `/home/coder/workspaces/happy-next/packages/happy-app/sources/components/` 下：
  - `ChatList.web.tsx`：滚动容器和虚拟列表的组装
  - `chatListVirtualModel.ts`：从底部算起的布局模型（纯计算）
  - `scrollDistanceController.ts`：记录到底部的距离，滚动修正时按这个数计算，避免列表漂移
- **对外接口两端一致**：都沿用 chat-ui 的 `ChatView` 参数（`ChatViewProps` / `ChatViewHandle`），两端分别写成 `.native.tsx` 和 `.web.tsx`，业务代码不用区分平台
- 具体怎么实现，留到 M1 做聊天时再定

## 5. 分层与目录

```
src/
├── app/          路由（expo-router），只做页面组装
│   ├── (auth)/   登录、服务器地址
│   ├── (main)/   登录后的主框架
│   └── …         task/[id]、messenger/[dialogId] 等
├── modules/      业务模块：messenger、task、project、dashboard、contacts、file、setting…
│                 每个模块自带 components / hooks / store 切片
├── sync/         数据层：api、ws、storage、models，不依赖 React
├── ui/           公共组件、布局原语、主题、弹出层
├── i18n/         i18next 初始化与语言包加载
├── embed/        嵌入容器（EmbedView.web.tsx / EmbedView.native.tsx）
└── platform/     平台能力统一接口：推送、通知、文件、分享、Electron 等
modules/          本地 Expo 模块（Swift / Kotlin）
plugins/          config plugin
locales/          翻译文件
ios-locales/      iOS 权限说明（InfoPlist.strings 各语言）
```

- **依赖方向**：`app → modules → sync / ui / i18n / platform / embed`，反向禁止，用 ESLint 规则强制。`sync/` 不能引用 React
- **平台差异**：用 `.web.tsx` / `.native.tsx`（必要时 `.ios` / `.android`）分文件，业务代码里不散落 `Platform.OS` 判断

## 6. 数据层

协议细节以主仓库旧前端 `store/actions.js` 的 `call` 和 `websocketConnection` 为准；rn-next 分支的 `src/sync/` 已实现并联调过大部分内容。

- **请求**：请求头 `dootask-token`、`language`、`version`、`platform`，以及当前 WebSocket 连接的 `fd`（服务端据此不把操作结果推回发起者）。响应 `{ret, msg, data}`，`ret !== 1` 转成带类型的错误
- **全局返回码**：`-1` 登录失效；`-2` / `-3` 需先设置昵称 / 联系电话，填完重试；`-4001` ~ `-4003` 项目 / 任务 / 会话不存在或无权访问，从本地移除；`-4004` 子任务变更，重拉父任务
- **加密**：服务端开启 `e2e_message` 时，登录、改密、`dialog/msg/*` 等接口走 PGP，格式要与旧前端一致，Hermes 和浏览器用同一份实现
- **WebSocket**：`open` 后记 `fd`；带 `msgId` 的消息回 `receipt`；按 `type` 分发给各 store；断线指数退避重连，重连和回到前台后按最后同步时间增量补齐
- **存储**：token、服务器地址、偏好存键值；会话、联系人、项目列表存结构化缓存，冷启动先画缓存再后台更新；消息按会话分页，只把打开的会话加载进内存；任务、文件等按需拉取，不做离线
- **未读和角标只由数据层计算**：会话列表、Tab 红点、App 角标、桌面托盘都从同一个 selector 取值

## 7. 布局、导航与交互

**按窗口宽度切换，不看设备类型**，同一路由在各档下 URL 不变：

| 断点 | 主框架 | 二级内容 |
| --- | --- | --- |
| 窄屏 < 768 | 底部 Tab | 整页推入，支持侧滑返回 |
| 中屏 768–1199 | 图标侧栏 + 列表栏 | 列表右侧显示详情 |
| 宽屏 ≥ 1200 | 完整侧栏 + 可拖宽的列表栏 | 详情区；任务详情可再开右侧栏或弹窗 |

布局原语：`AppFrame`（主框架）、`ListDetail`（列表 + 详情，窄屏两级页、宽屏分栏）、`Sheet`（窄屏底部弹层、宽屏居中弹窗或右侧抽屉）。

**设计**：手机上按 iOS / Android 习惯设计，旧网页只当功能清单，不照搬布局（见 [ui-spec.md](./ui-spec.md)）；宽屏按桌面习惯设计。

**桌面交互**必须在底座阶段就有：右键菜单、键盘快捷键、悬停态和悬停提示、拖拽上传、文本选择和复制。约定（`src/ui`，App 上都是空操作）：

- 快捷键用 `useShortcut('mod+k', handler)` 注册，`mod` 在 Mac 上是 Command、其他系统是 Ctrl；同一组合以最后注册的为准；弹出层打开期间暂停；输入框里只响应带 Ctrl / Alt / Command 的组合。菜单项的 `shortcut` 只负责显示
- 界面文字默认不能选中，消息、任务描述等内容文字用 `<Text selectable>` 打开；输入框不受影响
- 拖文件上传用 `DropZone`；拖到拖放区外面松手不会打开文件；文件夹不接收，交给调用方提示

**弹出层**（菜单、确认、提示、气泡）在 `src/ui` 统一实现，页面写法与运行端无关：

| 组件 | Web / 桌面 | App |
| --- | --- | --- |
| 下拉 / 右键菜单 | 自绘菜单，支持子菜单 | 系统原生菜单（iOS UIMenu、Android 弹出菜单），从触发元素位置弹出 |
| 确认（原「气泡确认」） | 锚在按钮旁的气泡 | 系统确认框 |
| 悬停提示 | 全页共用一个提示层 | 不显示 |
| 自定义内容的气泡 | 自绘 | 自绘 |

为此**菜单项用数据描述**：文字、lucide 图标、命令、禁用、分隔线、打勾、危险色、子菜单、快捷键提示。图标传组件而不是名字（按名字查表会把整个图标库打进包），只在自绘菜单上显示，原生菜单不带图标。需要自定义内容的菜单只能自绘，不走原生。原生菜单使用系统样式，不追求和 Web 长得一样。

**弹出层性能**：不打开不渲染；滚动、缩放、点外面关闭等监听只在打开期间注册；悬停提示全页共用一个实例。

## 8. 国际化

用 i18next + react-i18next，不再沿用旧前端「中文原文当键」的 `$L()` 方案。

- **语义键 + 命名空间**：`t('task.count', { count })`，命名空间按业务模块分（`common`、`task`、`messenger`…），每种语言、每个命名空间一个 JSON，按需加载
- **插值用命名参数**，复数按 CLDR 规则（`_one` / `_other` 等）；有歧义的短词靠键本身区分语境（`weekday.mon`），不用前缀
- **类型安全**：键和参数由 TS 检查，写错键编译不过
- **语言**：zh（源语言、回退语言）、zh-CHT、en、ko、ja、de、fr、id、ru，与旧前端一致
- **复用旧译文**：新增键时用中文原文到主仓库 `language/translate.json` 查现成译文，查到直接用，查不到再用 AI 翻译补齐
- **检查脚本**接入 CI：缺失的键、各语言缺译、未使用的键
- **后端返回的提示文字**仍由后端按请求头 `language` 翻译，前端直接显示

## 9. 主题

- 设计令牌（颜色、字号、间距、圆角）集中定义，页面不写颜色字面量；取值见 [ui-spec.md](./ui-spec.md)（以 `resources/app/docs/native-ui-spec.md` 为基础，补了宽屏和桌面部分）
- 浅色、深色、跟随系统；品牌色与现有产品一致
- 嵌入的重型网页通过嵌入协议同步主题和语言

## 10. 重型网页嵌入

以下内容继续用网页实现：Web / 桌面端用 iframe，App 端用 WebView，统一由 `EmbedView` 承载：

- 微应用（应用商店插件）
- Office / 文件预览
- 流程图 / 思维导图编辑器
- 甘特图
- 富文本编辑器

这些是新架构下独立构建的网页或外部插件，**不加载旧 Vue 页面**。重写期间还没做到的普通业务页显示占位屏，不临时嵌入旧前端。

宿主与嵌入页通过带版本号的 postMessage 协议通信：宿主下发 `init`（token、语言、主题、用户）、`theme`、`language`；嵌入页上报 `navigate`、`title`、`close`、`changed`。只向同源嵌入页下发 token，微应用按现有方式单独授权，postMessage 校验来源。

**难点在性能**，不在技术：原生页与 WebView 混排时的首屏白屏、内存占用、页面切换卡顿、WebView 复用和预热，要在第一个用到嵌入的里程碑实测并定下做法。

## 11. 后端改动规则

后端在主仓库，改动按主仓库 `CLAUDE.md` 的规矩做，和本项目分开提交。

- **兼容的改动直接改**：加字段、加可选参数、放宽校验等。标准是旧 Vue 前端和已发布的旧版 App 调用时完全不受影响
- **不兼容的改动新增接口**：删字段、改字段含义、改返回结构时，新开接口，旧接口原样保留
- 依赖新接口时：要么提高 App 的最低服务端版本，要么由服务端返回能力开关，不在前端写版本号判断

## 12. 构建、发布与兼容

| 端 | 构建 | 去向 |
| --- | --- | --- |
| Web | `expo export --platform web` | 开发期挂在测试服的 `/next` 内部验证；切换时随服务端一起发版并成为默认前端 |
| 桌面 | 主仓库 Electron 改为打包 Web 构建 | 现有发布渠道与自动更新 |
| iOS / Android | 沿用 `resources/app` 的出包方式（Mac mini 构建） | 包名 / Bundle ID 沿用 `com.dootask.task`，开发版 `com.dootask.task.dev`（`APP_VARIANT=development`） |

- **整体一次性切换**：M0–M4 是内部里程碑，中途不对外发版、不灰度
- **最低服务端版本**：App 内置 `MIN_SERVER_VERSION`，登录前和启动时调 `api/system/version` 检查，低于就提示升级；取值为新客户端首个正式版发布时的服务端版本
- **OTA 热更新**（expo-updates）在 M0 之后决定

## 13. 里程碑

只排顺序、不排工期，工期在 M0 结束后估。

| 阶段 | 内容 |
| --- | --- |
| M0 底座 | 工程、数据层、国际化、主题、布局原语、弹出层、嵌入容器、登录与主框架，见 [m0-plan.md](./m0-plan.md) |
| M1 消息 | 会话列表、聊天、通讯录、推送点击、未读角标（从 App 复制会话 v2 并改造），见 [m1-plan.md](./m1-plan.md) |
| M2 任务 | 仪表盘、任务详情（从 App 复制并改造）、新建任务、个人设置、成员和日期等选择器 |
| M3 项目 | 项目列表、看板（Web 专用拖拽实现）、任务列表视图；甘特图嵌入 |
| M4 收尾 | 文件、日历、工作汇报、会议、应用中心（微应用嵌入）；Electron 改为加载新构建；整体验收后切换 |

每个模块：先从 ai-kb 和 api-map 整理功能清单与业务规则，并对照旧代码核对 → 四端一起实现 → 按 [performance.md](./performance.md) 的清单验收 → 进入下一个。

## 14. 风险

| 风险 | 对策 |
| --- | --- |
| 性能：重渲染、长列表、Web 端动画、WebView 混排 | 性能规范从第一天起执行，每个模块验收都过清单 |
| 漏掉藏在旧代码里的业务规则 | 每个模块的业务规则逐条对照旧代码核对 |
| 两套前端并存，维护成本翻倍 | 新功能只写在本项目；旧前端和 `resources/app` 只修 bug |
| unistyles / MMKV（nitro-modules）与 RN 0.88 不兼容 | 已排除（2026-11-08 安卓模拟器 Release 包 + Web 验证通过）；iOS 待用户验证 |
| react-native-web 下中文输入法合成事件异常 | M0 用输入框样例在 Chrome、Safari、Electron 实测拼音输入 |
| 周期长、中途优先级变化 | 每个里程碑结束都保持可运行；未做的部分用占位屏 |
