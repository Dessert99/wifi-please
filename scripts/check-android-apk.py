"""APK의 64비트 ELF LOAD·RELRO와 ZIP 페이지 정렬을 검사한다."""

import argparse
import os
from pathlib import Path
import struct
import subprocess
import zipfile


# ELF64 프로그램 헤더를 직접 읽어 추가 Python 패키지 없이 정렬을 검사한다.
def inspect_library(data, name):
    if data[:4] != b"\x7fELF" or data[4] != 2:
        return None
    endian = "<" if data[5] == 1 else ">"
    offset = struct.unpack_from(endian + "Q", data, 32)[0]
    size, count = struct.unpack_from(endian + "HH", data, 54)
    problems = []
    for index in range(count):
        kind, _, _, address, _, _, memory_size, alignment = struct.unpack_from(
            endian + "IIQQQQQQ", data, offset + index * size
        )
        if kind == 1 and alignment < 16384:
            problems.append(f"{name}: LOAD 정렬 {alignment}")
        if kind == 0x6474E552 and (address + memory_size) % 16384:
            problems.append(f"{name}: RELRO 끝 주소가 16KB 경계와 불일치")
    return problems


# 입력 APK를 읽기만 하며 실패를 종료 코드로 전달해 출시 검증에서 재사용한다.
def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("apk", type=Path)
    parser.add_argument("--zipalign", type=Path, required=True, help="Android SDK zipalign 실행 파일")
    args = parser.parse_args()
    problems = []
    libraries = 0
    with zipfile.ZipFile(args.apk) as archive:
        for name in archive.namelist():
            if name.endswith(".so"):
                result = inspect_library(archive.read(name), name)
                if result is not None:
                    libraries += 1
                    problems.extend(result)
    if libraries == 0:
        problems.append("검사할 64비트 네이티브 라이브러리가 없습니다.")
    if not args.zipalign.is_file() or not os.access(args.zipalign, os.X_OK):
        problems.append("zipalign 실행 파일을 찾을 수 없습니다.")
    else:
        result = subprocess.run([str(args.zipalign), "-c", "-P", "16", "4", str(args.apk)], capture_output=True, text=True)
        if result.returncode:
            problems.append("APK의 ZIP 정렬 검사 실패: " + result.stderr.strip())
    print(f"검사한 64비트 라이브러리: {libraries}개")
    for problem in problems:
        print(problem)
    print("16KB 정렬 통과" if not problems else "16KB 정렬 미통과. 이 APK를 호환 완료로 처리하지 마세요.")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
