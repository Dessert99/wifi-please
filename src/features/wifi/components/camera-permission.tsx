import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { colors, typography } from '@/constants/theme';

type CameraPermissionProps = {
  canAskAgain: boolean;
  busy: boolean;
  onAllow: () => void;
  onPickPhoto: () => void;
};

export function CameraPermission({ canAskAgain, busy, onAllow, onPickPhoto }: CameraPermissionProps) {
  const denied = !canAskAgain;
  return (
    <>
      <Text style={styles.lightBrand}>Snapfi</Text>
      <ScrollView contentContainerStyle={styles.permissionContent}>
        <BrandMark />
        <Text accessibilityRole="header" style={styles.permissionTitle}>{denied ? '카메라를 켜면\n바로 찍을 수 있어요' : '한 번 찍고,\n함께 연결해요'}</Text>
        <Text style={[typography.description, { textAlign: 'center' }]}>{denied ? '설정에서 카메라 권한을 허용해 주세요.\n저장된 사진으로도 시작할 수 있어요.' : '카페 와이파이 안내문을 찍으면\n직접 입력할 필요 없이 연결해요.'}</Text>
        {busy && <ActivityIndicator color={colors.accent} />}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 16 }]}>
        <Button title={denied ? '설정에서 허용하기' : '카메라 허용하기'} onPress={onAllow} disabled={busy} />
        <Button title={busy ? '사진을 읽는 중이에요' : '사진에서 찾기'} secondary onPress={onPickPhoto} disabled={busy} />
        <Text style={styles.footnote}>사진 인식에는 인터넷이 필요해요</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  footer: { paddingHorizontal: 24, paddingTop: 12, gap: 8 },
  lightBrand: { color: colors.text, fontSize: 20, fontWeight: '800', padding: 24 },
  permissionContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 22 },
  permissionTitle: { fontSize: 30, lineHeight: 41, fontWeight: '800', letterSpacing: -.9, textAlign: 'center', color: colors.text, marginTop: 8 },
  footnote: { color: colors.textSub, fontSize: 11, textAlign: 'center', marginTop: 10 },
});
