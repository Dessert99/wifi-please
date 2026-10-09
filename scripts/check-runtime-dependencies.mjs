import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// audit의 직접 취약점 설치 경로가 실제 Metro 번들에 포함됐는지 대조한다.
export function findBundledAdvisories(audit, sourceMap) {
  if (!audit.vulnerabilities || !Array.isArray(sourceMap.sources) || !sourceMap.sources.length) {
    throw new Error('유효한 npm audit JSON과 Metro 소스맵이 필요합니다.');
  }
  return Object.entries(audit.vulnerabilities).flatMap(([name, entry]) => {
    const advisories = entry.via.filter(via => typeof via === 'object');
    if (!advisories.length) return [];
    const sources = sourceMap.sources.filter(source => entry.nodes.some(node => {
      const normalized = '/' + source.replaceAll('\\', '/');
      return normalized.includes('/' + node + '/');
    }));
    return sources.length ? [{ name, sources, advisories: advisories.map(advisory => advisory.url) }] : [];
  });
}

// 라이브러리로 가져온 테스트에서는 CLI를 실행하지 않는다.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [auditPath, mapPath] = process.argv.slice(2);
  try {
    if (!auditPath || !mapPath) throw new Error('사용법: node scripts/check-runtime-dependencies.mjs <audit.json> <bundle.map>');
    const audit = JSON.parse(readFileSync(auditPath, 'utf8'));
    const map = JSON.parse(readFileSync(mapPath, 'utf8'));
    const findings = findBundledAdvisories(audit, map);
    console.log(`번들 소스 ${map.sources.length}개, 직접 취약점 패키지 포함 ${findings.length}개`);
    for (const finding of findings) console.log(JSON.stringify(finding));
    console.log('이 검사는 전달한 audit의 JS 의존성 경로만 대조합니다. 네이티브 코드나 미보고 취약점을 검증하지 않습니다.');
    process.exitCode = findings.length ? 1 : 0;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
