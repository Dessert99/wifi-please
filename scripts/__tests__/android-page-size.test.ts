import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

type Segment = { type: number; start: number; size: number; alignment?: number };
const load = (start: number, size: number, alignment = 16384): Segment => ({ type: 1, start, size, alignment });
const relro = (start: number, size: number): Segment => ({ type: 0x6474e552, start, size });

// 링크 결과의 헤더 경계만 재현해 실제 Python 검사기에 전달한다.
function inspect(segments: Segment[], sections: { start: number; size: number }[] = []) {
  const sectionOffset = 64 + segments.length * 56;
  const elf = Buffer.alloc(sectionOffset + sections.length * 64);
  elf.write('\x7fELF');
  elf[4] = 2;
  elf[5] = 1;
  elf.writeBigUInt64LE(64n, 32);
  elf.writeBigUInt64LE(BigInt(sectionOffset), 40);
  elf.writeUInt16LE(56, 54);
  elf.writeUInt16LE(segments.length, 56);
  elf.writeUInt16LE(64, 58);
  elf.writeUInt16LE(sections.length, 60);
  segments.forEach((segment, index) => {
    const offset = 64 + index * 56;
    elf.writeUInt32LE(segment.type, offset);
    elf.writeBigUInt64LE(BigInt(segment.start), offset + 16);
    elf.writeBigUInt64LE(BigInt(segment.size), offset + 40);
    elf.writeBigUInt64LE(BigInt(segment.alignment ?? 1), offset + 48);
  });
  sections.forEach((section, index) => {
    const offset = sectionOffset + index * 64;
    elf.writeBigUInt64LE(BigInt(section.start), offset + 16);
    elf.writeBigUInt64LE(BigInt(section.size), offset + 32);
  });
  return JSON.parse(execFileSync('python3', ['-c', `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location('checker', 'scripts/check-android-apk.py')
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)
print(json.dumps(checker.inspect_library(sys.stdin.buffer.read(), 'fixture.so')))
`], { input: elf, encoding: 'utf8' })) as string[];
}

describe('Android 16KB ELF 검사', () => {
  it('실제 Hermes처럼 RELRO가 LOAD 전체를 덮으면 끝이 16KB 경계가 아니어도 허용한다', () => {
    expect(inspect([load(0x256ff0, 0xa010), relro(0x256ff0, 0xa010)])).toEqual([]);
  });

  it('LOAD 시작에 붙은 RELRO와 페이지 경계 끝을 허용한다', () => {
    expect(inspect([load(0x4100, 0x8000), relro(0x4100, 0x3f00)])).toEqual([]);
  });

  it('LOAD 끝에 붙은 RELRO와 페이지 경계 시작을 허용한다', () => {
    expect(inspect([load(0x4000, 0x5000), relro(0x8000, 0x1000)])).toEqual([]);
  });

  it('동일한 실제 섹션을 모두 보호하는 RELRO를 허용한다', () => {
    expect(inspect([load(0x4100, 0x2000), relro(0x4200, 0x1000)], [{ start: 0x4300, size: 0x100 }])).toEqual([]);
  });

  it('보호하지 않는 LOAD 섹션이 있으면 동일 섹션 예외를 허용하지 않는다', () => {
    expect(inspect([load(0x4100, 0x2000), relro(0x4200, 0x1000)], [
      { start: 0x4300, size: 0x100 }, { start: 0x5400, size: 0x100 },
    ])).toHaveLength(2);
  });

  it('섹션 정보가 없을 때 빈 목록만으로 잘못된 RELRO를 통과시키지 않는다', () => {
    expect(inspect([load(0x4000, 0x8000), relro(0x4100, 0x2000)])).toHaveLength(2);
  });

  it('RELRO가 다음 LOAD를 침범하면 실패한다', () => {
    expect(inspect([load(0x4000, 0x4000), load(0x8000, 0x4000), relro(0x4000, 0x8000)])[0]).toContain('침범');
  });

  it('4KB LOAD는 RELRO가 정상이어도 실패한다', () => {
    expect(inspect([load(0x4000, 0x4000, 4096), relro(0x4000, 0x4000)])[0]).toContain('LOAD 정렬');
  });

  it('LOAD 이전에서 시작하는 RELRO는 실패한다', () => {
    expect(inspect([load(0x8000, 0x4000), relro(0x4000, 0x4000)])[0]).toContain('LOAD 구간이 없습니다');
  });
});
