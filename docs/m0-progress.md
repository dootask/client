# M0 进度与发现

> 按工作项记录验收结果和过程中的发现；计划和验收标准见 [m0-plan.md](./m0-plan.md)。

| # | 状态 | 提交 |
| --- | --- | --- |
| 第 1 节（复用清单、风险依赖验证） | ✅ | `f5f83a8` |
| W1 工程初始化 | ✅ | `37a58e0` |
| W2 工程约束 | ✅ | 见 git log |
| W3–W12 | 未开始 | — |

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
- vitest 暂时开着 `passWithNoTests`，W4 有了测试后去掉
