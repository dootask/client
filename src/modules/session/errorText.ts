import { useCallback } from 'react';

import { useT } from '../../i18n';
import { ApiError } from '../../sync/api';

/** 把请求错误换成给用户看的一句话：按 kind 翻译；服务端错误用服务端按界面语言翻好的提示 */
export function useErrorText(): (error: unknown) => string {
  const t = useT();
  return useCallback((error: unknown): string => {
    if (!(error instanceof ApiError)) return t('error.unknown');
    switch (error.kind) {
      case 'network':
        return t('error.network');
      case 'invalid':
        return t('error.invalid');
      case 'no-server':
        return t('error.noServer');
      case 'server':
        return error.message || t('error.server');
    }
  }, [t]);
}
