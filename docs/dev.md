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

## Mac mini（只构建和运行，不改代码）

用于安卓模拟器测试和出 iOS 包，通过 orchestrator 操作（全局 orchestrator 技能）。代码在本机打包后传过去，Mac mini 上只解包、构建、运行。

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

- **`npx expo install` 会装 SDK 里最新的补丁版本**（例如 RN 0.88.1、safe-area 5.11），和 `resources/app` 不一致，补丁文件也对不上版本。装完对照 `resources/app` 的 `package-lock.json` 改回同一版本（`npm install --save-prefix='~' 包@版本`；RN、React 写死版本号）
- **间接依赖也要和 `resources/app` 对齐**：`expo` 写的是 `~` 范围，新装依赖时 npm 会把 `expo-modules-core` 等间接依赖升到最新补丁。58.0.30 引用了 RN 0.88.1 才有的 `RCTStatusBarAppearance`，编译能过，iOS 一启动就因找不到符号闪退（安卓不受影响）。`package-lock.json` 以 `resources/app` 的为底重新生成：复制它的 lock 到临时目录，放上本项目的 `package.json`，`npm install --package-lock-only --ignore-scripts`，再拷回来 `npm install`。之后对照两边 lock，只允许本项目自己声明的依赖版本不同
- **iOS 闪退先看崩溃报告**：模拟器装上后 `xcrun simctl launch`，崩溃报告在 `~/Library/Logs/DiagnosticReports/<App>-*.ips`，`asi` 字段里有 dyld 找不到符号这类启动期错误

- **Gradle 守护进程偶尔内存溢出（Metaspace OOM）卡死**：`./gradlew --stop`，杀掉挂住的 gradlew 客户端进程，再重新构建
- **长构建用 `nohup` 后台跑**，日志写 `/tmp`；直接在 orchestrator 里前台跑，守护进程重启会把子进程一起杀掉
- **含清空目录操作的脚本**只能在目标机器的预期目录里用文件路径执行，不能通过 stdin 执行，也不能拿来实测；要验证就用 `bash -n` 或读代码。远程执行清空前，先 echo 出将被删除的路径（2026-10-18 曾两次误删目录）
- **列表在开头插入数据时画面跳走**：根因是 VirtualizedList 条数不变时跳过状态更新，`resources/app/patches/@react-native+virtualized-lists+0.88.0.patch` 已修复，复制消息列表时一起带上；升级 RN 时先看上游是否已修
- **RNGH 的 `activeOffsetX([a, b])`** 表示 dx ≤ a 或 dx ≥ b 即激活，不是区间。写成两个正数会让手势一碰就激活，吃掉内层的点击和长按；单向只写一个正数
- **unistyles 样式只对经过它 babel 插件的组件生效**：`GestureHandlerRootView` 这类第三方组件传 unistyles 样式在 Web 上会丢；同一个 `Animated.View` 上同时放 unistyles 样式和 `useAnimatedStyle`，Web 上动画样式不生效。第三方组件只给普通样式，动画样式和 unistyles 样式分两层
- **对测试服联调接口**：`LIVE_SERVER=<地址> LIVE_EMAIL=<账号> LIVE_PASSWORD=<密码> npx vitest run live`，不带这些变量时 `npm run check` 自动跳过；账号只放命令行环境变量，不写进文件
- **不要向服务端发送格式非法的 token 做测试**：会让后端 Swoole worker 崩溃（已知问题，属主程序，暂不修）；合法但过期的 token 会正常返回 `-1`
