import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { CircleX, Plus, X } from 'lucide-react-native';
import { memo, useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { DooButton } from '../../../ui/DooModal';
import { Icon } from '../../../ui/Icon';
import { SidePage } from '../../../ui/layout';
import { Touchable } from '../../../ui/Touchable';
import { openMedia } from '../../media';
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

/** 网页举报抽屉：宽 500，窄屏铺满，原因选填；未选类型按旧版弹出提示卡 */
export function ReportScreen({ dialogId, onClose = back }: { dialogId: number; onClose?: () => void }) {
  const t = useT();
  const { theme, rt } = useUnistyles();
  const narrow = rt.breakpoint === 'xs';
  const report = useReport({ dialogId, onClose, reasonRequired: false, uploadOnPick: true });
  const [validation, setValidation] = useState(false);
  const { type, submit: submitReport } = report;
  const dismissValidation = useCallback(() => setValidation(false), []);
  const submit = useCallback(() => {
    if (!type) setValidation(true);
    else void submitReport();
  }, [type, submitReport]);
  const viewImage = useCallback((uri: string) => {
    openMedia({ kind: 'pictures', items: report.images.map((image) => ({ url: image.uri })), position: report.images.findIndex((image) => image.uri === uri) });
  }, [report.images]);
  if (report.closed) return null;
  return (
    <SidePage title={t('messenger:group.report.title')} testID="report-panel" width={theme.size.report.width} onClose={report.close}>
      <View style={styles.page}>
        <Text testID="report-title" style={styles.title} accessibilityRole="header">{t('messenger:group.report.title')}</Text>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.body(narrow)} keyboardShouldPersistTaps="handled">
          <View style={styles.typeLabel}>
            <Text style={styles.required}>*</Text>
            <Text style={styles.label}>{t('messenger:group.report.typeLabelWeb')}</Text>
          </View>
          <View accessibilityRole="radiogroup">
            {REPORT_TYPES.map((item) => <TypeRow key={item.id} id={item.id} labelKey={item.key} checked={report.type === item.id} disabled={report.busy} onSelect={report.selectType} />)}
          </View>
          <Text style={[styles.label, styles.reasonLabel]}>{t('messenger:group.report.reasonLabelWeb')}</Text>
          <TextInput
            testID="report-reason-input"
            multiline
            editable={!report.busy}
            value={report.reason}
            onChangeText={report.setReason}
            maxLength={REPORT_REASON_MAX}
            accessibilityLabel={t('messenger:group.report.reasonLabel')}
            placeholder={t('messenger:group.report.reasonPlaceholder')}
            placeholderTextColor={theme.colors.placeholder}
            style={styles.reason}
          />
          <View style={styles.images}>
            {report.images.map((image) => <ImageTile key={image.uri} uri={image.uri} disabled={report.busy} onRemove={report.removeImage} onView={viewImage} />)}
            {report.images.length < REPORT_IMAGE_MAX && (
              <Touchable
                testID="report-add-image"
                accessibilityRole="button"
                accessibilityLabel={t('messenger:group.report.addImage')}
                disabled={report.busy}
                onPress={report.addImages}
                style={({ pressed, hovered }) => [styles.thumb, styles.add, { backgroundColor: pressed || hovered ? theme.colors.menuHover : theme.colors.surface }]}
              >
                {report.busy && !report.submitting
                  ? <ActivityIndicator color={theme.colors.descText} />
                  : <Icon icon={Plus} color={theme.colors.descText} size={theme.size.report.addIcon} />}
              </Touchable>
            )}
          </View>
        </ScrollView>
        <View style={styles.footer(narrow)}>
          <Touchable
            testID="report-submit"
            accessibilityRole="button"
            accessibilityLabel={t('messenger:group.report.submit')}
            disabled={report.busy || dialogId <= 0}
            onPress={submit}
            style={({ pressed, hovered }) => styles.submit(report.busy || dialogId <= 0, pressed, hovered)}
          >
            {report.submitting
              ? <ActivityIndicator color={theme.colors.onPrimary} size="small" />
              : <Icon icon={Plus} color={theme.colors.onPrimary} size={theme.size.report.buttonIcon} />}
            <Text style={styles.submitText}>{t('messenger:group.report.submit')}</Text>
          </Touchable>
        </View>
      </View>
      {validation && <TypeRequired onClose={dismissValidation} />}
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
  const label = t(labelKey);
  const toggle = useCallback(() => onSelect(checked ? 0 : id), [checked, id, onSelect]);
  const select = useCallback(() => onSelect(id), [id, onSelect]);
  return (
    <View style={styles.row}>
      <Touchable testID={`report-type-${id}`} disabled={disabled} onPress={toggle} style={({ pressed, hovered }) => styles.option(pressed, hovered)}>
        <Text style={styles.optionText}>{label}</Text>
      </Touchable>
      <Touchable accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked, disabled }} disabled={disabled} onPress={select} style={styles.radioArea}>
        <View style={styles.radio(checked)}>{checked && <View style={styles.radioDot} />}</View>
      </Touchable>
    </View>
  );
});

const ImageTile = memo(function ImageTile({ uri, disabled, onRemove, onView }: {
  uri: string;
  disabled: boolean;
  onRemove: (uri: string) => void;
  onView: (uri: string) => void;
}) {
  const t = useT();
  const { theme } = useUnistyles();
  const remove = useCallback(() => onRemove(uri), [onRemove, uri]);
  const view = useCallback(() => onView(uri), [onView, uri]);
  return (
    <View>
      <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:group.report.viewImage')} onPress={view} style={({ pressed }) => ({ opacity: pressed ? theme.opacity.pressedIcon : 1 })}>
        <Image source={uri} contentFit="cover" style={{ width: theme.size.report.thumb, height: theme.size.report.thumb, borderRadius: theme.radius.menu }} />
      </Touchable>
      <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:group.report.removeImage')} disabled={disabled} onPress={remove} style={({ pressed, hovered }) => [styles.remove, { opacity: pressed || hovered ? theme.opacity.pressedPrimary : 1 }]}>
        <Icon icon={X} color={theme.colors.onMedia} size={theme.size.report.removeIcon} />
      </Touchable>
    </View>
  );
});

/** 校验提示只在打开时挂载；Esc 只关闭提示，不退出举报抽屉 */
function TypeRequired({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { theme, rt } = useUnistyles();
  const narrow = rt.breakpoint === 'xs';
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.validationWrap}>
        <Pressable style={styles.mask} accessible={false} />
        <View style={styles.validationCard(narrow)} role="dialog" aria-modal>
          <View style={styles.validationHead}>
            <Icon icon={CircleX} color={theme.colors.danger} size={theme.size.layer.icon} />
            <Text style={styles.validationTitle}>{t('messenger:group.report.validationTitle')}</Text>
          </View>
          <Text style={styles.validationText}>{t('messenger:group.report.typeLabel')}</Text>
          <View style={styles.validationFooter}>
            <DooButton primary label={t('messenger:group.report.confirm')} minWidth={theme.size.layer.buttonMin} onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => {
  const r = theme.size.report;
  const l = theme.size.layer;
  return {
    page: { flex: 1, minHeight: 0, paddingTop: r.top, borderLeftWidth: r.line, borderLeftColor: theme.colors.menuDivider },
    title: { ...theme.typography.cardText, color: theme.colors.titleText, marginHorizontal: r.padX },
    scroll: { flex: 1, marginTop: r.top },
    body: (narrow: boolean) => ({ paddingHorizontal: narrow ? r.padXNarrow : r.padX, paddingBottom: theme.spacing.lg }),
    label: { ...theme.typography.cardText, color: theme.colors.regularText },
    typeLabel: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, paddingBottom: r.labelBottom, borderBottomWidth: r.line, borderBottomColor: theme.colors.menuDivider },
    required: { ...theme.typography.cardText, color: theme.colors.danger },
    row: { height: r.row, flexDirection: 'row', alignItems: 'center', borderBottomWidth: r.line, borderBottomColor: theme.colors.reportRowLine },
    option: (pressed: boolean, hovered: boolean) => ({ flex: 1, height: '100%', justifyContent: 'center', backgroundColor: pressed ? theme.colors.reportRowPressed : hovered ? theme.colors.menuHover : undefined }),
    optionText: { ...theme.typography.cardText, color: theme.colors.titleText },
    radioArea: { width: theme.size.toolButton, height: '100%', alignItems: 'center', justifyContent: 'center' },
    radio: (checked: boolean) => ({ width: r.radio, height: r.radio, borderRadius: r.radio / 2, borderWidth: r.line, borderColor: checked ? theme.colors.primary : theme.colors.ivuBorder, alignItems: 'center', justifyContent: 'center' }),
    radioDot: { width: r.radioDot, height: r.radioDot, borderRadius: r.radioDot / 2, backgroundColor: theme.colors.primary },
    reasonLabel: { marginTop: r.top, marginBottom: theme.spacing.md },
    reason: { ...theme.typography.cardText, color: theme.colors.titleText, height: r.reason, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, borderWidth: r.line, borderColor: theme.colors.headerLine, borderRadius: theme.radius.menu, outlineColor: theme.colors.focusRing, textAlignVertical: 'top' },
    images: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: r.top },
    thumb: { width: r.thumb, height: r.thumb, borderRadius: theme.radius.menu },
    add: { alignItems: 'center', justifyContent: 'center', borderWidth: r.line, borderStyle: 'dashed', borderColor: theme.colors.reportUploadBorder },
    remove: { position: 'absolute', top: r.removeInset, right: r.removeInset, width: r.remove, height: r.remove, borderRadius: r.remove / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.mediaScrim },
    footer: (narrow: boolean) => ({ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: narrow ? r.padXNarrow : r.padX, paddingVertical: r.top }),
    submit: (disabled: boolean, pressed: boolean, hovered: boolean) => ({ width: r.buttonWidth, height: r.button, borderRadius: theme.radius.menu, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs, backgroundColor: theme.colors.ivuPrimary, opacity: disabled ? theme.opacity.disabled : pressed ? theme.opacity.pressedPrimary : 1, boxShadow: !disabled && hovered ? `inset 0px 0px 0px 100px ${theme.colors.dooButtonHover}` : undefined }),
    submitText: { ...theme.typography.ivuButton, color: theme.colors.onPrimary },
    validationWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: l.narrowSide },
    mask: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.modalMask },
    validationCard: (narrow: boolean) => ({ width: narrow ? l.narrowWidth : l.width, maxWidth: '100%', paddingVertical: l.padY, paddingHorizontal: narrow ? l.narrowX : l.padX, borderRadius: narrow ? l.narrowRadius : l.radius, backgroundColor: theme.colors.surface, boxShadow: narrow ? theme.shadow.layerNarrow : theme.shadow.modal }),
    validationHead: { flexDirection: 'row', alignItems: 'center', minHeight: l.head, gap: l.iconGap },
    validationTitle: { ...theme.typography.layerTitle, color: theme.colors.titleText, flexShrink: 1 },
    validationText: { ...theme.typography.layerMessage, color: theme.colors.regularText, paddingLeft: l.messageIndent },
    validationFooter: { marginTop: l.footerTop, flexDirection: 'row', justifyContent: 'flex-end' },
  };
});
