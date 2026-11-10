# 开发与构建

> 具体的地址、端口、机器路径、签名文件位置都在 `CLAUDE.local.md`（不进 git）。本文只写流程和踩过的坑。

## 本机（Linux 开发机）

- 代码在本机开发，Metro（含 Web 开发服务）常驻本机
- **Web 开发直连测试服**：测试服后端允许跨域（`Access-Control-Allow-Origin: *`），本机的 Web 开发服务可以直接请求测试服接口，不需要配代理
- **启动 Metro**：`npm start`（`scripts/start.mjs`），原生 bundle 和 Web 开发页共用这一个 Metro
- **Metro 的对外地址**：开发包按这个地址加载 bundle。命令行环境里设了 `EXPO_PACKAGER_PROXY_URL` 就用它；没设时按 `VSCODE_PROXY_URI` 模板和端口推导；两个都没有，就由 Expo 自己取局域网地址。Expo 只从命令行环境读这个变量，写进 `.env` 或 `.env.local` 不生效
- **Metro 端口固定**（端口号见 `CLAUDE.local.md`）：启动脚本写死端口；端口被占用时直接报错退出，不要自动换到下一个端口。外网能访问的端口要单独开放，开发包里也记着这个地址，换了端口就连不上。被占用时先查是谁占的，多半是上一次没关掉的 Metro
- **Web 开发页在根路径打开**（Metro 地址后面直接跟 `/`），不带 `/next`：expo-router 在开发模式下不处理 `experiments.baseUrl`，访问 `/next/` 会显示 Unmatched Route
- **Web 导出和子路径预览**：`npm run web:export` 导出到 `dist/`，`npm run web:preview [端口]` 在本机把它挂到 `/next` 下预览（默认端口 2211），其余地址都回落到 `index.html`，用来验证刷新和深链。`npx expo serve` 不处理子路径和回落，不要用它验证
- 主仓库的前端 dev server 由用户自己运行，不要去启动
- **加翻译**：新键先按中文原文查主仓库的旧译文 `npm run i18n:find -- 设置`（找不到会列出相近的原文），9 种语言写进 `locales/<语言>/<命名空间>.json`；`npm run check` 会检查缺译、未使用的键和插值参数

## 测试分工

- **测试机**（机器名、路径见 `CLAUDE.local.md`）：Web 的 Playwright 测试和安卓模拟器测试都在这台 Mac 上跑；**真机测试包**还在 Mac mini 出（签名证书和正式签名只在 Mac mini 上）
- **执行交给 qoder，判定自己做**：测试步骤写成自包含的说明，用 orchestrator 派给测试机上的 qoder（`dfmodel`）执行，它截图并逐步报 PASS / FAIL；我抽查截图核对结论后才算验收。它能看图，但会有误报（例如把开发启动器的悬浮齿轮按钮当成界面问题，或自己的检测脚本没认出元素就判失败），结论必须对照截图
- **验收和排查分开**：每块的验收（含复测、补验）一律派 qoder；定位问题时的试探操作（查日志、`dumpsys`、试点按）可以自己用 orchestrator 直接跑命令，汇报里注明是排查，不算验收
- **账号密码不进 qoder 的提示词**（模型服务在外部）：登录自己做。Web 用登录脚本保存浏览器状态文件给它复用；安卓用 adb 自己登录，它接着用已登录的 App
- **测试以安卓为主**；iOS 模拟器非必要不测（只影响 iOS 的改动才测，先说明），iOS 真机交给用户
- 测试机上的辅助文件放在测试目录（`~/qa`）：`login-web.mjs`（Web 登录并保存状态）、`ui.sh`（安卓：`dump` 列出屏幕文字和无障碍标签及坐标，`tap <文字>` 点元素，`type <英文>` 输入，`shot <文件>` 截图）、`rn-m2` + `rn-m2.gradle`（见下面的坑）
- 派任务时写明：只读项目目录、只在自己的结果目录写文件、不登出不重装不改系统设置、拿不准就标 INCONCLUSIVE 不要猜 PASS；指定机器用任务的 `target: {type: "machine_id", machineId}`，写成 `machineId` 字段会被派到别的机器

## 测试机和 Mac mini（只构建和运行，不改代码）

通过 orchestrator 操作（全局 orchestrator 技能）。代码在本机打包后传过去，只解包、构建、运行。

### 安卓

- 开发包（`APP_VARIANT=development`，包名 `com.dootask.task.dev`）装到模拟器后连本机 Metro 实时开发；原生代码或原生依赖没变时，只改 JS 不用重新出包
- 模拟器开发包流程：本机打源码包（不含 `node_modules`、根目录的 `ios`、`android`，以及 `.git`、`dist`、`tests`；只排除根目录，`modules/*/android`、`modules/*/ios` 是本地模块的原生代码，必须带上，tar 写 `--exclude=./ios --exclude=./android`）→ 传到 Mac mini 解包 → `export APP_VARIANT=development`，`npm install`，`npx expo prebuild --platform android --clean --no-install` → `cd android && ./gradlew :app:assembleDebug` → `adb install -r` → 用 `adb shell am start -a android.intent.action.VIEW -d "exp+dootask-dev://expo-development-client/?url=<URL 编码的 Metro 外网地址>"` 打开并连上 Metro
- 开发版包名与 `resources/app` 的开发版相同，会覆盖设备上旧的 DooTask (dev)，用户已同意
- 出包流程可参考 `resources/app/scripts/mac-build.sh` 和 `resources/app/docs/dev.md`，本项目的脚本自己写
- **正式签名**不进仓库，放在 Mac mini 本地（位置见 `CLAUDE.local.md`），构建时通过环境变量或 config plugin 注入
- **推送厂商参数**参考 `resources/app/push/android/`

### 真机测试包（iOS / 安卓）

用 `.claude/skills/app-build` 技能（本机文件，不进 git）：出 IPA / APK 放进下载页，由用户自己装到真机测试。安卓模拟器自测不走这个技能。

## 坑

- **全屏编辑器的 WebView 页面是生成的**：`scripts/editor-page.mjs` 把 Quill、mention 插件和 `src/embed/editor/core.ts` 打成一段 HTML，写到 `src/embed/editor/page.generated.ts`（不进 git）。`npm install`（postinstall）、`npm start`、`npm run typecheck` 都会先生成；改了 `core.ts` 后 Metro 已经在跑时，要手动 `node scripts/editor-page.mjs` 或重启 Metro，App 里才看得到。Web 不走这个页面，直接动态加载 `quill.web.ts`
- **`npx expo install` 会装 SDK 里最新的补丁版本**（例如 RN 0.88.1、safe-area 5.11），和 `resources/app` 不一致，补丁文件也对不上版本。装完对照 `resources/app` 的 `package-lock.json` 改回同一版本（`npm install --save-prefix='~' 包@版本`；RN、React 写死版本号）
- **间接依赖也要和 `resources/app` 对齐**：`expo` 写的是 `~` 范围，新装依赖时 npm 会把 `expo-modules-core` 等间接依赖升到最新补丁。58.0.30 引用了 RN 0.88.1 才有的 `RCTStatusBarAppearance`，编译能过，iOS 一启动就因找不到符号闪退（安卓不受影响）。`package-lock.json` 以 `resources/app` 的为底重新生成：复制它的 lock 到临时目录，放上本项目的 `package.json`，`npm install --package-lock-only --ignore-scripts`，再拷回来 `npm install`。之后对照两边 lock，只允许本项目自己声明的依赖版本不同
- **Expo 原生模块也写死成 `resources/app` 的版本**：npm 包里带了预编译好的 AAR（`local-maven-repo/`），它和编译时用的 `expo-modules-core` 版本绑定。expo-sqlite 58.0.15 的 AAR 按 expo-modules-v2 0.2.7 编译，而 expo-modules-core 58.0.22 带的是 0.2.5：编译能过，安卓一启动就报 `Cannot find native module 'ExpoSQLite'`（logcat 里是 `NoSuchMethodError: ...SharedObjectRegistry.register`）。原生模块用 `npm install --save-exact 包@版本` 装成和 `resources/app` 一样的版本；`resources/app` 没有的，装和当前 `expo-modules-core` 同一时期发布的版本
- **iOS 闪退先看崩溃报告**：模拟器装上后 `xcrun simctl launch`，崩溃报告在 `~/Library/Logs/DiagnosticReports/<App>-*.ips`，`asi` 字段里有 dyld 找不到符号这类启动期错误

- **测试机连不上 repo.reactnative.dev**（连接被重置；Maven Central 上的 `react-android`、`hermes-android` 会 301 跳到这里）：Gradle 卡在下载 288 MB 的 debug aar，重试也没用。做法是从 Mac mini 的 Gradle 缓存（`~/.gradle/caches/modules-2/files-2.1/com.facebook.{react,hermes}/...`）把这两个包按 Maven 目录结构整理成本地仓库传过去，构建时 `./gradlew -I <init 脚本> :app:assembleDebug`，init 脚本在 `allprojects.repositories` 里加这个本地仓库并只放行 `com.facebook.react`、`com.facebook.hermes` 两个组。RN 升级后要重新整理。iOS 的 `pod install` 同样卡在这里下载 `reactnative-dependencies` 包
- **测试机上命令行的环境**：Homebrew 在 `/opt/homebrew/bin`，orchestrator 执行的命令默认不在 PATH 里，要自己加；CocoaPods 要 `LANG=en_US.UTF-8`；没有单独装 JDK，`JAVA_HOME` 用 Android Studio 自带的 JBR（Java 25 能编过）；zsh 不会拆分变量里的空格，`A="adb -s x"; $A ...` 会报找不到命令
- **安卓模拟器默认输入法是中文拼音**，`adb shell input text` 打的英文会被转成汉字：输入前 `ime disable` 停用 Gboard，打完 `ime enable` + `ime set` 恢复（`ui.sh type` 已包含）；`input text` 只支持 ASCII
- **开发包第一次打开**会先弹"附近设备"权限和开发菜单引导，点掉即可；开发启动器有个悬浮齿轮按钮（Tools），截图里盖在内容上不是 App 的问题
- **Gradle 守护进程偶尔内存溢出（Metaspace OOM）卡死**：`./gradlew --stop`，杀掉挂住的 gradlew 客户端进程，再重新构建
- **长构建用 `nohup` 后台跑**，日志写 `/tmp`；直接在 orchestrator 里前台跑，守护进程重启会把子进程一起杀掉
- **含清空目录操作的脚本**只能在目标机器的预期目录里用文件路径执行，不能通过 stdin 执行，也不能拿来实测；要验证就用 `bash -n` 或读代码。远程执行清空前，先 echo 出将被删除的路径（2026-10-18 曾两次误删目录）
- **列表在开头插入数据时画面跳走**：根因是 VirtualizedList 条数不变时跳过状态更新，`resources/app/patches/@react-native+virtualized-lists+0.88.0.patch` 已修复，复制消息列表时一起带上；升级 RN 时先看上游是否已修
- **RNGH 的 `activeOffsetX([a, b])`** 表示 dx ≤ a 或 dx ≥ b 即激活，不是区间。写成两个正数会让手势一碰就激活，吃掉内层的点击和长按；单向只写一个正数
- **unistyles 样式只对经过它 babel 插件的组件生效**：`GestureHandlerRootView` 这类第三方组件传 unistyles 样式在 Web 上会丢；同一个 `Animated.View` 上同时放 unistyles 样式和 `useAnimatedStyle`，Web 上动画样式不生效。第三方组件只给普通样式，动画样式和 unistyles 样式分两层
- **对测试服联调接口**：`LIVE_SERVER=<地址> LIVE_EMAIL=<账号> LIVE_PASSWORD=<密码> npx vitest run live`，不带这些变量时 `npm run check` 自动跳过；账号只放命令行环境变量，不写进文件；消息数据层的联调还要第二个账号 `LIVE_EMAIL2` / `LIVE_PASSWORD2`（收发消息的另一方）
- **长按弹出的浮层，状态不要放在大页面组件上**：安卓上按住期间持续有触摸事件，整页重渲染会被反复打断，浮层要等松手才出来（App 闲置几秒后最明显）。状态放进只渲染浮层的小组件，用 ref 打开。模拟器上测长按用 `adb shell input motionevent DOWN/MOVE/UP`，按住期间每 0.1 秒来回挪 1 像素（原地 `input swipe` 时模拟器空闲，JS 计时器会停摆，长按触发不了）；App 里的 `console.warn` 不进 Metro 日志，临时调试可以用 Toast 把时间点显示在屏幕上
- **不要向服务端发送格式非法的 token 做测试**：会让后端 Swoole worker 崩溃（已知问题，属主程序，暂不修）；合法但过期的 token 会正常返回 `-1`
