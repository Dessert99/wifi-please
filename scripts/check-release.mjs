import { readFileSync } from 'node:fs';

// 개발 빌드는 허용하고 공개 연락처가 빠진 production 빌드만 차단한다.
if (process.argv.includes('--eas') && process.env.EAS_BUILD_PROFILE !== 'production') process.exit(0);
const privacy = JSON.parse(readFileSync(new URL('../shared/privacy.json', import.meta.url), 'utf8'));
const errors = [];
if (!privacy.developerName.trim()) errors.push('shared/privacy.json에 공개 개발자명을 등록하세요.');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(privacy.contactEmail)) errors.push('shared/privacy.json에 실제 문의 이메일을 등록하세요.');
if (!privacy.publicUrl.startsWith('https://')) errors.push('HTTPS 개인정보처리방침 URL이 필요합니다.');
if (errors.length) {
  console.error('출시 필수 정보가 누락됐습니다.\n' + errors.join('\n'));
  process.exit(1);
}
console.log('출시 연락처 검사를 통과했습니다. 공개 URL과 Play Console 신고는 별도로 확인하세요.');
