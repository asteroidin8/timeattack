import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Expo Go(SDK 53+)·웹: expo-notifications import 시 즉시 throw → lazy load + no-op
const isSupported = Platform.OS !== 'web' && Constants.appOwnership !== 'expo';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null = null;
let handlerConfigured = false;

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (!isSupported) return null;
  if (notificationsModule) return notificationsModule;
  try {
    notificationsModule = await import('expo-notifications');
    if (!handlerConfigured) {
      notificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      handlerConfigured = true;
    }
    return notificationsModule;
  } catch {
    return null;
  }
}

export async function ensureNotificationSetup(): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('session', {
        name: '세션 알림',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleSessionEndNotification(
  taskTitle: string,
  endAt: number,
): Promise<string | null> {
  const Notifications = await loadNotifications();
  if (!Notifications) return null;
  const seconds = Math.round((endAt - Date.now()) / 1000);
  if (seconds < 1) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '타임 오버',
        body: `"${taskTitle}" 베팅 시간이 끝났어요.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        channelId: 'session',
      },
    });
  } catch {
    return null;
  }
}

// 초과 리마인더: 자동 정산(2×bet)까지 절반 지점에 1회 발송 — endAt은 그대로 두고 이 알림만 별도 예약
export async function scheduleOvertimeReminderNotification(
  taskTitle: string,
  endAt: number,
  betSeconds: number,
): Promise<string | null> {
  const Notifications = await loadNotifications();
  if (!Notifications) return null;
  const reminderAt = endAt + Math.floor(betSeconds / 2) * 1000;
  const seconds = Math.round((reminderAt - Date.now()) / 1000);
  if (seconds < 1) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '아직 달리는 중인가요?',
        body: `"${taskTitle}" 베팅의 절반을 초과했어요. 베팅의 2배가 되면 자동으로 기록돼요.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        channelId: 'session',
      },
    });
  } catch {
    return null;
  }
}

export async function cancelSessionNotification(id: string | null) {
  if (!id || !isSupported) return;
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // 이미 발송됐거나 취소된 알림은 무시
  }
}
