import ExpoModulesCore

// iOS 잠금 감지: 기기에 암호가 설정된 경우 잠금 시 protectedDataWillBecomeUnavailable,
// 해제 시 protectedDataDidBecomeAvailable이 발생한다. (암호 미설정 기기는 이벤트 없음 → JS 폴백)
public class ScreenStateModule: Module {
  private var observers: [NSObjectProtocol] = []

  public func definition() -> ModuleDefinition {
    Name("ScreenState")

    Events("onScreenState")

    OnStartObserving {
      let lock = NotificationCenter.default.addObserver(
        forName: UIApplication.protectedDataWillBecomeUnavailableNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        self?.sendEvent("onScreenState", ["state": "off"])
      }
      let unlock = NotificationCenter.default.addObserver(
        forName: UIApplication.protectedDataDidBecomeAvailableNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        self?.sendEvent("onScreenState", ["state": "present"])
      }
      self.observers = [lock, unlock]
    }

    OnStopObserving {
      self.observers.forEach { NotificationCenter.default.removeObserver($0) }
      self.observers = []
    }
  }
}
