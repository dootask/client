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
| W6、W7、W9–W12 | 未开始 | — |

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
