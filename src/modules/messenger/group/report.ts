import { useCallback, useEffect, useRef, useState } from 'react';

import { useT } from '../../../i18n';
import { groupApi, systemApi } from '../../../sync/api';
import { showToast } from '../../../ui/Toast';
import { api, useErrorText } from '../../session';
import { encodeReportImage, pickReportImages, releaseImage, REPORT_IMAGE_BYTES, REPORT_IMAGE_MAX, REPORT_IMAGE_SIDE, type ReportImage } from './pickImages';

export const REPORT_REASON_MAX = 500;
export const REPORT_TYPES = [
  { id: 10, key: 'messenger:group.report.typeScam' },
  { id: 20, key: 'messenger:group.report.typePaidApp' },
  { id: 30, key: 'messenger:group.report.typeBlackmail' },
  { id: 40, key: 'messenger:group.report.typePhotoMismatch' },
  { id: 50, key: 'messenger:group.report.typeObscene' },
  { id: 60, key: 'messenger:group.report.typeAds' },
  { id: 70, key: 'messenger:group.report.typeOther' },
] as const;

/** 两端共用举报流程：网页选图即上传、原因选填；App 提交时上传、原因必填 */
export function useReport({ dialogId, onClose, reasonRequired, uploadOnPick }: {
  dialogId: number;
  onClose: () => void;
  reasonRequired: boolean;
  uploadOnPick: boolean;
}) {
  const t = useT();
  const errorText = useErrorText();
  const [type, setType] = useState(0);
  const [reason, setReason] = useState('');
  const [images, setImages] = useState<ReportImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [closed, setClosed] = useState(false);
  const active = useRef(true);
  const working = useRef(false);
  const selected = useRef<ReportImage[]>([]);
  // 某张图已经上传成功时，失败重试不重复上传它。
  const paths = useRef(new Map<string, string>());

  useEffect(() => {
    active.current = true;
    const uploaded = paths.current;
    return () => {
      active.current = false;
      selected.current.forEach(releaseImage);
      uploaded.clear();
    };
  }, []);

  const close = useCallback(() => {
    active.current = false;
    setClosed(true);
    onClose();
  }, [onClose]);

  const selectType = useCallback((id: number) => {
    if (!working.current) setType(id);
  }, []);

  const removeImage = useCallback((uri: string) => {
    if (working.current) return;
    const removed = selected.current.find((image) => image.uri === uri);
    selected.current = selected.current.filter((image) => image.uri !== uri);
    setImages(selected.current);
    paths.current.delete(uri);
    if (removed) releaseImage(removed);
  }, []);

  const uploadImage = useCallback(async (image: ReportImage) => {
    const existing = paths.current.get(image.uri);
    if (existing) return existing;
    const image64 = await encodeReportImage(image, uploadOnPick);
    if (!active.current) return null;
    const path = await systemApi.imageUpload(api, image64, { width: REPORT_IMAGE_SIDE, height: REPORT_IMAGE_SIDE, fit: 'percentage' });
    if (!active.current) return null;
    paths.current.set(image.uri, path);
    return path;
  }, [uploadOnPick]);

  const addImages = useCallback(async () => {
    if (!active.current || working.current || selected.current.length >= REPORT_IMAGE_MAX) return;
    working.current = true;
    setBusy(true);
    try {
      const picked = await pickReportImages(REPORT_IMAGE_MAX - selected.current.length);
      if (!active.current) {
        picked.forEach(releaseImage);
        return;
      }
      const accepted = picked.filter((image) => {
        if (uploadOnPick && !/\.(jpg|jpeg|webp|gif|png)$/i.test(image.fileName ?? '')) {
          showToast(t('messenger:group.report.imageFormatError', { name: image.fileName ?? '' }));
          releaseImage(image);
          return false;
        }
        if (uploadOnPick && (image.fileSize ?? 0) > REPORT_IMAGE_BYTES) {
          showToast(t('messenger:group.report.imageTooLarge', { name: image.fileName ?? '' }));
          releaseImage(image);
          return false;
        }
        return !selected.current.some((old) => old.uri === image.uri);
      });
      selected.current = [...selected.current, ...accepted].slice(0, REPORT_IMAGE_MAX);
      setImages(selected.current);
      if (uploadOnPick) {
        for (const image of accepted) {
          if (!active.current) break;
          try {
            await uploadImage(image);
          } catch (error) {
            if (!active.current) break;
            // 同旧网页：上传失败的截图不留在已上传列表，其他截图继续上传。
            showToast(errorText(error));
            selected.current = selected.current.filter((item) => item.uri !== image.uri);
            setImages(selected.current);
            releaseImage(image);
          }
        }
      }
    } catch (error) {
      if (active.current) showToast(errorText(error));
    } finally {
      working.current = false;
      if (active.current) setBusy(false);
    }
  }, [errorText, t, uploadImage, uploadOnPick]);

  const submit = useCallback(async () => {
    const text = reason.trim();
    if (!active.current || working.current || !type || (reasonRequired && !text)) return;
    working.current = true;
    setBusy(true);
    setSubmitting(true);
    try {
      const imgs: string[] = [];
      for (const image of selected.current) {
        if (!active.current) return;
        const path = await uploadImage(image);
        if (path === null) return;
        imgs.push(path);
      }
      if (!active.current) return;
      const msg = await groupApi.report(api, { dialog_id: dialogId, type, reason: text, imgs });
      if (!active.current) return;
      if (msg) showToast(msg);
      close();
    } catch (error) {
      if (active.current) showToast(errorText(error));
    } finally {
      working.current = false;
      if (active.current) {
        setBusy(false);
        setSubmitting(false);
      }
    }
  }, [close, dialogId, errorText, reason, reasonRequired, type, uploadImage]);

  return { type, selectType, reason, setReason, images, busy, submitting, closed, close, addImages, removeImage, submit };
}
