import { useCallback, useState } from 'react';

import { kv, KV_KEYS } from '../../sync/storage';

/** 列表栏拖出来的宽度，按 id 分开记住；交给 ListDetail 的 width / onResize */
export function useListPaneWidth(id: string): { width: number | undefined; onResize: (width: number) => void } {
  const key = KV_KEYS.listPaneWidth(id);
  const [width, setWidth] = useState(() => kv.getNumber(key));
  const onResize = useCallback(
    (next: number) => {
      const rounded = Math.round(next);
      kv.set(key, rounded);
      setWidth(rounded);
    },
    [key],
  );
  return { width, onResize };
}
