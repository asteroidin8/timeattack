import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRunStore } from '@/stores/useRunStore';

const STEPS = [
  {
    tag: 'BET',
    title: '시간을 베팅하세요',
    body: '할 일마다 예상 시간을 겁니다.\n오늘의 할 일이 하나의 레이스 코스가 돼요.',
  },
  {
    tag: 'RACE',
    title: '순서대로 완주하세요',
    body: '내가 짠 순서대로 타임어택.\n빨리 끝낼수록 아낀 시간이 쌓입니다.',
  },
  {
    tag: 'FOCUS',
    title: '진짜 집중만 기록돼요',
    body: '다른 앱에 간 시간은 기록에서 빠져요.\n잠그거나 내려놓은 시간만 진짜 집중.',
  },
];

export default function OnboardingScreen() {
  const completeOnboarding = useRunStore((s) => s.completeOnboarding);

  const start = () => {
    completeOnboarding();
    router.replace('/');
  };

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <View className="flex-1 justify-center px-8">
        <Text className="font-digitbold text-xl tracking-[2px] text-racing">TODORUN</Text>
        <Text className="mt-3 text-4xl font-medium leading-tight text-ink">
          할 일 목록이{'\n'}레이스 트랙이 됩니다
        </Text>

        <View className="mt-14 gap-9">
          {STEPS.map((step) => (
            <View key={step.tag} className="flex-row gap-5">
              <Text className="mt-[2px] w-16 font-digitbold text-lg text-racing">
                {step.tag}
              </Text>
              <View className="flex-1">
                <Text className="text-[19px] font-medium text-ink">{step.title}</Text>
                <Text className="mt-1.5 text-[16px] leading-6 text-ink-mute">{step.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className="px-8 pb-6">
        <Pressable
          className="items-center rounded-2xl bg-racing py-5 active:opacity-80"
          onPress={start}>
          <Text className="text-[18px] font-medium text-white">시작하기 ›››</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
