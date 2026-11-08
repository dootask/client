// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// 依赖方向：app → modules → sync / ui / i18n / platform / embed，反向禁止（见 docs/architecture.md 第 5 节）
const upperLayers = ['./src/app', './src/modules'];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'ios/*', 'android/*', '.expo/*', 'expo-env.d.ts'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            { target: './src/modules', from: './src/app', message: 'modules 不能依赖路由层' },
            { target: './src/sync', from: [...upperLayers, './src/ui', './src/i18n', './src/platform', './src/embed'], message: 'sync 是最底层，不能依赖其他层' },
            { target: './src/ui', from: [...upperLayers, './src/sync'], message: 'ui 只放展示组件，不能依赖业务层和数据层' },
            { target: './src/i18n', from: [...upperLayers, './src/ui', './src/sync', './src/embed'], message: 'i18n 不能依赖其他层' },
            { target: './src/platform', from: [...upperLayers, './src/ui', './src/sync', './src/embed'], message: 'platform 不能依赖上层' },
            { target: './src/embed', from: [...upperLayers, './src/sync'], message: 'embed 是底层嵌入容器，不能依赖业务层和数据层' },
          ],
        },
      ],
    },
  },
  {
    // sync 不依赖 React 和 RN 组件层，逻辑可以直接在 vitest（node）里测；
    // 存储需要的原生模块（MMKV、expo-sqlite）不是 React，可以引用
    files: ['src/sync/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['react', 'react/*', 'react-native', 'react-native/*', 'react-dom', 'react-dom/*'], message: 'sync 不能依赖 React / RN' }] },
      ],
    },
  },
  {
    // 平台差异用 .web.tsx / .native.tsx 分文件，业务代码里不判断平台
    files: ['src/app/**/*.{ts,tsx}', 'src/modules/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: "MemberExpression[object.name='Platform'][property.name=/^(OS|select)$/]", message: '平台差异用 .web.tsx / .native.tsx 分文件，不要在业务代码里判断平台' },
      ],
    },
  },
]);
