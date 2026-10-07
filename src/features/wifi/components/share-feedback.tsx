import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dialog, type DialogState } from '@/components/ui/dialog';
import { Toast } from '@/components/ui/toast';

type ShareFeedbackProps = {
  dialog: DialogState | null;
  copied: boolean;
  onClose: () => void;
};

// 공유 오류 안내와 복사 토스트를 표시하고 안전 영역을 반영해 위치를 정한다.
export function ShareFeedback({ dialog, copied, onClose }: ShareFeedbackProps) {
  const insets = useSafeAreaInsets();
  return (
    <>
      <Dialog value={dialog} onClose={onClose} />
      {copied && <Toast message="비밀번호를 복사했어요" bottom={insets.bottom + 144} />}
    </>
  );
}
