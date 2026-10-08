import { expect, it, vi } from 'vitest';
import { deleteCachedPhoto } from '../services/photo-cache';

const remove = vi.hoisted(() => vi.fn());
vi.mock('expo-file-system', () => ({
  Paths: { cache: { uri: 'file:///app/cache/' } },
  File: class { exists = true; constructor(readonly uri: string) {} delete() { remove(); } },
}));

it('앱 캐시의 작업 사본만 삭제하고 외부 원본·상위 경로를 보존한다', () => {
  for (const uri of ['content://photos/1', 'file:///gallery/original.jpg', 'file:///app/cache-other/a.jpg', 'file:///app/cache/../original.jpg', 'file:///app/cache/%2e%2e/original.jpg']) deleteCachedPhoto(uri);
  expect(remove).not.toHaveBeenCalled();
  deleteCachedPhoto('file:///app/cache/Camera/capture.jpg');
  expect(remove).toHaveBeenCalledTimes(1);
});

it('이미 삭제된 파일이나 삭제 실패가 촬영 흐름을 중단하지 않는다', () => {
  remove.mockImplementationOnce(() => { throw new Error('삭제 실패'); });
  expect(() => deleteCachedPhoto('file:///app/cache/photo.jpg')).not.toThrow();
});
