/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';
import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * 版本号跟服务端同号（见 docs/reuse-inventory.md 第 4 节）：version.json 的内容照抄主仓库
 * package.json 的 version 和 codeVerson（主仓库的字段名就是这样拼的），发版时同步
 */
function readVersion(): { version: string; code: number } {
  const json = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'version.json'), 'utf8'));
  const code = Number(json.codeVerson);
  if (typeof json.version !== 'string' || !Number.isInteger(code) || code <= 0) {
    throw new Error('version.json 格式不对：需要 version（字符串）和 codeVerson（正整数）');
  }
  return { version: json.version, code };
}

const { version, code } = readVersion();

/**
 * 构建变体：APP_VARIANT=development 出 DooTask (dev)，独立包名，可与正式版同时安装，
 * 用 dev client 连 Metro 开发。默认是正式版
 */
const isDevVariant = process.env.APP_VARIANT === 'development';
const appId = isDevVariant ? 'com.dootask.task.dev' : 'com.dootask.task';

/**
 * iOS 权限说明：每种语言一个 ios-locales/<lang>.json（生成 <lang>.lproj/InfoPlist.strings），
 * Info.plist 默认值取简体中文。.strings 不展开 $(PRODUCT_NAME)，文案里直接写 DooTask。
 * 语言与 CFBundleLocalizations 一致
 */
const IOS_LOCALES = ['zh-Hans', 'zh-Hant', 'zh-HK', 'en', 'ja', 'ko', 'de', 'fr', 'id', 'ru'] as const;
const usage: Record<string, string> = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'ios-locales/zh-Hans.json'), 'utf8')).ios;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: isDevVariant ? 'DooTask (dev)' : 'DooTask',
  slug: isDevVariant ? 'dootask-dev' : 'dootask',
  scheme: isDevVariant ? 'dootask-dev' : 'dootask',
  platforms: ['ios', 'android', 'web'],
  version,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: appId,
    // 上架时按 App Store Connect 已有的最大构建号 +1，通过 IOS_BUILD_NUMBER 传入
    buildNumber: process.env.IOS_BUILD_NUMBER || String(code),
    appleTeamId: 'G365J5PZA2',
    supportsTablet: true,
    infoPlist: {
      // 声明支持的语言，系统菜单（复制、翻译等）才跟随手机语言
      CFBundleLocalizations: [...IOS_LOCALES],
      ...usage,
    },
  },
  locales: Object.fromEntries(IOS_LOCALES.map((lang) => [lang, `./ios-locales/${lang}.json`])),
  android: {
    package: appId,
    versionCode: code,
    adaptiveIcon: {
      backgroundColor: '#8BCF70',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    // DooPush SDK 清单声明 false，默认 true 会导致 Release 清单合并失败
    allowBackup: false,
    permissions: [
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.VIBRATE',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
    ],
  },
  web: {
    // 单页应用：服务器把子路径下的所有地址都回落到 index.html
    output: 'single',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-status-bar',
    'expo-sqlite',
    'expo-image',
    'expo-sharing',
    [
      'expo-media-library',
      {
        photosPermission: usage.NSPhotoLibraryUsageDescription,
        savePhotosPermission: usage.NSPhotoLibraryAddUsageDescription,
        granularPermissions: ['photo', 'video'],
      },
    ],
    ['expo-video', { supportsPictureInPicture: true }],
    [
      'expo-image-picker',
      {
        photosPermission: usage.NSPhotoLibraryUsageDescription,
        cameraPermission: usage.NSCameraUsageDescription,
        microphonePermission: usage.NSMicrophoneUsageDescription,
      },
    ],
    // 语音消息只在前台播放，不需要后台播放服务
    ['expo-audio', { microphonePermission: usage.NSMicrophoneUsageDescription, enableBackgroundPlayback: false }],
    // 远程推送由 DooPush 负责，expo-notifications 只用本地权限、角标和点击响应
    ['expo-notifications', { enableRemoteNotifications: false, enableBackgroundRemoteNotifications: false }],
    // dev 变体用开发证书签名，推送环境须为 development；安卓厂商通道参数在 N9 接入
    ['doopush-react-native-sdk', { ios: { mode: isDevVariant ? 'development' : 'production' } }],
  ],
  experiments: {
    // Web 部署在服务端的 /next 子路径下，与旧前端并存
    baseUrl: '/next',
    typedRoutes: true,
  },
});
