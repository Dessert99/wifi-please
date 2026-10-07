import { createContext, useContext, useState, type ReactNode } from 'react';
import type { WifiCredentials } from '@/features/wifi/types';

const SessionContext = createContext<{
  wifi: WifiCredentials | null;
  remember: (wifi: WifiCredentials) => void;
} | null>(null);

// 비밀번호는 저장소나 라우트 파라미터에 기록하지 않는다.
export function WifiSessionProvider({ children }: { children: ReactNode }) {
  const [wifi, remember] = useState<WifiCredentials | null>(null);
  return <SessionContext.Provider value={{ wifi, remember }}>{children}</SessionContext.Provider>;
}

export function useWifiSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('와이파이 세션이 필요해요.');
  return session;
}
