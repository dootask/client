import { type ComponentRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { createEditor, EDITOR_STYLE } from './core';
import type { EditorSurfaceProps } from './types';

type Editor = ReturnType<typeof createEditor>;

/** 编辑器样式插进页面一次 */
function ensureStyle() {
  if (document.getElementById('dt-editor-style')) return;
  const style = document.createElement('style');
  style.id = 'dt-editor-style';
  style.textContent = EDITOR_STYLE;
  document.head.appendChild(style);
}

/**
 * Web：直接在页面里创建编辑器（不用 iframe），Quill 打开时才加载。
 * 按键在捕获阶段先交给宿主，候选列表、发送快捷键处理了就不再进编辑器，也不再往外传
 */
export function EditorSurface({ init, theme, onEvent, keysRef, ref }: EditorSurfaceProps) {
  const host = useRef<ComponentRef<typeof View>>(null);
  const editor = useRef<Editor | null>(null);
  const [initial] = useState(() => ({ init, theme }));
  const latest = useRef({ onEvent, keysRef });
  useLayoutEffect(() => {
    latest.current = { onEvent, keysRef };
  });

  useEffect(() => {
    const el = host.current as unknown as HTMLElement | null;
    if (!el) return;
    let cancelled = false;
    // 处理过的键连同它的 keyup 一起拦下：弹窗在 keyup 时响应 Esc，收起候选时不能把整个编辑器也关了
    const handled = new Set<string>();
    const onKeyDown = (event: KeyboardEvent) => {
      if (latest.current.keysRef?.current?.(event.key, event.metaKey || event.ctrlKey)) {
        handled.add(event.key);
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (handled.delete(event.key)) event.stopPropagation();
    };
    el.classList.add('dt-editor');
    el.addEventListener('keydown', onKeyDown, true);
    el.addEventListener('keyup', onKeyUp, true);
    void import('./quill.web').then(({ default: Quill }) => {
      if (cancelled) return;
      ensureStyle();
      const created = createEditor(Quill, el, (event) => latest.current.onEvent(event));
      editor.current = created;
      created.theme(initial.theme);
      created.init(initial.init);
    });
    return () => {
      cancelled = true;
      el.removeEventListener('keydown', onKeyDown, true);
      el.removeEventListener('keyup', onKeyUp, true);
      editor.current?.destroy();
      editor.current = null;
      el.replaceChildren();
    };
  }, [initial]);

  const themeKey = JSON.stringify(theme);
  useEffect(() => {
    editor.current?.theme(JSON.parse(themeKey));
  }, [themeKey]);

  useImperativeHandle(ref, () => ({
    toggle: (name, value) => editor.current?.toggle(name, value),
    link: (url) => editor.current?.link(url),
    unlink: () => editor.current?.unlink(),
    mention: (mention) => editor.current?.mention(mention),
    replaceQuery: (text) => editor.current?.replaceQuery(text),
    focus: () => editor.current?.focus(),
  }));

  return <View ref={host} style={styles.host} />;
}

const styles = StyleSheet.create({
  host: { flex: 1, overflow: 'hidden' },
});
