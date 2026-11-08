import { useEffect, useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Positioned } from './Layer';
import type { Rect, Side } from './position';
import type { TooltipProps } from './types';

/**
 * Web / 桌面的悬停提示：全页只有一个提示层（TooltipHost，挂在根布局里），
 * 各处的 Tooltip 只往这里报「在哪、显示什么」，自己不渲染任何浮层
 */

interface Tip {
  label: string;
  anchor: Rect;
  side: Side;
}

/** 悬停多久后出现；刚关掉一个提示后很快移到下一个，立即出现 */
const SHOW_DELAY = 500;
const WARM_WINDOW = 300;

let current: Tip | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let hiddenAt = 0;
const listeners = new Set<() => void>();

function emit(tip: Tip | null) {
  current = tip;
  for (const listener of listeners) listener();
}

function show(tip: Tip) {
  clearTimeout(timer);
  const warm = current !== null || Date.now() - hiddenAt < WARM_WINDOW;
  timer = setTimeout(() => emit(tip), warm ? 0 : SHOW_DELAY);
}

function hide() {
  clearTimeout(timer);
  if (!current) return;
  hiddenAt = Date.now();
  emit(null);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** 不产生盒子的包装，只用来接鼠标事件；位置取第一个子元素的 */
const CONTENTS = { display: 'contents' } as const;

export function Tooltip({ label, side = 'bottom', children }: TooltipProps) {
  return (
    <div
      style={CONTENTS}
      onPointerEnter={(event) => {
        // 只响应鼠标，触屏点按不弹提示
        if (event.pointerType !== 'mouse') return;
        const target = event.currentTarget.firstElementChild;
        if (!target) return;
        const { left, top, width, height } = target.getBoundingClientRect();
        show({ label, side, anchor: { x: left, y: top, width, height } });
      }}
      onPointerLeave={hide}
      onPointerDown={hide}
    >
      {children}
    </div>
  );
}

/** 全页唯一的提示层，放在根布局最后。没有提示时不渲染、不挂监听 */
export function TooltipHost() {
  const tip = useSyncExternalStore(subscribe, () => current);
  useEffect(() => {
    if (!tip) return;
    // 滚动、按键、窗口失焦时提示的位置或意义已经不对，直接收起
    const options = { capture: true, passive: true };
    window.addEventListener('scroll', hide, options);
    window.addEventListener('wheel', hide, options);
    window.addEventListener('keydown', hide, options);
    window.addEventListener('blur', hide);
    return () => {
      window.removeEventListener('scroll', hide, options);
      window.removeEventListener('wheel', hide, options);
      window.removeEventListener('keydown', hide, options);
      window.removeEventListener('blur', hide);
    };
  }, [tip]);
  if (!tip) return null;
  const { label, anchor, side } = tip;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Positioned key={`${label}|${anchor.x}|${anchor.y}`} anchor={anchor} side={side} align="center" style={styles.tip}>
        <Text style={styles.label}>{label}</Text>
      </Positioned>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  tip: {
    maxWidth: theme.size.tooltipMaxWidth,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.bubbleTight,
    backgroundColor: theme.colors.text,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.surface,
  },
}));
