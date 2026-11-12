import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';

import { useT } from '../../../../i18n';
import { IconButton } from '../../../../ui/IconButton';
import { Sheet } from '../../../../ui/layout';
import { MergeDetail } from '../MergeDetail';

type Layer = { msgId: number; title: string };

/** 合并转发详情（网页）：宽屏右侧抽屉、窄屏整屏；点里面嵌套的合并转发再开一层，左上角返回上一层 */
export function MergeDetailSheet({ dialogId, msgId, title, visible, onClose }: { dialogId: number; msgId: number; title: string; visible: boolean; onClose: () => void }) {
  const t = useT();
  const [stack, setStack] = useState<Layer[]>([{ msgId, title }]);
  const top = stack[stack.length - 1];
  return (
    <Sheet
      visible={visible}
      wide="right"
      fill
      onClose={onClose}
      title={top.title}
      left={stack.length > 1 && <IconButton icon={ChevronLeft} label={t('back')} onPress={() => setStack((s) => s.slice(0, -1))} />}
    >
      <MergeDetail key={top.msgId} msgId={top.msgId} dialogId={dialogId} openMerge={(id, name) => setStack((s) => [...s, { msgId: id, title: name }])} />
    </Sheet>
  );
}
