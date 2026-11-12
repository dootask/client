# 旧版 Web 卡片消息规格（spec-cards）

- 站点：`<测试服>`（旧版前端，Vue 2 + iView），聊天页 `/manage/messenger`
- 登录态：`~/qa/state-old-admin.json`（复用，未重新登录）
- 视口：宽 1280×860；窄 390×844（`isMobile + hasTouch`，按该视口加载）
- 方法：DOM + `getComputedStyle` 逐部件测量；`locator.screenshot()` 裁切卡片/行；交互状态用真实 hover/click 探测
- box 约定：`(x, y) w×h`，坐标相对消息根 `.dialog-view` 左上角，单位 px；「宽/窄」分别对应上述两个视口
- 样式缩写：fs=font-size，fw=font-weight，lh=line-height，m=margin，p=padding，bd=border，r=border-radius，bg=background-color，op=opacity
- 颜色统一为 hex；`〃` 表示与上一行同部件（另一视口）
- 产物目录：`n5-spec/cards/shots/`（截图）、`measure/`（原始 JSON）、`tables/`（自动汇总表）；本文件为最终规格
- 自聊/对方差异：自聊气泡 bg `#84c56a`、r `8px 2px 8px 8px`，头像在右；对方气泡 bg `#f4f5f7`、r `2px 8px 8px 8px`，头像在左；时间 `.time` fs 12px、lh 12px、color #bbbbbb

## 1. 投票卡片

- 会话 id: `5625`；消息 id: `2211151`
- 截图: `shots/vote-wide-row.png`, `shots/vote-wide-card.png`, `shots/vote-narrow-row.png`, `shots/vote-narrow-card.png`, `shots/vote-after-wide-row.png`, `shots/vote-after-wide-card.png`, `shots/vote-after-narrow-row.png`, `shots/vote-after-narrow-card.png`
- 说明: 自聊（self）；主表=未投票状态，附表=已投票状态

view wide={'x': 595.5, 'y': 321.5, 'w': 614.5, 'h': 280} row={'x': 595.5, 'y': 321.5, 'w': 652.5, 'h': 296} class=dialog-view vote
view narrow={'x': 14, 'y': 322.5, 'w': 324, 'h': 280} row={'x': 14, 'y': 322.5, 'w': 362, 'h': 296} class=dialog-view vote

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| dialog-avatar | 宽 | `.dialog-item.self > .dialog-avatar` | (622.5, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-avatar` | (332, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| dialog-username | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-username` | (560.3, 0) 54.2×22 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 6px; op 0.8 |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-username` | (269.8, 0) 54.2×22 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 6px; op 0.8 |  |
| dialog-head | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-head` | (398.5, 28) 216×231 | fs 14px; fw 400; lh 21px; color #606266; bg #84c56a; r 8px 2px 8px 8px; p 8px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-head` | (108, 28) 216×231 | fs 14px; fw 400; lh 21px; color #606266; bg #84c56a; r 8px 2px 8px 8px; p 8px |  |
| dialog-content | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content` | (406.5, 36) 200×183 | fs 14px; fw 400; lh 21px; color #606266 |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content` | (116, 36) 200×183 | fs 14px; fw 400; lh 21px; color #606266 |  |
| content-text.content-word-vote.no-dark-content | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content` | (406.5, 36) 200×183 | fs 14px; fw 400; lh 21px; color #ffffff; p 2px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content` | (116, 36) 200×183 | fs 14px; fw 400; lh 21px; color #ffffff; p 2px |  |
| vote-msg-head | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .vote-msg-head` | (408.5, 38) 196×26 | fs 14px; fw 400; lh 18px; color #23241f; bd 0px none rgb(35, 36, 31); m 0px 0px 8px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .vote-msg-head` | (118, 38) 196×26 | fs 14px; fw 400; lh 18px; color #23241f; bd 0px none rgb(35, 36, 31); m 0px 0px 8px |  |
| doo-icon | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .vote-msg-head > .doo-icon` | (408.5, 43) 16×16 | fs 16px; fw 400; lh 16px; color #23241f; bd 0px none rgb(35, 36, 31) | doo-icon(内含 svg) |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .vote-msg-head > .doo-icon` | (118, 43) 16×16 | fs 16px; fw 400; lh 16px; color #23241f; bd 0px none rgb(35, 36, 31) | doo-icon(内含 svg) |
| svg | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .vote-msg-head > .doo-icon > svg` | (408.5, 43) 16×16 | fs 16px; fw 400; lh 16px; color #23241f; bd 0px none rgb(35, 36, 31) | svg viewBox=0 0 1024 1024 paths=2 stroke=none fill=rgb(35, 36, 31) |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .vote-msg-head > .doo-icon > svg` | (118, 43) 16×16 | fs 16px; fw 400; lh 16px; color #23241f; bd 0px none rgb(35, 36, 31) | svg viewBox=0 0 1024 1024 paths=2 stroke=none fill=rgb(35, 36, 31) |
| path | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .vote-msg-head > .doo-icon > svg > path:nth-of-type(1)` | (409.8, 44.3) 13.4×13.4 | fs 16px; fw 400; lh 16px; color #23241f; bd 0px none rgb(35, 36, 31) |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .vote-msg-head > .doo-icon > svg > path:nth-of-type(1)` | (119.3, 44.3) 13.4×13.4 | fs 16px; fw 400; lh 16px; color #23241f; bd 0px none rgb(35, 36, 31) |  |
| path | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .vote-msg-head > .doo-icon > svg > path:nth-of-type(2)` | (412.6, 50) 7.8×5.1 | fs 16px; fw 400; lh 16px; color #23241f; bd 0px none rgb(35, 36, 31) |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .vote-msg-head > .doo-icon > svg > path:nth-of-type(2)` | (122.1, 50) 7.8×5.1 | fs 16px; fw 400; lh 16px; color #23241f; bd 0px none rgb(35, 36, 31) |  |
| em 「投票」 | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .vote-msg-head > em` | (424.5, 38) 36×26 | fs 14px; fw 700; lh 18px; color #23241f; bd 0px none rgb(35, 36, 31); p 4px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .vote-msg-head > em` | (134, 38) 36×26 | fs 14px; fw 700; lh 18px; color #23241f; bd 0px none rgb(35, 36, 31); p 4px |  |
| span 「单选」 | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .vote-msg-head > span:nth-of-type(1)` | (464.5, 40) 32×22 | fs 12px; fw 400; lh 18px; color #7076e4; bg #dee2fa; bd 0px none rgb(112, 118, 228); r 3px; p 2px 4px; m 0px 4px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .vote-msg-head > span:nth-of-type(1)` | (174, 40) 32×22 | fs 12px; fw 400; lh 18px; color #7076e4; bg #dee2fa; bd 0px none rgb(112, 118, 228); r 3px; p 2px 4px; m 0px 4px |  |
| pre 「qa-vote-1794360800106」 | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > pre` | (408.5, 72) 196×20 | fs 14px; fw 400; lh 20px; color #ffffff |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > pre` | (118, 72) 196×20 | fs 15px; fw 400; lh 20px; color #ffffff |  |
| ivu-radio-group.ivu-radio-group-default.ivu-radio-default.ivu-radio-group-vertical | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .ivu-radio-group.ivu-radio-group-default.ivu-radio-default.ivu-radio-group-vertical` | (408.5, 102) 196×68 | fs 14px; fw 400; lh 21px; color #ffffff; m 10px 0px 0px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .ivu-radio-group.ivu-radio-group-default.ivu-radio-default.ivu-radio-group-vertical` | (118, 102) 196×68 | fs 14px; fw 400; lh 21px; color #ffffff; m 10px 0px 0px |  |
| ivu-radio-wrapper.ivu-radio-group-item.ivu-radio-default | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .ivu-radio-group.ivu-radio-group-default.ivu-radio-default.ivu-radio-group-vertical > .ivu-radio-wrapper.ivu-radio-group-item.ivu-radio-default:nth-of-type(1)` | (408.5, 102) 196×34 | fs 14px; fw 400; lh 34px; color #ffffff; m 0px 8px 0px 0px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .ivu-radio-group.ivu-radio-group-default.ivu-radio-default.ivu-radio-group-vertical > .ivu-radio-wrapper.ivu-radio-group-item.ivu-radio-default:nth-of-type(1)` | (118, 102) 196×34 | fs 14px; fw 400; lh 34px; color #ffffff; m 0px 8px 0px 0px |  |
| ivu-radio | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .ivu-radio-group.ivu-radio-group-default.ivu-radio-default.ivu-radio-group-vertical > .ivu-radio-wrapper.ivu-radio-group-item.ivu-radio-default:nth-of-type(1) > .ivu-radio` | (408.5, 111.4) 16×18 | fs 14px; fw 400; lh 14px; color #ffffff; m 0px 4px 0px 0px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .ivu-radio-group.ivu-radio-group-default.ivu-radio-default.ivu-radio-group-vertical > .ivu-radio-wrapper.ivu-radio-group-item.ivu-radio-default:nth-of-type(1) > .ivu-radio` | (118, 111.4) 16×18 | fs 14px; fw 400; lh 14px; color #ffffff; m 0px 4px 0px 0px |  |
| ivu-radio-inner | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .ivu-radio-group.ivu-radio-group-default.ivu-radio-default.ivu-radio-group-vertical > .ivu-radio-wrapper.ivu-radio-group-item.ivu-radio-default:nth-of-type(1) > .ivu-radio > .ivu-radio-inner` | (408.5, 111.4) 16×16 | fs 14px; fw 400; lh 14px; color #ffffff; bg #ffffff; bd 1px solid rgb(220, 222, 226); r 50% |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .ivu-radio-group.ivu-radio-group-default.ivu-radio-default.ivu-radio-group-vertical > .ivu-radio-wrapper.ivu-radio-group-item.ivu-radio-default:nth-of-type(1) > .ivu-radio > .ivu-radio-inner` | (118, 111.4) 16×16 | fs 14px; fw 400; lh 14px; color #ffffff; bg #ffffff; bd 1px solid rgb(220, 222, 226); r 50% |  |
| ivu-radio-input | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .ivu-radio-group.ivu-radio-group-default.ivu-radio-default.ivu-radio-group-vertical > .ivu-radio-wrapper.ivu-radio-group-item.ivu-radio-default:nth-of-type(1) > .ivu-radio > .ivu-radio-input` | (408.5, 111.4) 16×18 | fs 14px; fw 400; lh 14px; color #000000; bd 0px none rgb(0, 0, 0); r 50%; op 0 |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .ivu-radio-group.ivu-radio-group-default.ivu-radio-default.ivu-radio-group-vertical > .ivu-radio-wrapper.ivu-radio-group-item.ivu-radio-default:nth-of-type(1) > .ivu-radio > .ivu-radio-input` | (118, 111.4) 16×18 | fs 14px; fw 400; lh 14px; color #000000; bd 0px none rgb(0, 0, 0); r 50%; op 0 |  |
| ivu-radio-wrapper.ivu-radio-group-item.ivu-radio-default | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .ivu-radio-group.ivu-radio-group-default.ivu-radio-default.ivu-radio-group-vertical > .ivu-radio-wrapper.ivu-radio-group-item.ivu-radio-default:nth-of-type(2)` | (408.5, 136) 196×34 | fs 14px; fw 400; lh 34px; color #ffffff; m 0px 8px 0px 0px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .ivu-radio-group.ivu-radio-group-default.ivu-radio-default.ivu-radio-group-vertical > .ivu-radio-wrapper.ivu-radio-group-item.ivu-radio-default:nth-of-type(2)` | (118, 136) 196×34 | fs 14px; fw 400; lh 34px; color #ffffff; m 0px 8px 0px 0px |  |
| ivu-radio-input | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .ivu-radio-group.ivu-radio-group-default.ivu-radio-default.ivu-radio-group-vertical > .ivu-radio-wrapper.ivu-radio-group-item.ivu-radio-default:nth-of-type(2) > .ivu-radio > .ivu-radio-input` | (408.5, 145.4) 16×18 | fs 14px; fw 400; lh 14px; color #000000; bd 0px none rgb(0, 0, 0); r 50%; op 0 |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .ivu-radio-group.ivu-radio-group-default.ivu-radio-default.ivu-radio-group-vertical > .ivu-radio-wrapper.ivu-radio-group-item.ivu-radio-default:nth-of-type(2) > .ivu-radio > .ivu-radio-input` | (118, 145.4) 16×18 | fs 14px; fw 400; lh 14px; color #000000; bd 0px none rgb(0, 0, 0); r 50%; op 0 |  |
| btn-row | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .btn-row` | (408.5, 170) 196×47 | fs 14px; fw 400; lh 21px; color #ffffff; p 10px 0px 5px; gap 10px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .btn-row` | (118, 170) 196×47 | fs 14px; fw 400; lh 21px; color #ffffff; p 10px 0px 5px; gap 10px |  |
| ivu-btn-grey.ivu-btn.ivu-btn-default | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .btn-row > .ivu-btn-grey.ivu-btn.ivu-btn-default` | (408.5, 180) 196×32 | fs 14px; fw 400; lh 21px; color #c5c8ce; bg #f7f7f7; bd 1px solid rgb(220, 222, 226); r 4px; p 0px 15px | disabled |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .btn-row > .ivu-btn-grey.ivu-btn.ivu-btn-default` | (118, 180) 196×32 | fs 14px; fw 400; lh 21px; color #c5c8ce; bg #f7f7f7; bd 1px solid rgb(220, 222, 226); r 4px; p 0px 15px | disabled |
| span 「请选择后投票」 | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .btn-row > .ivu-btn-grey.ivu-btn.ivu-btn-default > span` | (464.5, 185.5) 84×21 | fs 14px; fw 400; lh 21px; color #c5c8ce; bd 0px none rgb(197, 200, 206) |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-head > .dialog-content > .content-text.content-word-vote.no-dark-content > .btn-row > .ivu-btn-grey.ivu-btn.ivu-btn-default > span` | (174, 185.5) 84×21 | fs 14px; fw 400; lh 21px; color #c5c8ce; bd 0px none rgb(197, 200, 206) |  |
| dialog-foot | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-foot` | (539.1, 259) 75.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-foot` | (248.6, 259) 75.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| time 「昨天 09:33」 | 宽 | `.dialog-item.self > .dialog-view.vote > .dialog-foot > .time` | (539.1, 265.5) 57.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.vote > .dialog-foot > .time` | (248.6, 265.5) 57.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |

- HOVER（宽）`button`（cursor not-allowed）：样式无变化
- HOVER（窄）`button`（cursor not-allowed）：样式无变化

**补充：已投票状态**（在窄/宽视口各真实投出一票后重新量取）

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| dialog-head | 宽 | `.dialog-view.vote > .dialog-head` | (994, 308.5) 216×313 | bg #84c56a; r 8px 2px 8px 8px; p 8px | 高度 231→313 |
| 〃 | 窄 | 〃 | (122, 309.5) 216×313 | 同上 |  |
| vote-result-body | 宽 | `.vote-result-body` | (1004, 386.5) 196×136 | fs 12px; fw 400; lh 18px; color #ffffff; m 14px 0 0 | 结果区容器 |
| 〃 | 窄 | 〃 | (132, 387.5) 196×136 | 同上 |  |
| vote-option-title（甲/乙） | 宽 | `.vote-option-title` | (1004, 386.5) 196×18 | fs 12px; fw 400; lh 18px; color #ffffff; m 0 0 3px | 选项名 |
| 〃 | 窄 | 〃 | (132, 387.5) 196×18 | 同上 |  |
| ticket-num（0票0.00% / 1票100.00%） | 宽 | `.ticket-num` | (1004, 407.5) 196×18 | fs 12px; fw 400; lh 18px; color #ffffff | 票数+百分比 |
| 〃 | 窄 | 〃 | (132, 408.5) 196×18 | 同上 |  |
| ivu-progress-inner（轨道） | 宽 | `.ivu-progress-inner` | 甲 (1004, 425.5) 196×5；乙 (1004, 491.5) 196×5 | bg #e2e2e2; r 100px | 每选项一条 |
| 〃 | 窄 | 〃 | 甲 (132, 426.5) 196×5；乙 (132, 492.5) 196×5 | 同上 |  |
| ivu-progress-bg | 宽 | `.ivu-progress-bg` | 甲 0×5；乙 196×5 | bg #8bcf70; r 100px; h 5px | 普通进度，width 0%/100% |
| 〃 | 窄 | 〃 | 同宽（x=132） | 同上 |  |
| ivu-progress-success-bg | 宽 | `.ivu-progress-success-bg` | 乙 (1004, 491.5) 196×5 | bg #19be6b; r 100px; h 5px | 成功色层 |
| 〃 | 窄 | 〃 | 乙 (132, 492.5) 196×5 | 同上 |  |
| avatar-row > avatar-wrapper | 宽 | `.avatar-row .avatar-wrapper` | (1004, 500.5) 18×18 | — | 投票人头像 18×18 |
| 〃 | 窄 | 〃 | (132, 501.5) 18×18 | — |  |
| btn-row | 宽 | `.btn-row` | (1004, 532.5) 196×47 | p 10px 0 5px; gap 10px |  |
| 〃 | 窄 | 〃 | (132, 533.5) 196×47 | 同上 |  |
| 再次发送 / 结束投票 | 宽 | `.btn-row button` | (1004, 542.5) 93×32；(1107, 542.5) 93×32 | fs 14px; color #ffffff; bg #ff9900; bd 1px solid #ff9900; r 4px; p 0 15px | hover bg #ffad33 |
| 〃 | 窄 | 〃 | (132, 543.5) 93×32；(235, 543.5) 93×32 | 同上 | hover 同宽 |

- 状态机：未投票（单选/实名标签 + 2 个选项 + 灰色禁用按钮「请选择后投票」）→ 选择选项后按钮可投 → 点击「立即投票」变为结果视图（票数/百分比/进度条/投票人头像 + 再次发送/结束投票）。
- hover：结果区两个橙色按钮均为 `bg #ff9900 → #ffad33`、边框同色阶，文字 #fff 不变；未投票禁用按钮 hover 无变化（cursor not-allowed）。
- 「再次发送」「结束投票」只做 hover，未点击（会改变群内投票状态）。

## 2. 接龙卡片

- 会话 id: `5625`；消息 id: `2211152`
- 截图: `shots/wordchain-wide-row.png`, `shots/wordchain-wide-card.png`, `shots/wordchain-narrow-row.png`, `shots/wordchain-narrow-card.png`, `shots/wordchain-detail-wide-full.png`, `shots/wordchain-detail-narrow-full.png`
- 说明: 自聊（self）；点击接龙项打开详情弹窗（见补充）

view wide={'x': 753.25, 'y': 381.5, 'w': 456.75, 'h': 161} row={'x': 595.5, 'y': 381.5, 'w': 652.5, 'h': 177} class=dialog-view word-chain
view narrow={'x': 84.609375, 'y': 382.5, 'w': 253.390625, 'h': 161} row={'x': 14, 'y': 382.5, 'w': 362, 'h': 177} class=dialog-view word-chain

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| dialog-avatar | 宽 | `.dialog-item.self > .dialog-avatar` | (464.8, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-avatar` | (261.4, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| dialog-username | 宽 | `.dialog-item.self > .dialog-view.word-chain > .dialog-username` | (402.5, 0) 54.2×22 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 6px; op 0.8 |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.word-chain > .dialog-username` | (199.2, 0) 54.2×22 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 6px; op 0.8 |  |
| dialog-head | 宽 | `.dialog-item.self > .dialog-view.word-chain > .dialog-head` | (265.6, 28) 191.2×112 | fs 14px; fw 400; lh 21px; color #606266; bg #84c56a; r 8px 2px 8px 8px; p 8px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.word-chain > .dialog-head` | (51.6, 28) 201.8×112 | fs 14px; fw 400; lh 21px; color #606266; bg #84c56a; r 8px 2px 8px 8px; p 8px |  |
| dialog-content | 宽 | `.dialog-item.self > .dialog-view.word-chain > .dialog-head > .dialog-content` | (273.6, 36) 175.2×96 | fs 14px; fw 400; lh 21px; color #606266 |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.word-chain > .dialog-head > .dialog-content` | (59.6, 36) 185.8×96 | fs 14px; fw 400; lh 21px; color #606266 |  |
| content-text.content-word-chain.no-dark-content | 宽 | `.dialog-item.self > .dialog-view.word-chain > .dialog-head > .dialog-content > .content-text.content-word-chain.no-dark-content` | (273.6, 36) 175.2×96 | fs 14px; fw 400; lh 21px; color #ffffff; p 2px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.word-chain > .dialog-head > .dialog-content > .content-text.content-word-chain.no-dark-content` | (59.6, 36) 185.8×96 | fs 14px; fw 400; lh 21px; color #ffffff; p 2px |  |
| pre 「qa-chain-1794360800106」 | 宽 | `.dialog-item.self > .dialog-view.word-chain > .dialog-head > .dialog-content > .content-text.content-word-chain.no-dark-content > pre` | (275.6, 38) 171.2×20 | fs 14px; fw 400; lh 20px; color #ffffff |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.word-chain > .dialog-head > .dialog-content > .content-text.content-word-chain.no-dark-content > pre` | (61.6, 38) 181.8×20 | fs 15px; fw 400; lh 20px; color #ffffff |  |
| ul | 宽 | `.dialog-item.self > .dialog-view.word-chain > .dialog-head > .dialog-content > .content-text.content-word-chain.no-dark-content > ul` | (275.6, 78) 171.2×52 | fs 14px; fw 400; lh 21px; color #ffffff; m 20px 0px 0px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.word-chain > .dialog-head > .dialog-content > .content-text.content-word-chain.no-dark-content > ul` | (61.6, 78) 181.8×52 | fs 14px; fw 400; lh 21px; color #ffffff; m 20px 0px 0px |  |
| li | 宽 | `.dialog-item.self > .dialog-view.word-chain > .dialog-head > .dialog-content > .content-text.content-word-chain.no-dark-content > ul > li` | (275.6, 78) 171.2×21 | fs 14px; fw 400; lh 21px; color #ffffff; m 5px 0px 0px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.word-chain > .dialog-head > .dialog-content > .content-text.content-word-chain.no-dark-content > ul > li` | (61.6, 78) 181.8×21 | fs 14px; fw 400; lh 21px; color #ffffff; m 5px 0px 0px |  |
| span 「1. 第一棒内容」 | 宽 | `.dialog-item.self > .dialog-view.word-chain > .dialog-head > .dialog-content > .content-text.content-word-chain.no-dark-content > ul > li > span` | (275.6, 80) 85.6×16 | fs 14px; fw 400; lh 21px; color #ffffff |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.word-chain > .dialog-head > .dialog-content > .content-text.content-word-chain.no-dark-content > ul > li > span` | (61.6, 80) 85.6×16 | fs 14px; fw 400; lh 21px; color #ffffff |  |
| participate | 宽 | `.dialog-item.self > .dialog-view.word-chain > .dialog-head > .dialog-content > .content-text.content-word-chain.no-dark-content > ul > .participate` | (275.6, 109) 171.2×21 | fs 14px; fw 400; lh 21px; color #23241f; bd 0px none rgb(35, 36, 31); m 10px 0px 0px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.word-chain > .dialog-head > .dialog-content > .content-text.content-word-chain.no-dark-content > ul > .participate` | (61.6, 109) 181.8×21 | fs 14px; fw 400; lh 21px; color #23241f; bd 0px none rgb(35, 36, 31); m 10px 0px 0px |  |
| doo-icon | 宽 | `.dialog-item.self > .dialog-view.word-chain > .dialog-head > .dialog-content > .content-text.content-word-chain.no-dark-content > ul > .participate > .doo-icon` | (331.6, 113.5) 14×12 | fs 12px; fw 400; lh 12px; color #23241f; bd 0px none rgb(35, 36, 31); p 0px 0px 0px 2px | doo-icon(内含 svg) |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.word-chain > .dialog-head > .dialog-content > .content-text.content-word-chain.no-dark-content > ul > .participate > .doo-icon` | (117.6, 113.5) 14×12 | fs 12px; fw 400; lh 12px; color #23241f; bd 0px none rgb(35, 36, 31); p 0px 0px 0px 2px | doo-icon(内含 svg) |
| svg | 宽 | `.dialog-item.self > .dialog-view.word-chain > .dialog-head > .dialog-content > .content-text.content-word-chain.no-dark-content > ul > .participate > .doo-icon > svg` | (333.6, 113.5) 12×12 | fs 12px; fw 400; lh 12px; color #23241f; bd 0px none rgb(35, 36, 31) | svg viewBox=0 0 24 24 paths=1 stroke=rgb(35, 36, 31) fill=none |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.word-chain > .dialog-head > .dialog-content > .content-text.content-word-chain.no-dark-content > ul > .participate > .doo-icon > svg` | (119.6, 113.5) 12×12 | fs 12px; fw 400; lh 12px; color #23241f; bd 0px none rgb(35, 36, 31) | svg viewBox=0 0 24 24 paths=1 stroke=rgb(35, 36, 31) fill=none |
| path | 宽 | `.dialog-item.self > .dialog-view.word-chain > .dialog-head > .dialog-content > .content-text.content-word-chain.no-dark-content > ul > .participate > .doo-icon > svg > path` | (338.1, 116.5) 3×6 | fs 12px; fw 400; lh 12px; color #23241f; bd 0px none rgb(35, 36, 31) |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.word-chain > .dialog-head > .dialog-content > .content-text.content-word-chain.no-dark-content > ul > .participate > .doo-icon > svg > path` | (124.1, 116.5) 3×6 | fs 12px; fw 400; lh 12px; color #23241f; bd 0px none rgb(35, 36, 31) |  |
| dialog-foot | 宽 | `.dialog-item.self > .dialog-view.word-chain > .dialog-foot` | (381.4, 140) 75.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.word-chain > .dialog-foot` | (178, 140) 75.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| time 「昨天 09:33」 | 宽 | `.dialog-item.self > .dialog-view.word-chain > .dialog-foot > .time` | (381.4, 146.5) 57.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.word-chain > .dialog-foot > .time` | (178, 146.5) 57.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |

- HOVER（宽）`.participate`（cursor pointer）：样式无变化
- HOVER（窄）`.participate`（cursor pointer）：样式无变化

**补充：接龙详情弹窗**（点击卡片内 `ul > li.participate` 打开）

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 遮罩 `.layer-stack-mask` | 宽 | `.layer-stack-mask` | (0, 0) 1280×860 | bg rgba(55,55,55,0.6); z 1009 |  |
| 〃 | 窄 | 〃 | (0, 0) 390×844 | bg 同上; z 1010 | 全屏弹窗仍渲染遮罩 |
| `.doo-modal.dialog-droup-word-chain` | 宽 | 〃 | (0, 0) 1280×860 | p 24px 16px | `is-wide` |
| 〃 | 窄 | 〃 | (0, 0) 390×844 | p 0 | `is-narrow.is-fullscreen` |
| `.doo-modal-card` | 宽 | 〃 | (380, 232.5) 520×395 | bg #ffffff; r 18px; shadow rgba(0,0,0,0.15) 0 4px 12px |  |
| 〃 | 窄 | 〃 | (0, 0) 390×844 | bg #ffffff; r 0; shadow 同上 | 全屏卡片 |
| `.doo-modal-close` | 宽 | `a.doo-modal-close` | (852, 244.5) 38×38 | — | 内含 doo-icon 24×24，色 #999999 |
| `.doo-modal-header` | 宽 | 〃 | (380, 232.5) 520×62 | p 22px 24px 20px |  |
| `.chain-modal-header` | 窄 | 〃 | (16, 0) 358×51 | fs 14px; fw 500 | 窄版顶栏（取消/标题/发送） |
| `.doo-modal-title`「接龙结果」 | 宽 | 〃 | (404, 254.5) 472×20 | fs 18px; fw 500; lh 20px; color #303133 |  |
| `.chain-modal-title` | 窄 | 〃 | (116, 0) 158×51 | fs 14px; fw 500 | 居中 |
| `.chain-modal-close`「取消」 | 窄 | 〃 | (16, 15) 28×21 | fs 14px; fw 500 |  |
| `.chain-modal-submit.disabled`「发送」 | 窄 | 〃 | (346, 15) 28×21 | fs 14px; fw 500; color #9c9c9c | 无内容时禁用 |
| `.doo-modal-body` | 宽 | 〃 | (380, 294.5) 520×255 | p 0 0 2px 32px |  |
| 〃 | 窄 | 〃 | (0, 51) 390×793 | p 10px 0 2px 32px |  |
| `.initiate`（发起人） | 宽 | 〃 | (412, 304.5) 456×26 | m 10px 32px 20px 0 | 头像 22×22 + 名称 fs14 |
| 〃 | 窄 | 〃 | (32, 71) 326×26 | 同上 |  |
| textarea（禁用态文案框） | 宽 | `.ivu-input-wrapper.ivu-input-type-textarea` | (412, 350.5) 456×73 | bg #f3f3f3; color #cccccc; bd 1px solid #e8e8e8; r 4px; p 4px 7px | 只读，占位接龙入口文案 |
| 〃 | 窄 | 〃 | (32, 117) 326×73 | 同上 |  |
| 结果列表 `ul/li` | 宽 | `.doo-modal-body ul` / `li` | ul m 20px 0；li p 5px 0 | fs 14px; color #606266 | 行首序号徽标 28×28 bg #f2f2f2 r 14px fs12 |
| 〃 | 窄 | 〃 | 宽 326 | 同上 |  |
| `li.add`（占位新增行） | 宽 | `.doo-modal-body li.add` | (412, 485.5) 456×42 | p 5px 0 | 图标 28×28，色 #7f7f7f |
| 〃 | 窄 | 〃 | (32, 252) 326×42 | 同上 |  |
| `.doo-modal-footer` | 宽 | 〃 | (380, 549.5) 520×78 | p 20px 24px 22px | 窄版无 footer |
| 取消 | 宽 | `.doo-modal-footer .ivu-btn` | 88×36 | bg #e9eaee; r 10px; fs 14px; fw 500 | hover bg #dfe0e5 |
| 发送 | 宽 | 〃 | 88×36 | bg #84c56a; r 10px; fs 14px; fw 500; color #ffffff | 禁用；margin-left 10px |

- 触发：点击卡片 `ul > li.participate`（带 12×12 箭头 doo-icon，stroke #23241f）打开；点其它文本/整卡无效。
- hover：participate 行无颜色变化（cursor pointer）；弹窗关闭按钮 hover 无变化；取消按钮 hover `#e9eaee → #dfe0e5`。

## 3. 位置卡片

- 会话 id: `33283`；消息 id: `2210750`
- 截图: `shots/location-wide-row.png`, `shots/location-wide-card.png`, `shots/location-narrow-row.png`, `shots/location-narrow-card.png`
- 说明: 自聊（self）；宽视口点击无浮层/无跳转/无监听器（no-op）

view wide={'x': 595.5, 'y': 320, 'w': 614.5, 'h': 210} row={'x': 595.5, 'y': 320, 'w': 652.5, 'h': 226} class=dialog-view location
view narrow={'x': 56, 'y': 321, 'w': 282, 'h': 210} row={'x': 14, 'y': 321, 'w': 362, 'h': 226} class=dialog-view location

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| dialog-avatar | 宽 | `.dialog-item.self > .dialog-avatar` | (622.5, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-avatar` | (290, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| dialog-username | 宽 | `.dialog-item.self > .dialog-view.location > .dialog-username` | (560.3, 0) 54.2×22 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 6px; op 0.8 |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.location > .dialog-username` | (227.8, 0) 54.2×22 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 6px; op 0.8 |  |
| dialog-head | 宽 | `.dialog-item.self > .dialog-view.location > .dialog-head` | (338.5, 28) 276×161 | fs 14px; fw 400; lh 21px; color #606266; bg #84c56a; r 8px 2px 8px 8px; p 8px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.location > .dialog-head` | (6, 28) 276×161 | fs 14px; fw 400; lh 21px; color #606266; bg #84c56a; r 8px 2px 8px 8px; p 8px |  |
| dialog-content | 宽 | `.dialog-item.self > .dialog-view.location > .dialog-head > .dialog-content` | (346.5, 36) 260×145 | fs 14px; fw 400; lh 21px; color #606266 |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.location > .dialog-head > .dialog-content` | (14, 36) 260×145 | fs 14px; fw 400; lh 21px; color #606266 |  |
| content-location.no-dark-content | 宽 | `.dialog-item.self > .dialog-view.location > .dialog-head > .dialog-content > .content-location.no-dark-content` | (346.5, 36) 260×145 | fs 14px; fw 400; lh 21px; color #ffffff |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.location > .dialog-head > .dialog-content > .content-location.no-dark-content` | (14, 36) 260×145 | fs 14px; fw 400; lh 21px; color #ffffff |  |
| location-title 「e2e location」 | 宽 | `.dialog-item.self > .dialog-view.location > .dialog-head > .dialog-content > .content-location.no-dark-content > .location-title` | (346.5, 36) 260×21 | fs 14px; fw 400; lh 21px; color #ffffff |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.location > .dialog-head > .dialog-content > .content-location.no-dark-content > .location-title` | (14, 36) 260×21 | fs 14px; fw 400; lh 21px; color #ffffff |  |
| location-address 「Shanghai」 | 宽 | `.dialog-item.self > .dialog-view.location > .dialog-head > .dialog-content > .content-location.no-dark-content > .location-address` | (346.5, 57) 260×18 | fs 12px; fw 400; lh 18px; color #ffffff; op 0.6 |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.location > .dialog-head > .dialog-content > .content-location.no-dark-content > .location-address` | (14, 57) 260×18 | fs 12px; fw 400; lh 18px; color #ffffff; op 0.6 |  |
| location-preview | 宽 | `.dialog-item.self > .dialog-view.location > .dialog-head > .dialog-content > .content-location.no-dark-content > .location-preview` | (338.5, 79) 276×110 | fs 14px; fw 400; lh 21px; color #ffffff; bgimg url("<测试服>/im; r 0px 0px 6px 6px; m 4px -8px -8px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.location > .dialog-head > .dialog-content > .content-location.no-dark-content > .location-preview` | (6, 79) 276×110 | fs 14px; fw 400; lh 21px; color #ffffff; bgimg url("<测试服>/im; r 0px 0px 6px 6px; m 4px -8px -8px |  |
| dialog-foot | 宽 | `.dialog-item.self > .dialog-view.location > .dialog-foot` | (565.1, 189) 49.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.location > .dialog-foot` | (232.6, 189) 49.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| time 「11-02」 | 宽 | `.dialog-item.self > .dialog-view.location > .dialog-foot > .time` | (565.1, 195.5) 31.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.location > .dialog-foot > .time` | (232.6, 195.5) 31.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |

- HOVER（宽）：无（未找到可交互元素或无变化）
- HOVER（窄）：无（未找到可交互元素或无变化）

## 4. 会议卡片

- 会话 id: `11827`；消息 id: `2210995`
- 截图: `shots/meeting-wide-row.png`, `shots/meeting-wide-card.png`, `shots/meeting-narrow-row.png`, `shots/meeting-narrow-card.png`
- 说明: 自聊（self）；宽视口点击无浮层/无跳转/无监听器（no-op）

view wide={'x': 595.5, 'y': 490, 'w': 614.5, 'h': 250} row={'x': 595.5, 'y': 490, 'w': 652.5, 'h': 266} class=dialog-view meeting
view narrow={'x': 14, 'y': 482, 'w': 324, 'h': 250} row={'x': 14, 'y': 482, 'w': 362, 'h': 266} class=dialog-view meeting

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| dialog-avatar | 宽 | `.dialog-item.self > .dialog-avatar` | (622.5, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-avatar` | (332, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| dialog-head | 宽 | `.dialog-item.self > .dialog-view.meeting > .dialog-head` | (366.5, 0) 248×229 | fs 14px; fw 400; lh 21px; color #606266; bg #84c56a; r 8px 2px 8px 8px; p 8px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.meeting > .dialog-head` | (76, 0) 248×229 | fs 14px; fw 400; lh 21px; color #606266; bg #84c56a; r 8px 2px 8px 8px; p 8px |  |
| dialog-content | 宽 | `.dialog-item.self > .dialog-view.meeting > .dialog-head > .dialog-content` | (374.5, 8) 232×213 | fs 14px; fw 400; lh 21px; color #606266 |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.meeting > .dialog-head > .dialog-content` | (84, 8) 232×213 | fs 14px; fw 400; lh 21px; color #606266 |  |
| content-meeting.no-dark-content | 宽 | `.dialog-item.self > .dialog-view.meeting > .dialog-head > .dialog-content > .content-meeting.no-dark-content` | (374.5, 8) 232×213 | fs 14px; fw 400; lh 21px; color #ffffff; p 4px 6px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.meeting > .dialog-head > .dialog-content > .content-meeting.no-dark-content` | (84, 8) 232×213 | fs 14px; fw 400; lh 21px; color #ffffff; p 4px 6px |  |
| dialog-meeting.meeting-end | 宽 | `.dialog-item.self > .dialog-view.meeting > .dialog-head > .dialog-content > .content-meeting.no-dark-content > .dialog-meeting.meeting-end` | (380.5, 12) 220×205 | fs 14px; fw 400; lh 21px; color #ffffff; op 0.7 |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.meeting > .dialog-head > .dialog-content > .content-meeting.no-dark-content > .dialog-meeting.meeting-end` | (90, 12) 220×205 | fs 14px; fw 400; lh 21px; color #ffffff; op 0.7 |  |
| li | 宽 | `.dialog-item.self > .dialog-view.meeting > .dialog-head > .dialog-content > .content-meeting.no-dark-content > .dialog-meeting.meeting-end > li:nth-of-type(1)` | (380.5, 12) 220×44 | fs 14px; fw 400; lh 21px; color #ffffff; m 0px 0px 16px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.meeting > .dialog-head > .dialog-content > .content-meeting.no-dark-content > .dialog-meeting.meeting-end > li:nth-of-type(1)` | (90, 12) 220×44 | fs 14px; fw 400; lh 21px; color #ffffff; m 0px 0px 16px |  |
| em 「会议主题」 | 宽 | `.dialog-item.self > .dialog-view.meeting > .dialog-head > .dialog-content > .content-meeting.no-dark-content > .dialog-meeting.meeting-end > li:nth-of-type(1) > em` | (380.5, 12) 56×23 | fs 14px; fw 700; lh 21px; color #ffffff; p 0px 0px 2px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.meeting > .dialog-head > .dialog-content > .content-meeting.no-dark-content > .dialog-meeting.meeting-end > li:nth-of-type(1) > em` | (90, 12) 56×23 | fs 14px; fw 700; lh 21px; color #ffffff; p 0px 0px 2px |  |
| em 「会议创建人」 | 宽 | `.dialog-item.self > .dialog-view.meeting > .dialog-head > .dialog-content > .content-meeting.no-dark-content > .dialog-meeting.meeting-end > li:nth-of-type(2) > em` | (380.5, 72) 70×23 | fs 14px; fw 700; lh 21px; color #ffffff; p 0px 0px 2px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.meeting > .dialog-head > .dialog-content > .content-meeting.no-dark-content > .dialog-meeting.meeting-end > li:nth-of-type(2) > em` | (90, 72) 70×23 | fs 14px; fw 700; lh 21px; color #ffffff; p 0px 0px 2px |  |
| avatar-wrapper.common-avatar | 宽 | `.dialog-item.self > .dialog-view.meeting > .dialog-head > .dialog-content > .content-meeting.no-dark-content > .dialog-meeting.meeting-end > li:nth-of-type(2) > .avatar-wrapper.common-avatar` | (380.5, 95) 54.2×16 | fs 14px; fw 400; lh 21px; color #ffffff |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.meeting > .dialog-head > .dialog-content > .content-meeting.no-dark-content > .dialog-meeting.meeting-end > li:nth-of-type(2) > .avatar-wrapper.common-avatar` | (90, 95) 54.2×16 | fs 14px; fw 400; lh 21px; color #ffffff |  |
| avatar-name | 宽 | `.dialog-item.self > .dialog-view.meeting > .dialog-head > .dialog-content > .content-meeting.no-dark-content > .dialog-meeting.meeting-end > li:nth-of-type(2) > .avatar-wrapper.common-avatar > .avatar-name` | (380.5, 95) 54.2×16 | fs 14px; fw 400; color #ffffff |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.meeting > .dialog-head > .dialog-content > .content-meeting.no-dark-content > .dialog-meeting.meeting-end > li:nth-of-type(2) > .avatar-wrapper.common-avatar > .avatar-name` | (90, 95) 54.2×16 | fs 14px; fw 400; color #ffffff |  |
| span 「DooTask」 | 宽 | `.dialog-item.self > .dialog-view.meeting > .dialog-head > .dialog-content > .content-meeting.no-dark-content > .dialog-meeting.meeting-end > li:nth-of-type(2) > .avatar-wrapper.common-avatar > .avatar-name > span` | (380.5, 95) 54.2×16 | fs 14px; fw 400; color #ffffff |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.meeting > .dialog-head > .dialog-content > .content-meeting.no-dark-content > .dialog-meeting.meeting-end > li:nth-of-type(2) > .avatar-wrapper.common-avatar > .avatar-name > span` | (90, 95) 54.2×16 | fs 14px; fw 400; color #ffffff |  |
| em 「频道ID」 | 宽 | `.dialog-item.self > .dialog-view.meeting > .dialog-head > .dialog-content > .content-meeting.no-dark-content > .dialog-meeting.meeting-end > li:nth-of-type(3) > em` | (380.5, 127) 42.5×23 | fs 14px; fw 700; lh 21px; color #ffffff; p 0px 0px 2px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.meeting > .dialog-head > .dialog-content > .content-meeting.no-dark-content > .dialog-meeting.meeting-end > li:nth-of-type(3) > em` | (90, 127) 42.5×23 | fs 14px; fw 700; lh 21px; color #ffffff; p 0px 0px 2px |  |
| meeting-operation 「会议已结束」 | 宽 | `.dialog-item.self > .dialog-view.meeting > .dialog-head > .dialog-content > .content-meeting.no-dark-content > .dialog-meeting.meeting-end > .meeting-operation` | (380.5, 187) 220×30 | fs 12px; fw 400; lh 18px; color #ffffff; p 12px 0px 0px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.meeting > .dialog-head > .dialog-content > .content-meeting.no-dark-content > .dialog-meeting.meeting-end > .meeting-operation` | (90, 187) 220×30 | fs 12px; fw 400; lh 18px; color #ffffff; p 12px 0px 0px |  |
| dialog-foot | 宽 | `.dialog-item.self > .dialog-view.meeting > .dialog-foot` | (567.1, 229) 47.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.meeting > .dialog-foot` | (276.6, 229) 47.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| time 「11-07」 | 宽 | `.dialog-item.self > .dialog-view.meeting > .dialog-foot > .time` | (567.1, 235.5) 31.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.meeting > .dialog-foot > .time` | (276.6, 235.5) 31.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |

- HOVER（宽）：无（未找到可交互元素或无变化）
- HOVER（窄）：无（未找到可交互元素或无变化）

## 5. 合并转发卡片

- 会话 id: `2367`；消息 id: `2211230`
- 截图: `shots/merge-wide-row.png`, `shots/merge-wide-card.png`, `shots/merge-narrow-row.png`, `shots/merge-narrow-card.png`, `shots/merge-detail-wide-full.png`, `shots/merge-detail-narrow-full.png`
- 说明: 自聊（self）；点击标题打开详情抽屉（见补充）

view wide={'x': 595.5, 'y': 505.5, 'w': 614.5, 'h': 167.5} row={'x': 595.5, 'y': 505.5, 'w': 652.5, 'h': 183.5} class=dialog-view merge-forward
view narrow={'x': 14, 'y': 489.5, 'w': 324, 'h': 167.5} row={'x': 14, 'y': 489.5, 'w': 362, 'h': 183.5} class=dialog-view merge-forward

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| dialog-avatar | 宽 | `.dialog-item.self > .dialog-avatar` | (622.5, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-avatar` | (332, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| dialog-head | 宽 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head` | (378.9, 0) 235.6×146.5 | fs 14px; fw 400; lh 21px; color #606266; bg #84c56a; r 8px 2px 8px 8px; p 8px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head` | (88.4, 0) 235.6×146.5 | fs 14px; fw 400; lh 21px; color #606266; bg #84c56a; r 8px 2px 8px 8px; p 8px |  |
| dialog-content | 宽 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content` | (386.9, 8) 219.6×130.5 | fs 14px; fw 400; lh 21px; color #606266 |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content` | (96.4, 8) 219.6×130.5 | fs 14px; fw 400; lh 21px; color #606266 |  |
| content-merge-forward | 宽 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward` | (386.9, 8) 219.6×130.5 | fs 14px; fw 400; lh 21px; color #606266; bg #f7f7f7; r 8px; p 12px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward` | (96.4, 8) 219.6×130.5 | fs 14px; fw 400; lh 21px; color #606266; bg #f7f7f7; r 8px; p 12px |  |
| merge-title 「DooTask和周海源的聊天记录」 | 宽 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-title` | (398.9, 20) 195.6×19.5 | fs 13px; fw 500; lh 19.5px; color #333333; bd 0px none rgb(51, 51, 51); m 0px 0px 8px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-title` | (108.4, 20) 195.6×19.5 | fs 13px; fw 500; lh 19.5px; color #333333; bd 0px none rgb(51, 51, 51); m 0px 0px 8px |  |
| merge-list | 宽 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-list` | (398.9, 47.5) 195.6×44 | fs 14px; fw 400; lh 21px; color #606266 |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-list` | (108.4, 47.5) 195.6×44 | fs 14px; fw 400; lh 21px; color #606266 |  |
| merge-item | 宽 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-list > .merge-item:nth-of-type(1)` | (398.9, 47.5) 195.6×22 | fs 12px; fw 400; lh 22px; color #666666; bd 0px none rgb(102, 102, 102) |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-list > .merge-item:nth-of-type(1)` | (108.4, 47.5) 195.6×22 | fs 12px; fw 400; lh 22px; color #666666; bd 0px none rgb(102, 102, 102) |  |
| avatar-wrapper.common-avatar | 宽 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-list > .merge-item:nth-of-type(1) > .avatar-wrapper.common-avatar` | (398.9, 50) 36×17 | fs 12px; fw 400; lh 22px; color #666666; bd 0px none rgb(102, 102, 102) |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-list > .merge-item:nth-of-type(1) > .avatar-wrapper.common-avatar` | (108.4, 50) 36×17 | fs 12px; fw 400; lh 22px; color #666666; bd 0px none rgb(102, 102, 102) |  |
| avatar-name | 宽 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-list > .merge-item:nth-of-type(1) > .avatar-wrapper.common-avatar > .avatar-name` | (398.9, 50) 36×17 | fs 12px; fw 400; color #666666; bd 0px none rgb(102, 102, 102) |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-list > .merge-item:nth-of-type(1) > .avatar-wrapper.common-avatar > .avatar-name` | (108.4, 50) 36×17 | fs 12px; fw 400; color #666666; bd 0px none rgb(102, 102, 102) |  |
| span 「周海源」 | 宽 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-list > .merge-item:nth-of-type(1) > .avatar-wrapper.common-avatar > .avatar-name > span` | (398.9, 50) 36×17 | fs 12px; fw 400; color #666666; bd 0px none rgb(102, 102, 102) |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-list > .merge-item:nth-of-type(1) > .avatar-wrapper.common-avatar > .avatar-name > span` | (108.4, 50) 36×17 | fs 12px; fw 400; color #666666; bd 0px none rgb(102, 102, 102) |  |
| item-colon 「:」 | 宽 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-list > .merge-item:nth-of-type(1) > .item-colon` | (436.9, 47.5) 3.3×22 | fs 12px; fw 400; lh 22px; color #666666; bd 0px none rgb(102, 102, 102); m 0px 2px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-list > .merge-item:nth-of-type(1) > .item-colon` | (146.4, 47.5) 3.3×22 | fs 12px; fw 400; lh 22px; color #666666; bd 0px none rgb(102, 102, 102); m 0px 2px |  |
| item-desc 「cpu占用高一般都是查询导致」 | 宽 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-list > .merge-item:nth-of-type(1) > .item-desc` | (442.3, 47.5) 152.2×22 | fs 12px; fw 400; lh 22px; color #666666; bd 0px none rgb(102, 102, 102) |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-list > .merge-item:nth-of-type(1) > .item-desc` | (151.8, 47.5) 152.2×22 | fs 12px; fw 400; lh 22px; color #666666; bd 0px none rgb(102, 102, 102) |  |
| merge-item | 宽 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-list > .merge-item:nth-of-type(2)` | (398.9, 69.5) 195.6×22 | fs 12px; fw 400; lh 22px; color #666666; bd 0px none rgb(102, 102, 102) |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-list > .merge-item:nth-of-type(2)` | (108.4, 69.5) 195.6×22 | fs 12px; fw 400; lh 22px; color #666666; bd 0px none rgb(102, 102, 102) |  |
| avatar-wrapper.common-avatar | 宽 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-list > .merge-item:nth-of-type(2) > .avatar-wrapper.common-avatar` | (398.9, 73.5) 46.5×14 | fs 12px; fw 400; lh 22px; color #666666; bd 0px none rgb(102, 102, 102) |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-list > .merge-item:nth-of-type(2) > .avatar-wrapper.common-avatar` | (108.4, 73.5) 46.5×14 | fs 12px; fw 400; lh 22px; color #666666; bd 0px none rgb(102, 102, 102) |  |
| avatar-name | 宽 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-list > .merge-item:nth-of-type(2) > .avatar-wrapper.common-avatar > .avatar-name` | (398.9, 73.5) 46.5×14 | fs 12px; fw 400; color #666666; bd 0px none rgb(102, 102, 102) |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-list > .merge-item:nth-of-type(2) > .avatar-wrapper.common-avatar > .avatar-name` | (108.4, 73.5) 46.5×14 | fs 12px; fw 400; color #666666; bd 0px none rgb(102, 102, 102) |  |
| merge-footer 「共2条消息」 | 宽 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-footer` | (398.9, 99.5) 195.6×27 | fs 12px; fw 400; lh 18px; color #999999; p 8px 0px 0px; m 8px 0px 0px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-head > .dialog-content > .content-merge-forward > .merge-footer` | (108.4, 99.5) 195.6×27 | fs 12px; fw 400; lh 18px; color #999999; p 8px 0px 0px; m 8px 0px 0px |  |
| dialog-foot | 宽 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-foot` | (584.5, 146.5) 30×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-foot` | (294, 146.5) 30×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| time 「07:17」 | 宽 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-foot > .time` | (584.5, 153) 30×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.merge-forward > .dialog-foot > .time` | (294, 153) 30×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |

- HOVER（宽）`.merge-title`（cursor pointer）：样式无变化
- HOVER（宽）`.merge-footer`（cursor pointer）：样式无变化
- HOVER（窄）`.merge-title`（cursor pointer）：样式无变化
- HOVER（窄）`.merge-footer`（cursor pointer）：样式无变化

**补充：合并转发详情抽屉**（点击 `.merge-title` 打开）

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 遮罩 `.layer-stack-mask` | 宽 | `.layer-stack-mask` | (0, 0) 1280×860 | bg rgba(55,55,55,0.6); z 1009 | 窄版无遮罩（is-no-mask） |
| `.doo-modal.common-drawer.drawer-right` | 宽 | 〃 | (0, 0) 1280×860 | p 0 | `is-wide.is-fullscreen` |
| `.doo-modal.common-drawer.drawer-bottom.drawer-fullscreen` | 窄 | 〃 | (0, 0) 390×844 | p 0 | `is-narrow.is-fullscreen.is-no-mask` |
| `.overlay-body` | 宽 | 〃 | (780, 0) 500×860 | — | 右侧抽屉贴边 |
| 〃 | 窄 | 〃 | (0, 0) 390×844 | — |  |
| `.overlay-close` | 宽 | 〃 | (1228, 12) 40×40 | — |  |
| 〃 | 窄 | 〃 | (342, 8) 40×40 | — |  |
| `.overlay-content` | 宽 | 〃 | (780, 0) 500×860 | bg #ffffff |  |
| 〃 | 窄 | 〃 | (0, 0) 390×844 | bg #f8f8f8 |  |
| `.dialog-wrapper.inde-list` | 宽 | 〃 | (780, 0) 500×860 | bg #ffffff; r 18px 0 0 18px |  |
| 〃 | 窄 | 〃 | (0, 0) 390×844 | bg #f8f8f8; r 18px 0 0 18px |  |
| `.dialog-nav` / `.drawer-title` | 宽 | 〃 | (780, 0) 500×56 | fs 16px; fw 500; lh 56px; 居中 | 标题「DooTask和周海源的聊天记录」 |
| 〃 | 窄 | 〃 | (0, 0) 390×56 | 同上 |  |
| `.dialog-msgs` | 宽 | 〃 | (780, 56) 500×804 | — |  |
| 〃 | 窄 | 〃 | (0, 56) 390×788 | — |  |
| `.dialog-scroller` | 宽 | 〃 | (780, 56) 500×804 | p 16px 20px 0 |  |
| 〃 | 窄 | 〃 | (0, 56) 390×788 | p 16px 14px 0; bg #ffffff |  |
| `.dialog-item` | 宽 | 〃 | (800, 72) 460×77 | p 0 0 16px |  |
| 〃 | 窄 | 〃 | (14, 72) 362×77 | 同上 |  |
| `.dialog-view.text`（来消息/自己） | 宽 | 〃 | 来 (838, 72) 322×61；己 (900, 149) 322×61 | — | 气泡沿用主聊天样式，来左/己右 |
| 〃 | 窄 | 〃 | 来 (52, 72) 282×61；己 (56, 149) 282×61 | — |  |

- 触发：点击卡片标题 `.merge-title`（cursor pointer）打开右侧/底部抽屉；点击卡片其余区域无反应。
- hover：`.merge-title`、`.merge-footer`（共2条消息）颜色/背景/阴影均无变化，仅 cursor pointer。

## 6. 长文本卡片

- 会话 id: `33283`；消息 id: `2210756`
- 截图: `shots/longtext-wide-row.png`, `shots/longtext-wide-card.png`, `shots/longtext-narrow-row.png`, `shots/longtext-narrow-card.png`, `shots/longtext-detail-wide.png`, `shots/longtext-detail-narrow.png`
- 说明: 自聊（self）；点击「查看详情」新开阅读页（见补充）

view wide={'x': 753.25, 'y': 3.953125, 'w': 456.75, 'h': 841.375} row={'x': 595.5, 'y': 3.953125, 'w': 652.5, 'h': 857.375} class=dialog-view longtext
view narrow={'x': 84.609375, 'y': -75.046875, 'w': 253.390625, 'h': 1001.375} row={'x': 14, 'y': -75.046875, 'w': 362, 'h': 1017.375} class=dialog-view longtext

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| dialog-avatar | 宽 | `.dialog-item.self > .dialog-avatar` | (464.8, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-avatar` | (261.4, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| dialog-username | 宽 | `.dialog-item.self > .dialog-view.longtext > .dialog-username` | (402.5, 0) 54.2×22 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 6px; op 0.8 |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.longtext > .dialog-username` | (199.2, 0) 54.2×22 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 6px; op 0.8 |  |
| dialog-head | 宽 | `.dialog-item.self > .dialog-view.longtext > .dialog-head` | (97.8, 28) 358.9×792.4 | fs 14px; fw 400; lh 21px; color #606266; bg #84c56a; r 8px 2px 8px 8px; p 8px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.longtext > .dialog-head` | (0, 28) 253.4×952.4 | fs 14px; fw 400; lh 21px; color #606266; bg #84c56a; r 8px 2px 8px 8px; p 8px |  |
| dialog-content | 宽 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content` | (105.8, 36) 342.9×776.4 | fs 14px; fw 400; lh 21px; color #606266 |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content` | (8, 36) 237.4×936.4 | fs 14px; fw 400; lh 21px; color #606266 |  |
| content-text.no-dark-content | 宽 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content` | (105.8, 36) 342.9×776.4 | fs 14px; fw 400; lh 21px; color #ffffff; p 2px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content` | (8, 36) 237.4×936.4 | fs 14px; fw 400; lh 21px; color #ffffff; p 2px |  |
| markdown-body.dialog-markdown | 宽 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .markdown-body.dialog-markdown` | (107.8, 38) 338.9×724.4 | fs 14px; fw 400; lh 20px; color #ffffff |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .markdown-body.dialog-markdown` | (10, 38) 233.4×884.4 | fs 14px; fw 400; lh 20px; color #ffffff |  |
| h2 「Section 1」 | 宽 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .markdown-body.dialog-markdown > h2:nth-of-type(1)` | (107.8, 38) 338.9×33.5 | fs 21px; fw 600; lh 26.25px; color #ffffff; p 0px 0px 6.3px; m 0px 0px 16px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .markdown-body.dialog-markdown > h2:nth-of-type(1)` | (10, 38) 233.4×33.5 | fs 21px; fw 600; lh 26.25px; color #ffffff; p 0px 0px 6.3px; m 0px 0px 16px |  |
| p 「This is paragraph 1 of the」 | 宽 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .markdown-body.dialog-markdown > p:nth-of-type(1)` | (107.8, 87.5) 338.9×20 | fs 14px; fw 400; lh 20px; color #ffffff; m 0px 0px 16px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .markdown-body.dialog-markdown > p:nth-of-type(1)` | (10, 87.5) 233.4×40 | fs 14px; fw 400; lh 20px; color #ffffff; m 0px 0px 16px |  |
| h2 「Section 2」 | 宽 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .markdown-body.dialog-markdown > h2:nth-of-type(2)` | (107.8, 131.5) 338.9×33.5 | fs 21px; fw 600; lh 26.25px; color #ffffff; p 0px 0px 6.3px; m 24px 0px 16px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .markdown-body.dialog-markdown > h2:nth-of-type(2)` | (10, 151.5) 233.4×33.5 | fs 21px; fw 600; lh 26.25px; color #ffffff; p 0px 0px 6.3px; m 24px 0px 16px |  |
| h2 「Section 3」 | 宽 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .markdown-body.dialog-markdown > h2:nth-of-type(3)` | (107.8, 225.1) 338.9×33.5 | fs 21px; fw 600; lh 26.25px; color #ffffff; p 0px 0px 6.3px; m 24px 0px 16px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .markdown-body.dialog-markdown > h2:nth-of-type(3)` | (10, 265.1) 233.4×33.5 | fs 21px; fw 600; lh 26.25px; color #ffffff; p 0px 0px 6.3px; m 24px 0px 16px |  |
| h2 「Section 4」 | 宽 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .markdown-body.dialog-markdown > h2:nth-of-type(4)` | (107.8, 318.6) 338.9×33.5 | fs 21px; fw 600; lh 26.25px; color #ffffff; p 0px 0px 6.3px; m 24px 0px 16px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .markdown-body.dialog-markdown > h2:nth-of-type(4)` | (10, 378.6) 233.4×33.5 | fs 21px; fw 600; lh 26.25px; color #ffffff; p 0px 0px 6.3px; m 24px 0px 16px |  |
| h2 「Section 5」 | 宽 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .markdown-body.dialog-markdown > h2:nth-of-type(5)` | (107.8, 412.2) 338.9×33.5 | fs 21px; fw 600; lh 26.25px; color #ffffff; p 0px 0px 6.3px; m 24px 0px 16px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .markdown-body.dialog-markdown > h2:nth-of-type(5)` | (10, 492.2) 233.4×33.5 | fs 21px; fw 600; lh 26.25px; color #ffffff; p 0px 0px 6.3px; m 24px 0px 16px |  |
| h2 「Section 6」 | 宽 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .markdown-body.dialog-markdown > h2:nth-of-type(6)` | (107.8, 505.7) 338.9×33.5 | fs 21px; fw 600; lh 26.25px; color #ffffff; p 0px 0px 6.3px; m 24px 0px 16px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .markdown-body.dialog-markdown > h2:nth-of-type(6)` | (10, 605.7) 233.4×33.5 | fs 21px; fw 600; lh 26.25px; color #ffffff; p 0px 0px 6.3px; m 24px 0px 16px |  |
| h2 「Section 7」 | 宽 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .markdown-body.dialog-markdown > h2:nth-of-type(7)` | (107.8, 599.3) 338.9×33.5 | fs 21px; fw 600; lh 26.25px; color #ffffff; p 0px 0px 6.3px; m 24px 0px 16px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .markdown-body.dialog-markdown > h2:nth-of-type(7)` | (10, 719.3) 233.4×33.5 | fs 21px; fw 600; lh 26.25px; color #ffffff; p 0px 0px 6.3px; m 24px 0px 16px |  |
| h2 「Section 8」 | 宽 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .markdown-body.dialog-markdown > h2:nth-of-type(8)` | (107.8, 692.8) 338.9×33.5 | fs 21px; fw 600; lh 26.25px; color #ffffff; p 0px 0px 6.3px; m 24px 0px 16px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .markdown-body.dialog-markdown > h2:nth-of-type(8)` | (10, 832.8) 233.4×33.5 | fs 21px; fw 600; lh 26.25px; color #ffffff; p 0px 0px 6.3px; m 24px 0px 16px |  |
| p 「This is paragraph 8 of the」 | 宽 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .markdown-body.dialog-markdown > p:nth-of-type(8)` | (107.8, 742.4) 338.9×20 | fs 14px; fw 400; lh 20px; color #ffffff |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .markdown-body.dialog-markdown > p:nth-of-type(8)` | (10, 882.4) 233.4×40 | fs 14px; fw 400; lh 20px; color #ffffff |  |
| content-longtext-footer | 宽 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .content-longtext-footer` | (107.8, 774.4) 338.9×36 | fs 14px; fw 400; lh 21px; color #ffffff; m 12px 0px 0px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .content-longtext-footer` | (10, 934.4) 233.4×36 | fs 14px; fw 400; lh 21px; color #ffffff; m 12px 0px 0px |  |
| span 「查看详情」 | 宽 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .content-longtext-footer > span` | (107.8, 775.4) 338.9×45 | fs 14px; fw 400; lh 21px; color #ffffff; p 12px; m 0px 0px -10px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.longtext > .dialog-head > .dialog-content > .content-text.no-dark-content > .content-longtext-footer > span` | (10, 935.4) 233.4×45 | fs 14px; fw 400; lh 21px; color #ffffff; p 12px; m 0px 0px -10px |  |
| dialog-foot | 宽 | `.dialog-item.self > .dialog-view.longtext > .dialog-foot` | (407.4, 820.4) 49.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.longtext > .dialog-foot` | (204, 980.4) 49.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| time 「11-02」 | 宽 | `.dialog-item.self > .dialog-view.longtext > .dialog-foot > .time` | (407.4, 826.9) 31.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |
| 〃 | 窄 | `.dialog-item.self > .dialog-view.longtext > .dialog-foot > .time` | (204, 986.9) 31.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |

- HOVER（宽）：无（未找到可交互元素或无变化）
- HOVER（窄）：无（未找到可交互元素或无变化）

**补充：查看全文入口行为**

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 阅读页根容器 | 宽 | `.dialog-content`（阅读页） | (0, 0) 1280×860 | p 16px; bg #ffffff（body） | 新标签页整页，无浮层 |
| 〃 | 窄 | 〃 | (0, 0) 390×844 | 同上 |  |

- 点击卡片内「查看详情」→ 新标签页 `<测试服>/single/file/msg/2210756`，`document.title = 消息详情`；页面正文为长文本（Section 1/2/3…）。
- 本次只量气泡展示与入口/新页框架，全文阅读排版由另一测量任务负责。

## 7. template（模板消息）

模板卡片按 `msg.type` 渲染，统一结构 `.dialog-view.template > .dialog-head > .dialog-content > .content-template`。以下每个子节给出会话/消息 id、截图与完整部件表。

**通用样式**（对方发送）：`.dialog-head` bg #f4f5f7、r 2px 8px 8px 8px、p 8px；`.content-template` color #303133、p 0 2px；正文 `.markdown-body.dialog-markdown`；h3 fs 17.5px fw 600 lh 21.875px m 0 0 16px；表格 bd 1px solid #d0d7de、th/td p 6px 13px、th fw 600；`.mark-color.mark-set` color #84c56a。自己发送时为绿色气泡 #84c56a、r 8px 2px 8px 8px（本批样本均为对方发送）。

### 7.1 /help

- 会话 id: `6331`；消息 id: `2211235`
- 截图: `shots/tpl_help-wide-row.png`, `shots/tpl_help-wide-card.png`, `shots/tpl_help-narrow-row.png`, `shots/tpl_help-narrow-card.png`
- 说明: 机器人模板；markdown 渲染，含标题/表格/高亮标记

view wide={'x': 633.5, 'y': -14.328125, 'w': 614.5, 'h': 837.375} row={'x': 595.5, 'y': -14.328125, 'w': 652.5, 'h': 853.375} class=dialog-view template
view narrow={'x': 52, 'y': -10.078125, 'w': 282, 'h': 837.375} row={'x': 14, 'y': -10.078125, 'w': 362, 'h': 853.375} class=dialog-view template

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| dialog-avatar | 宽 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| 〃 | 窄 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| dialog-head | 宽 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 568.3×816.4 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 282×816.4 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| dialog-content | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 8) 552.3×800.4 | fs 14px; fw 400; lh 21px; color #606266 |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 8) 266×800.4 | fs 14px; fw 400; lh 21px; color #606266 |  |
| content-template.no-dark-content./help | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help` | (8, 8) 552.3×800.4 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help` | (8, 8) 266×800.4 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| markdown-body.dialog-markdown | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown` | (10, 8) 548.3×800.4 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown` | (10, 8) 262×800.4 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| h3 「您可以通过发送以下命令来控制我」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > h3:nth-of-type(1)` | (10, 8) 548.3×21.9 | fs 17.5px; fw 600; lh 21.875px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > h3:nth-of-type(1)` | (10, 8) 262×21.9 | fs 17.5px; fw 600; lh 21.875px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| table | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(1)` | (10, 45.9) 260.3×103 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(1)` | (10, 45.9) 260.3×103 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| thead | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(1) > thead` | (10.5, 46.4) 259.3×34 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(1) > thead` | (10.5, 46.4) 259.3×34 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| tr | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(1) > thead > tr` | (10.5, 46.4) 259.3×34 | fs 14px; fw 400; lh 21px; color #303133; bg #ffffff |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(1) > thead > tr` | (10.5, 46.4) 259.3×34 | fs 14px; fw 400; lh 21px; color #303133; bg #ffffff |  |
| th 「命令」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(1) > thead > tr > th:nth-of-type(1)` | (10.5, 46.4) 162.8×34 | fs 14px; fw 600; lh 21px; color #303133; bd 1px solid rgb(208, 215, 222); p 6px 13px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(1) > thead > tr > th:nth-of-type(1)` | (10.5, 46.4) 162.8×34 | fs 14px; fw 600; lh 21px; color #303133; bd 1px solid rgb(208, 215, 222); p 6px 13px |  |
| tbody | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(1) > tbody` | (10.5, 80.4) 259.3×68 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(1) > tbody` | (10.5, 80.4) 259.3×68 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| td | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(1) > tbody > tr:nth-of-type(1) > td:nth-of-type(1)` | (10.5, 80.4) 162.8×34 | fs 14px; fw 400; lh 21px; color #303133; bd 1px solid rgb(208, 215, 222); p 6px 13px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(1) > tbody > tr:nth-of-type(1) > td:nth-of-type(1)` | (10.5, 80.4) 162.8×34 | fs 14px; fw 400; lh 21px; color #303133; bd 1px solid rgb(208, 215, 222); p 6px 13px |  |
| tr | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(1) > tbody > tr:nth-of-type(2)` | (10.5, 114.4) 259.3×34 | fs 14px; fw 400; lh 21px; color #303133; bg #f6f8fa |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(1) > tbody > tr:nth-of-type(2)` | (10.5, 114.4) 259.3×34 | fs 14px; fw 400; lh 21px; color #303133; bg #f6f8fa |  |
| h3 「修改机器人」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > h3:nth-of-type(2)` | (10, 172.9) 548.3×21.9 | fs 17.5px; fw 600; lh 21.875px; color #303133; bd 0px none rgb(48, 49, 51); m 24px 0px 16px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > h3:nth-of-type(2)` | (10, 172.9) 262×21.9 | fs 17.5px; fw 600; lh 21.875px; color #303133; bd 0px none rgb(48, 49, 51); m 24px 0px 16px |  |
| table | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(2)` | (10, 210.8) 548.3×171 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(2)` | (10, 210.8) 262×171 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| thead | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(2) > thead` | (10.5, 211.3) 547.3×34 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(2) > thead` | (10.5, 211.3) 547.3×34 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| tbody | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(2) > tbody` | (10.5, 245.3) 547.3×136 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(2) > tbody` | (10.5, 245.3) 547.3×136 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| h3 「机器人设置」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > h3:nth-of-type(3)` | (10, 405.8) 548.3×21.9 | fs 17.5px; fw 600; lh 21.875px; color #303133; bd 0px none rgb(48, 49, 51); m 24px 0px 16px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > h3:nth-of-type(3)` | (10, 405.8) 262×21.9 | fs 17.5px; fw 600; lh 21.875px; color #303133; bd 0px none rgb(48, 49, 51); m 24px 0px 16px |  |
| table | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(3)` | (10, 443.6) 307.2×103 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(3)` | (10, 443.6) 262×103 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| thead | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(3) > thead` | (10.5, 444.1) 306.2×34 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(3) > thead` | (10.5, 444.1) 306.2×34 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| tbody | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(3) > tbody` | (10.5, 478.1) 306.2×68 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(3) > tbody` | (10.5, 478.1) 306.2×68 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| h3 「会话管理」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > h3:nth-of-type(4)` | (10, 570.6) 548.3×21.9 | fs 17.5px; fw 600; lh 21.875px; color #303133; bd 0px none rgb(48, 49, 51); m 24px 0px 16px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > h3:nth-of-type(4)` | (10, 570.6) 262×21.9 | fs 17.5px; fw 600; lh 21.875px; color #303133; bd 0px none rgb(48, 49, 51); m 24px 0px 16px |  |
| table | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(4)` | (10, 608.5) 320.6×69 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(4)` | (10, 608.5) 262×69 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| thead | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(4) > thead` | (10.5, 609) 319.6×34 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(4) > thead` | (10.5, 609) 319.6×34 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| tbody | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(4) > tbody` | (10.5, 643) 319.6×34 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(4) > tbody` | (10.5, 643) 319.6×34 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| h3 「API接口文档」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > h3:nth-of-type(5)` | (10, 701.5) 548.3×21.9 | fs 17.5px; fw 600; lh 21.875px; color #303133; bd 0px none rgb(48, 49, 51); m 24px 0px 16px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > h3:nth-of-type(5)` | (10, 701.5) 262×21.9 | fs 17.5px; fw 600; lh 21.875px; color #303133; bd 0px none rgb(48, 49, 51); m 24px 0px 16px |  |
| table | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(5)` | (10, 739.4) 165.2×69 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(5)` | (10, 739.4) 165.2×69 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| thead | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(5) > thead` | (10.5, 739.9) 164.2×34 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(5) > thead` | (10.5, 739.9) 164.2×34 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| tbody | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(5) > tbody` | (10.5, 773.9) 164.2×34 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./help > .markdown-body.dialog-markdown > table:nth-of-type(5) > tbody` | (10.5, 773.9) 164.2×34 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| dialog-foot | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 816.4) 30×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 816.4) 30×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| time 「08:06」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 822.9) 30×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 822.9) 30×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |

- HOVER（宽）：无（未找到可交互元素或无变化）
- HOVER（窄）：无（未找到可交互元素或无变化）

### 7.2 /list

- 会话 id: `6331`；消息 id: `1783858`
- 截图: `shots/tpl_list-wide-row.png`, `shots/tpl_list-wide-card.png`, `shots/tpl_list-narrow-row.png`, `shots/tpl_list-narrow-card.png`
- 说明: 机器人模板；markdown 表格为主

view wide={'x': 633.5, 'y': 331.65625, 'w': 614.5, 'h': 143.875} row={'x': 595.5, 'y': 331.65625, 'w': 652.5, 'h': 159.875} class=dialog-view template
view narrow={'x': 52, 'y': 337.15625, 'w': 282, 'h': 143.875} row={'x': 14, 'y': 337.15625, 'w': 362, 'h': 159.875} class=dialog-view template

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| dialog-avatar | 宽 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| 〃 | 窄 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| dialog-head | 宽 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 290×122.9 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 282×122.9 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| dialog-content | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 8) 274×106.9 | fs 14px; fw 400; lh 21px; color #606266 |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 8) 266×106.9 | fs 14px; fw 400; lh 21px; color #606266 |  |
| content-template.no-dark-content./list | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./list` | (8, 8) 274×106.9 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./list` | (8, 8) 266×106.9 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| markdown-body.dialog-markdown | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./list > .markdown-body.dialog-markdown` | (10, 8) 270×106.9 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./list > .markdown-body.dialog-markdown` | (10, 8) 262×106.9 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| h3 「我的机器人」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./list > .markdown-body.dialog-markdown > h3` | (10, 8) 270×21.9 | fs 17.5px; fw 600; lh 21.875px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./list > .markdown-body.dialog-markdown > h3` | (10, 8) 262×21.9 | fs 17.5px; fw 600; lh 21.875px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| table | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./list > .markdown-body.dialog-markdown > table` | (10, 45.9) 270×69 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./list > .markdown-body.dialog-markdown > table` | (10, 45.9) 262×69 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| thead | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./list > .markdown-body.dialog-markdown > table > thead` | (10.5, 46.4) 269×34 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./list > .markdown-body.dialog-markdown > table > thead` | (10.5, 46.4) 269×34 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| tr | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./list > .markdown-body.dialog-markdown > table > thead > tr` | (10.5, 46.4) 269×34 | fs 14px; fw 400; lh 21px; color #303133; bg #ffffff |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./list > .markdown-body.dialog-markdown > table > thead > tr` | (10.5, 46.4) 269×34 | fs 14px; fw 400; lh 21px; color #303133; bg #ffffff |  |
| th 「ID」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./list > .markdown-body.dialog-markdown > table > thead > tr > th:nth-of-type(1)` | (10.5, 46.4) 44.3×34 | fs 14px; fw 600; lh 21px; color #303133; bd 1px solid rgb(208, 215, 222); p 6px 13px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./list > .markdown-body.dialog-markdown > table > thead > tr > th:nth-of-type(1)` | (10.5, 46.4) 44.3×34 | fs 14px; fw 600; lh 21px; color #303133; bd 1px solid rgb(208, 215, 222); p 6px 13px |  |
| tbody | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./list > .markdown-body.dialog-markdown > table > tbody` | (10.5, 80.4) 269×34 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./list > .markdown-body.dialog-markdown > table > tbody` | (10.5, 80.4) 269×34 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| td 「85」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./list > .markdown-body.dialog-markdown > table > tbody > tr > td:nth-of-type(1)` | (10.5, 80.4) 44.3×34 | fs 14px; fw 400; lh 21px; color #303133; bd 1px solid rgb(208, 215, 222); p 6px 13px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./list > .markdown-body.dialog-markdown > table > tbody > tr > td:nth-of-type(1)` | (10.5, 80.4) 44.3×34 | fs 14px; fw 400; lh 21px; color #303133; bd 1px solid rgb(208, 215, 222); p 6px 13px |  |
| dialog-foot | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 122.9) 62.7×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 122.9) 62.7×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| time 「2025-03-22」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 129.4) 62.7×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 129.4) 62.7×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |

- HOVER（宽）：无（未找到可交互元素或无变化）
- HOVER（窄）：无（未找到可交互元素或无变化）

### 7.3 /api

- 会话 id: `6331`；消息 id: `1958789`
- 截图: `shots/tpl_api-wide-row.png`, `shots/tpl_api-wide-card.png`, `shots/tpl_api-wide-card-closed.png`, `shots/tpl_api-narrow-row.png`, `shots/tpl_api-narrow-card.png`, `shots/tpl_api-narrow-card-closed.png`
- 说明: 机器人模板；含 h2/hr/details/summary/code，details 可折叠

view wide={'x': 633.5, 'y': 40.78125, 'w': 614.5, 'h': 726.390625} row={'x': 595.5, 'y': 40.78125, 'w': 652.5, 'h': 742.390625} class=dialog-view template
view narrow={'x': 52, 'y': -66.71875, 'w': 282, 'h': 952.140625} row={'x': 14, 'y': -66.71875, 'w': 362, 'h': 968.140625} class=dialog-view template

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| dialog-avatar | 宽 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| 〃 | 窄 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| dialog-head | 宽 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 614.5×705.4 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 282×931.1 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| dialog-content | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 8) 598.5×689.4 | fs 14px; fw 400; lh 21px; color #606266 |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 8) 266×915.1 | fs 14px; fw 400; lh 21px; color #606266 |  |
| content-template.no-dark-content./api | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api` | (8, 8) 598.5×689.4 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api` | (8, 8) 266×915.1 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| markdown-body.dialog-markdown | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown` | (10, 8) 594.5×689.4 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown` | (10, 8) 262×915.1 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| h2 「API 使用说明」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > h2:nth-of-type(1)` | (10, 8) 594.5×33.5 | fs 21px; fw 600; lh 26.25px; color #303133; p 0px 0px 6.3px; m 0px 0px 16px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > h2:nth-of-type(1)` | (10, 8) 262×33.5 | fs 21px; fw 600; lh 26.25px; color #303133; p 0px 0px 6.3px; m 0px 0px 16px |  |
| hr | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > hr:nth-of-type(1)` | (10, 65.5) 594.5×3.5 | fs 14px; fw 400; lh 21px; color #808080; bg #d0d7de; bd 0px none rgb(128, 128, 128); m 24px 0px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > hr:nth-of-type(1)` | (10, 65.5) 262×3.5 | fs 14px; fw 400; lh 21px; color #808080; bg #d0d7de; bd 0px none rgb(128, 128, 128); m 24px 0px |  |
| h2 「一、机器人主动发送消息」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > h2:nth-of-type(2)` | (10, 93) 594.5×33.5 | fs 21px; fw 600; lh 26.25px; color #303133; p 0px 0px 6.3px; m 24px 0px 16px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > h2:nth-of-type(2)` | (10, 93) 262×33.5 | fs 21px; fw 600; lh 26.25px; color #303133; p 0px 0px 6.3px; m 24px 0px 16px |  |
| details | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(1)` | (10, 142.6) 594.5×26.3 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(1)` | (10, 142.6) 262×26.3 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| summary | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(1) > summary` | (10, 142.6) 594.5×26.3 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(1) > summary` | (10, 142.6) 262×26.3 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| span 「发送文本消息接口」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(1) > summary > span` | (24.8, 144.6) 146.8×21 | fs 17.5px; fw 700; lh 26.25px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 0px 0px 8px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(1) > summary > span` | (24.8, 144.6) 146.8×21 | fs 17.5px; fw 700; lh 26.25px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 0px 0px 8px |  |
| hr | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > hr:nth-of-type(2)` | (10, 192.8) 594.5×3.5 | fs 14px; fw 400; lh 21px; color #808080; bg #d0d7de; bd 0px none rgb(128, 128, 128); m 24px 0px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > hr:nth-of-type(2)` | (10, 192.8) 262×3.5 | fs 14px; fw 400; lh 21px; color #808080; bg #d0d7de; bd 0px none rgb(128, 128, 128); m 24px 0px |  |
| h2 「二、Webhook 事件推送」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > h2:nth-of-type(3)` | (10, 220.3) 594.5×33.5 | fs 21px; fw 600; lh 26.25px; color #303133; p 0px 0px 6.3px; m 24px 0px 16px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > h2:nth-of-type(3)` | (10, 220.3) 262×33.5 | fs 21px; fw 600; lh 26.25px; color #303133; p 0px 0px 6.3px; m 24px 0px 16px |  |
| p | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > p:nth-of-type(1)` | (10, 269.9) 594.5×42 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > p:nth-of-type(1)` | (10, 269.9) 262×105 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| strong 「功能说明」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > p:nth-of-type(1) > strong` | (10, 271.9) 53.7×17 | fs 14px; fw 600; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > p:nth-of-type(1) > strong` | (10, 271.9) 53.7×17 | fs 14px; fw 600; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| strong 「重要提示」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > p:nth-of-type(2) > strong` | (10, 329.9) 53.7×17 | fs 14px; fw 600; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > p:nth-of-type(2) > strong` | (10, 392.9) 53.7×17 | fs 14px; fw 600; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| ul | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > ul` | (10, 364.9) 594.5×70 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 0px 0px 28px; m 0px 0px 16px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > ul` | (10, 427.9) 262×133 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 0px 0px 28px; m 0px 0px 16px |  |
| li 「请确保 Webhook 地址可正常访问，且能在超时时」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > ul > li:nth-of-type(1)` | (38, 364.9) 566.5×21 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > ul > li:nth-of-type(1)` | (38, 427.9) 234×42 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| li 「建议对推送的数据进行签名验证，确保数据来源可信」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > ul > li:nth-of-type(2)` | (38, 389.4) 566.5×21 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 3.5px 0px 0px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > ul > li:nth-of-type(2)` | (38, 473.4) 234×42 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 3.5px 0px 0px |  |
| details | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(2)` | (10, 450.9) 594.5×26.3 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(2)` | (10, 576.9) 262×26.3 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| summary | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(2) > summary` | (10, 450.9) 594.5×26.3 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(2) > summary` | (10, 576.9) 262×26.3 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| code 「message」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(2) > summary > span > code` | (154.3, 452.9) 74.5×23.9 | fs 14.875px; fw 700; lh 22.3125px; color #303133; bg #7d7d7d/0.20; bd 0px none rgb(48, 49, 51); r 6px; p 2.975px 5.95px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(2) > summary > span > code` | (154.3, 578.9) 74.5×23.9 | fs 14.875px; fw 700; lh 22.3125px; color #303133; bg #7d7d7d/0.20; bd 0px none rgb(48, 49, 51); r 6px; p 2.975px 5.95px |  |
| details | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(3)` | (10, 493.1) 594.5×26.3 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(3)` | (10, 619.1) 262×52.5 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| summary | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(3) > summary` | (10, 493.1) 594.5×26.3 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(3) > summary` | (10, 619.1) 262×52.5 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| code 「dialog_open」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(3) > summary > span > code` | (154.3, 495.2) 110.4×23.9 | fs 14.875px; fw 700; lh 22.3125px; color #303133; bg #7d7d7d/0.20; bd 0px none rgb(48, 49, 51); r 6px; p 2.975px 5.95px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(3) > summary > span > code` | (27.4, 647.4) 110.4×23.9 | fs 14.875px; fw 700; lh 22.3125px; color #303133; bg #7d7d7d/0.20; bd 0px none rgb(48, 49, 51); r 6px; p 2.975px 5.95px |  |
| details | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(4)` | (10, 535.4) 594.5×26.3 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(4)` | (10, 687.6) 262×52.5 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| summary | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(4) > summary` | (10, 535.4) 594.5×26.3 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(4) > summary` | (10, 687.6) 262×52.5 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| code 「member_join」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(4) > summary > span > code` | (154.3, 537.4) 110.4×23.9 | fs 14.875px; fw 700; lh 22.3125px; color #303133; bg #7d7d7d/0.20; bd 0px none rgb(48, 49, 51); r 6px; p 2.975px 5.95px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(4) > summary > span > code` | (27.4, 715.9) 110.4×23.9 | fs 14.875px; fw 700; lh 22.3125px; color #303133; bg #7d7d7d/0.20; bd 0px none rgb(48, 49, 51); r 6px; p 2.975px 5.95px |  |
| details | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(5)` | (10, 577.6) 594.5×26.3 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(5)` | (10, 756.1) 262×52.5 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| summary | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(5) > summary` | (10, 577.6) 594.5×26.3 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(5) > summary` | (10, 756.1) 262×52.5 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| code 「member_leave」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(5) > summary > span > code` | (154.3, 579.7) 119.3×23.9 | fs 14.875px; fw 700; lh 22.3125px; color #303133; bg #7d7d7d/0.20; bd 0px none rgb(48, 49, 51); r 6px; p 2.975px 5.95px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > details:nth-of-type(5) > summary > span > code` | (27.4, 784.4) 119.3×23.9 | fs 14.875px; fw 700; lh 22.3125px; color #303133; bg #7d7d7d/0.20; bd 0px none rgb(48, 49, 51); r 6px; p 2.975px 5.95px |  |
| hr | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > hr:nth-of-type(3)` | (10, 627.9) 594.5×3.5 | fs 14px; fw 400; lh 21px; color #808080; bg #d0d7de; bd 0px none rgb(128, 128, 128); m 24px 0px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > hr:nth-of-type(3)` | (10, 832.6) 262×3.5 | fs 14px; fw 400; lh 21px; color #808080; bg #d0d7de; bd 0px none rgb(128, 128, 128); m 24px 0px |  |
| p | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > p:nth-of-type(3)` | (10, 655.4) 594.5×42 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > p:nth-of-type(3)` | (10, 860.1) 262×63 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| strong 「提示」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > p:nth-of-type(3) > strong` | (10, 657.4) 26.8×17 | fs 14px; fw 600; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > p:nth-of-type(3) > strong` | (10, 862.1) 26.8×17 | fs 14px; fw 600; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| mark-color.mark-set 「/help」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > p:nth-of-type(3) > .mark-color.mark-set` | (10, 657.4) 591.9×38 | fs 14px; fw 400; lh 21px; color #84c56a; bd 0px none rgb(132, 197, 106) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./api > .markdown-body.dialog-markdown > p:nth-of-type(3) > .mark-color.mark-set` | (69.4, 904.1) 31.8×17 | fs 14px; fw 400; lh 21px; color #84c56a; bd 0px none rgb(132, 197, 106) |  |
| dialog-foot | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 705.4) 62.7×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 931.1) 62.7×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| time 「2025-07-07」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 711.9) 62.7×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 937.6) 62.7×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |

- HOVER（宽）：无（未找到可交互元素或无变化）
- HOVER（窄）：无（未找到可交互元素或无变化）

**折叠交互**（`details > summary`）

| 状态 | 视口 | 卡片高度 | details 高度 | 说明 |
|---|---|---|---|---|
| 收起 | 宽 | 689.4px | 26.25px（宽 594.5） | summary「发送文本消息接口」fs 14px、fw 400、cursor pointer、color #303133 |
| 展开 | 宽 | 1467.5px | 804.3px | 点击 summary 原地展开，无浮层/跳转 |
| 再次收起 | 宽 | 689.4px | 26.25px | 可再次点击收起 |
| 收起 | 窄 | 915.1px | —（宽 262） |  |
| 展开 | 窄 | 1756.2px | — |  |

`details` margin: 0 0 16px；summary 无背景/边框变化，hover 未见颜色变化。

### 7.4 /newbot

- 会话 id: `6331`；消息 id: `1783863`
- 截图: `shots/tpl_newbot-wide-row.png`, `shots/tpl_newbot-wide-card.png`, `shots/tpl_newbot-narrow-row.png`, `shots/tpl_newbot-narrow-card.png`
- 说明: 机器人模板；新机器人引导内容

view wide={'x': 633.5, 'y': 314.90625, 'w': 614.5, 'h': 177.875} row={'x': 595.5, 'y': 314.90625, 'w': 652.5, 'h': 193.875} class=dialog-view template
view narrow={'x': 52, 'y': 320.40625, 'w': 282, 'h': 177.875} row={'x': 14, 'y': 320.40625, 'w': 362, 'h': 193.875} class=dialog-view template

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| dialog-avatar | 宽 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| 〃 | 窄 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| dialog-head | 宽 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 198.9×156.9 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 198.9×156.9 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| dialog-content | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 8) 182.9×140.9 | fs 14px; fw 400; lh 21px; color #606266 |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 8) 182.9×140.9 | fs 14px; fw 400; lh 21px; color #606266 |  |
| content-template.no-dark-content./newbot | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./newbot` | (8, 8) 182.9×140.9 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./newbot` | (8, 8) 182.9×140.9 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| markdown-body.dialog-markdown | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./newbot > .markdown-body.dialog-markdown` | (10, 8) 178.9×140.9 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./newbot > .markdown-body.dialog-markdown` | (10, 8) 178.9×140.9 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| h3 「创建成功」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./newbot > .markdown-body.dialog-markdown > h3` | (10, 8) 178.9×21.9 | fs 17.5px; fw 600; lh 21.875px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./newbot > .markdown-body.dialog-markdown > h3` | (10, 8) 178.9×21.9 | fs 17.5px; fw 600; lh 21.875px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| table | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./newbot > .markdown-body.dialog-markdown > table` | (10, 45.9) 178.9×103 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./newbot > .markdown-body.dialog-markdown > table` | (10, 45.9) 178.9×103 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| thead | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./newbot > .markdown-body.dialog-markdown > table > thead` | (10.5, 46.4) 177.9×34 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./newbot > .markdown-body.dialog-markdown > table > thead` | (10.5, 46.4) 177.9×34 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| tr | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./newbot > .markdown-body.dialog-markdown > table > thead > tr` | (10.5, 46.4) 177.9×34 | fs 14px; fw 400; lh 21px; color #303133; bg #ffffff |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./newbot > .markdown-body.dialog-markdown > table > thead > tr` | (10.5, 46.4) 177.9×34 | fs 14px; fw 400; lh 21px; color #303133; bg #ffffff |  |
| th 「属性」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./newbot > .markdown-body.dialog-markdown > table > thead > tr > th:nth-of-type(1)` | (10.5, 46.4) 96.5×34 | fs 14px; fw 600; lh 21px; color #303133; bd 1px solid rgb(208, 215, 222); p 6px 13px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./newbot > .markdown-body.dialog-markdown > table > thead > tr > th:nth-of-type(1)` | (10.5, 46.4) 96.5×34 | fs 14px; fw 600; lh 21px; color #303133; bd 1px solid rgb(208, 215, 222); p 6px 13px |  |
| tbody | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./newbot > .markdown-body.dialog-markdown > table > tbody` | (10.5, 80.4) 177.9×68 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./newbot > .markdown-body.dialog-markdown > table > tbody` | (10.5, 80.4) 177.9×68 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| td 「机器人ID」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./newbot > .markdown-body.dialog-markdown > table > tbody > tr:nth-of-type(1) > td:nth-of-type(1)` | (10.5, 80.4) 96.5×34 | fs 14px; fw 400; lh 21px; color #303133; bd 1px solid rgb(208, 215, 222); p 6px 13px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./newbot > .markdown-body.dialog-markdown > table > tbody > tr:nth-of-type(1) > td:nth-of-type(1)` | (10.5, 80.4) 96.5×34 | fs 14px; fw 400; lh 21px; color #303133; bd 1px solid rgb(208, 215, 222); p 6px 13px |  |
| tr | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./newbot > .markdown-body.dialog-markdown > table > tbody > tr:nth-of-type(2)` | (10.5, 114.4) 177.9×34 | fs 14px; fw 400; lh 21px; color #303133; bg #f6f8fa |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./newbot > .markdown-body.dialog-markdown > table > tbody > tr:nth-of-type(2)` | (10.5, 114.4) 177.9×34 | fs 14px; fw 400; lh 21px; color #303133; bg #f6f8fa |  |
| dialog-foot | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 156.9) 62.7×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 156.9) 62.7×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| time 「2025-03-22」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 163.4) 62.7×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 163.4) 62.7×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |

- HOVER（宽）：无（未找到可交互元素或无变化）
- HOVER（窄）：无（未找到可交互元素或无变化）

### 7.5 /token

- 会话 id: `32753`；消息 id: `2209615`
- 截图: `shots/tpl_token-wide-row.png`, `shots/tpl_token-wide-card.png`, `shots/tpl_token-narrow-row.png`, `shots/tpl_token-narrow-card.png`
- 说明: 机器人模板；长 token 文本换行展示（注意此组在会话 32753，而非 6331）

view wide={'x': 633.5, 'y': 292, 'w': 614.5, 'h': 211.875} row={'x': 595.5, 'y': 292, 'w': 652.5, 'h': 227.875} class=dialog-view template
view narrow={'x': 52, 'y': 297, 'w': 282, 'h': 211.875} row={'x': 14, 'y': 297, 'w': 362, 'h': 227.875} class=dialog-view template

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| dialog-avatar | 宽 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| 〃 | 窄 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| dialog-head | 宽 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 614.5×190.9 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 282×190.9 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| dialog-content | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 8) 598.5×174.9 | fs 14px; fw 400; lh 21px; color #606266 |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 8) 266×174.9 | fs 14px; fw 400; lh 21px; color #606266 |  |
| content-template.no-dark-content./token | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./token` | (8, 8) 598.5×174.9 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./token` | (8, 8) 266×174.9 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| markdown-body.dialog-markdown | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./token > .markdown-body.dialog-markdown` | (10, 8) 594.5×174.9 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./token > .markdown-body.dialog-markdown` | (10, 8) 262×174.9 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| h3 「生成Token令牌」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./token > .markdown-body.dialog-markdown > h3` | (10, 8) 594.5×21.9 | fs 17.5px; fw 600; lh 21.875px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./token > .markdown-body.dialog-markdown > h3` | (10, 8) 262×21.9 | fs 17.5px; fw 600; lh 21.875px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 16px |  |
| table | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./token > .markdown-body.dialog-markdown > table` | (10, 45.9) 594.5×137 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./token > .markdown-body.dialog-markdown > table` | (10, 45.9) 262×137 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| thead | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./token > .markdown-body.dialog-markdown > table > thead` | (10.5, 46.4) 1272.4×34 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./token > .markdown-body.dialog-markdown > table > thead` | (10.5, 46.4) 1272.4×34 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| tr | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./token > .markdown-body.dialog-markdown > table > thead > tr` | (10.5, 46.4) 1272.4×34 | fs 14px; fw 400; lh 21px; color #303133; bg #ffffff |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./token > .markdown-body.dialog-markdown > table > thead > tr` | (10.5, 46.4) 1272.4×34 | fs 14px; fw 400; lh 21px; color #303133; bg #ffffff |  |
| th 「属性」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./token > .markdown-body.dialog-markdown > table > thead > tr > th:nth-of-type(1)` | (10.5, 46.4) 96.5×34 | fs 14px; fw 600; lh 21px; color #303133; bd 1px solid rgb(208, 215, 222); p 6px 13px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./token > .markdown-body.dialog-markdown > table > thead > tr > th:nth-of-type(1)` | (10.5, 46.4) 96.5×34 | fs 14px; fw 600; lh 21px; color #303133; bd 1px solid rgb(208, 215, 222); p 6px 13px |  |
| tbody | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./token > .markdown-body.dialog-markdown > table > tbody` | (10.5, 80.4) 1272.4×102 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./token > .markdown-body.dialog-markdown > table > tbody` | (10.5, 80.4) 1272.4×102 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| td | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./token > .markdown-body.dialog-markdown > table > tbody > tr:nth-of-type(1) > td:nth-of-type(1)` | (10.5, 80.4) 96.5×34 | fs 14px; fw 400; lh 21px; color #303133; bd 1px solid rgb(208, 215, 222); p 6px 13px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./token > .markdown-body.dialog-markdown > table > tbody > tr:nth-of-type(1) > td:nth-of-type(1)` | (10.5, 80.4) 96.5×34 | fs 14px; fw 400; lh 21px; color #303133; bd 1px solid rgb(208, 215, 222); p 6px 13px |  |
| tr | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./token > .markdown-body.dialog-markdown > table > tbody > tr:nth-of-type(2)` | (10.5, 114.4) 1272.4×34 | fs 14px; fw 400; lh 21px; color #303133; bg #f6f8fa |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./token > .markdown-body.dialog-markdown > table > tbody > tr:nth-of-type(2)` | (10.5, 114.4) 1272.4×34 | fs 14px; fw 400; lh 21px; color #303133; bg #f6f8fa |  |
| dialog-foot | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 190.9) 31.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 190.9) 31.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| time 「06-26」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 197.4) 31.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 197.4) 31.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |

- HOVER（宽）：无（未找到可交互元素或无变化）
- HOVER（窄）：无（未找到可交互元素或无变化）

### 7.6 /hello

- 会话 id: `32753`；消息 id: `2209613`
- 截图: `shots/tpl_hello-wide-row.png`, `shots/tpl_hello-wide-card.png`, `shots/tpl_hello-narrow-row.png`, `shots/tpl_hello-narrow-card.png`
- 说明: 机器人模板；纯文本 div，fs 14px（会话 32753）

view wide={'x': 633.5, 'y': 120, 'w': 614.5, 'h': 79} row={'x': 595.5, 'y': 120, 'w': 652.5, 'h': 95} class=dialog-view template
view narrow={'x': 52, 'y': 104, 'w': 282, 'h': 100} row={'x': 14, 'y': 104, 'w': 362, 'h': 116} class=dialog-view template

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| dialog-avatar | 宽 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| 〃 | 窄 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| dialog-head | 宽 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 614.5×58 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 282×79 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| dialog-content | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 8) 598.5×42 | fs 14px; fw 400; lh 21px; color #606266 |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 8) 266×63 | fs 14px; fw 400; lh 21px; color #606266 |  |
| content-template.no-dark-content./hello | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./hello` | (8, 8) 598.5×42 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./hello` | (8, 8) 266×63 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| div | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./hello > div` | (10, 8) 594.5×42 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./hello > div` | (10, 8) 262×63 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| mark-color.mark-set 「/help」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./hello > div > .mark-color.mark-set` | (464.5, 10) 31.4×16 | fs 14px; fw 400; lh 21px; color #84c56a; bd 0px none rgb(132, 197, 106) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content./hello > div > .mark-color.mark-set` | (212.5, 31) 31.4×16 | fs 14px; fw 400; lh 21px; color #84c56a; bd 0px none rgb(132, 197, 106) |  |
| dialog-foot | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 58) 31.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 79) 31.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| time 「06-26」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 64.5) 31.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 85.5) 31.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |

- HOVER（宽）：无（未找到可交互元素或无变化）
- HOVER（窄）：无（未找到可交互元素或无变化）

### 7.7 approve_notifier

- 会话 id: `9911`；消息 id: `2205433`
- 截图: `shots/tpl_appnotifier-wide-row.png`, `shots/tpl_appnotifier-wide-card.png`, `shots/tpl_appnotifier-narrow-row.png`, `shots/tpl_appnotifier-narrow-card.png`
- 说明: 审批通知；`.open-approve-details` 粗体标题 + `.cause` 正文；宽视口点击 no-op

view wide={'x': 633.5, 'y': 284, 'w': 614.5, 'h': 281} row={'x': 595.5, 'y': 284, 'w': 652.5, 'h': 297} class=dialog-view template
view narrow={'x': 52, 'y': 268, 'w': 282, 'h': 281} row={'x': 14, 'y': 268, 'w': 362, 'h': 297} class=dialog-view template

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| dialog-avatar | 宽 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| 〃 | 窄 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| dialog-head | 宽 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 300×260 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 282×260 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| dialog-content | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 8) 284×244 | fs 14px; fw 400; lh 21px; color #606266 |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 8) 266×244 | fs 14px; fw 400; lh 21px; color #606266 |  |
| content-template.no-dark-content.approve_notifier | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_notifier` | (8, 8) 284×244 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_notifier` | (8, 8) 266×244 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| open-approve-details | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_notifier > .open-approve-details` | (10, 8) 280×244 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_notifier > .open-approve-details` | (10, 8) 262×244 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| b 「抄送赵海杉提交的「请假」记录」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_notifier > .open-approve-details > b` | (10, 10) 196×17 | fs 14px; fw 700; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_notifier > .open-approve-details > b` | (10, 10) 196×17 | fs 14px; fw 700; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| cause | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_notifier > .open-approve-details > .cause` | (10, 40) 280×212 | fs 14px; fw 400; lh 21px; color #303133; p 0px 0px 10px; m 10px 0px 0px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_notifier > .open-approve-details > .cause` | (10, 40) 262×212 | fs 14px; fw 400; lh 21px; color #303133; p 0px 0px 10px; m 10px 0px 0px |  |
| p | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_notifier > .open-approve-details > .cause > p:nth-of-type(1)` | (10, 41) 280×52 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 15px 0px; m 0px 0px 3px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_notifier > .open-approve-details > .cause > p:nth-of-type(1)` | (10, 41) 262×52 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 15px 0px; m 0px 0px 3px |  |
| b 「已完成」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_notifier > .open-approve-details > .cause > p:nth-of-type(1) > b` | (52, 58) 42×17 | fs 14px; fw 700; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_notifier > .open-approve-details > .cause > p:nth-of-type(1) > b` | (52, 58) 42×17 | fs 14px; fw 700; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| p | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_notifier > .open-approve-details > .cause > p:nth-of-type(2)` | (10, 96) 280×21 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 3px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_notifier > .open-approve-details > .cause > p:nth-of-type(2)` | (10, 96) 262×21 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 3px |  |
| mark-color 「@赵海杉」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_notifier > .open-approve-details > .cause > p:nth-of-type(2) > .mark-color` | (66, 98) 53.2×16 | fs 14px; fw 400; lh 21px; color #84c56a; bd 0px none rgb(132, 197, 106) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_notifier > .open-approve-details > .cause > p:nth-of-type(2) > .mark-color` | (66, 98) 53.2×16 | fs 14px; fw 400; lh 21px; color #84c56a; bd 0px none rgb(132, 197, 106) |  |
| b 「详情」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_notifier > .open-approve-details > .cause > b` | (10, 120) 28×21 | fs 14px; fw 700; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 5px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_notifier > .open-approve-details > .cause > b` | (10, 120) 28×21 | fs 14px; fw 700; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 5px |  |
| dialog-foot | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 260) 62.7×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 260) 62.7×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| time 「2025-12-17」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 266.5) 62.7×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 266.5) 62.7×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |

- HOVER（宽）`.open-approve-details`（cursor auto）：样式无变化
- HOVER（窄）`.open-approve-details`（cursor auto）：样式无变化

### 7.8 approve_reviewer

- 会话 id: `9911`；消息 id: `2209571`
- 截图: `shots/tpl_appreviewer-wide-row.png`, `shots/tpl_appreviewer-wide-card.png`, `shots/tpl_appreviewer-narrow-row.png`, `shots/tpl_appreviewer-narrow-card.png`
- 说明: 审批人卡片：任务预期有「同意/拒绝」按钮，旧版 Web 实际未渲染（详见 INCONCLUSIVE）；宽视口点击 no-op

view wide={'x': 633.5, 'y': 296, 'w': 614.5, 'h': 257} row={'x': 595.5, 'y': 296, 'w': 652.5, 'h': 273} class=dialog-view template
view narrow={'x': 52, 'y': 280, 'w': 282, 'h': 257} row={'x': 14, 'y': 280, 'w': 362, 'h': 273} class=dialog-view template

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| dialog-avatar | 宽 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| 〃 | 窄 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| dialog-head | 宽 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 300×236 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 282×236 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| dialog-content | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 8) 284×220 | fs 14px; fw 400; lh 21px; color #606266 |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 8) 266×220 | fs 14px; fw 400; lh 21px; color #606266 |  |
| content-template.no-dark-content.approve_reviewer | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_reviewer` | (8, 8) 284×220 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_reviewer` | (8, 8) 266×220 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| open-approve-details | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_reviewer > .open-approve-details` | (10, 8) 280×220 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_reviewer > .open-approve-details` | (10, 8) 262×220 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| b 「老李提交的「请假」待你审批」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_reviewer > .open-approve-details > b` | (10, 10) 182×17 | fs 14px; fw 700; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_reviewer > .open-approve-details > b` | (10, 10) 182×17 | fs 14px; fw 700; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| cause | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_reviewer > .open-approve-details > .cause` | (10, 40) 280×188 | fs 14px; fw 400; lh 21px; color #303133; p 0px 0px 10px; m 10px 0px 0px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_reviewer > .open-approve-details > .cause` | (10, 40) 262×188 | fs 14px; fw 400; lh 21px; color #303133; p 0px 0px 10px; m 10px 0px 0px |  |
| p | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_reviewer > .open-approve-details > .cause > p:nth-of-type(1)` | (10, 41) 280×52 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 15px 0px; m 0px 0px 3px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_reviewer > .open-approve-details > .cause > p:nth-of-type(1)` | (10, 41) 262×52 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 15px 0px; m 0px 0px 3px |  |
| b 「待审批」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_reviewer > .open-approve-details > .cause > p:nth-of-type(1) > b` | (52, 58) 42×17 | fs 14px; fw 700; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_reviewer > .open-approve-details > .cause > p:nth-of-type(1) > b` | (52, 58) 42×17 | fs 14px; fw 700; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| p | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_reviewer > .open-approve-details > .cause > p:nth-of-type(2)` | (10, 96) 280×21 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 3px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_reviewer > .open-approve-details > .cause > p:nth-of-type(2)` | (10, 96) 262×21 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 3px |  |
| mark-color 「@老李」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_reviewer > .open-approve-details > .cause > p:nth-of-type(2) > .mark-color` | (66, 98) 39.2×16 | fs 14px; fw 400; lh 21px; color #84c56a; bd 0px none rgb(132, 197, 106) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_reviewer > .open-approve-details > .cause > p:nth-of-type(2) > .mark-color` | (66, 98) 39.2×16 | fs 14px; fw 400; lh 21px; color #84c56a; bd 0px none rgb(132, 197, 106) |  |
| b 「详情」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_reviewer > .open-approve-details > .cause > b` | (10, 120) 28×21 | fs 14px; fw 700; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 5px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.approve_reviewer > .open-approve-details > .cause > b` | (10, 120) 28×21 | fs 14px; fw 700; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 5px |  |
| dialog-foot | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 236) 31.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 236) 31.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| time 「06-16」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 242.5) 31.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 242.5) 31.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |

- HOVER（宽）`.open-approve-details`（cursor auto）：样式无变化
- HOVER（窄）`.open-approve-details`（cursor auto）：样式无变化

### 7.9 approve_comment_notifier

- 会话 id: `9911`；消息 id: `2192159`
- 截图: `shots/tpl_appcomment-wide-row.png`, `shots/tpl_appcomment-wide-card.png`, `shots/tpl_appcomment-narrow-row.png`, `shots/tpl_appcomment-narrow-card.png`
- 说明: 审批评论通知；通知样式，无操作按钮；宽视口点击 no-op

view wide={'x': 633.5, 'y': 333, 'w': 614.5, 'h': 184} row={'x': 595.5, 'y': 333, 'w': 652.5, 'h': 200} class=dialog-view template
view narrow={'x': 52, 'y': 317, 'w': 282, 'h': 184} row={'x': 14, 'y': 317, 'w': 362, 'h': 200} class=dialog-view template

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| dialog-avatar | 宽 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| 〃 | 窄 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| dialog-head | 宽 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 300×163 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 282×163 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| dialog-content.user-select-auto | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content.user-select-auto` | (8, 8) 284×147 | fs 14px; fw 400; lh 21px; color #606266 |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content.user-select-auto` | (8, 8) 266×147 | fs 14px; fw 400; lh 21px; color #606266 |  |
| content-template.no-dark-content.approve_comment_notifier | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content.user-select-auto > .content-template.no-dark-content.approve_comment_notifier` | (8, 8) 284×147 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content.user-select-auto > .content-template.no-dark-content.approve_comment_notifier` | (8, 8) 266×147 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| open-approve-details | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content.user-select-auto > .content-template.no-dark-content.approve_comment_notifier > .open-approve-details` | (10, 8) 280×147 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content.user-select-auto > .content-template.no-dark-content.approve_comment_notifier > .open-approve-details` | (10, 8) 262×147 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| b 「陈瑜媛评论了陈瑜媛的「外出」审批」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content.user-select-auto > .content-template.no-dark-content.approve_comment_notifier > .open-approve-details > b` | (10, 10) 224×17 | fs 14px; fw 700; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content.user-select-auto > .content-template.no-dark-content.approve_comment_notifier > .open-approve-details > b` | (10, 10) 224×17 | fs 14px; fw 700; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| cause | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content.user-select-auto > .content-template.no-dark-content.approve_comment_notifier > .open-approve-details > .cause` | (10, 40) 280×115 | fs 14px; fw 400; lh 21px; color #303133; p 0px 0px 10px; m 10px 0px 0px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content.user-select-auto > .content-template.no-dark-content.approve_comment_notifier > .open-approve-details > .cause` | (10, 40) 262×115 | fs 14px; fw 400; lh 21px; color #303133; p 0px 0px 10px; m 10px 0px 0px |  |
| p | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content.user-select-auto > .content-template.no-dark-content.approve_comment_notifier > .open-approve-details > .cause > p:nth-of-type(1)` | (10, 41) 280×51 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 15px 0px; m 0px 0px 3px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content.user-select-auto > .content-template.no-dark-content.approve_comment_notifier > .open-approve-details > .cause > p:nth-of-type(1)` | (10, 41) 262×51 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 15px 0px; m 0px 0px 3px |  |
| mark-color 「@陈瑜媛」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content.user-select-auto > .content-template.no-dark-content.approve_comment_notifier > .open-approve-details > .cause > p:nth-of-type(1) > .mark-color` | (66, 58) 53.2×16 | fs 14px; fw 400; lh 21px; color #84c56a; bd 0px none rgb(132, 197, 106) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content.user-select-auto > .content-template.no-dark-content.approve_comment_notifier > .open-approve-details > .cause > p:nth-of-type(1) > .mark-color` | (66, 58) 53.2×16 | fs 14px; fw 400; lh 21px; color #84c56a; bd 0px none rgb(132, 197, 106) |  |
| b 「评论内容」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content.user-select-auto > .content-template.no-dark-content.approve_comment_notifier > .open-approve-details > .cause > b` | (10, 95) 56×21 | fs 14px; fw 700; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 5px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content.user-select-auto > .content-template.no-dark-content.approve_comment_notifier > .open-approve-details > .cause > b` | (10, 95) 56×21 | fs 14px; fw 700; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 5px |  |
| p 「暂不外出」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content.user-select-auto > .content-template.no-dark-content.approve_comment_notifier > .open-approve-details > .cause > p:nth-of-type(2)` | (10, 121) 280×21 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 3px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content.user-select-auto > .content-template.no-dark-content.approve_comment_notifier > .open-approve-details > .cause > p:nth-of-type(2)` | (10, 121) 262×21 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 0px 0px 3px |  |
| dialog-foot | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 163) 62.7×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 163) 62.7×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| time 「2025-12-08」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 169.5) 62.7×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 169.5) 62.7×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |

- HOVER（宽）`.open-approve-details`（cursor auto）：样式无变化
- HOVER（窄）`.open-approve-details`（cursor auto）：样式无变化

### 7.10 content（msg.type=content）

- 会话 id: `8223`；消息 id: `2210771`
- 截图: `shots/tpl_content-wide-row.png`, `shots/tpl_content-wide-card.png`, `shots/tpl_content-narrow-row.png`, `shots/tpl_content-narrow-card.png`
- 说明: 内容类模板

view wide={'x': 633.5, 'y': 679, 'w': 614.5, 'h': 61} row={'x': 595.5, 'y': 679, 'w': 652.5, 'h': 77} class=dialog-view template
view narrow={'x': 52, 'y': 653, 'w': 282, 'h': 79} row={'x': 14, 'y': 653, 'w': 362, 'h': 95} class=dialog-view template

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| dialog-avatar | 宽 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| 〃 | 窄 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| dialog-head | 宽 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 503×40 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 282×58 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| dialog-content | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 8) 487×24 | fs 14px; fw 400; lh 21px; color #606266 |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 8) 266×42 | fs 14px; fw 400; lh 21px; color #606266 |  |
| content-template.no-dark-content.content | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.content` | (8, 8) 487×24 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.content` | (8, 8) 266×42 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| div | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.content > div` | (10, 9.5) 483×21 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.content > div` | (10, 8) 262×42 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| p 「匿名消息将通过「匿名消息（机器人）」发送给对方，不会」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.content > div > p` | (10, 9.5) 483×21 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.content > div > p` | (10, 8) 262×42 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| dialog-foot | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 40) 31.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 58) 31.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| time 「11-03」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 46.5) 31.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 64.5) 31.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |

- HOVER（宽）：无（未找到可交互元素或无变化）
- HOVER（窄）：无（未找到可交互元素或无变化）

### 7.11 file_download（msg.type=file_download）

- 会话 id: `19076`；消息 id: `2209531`
- 截图: `shots/tpl_filedl-wide-row.png`, `shots/tpl_filedl-wide-card.png`, `shots/tpl_filedl-narrow-row.png`, `shots/tpl_filedl-narrow-card.png`, `shots/beh-filedl-wide-newpage.png`, `shots/beh-filedl-narrow-newpage.png`
- 说明: 导出签到数据通知 + 橙色下载按钮

view wide={'x': 633.5, 'y': 540.546875, 'w': 614.5, 'h': 164} row={'x': 595.5, 'y': 540.546875, 'w': 652.5, 'h': 180} class=dialog-view template
view narrow={'x': 52, 'y': 506.546875, 'w': 282, 'h': 164} row={'x': 14, 'y': 506.546875, 'w': 362, 'h': 180} class=dialog-view template

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| dialog-avatar | 宽 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| 〃 | 窄 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| dialog-head | 宽 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 231.9×143 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 231.9×143 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| dialog-content | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 8) 215.9×127 | fs 14px; fw 400; lh 21px; color #606266 |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 8) 215.9×127 | fs 14px; fw 400; lh 21px; color #606266 |  |
| content-template.no-dark-content.file_download | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.file_download` | (8, 8) 215.9×127 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.file_download` | (8, 8) 215.9×127 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| div | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.file_download > div` | (10, 8) 211.9×127 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.file_download > div` | (10, 8) 211.9×127 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| p | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.file_download > div > p:nth-of-type(1)` | (10, 8) 211.9×22 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.file_download > div > p:nth-of-type(1)` | (10, 8) 211.9×22 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| b 「导出超期任务已完成」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.file_download > div > p:nth-of-type(1) > b` | (10, 10) 126×17 | fs 14px; fw 700; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.file_download > div > p:nth-of-type(1) > b` | (10, 10) 126×17 | fs 14px; fw 700; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| p | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.file_download > div > p:nth-of-type(5)` | (10, 103) 211.9×32 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 10px 0px 0px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.file_download > div > p:nth-of-type(5)` | (10, 103) 211.9×32 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); m 10px 0px 0px |  |
| no-dark-content.ivu-btn.ivu-btn-warning | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.file_download > div > p:nth-of-type(5) > .no-dark-content.ivu-btn.ivu-btn-warning` | (10, 103) 88×32 | fs 14px; fw 400; lh 30px; color #ffffff; bg #ff9900; bd 1px solid rgb(255, 153, 0); r 4px; p 0.1px 15px 0px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.file_download > div > p:nth-of-type(5) > .no-dark-content.ivu-btn.ivu-btn-warning` | (10, 103) 88×32 | fs 14px; fw 400; lh 30px; color #ffffff; bg #ff9900; bd 1px solid rgb(255, 153, 0); r 4px; p 0.1px 15px 0px |  |
| span 「立即下载」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.file_download > div > p:nth-of-type(5) > .no-dark-content.ivu-btn.ivu-btn-warning > span` | (26, 104.1) 56×30 | fs 14px; fw 400; lh 30px; color #ffffff |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.file_download > div > p:nth-of-type(5) > .no-dark-content.ivu-btn.ivu-btn-warning > span` | (26, 104.1) 56×30 | fs 14px; fw 400; lh 30px; color #ffffff |  |
| dialog-foot | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 143) 31.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 143) 31.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| time 「06-13」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 149.5) 31.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 149.5) 31.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |

- HOVER（宽）`a.ivu-btn`（cursor pointer）：bg #ff9900→#ffad33; border 1px solid rgb(255, 153, 0)→1px solid rgb(255, 173, 51)
- HOVER（窄）`a.ivu-btn`（cursor pointer）：bg #ff9900→#ffad33; border 1px solid rgb(255, 153, 0)→1px solid rgb(255, 173, 51)

- hover（宽/窄）：`.ivu-btn-warning` `bg #ff9900 → #ffad33`，边框同色阶，文字 #ffffff 不变。
- 点击「立即下载」：新开标签页 `<测试服>/api/project/task/down?key=…`；测得的导出链接已过期，页面返回 `403 请求已过期，请重新导出！`（新页标题 Forbidden）。未真正下载文件。

### 7.12 task_list（msg.type=task_list）

- 会话 id: `6449`；消息 id: `2211174`
- 截图: `shots/tpl_tasklist-wide-row.png`, `shots/tpl_tasklist-wide-card.png`, `shots/tpl_tasklist-narrow-row.png`, `shots/tpl_tasklist-narrow-card.png`, `shots/task-detail-wide-full.png`, `shots/task-detail-narrow-full.png`
- 说明: 任务列表模板；点击 `.mention.task` 打开任务详情弹窗（见补充）

view wide={'x': 633.5, 'y': 566, 'w': 614.5, 'h': 100} row={'x': 595.5, 'y': 566, 'w': 652.5, 'h': 116} class=dialog-view template
view narrow={'x': 52, 'y': 550, 'w': 282, 'h': 100} row={'x': 14, 'y': 550, 'w': 362, 'h': 116} class=dialog-view template

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| dialog-avatar | 宽 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| 〃 | 窄 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| dialog-head | 宽 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 160×79 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 0) 160×79 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| dialog-content | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 8) 144×63 | fs 14px; fw 400; lh 21px; color #606266 |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 8) 144×63 | fs 14px; fw 400; lh 21px; color #606266 |  |
| content-template.no-dark-content.task_list | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.task_list` | (8, 8) 144×63 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.task_list` | (8, 8) 144×63 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| div | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.task_list > div` | (10, 8) 140×63 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.task_list > div` | (10, 8) 140×63 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| p 「您负责的任务已经超时」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.task_list > div > p:nth-of-type(1)` | (10, 8) 140×21 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.task_list > div > p:nth-of-type(1)` | (10, 8) 140×21 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| mention.task 「#周期任务生成测试」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.task_list > div > p:nth-of-type(3) > .mention.task` | (10, 52) 119.8×16 | fs 14px; fw 400; lh 21px; color #0bc037; bd 0px none rgb(11, 192, 55); r 6px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.task_list > div > p:nth-of-type(3) > .mention.task` | (10, 52) 119.8×16 | fs 14px; fw 400; lh 21px; color #0bc037; bd 0px none rgb(11, 192, 55); r 6px |  |
| dialog-foot | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 79) 57.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 79) 57.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| time 「昨天 11:48」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 85.5) 57.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 85.5) 57.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |

- HOVER（宽）：无（未找到可交互元素或无变化）
- HOVER（窄）：无（未找到可交互元素或无变化）

**补充：任务详情弹窗**（点击 `.mention.task` 打开）

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| 遮罩 `.layer-stack-mask` | 宽 | `.layer-stack-mask` | (0, 0) 1280×860 | bg rgba(55,55,55,0.6); z 1009 |  |
| 〃 | 窄 | 〃 | (0, 0) 390×844 | bg 同上; z 1010 |  |
| `.doo-modal.common-task-modal` | 宽 | 〃 | (0, 0) 1280×860 | p 24px 16px | `is-wide.is-scroll-modal` |
| 〃 | 窄 | 〃 | (0, 0) 390×844 | p 0 | `is-sheet.is-narrow` |
| `.doo-modal-card` | 宽 | 〃 | (290, 35) 700×586 | bg #ffffff; r 18px; shadow rgba(0,0,0,0.15) 0 4px 12px |  |
| 〃 | 窄 | 〃 | (0, 46) 390×798 | bg #ffffff; r 18px 18px 0 0; shadow 同上 | 底部 sheet |
| `.doo-modal-close` | 宽 | `a.doo-modal-close` | (942, 47) 38×38 | — | 图标 24×24 |
| 〃 | 窄 | 〃 | (342, 58) 38×38 | — |  |
| `.doo-modal-body` | 宽 | 〃 | (290, 35) 700×586 | p 16px 32px 2px |  |
| 〃 | 窄 | 〃 | (0, 46) 390×798 | p 0 |  |
| `.task-detail` | 宽 | 〃 | (307, 51) 683×556 | p 0 22px 10px 0 |  |
| 〃 | 窄 | 〃 | (0, 46) 390×798 | p 0 20px 0 15px |  |
| `.task-info` | 宽 | 〃 | (307, 51) 661×414 | — |  |
| 〃 | 窄 | 〃 | (15, 46) 355×652 | — |  |
| `.head`（标题栏） | 宽 | 〃 | (312, 51) 656×42 | p 0 0 10px |  |
| 〃 | 窄 | 〃 | (20, 46) 350×58 | p 14px 4px 10px 0; bg #ffffff |  |
| `.nav`（底部页签） | 宽 | 〃 | (330, 492) 609×22 | fs 14px; fw 500; p 0 0 0 18px |  |
| 〃 | 窄 | 〃 | (38, 718) 299×22 | 同上 |  |
| `.nav-item.active`「讨论」 | 宽 | 〃 | (348, 490) 32×24 | fs 16px; fw 600 |  |
| 〃 | 窄 | 〃 | (56, 716) 32×24 | 同上 |  |
| `.nav-item`「动态」「流转」 | 宽 | 〃 | 28×21 | fs 14px; fw 500 | 间距 24px |
| 〃 | 窄 | 〃 | 28×21 | 同上 |  |
| `.scroller` | 宽 | 〃 | (307, 93) 666×372 | — | 内容滚动区 |
| 〃 | 窄 | 〃 | (15, 104) 360×590 | — |  |

- 弹窗为任务详情（非卡片本身）；只量浮层框架与主要容器，任务正文内部深层组件未展开。

### 7.13 todo_remind（msg.type=todo_remind）

- 会话 id: `2889`；消息 id: `2209471`
- 截图: `shots/tpl_todoremind-wide-row.png`, `shots/tpl_todoremind-wide-card.png`, `shots/tpl_todoremind-narrow-row.png`, `shots/tpl_todoremind-narrow-card.png`
- 说明: 待办提醒：旧版 Web 将内容渲染为「未知的消息」（详见 INCONCLUSIVE）

view wide={'x': 633.5, 'y': 417, 'w': 614.5, 'h': 89} row={'x': 595.5, 'y': 417, 'w': 652.5, 'h': 105} class=dialog-view template
view narrow={'x': 52, 'y': 418, 'w': 282, 'h': 89} row={'x': 14, 'y': 418, 'w': 362, 'h': 105} class=dialog-view template

| 部件 | 视口 | 选择器 | box | 样式 | 备注 |
|---|---|---|---|---|---|
| dialog-avatar | 宽 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| 〃 | 窄 | `.dialog-item > .dialog-avatar` | (-38, 0) 30×30 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 20px |  |
| dialog-username | 宽 | `.dialog-item > .dialog-view.template > .dialog-username` | (0, 0) 75×22 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 6px; op 0.8 |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-username` | (0, 0) 75×22 | fs 14px; fw 400; lh 21px; color #606266; m 0px 0px 6px; op 0.8 |  |
| dialog-head | 宽 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 28) 90×40 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head` | (0, 28) 90×40 | fs 14px; fw 400; lh 21px; color #606266; bg #f4f5f7; r 2px 8px 8px; p 8px |  |
| dialog-content | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 36) 74×24 | fs 14px; fw 400; lh 21px; color #606266 |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content` | (8, 36) 74×24 | fs 14px; fw 400; lh 21px; color #606266 |  |
| content-template.no-dark-content.todo_remind | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.todo_remind` | (8, 36) 74×24 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.todo_remind` | (8, 36) 74×24 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51); p 0px 2px |  |
| div 「未知的消息」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.todo_remind > div` | (10, 37.5) 70×21 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-head > .dialog-content > .content-template.no-dark-content.todo_remind > div` | (10, 37.5) 70×21 | fs 14px; fw 400; lh 21px; color #303133; bd 0px none rgb(48, 49, 51) |  |
| dialog-foot | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 68) 31.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot` | (0, 68) 31.4×21 | fs 14px; fw 400; lh 14px; color #606266; p 4px 0px 0px |  |
| time 「06-01」 | 宽 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 74.5) 31.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |
| 〃 | 窄 | `.dialog-item > .dialog-view.template > .dialog-foot > .time` | (0, 74.5) 31.4×12 | fs 12px; fw 400; lh 12px; color #bbbbbb; bd 0px none rgb(187, 187, 187) |  |

- HOVER（宽）：无（未找到可交互元素或无变化）
- HOVER（窄）：无（未找到可交互元素或无变化）

## 8. INCONCLUSIVE / 缺失项

1. **approve_reviewer 的「同意/拒绝」按钮**：旧版 Web 未渲染任何审批操作按钮（检查会话 9911 全部 approve_reviewer 消息均无按钮），无法测量按钮样式/交互；宽视口点击卡片无浮层、无跳转、无新增监听器。
2. **todo_remind 内容**：卡片正文渲染为字面量「未知的消息」，旧版 Web 缺少对应渲染器，无法量真实待办提醒内容。
3. **location / meeting 点击行为**：宽视口点击无浮层、无跳转、无新增监听器（no-op），不存在可测的弹窗/详情页。
4. **longtext 全文阅读**：按任务约定仅测气泡展示与「查看详情」入口及新页框架；阅读页正文排版不在本次范围。
5. **file_download 下载流**：点击新开标签页请求 `…/api/project/task/down?key=…`，测试数据中的导出链接已过期，返回 403「请求已过期，请重新导出！」，未能验证真实文件下载与完成态。
6. **详情浮层内部深层组件**：word-chain / merge-forward / task_list 的浮层只量到主框架、列表容器与首层消息/页签；浮层内任务正文、消息气泡子节点等深层组件按深度截断，未逐项展开。

未找到项：无。任务给定的会话 id / 消息 id 全部找到并按原 id 测量，无替代样本。
