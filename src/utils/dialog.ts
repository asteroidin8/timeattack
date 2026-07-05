import { Alert, Platform } from 'react-native';

// react-native-web은 Alert를 구현하지 않으므로 웹에서는 window 다이얼로그로 대체한다
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function confirmDestructive(options: {
  title: string;
  message?: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const { title, message, confirmLabel, onConfirm } = options;
  if (Platform.OS === 'web') {
    if (window.confirm(message ? `${title}\n${message}` : title)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: '계속하기', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
