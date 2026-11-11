# DooTask Client

DooTask 的全端客户端：一套 Expo + react-native-web 代码，出 iOS、Android、Web、桌面（Electron）四端，最终替换主仓库的 Vue 2 前端和 `resources/app`。

## 必读

- `docs/architecture.md`：架构、选型、分层、各项已定决议。动手前先读，决议有变要先改这份文档
- `docs/ui-spec.md`：设计令牌和界面规范（颜色、字号、间距、常用元素、宽屏和桌面），写页面前对照
- `docs/performance.md`：性能硬规则和验收清单。**性能是本项目最大的难点**，规则从第一行代码起执行
- `docs/m0-plan.md`：当前阶段的范围和验收标准
- `docs/dev.md`：开发、Mac mini 构建流程和踩过的坑
- 环境相关的地址、端口、设备、账号放在 `CLAUDE.local.md`（不进 git）

## 语言

- 回复、文档、代码注释一律用简体中文
- 需要用户决定时，同时给出建议选项

## 相关仓库（只读参考，除非下面另有说明）

- 主仓库 `/home/coder/workspaces/dootask`：后端（Laravel）、旧 Vue 前端、Electron、ai-kb、`routes/api-map.md`、`language/translate.json`
- App 工程 `/home/coder/workspaces/dootask/resources/app`：可复制的 RN 代码来源；`feature/rn-next` 分支是上一轮底座代码
- happy-app `/home/coder/workspaces/happy-next/packages/happy-app`：同类架构和性能经验参考

**不要修改主仓库的前端和 `resources/app`**，它们只维护、不加功能。

**后端可以改**，规则见 architecture.md 第 11 节：兼容的改动直接改；不兼容的大改宁可新增接口。改后端时：

- 动手前先读主仓库的 `CLAUDE.md`（它不会自动加载），按它的规矩写
- 命令在主仓库目录用 `./cmd` 执行（不要直接跑 `php artisan`）
- 改完跑 `./cmd composer stan`；改了控制器 public 方法或路由，跑 `./cmd artisan doc:api-map` 重新生成对照表；配置或路由变更后 `./cmd php restart` 才生效
- 和本项目分开提交

**AI 知识库（主仓库 `resources/ai-kb/`）**：本项目切换上线前不同步；整体切换时按新客户端统一更新。

## 规矩

- **分层**：`app → modules → sync / ui / i18n / platform / embed`，反向禁止；`sync/` 不引用 React
- **平台差异**用 `.web.tsx` / `.native.tsx` 分文件，业务代码不写 `Platform.OS` 判断
- **国际化**用 i18next 语义键，不写死任何用户可见文字；新增键先按中文原文到主仓库 `language/translate.json` 查现成译文
- **颜色、字号、间距、圆角**只引用设计令牌，不写字面量
- **原生代码只能用 Expo 的方式加**：本地模块放 `modules/`，改原生工程配置写 config plugin 放 `plugins/`；不手改 `ios/`、`android/`（生成产物）
- **依赖**用 `npx expo install` 安装，版本与 `resources/app` 对齐；新增原生依赖先问用户
- **代码要干净**：按规范重新写，不留冗余参数、兼容分支和重复实现；从 `resources/app` 复制的代码也按本项目规范改造
- **功能不用 `__DEV__` 限制在开发包**，正式包直接生效

## Expo 已变化，不要相信训练数据

写 Expo / RN API 前，先查 `package.json` 里的 expo 主版本，再查对应文档 `https://docs.expo.dev/versions/v58.0.0/`（索引 https://docs.expo.dev/llms.txt ），或者直接读 `node_modules` 里的类型定义。

## 质量门禁（改完代码必须自查）

- `npm run check`：tsc、lint、vitest、翻译检查（W2 建好后以 `package.json` 为准）
- 涉及原生代码时，`npx expo prebuild --clean --no-install` 能成功生成原生工程

## 开发流程

- **按阶段推进**：每阶段开始前先交计划（范围、逐条重要性、谁开发、怎么验收、停点），用户确认后再做；执行中碰到计划外的情况（新问题、要改范围）先停下问
- **阶段内多块走流水线**：一个阶段的计划排好几块；qoder 验第 N 块时我写第 N+1 块，FAIL 攒一批修，提交仍按块
- **先量后写**：照旧版做的界面，动手前先让测试机上的 qoder 把旧版逐屏量成规格表放进 `docs/`，照表写；验收用通用新旧对比脚本（`scripts/qa/compare.mjs`、测试机 `~/qa/cmp.sh`），每块只加配置
- **按阶段汇报**：阶段全部验收通过 → 提交推送（只暂存本阶段文件）→ 更新一次进度文档 → 停下汇报（先说还差什么）；块与块之间不写汇报

## 测试

- **测试机**（见 `CLAUDE.local.md`）：Web 的 Playwright 和安卓模拟器测试都在这台 Mac 上跑，通过全局 orchestrator 技能操作，只构建和运行，不在上面改代码。流程和坑见 `docs/dev.md`「测试分工」
- **验收交给测试机上的 qoder（`dfmodel`），执行和判定都由它做**：写清步骤、预期和要交的文字证据派给它，以它的判定为准；我只读文字报告、不看截图，FAIL 由我修完再派它复验。我认为判错的（比如量错了元素）不自己推翻，写进汇报由用户定。账号密码不写进它的提示词，登录自己做
- **以安卓为主**；iOS 模拟器非必要不测，iOS 交给用户自己验证
- 小改动只在 Web 验；涉及手势、键盘的改动安卓也要验
- **真机测试包**（iOS 和安卓）：在 Mac mini 上用 `.claude/skills/app-build` 技能出包放进下载页，用户自己安装
- UI 和交互要逐屏验收（由 qoder 对照旧版看截图、量尺寸），不要只看代码就说完成
- 手感、细小像素差这类低权重差异不算 FAIL，记进 `docs/polish-backlog.md`，整个项目开发完后再统一处理
- **测试服数据可以随意增删改**（发消息、建任务、上传都不用请示）
- **测试账号**见 `CLAUDE.local.md`。需要普通权限账号时，在主仓库执行 `./cmd repassword <账号>` 重置密码（会让该账号现有的登录失效）

## Git

- 不修改暂存区、不提交、不推送、不建分支，除非用户明确要求
- 不要把账号密码、token、签名文件、具体环境域名写进会提交的文件；这些只能放在不提交的文件里（如 `CLAUDE.local.md`）

## 安全

- 含清空目录操作的脚本（如出包脚本）不能通过 stdin 执行，也不能拿来实测
- 不读取、不打印 env 文件里的密钥和 token
