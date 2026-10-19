package expo.modules.wifimanager

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.wifi.WifiManager
import android.net.wifi.WifiNetworkSuggestion
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// 시스템 와이파이 창 실행과 결과를 기다리는 Promise의 수명을 관리한다.
class WifiManagerModule : Module() {
  private var pending: Promise? = null
  private val requestCode = 49107

  // JavaScript 호출을 네이티브 동작과 연결하고 결과·종료 이벤트를 등록한다.
  override fun definition() = ModuleDefinition {
    Name("WifiManager")
    AsyncFunction("openSystemWifiDialog") { ssid: String, password: String, security: String, hidden: Boolean, promise: Promise ->
      // 이미 결과를 기다리는 연결 요청이 있으면 중복 실행을 거절한다.
      if (pending != null) {
        promise.reject("ERR_BUSY", "이미 연결 창이 열려 있어요.", null)
        return@AsyncFunction
      }
      // 시스템 창을 열 수 있는 Android 버전과 현재 Activity를 확인한다.
      val activity = appContext.currentActivity
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R || activity == null) {
        promise.reject("ERR_UNAVAILABLE", "Android 11 이상에서 연결할 수 있어요.", null)
        return@AsyncFunction
      }
      try {
        val builder = WifiNetworkSuggestion.Builder().setSsid(ssid).setIsHiddenSsid(hidden)
        // 전달받은 보안 방식에 맞는 설정을 구성하고 미지원 방식은 거절한다.
        when (security.uppercase()) {
          "NOPASS" -> { }
          "WPA", "WPA2" -> builder.setWpa2Passphrase(password)
          "SAE", "WPA3" -> builder.setWpa3Passphrase(password)
          else -> {
            promise.reject("ERR_SECURITY", "이 보안 방식은 설정에서 직접 연결해 주세요.", null)
            return@AsyncFunction
          }
        }
        // 네트워크 추가를 사용자가 확인할 수 있도록 시스템 창에 후보를 전달한다.
        val intent = Intent(Settings.ACTION_WIFI_ADD_NETWORKS).apply {
          putParcelableArrayListExtra(Settings.EXTRA_WIFI_NETWORK_LIST, arrayListOf(builder.build()))
        }
        // 결과 이벤트가 도착할 때까지 요청을 보관한 뒤 메인 큐에서 시스템 창을 연다.
        pending = promise
        activity.startActivityForResult(intent, requestCode)
      } catch (error: Exception) {
        // 창 실행에 실패하면 대기 요청을 비우고 호출자에게 오류를 전달한다.
        pending = null
        promise.reject("ERR_WIFI_DIALOG", "시스템 연결 창을 열지 못했어요.", error)
      }
    }.runOnQueue(Queues.MAIN)

    // 시스템이 최근에 찾은 주변 와이파이의 이름·보안 방식·신호 세기를 돌려준다. 권한이 없으면 빈 목록이다.
    AsyncFunction("getNearbyNetworks") {
      val context = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, Any>>()
      val wifi = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
      try {
        // 다음 인식을 위해 새 검색을 요청하고, 이번에는 이미 받아 둔 결과를 바로 사용한다.
        @Suppress("DEPRECATION") wifi.startScan()
        @Suppress("DEPRECATION")
        wifi.scanResults.filter { it.SSID.isNotEmpty() }.map {
          mapOf("ssid" to it.SSID, "capabilities" to it.capabilities, "level" to it.level)
        }
      } catch (error: SecurityException) {
        emptyList()
      }
    }

    // 이 모듈의 요청 결과만 처리하고 취소도 정상적인 종료 결과로 반환한다.
    OnActivityResult { _, result ->
      if (result.requestCode == requestCode) {
        val promise = pending
        pending = null
        if (result.resultCode == Activity.RESULT_CANCELED) {
          promise?.resolve("canceled")
        } else {
          val status = result.data?.getIntegerArrayListExtra(Settings.EXTRA_WIFI_NETWORK_RESULT_LIST)?.firstOrNull()
          if (result.resultCode == Activity.RESULT_OK &&
            (status == Settings.ADD_WIFI_RESULT_SUCCESS || status == Settings.ADD_WIFI_RESULT_ALREADY_EXISTS)) {
            // 저장 결과이며 실제 인터넷 연결 여부를 보장하지 않는다.
            promise?.resolve("saved")
          } else {
            promise?.reject("ERR_WIFI_ADD", "네트워크를 추가하지 못했어요.", null)
          }
        }
      }
    }
    // 모듈이 종료되면 남은 요청을 거절해 Promise가 계속 대기하지 않게 한다.
    OnDestroy {
      pending?.reject("ERR_DESTROYED", "연결 요청이 종료되었어요.", null)
      pending = null
    }
  }
}
