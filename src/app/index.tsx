import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';

// 工程骨架的占位首页，W11 换成登录与主框架
export default function Index() {
  return (
    <View style={styles.root}>
      <Text>DooTask {Constants.expoConfig?.version}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
