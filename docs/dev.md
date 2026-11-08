# 开发与构建

> 具体的地址、端口、机器路径、签名文件位置都在 `CLAUDE.local.md`（不进 git）。本文只写流程和踩过的坑。

## 本机（Linux 开发机）

- 代码在本机开发，Metro（含 Web 开发服务）常驻本机
- **Web 开发直连测试服**：测试服后端允许跨域（`Access-Control-Allow-Origin: *`），本机的 Web 开发服务可以直接请求测试服接口，不需要配代理
- Metro 的对外地址按 `VSCODE_PROXY_URI` 模板推导，开发包据此加载 bundle；地址写在 `.env.local`，不写进仓库
- 主仓库的前端 dev server 由用户自己运行，不要去启动

## Mac mini（只构建和运行，不改代码）

用于安卓模拟器测试和出 iOS 包，通过 orchestrator 操作（全局 orchestrator 技能）。代码在本机打包后传过去，Mac mini 上只解包、构建、运行。

### 安卓

- 开发包（`APP_VARIANT=development`，包名 `com.dootask.task.dev`）装到模拟器后连本机 Metro 实时开发；原生代码或原生依赖没变时，只改 JS 不用重新出包
- 开发版包名与 `resources/app` 的开发版相同，会覆盖设备上旧的 DooTask (dev)，用户已同意
- 出包流程可参考 `resources/app/scripts/mac-build.sh` 和 `resources/app/docs/dev.md`，本项目的脚本自己写
- **正式签名**不进仓库，放在 Mac mini 本地（位置见 `CLAUDE.local.md`），构建时通过环境变量或 config plugin 注入
- **推送厂商参数**参考 `resources/app/push/android/`

### 真机测试包（iOS / 安卓）

用 `.claude/skills/app-build` 技能（本机文件，不进 git）：出 IPA / APK 放进下载页，由用户自己装到真机测试。安卓模拟器自测不走这个技能。

## 坑

- **Gradle 守护进程偶尔内存溢出（Metaspace OOM）卡死**：`./gradlew --stop`，杀掉挂住的 gradlew 客户端进程，再重新构建
- **长构建用 `nohup` 后台跑**，日志写 `/tmp`；直接在 orchestrator 里前台跑，守护进程重启会把子进程一起杀掉
- **含清空目录操作的脚本**只能在目标机器的预期目录里用文件路径执行，不能通过 stdin 执行，也不能拿来实测；要验证就用 `bash -n` 或读代码。远程执行清空前，先 echo 出将被删除的路径（2026-10-18 曾两次误删目录）
- **列表在开头插入数据时画面跳走**：根因是 VirtualizedList 条数不变时跳过状态更新，`resources/app/patches/@react-native+virtualized-lists+0.88.0.patch` 已修复，复制消息列表时一起带上；升级 RN 时先看上游是否已修
- **RNGH 的 `activeOffsetX([a, b])`** 表示 dx ≤ a 或 dx ≥ b 即激活，不是区间。写成两个正数会让手势一碰就激活，吃掉内层的点击和长按；单向只写一个正数
- **不要向服务端发送格式非法的 token 做测试**：会让后端 Swoole worker 崩溃（已知问题，属主程序，暂不修）；合法但过期的 token 会正常返回 `-1`
