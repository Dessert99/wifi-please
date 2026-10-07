import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dialog, Icon, type DialogState } from '@/components/ui';
import { shareWifiCredentials } from '@/features/wifi/services/share-wifi';
import { openSystemWifiDialog } from '@/features/wifi/services/connect-wifi';
import type { WifiCredentials } from '@/features/wifi/types';

export function useShareActions(wifi: WifiCredentials | null) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function share() {
    if (!wifi || lock.current) return;
    lock.current = true; setBusy(true); setDialog(null);
    try { await shareWifiCredentials(wifi); }
    catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setDialog({ title: '공유 창을 열지 못했어요', message: '잠시 후 다시 시도해 주세요.', primary: '다시 시도', onPrimary: share, secondary: '닫기' });
    } finally { lock.current = false; setBusy(false); }
  }
  async function copy() {
    if (!wifi) return;
    try {
      if (!await Clipboard.setStringAsync(wifi.password)) throw new Error('복사 실패');
      if (timer.current) clearTimeout(timer.current);
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      setDialog({ title: '복사하지 못했어요', message: '잠시 후 다시 시도해 주세요.', primary: '다시 시도', onPrimary: () => { setDialog(null); void copy(); }, secondary: '닫기' });
    }
  }
  async function connect() {
    if (!wifi || lock.current) return;
    lock.current = true; setBusy(true); setDialog(null);
    try { await openSystemWifiDialog(wifi); }
    catch {
      setDialog({ title: '연결 창을 열지 못했어요', message: '다시 시도하거나 와이파이 설정에서 직접 연결해 주세요.', primary: '다시 시도', onPrimary: connect, secondary: '정보 보기' });
    } finally { lock.current = false; setBusy(false); }
  }
  return {
    share, copy, connect, busy,
    feedback: <>
      <Dialog value={dialog} onClose={() => setDialog(null)} />
      {copied && <View pointerEvents="none" accessibilityLiveRegion="polite" style={[styles.toast, { bottom: insets.bottom + 144 }]}>
        <Icon name="check" size={18} color="white" /><Text style={styles.toastText}>비밀번호를 복사했어요</Text>
      </View>}
    </>,
  };
}
const styles = StyleSheet.create({
  toast: { position: 'absolute', alignSelf: 'center', backgroundColor: '#24272D', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  toastText: { color: 'white', fontSize: 13, fontWeight: '600' },
});
