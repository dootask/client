export interface ModelOption {
  id: string;
  type: string;
  value: string;
  label: string;
}

export interface ModelGroup {
  type: string;
  label: string;
  defaultModel: string;
  options: ModelOption[];
}

export interface ModelConfig {
  groups: ModelGroup[];
  map: Record<string, ModelOption>;
}

const PROVIDERS = ['dooai', 'openai', 'claude', 'deepseek', 'gemini', 'grok', 'ollama', 'zhipu', 'qianwen', 'wenxin'];
const PROVIDER_LABELS: Record<string, string> = {
  dooai: 'Doo AI',
  openai: 'ChatGPT',
  claude: 'Claude',
  deepseek: 'DeepSeek',
  gemini: 'Gemini',
  grok: 'Grok',
  ollama: 'Ollama',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function scalarText(value: unknown): string {
  return typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value)) ? String(value).trim() : '';
}

/** 兼容 JSON 数组与旧的逐行 id|name；坏配置不成为可选模型 */
function parseOptions(raw: unknown): { value: string; label: string }[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  if (raw.trim().startsWith('[')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item: unknown) => {
      if (!isRecord(item) || item.hidden) return [];
      const value = scalarText(item.id ?? item.value);
      if (!value) return [];
      return [{ value, label: scalarText(item.name ?? item.label) || value }];
    });
  }
  return raw.split('\n').flatMap((line) => {
    const [value = '', label = ''] = line.split('|').map((text) => text.trim());
    return value ? [{ value, label: label || value }] : [];
  });
}

/** 服务商的中文显示名由调用方传入翻译后的 labels，数据层不依赖界面语言 */
export function parseModelGroups(data: Record<string, unknown>, labels: Record<string, string> = {}): ModelConfig {
  const groups: ModelGroup[] = [];
  for (const [key, raw] of Object.entries(data)) {
    const match = key.match(/^(.+)_models$/);
    if (!match) continue;
    const type = match[1]!;
    const list = parseOptions(raw);
    if (!list.length) continue;
    groups.push({
      type,
      label: (Object.hasOwn(labels, type) ? labels[type] : undefined)
        || (Object.hasOwn(PROVIDER_LABELS, type) ? PROVIDER_LABELS[type] : undefined) || type,
      defaultModel: scalarText(data[`${type}_model`]),
      options: list.map((option) => ({ ...option, id: `${type}:${option.value}`, type })),
    });
  }
  groups.sort((a, b) => {
    const indexA = PROVIDERS.indexOf(a.type);
    const indexB = PROVIDERS.indexOf(b.type);
    if (indexA === -1 && indexB === -1) return a.label.localeCompare(b.label);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
  return { groups, map: Object.fromEntries(groups.flatMap((group) => group.options.map((option) => [option.id, option]))) };
}

/** 当前模型 > 缓存模型 > 按组顺序找到的默认模型 > 第一个可用模型 */
export function pickModelId({ groups, map }: ModelConfig, current = '', cached = ''): string {
  if (current && Object.hasOwn(map, current)) return current;
  if (cached && Object.hasOwn(map, cached)) return cached;
  for (const group of groups) {
    const match = group.defaultModel && group.options.find((option) => option.value === group.defaultModel);
    if (match) return match.id;
  }
  return groups.find((group) => group.options.length)?.options[0]?.id ?? '';
}

export function modelLabel({ groups }: ModelConfig, name: string): string {
  for (const group of groups) {
    const option = group.options.find((item) => item.value === name);
    if (option) return option.label;
  }
  return name;
}
