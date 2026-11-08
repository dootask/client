# 可复用代码清单

> 2026-11-08 盘点。上位文档：[m0-plan.md](./m0-plan.md) 第 1 节。
>
> 来源仓库都在主仓库的 `resources/app` 下（下文简称 `app`）：
> - `rn-next`：`feature/rn-next` 分支，提交 `da6404433`，上一轮全端重写的底座
> - `main`：`main` 分支，现有 App（Expo 壳 + WebView，部分页面已原生化）
>
> 结论只有四种：**直接搬**（基本原样复制，只改路径和命名）、**改造后搬**（复制后按本项目规范改，注明要改什么）、**只参考**（看思路和坑，自己重写）、**不要**。
> 「直接搬」也要过本项目的 lint、i18n 和设计令牌规则，有不合规的地方顺手改掉。

## 1. rn-next 分支（`da6404433`）

对测试服联调的情况见主仓库 `feature/rn-next` 分支的 `docs/rn-next/pending-device-verification.md`：API、WebSocket、PGP 已对开发服务端联调通过；所有端上行为（nitro、MMKV、expo-sqlite、openpgp 在 Hermes 上的性能）都**没在真机验证过**。

### 1.1 `src/sync/`（数据层，纯 TS）

| 路径 | 结论 | 说明 | 用于 |
| --- | --- | --- | --- |
| `sync/api/client.ts`、`errors.ts`、`schema.ts` | 直接搬 | 请求头（token / language / version / platform / fd）、`{ret,msg,data}` 解包、全局返回码 -1/-2/-3/-4001~-4004 的钩子、jQuery.param 风格的查询串、超时、加密插件接口，都已按旧前端 `call` 对齐，附 vitest | W4 |
| `sync/api/system.ts`、`user.ts` | 直接搬 | 版本、系统设置、登录、验证码、我的信息；zod 校验返回值 | W4 |
| `sync/api/dialog.ts`、`message.ts` | 留到 M1 | 会话、消息接口，M0 用不到 | M1 |
| `sync/api/__tests__/` | 直接搬 | 含 `live.test.ts`（对真实服务端，需 `LIVE_*` 环境变量），账号只能从不提交的 env 读 | W4 |
| `sync/ws/socket.ts` + 测试 | 直接搬 | 连接、`open` 拿 fd、回执、心跳、指数退避重连、`{{RemoteURL}}` 替换、加密推送解密钩子；WebSocket 实现和前后台事件由上层注入 | W5 |
| `sync/crypto/pgp.ts`、`session.ts`、`encryptor.ts` + 测试 | 直接搬 | 与 PHP 服务端互通已验证；关键点：必须用 openpgp v6 的 `curve25519Legacy`。Hermes 性能未验，W6 实测 | W6 |
| `sync/storage/types.ts` | 直接搬 | `KvStore`（同步）/ `StructuredCache`（异步，主键 + 单索引范围查询）两个接口 | W7 |
| `sync/storage/memory.ts`、`indexeddb.ts`、`appSchema.ts` + 契约测试 | 直接搬 | 内存和 IndexedDB 两套实现跑同一组契约测试（fake-indexeddb） | W7 |
| `sync/storage/localStorageKv.ts` | 改造后搬 | MMKV 4 自带 Web 实现（底层就是 localStorage，见第 5 节验证），统一用 MMKV 的话这个文件可以删掉；若保留自写实现则原样搬。W7 定 | W7 |
| 原生 `KvStore`（MMKV）、原生 `StructuredCache`（expo-sqlite） | 新写 | rn-next 没写（当时为了不引入原生依赖，原生端用的内存 KV，重启丢登录态） | W7 |

### 1.2 `src/embed/`（嵌入容器）

| 路径 | 结论 | 说明 |
| --- | --- | --- |
| `protocol.ts`、`host.ts`、`types.ts` + 测试 | 直接搬 | 协议 v1 信封 `{source,v,type,payload}`，zod 校验来宾消息，宿主控制器与平台无关 |
| `EmbedView.web.tsx`（iframe） | 改造后搬 | 去掉 `withEmbedFlag` 之外的旧页面相关注释和假设；补上 postMessage 来源校验、只向同源下发 token（architecture 第 10 节） |
| `EmbedView.tsx`（WebView） | 改造后搬 | 注释和设计还假设「加载旧 Vue 页面、和 eeui 通道复用」，这条路已经废弃，删掉相关内容；WebView 复用和预热（性能规范第 19 条）在第一个用到嵌入的里程碑再做 |
| `url.ts`（`withEmbedFlag`） | 直接搬 | hash 感知地追加 `?embed=1` |

### 1.3 `src/ui/`

| 路径 | 结论 | 说明 |
| --- | --- | --- |
| `ui/theme/tokens.ts` | 不要（只留断点） | 色值取自旧前端 `var.scss`，和 `app` main 的 `docs/native-ui-spec.md` 不一致（命名、灰阶、深色值都不同）。architecture 第 9 节规定以 native-ui-spec 为准，令牌改从 `app` main 的 `src/ui/tokens.ts` 来（见 2.1）。断点 `{xs:0, md:768, lg:1200}` 保留 |
| `ui/theme/unistyles.ts` | 改造后搬 | unistyles 的类型增强和 `StyleSheet.configure` 写法可用；主题改接新令牌，加上手动切换深浅色（`setAdaptiveThemes(false)` + `setTheme`），偏好存 KV |
| `ui/layout/AppFrame.tsx`、`ListDetail.tsx` | 改造后搬 | 骨架可用；按三档断点重做（中屏图标侧栏、宽屏可拖宽列表栏），窄屏两级页要接 expo-router 的栈 |
| `ui/layout/Sheet.tsx` | 只参考 | 只有定位和遮罩，用的是 RN `Modal`；要和 `app` main 的 `BottomSheet`（拖拽关闭、键盘避让）合并重写 |
| `ui/placeholder/PlaceholderScreen.tsx` | 改造后搬 | 文案改 i18n 键，颜色改令牌 |

### 1.4 `src/modules/`

| 路径 | 结论 | 说明 |
| --- | --- | --- |
| `modules/auth/session.ts`、`api.ts`、`types.ts` + 测试 | 改造后搬 | 状态机 `loading / needServer / needLogin / blocked / authed`、版本门禁、token 回写都可用；按 architecture 改为 zustand store（现在是自写订阅），`MIN_SERVER_VERSION` 从配置注入 |
| `modules/shell/tabs.ts` | 改造后搬 | 五个 Tab 的元数据；`label` 改成 i18n 键，加 lucide 图标名 |
| `modules/messenger/` | 留到 M1 | 51 个纯函数文件 + 测试（会话合并、未读、草稿、菜单等），M1 再逐个评估 |

### 1.5 其他

| 路径 | 结论 | 说明 |
| --- | --- | --- |
| `src/app/runtime/`（AppRuntime、authContext、i18nContext、socketContext、apiClient） | 只参考 | 用 React Context 串起来的装配层，本项目改用 zustand + 模块化初始化；`authContext` 里规避 react-hooks 规则的写法可参考 |
| `src/app/(auth)/`、`src/app/(main)/` | 只参考 | 路由结构和登录流程（懒加载验证码、`loginErrorCode==='need'`）可参考，页面按本项目设计重写 |
| `src/config.ts` | 改造后搬 | 只留 `APP_VERSION_*`、`MIN_SERVER_VERSION`、DooPush 客户端凭证；`LOCAL_WEB_*`、`MAIN_WEB_URL`、`SHELL_VERSION`、`FIRST_PAGE_NAME` 都是 eeui 壳的东西，不要 |
| `src/i18n/` | 不要 | 旧 `$L()` 方案（m0-plan 已注明） |
| `scripts/build-i18n.mjs`、`scan-lang.mjs` | 只参考 | 读 `language/translate.json` 的逻辑可借来写「按中文原文查旧译文」工具；门禁要按新的语义键方案重写 |
| `src/bridge/`、`src/shell/`、`src/native/legacy*`、`src/devtools/`、`bridge-test` / `dev-eval` / `web` 等页面 | 不要 | 为旧前端存在的代码 |
| `vitest.config.mts` | 直接搬 | — |

## 2. `app` main 分支

### 2.1 `src/ui/`（公共 UI）

都依赖 eeui 桥（`useAppTheme`、`showToast`、`shellRequest` 取译文），搬时一律把这些依赖换掉：主题从 unistyles 取，提示走本项目的弹出层，文案走 i18next。

| 文件 | 结论 | 说明 |
| --- | --- | --- |
| `tokens.ts` | 改造后搬 | **设计令牌的来源**，与 `docs/native-ui-spec.md` 一一对应（浅色 / 深色、字号、间距、圆角、按下态）。去掉 `useAppTheme`，改成 unistyles 主题；`Platform.OS` 分支挪到 `.native` / `.web` 文件；宽屏补桌面需要的令牌（悬停态、焦点环、菜单阴影） |
| `Icon.tsx` | 直接搬 | lucide 统一线宽 1.75 |
| `Avatar.tsx` | 改造后搬 | 规则与网页一致；颜色改令牌引用 |
| `TapPressable.tsx` | 直接搬 | 移动超阈值不算点按 |
| `Chip.tsx`、`List.tsx`、`PageHeader.tsx`、`FilledInput.tsx` | 改造后搬 | 去掉桥依赖；宽屏补悬停态 |
| `Dialog.tsx`、`ModalStack.tsx`、`InputSheet.tsx`、`BottomSheet.tsx` | 改造后搬（W9） | 原生弹层栈（`FullWindowOverlay`）和手势回弹调得很细，原生端直接用；Web 端的锚点气泡、自绘菜单另写 `.web.tsx`。按 architecture 第 7 节：原生的确认改走系统确认框，`Dialog` 只保留自定义内容的场景 |
| `ShimmerText.tsx` | 改造后搬 | 常驻循环动画，Web 端要改 CSS 动画（性能规范第 8 条）；M1 用到时再搬 |
| `DateTimePicker.tsx` | 留到 M2 | 依赖 `react-native-ui-datepicker` 和旧语言转换 |
| `useCloseSelf.ts`、`useRevealSelected.ts` | 直接搬 | 用到时搬 |
| `i18n.ts` | 不要 | 通过 WebView 取译文 |

### 2.2 `modules/`（本地 Expo 模块）

| 模块 | 结论 | 说明 |
| --- | --- | --- |
| `input-line-height` | 直接搬 | 输入框行高修正（iOS 光标、空输入框行高），M1 会话输入框需要 |
| `mention-input` | 直接搬 | 退格整段删除 @ 提及，M1 |
| `keyboard-dock` | 直接搬 | iOS 会话页底部坞跟随键盘，M1，和 `packages/chat-ui` 一起 |
| `share` | 改造后搬 | 系统分享接收（含 iOS Share Extension），接收后改走本项目路由和数据层；M1 |
| `meeting` | 直接搬 | 会议 Android 前台保活；会议页的时间点另定 |
| `web-server`、`shared-webview`、`page-lifecycle`、`legacy-store`、`legacy-location` | 不要 | 为加载旧前端存在。`legacy-store` 里读旧 eeui 缓存的能力：切换上线时如需迁移旧登录态再单独评估 |

### 2.3 `plugins/`（config plugin）

| 插件 | 结论 | 说明 |
| --- | --- | --- |
| `with-text-bounds.js` | 直接搬 | Android 15 文本按墨迹边界断行导致被裁，W1 就带上 |
| `with-release-strip-order.js` | 直接搬 | Release 包残留 `_expo._tcp` 的修复 |
| `with-device-orientation.js` | 直接搬 | iPhone 只允许正向竖屏 |
| `with-window-controls.js` | 直接搬 | iPadOS 窗口控件紧凑样式 |
| `with-share.js`、`with-meeting.js` | 直接搬 | 跟对应模块一起搬 |
| `with-legacy-launcher.js` | 直接搬 | 保留旧 `.WelcomeActivity` 别名，否则覆盖安装后用户桌面快捷方式失效。包名沿用 `com.dootask.task`，这个必须带上 |
| `with-legacy-splash.js` | 改造后搬 | 启动图资源可用；是否沿用旧启动图样式等出图标启动图时一起定 |
| `with-web-assets.js` | 不要 | 往包里塞旧前端 |

### 2.4 `patches/`

| 补丁 | 结论 | 说明 |
| --- | --- | --- |
| `@react-native+virtualized-lists+0.88.0.patch` | 直接搬 | 列表开头插入时跳位（性能规范第 13 条） |
| `react-native-keyboard-controller+1.22.7.patch` + `react-native-screens+4.30.0.patch` | 直接搬 | 一对：iOS 侧滑返回前立刻收起键盘 |
| `react-native-webview+14.0.1.patch` | 改造后搬 | 384 行，混了两类：音视频权限回调、Android 程序聚焦弹键盘、iOS 键盘滚动露出输入框（嵌入页需要，保留）；长按消费、文档起始脚本注册顺序（为旧前端和 eeui，去掉）。W10 用到 WebView 时拆 |
| `expo-audio+58.0.11.patch` | 直接搬 | 录音时允许触感，M1 语音消息 |
| `react-native-agora+4.6.4.patch` | 直接搬 | 头文件路径，随会议 |

### 2.5 配置、资源、出包

| 项 | 结论 | 说明 |
| --- | --- | --- |
| `app.config.ts` | 改造后搬（W1） | 保留：包名和开发版变体（`APP_VARIANT`、`com.dootask.task(.dev)`、`group.im.dootask(.dev)`）、scheme `dootask(-dev)`、Team ID、`CFBundleLocalizations`、ATS、隐私清单、`allowBackup:false`、混淆规则、Agora 剔除扩展、推送厂商读取。去掉：`with-web-assets`、本地 Web 服务的明文流量说明（是否仍需明文流量要看自部署 http 服务器，保留开关并改注释）。`platforms` 加 `web`。插件列表随 M0 实际依赖增减，没用到的原生依赖（agora、camera 等）先不装 |
| `locales/*.json`（iOS 权限说明 10 种语言） | 直接搬到 `ios-locales/`（`locales/` 已是翻译目录），定位文案等签到功能做时再加 | `app.config.ts` 的 `locales` 用 |
| `assets/icon.png`、`android-icon-*`、`splash-icon.png`、`favicon.png`、`assets/splash/` | 直接搬 | 图标和启动图 |
| `assets/meeting`、`menu`、`navbar`、`scanner` | 不要 / 用到再看 | `menu`、`navbar` 是 WebView 壳的按钮图；会议、扫码到时用 lucide 能替代就不搬 |
| `assets/web/` | 不要 | 内置的旧前端 |
| `push/android/`（`vendors.json` + 华为、魅族配置） | 直接搬 | 厂商客户端参数，非机密 |
| `src/features/push/`、`notifications/` | 改造后搬 | DooPush 注册、上报设备、点击通知的流程可用；去掉桥（`registerMessage`、`bridgeStore`），改由登录状态驱动、点击通知直接走 expo-router 路由。放 `src/platform/push` |
| `src/native/deepLink.ts`、`linkRouting.ts` | 只参考 | 初始 URL 与 url 事件去重、旧 scheme 兼容的坑可参考；本项目深链直接交给 expo-router |
| `src/native/orientation.ts` | 直接搬 | 平板按最小宽度解锁旋转 |
| `src/native/appUniqueId.ts` | 直接搬 | 与旧前端一致的设备 ID 字符表 |
| `src/native/SwipeBack.tsx`、`KeyboardInset.tsx`、`windowState.ts`、`webServer.ts`、`legacyCache*` | 不要 | 为 WebView 壳存在 |
| `scripts/pack.sh`、`mac-build.sh` | 只参考 | 本项目的出包脚本自己写（已有 `app-build` 技能定流程）；注意清空目录的安全规则 |
| `scripts/android-signing.gradle` | 直接搬 | Gradle init script 注入正式签名，不改生成的工程 |
| `scripts/configure-ios-signing.js`、`prepare-ios-signing.py` | 只参考 | 上架用；内测包按 `app-build` 技能走自动签名 |
| `docs/native-ui-spec.md` | 改造后搬 | 搬成本项目的 `docs/ui-spec.md`，补宽屏 / 桌面部分（悬停、右键菜单、焦点、三档布局） |
| `packages/chat-ui/` | 留到 M1 | **只用于原生端**（iOS / 安卓）。网页端的消息列表参考 Happy Next 的 `ChatList.web.tsx`、`chatListVirtualModel.ts`、`scrollDistanceController.ts` 另写，两端对外都用 `ChatView` 的接口，见 architecture.md 第 4 节的「聊天消息列表」 |
| `src/features/dialog/`、`src/features/task/` | 留到 M1 / M2 | m0-plan 已定 |
| `src/bridge/`、`src/features/shared-webview/` | 不要 | architecture 第 3 节 |

## 3. 依赖版本

以 `app` main 的 `package.json` 为准（Expo `~58.0.14`、RN `0.88.0`、React `19.3.0`、reanimated `4.7.1`、worklets `0.13.0`、gesture-handler `~3.3.0`、TypeScript `~6.0.3`）。rn-next 额外加过的：`react-native-unistyles`、`react-native-nitro-modules`、`react-native-edge-to-edge`、`react-native-web`、`@expo/metro-runtime`、`openpgp`、`zod`、`vitest`、`fake-indexeddb`。本项目再加 `react-native-mmkv`、`zustand`、`i18next`、`react-i18next`、`@shopify/flash-list`。

unistyles、MMKV、nitro 不在 Expo SDK 58 的 `bundledNativeModules.json` 里，`npx expo install` 会装最新版；验证用的版本见第 5 节，引入时（W3 / W7）按这个版本锁定。W1 只装了工程骨架需要的 Expo、路由、Web 相关依赖，版本都对齐 `resources/app` 的 `package-lock.json`。

## 4. 版本号来源（2026-11-08 定：A，跟服务端同号）

现状：`app` 的 `app.config.ts` 读本仓库的 `version.json`（由主仓库 `./cmd expo build` 写入，内容就是主仓库 `package.json` 的 `version` 和 `codeVerson`，现在是 `1.10.38` / `247`），即 **App 版本号 = 服务端版本号**。

本项目的约束：

- 包名沿用 `com.dootask.task`，Android `versionCode` 和 iOS 构建号必须大于已发布的旧 App（≥ 248），否则覆盖安装失败、商店拒收
- 切换后 Web 构建随服务端一起发版，App 单独上架

两种做法：

| 做法 | 说明 |
| --- | --- |
| **A. 继续跟服务端同号（已选）** | 本项目根目录放 `version.json`，发版时从主仓库同步（和现在一样）。用户看到的 App 版本与服务端一致，客服排查简单；`MIN_SERVER_VERSION` 与自身版本的关系也直观。M0–M4 期间不对外发版，开发包里用当前主仓库版本即可 |
| B. 独立版本号 | 本项目 `package.json` 的 `version` 自己维护（如 2.0.0 起），构建号从 300 起递增。App 和服务端各自迭代，但需要在关于页同时显示服务端版本，排查时多一步 |

## 5. 风险依赖验证：unistyles 3 + MMKV 4（nitro-modules）

2026-11-08 验证，**结论：都能用，维持原选型**。结论已同步到 architecture.md 第 4 节和第 14 节。

**环境**：一次性验证工程（不进仓库），Expo `~58.0.14`、RN `0.88.0`、React `19.3.0`、reanimated `4.7.1`、worklets `0.13.0`，加上 `react-native-unistyles@3.8.1`、`react-native-mmkv@4.3.2`、`react-native-nitro-modules@0.37.2`、`react-native-edge-to-edge@1.8.2`。`newArchEnabled=true`、Hermes。Android 用 **Release 包**（JS 打进包里，比开发包更接近正式环境），在 Mac mini 的 Android 15 模拟器（arm64）上跑。

**构建**：prebuild 和 Gradle 没有报错，构建日志有 `[NitroModules] 🔥 unistyles is boosted by nitro!`，只有上游的 Kotlin 废弃警告。首次完整构建 3 分 21 秒。

| 检查项 | Android（Release） | Web（`expo export`） |
| --- | --- | --- |
| 启动、无崩溃 | ✅ | ✅ |
| unistyles 主题：`StyleSheet.create((theme, rt) => …)` | ✅ | ✅ |
| 跟随系统深浅色（`adaptiveThemes`，`cmd uimode night yes/no`） | ✅ 立即切换 | —（没测系统深色） |
| 手动切换：`setAdaptiveThemes(false)` + `setTheme`；手动模式下系统变化不影响 | ✅ | ✅ |
| 恢复跟随系统 | ✅ | — |
| 断点（xs / md / lg）：横屏 914dp 时从 xs 切到 md，样式跟着变 | ✅ | ✅（500 → 900px） |
| `rt.insets`（边到边下的安全区） | ✅ | ✅ |
| MMKV：string / number / boolean / ArrayBuffer、缺失键、remove / contains、getAllKeys、clearAll | ✅ | ✅ |
| MMKV 持久化：杀进程和覆盖安装后数据还在 | ✅ | ✅（刷新页面） |
| MMKV 加密实例（`encryptionKey`） | ✅ | ❌ Web 不支持，会抛错 |
| `addOnValueChangedListener` | ✅ 回调是**异步**的（nitro 把回调排到 JS 线程，约 46ms 后到达） | ✅ 同步 |
| `useMMKVString` hook 写入、重启后读出 | ✅ | — |
| 1 万次写 + 读 | 约 40–45 ms | 约 214 ms |

**写代码时要注意**：

- MMKV 的 `addOnValueChangedListener` 在原生端是异步回调，不能写成「set 完马上检查回调有没有到」这类同步逻辑；Web 端是同步回调，两端时序不同
- `encryptionKey` 只在原生端用；Web 端的 KV 不加密（反正底层是 localStorage）
- Web 端 MMKV 就是 localStorage 的封装，所以 W7 可以统一用 MMKV，rn-next 的 `localStorageKv.ts` 不用再搬（见 1.1）
- unistyles 的 Babel 插件要配 `root: 'src'`；在 `useUnistyles()` 拿 `rt` 的组件，主题和断点变化时会重渲染（验证页每次切换渲染次数 +1），只用 `StyleSheet.create` 的组件不会重渲染，与性能规范第 6 条的方向一致
- 没测的：iOS（交给用户）、系统字号缩放、Web 端跟随系统深色。截图在 `tests/playwright-results/m0-nitro-probe/`（不进 git）
