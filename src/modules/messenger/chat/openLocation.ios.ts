import { Linking } from 'react-native';

/** 用系统地图打开位置（Apple 地图） */
export function openLocation({ title, lng, lat }: { title: string; lng: number; lat: number }) {
  return Linking.openURL(`http://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(title)}`);
}
