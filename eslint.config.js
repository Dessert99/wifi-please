// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'server/*'],
  },
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['expo-router', 'expo-router/**'],
            message: '공통 UI는 이동 정책을 결정하지 않습니다. 화면에서 콜백을 전달하세요.',
          },
          {
            group: ['@/features/**', '**/features/**'],
            message: '기능에 의존하는 UI는 해당 features 폴더에 두세요.',
          },
        ],
      }],
    },
  },
  {
    files: ['src/features/wifi/use-share-actions.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['expo-*', 'react-native', 'react-native/**', '**/modules/**'],
          message: '공유 훅은 상태와 동작을 조율합니다. 기기 API 호출은 services를 사용하세요.',
        }],
      }],
    },
  },
]);
