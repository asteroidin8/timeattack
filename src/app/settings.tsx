import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Pressable, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { initialAwayState } from '@/domain/away';
import { useProgressStore } from '@/stores/useProgressStore';
import { useRunStore } from '@/stores/useRunStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { confirmDestructive, notify } from '@/utils/dialog';

const PRIVACY_URL = 'https://asteroidin8.github.io/timeattack/privacy.html';
const CONTACT_MAILTO =
  'mailto:asteroidin8@gmail.com?subject=' + encodeURIComponent('투두런 문의');

function RowButton({
  label,
  description,
  accent,
  onPress,
}: {
  label: string;
  description?: string;
  accent?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="border-b-[0.5px] border-hairline py-4 active:opacity-70"
      onPress={onPress}>
      <Text className={`text-[17px] ${accent ? 'text-racing' : 'text-ink'}`}>{label}</Text>
      {description ? (
        <Text className="mt-1 text-[15px] text-ink-mute">{description}</Text>
      ) : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const hydrated = useSettingsStore((s) => s.hydrated);
  const sessionAlarmEnabled = useSettingsStore((s) => s.sessionAlarmEnabled);
  const setSessionAlarmEnabled = useSettingsStore((s) => s.setSessionAlarmEnabled);
  const aodEnabled = useSettingsStore((s) => s.aodEnabled);
  const setAodEnabled = useSettingsStore((s) => s.setAodEnabled);

  const version = Constants.expoConfig?.version ?? '1.0.0';

  const openPrivacy = async () => {
    try {
      await WebBrowser.openBrowserAsync(PRIVACY_URL);
    } catch {
      Linking.openURL(PRIVACY_URL);
    }
  };

  const contact = () => {
    Linking.openURL(CONTACT_MAILTO).catch(() =>
      notify('메일 앱을 열 수 없어요', 'asteroidin8@gmail.com 으로 보내주세요.'),
    );
  };

  const resetAll = () => {
    if (useRunStore.getState().currentIndex !== null) {
      notify('진행 중인 레이스가 있어요', '레이스를 끝낸 뒤 초기화할 수 있어요.');
      return;
    }
    confirmDestructive({
      title: '모든 기록을 초기화할까요?',
      message: '태스크·일일 기록·XP·레벨이 전부 삭제돼요.',
      confirmLabel: '계속',
      onConfirm: () => {
        confirmDestructive({
          title: '정말 초기화할까요?',
          message: '삭제하면 되돌릴 수 없어요.',
          confirmLabel: '초기화',
          onConfirm: async () => {
            useRunStore.setState({
              onboarded: false,
              tasks: [],
              currentIndex: null,
              startedAt: null,
              endAt: null,
              combo: 0,
              maxCombo: 0,
              away: initialAwayState,
              lastPlanDate: null,
            });
            useProgressStore.setState({ records: {}, totalXp: 0 });
            await AsyncStorage.removeItem('timeattack-run');
            await AsyncStorage.removeItem('timeattack-progress');
            router.replace('/');
          },
        });
      },
    });
  };

  // 복원 전 토글 기본값 깜빡임 방지
  if (!hydrated) return <SafeAreaView className="flex-1 bg-paper" />;

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <View className="flex-1 px-6">
        <View className="mt-4 flex-row items-center justify-between">
          <Text className="text-3xl font-medium text-ink">설정</Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text className="text-[15px] text-ink-mute">닫기</Text>
          </Pressable>
        </View>

        <View className="mt-8">
          <View className="flex-row items-center justify-between border-b-[0.5px] border-hairline py-4">
            <View className="flex-1 pr-3">
              <Text className="text-[17px] text-ink">세션 알림</Text>
              <Text className="mt-1 text-[15px] text-ink-mute">
                타임 오버·초과 리마인더 알림
              </Text>
            </View>
            <Switch
              value={sessionAlarmEnabled}
              onValueChange={setSessionAlarmEnabled}
              trackColor={{ true: '#E5202E', false: '#EEEDE8' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View className="flex-row items-center justify-between border-b-[0.5px] border-hairline py-4">
            <View className="flex-1 pr-3">
              <Text className="text-[17px] text-ink">절전 화면</Text>
              <Text className="mt-1 text-[15px] text-ink-mute">
                세션 중 30초 동안 터치가 없으면 어두운 타이머로 전환
              </Text>
            </View>
            <Switch
              value={aodEnabled}
              onValueChange={setAodEnabled}
              trackColor={{ true: '#E5202E', false: '#EEEDE8' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <RowButton label="문의하기" description="asteroidin8@gmail.com" onPress={contact} />
          <RowButton label="개인정보처리방침" onPress={openPrivacy} />
          <RowButton
            label="모든 기록 초기화"
            description="태스크·기록·XP·레벨 삭제"
            accent
            onPress={resetAll}
          />
        </View>

        <View className="mt-auto items-center pb-6">
          <Text className="font-digit text-base text-ink-mute">TODORUN v{version}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
