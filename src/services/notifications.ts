import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 세션 종료 알림: 웹은 expo-notifications 스케줄링 미지원이라 전부 no-op
const isSupported = Platform.OS !== 'web';

if (isSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureNotificationSetup(): Promise<boolean> {
  if (!isSupported) return false;
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
  if (!isSupported) return null;
  const seconds = Math.round((endAt - Date.now()) / 1000);
  if (seconds < 1) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '타임 오버',
        body: `"${taskTitle}" 베팅 시간이 끝났어요. 아직 진행 중이면 계속 달려요.`,
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
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // 이미 발송됐거나 취소된 알림은 무시
  }
}
