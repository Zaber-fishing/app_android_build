import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dreamstream.zaber',
  appName: 'ZÁBER',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  // Nastavenie farby pozadia pre WebView (zabraňuje bielemu prebliknutiu pri štarte)
  backgroundColor: '#112a23',
  plugins: {
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'DARK',
      overlaysWebView: true,
    }
  }
};

export default config;