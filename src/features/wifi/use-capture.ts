import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import type { DialogState } from '@/components/ui';
import { parseWifiQr } from '@/features/wifi/lib/wifi-qr';
import { ScanError, scanWifiPhoto, type Photo } from '@/features/wifi/services/scan-photo';
import { openSystemWifiDialog } from '@/features/wifi/services/connect-wifi';
import type { WifiCredentials } from '@/features/wifi/types';
import { useWifiSession } from './session';

export function useCapture() {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<'idle' | 'photo' | 'connecting'>('idle');
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const locked = useRef(false);
  const mounted = useRef(true);
  const cooldown = useRef(0);
  const { wifi, remember } = useWifiSession();

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    cooldown.current = Date.now() + 1500;
    return () => { setFocused(false); setReady(false); };
  }, []));
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      setActive(state === 'active');
      if (state === 'active') {
        cooldown.current = Date.now() + 1500;
        void getPermission();
      } else setReady(false);
    });
    return () => listener.remove();
  }, [getPermission]);

  function closeDialog() { setDialog(null); cooldown.current = Date.now() + 1500; }
  function showInfo() { closeDialog(); router.push('/share'); }
  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setDialog(null);
    try { await action(); }
    finally {
      locked.current = false;
      if (mounted.current) { setBusy(false); setStage('idle'); cooldown.current = Date.now() + 1500; }
    }
  }
  async function connect(result: WifiCredentials) {
    remember(result);
    setStage('connecting');
    try {
      // 앱 확인 화면을 거치지 않고 시스템 연결 창부터 연다.
      await openSystemWifiDialog(result);
      if (mounted.current) router.push('/share');
    } catch {
      if (mounted.current) setDialog({ title: '연결 창을 열지 못했어요', message: '다시 시도하거나 정보를 보고\n와이파이 설정에서 직접 연결해 주세요.', primary: '다시 시도', onPrimary: () => { void run(() => connect(result)); }, secondary: '정보 보기', onSecondary: showInfo });
    }
  }
  async function scanPhoto(photo: Photo) {
    setStage('photo');
    try {
      const result = await scanWifiPhoto(photo);
      if (!mounted.current) return;
      if (!result.ssid || result.password === null) throw new ScanError('unreadable');
      await connect({ ssid: result.ssid, password: result.password, security: result.password ? 'WPA' : 'nopass', hidden: false });
    } catch (error) {
      if (!mounted.current) return;
      if (error instanceof ScanError && error.reason === 'network') {
        setDialog({ title: '인터넷 연결이 필요해요', message: '사진 인식을 위해 인터넷을 확인해 주세요.\nQR은 인터넷 없이도 읽을 수 있어요.', primary: '다시 시도', onPrimary: () => { void run(() => scanPhoto(photo)); }, secondary: '촬영으로 돌아가기' });
      } else if (error instanceof ScanError && error.reason === 'rate_limited') {
        setDialog({ title: '잠시 후 다시 시도해 주세요', message: '짧은 시간에 사진을 많이 읽었어요.\nQR 인식은 계속 사용할 수 있어요.', primary: '촬영으로 돌아가기', onPrimary: closeDialog });
      } else if (error instanceof ScanError && error.reason === 'unreadable') {
        setDialog({ title: '안내문을 읽지 못했어요', message: '와이파이 이름이나 비밀번호가\n선명하게 보이도록 다시 찍어주세요.', primary: '다시 촬영', onPrimary: closeDialog, secondary: '사진 선택', onSecondary: pickPhoto });
      } else {
        setDialog({ title: '사진을 읽지 못했어요', message: '잠시 후 다시 시도하거나\n다른 사진을 선택해 주세요.', primary: '다시 시도', onPrimary: () => { void run(() => scanPhoto(photo)); }, secondary: '촬영으로 돌아가기' });
      }
    }
  }
  function pickPhoto() {
    void run(async () => {
      try {
        const result = await launchImageLibraryAsync({ mediaTypes: ['images'] });
        if (!result.canceled && mounted.current) await scanPhoto(result.assets[0]);
      } catch {
        setDialog({ title: '사진을 열지 못했어요', message: '사진 접근 권한을 확인하고 다시 선택해 주세요.', primary: '사진 선택', onPrimary: pickPhoto, secondary: '닫기' });
      }
    });
  }
  function takePhoto() {
    if (!ready || !cameraRef.current) return;
    void run(async () => {
      try {
        const photo = await cameraRef.current!.takePictureAsync({ quality: .8 });
        if (mounted.current) await scanPhoto(photo);
      } catch {
        setDialog({ title: '촬영하지 못했어요', message: '카메라가 준비되면 다시 시도해 주세요.', primary: '닫기', onPrimary: closeDialog });
      }
    });
  }
  function onBarcodeScanned({ data }: BarcodeScanningResult) {
    if (!focused || !active || locked.current || dialog || Date.now() < cooldown.current) return;
    const result = parseWifiQr(data);
    if (!result) return;
    void run(() => connect(result));
  }
  function cameraError() {
    setReady(false);
    setDialog({ title: '카메라를 열지 못했어요', message: '앱을 다시 열거나 저장된 사진을 선택해 주세요.', primary: '사진 선택', onPrimary: pickPhoto, secondary: '닫기' });
  }
  async function allowCamera() {
    try {
      if (permission?.canAskAgain) await requestPermission();
      else await Linking.openSettings();
    } catch {
      setDialog({ title: '설정을 열지 못했어요', message: '기기 설정에서 Snapfi의 카메라 권한을 허용해 주세요.', primary: '닫기', onPrimary: closeDialog });
    }
  }
  return { permission, cameraRef, ready, setReady, cameraError, cameraActive: focused && active, busy, stage, dialog, closeDialog, pickPhoto, takePhoto, onBarcodeScanned, allowCamera, wifi, showInfo };
}
