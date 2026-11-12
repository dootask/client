import type { Translate } from '../../../../i18n';
import { textBlocks, type Block, type BodyContext, type TemplateData } from '../../../../sync/messenger/body';
import { BOT_API_DOC_EN, BOT_API_DOC_ZH } from './botApiDoc';

/**
 * 机器人命令回复、任务列表、内容通知等模板消息 → 块结构：照旧版网页的模板组件（DialogView/template）拼出
 * Markdown 或 HTML 再解析，文字翻译后填入。审批通知、文件下载有按钮和专门排版，不走这里（返回 null）
 */

type Data = Record<string, unknown>;
const obj = (v: unknown): Data => (v && typeof v === 'object' ? (v as Data) : {});
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));

const html = (v: unknown) => str(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
/** 表格单元格里的值：转义 HTML 和竖线 */
const cell = (v: unknown) => html(v).replace(/\|/g, '\\|');
/** 点了填进输入栏的命令 */
const command = (text: string) => `<span class="mark-color mark-set">${text}</span>`;

function table(head: string[], rows: string[][]): string[] {
  return [`| ${head.join(' | ')} |`, `| ${head.map(() => '------').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)];
}

/** 机器人属性表：标题 + 机器人 ID、名称 + 各命令自己的行 */
function botTable(t: Translate, title: string, data: Data, extra: string[][] = []): string[] {
  return [
    `### ${title}`,
    '',
    ...table(
      [t('messenger:template.attr'), t('messenger:template.result')],
      [[t('messenger:template.botId'), cell(data.userid)], [t('messenger:template.botName'), cell(data.nickname)], ...extra],
    ),
  ];
}

function helpLines(t: Translate, manager: boolean): string[] {
  const id = manager ? ` {${t('messenger:template.botId')}}` : ' {}';
  const section = (title: string, rows: string[][]) => ['', `### ${title}`, '', ...table([t('messenger:template.command'), t('messenger:template.desc')], rows)];
  const name = t('messenger:template.botName');
  return [
    ...section(
      t('messenger:template.helpTitle'),
      manager
        ? [[command('/list'), t('messenger:template.botList')], [command(`/newbot (${name})`), t('messenger:template.createBot')]]
        : [[command('/info'), t('messenger:template.botInfo')]],
    ).slice(1),
    ...section(t('messenger:template.editBot'), [
      [command(`/setname${id} (${name})`), t('messenger:template.rename')],
      [command(`/deletebot${id}`), t('messenger:template.deleteBot')],
      [command(`/clearday${id} (${t('messenger:template.days')})`), t('messenger:template.clearDayDesc')],
      [command(`/webhook${id} [url]`), t('messenger:template.webhookDesc')],
    ]),
    ...section(t('messenger:template.botSettings'), [
      [command(`/token${id}`), t('messenger:template.genToken')],
      [command(`/revoke${id}`), t('messenger:template.revokeToken')],
    ]),
    ...section(t('messenger:template.dialogManage'), [[command(`/dialog${id} [${t('messenger:template.keyword')}]`), t('messenger:template.dialogId')]]),
    ...section(t('messenger:template.apiDoc'), [[command('/api'), t('messenger:template.apiList')]]),
  ];
}

function botApiDoc(msg: Data, t: Translate, chinese: boolean, ctx: BodyContext): string {
  const vars: Record<string, string> = {
    sendApiUrl: `${ctx.origin}api/dialog/msg/sendtext`,
    version: str(msg.version),
    sessionDesc: /^(ai-|user-session-)/.test(str(msg.email)) ? '' : ` (${t('messenger:template.botNotSupport')})`,
  };
  return (chinese ? BOT_API_DOC_ZH : BOT_API_DOC_EN).replace(/\{\{([^}]+)\}\}/g, (_, key: string) => vars[key] ?? key).trim();
}

/** Markdown 模板 */
function markdown(msg: TemplateData, t: Translate, chinese: boolean, ctx: BodyContext): string | null {
  const data = obj(msg.data);
  switch (msg.type) {
    case '/help':
      return helpLines(t, !!msg.manager).join('\n');
    case '/list':
      return [
        `### ${t('messenger:template.myBots')}`,
        '',
        ...table(
          ['ID', t('messenger:template.name'), t('messenger:template.clearAt'), 'Webhook'],
          (Array.isArray(msg.data) ? msg.data : []).map((raw) => {
            const item = obj(raw);
            return [cell(item.userid), cell(item.nickname), cell(item.clear_day), item.webhook_url ? '√' : ''];
          }),
        ),
      ].join('\n');
    case '/info':
      return botTable(t, t('messenger:template.detail'), data, [
        [t('messenger:template.keepDays'), cell(data.clear_day)],
        [t('messenger:template.lastClear'), cell(data.clear_at)],
      ]).join('\n');
    case '/newbot':
      return botTable(t, t('messenger:template.created'), data).join('\n');
    case '/setname':
      return botTable(t, t('messenger:template.renamed'), data).join('\n');
    case '/deletebot':
      return botTable(t, t('messenger:template.deleted'), data).join('\n');
    case '/token':
      return botTable(t, t('messenger:template.genToken'), data, [['Token', cell(data.token)]]).join('\n');
    case '/revoke':
      return botTable(t, t('messenger:template.revokeToken'), data).join('\n');
    case '/webhook':
      return botTable(t, t('messenger:template.setWebhook'), data, [[t('messenger:template.webhookUrl'), cell(data.webhook_url)]]).join('\n');
    case '/clearday':
      return botTable(t, t('messenger:template.keepDays'), data, [
        [t('messenger:template.clearCycle'), t('messenger:template.dayCount', { n: cell(data.clear_day) })],
        [t('messenger:template.nextClear'), cell(data.clear_at)],
      ]).join('\n');
    case '/dialog':
      return [
        `### ${t('messenger:template.bot')} ${html(data.nickname)} (ID:${html(data.userid)}) ${t('messenger:template.joined')}：`,
        '',
        ...table(
          [t('messenger:template.sessionId'), t('messenger:template.sessionName')],
          (Array.isArray(data.list) ? data.list : []).map((raw) => {
            const item = obj(raw);
            return [cell(item.id), cell(item.name) + (item.type === 'user' ? ` (${t('messenger:template.personal')})` : '')];
          }),
        ),
      ].join('\n');
    case '/api':
      return botApiDoc(msg, t, chinese, ctx);
    default:
      return null;
  }
}

/** HTML 模板（旧版每行一个 <p>，空行是 &nbsp;） */
function markup(msg: TemplateData, t: Translate): string | null {
  const data = obj(msg.data);
  switch (msg.type) {
    case '/hello':
      return `<p>${t('messenger:template.hello')}：${html(data.nickname)}，${t('messenger:template.myId')}：${html(data.userid)}，${t('messenger:template.youCanSend')} ${command('/help')} ${t('messenger:template.helpHint')}。</p>`;
    case 'task_list':
      return [
        `<p>${html(msg.title)}</p>`,
        '<p>&nbsp;</p>',
        ...(Array.isArray(msg.list) ? msg.list : []).map((raw) => {
          const item = obj(raw);
          return `<p><span class="mention task" data-id="${html(item.id)}">#${html(item.name)}</span></p>`;
        }),
      ].join('');
    case 'content':
      return (Array.isArray(msg.content) ? msg.content : [msg.content]).map((item) => `<p>${html(typeof item === 'object' && item ? obj(item).content : item)}</p>`).join('');
    default:
      // 机器人会话里发了不认识的命令
      return msg.type.startsWith('/')
        ? `<p>${t('messenger:template.unsupported')} ${html(msg.type)}，${t('messenger:template.youCanSend')} ${command('/help')} ${t('messenger:template.helpMenu')}。</p>`
        : null;
  }
}

/** 拼不出（审批、文件下载、未知模板）时返回 null */
export function templateBlocks(msg: TemplateData, t: Translate, chinese: boolean, ctx: BodyContext): Block[] | null {
  const md = markdown(msg, t, chinese, ctx);
  if (md !== null) return textBlocks(md, true, ctx);
  const text = markup(msg, t);
  return text === null ? null : textBlocks(text, false, ctx);
}
