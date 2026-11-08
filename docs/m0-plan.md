# M0 底座

> 2026-11-07 定。上位文档：[architecture.md](./architecture.md)。前身是主仓库 `feature/rn-next` 分支的 `docs/rn-next/m0-foundation-plan.md`。

M0 不做业务功能，只把「一套代码跑四端」需要的基础设施搭好。

**验收关口**：Web 和 Android 都能登录进入新主框架，各 Tab 显示占位屏（「开发中」），三档布局、深浅色、语言切换都正常，弹出层和嵌入容器可用。iOS 由用户自己验证。

## 1. 先做的事

1. **盘点可复用的代码**，写成一份清单（`docs/reuse-inventory.md`），每项注明「直接搬 / 改造后搬 / 只参考 / 不要」：
   - `resources/app` 的 `feature/rn-next` 分支（提交 `da6404433`）：`src/sync/`（api、ws、storage、crypto）、`src/embed/`、`src/ui/layout`、`src/ui/theme`、`src/modules/auth`、`src/modules/shell`。这些已对测试服联调过一部分，详情见主仓库 `feature/rn-next` 分支的 `docs/rn-next/pending-device-verification.md`
   - `resources/app` 的 `main`：`src/ui/`、`modules/`、`plugins/`、`push/`、出包脚本和签名配置；会话和任务的原生页留到 M1、M2 再搬
   - 注意：rn-next 的 `src/i18n/` 是旧 `L()` 方案，不搬
2. **最先验证风险最高的依赖**：unistyles 3 和 MMKV 4（都基于 nitro-modules）在 RN 0.88 新架构下能否在安卓模拟器上跑起来。不行就立即换方案，并更新 architecture.md 的选型表。

## 2. 工作项

每项都要在 Web 和 Android 上通过才算完成。

| # | 工作项 | 验收标准 |
| --- | --- | --- |
| W1 | 工程初始化：Expo SDK 58（版本对齐 `resources/app`）、TypeScript strict、Web 构建、目录分层 | `npx expo start --web` 能打开；`expo export --platform web` 的产物放到子路径（`/next`）下能访问、能刷新；Android 开发包能连上 Metro |
| W2 | 工程约束：依赖方向的 ESLint 规则、vitest、`npm run check`（tsc + lint + vitest + 翻译检查） | 违反依赖方向的代码 lint 报错；`npm run check` 一条命令跑完所有门禁 |
| W3 | 主题与布局原语：设计令牌、深浅色、三档断点、`AppFrame`、`ListDetail`、`Sheet` | Web 拖动窗口宽度时三档布局切换正确、URL 不变；切换深浅色立即生效 |
| W4 | 数据层 API：请求头、错误分类、全局返回码、登录 / 用户信息 / 系统设置 / 版本四组接口 | vitest 覆盖请求头、错误分类和全局返回码；对测试服登录成功 |
| W5 | 数据层 WebSocket：连接、`fd`、回执、心跳、重连、按类型分发 | vitest 用假 socket 覆盖重连、回执、乱序；测试服上断网恢复后自动重连 |
| W6 | 加密：PGP，格式与旧前端一致 | 测试服开启 `e2e_message` 后登录和消息列表加解密往返成功；记录安卓模拟器上生成密钥和单次解密的耗时 |
| W7 | 本地存储：键值 + 结构化缓存（原生 expo-sqlite、Web IndexedDB），上层统一接口 | 两套实现跑同一组契约测试；冷启动同步读到 token，首屏不闪登录页 |
| W8 | 国际化：i18next、命名空间按需加载、类型安全的键、检查脚本、旧译文查找工具 | 9 种语言切换立即生效；用了不存在的键编译不过；检查脚本能发现缺译和未使用的键，并让 `npm run check` 失败 |
| W9 | 弹出层：菜单（含子菜单、右键菜单）、确认、悬停提示、气泡 | 符合 architecture.md 第 7 节；Web 上点外面、按 Esc 能关闭，贴边时自动翻转；Android 上菜单和确认走原生 |
| W10 | 嵌入容器：`EmbedView`（Web iframe / 原生 WebView）和 postMessage 协议 v1 | 协议单元测试通过；嵌入一个测试页完成 `init`、`theme`、`navigate` 往返 |
| W11 | 登录与主框架：服务器地址、登录（含验证码）、最低服务端版本检查、五个 Tab 骨架 | 即本阶段验收关口 |
| W12 | 桌面交互基础：右键菜单、快捷键注册、悬停态、拖拽上传、文本选择 | 在 Chrome 里逐项可用（具体业务在各模块接入） |

## 3. 风险验证

| 风险 | 怎么验 | 什么时候 |
| --- | --- | --- |
| nitro-modules 系依赖与 RN 0.88 不兼容 | 安卓模拟器上装开发包运行 | 第一件事 |
| react-native-web 下中文输入法合成事件异常 | 输入框样例，在 Chrome 和 Electron 里用拼音输入，确认不吞字、不提前触发 | W3 |
| openpgp 在 Hermes 上过慢 | W6 实测耗时；不行就写本地 Expo 模块走原生加密库 | W6 |

## 4. 不在 M0 范围内

- 业务页面（M1 起）
- OTA 热更新方案
- Electron 加载新构建（M4）
- 测试服 `/next` 正式部署链路（M0 只需在本机能导出、能在子路径下访问）
