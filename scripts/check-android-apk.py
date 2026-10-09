"""APK/AAB의 64비트 ELF 정렬과 APK의 ZIP 페이지 정렬을 검사한다."""

import argparse
import os
from pathlib import Path
import struct
import subprocess
import zipfile


# ELF64 프로그램 헤더를 직접 읽어 추가 Python 패키지 없이 정렬을 검사한다.
def inspect_library(data, name):
    if len(data) < 5 or data[:4] != b"\x7fELF":
        return [f"{name}: ELF 헤더가 손상되었습니다."]
    if data[4] == 1:
        return None
    if len(data) < 64 or data[4] != 2 or data[5] not in (1, 2):
        return [f"{name}: 지원하지 않거나 손상된 ELF 헤더입니다."]
    endian = "<" if data[5] == 1 else ">"
    offset = struct.unpack_from(endian + "Q", data, 32)[0]
    section_offset = struct.unpack_from(endian + "Q", data, 40)[0]
    size, count, section_size, section_count = struct.unpack_from(endian + "HHHH", data, 54)
    if size < 56 or not count or offset + size * count > len(data):
        return [f"{name}: 프로그램 헤더가 손상되었습니다."]
    if section_count and (section_size < 64 or section_offset + section_size * section_count > len(data)):
        return [f"{name}: 섹션 헤더가 손상되었습니다."]
    headers = [struct.unpack_from(endian + "IIQQQQQQ", data, offset + index * size) for index in range(count)]
    loads = sorted((header for header in headers if header[0] == 1), key=lambda header: header[3])
    sections = [struct.unpack_from(endian + "IIQQQQIIQQ", data, section_offset + index * section_size) for index in range(section_count)]
    problems = []
    if not loads:
        problems.append(f"{name}: LOAD 구간이 없습니다.")
    for load in loads:
        if load[7] < 16384 or load[7] & (load[7] - 1):
            problems.append(f"{name}: LOAD 정렬 {load[7]}")

    # Android Studio 판정처럼 LOAD 경계 및 동일 섹션 전체를 보호하는 RELRO를 허용한다.
    # 근거: tools/base 7765a1e4385997e1919311925a88cbd12218f818, PageAlignUtils.kt
    for header in headers:
        if header[0] != 0x6474E552:
            continue
        start, end = header[3], header[3] + header[6]
        preceding = [index for index, load in enumerate(loads) if load[3] <= start]
        if not preceding:
            problems.append(f"{name}: RELRO 시작 앞에 LOAD 구간이 없습니다.")
            continue
        index = preceding[-1]
        load = loads[index]
        if index + 1 < len(loads) and end > loads[index + 1][3]:
            problems.append(f"{name}: RELRO가 다음 LOAD 구간을 침범합니다.")
            continue
        load_end = load[3] + load[6]
        contained = [section for section in sections if section[3] >= load[3] and section[3] + section[5] <= load_end]
        protected = [section for section in sections if section[3] >= start and section[3] + section[5] <= end]
        if contained and contained == protected:
            continue
        if start % 16384 and start != load[3]:
            problems.append(f"{name}: RELRO 시작이 16KB 또는 LOAD 경계와 불일치")
        if end % 16384 and end != load_end:
            problems.append(f"{name}: RELRO 끝이 16KB 또는 LOAD 경계와 불일치")
    return problems


# 입력 APK를 읽기만 하며 실패를 종료 코드로 전달해 출시 검증에서 재사용한다.
def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("apk", type=Path)
    parser.add_argument("--aab", action="store_true", help="AAB 내부 ELF만 검사, APK ZIP 정렬은 별도로 검사")
    parser.add_argument("--zipalign", type=Path, help="Android SDK zipalign 실행 파일, APK 검사 시 필수")
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
    if args.aab:
        print("AAB 내부 ELF 검사입니다. 생성 APK의 ZIP 정렬과 BundleConfig는 별도로 확인하세요.")
    elif not args.zipalign or not args.zipalign.is_file() or not os.access(args.zipalign, os.X_OK):
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
