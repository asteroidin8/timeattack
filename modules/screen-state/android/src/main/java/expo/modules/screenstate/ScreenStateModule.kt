package expo.modules.screenstate

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// 화면 잠금(끄기)·해제를 JS로 이벤트 전달 — 세션 이탈 판정에서
// "폰 잠금(집중 인정)"과 "다른 앱 사용(차감)"을 구분하기 위한 모듈
class ScreenStateModule : Module() {
  private var receiver: BroadcastReceiver? = null

  private fun unregister() {
    receiver?.let {
      runCatching { appContext.reactContext?.unregisterReceiver(it) }
    }
    receiver = null
  }

  override fun definition() = ModuleDefinition {
    Name("ScreenState")

    Events("onScreenState")

    OnStartObserving {
      if (receiver == null) {
        receiver = object : BroadcastReceiver() {
          override fun onReceive(context: Context?, intent: Intent?) {
            val state = when (intent?.action) {
              Intent.ACTION_SCREEN_OFF -> "off"
              Intent.ACTION_SCREEN_ON -> "on"
              Intent.ACTION_USER_PRESENT -> "present"
              else -> return
            }
            sendEvent("onScreenState", mapOf("state" to state))
          }
        }
        val filter = IntentFilter().apply {
          addAction(Intent.ACTION_SCREEN_OFF)
          addAction(Intent.ACTION_SCREEN_ON)
          addAction(Intent.ACTION_USER_PRESENT)
        }
        appContext.reactContext?.registerReceiver(receiver, filter)
      }
    }

    OnStopObserving {
      unregister()
    }

    OnDestroy {
      unregister()
    }
  }
}
