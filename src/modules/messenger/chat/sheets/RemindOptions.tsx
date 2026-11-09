import { useState } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useLanguage, useT, dateFormats } from '../../../../i18n';
import { Chip } from '../../../../ui/Chip';
import { DateTimePicker } from '../../../../ui/DateTimePicker';
import { formatMoment } from '../format';
import { defaultCustom, PRESETS, type Remind } from './remind';

const LABELS = {
  '1h': 'messenger:todos.in1h',
  tonight: 'messenger:todos.tonight',
  tomorrow: 'messenger:todos.tomorrow',
} as const;

/**
 * 提醒时间的选项：预设排一行（放不下换行），选「自定义」时下面展开日历和时间。
 * withNone 时带「不提醒」；current 是对不上预设的已有提醒时间，排在「自定义」前单独一项
 */
export function RemindOptions({
  remind,
  custom,
  current = 0,
  withNone = true,
  onRemind,
  onCustom,
}: {
  remind: Remind;
  custom: Date;
  current?: number;
  withNone?: boolean;
  onRemind: (remind: Remind) => void;
  onCustom: (custom: Date) => void;
}) {
  const t = useT();
  const language = useLanguage();
  // 日历里今天之前的日子不能选
  const [minDate] = useState(() => new Date());
  // 时间滚轮能滚到今天已过去的时刻，选到了就换成默认值
  const pickCustom = (date: Date) => onCustom(date.getTime() > Date.now() ? date : defaultCustom());
  return (
    <>
      <View style={styles.chips}>
        {withNone && <Chip label={t('messenger:todos.none')} active={remind === 'none'} onPress={() => onRemind('none')} />}
        {PRESETS.map((key) => (
          <Chip key={key} label={t(LABELS[key])} active={remind === key} onPress={() => onRemind(key)} />
        ))}
        {current > 0 && <Chip label={formatMoment(current, dateFormats(language))} active={remind === 'current'} onPress={() => onRemind('current')} />}
        <Chip label={t('messenger:todos.custom')} active={remind === 'custom'} onPress={() => onRemind('custom')} />
      </View>
      {remind === 'custom' && <DateTimePicker date={custom} minDate={minDate} onChange={pickCustom} />}
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
}));
