import 'dayjs/locale/zh-tw';

import { memo, useCallback, useMemo } from 'react';
import Picker, { type DateType } from 'react-native-ui-datepicker';
import { useUnistyles } from 'react-native-unistyles';

import { useLanguage, type Language } from '../i18n';

/** 界面语言 → dayjs 语言（其余同名） */
const LOCALES: Partial<Record<Language, string>> = { 'zh-CHT': 'zh-tw' };

/**
 * 组件按本地时区换算时要把 toLocaleString 的结果再解析回日期，Hermes 解析不了会把时间算错；
 * 所以固定用 UTC 时区，传进去的是「UTC 读数等于本机读数」的镜像时间，选出来再换回本机时间
 */
const toMirror = (date: Date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()));
const fromMirror = (date: Date) => new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes());

/**
 * 日历 + 时分滚轮（点日历顶部的时间切换到滚轮），选的是本机时间。
 * 不标「今天」：组件按 UTC 算今天，凌晨会标错日子；今天之前不可选时第一个可选日就是今天
 */
export const DateTimePicker = memo(function DateTimePicker({ date, minDate, onChange }: {
  date: Date;
  /** 最早可选的日子（只看日期） */
  minDate?: Date;
  onChange: (date: Date) => void;
}) {
  const { theme } = useUnistyles();
  const language = useLanguage();
  const value = useMemo(() => toMirror(date), [date]);
  const min = useMemo(() => minDate && new Date(Date.UTC(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())), [minDate]);
  const handleChange = useCallback(({ date: picked }: { date: DateType }) => {
    if (picked) onChange(fromMirror(new Date(picked instanceof Date ? picked : (picked as string | number))));
  }, [onChange]);

  const c = theme.colors;
  const selected = { backgroundColor: c.primary, borderRadius: theme.radius.block };
  const selectedLabel = { color: c.onPrimary, fontWeight: '600' as const };
  return (
    <Picker
      mode="single"
      timeZone="UTC"
      locale={LOCALES[language] ?? language}
      // 英文习惯周日开头，其余周一
      firstDayOfWeek={language === 'en' ? 0 : 1}
      date={value}
      minDate={min}
      timePicker
      onChange={handleChange}
      styles={{
        header: { paddingHorizontal: 0 },
        month_selector_label: { color: c.text, fontWeight: '600' },
        year_selector_label: { color: c.text, fontWeight: '600' },
        time_selector_label: { color: c.primaryText, fontWeight: '600' },
        button_prev_image: { tintColor: c.text2 },
        button_next_image: { tintColor: c.text2 },
        weekday_label: { color: c.text3 },
        day_label: { color: c.text },
        disabled_label: { color: c.text4 },
        selected,
        selected_label: selectedLabel,
        month_label: { color: c.text },
        year_label: { color: c.text },
        selected_month: selected,
        selected_month_label: selectedLabel,
        selected_year: selected,
        selected_year_label: selectedLabel,
        time_label: { color: c.text },
        time_selected_indicator: { backgroundColor: c.fill, borderRadius: theme.radius.block },
      }}
    />
  );
});
