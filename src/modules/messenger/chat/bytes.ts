/** 文件大小（同旧版 App）：一位小数，100 以上取整 */
export function formatBytes(bytes: number): string {
  // 后端按两位小数的 KB 存再乘 1024，小文件会是带小数的字节数
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}
