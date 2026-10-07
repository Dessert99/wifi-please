import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import * as Clipboard from 'expo-clipboard';
import { openSystemWifiDialog } from '../services/connect-wifi';
import { shareWifiCredentials } from '../services/share-wifi';
import { useShareActions } from '../use-share-actions';
import type { WifiCredentials } from '../types';

// 실제 복사 서비스는 유지하고 클립보드 SDK와 나머지 시스템 동작만 대체한다.
vi.mock('expo-clipboard', () => ({ setStringAsync: vi.fn() }));
vi.mock('../services/connect-wifi', () => ({ openSystemWifiDialog: vi.fn() }));
vi.mock('../services/share-wifi', () => ({ shareWifiCredentials: vi.fn() }));

const wifi: WifiCredentials = { ssid: 'Cafe', password: ' abC;\\"12 ', security: 'WPA', hidden: false };
let actions: ReturnType<typeof useShareActions>;
let renderer: ReactTestRenderer;
// 공유 훅을 실제 React 수명 주기로 실행하고 최신 상태를 테스트에 노출한다.
function Harness() {
  const value = useShareActions(wifi);
  React.useLayoutEffect(() => { actions = value; });
  return null;
}

// 가상 타이머와 정상 응답을 준비해 공유 상태와 토스트 시간을 검증한다.
beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.mocked(Clipboard.setStringAsync).mockResolvedValue(true);
  vi.mocked(shareWifiCredentials).mockResolvedValue({ action: 'sharedAction' });
  await act(async () => { renderer = create(<Harness />); });
});
// 훅을 해제하고 가상 타이머·전역 설정을 복원한다.
afterEach(async () => {
  await act(async () => { renderer.unmount(); });
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('원문을 복사하고 다시 복사하면 토스트 표시 시간을 연장한다', async () => {
  await act(async () => { await actions.copy(); });
  expect(Clipboard.setStringAsync).toHaveBeenCalledWith(wifi.password);
  expect(actions.copied).toBe(true);
  await act(async () => { await vi.advanceTimersByTimeAsync(1500); await actions.copy(); });
  await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
  expect(actions.copied).toBe(true);
  await act(async () => { await vi.advanceTimersByTimeAsync(700); });
  expect(actions.copied).toBe(false);
});

it('공유 요청 중에는 공유나 재연결을 중복 실행하지 않는다', async () => {
  let finish!: (value: Awaited<ReturnType<typeof shareWifiCredentials>>) => void;
  vi.mocked(shareWifiCredentials).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => { void actions.share(); void actions.share(); void actions.connect(); });
  expect(shareWifiCredentials).toHaveBeenCalledTimes(1);
  expect(openSystemWifiDialog).not.toHaveBeenCalled();
  expect(actions.busy).toBe(true);
  await act(async () => { finish({ action: 'sharedAction' }); });
  expect(actions.busy).toBe(false);
});

it('공유 취소는 오류 안내를 띄우지 않는다', async () => {
  vi.mocked(shareWifiCredentials).mockRejectedValue(Object.assign(new Error('취소'), { name: 'AbortError' }));
  await act(async () => { await actions.share(); });
  expect(actions.dialog).toBeNull();
  expect(actions.busy).toBe(false);
});

it('공유 실패 안내에서 재시도할 수 있다', async () => {
  vi.mocked(shareWifiCredentials).mockRejectedValueOnce(new Error('공유 실패'));
  await act(async () => { await actions.share(); });
  const dialog = actions.dialog;
  expect(dialog?.title).toBe('공유 창을 열지 못했어요');
  if (!dialog) throw new Error('오류 안내가 표시되지 않았어요.');
  await act(async () => { await dialog.onPrimary(); });
  expect(shareWifiCredentials).toHaveBeenCalledTimes(2);
  expect(actions.dialog).toBeNull();
});

it.each(['false', 'exception'] as const)('복사가 %s로 실패하면 성공 표시 없이 안내하고 재시도한다', async (failure) => {
  if (failure === 'false') vi.mocked(Clipboard.setStringAsync).mockResolvedValueOnce(false);
  else vi.mocked(Clipboard.setStringAsync).mockRejectedValueOnce(new Error('클립보드 오류'));

  await act(async () => { await actions.copy(); });
  expect(actions.copied).toBe(false);
  const dialog = actions.dialog;
  expect(dialog?.title).toBe('복사하지 못했어요');
  if (!dialog) throw new Error('복사 오류 안내가 표시되지 않았어요.');

  await act(async () => { dialog.onPrimary(); });
  expect(Clipboard.setStringAsync).toHaveBeenLastCalledWith(wifi.password);
  expect(actions.copied).toBe(true);
  expect(actions.dialog).toBeNull();
});
