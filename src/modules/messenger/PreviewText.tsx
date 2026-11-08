import { useT } from '../../i18n';
import type { Preview, PreviewLabel, PreviewStatus } from '../../sync/messenger/preview';

const LABELS = {
  longtext: 'messenger:label.longtext',
  vote: 'messenger:label.vote',
  wordChain: 'messenger:label.wordChain',
  voice: 'messenger:label.voice',
  location: 'messenger:label.location',
  meeting: 'messenger:label.meeting',
  image: 'messenger:label.image',
  video: 'messenger:label.video',
  file: 'messenger:label.file',
  tag: 'messenger:label.tag',
  untag: 'messenger:label.untag',
  top: 'messenger:label.top',
  untop: 'messenger:label.untop',
  todo: 'messenger:label.todo',
  untodo: 'messenger:label.untodo',
  todoDone: 'messenger:label.todoDone',
  forward: 'messenger:label.forward',
  sticker: 'messenger:label.sticker',
  unknown: 'messenger:label.unknown',
} as const satisfies Record<PreviewLabel, string>;

const STATUS = {
  aiWaiting: 'messenger:status.aiWaiting',
  aiRunning: 'messenger:status.aiRunning',
  aiStopped: 'messenger:status.aiStopped',
  aiThinking: 'messenger:status.aiThinking',
} as const satisfies Record<PreviewStatus, string>;

/** 摘要文字：翻译后的 [标签] 加正文，放在 Text 里用 */
export function PreviewText({ preview }: { preview: Preview }) {
  const t = useT();
  const labels = preview.labels.map((l) => `[${t(LABELS[l])}]`).join('');
  const body = preview.status ? t(STATUS[preview.status]) : preview.text;
  return (
    <>
      {labels}
      {labels && body ? ' ' : ''}
      {body}
    </>
  );
}
