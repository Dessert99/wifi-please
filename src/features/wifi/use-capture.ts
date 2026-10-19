import type { BarcodeScanningResult } from 'expo-camera';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DialogState } from '@/components/ui/dialog';
import { parseWifiQr } from '@/features/wifi/lib/wifi-qr';
import { ScanError, scanWifiPhoto, type Photo } from '@/features/wifi/services/scan-photo';
import { correctWithNearbyNetwork, openSystemWifiDialog, openWifiSettings } from '@/features/wifi/services/connect-wifi';
import { deleteCachedPhoto } from '@/features/wifi/services/photo-cache';
import { hasPhotoConsent, savePhotoConsent } from '@/features/wifi/services/photo-consent';
import { scanBlockNotice } from './lib/scan-error';
import privacy from '../../../shared/privacy.json';
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
  const photoConsent = useRef(false);
  const pendingPhoto = useRef<string | undefined>(undefined);
  const { wifi, remember } = useWifiSession();
  // 화면 복귀나 작업 종료 직후 같은 QR이 다시 실행되지 않도록 1.5초간 기다린다.
  const postponeQr = useCallback(() => { cooldown.current = Date.now() + 1500; }, []);
  const { permission, cameraRef, ready, setReady, cameraActive, requestAccess } = useCameraLifecycle(postponeQr);

  // 비동기 결과가 도착했을 때 화면이 아직 존재하는지 확인할 수 있게 한다.
  useEffect(() => {
    mounted.current = true;
    // 이전 실행에서 받은 동의를 불러와 설치당 한 번만 묻는다.
    void hasPhotoConsent().then(saved => { if (saved) photoConsent.current = true; });
    return () => { mounted.current = false; deleteCachedPhoto(pendingPhoto.current); };
  }, []);

  // 안내를 닫을 때 QR 재인식도 잠시 미룬다.
  function closeDialog() { discardPhoto(); setDialog(null); postponeQr(); }
  // 재시도가 끝난 작업 사본을 지우고 다음 사진과 섞이지 않도록 참조를 비운다.
  function discardPhoto() { deleteCachedPhoto(pendingPhoto.current); pendingPhoto.current = undefined; }
  // 사진 촬영·선택 전에 전송 목적과 수신자를 알리고 명시적인 동의를 받는다.
  function withPhotoConsent(action: () => Promise<void>) {
    if (locked.current) return;
    if (photoConsent.current) { void run(action); return; }
    setDialog({ title: '사진을 AI로 읽을까요?', message: privacy.disclosure, primary: '동의하고 계속', onPrimary: () => { photoConsent.current = true; void savePhotoConsent(); void run(action); }, secondary: '취소', onSecondary: closeDialog });
  }
  // 이미 연결된 와이파이는 비밀번호를 읽을 수 없으므로 Android 기본 QR 공유 방법을 안내하고 설정을 연다.
  function guideCurrentWifiShare() {
    if (locked.current) return;
    setDialog({
      title: '지금 연결된 와이파이 공유',
      message: '친구가 처음 왔다면 Android 기본 기능으로 QR을 보여주세요.\n\n1. 와이파이 설정에서 연결된 와이파이의 톱니바퀴를 눌러요.\n2. "QR 코드" 또는 "공유"를 눌러요. 화면 잠금 확인이 나올 수 있어요.\n3. 친구가 카메라로 QR을 찍으면 바로 연결돼요.',
      primary: '와이파이 설정 열기',
      onPrimary: () => {
        closeDialog();
        openWifiSettings().catch(() => setDialog({ title: '설정을 열지 못했어요', message: '설정 앱의 와이파이 메뉴에서 직접 열어 주세요.', primary: '닫기', onPrimary: closeDialog }));
      },
      secondary: '닫기',
    });
  }
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
    if (pendingPhoto.current !== photo.uri) { discardPhoto(); pendingPhoto.current = photo.uri; }
    setStage('photo');
    try {
      const result = await scanWifiPhoto(photo);
      if (!mounted.current) { discardPhoto(); return; }
      // 찾지 못한 비밀번호(null)와 비밀번호 없는 네트워크(빈 문자열)를 구별한다.
      if (!result.ssid || result.password === null) throw new ScanError('unreadable');
      discardPhoto();
      // 안내문 표기와 실제 이름이 다르면 저장만 되고 연결되지 않으므로 주변 네트워크 이름으로 고친다.
      const recognized = { ssid: result.ssid, password: result.password, security: result.password ? 'WPA' : 'nopass', hidden: false };
      await connect(await correctWithNearbyNetwork(recognized));
    } catch (error) {
      if (!mounted.current) { discardPhoto(); return; }
      const blocked = error instanceof ScanError ? scanBlockNotice(error) : null;
      // 통신 실패는 같은 사진으로 재시도하고, 제한·인식 실패는 촬영 화면이나 사진 선택으로 복구한다.
      if (error instanceof ScanError && error.reason === 'network') {
        setDialog({ title: '인터넷 연결이 필요해요', message: '사진 인식을 위해 인터넷을 확인해 주세요.\nQR은 인터넷 없이도 읽을 수 있어요.', primary: '다시 시도', onPrimary: () => { void run(() => scanPhoto(photo)); }, secondary: '촬영으로 돌아가기' });
      } else if (blocked) {
        discardPhoto();
        setDialog({ ...blocked, primary: 'QR 인식으로 돌아가기', onPrimary: closeDialog });
      } else if (error instanceof ScanError && error.reason === 'unreadable') {
        discardPhoto();
        setDialog({ title: '안내문을 읽지 못했어요', message: '와이파이 이름이나 비밀번호가\n선명하게 보이도록 다시 찍어주세요.', primary: '다시 촬영', onPrimary: closeDialog, secondary: '사진 선택', onSecondary: pickPhoto });
      } else {
        setDialog({ title: '사진을 읽지 못했어요', message: '잠시 후 다시 시도하거나\n다른 사진을 선택해 주세요.', primary: '다시 시도', onPrimary: () => { void run(() => scanPhoto(photo)); }, secondary: '촬영으로 돌아가기' });
      }
    }
  }
  // 사진 선택 취소는 건너뛰고 선택된 사진만 인식한다.
  function pickPhoto() {
    withPhotoConsent(async () => {
      discardPhoto();
      try {
        const result = await launchImageLibraryAsync({ mediaTypes: ['images'] });
        if (!result.canceled) {
          if (mounted.current) await scanPhoto(result.assets[0]);
          else deleteCachedPhoto(result.assets[0].uri);
        }
      } catch {
        setDialog({ title: '사진을 열지 못했어요', message: '사진 접근 권한을 확인하고 다시 선택해 주세요.', primary: '사진 선택', onPrimary: pickPhoto, secondary: '닫기' });
      }
    });
  }
  // 카메라가 준비된 경우에만 촬영하고 사진 인식을 이어서 실행한다.
  function takePhoto() {
    if (!ready || !cameraRef.current) return;
    withPhotoConsent(async () => {
      discardPhoto();
      try {
        const photo = await cameraRef.current!.takePictureAsync({ quality: .8 });
        if (mounted.current) await scanPhoto(photo);
        else deleteCachedPhoto(photo.uri);
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
      setDialog({ title: '설정을 열지 못했어요', message: '기기 설정에서 WiFi Please의 카메라 권한을 허용해 주세요.', primary: '닫기', onPrimary: closeDialog });
    }
  }
  return { permission, cameraRef, ready, setReady, cameraError, cameraActive, busy, stage, dialog, closeDialog, pickPhoto, takePhoto, onBarcodeScanned, allowCamera, wifi, showInfo, guideCurrentWifiShare };
}
