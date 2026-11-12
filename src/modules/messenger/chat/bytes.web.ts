/** 文件大小（同旧版网页 $A.bytesToSize）：两位小数，如 2.41 MB、512.00 B */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** unit).toFixed(2)} ${units[unit]}`;
}
