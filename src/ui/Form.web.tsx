import type { ReactNode } from 'react';

/**
 * 把账号、密码输入框包进 `<form>`，浏览器的密码管理器才认得出是登录表单（自动填充、提示保存）。
 * 不参与布局（display: contents）；提交仍由输入框的 onSubmitEditing 和按钮负责，表单自身的提交被拦掉
 */
export function Form({ children }: { children: ReactNode }) {
  return (
    <form style={{ display: 'contents' }} onSubmit={(event) => event.preventDefault()}>
      {children}
    </form>
  );
}
