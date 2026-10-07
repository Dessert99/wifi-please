// 인식·연결·QR·공유에서 함께 사용하는 와이파이 정보 계약을 정의한다.
export type WifiCredentials = {
  ssid: string;
  password: string;
  security: string;
  hidden: boolean;
};
