/** 语音输入的平台差异：Web / 桌面点麦克风开始录 */

/** 服务端只收 mp3、wav、m4a：优先 AAC（各端都能播），不支持时退到浏览器默认的 mp4 编码（如 Opus） */
const AAC = 'audio/mp4;codecs=mp4a.40.2';
const canRecord = typeof MediaRecorder !== 'undefined';

/** 浏览器能录 mp4（Chrome、Edge、Safari、桌面端可以，Firefox 不行，不显示麦克风） */
export const CAN_RECORD = canRecord && MediaRecorder.isTypeSupported('audio/mp4');

export const HOLD_TO_TALK = false;

/** 浏览器录音格式 */
export const WEB_MIME_TYPE = canRecord && MediaRecorder.isTypeSupported(AAC) ? AAC : 'audio/mp4';
