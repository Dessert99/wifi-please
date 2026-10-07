import type { BarcodeScanningResult } from 'expo-camera';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DialogState } from '@/components/ui/dialog';
import { parseWifiQr } from '@/features/wifi/lib/wifi-qr';
import { ScanError, scanWifiPhoto, type Photo } from '@/features/wifi/services/scan-photo';
import { openSystemWifiDialog } from '@/features/wifi/services/connect-wifi';
import type { WifiCredentials } from '@/features/wifi/types';
import { useWifiSession } from './session';
import { useCameraLifecycle } from './use-camera-lifecycle';

// 사진·QR 인식부터 시스템 연결 창까지 하나의 작업 흐름으로 조율한다.
export function useCapture() {
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<'idle' | 'photo' | 'connecting'>('idle');
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const locked = useRef(false);
  const mounted = useRef(true);
  const cooldown = useRef(0);
  const { wifi, remember } = useWifiSession();
  // 화면 복귀나 작업 종료 직후 같은 QR이 다시 실행되지 않도록 1.5초간 기다린다.
  const postponeQr = useCallback(() => { cooldown.current = Date.now() + 1500; }, []);
  const { permission, cameraRef, ready, setReady, cameraActive, requestAccess } = useCameraLifecycle(postponeQr);

  // 비동기 결과가 도착했을 때 화면이 아직 존재하는지 확인할 수 있게 한다.
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // 안내를 닫을 때 QR 재인식도 잠시 미룬다.
  function closeDialog() { setDialog(null); postponeQr(); }
  // 메모리에 보관한 최근 와이파이 정보를 공유 화면에서 보여준다.
  function showInfo() { closeDialog(); router.push('/share'); }
  // 상태 갱신 전 연속 입력까지 막도록 ref로 잠그고, 작업 종료 시 잠금을 해제한다.
  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setDialog(null);
    try { await action(); }
    finally {
      locked.current = false;
      if (mounted.current) { setBusy(false); setStage('idle'); postponeQr(); }
    }
  }
  // 연결 창이 실패해도 정보를 볼 수 있도록 먼저 보관하고, 창이 닫히면 공유 화면으로 이동한다.
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
  // 사진 인식 결과를 연결 정보로 바꾸고 오류 원인에 맞는 복구 동작을 제공한다.
  async function scanPhoto(photo: Photo) {
    setStage('photo');
    try {
      const result = await scanWifiPhoto(photo);
      if (!mounted.current) return;
      // 찾지 못한 비밀번호(null)와 비밀번호 없는 네트워크(빈 문자열)를 구별한다.
      if (!result.ssid || result.password === null) throw new ScanError('unreadable');
      await connect({ ssid: result.ssid, password: result.password, security: result.password ? 'WPA' : 'nopass', hidden: false });
    } catch (error) {
      if (!mounted.current) return;
      // 통신 실패는 같은 사진으로 재시도하고, 제한·인식 실패는 촬영 화면이나 사진 선택으로 복구한다.
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
  // 사진 선택 취소는 건너뛰고 선택된 사진만 인식한다.
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
  // 카메라가 준비된 경우에만 촬영하고 사진 인식을 이어서 실행한다.
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
  // 비활성 상태·작업 중·안내 표시·재인식 대기 중에는 QR 입력을 무시한다.
  function onBarcodeScanned({ data }: BarcodeScanningResult) {
    if (!cameraActive || locked.current || dialog || Date.now() < cooldown.current) return;
    const result = parseWifiQr(data);
    if (!result) return;
    void run(() => connect(result));
  }
  // 카메라를 사용할 수 없으면 촬영을 막고 저장된 사진 선택을 안내한다.
  function cameraError() {
    setReady(false);
    setDialog({ title: '카메라를 열지 못했어요', message: '앱을 다시 열거나 저장된 사진을 선택해 주세요.', primary: '사진 선택', onPrimary: pickPhoto, secondary: '닫기' });
  }
  // 권한 요청이나 설정 열기 실패를 사용자 안내로 바꾼다.
  async function allowCamera() {
    try {
      await requestAccess();
    } catch {
      setDialog({ title: '설정을 열지 못했어요', message: '기기 설정에서 Snapfi의 카메라 권한을 허용해 주세요.', primary: '닫기', onPrimary: closeDialog });
    }
  }
  return { permission, cameraRef, ready, setReady, cameraError, cameraActive, busy, stage, dialog, closeDialog, pickPhoto, takePhoto, onBarcodeScanned, allowCamera, wifi, showInfo };
}
