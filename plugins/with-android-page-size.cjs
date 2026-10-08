const { withProjectBuildGradle } = require('expo/config-plugins');

const marker = '// WiFi Please: 로컬 CMake 라이브러리의 16KB LOAD·RELRO 정렬';

// 생성되는 Gradle 설정을 통해 앱과 로컬 네이티브 의존성의 링커 옵션을 함께 적용한다.
module.exports = function withAndroidPageSize(config) {
  return withProjectBuildGradle(config, result => {
    if (result.modResults.language !== 'groovy') throw new Error('16KB 설정은 Groovy Gradle 프로젝트를 지원합니다.');
    if (!result.modResults.contents.includes(marker)) {
      const anchor = 'apply plugin: "expo-root-project"';
      if (!result.modResults.contents.includes(anchor)) throw new Error('Expo 루트 플러그인 적용 위치를 찾을 수 없습니다.');
      const settings = `
${marker}
subprojects { nativeProject ->
    nativeProject.afterEvaluate {
        def androidExtension = nativeProject.extensions.findByName('android')
        if (androidExtension != null) {
            androidExtension.defaultConfig.externalNativeBuild.cmake.arguments.add(
                '-DCMAKE_SHARED_LINKER_FLAGS=-Wl,-z,max-page-size=16384 -Wl,-z,common-page-size=16384'
            )
        }
    }
}
`;
      result.modResults.contents = result.modResults.contents.replace(anchor, settings + '\n' + anchor);
    }
    return result;
  });
};
