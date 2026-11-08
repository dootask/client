# M0 进度与发现

> 按工作项记录验收结果和过程中的发现；计划和验收标准见 [m0-plan.md](./m0-plan.md)。

| # | 状态 | 提交 |
| --- | --- | --- |
| 第 1 节（复用清单、风险依赖验证） | ✅ | `f5f83a8` |
| W1 工程初始化 | ✅ | `37a58e0` |
| W2 工程约束 | ✅ | 见 git log |
| W3 主题与布局原语 | ✅ | 见 git log |
| W8 国际化（提前和 W3 一起做） | ✅ | 见 git log |
| W4 数据层 API | ✅ | 见 git log |
| W5 数据层 WebSocket | ✅ | 见 git log |
| W6 | 暂停：加密方案重新设计 | 不再沿用 PGP、不兼容旧前端，方案在主仓库讨论，定了再做。已知：Hermes 没有 `crypto`（无 `getRandomValues`、无 `subtle`），新方案也要解决随机数来源 |
| W7 本地存储 | ✅ | 见 git log |
| W9 弹出层 | ✅ | 见 git log |
| W10 嵌入页协议 | ✅ | 见 git log |
| W11 登录与主框架 | ✅ | 见 git log |
| W12 桌面浏览器交互 | ✅ | 见 git log |

## W1 工程初始化

- Web 开发页在 Metro 根路径打开；导出产物挂到 `/next` 下能访问、深链刷新正常、页内跳转正常（`npm run web:preview`）
- 安卓开发包（`com.dootask.task.dev`，Debug）在 Mac mini 模拟器上通过 2210 外网地址连上 Metro，新架构（`fabric: true`）
- 发现：expo-router 开发模式不处理 `baseUrl`；`EXPO_PACKAGER_PROXY_URL` 只从命令行环境读；`npx expo install` 会装比 `resources/app` 新的补丁版本。都已写进 [dev.md](./dev.md)

## W2 工程约束

- `npm run check` = `typecheck` + `lint`（`--max-warnings 0`）+ `test`（vitest），翻译检查在 W8 加进来
- ESLint 规则（`eslint.config.js`）：
  - 依赖方向：`import/no-restricted-paths`，按 architecture.md 第 5 节分层
  - `sync` 不能引用 `react`、`react-native`、`react-dom`；MMKV、expo-sqlite 这类原生模块不是 React，允许
  - `src/app`、`src/modules` 里禁止 `Platform.OS` / `Platform.select`，平台差异分文件写
- 验证：临时写 5 个违规文件（sync 引 modules 和 react、ui 引 modules、embed 引 sync、modules 判断平台），7 处全部报错
- vitest 暂时开着 `passWithNoTests`，W8 有了第一个测试后已去掉

## W3 主题与布局原语

- 令牌在 `src/ui/theme/tokens.ts`（颜色、字号、间距、圆角、尺寸、透明度、阴影），平台差异（弹层圆角、触控尺寸）分 `platform.ios/android.ts` 和 Web 默认；断点 xs 0 / md 768 / lg 1200
- unistyles 在入口 `index.ts` 最先配置，早于任何 `StyleSheet.create`；深浅色：跟随系统 / 浅色 / 深色，切换不重渲染组件
- `AppFrame`：窄屏底部 Tab、中屏图标栏、宽屏侧栏，内容区位置固定，切断点不重新挂载；导航用 expo-router 的无头 Tabs
- `ListDetail`：窄屏两级页、中屏固定列表栏、宽屏可拖动调宽（260–480）；真实用例是设置页（主题、语言）
- `Sheet`：窄屏底部弹层（可下拉关闭）、中宽屏居中弹窗或右侧抽屉；进出场用 Reanimated CSS 过渡
- Web 验收（Playwright，截图在 `tests/playwright-results/w3-*`）：1400 / 1000 / 390 三档切换布局正确、URL 不变；深色立即生效；宽屏拖动调宽、上下限生效、光标为 col-resize；窄屏子页返回回到设置菜单
- 发现：
  - **`GestureHandlerRootView` 等第三方组件不经过 unistyles 的 babel 插件**，传 unistyles 样式在 Web 上不生效（整页高度塌掉）；第三方组件只给普通样式，unistyles 样式放里层 `View`
  - **同一个 `Animated.View` 上同时放 unistyles 样式和 `useAnimatedStyle`，Web 上动画样式不生效**；拆成两层：外层只放动画样式，里层放 unistyles 样式
  - RN 的 `cursor` 类型只有 `auto` / `pointer`，Web 专用光标放 `.web.ts` 文件
  - 安卓非整数密度（2.625）下行高 52dp = 136.5px，相邻行取整重叠 1px 盖住细分割线；列表行高用 `PixelRatio.roundToNearestPixel` 对齐整像素
  - 嵌套 Stack 用 `unstable_settings = { anchor: 'index' }`，深链直接进子页时栈底也有首页（`initialRouteName` 已弃用）
- 安卓验收（Mac mini 模拟器，重出了开发包，新增的原生依赖都在里面）：全面屏和安全区正确，Tab、设置两级页、系统返回键、深色立即生效（状态栏跟随）、语言切换立即生效
- 留到后面：主题模式、语言、列表栏宽度的持久化（W7 键值存储）；Sheet 的键盘避让、多层叠放和真实场景验收（W9，同时检查上面两条 Web 样式问题在 Sheet 上的表现）；中文输入法合成事件验证（W11 登录页有真实输入框时做）

## W4 数据层 API

- `src/sync/api`：`createApiClient`（请求头、jQuery.param 查询串、Date 序列化、30 秒超时、加密插件接口留给 W6）+ 系统设置 / 版本、登录 / 验证码 / 注册状态 / 我的信息 / 退出；返回值用 zod 校验，未声明字段原样保留，PHP 下标不连续输出成对象的列表统一转数组
- 由 rn-next 搬过来时改的：
  - **sync 层不写提示文字**：`ApiError` 带 `kind`（`network` / `invalid` / `server` / `no-server`），界面层按 kind 翻译；`server` 的 message 是服务端按 `language` 请求头翻译好的原文。原来客户端失败也用 `ret = -1`，上层按 -1 判断登录失效时会把断网误当掉登录，现在客户端失败一律 `ret = 0`、只看 kind
  - 超时覆盖到读响应体；响应缺 `ret` 算 `invalid`；`-2` / `-3` 用户取消补填时原样抛服务端错误；`platform` 限定为服务端认的五种取值
- vitest：请求头（全部字段、每次现取）、错误分类（四种 kind + 超时）、全局返回码（-1 / -2 / -3 / -4001~-4004 及开关）、四组接口的 schema
- 测试服联调：`LIVE_SERVER=… LIVE_EMAIL=… LIVE_PASSWORD=… npx vitest run live`（账号只放命令行环境变量）—— 公开接口、错误密码、未登录 -1、管理员登录并取我的信息全部通过
- 留到 W11：界面层按 kind 出提示语的翻译键、`onAuthLost` / `onNeedProfile` 的实际处理

## W5 数据层 WebSocket

- `src/sync/ws`：连接地址与旧前端一致，收到 `open` 记 `fd`（供 API 请求头）、`handshake` 回执、业务推送带 `msgId` 回 `receipt`、`{{RemoteURL}}` 替换、3 秒内重复帧去重、`type=encrypt` 推送解密钩子和公钥上报（W6 接）、按 `type` 订阅分发；断线指数退避（1~30 秒，50% 抖动）重连，重连成功带 `reconnect=true` 供上层增量同步；前后台、网络变化由上层调 `check()`
- 由 rn-next 搬过来时改的：
  - **帧和断开事件排队按到达顺序处理**：原来加密帧异步解密时，后到的明文帧会先分发；断开事件也进队列，保证服务端「先推 error 再断开」时先处理 error
  - 解密期间连接已换时，旧连接的帧丢弃（不分发、不回执）
  - 新增连接超时（默认 15 秒收不到 `open` 按断线处理）：网络半通时既不 open 也不 close，原来会一直卡在 connecting
- 核对服务端：只有 `handshake` 和服务端不认识的类型会回执，`path`、`encrypt` 不回执，`request()` 只用于 handshake
- vitest（假 socket）：地址与 fd、退避序列与重置、回执乱序对应、回执超时与断线 reject、业务回执与 `{{RemoteURL}}`、重复帧、服务端拒绝后不重连、check 与 disconnect、公钥上报与解密、解密乱序、旧连接帧丢弃、连接超时、心跳发现无 close 的断线
- 测试服联调（`npx vitest run live`）：外网 wss 和本机 http 都能连上、拿到 fd、握手回执；**断网恢复**：中间插 TCP 转发，切成「连接不断、数据全丢」（手机丢信号时客户端收不到 close），心跳握手超时后进入重连，断网期间一直连不上；恢复后自动重连成功，拿到新 fd、`reconnect=true`、握手正常
- 发现（主仓库后端，未改）：**退出登录后旧 token 仍能建立 WebSocket**。`users/logout` 只删设备记录，HTTP 接口随即返回 -1，但 `WebSocketService::onOpen` 只校验用户、邮箱和 encrypt，不看设备，旧 token 仍能连上收推送。客户端退出时会主动断开，不影响本项目；是否修后端由用户决定

## W8 国际化

- i18next + react-i18next，命名空间 `common` / `shell` / `setting`，源语言（简体中文）打进主包，其他 8 种语言按"语言 × 命名空间"单独成块按需加载；设备语言用 `Intl` 读，不加 expo-localization
- 键有类型：`useT()` 返回的 `t` 只接受存在的键（`'ns:key'`，common 可省前缀），写错编译不过（已验证）
- `npm run i18n:check`（已并入 `npm run check`）：各语言键集与源语言一致、无空译文、插值参数一致、无未使用的键；故意删一条英文译文并加一个未使用的键，报 10 处并退出 1（已验证）
- `npm run i18n:find -- <中文原文>`：到主仓库 `language/translate.json` 查现成译文
- 安卓：设备语言为中文时直接显示中文；切到 English 立即生效
- Web 验收：9 种语言逐个切换立即生效，`<html lang>` 同步，语言包按需请求（截图 `tests/playwright-results/w8-*`）

## W7 本地存储

- `src/sync/storage`：键值存储（MMKV，同步读写，Web 落到 localStorage）存偏好和登录状态；缓存库按集合声明主键和索引（`appSchema.ts`），App 用 expo-sqlite、Web 用 IndexedDB，同一套接口（`get` / `put` / `putMany` / `query` / `remove`）
- 主题模式、语言、列表栏宽度已持久化，冷启动在首屏渲染前恢复，不闪
- vitest：两套实现跑同一组用例（Web 用 fake-indexeddb）
- 安卓：键值存储冷启动后计数递增、缓存 1000 条消息冷启动后仍在
- 发现：**`putMany` 逐条 `runAsync` 时安卓写 1000 条要 2.8~3.2 秒**（每条一次原生桥调用）。改成一条语句插多行（每条语句不超过 999 个绑定参数，自动分批），同一事务里写完，**降到 181~197ms**；补了"同批主键重复以后者为准""超过参数上限分批全部写入"两个用例

## W9 弹出层

- `src/ui/popover`：`Menu`（下拉 / 右键菜单）、`Confirm`（确认）、`Popover`（气泡）、`Tooltip`（悬停提示）
  - Web / 桌面：自绘，锚在触发元素旁，键盘可操作（方向键、回车、Esc），点外面关闭，右键菜单跟随鼠标位置
  - iOS：系统菜单（UIMenu，长按为系统上下文菜单）；安卓：本地模块 `modules/menu` 的 PopupMenu，跟随应用深浅色；确认用系统 Alert
- 弹出层只在打开时渲染，不打开不挂任何监听（性能规范）
- 发现：**出包时排除 `ios` / `android` 只能排除根目录**。原来的写法把 `modules/menu/android` 也排除了，安卓开发包编译通过，运行时报 `Can't find ViewManager 'ViewManagerAdapter_DooTaskMenu'`；已改 dev.md 和 app-build 技能的说明
- 发现：**Expo 原生视图的事件不能叫 `onSelect`**。它和 RN 自带的冒泡事件 `topSelect` 重名，新架构下报 "Event cannot be both direct and bubbling"；本地模块的事件改名为 `onAction`（iOS、安卓同改）
- 安卓验收（截图 `tests/playwright-results/w9-android-*`）：点按弹出系统 PopupMenu（禁用项置灰、分组分割线、子菜单箭头、危险项红色），选中回调正确；长按弹出上下文菜单；确认框见 W11 退出登录

## W10 嵌入页协议

- `src/embed`：宿主与嵌入页之间的消息协议（初始化、主题、语言、请求 / 回复、事件），Web 用 iframe + postMessage，App 用 react-native-webview；带 vitest
- 验收页 `embed-check` + `public/embed-test.html`：初始化参数、主题和语言切换实时同步、嵌入页发给宿主的消息都收到
- 安卓验收（截图 `tests/playwright-results/w10-android-*`）：WebView 收到初始化参数；切主题、切语言实时送达；navigate / title / changed / close 四种消息宿主都收到；嵌入页要求跳站外地址被拒；服务器与嵌入页跨源时不下发 token

## W11 登录与主框架

- 页面：服务器地址 → 登录 → 主框架；服务器版本低于最低要求时进升级提示页。路由守卫用 `Stack.Protected`，登录状态一变自动切换，已登录打开 `/login` 回主框架，退出后返回键不会回到主框架
- 登录状态（`modules/session`）：服务器、token、我的信息存在键值存储里，模块加载时同步读出，冷启动直接按已登录渲染；后台核对服务器版本并刷新我的信息（服务端换发的 token 会存下）
- 服务器地址：去掉结尾斜杠和 `/api`，没写协议先试 https 再试 http；取到版本号才算连上；换了服务器原登录作废。Web 部署在服务端 `/next` 下时，第一次打开静默试页面所在站点，成功就跳过填地址
- 登录：邮箱失焦时问服务端要不要验证码，登录时服务端说要也会出；点图片换一张，带验证码失败后自动换一张并聚焦
- 身份失效（-1）：只在失效的正是当前 token 时清登录（退出后迟到的旧请求不会误伤新登录），登录页显示服务端给的原因
- 补填昵称 / 电话（-2 / -3）：全局对话框，填好后原请求自动重试；昵称、电话都缺时依次弹出；取消则原请求得到服务端的错误
- 设置页加了当前账号和退出登录（确认后退出；不等服务端返回，断网也能退）
- vitest：地址规范化、登录状态存取（换服务器、换发 token、清登录）
- Web 验收（截图 `tests/playwright-results/w11-*`）：页面所在站点试连失败回落到填地址、无效地址提示、填测试服地址（带 `/api/`）连上、错误密码、验证码（测试服临时打开 `login_code`，验完改回）、登录、冷启动不闪登录页、退出、身份失效、补填昵称和电话（临时清空管理员资料，用弹窗填回原值）、中文输入法合成中按回车不提交、升级提示（临时调高最低版本）、深色 + 中文、窄 / 中 / 宽三档
- 安卓验收：填服务器、登录、冷启动直接进主框架、设置里退出（系统确认框）、退出后返回键退出应用
- 发现 / 待定：
  - `MIN_SERVER_VERSION` 暂定为开发时对接的 `1.10.38`，正式值等新客户端首个正式版发布时定
  - 后端：`User::auth()` 里"身份已失效,请重新登录"没有按 `language` 请求头翻译（"请登录后继续..."有），英文界面会显示中文原因；translate.json 里有现成译文。未改后端
  - Web 上密码框不在 `<form>` 里，浏览器的密码管理器不一定会提示保存；W12 已处理（见下）
  - 文档里多处引用的 `docs/ui-spec.md` 不存在

## W12 桌面浏览器交互

- 快捷键 `src/ui/shortcuts`：`useShortcut(combo, handler, { enabled })`、`shortcutLabel(combo)`。全页一个 `keydown` 监听，有快捷键注册时才挂；字母数字按物理键位匹配（不受输入法、键盘布局影响）；输入法合成中不触发；弹出层（`aria-modal`）打开时暂停；输入框里只响应带 Ctrl / Alt / Command 的组合。菜单项加了 `shortcut` 字段，自绘菜单靠右显示（Mac 上 `⇧⌘K`，其他系统 `Ctrl+Shift+K`）
- 拖拽上传 `src/ui/DropZone`：只认从系统拖进来的文件，进出子元素不闪，松手交出 `File[]`，文件夹忽略并通知调用方；`BrowserDefaults`（根布局）拦住拖放区外松手打开文件
- 文本选择：界面文字默认不能选中（`BrowserDefaults` 设 `body` 的 `user-select`），内容文字用 `<Text selectable>`；输入框照常可选
- 悬停：`Touchable` 的悬停态、指针样式（react-native-web 的 Pressable 自带）、全页共用的悬停提示（W9）；右键菜单见 W9
- 登录页账号密码包进 `<form>`（`src/ui/Form`，`display: contents` 不影响布局，表单自身提交被拦掉），密码管理器能认出登录表单
- vitest：快捷键解析、匹配（物理键位、修饰键完全一致）、输入框规则、显示文字
- Web 验收（Chrome，截图 `tests/playwright-results/w12-*`）：Ctrl+K / Ctrl+S / `/` / Esc 在页面上触发；输入框里打 `/`、按 Esc 不触发且字照常输入，Ctrl+S 触发并拦住浏览器的"保存网页"；合成中的按键不触发；暂停后不触发；右键菜单打开时 Ctrl+K 不触发，Esc 只关菜单；菜单显示快捷键、方向键 + 回车选中；界面文字双击不选中，内容文字拖选整段，输入框全选正常；悬停底色、指针、提示；拖两个文件进来蒙层出现、进出子元素不闪、松手收到文件名和大小、拖出去蒙层消失、拖文字不出蒙层、拖放区外松手被拦；登录表单在 `<form>` 里、回车提交不刷新页面、布局不变
- 安卓：新组件在 App 上是空操作，开发包启动、登录页渲染正常
- 发现：**react-native-web 的 TextInput 会对所有按键 `stopPropagation`**，冒泡阶段的全局监听收不到输入框里的按键；快捷键监听改用捕获阶段
- 未验：拖入文件夹（自动化无法模拟真实文件夹拖放，逻辑走 `webkitGetAsEntry().isDirectory`），等业务接入时手动验


## M0 收尾

- iOS 开发包（Debug，`com.dootask.task.dev`，对应 `dd3866d`）已放进下载页，团队开发证书签名（method `debugging`），等用户在真机上验收 W9 系统菜单、W10 嵌入页、W11 登录
- 等用户决定：W6 新加密方案（主仓库讨论中）
