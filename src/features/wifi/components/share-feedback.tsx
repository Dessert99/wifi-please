import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dialog, type DialogState } from '@/components/ui/dialog';
import { Toast } from '@/components/ui/toast';

type ShareFeedbackProps = {
  dialog: DialogState | null;
  copied: boolean;
  onClose: () => void;
};

export function ShareFeedback({ dialog, copied, onClose }: ShareFeedbackProps) {
  const insets = useSafeAreaInsets();
  return (
    <>
      <Dialog value={dialog} onClose={onClose} />
      {copied && <Toast message="비밀번호를 복사했어요" bottom={insets.bottom + 144} />}
    </>
  );
}
