import { router } from 'expo-router';

import { useT } from '../../i18n';
import { SidePage } from '../../ui/layout';
import { PlaceholderScreen } from '../../ui/PlaceholderScreen';

/** 推入的二级页还没写好时的占位：返回按钮 + 「开发中」 */
export function WipRoute() {
  const t = useT();
  return (
    <SidePage title="" onClose={() => (router.canGoBack() ? router.back() : router.navigate('/'))}>
      <PlaceholderScreen title="" subtitle={t('wip')} />
    </SidePage>
  );
}
