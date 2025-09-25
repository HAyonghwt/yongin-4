import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.netlify.easyscore',
  appName: '파크골프스코어',
  webDir: 'out',
  server: {
    url: 'https://your-new-domain.com', // 여기에 새로운 웹앱 주소를 입력하세요
    cleartext: true
  }
};

export default config;
