import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';

// 카메라 권한과 화면·앱 활성 상태를 묶어 카메라 사용 가능 여부를 관리한다.
export function useCameraLifecycle(onResume: () => void) {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');

  // 화면 진입 시 재인식 대기를 시작하고, 화면을 벗어나면 촬영 준비 상태를 초기화한다.
  useFocusEffect(useCallback(() => {
    setFocused(true);
    onResume();
    return () => {
      setFocused(false);
      setReady(false);
    };
  }, [onResume]));

  // 앱 복귀 시 설정에서 바뀐 권한을 다시 읽고, 비활성화 시 촬영 준비 상태를 해제한다.
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      setActive(state === 'active');
      if (state === 'active') {
        onResume();
        void getPermission();
      } else {
        setReady(false);
      }
    });
    // 훅이 해제되거나 구독이 바뀔 때 기존 앱 상태 구독을 정리한다.
    return () => listener.remove();
  }, [getPermission, onResume]);

  // 권한을 다시 물을 수 있으면 요청하고, 불가능하면 기기 설정을 연다.
  async function requestAccess() {
    if (permission?.canAskAgain) await requestPermission();
    else await Linking.openSettings();
  }

  return { permission, cameraRef, ready, setReady, cameraActive: focused && active, requestAccess };
}
