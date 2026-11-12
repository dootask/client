import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useSyncExternalStore } from 'react';

/**
 * 语音消息播放：全局只播一条，点正在播的那条即停止；播完由 next 决定接着播哪条，没有就停止
 */

let player: AudioPlayer | null = null;
let playing: { url: string; progress: number } | null = null;
const listeners = new Set<() => void>();

function update(next: typeof playing) {
  playing = next;
  listeners.forEach((listener) => listener());
}

export function stopVoice() {
  // remove 释放是异步的，先暂停让声音立即停下
  player?.pause();
  player?.remove();
  player = null;
  if (playing) update(null);
}

export function toggleVoice(url: string, next?: () => string | undefined) {
  const same = playing?.url === url;
  stopVoice();
  if (same) return;
  // iOS 静音键打开时也要能听到
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  const current = createAudioPlayer(url, { updateInterval: 100 });
  current.addListener('playbackStatusUpdate', (status) => {
    if (player !== current) return;
    if (status.didJustFinish) {
      stopVoice();
      const upcoming = next?.();
      if (upcoming) toggleVoice(upcoming, next);
    }
    else if (status.duration > 0) update({ url, progress: Math.min(1, status.currentTime / status.duration) });
  });
  player = current;
  update({ url, progress: 0 });
  current.play();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** 这条语音的播放进度（0–1）；没在播放时为 null。只有正在播的那条随进度重新渲染 */
export function useVoiceProgress(url: string): number | null {
  return useSyncExternalStore(subscribe, () => (playing?.url === url ? playing.progress : null));
}
