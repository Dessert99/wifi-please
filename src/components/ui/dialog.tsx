import { Modal, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '@/constants/theme';
import { Button } from './button';
import { Icon } from './icon';

export type DialogState = {
  title: string; message: string; primary: string; onPrimary: () => void;
  secondary?: string; onSecondary?: () => void;
};
// 전달받은 안내와 동작을 표시하며 보조 동작이 없으면 닫기 콜백을 사용한다.
export function Dialog({ value, onClose }: { value: DialogState | null; onClose: () => void }) {
  if (!value) return null;
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.scrim}>
      <View style={styles.dialog} accessibilityViewIsModal>
        <View style={styles.alertIcon}><Icon name="alert" color={colors.accent} size={28} /></View>
        <Text accessibilityRole="header" style={styles.dialogTitle}>{value.title}</Text>
        <Text style={[typography.description, styles.message]}>{value.message}</Text>
        <Button title={value.primary} onPress={value.onPrimary} />
        {value.secondary && <Button title={value.secondary} onPress={value.onSecondary ?? onClose} quiet />}
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 360, padding: 24, borderRadius: 28, backgroundColor: colors.surface },
  alertIcon: { width: 56, height: 56, backgroundColor: colors.accentTint, borderRadius: 18, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  dialogTitle: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 12 },
  message: { textAlign: 'center', marginBottom: 24 },
});
