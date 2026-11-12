import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Plus, X } from 'lucide-react-native';
import { memo, useCallback } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { Icon } from '../../../ui/Icon';
import { SidePage } from '../../../ui/layout';
import { ListItem, ListSection } from '../../../ui/List';
import { Touchable } from '../../../ui/Touchable';
import { REPORT_IMAGE_MAX } from './pickImages';
import { REPORT_REASON_MAX, REPORT_TYPES, useReport } from './report';
import { closeGroupPage } from './useGroup';

function back() {
  if (router.canGoBack()) router.back();
  else router.navigate('/messenger');
}

export function ReportRoute() {
  const { dialogId } = useLocalSearchParams<{ dialogId: string }>();
  return <ReportScreen key={dialogId} dialogId={Number(dialogId) || 0} onClose={() => closeGroupPage(Number(dialogId))} />;
}

/** App 整页举报：类型、必填原因与最多五张截图，提交操作放在导航栏右侧 */
export function ReportScreen({ dialogId, onClose = back }: { dialogId: number; onClose?: () => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const report = useReport({ dialogId, onClose, reasonRequired: true, uploadOnPick: false });
  const canSubmit = dialogId > 0 && !!report.type && !!report.reason.trim() && !report.busy;
  if (report.closed) return null;
  return (
    <SidePage
      title={t('messenger:group.report.title')}
      onClose={report.close}
      right={(
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={t('messenger:group.report.submit')}
          hitSlop={theme.spacing.sm}
          disabled={!canSubmit}
          onPress={report.submit}
          style={({ pressed }) => [styles.headerAction, { opacity: pressed ? theme.opacity.pressedIcon : 1 }]}
        >
          {report.submitting
            ? <ActivityIndicator color={theme.colors.text3} />
            : <Text style={[styles.submitText, { color: canSubmit ? theme.colors.primaryText : theme.colors.text4 }]}>{t('messenger:group.report.submit')}</Text>}
        </Touchable>
      )}
    >
      <KeyboardAwareScrollView
        style={styles.body}
        bottomOffset={theme.spacing.xl}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + theme.spacing.xxl }}
      >
        <ListSection title={t('messenger:group.report.typeLabel')} hint first>
          {REPORT_TYPES.map((item) => (
            <TypeRow key={item.id} id={item.id} labelKey={item.key} checked={report.type === item.id} disabled={report.busy} onSelect={report.selectType} />
          ))}
        </ListSection>
        <ListSection title={t('messenger:group.report.reasonLabel')} hint>
          <TextInput
            value={report.reason}
            onChangeText={report.setReason}
            multiline
            editable={!report.busy}
            maxLength={REPORT_REASON_MAX}
            textAlignVertical="top"
            accessibilityLabel={t('messenger:group.report.reasonLabel')}
            placeholder={t('messenger:group.report.reasonPlaceholder')}
            placeholderTextColor={theme.colors.text3}
            style={styles.reason}
          />
        </ListSection>
        <View style={styles.images}>
          {report.images.map((image) => <ImageTile key={image.uri} uri={image.uri} disabled={report.busy} onRemove={report.removeImage} />)}
          {report.images.length < REPORT_IMAGE_MAX && (
            <Touchable
              accessibilityRole="button"
              accessibilityLabel={t('messenger:group.report.addImage')}
              disabled={report.busy}
              onPress={report.addImages}
              style={({ pressed }) => [styles.thumb, styles.add, { backgroundColor: pressed ? theme.colors.fillPressed : theme.colors.fill }]}
            >
              <Icon icon={Plus} color={theme.colors.text3} size={theme.size.report.addIconNative} />
            </Touchable>
          )}
        </View>
      </KeyboardAwareScrollView>
    </SidePage>
  );
}

const TypeRow = memo(function TypeRow({ id, labelKey, checked, disabled, onSelect }: {
  id: number;
  labelKey: typeof REPORT_TYPES[number]['key'];
  checked: boolean;
  disabled: boolean;
  onSelect: (id: number) => void;
}) {
  const t = useT();
  const { theme } = useUnistyles();
  const select = useCallback(() => onSelect(id), [id, onSelect]);
  return <ListItem label={t(labelKey)} disabled={disabled} onPress={select} trailing={checked && <Icon icon={Check} color={theme.colors.primary} size={theme.size.avatar.xs} />} />;
});

const ImageTile = memo(function ImageTile({ uri, disabled, onRemove }: { uri: string; disabled: boolean; onRemove: (uri: string) => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const remove = useCallback(() => onRemove(uri), [onRemove, uri]);
  return (
    <View>
      <Image source={uri} contentFit="cover" style={{ width: theme.size.report.thumbNative, height: theme.size.report.thumbNative, borderRadius: theme.radius.block }} />
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={t('messenger:group.report.removeImage')}
        hitSlop={theme.spacing.sm}
        disabled={disabled}
        onPress={remove}
        style={({ pressed }) => [styles.remove, { opacity: pressed ? theme.opacity.pressedIcon : 1 }]}
      >
        <Icon icon={X} color={theme.colors.onMedia} size={theme.size.report.removeIcon} />
      </Touchable>
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  body: { flex: 1, backgroundColor: theme.colors.surface },
  headerAction: { paddingHorizontal: theme.spacing.md },
  submitText: { ...theme.typography.body },
  reason: { ...theme.typography.body, color: theme.colors.text, minHeight: theme.size.report.reasonNative, padding: theme.spacing.lg },
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginHorizontal: theme.spacing.page, marginTop: theme.spacing.sm },
  thumb: { width: theme.size.report.thumbNative, height: theme.size.report.thumbNative, borderRadius: theme.radius.block },
  add: { alignItems: 'center', justifyContent: 'center' },
  remove: {
    position: 'absolute', top: theme.size.report.removeInset, right: theme.size.report.removeInset,
    width: theme.size.report.remove, height: theme.size.report.remove, borderRadius: theme.size.report.remove / 2,
    alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.mediaScrim,
  },
}));
