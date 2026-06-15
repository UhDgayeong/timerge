import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.clokoo.app',
  appName: 'Clokoo',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
