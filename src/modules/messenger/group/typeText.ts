import type { Translate } from '../../../i18n';

export function groupTypeText(type: string | null | undefined, t: Translate) {
  switch (type) {
    case 'all': return t('messenger:group.info.all');
    case 'department': return t('messenger:group.info.department');
    case 'project': return t('messenger:group.info.project');
    case 'task': return t('messenger:group.info.task');
    case 'user': return t('messenger:group.info.personal');
    case 'okr': return t('messenger:group.info.okr');
    default: return t('messenger:group.info.unknown');
  }
}
