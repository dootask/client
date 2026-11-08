module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // unistyles 3 编译期处理 StyleSheet.create 和组件依赖；只处理自己的源码
      ['react-native-unistyles/plugin', { root: 'src' }],
      // reanimated 4 的 worklets 插件必须放最后
      'react-native-worklets/plugin',
    ],
  };
};
