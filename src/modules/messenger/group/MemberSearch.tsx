import { useT } from '../../../i18n';
import { SearchField } from '../../../ui/SearchField';

export function MemberSearch({ value, onChangeText }: { value: string; onChangeText: (value: string) => void }) {
  const t = useT();
  return <SearchField value={value} onChangeText={onChangeText} placeholder={t('messenger:search')} clearLabel={t('clear')} />;
}
