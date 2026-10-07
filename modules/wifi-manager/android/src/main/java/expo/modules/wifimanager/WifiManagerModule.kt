package expo.modules.wifimanager

import android.app.Activity
import android.content.Intent
import android.net.wifi.WifiNetworkSuggestion
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class WifiManagerModule : Module() {
  private var pending: Promise? = null
  private val requestCode = 49107

  override fun definition() = ModuleDefinition {
    Name("WifiManager")
    AsyncFunction("openSystemWifiDialog") { ssid: String, password: String, security: String, hidden: Boolean, promise: Promise ->
      if (pending != null) {
        promise.reject("ERR_BUSY", "이미 연결 창이 열려 있어요.", null)
        return@AsyncFunction
      }
      val activity = appContext.currentActivity
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R || activity == null) {
        promise.reject("ERR_UNAVAILABLE", "Android 11 이상에서 연결할 수 있어요.", null)
        return@AsyncFunction
      }
      try {
        val builder = WifiNetworkSuggestion.Builder().setSsid(ssid).setIsHiddenSsid(hidden)
        when (security.uppercase()) {
          "NOPASS" -> { }
          "WPA", "WPA2" -> builder.setWpa2Passphrase(password)
          "SAE", "WPA3" -> builder.setWpa3Passphrase(password)
          else -> {
            promise.reject("ERR_SECURITY", "이 보안 방식은 설정에서 직접 연결해 주세요.", null)
            return@AsyncFunction
          }
        }
        val intent = Intent(Settings.ACTION_WIFI_ADD_NETWORKS).apply {
          putParcelableArrayListExtra(Settings.EXTRA_WIFI_NETWORK_LIST, arrayListOf(builder.build()))
        }
        pending = promise
        activity.startActivityForResult(intent, requestCode)
      } catch (error: Exception) {
        pending = null
        promise.reject("ERR_WIFI_DIALOG", "시스템 연결 창을 열지 못했어요.", error)
      }
    }.runOnQueue(Queues.MAIN)

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
    OnDestroy {
      pending?.reject("ERR_DESTROYED", "연결 요청이 종료되었어요.", null)
      pending = null
    }
  }
}
