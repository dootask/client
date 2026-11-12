import { Linking } from 'react-native';

/** 用系统地图打开位置（安卓 geo: 链接，系统选地图应用） */
export function openLocation({ title, lng, lat }: { title: string; lng: number; lat: number }) {
  return Linking.openURL(`geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(title)})`);
}
