import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';

import { Importance, RunTask } from '@/domain/xp';

const BET_PRESETS = [10, 15, 25, 50];
const IMPORTANCE_LEVELS: Importance[] = [1, 2, 3];

export interface EditResult {
  title: string;
  importance: Importance;
  betMinutes: number;
}

export function EditTaskSheet({
  task,
  onSave,
  onDelete,
  onClose,
}: {
  task: RunTask | null;
  onSave: (id: string, result: EditResult) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [importance, setImportance] = useState<Importance>(2);
  const [betMinutes, setBetMinutes] = useState(25);

  // task가 바뀔 때 필드 초기화 (모달이 열리는 시점)
  const [seededId, setSeededId] = useState<string | null>(null);
  if (task && task.id !== seededId) {
    setSeededId(task.id);
    setTitle(task.title);
    setImportance(task.importance);
    setBetMinutes(Math.round(task.betSeconds / 60));
  }
  // 닫히면 시딩을 리셋 — 같은 태스크를 다시 열 때 저장 안 한 편집값이 남지 않도록
  if (!task && seededId !== null) {
    setSeededId(null);
  }

  const save = () => {
    if (!task) return;
    onSave(task.id, { title, importance, betMinutes });
    onClose();
  };

  return (
    <Modal visible={task !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* 배경: 시트 콘텐츠의 형제로 두어야 콘텐츠 탭이 오버레이로 전파돼 닫히지 않음 (RN-web) */}
        <Pressable
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(28,28,26,0.4)' }}
        />
        <View className="rounded-t-3xl bg-paper px-6 pb-8 pt-6">
          <View className="mb-5 flex-row items-center justify-between">
            <Text className="text-lg font-medium text-ink">태스크 수정</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text className="text-[13px] text-ink-mute">닫기</Text>
            </Pressable>
          </View>

          <TextInput
            className="h-12 rounded-lg bg-track px-3 text-[15px] text-ink"
            placeholder="할 일 이름"
            placeholderTextColor="#A6A69E"
            value={title}
            onChangeText={setTitle}
            returnKeyType="done"
          />

          <Text className="mb-2 mt-6 text-[13px] text-ink-mute">중요도</Text>
          <View className="flex-row gap-2">
            {IMPORTANCE_LEVELS.map((level) => {
              const active = importance === level;
              return (
                <Pressable
                  key={level}
                  onPress={() => setImportance(level)}
                  className={`flex-1 items-center rounded-lg py-3 ${
                    active ? 'bg-racing' : 'bg-track'
                  }`}>
                  <Text
                    className={`font-digitbold text-base tracking-[2px] ${
                      active ? 'text-white' : 'text-ink-faint'
                    }`}>
                    {'›'.repeat(level)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mb-2 mt-6 text-[13px] text-ink-mute">베팅 시간</Text>
          <View className="flex-row gap-2">
            {BET_PRESETS.map((preset) => {
              const active = betMinutes === preset;
              return (
                <Pressable
                  key={preset}
                  onPress={() => setBetMinutes(preset)}
                  className={`flex-1 items-center rounded-lg py-3 ${
                    active ? 'bg-racing' : 'bg-track'
                  }`}>
                  <Text
                    className={`font-digit text-[15px] ${active ? 'text-white' : 'text-ink-mute'}`}>
                    {preset}′
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={save}
            className="mt-8 items-center rounded-2xl bg-ink py-4 active:opacity-80">
            <Text className="text-[15px] font-medium text-paper">저장</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (task) onDelete(task.id);
              onClose();
            }}
            className="mt-3 items-center py-2"
            hitSlop={8}>
            <Text className="text-[13px] text-racing">삭제</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
