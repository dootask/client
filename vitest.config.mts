import { defineConfig } from 'vitest/config';

// 只测与 React 无关的纯 TS（sync 层、协议、纯函数）；组件不写单元测试
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
