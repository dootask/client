import { LANGUAGE_TAGS, type Language } from './languages';

/**
 * 一串名字：全部列出时按本语言连接（「甲、乙和丙」「A, B, and C」）；
 * 截断时只用本语言的分隔符连起来，后面接 more（如「+3位」）
 */
export function joinNames(names: readonly string[], language: Language, more?: string): string {
  const format = new Intl.ListFormat(LANGUAGE_TAGS[language], { type: 'conjunction' });
  if (!more) return format.format(names);
  const separator = format.formatToParts(['a', 'b', 'c']).find((part) => part.type === 'literal')?.value ?? ', ';
  return `${names.join(separator)} ${more}`;
}
