/**
 * 嵌入宿主的逻辑，与界面无关：EmbedView 各端只负责「把字符串发给嵌入页」和「收到嵌入页的字符串」
 */
import { type EmbedInit, encodeHostMessage, type GuestMessage, originOf, parseGuestMessage } from './protocol';

/** 宿主这边的会话状态，变化时 update() 会按需下发 */
export type EmbedSession = Required<EmbedInit>;

export interface EmbedHostOptions {
  /** 嵌入页网址，决定只认哪个来源的消息、token 能不能下发 */
  url: string;
  session: EmbedSession;
  /** 向嵌入页发一段文本，targetOrigin 为嵌入页来源 */
  post: (text: string, targetOrigin: string) => void;
}

/** 交给业务处理的消息；ready 由宿主自己处理 */
export type EmbedEvent = Exclude<GuestMessage, { type: 'ready' }>;

export interface EmbedHost {
  /** 嵌入页的来源；网址不是 http(s) 时为 null，此时什么都不收发 */
  readonly origin: string | null;
  /** 收到一条消息，from 为发送方页面的来源；返回要交给业务的消息，其余（来源不对、格式不对、ready）返回 null */
  receive: (raw: unknown, from: string | null) => EmbedEvent | null;
  /** 会话变化：主题、语言单独下发，其他变化重发 init */
  update: (session: EmbedSession) => void;
}

export function createEmbedHost({ url, session: initial, post }: EmbedHostOptions): EmbedHost {
  const origin = originOf(url);
  const trusted = origin !== null && origin === originOf(initial.server);
  let session = initial;
  /** 嵌入页发过 ready 才下发，之前的变化只记下来 */
  let ready = false;

  const send = (text: string) => {
    if (origin) post(text, origin);
  };
  const sendInit = () => {
    const { token, ...rest } = session;
    send(encodeHostMessage({ type: 'init', payload: trusted ? { ...rest, token } : rest }));
  };

  return {
    origin,
    receive(raw, from) {
      if (!origin || from !== origin) return null;
      const message = parseGuestMessage(raw);
      if (message?.type !== 'ready') return message;
      // 嵌入页每次加载（含刷新、页内跳转）都会发 ready，每次都给完整的 init
      ready = true;
      sendInit();
      return null;
    },
    update(next) {
      const prev = session;
      session = next;
      if (!ready) return;
      if (next.server !== prev.server || next.token !== prev.token || next.user.userid !== prev.user.userid || next.user.nickname !== prev.user.nickname || next.user.avatar !== prev.user.avatar) {
        sendInit();
        return;
      }
      if (next.theme !== prev.theme) send(encodeHostMessage({ type: 'theme', payload: { theme: next.theme } }));
      if (next.language !== prev.language) send(encodeHostMessage({ type: 'language', payload: { language: next.language } }));
    },
  };
}
