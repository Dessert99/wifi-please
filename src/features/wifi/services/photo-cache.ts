import { File, Paths } from 'expo-file-system';

// 앱 캐시에 있는 작업 사본만 지우고 갤러리 원본과 외부 URI는 건드리지 않는다.
export function deleteCachedPhoto(uri: string | undefined) {
  if (!uri) return;
  try {
    const file = new File(uri);
    const cache = Paths.cache.uri.replace(/\/$/, '') + '/';
    if (file.uri.startsWith(cache) && !decodeURIComponent(file.uri).split('/').includes('..') && file.exists) file.delete();
  } catch {
    // 삭제 실패로 연결 흐름을 중단하거나 사진 경로를 로그에 남기지 않는다.
  }
}
