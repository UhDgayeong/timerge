import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.timerge.app',
  appName: 'Timerge',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    CapacitorUpdater: {
      autoUpdate: true,
      // 앱이 완전히 종료된 후 재실행될 때는 다음 재시작까지 기다리지 않고 즉시 새 번들 적용
      directUpdate: 'onLaunch',
      updateUrl: 'https://timerge.vercel.app/api/updates',
    },
  },
};

export default config;
