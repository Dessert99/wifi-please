import { useEffect, useRef, useState } from 'react';
import type { DialogState } from '@/components/ui/dialog';
import { copyWifiPassword } from './services/copy-wifi-password';
import { shareWifiCredentials } from '@/features/wifi/services/share-wifi';
import { openSystemWifiDialog } from '@/features/wifi/services/connect-wifi';
import type { WifiCredentials } from '@/features/wifi/types';

// 공유·복사·재연결의 실행 상태와 재시도 안내를 관리한다.
export function useShareActions(wifi: WifiCredentials | null) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 화면이 사라지면 남아 있는 복사 토스트 타이머를 해제한다.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // 공유와 재연결이 동시에 시스템 창을 열지 않도록 같은 잠금을 사용한다.
  async function share() {
    if (!wifi || lock.current) return;
    lock.current = true; setBusy(true); setDialog(null);
    try { await shareWifiCredentials(wifi); }
    catch (error) {
      // 사용자가 공유 창을 취소한 경우에는 오류 안내를 띄우지 않는다.
      if (error instanceof Error && error.name === 'AbortError') return;
      setDialog({ title: '공유 창을 열지 못했어요', message: '잠시 후 다시 시도해 주세요.', primary: '다시 시도', onPrimary: share, secondary: '닫기' });
    } finally { lock.current = false; setBusy(false); }
  }
  // 원문 복사에 성공하면 토스트를 표시하고, 실패하면 재시도를 안내한다.
  async function copy() {
    if (!wifi) return;
    try {
      await copyWifiPassword(wifi.password);
      // 다시 복사하면 이전 타이머를 취소해 마지막 복사부터 2.2초간 표시한다.
      if (timer.current) clearTimeout(timer.current);
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      setDialog({ title: '복사하지 못했어요', message: '잠시 후 다시 시도해 주세요.', primary: '다시 시도', onPrimary: () => { setDialog(null); void copy(); }, secondary: '닫기' });
    }
  }
  // 시스템 연결 창을 다시 열고, 호출 실패 시 재시도 안내를 표시한다.
  async function connect() {
    if (!wifi || lock.current) return;
    lock.current = true; setBusy(true); setDialog(null);
    try { await openSystemWifiDialog(wifi); }
    catch {
      setDialog({ title: '연결 창을 열지 못했어요', message: '다시 시도하거나 와이파이 설정에서 직접 연결해 주세요.', primary: '다시 시도', onPrimary: connect, secondary: '정보 보기' });
    } finally { lock.current = false; setBusy(false); }
  }
  return {
    share, copy, connect, busy, dialog, copied,
    closeDialog: () => setDialog(null),
  };
}
