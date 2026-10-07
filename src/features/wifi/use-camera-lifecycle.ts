import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';

export function useCameraLifecycle(onResume: () => void) {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');

  useFocusEffect(useCallback(() => {
    setFocused(true);
    onResume();
    return () => {
      setFocused(false);
      setReady(false);
    };
  }, [onResume]));

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
    return () => listener.remove();
  }, [getPermission, onResume]);

  async function requestAccess() {
    if (permission?.canAskAgain) await requestPermission();
    else await Linking.openSettings();
  }

  return { permission, cameraRef, ready, setReady, cameraActive: focused && active, requestAccess };
}
