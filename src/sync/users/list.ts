export function userLetter(az: string | null | undefined): string {
  const letter = (az ?? '').toUpperCase();
  return /^[A-Z]$/.test(letter) ? letter : '#';
}

export function letterGroups<T extends { userid: number; az?: string | null }>(users: readonly T[]): { letter: string; users: T[] }[] {
  const groups = new Map<string, Map<number, T>>();
  for (const user of new Map(users.map((user) => [user.userid, user])).values()) {
    const letter = userLetter(user.az);
    if (!groups.has(letter)) groups.set(letter, new Map());
    groups.get(letter)!.set(user.userid, user);
  }
  return [...groups].sort(([a], [b]) => a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)).map(([letter, list]) => ({ letter, users: [...list.values()].sort((a, b) => a.userid - b.userid) }));
}

const collator = new Intl.Collator('zh-CN');
const INITIALS = [...'ABCDEFGHJKLMNOPQRSTWXYZ'];
const BOUNDARIES = [...'阿八擦搭蛾发噶哈击喀垃妈拿哦啪期然撒塌挖昔压匝'];

// 服务端拼音没有音节分隔，用中文排序边界提取姓名首字母，避免引入拼音依赖。
export function nameInitials(name: string): string {
  return [...name].map((char) => {
    if (/[a-z0-9]/i.test(char)) return char.toLowerCase();
    if (!/[\u3400-\u9fff]/.test(char)) return '';
    for (let i = BOUNDARIES.length - 1; i >= 0; i--) {
      if (collator.compare(char, BOUNDARIES[i]!) >= 0) return INITIALS[i]!.toLowerCase();
    }
    return 'a';
  }).join('');
}

export function matchesUser(user: { nickname: string; email?: string | null; profession?: string | null; pinyin?: string | null }, keyword: string): boolean {
  const key = keyword.trim().toLowerCase();
  return !key || `${user.nickname} ${user.email ?? ''} ${user.profession ?? ''} ${user.pinyin ?? ''}`.toLowerCase().includes(key) || nameInitials(user.nickname).includes(key);
}
