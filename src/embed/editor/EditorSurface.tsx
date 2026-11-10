import { type ComponentRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { EDITOR_STYLE, themeVars } from './core';
import { EDITOR_SCRIPT, QUILL_CSS } from './page.generated';
import type { EditorEvent, EditorTheme } from './protocol';
import type { EditorSurfaceProps } from './types';

/** 编辑页：一开始就按主题配色（WebView 底色与页面同色，加载中不闪白），Quill 和编辑器逻辑内联，不走网络 */
function pageHtml(theme: EditorTheme) {
  const vars = Object.entries(themeVars(theme))
    .map(([name, value]) => `${name}:${value}`)
    .join(';');
  return [
    '<!doctype html><html><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">',
    `<style>${QUILL_CSS}`,
    `html,body{margin:0;height:100%;background:${theme.bg};-webkit-text-size-adjust:100%}`,
    `${EDITOR_STYLE}</style></head>`,
    `<body><div id="editor" class="dt-editor" style="${vars}"></div><script>${EDITOR_SCRIPT}</script></body></html>`,
  ].join('');
}

/**
 * App：编辑器跑在 WebView 里。页面就绪（boot）后下发 init，编辑器聚焦后（ready）让 WebView 拿到焦点：
 * 安卓上页面里程序聚焦不弹键盘，requestFocus 同时弹出（patches/react-native-webview）
 */
export function EditorSurface({ init, theme, onEvent, ref }: EditorSurfaceProps) {
  const web = useRef<ComponentRef<typeof WebView>>(null);
  const [source] = useState(() => ({ html: pageHtml(theme) }));
  const booted = useRef(false);

  const call = (method: string, ...args: unknown[]) => {
    web.current?.injectJavaScript(`window.editor.${method}(${args.map((arg) => JSON.stringify(arg)).join(',')});true;`);
  };

  const themeKey = JSON.stringify(theme);
  useEffect(() => {
    if (booted.current) call('theme', JSON.parse(themeKey));
  }, [themeKey]);

  useImperativeHandle(ref, () => ({
    toggle: (name, value) => call('toggle', name, value),
    link: (url) => call('link', url),
    unlink: () => call('unlink'),
    mention: (mention) => call('mention', mention),
    replaceQuery: (text) => call('replaceQuery', text),
    focus: () => {
      web.current?.requestFocus();
      call('focus');
    },
  }));

  const onMessage = (event: WebViewMessageEvent) => {
    const message = JSON.parse(event.nativeEvent.data) as EditorEvent;
    if (message.type === 'boot') {
      booted.current = true;
      call('init', init);
      return;
    }
    if (message.type === 'ready') web.current?.requestFocus();
    onEvent(message);
  };

  return (
    <WebView
      ref={web}
      source={source}
      originWhitelist={['*']}
      onMessage={onMessage}
      keyboardDisplayRequiresUserAction={false}
      hideKeyboardAccessoryView
      style={{ backgroundColor: theme.bg }}
    />
  );
}
