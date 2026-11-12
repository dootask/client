# AI 流式回复（H1 / H2）协议实测

2026-11-12 在测试服给系统 AI 机器人（`ai-deepseek@bot.system`）发消息抓到的完整过程。旧版网页的处理在主仓库 `store/actions.js` 的 `streamMsgSubscribe`、`DialogWrapper.vue` 的 `onMsgChange` / `onMsgOutput`。

## 时序

1. 我发的消息：`dialog` 推送 `add`，随后 `readed`
2. 机器人的占位消息：`add`，`type: text`，`msg: { text: '...', type: 'md' }`，`bot: 1`
3. 占位消息 `update`：`msg.ai = { run_id, initiator, status: 'running', parts: [] }`
4. WebSocket 推 `{ type: 'msgStream', stream_url: '/ai/stream/{msgId}/{key}' }`（相对地址，拼服务器地址；不用带 token）
5. 打开 SSE（`text/event-stream`），事件 id（lastEventId）是消息 id，data 是 `{"content": "..."}`：
   - `replace`：整段替换。开头一段是思考过程，内容形如 `::: reasoning\n…\n:::`，每次都是到目前为止的全文
   - `append`：在当前文字后面追加一小段（正文按词组推）
   - `done`：data 为 `{}`，结束，关闭连接
6. 完成后 `update` 推两次，带最终全文 `msg.text` 和 `msg.ai = { status: 'done', parts: [{ type: 'reasoning', id, text }, …] }`

## 旧版网页的做法

- 同一个地址只订阅一次，最多同时 10 个，多了关最早的
- `append` 拆成单字排队、`replace` 清空队列换成整段；按队列长短一次吐 1 / 2 / 5 / 10 个字，每 5ms 一轮（打字机效果），直接改消息的 `msg.text`
- 滚动在底部时跟着滚到底
- 最终结果以 `update` 推送为准

## 带 msg.ai 的回复：Run 事件流（本项目以它为准）

旧版网页对带 `msg.ai` 的回复不用上面的 msgStream 文字，而是订阅 Run 事件流画时间线（主仓库 `utils/ai-agent/run-watcher.js`、`protocol.js`、`blocks.js`）。本项目对照实现在 `src/sync/ai/`：

- `msg.ai = { run_id, initiator, status, parts, error }`；`status` 为 `queued` / `running` / `waiting_confirm` 时进行中，`done` / `error` / `cancelled` 为结束
- parts：`text`、`reasoning`（`started_at` / `ended_at`）、`tool`（name、title、args、status、result、risk）、`step`（计划 items）、`confirm`（status、summary、risk、targets）、`card`（`card: task_list | batch_preview | …`、data、state、fallback）
- 进行中：`GET assistant/run/stream { dialog_msg_id }` 取 `{ events_url }`（相对地址，带订阅凭证；已结束返回空）。SSE 的 data 是 AG-UI 事件 JSON，事件 id 是游标，断线用 `?offset=游标` 续传
  - `TEXT_MESSAGE_*`、`REASONING_*`、`TOOL_CALL_*`、`ACTIVITY_SNAPSHOT`（`plan` / `dootask.card`）归约成 parts（`PartsBuilder`）
  - `RUN_FINISHED` 带 `outcome.type: interrupt` 是等待确认（加 confirm 块，连接结束后续订）；`RUN_STARTED` 的 `input.resume` 写回确认结果；`RUN_ERROR` 的 `code: cancelled` 是已停止
- 操作（只有发起人）：停止 `assistant/cancel`、确认 `assistant/resume { confirm_id, approved }`、卡片动作 `assistant/card/action { card_id, action }`
- 显示为时间线的条件：进行中、正文仍是 `...`、或 parts 里有 text；否则是早期回复，按 `msg.text` 显示，卡片替换正文里对应的 fallback
- 进行中以事件流叠加的内容为准（比消息推送及时），结束后以消息里保存的 parts 为准
- 2026-11-12 实测：普通问答、带工具的查询（执行工具 14 次 + 任务列表卡片）、停止都正常；中途网络切换断线后从游标续传恢复
