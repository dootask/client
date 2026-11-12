/** 语音输入的平台差异：App 上按住说话 */

/** 能不能录语音 */
export const CAN_RECORD = true;

/** 按住说话（麦克风切到语音模式，按住长条录）；否则点麦克风直接开始录，录完在浮层里选发送、转文字或取消 */
export const HOLD_TO_TALK = true;

/** 浏览器录音格式：App 上不用 */
export const WEB_MIME_TYPE = 'audio/mp4';

/** App 上播完接着播紧挨着的下一条别人发的、没听过的语音（同旧版 App） */
export const AUTO_NEXT = true;
