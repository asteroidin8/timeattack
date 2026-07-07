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
