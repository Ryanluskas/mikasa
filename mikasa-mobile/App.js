import { StatusBar } from 'expo-status-bar';
import { StyleSheet, SafeAreaView, Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function App() {
  // Endereço do Next.js local na rede (Substitua se seu IP mudar)
  const siteUrl = 'http://192.168.1.10:3000';

  return (
    <SafeAreaView style={styles.container}>
      {/* View extra para evitar problema de SafeArea no Android */}
      <View style={styles.content}>
        <WebView 
          source={{ uri: siteUrl }} 
          style={styles.webview} 
          bounces={false}
          showsVerticalScrollIndicator={false}
        />
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    marginTop: Platform.OS === 'android' ? 24 : 0, // Compensa a status bar no Android se não estiver translúcida
  },
  webview: {
    flex: 1,
  }
});
