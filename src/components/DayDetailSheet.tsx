import { Modal, Pressable, Text, View } from 'react-native';

import { DailyRecord } from '@/domain/progress';
import { confirmDestructive } from '@/utils/dialog';
import { formatClock } from '@/utils/time';

function formatTitle(date: string): string {
  const [, month, day] = date.split('-');
  return `${parseInt(month, 10)}월 ${parseInt(day, 10)}일`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between border-b-[0.5px] border-hairline py-4">
      <Text className="text-[15px] text-ink-mute">{label}</Text>
      <Text className="font-digitbold text-xl text-ink">{value}</Text>
    </View>
  );
}

export function DayDetailSheet({
  record,
  onClose,
  onDelete,
}: {
  record: DailyRecord | null;
  onClose: () => void;
  onDelete: (date: string) => void;
}) {
  const handleDelete = () => {
    if (!record) return;
    confirmDestructive({
      title: '이 날 기록을 삭제할까요?',
      message: '삭제하면 되돌릴 수 없어요.',
      confirmLabel: '삭제',
      onConfirm: () => {
        onDelete(record.date);
        onClose();
      },
    });
  };

  return (
    <Modal visible={record !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* 배경: 시트 콘텐츠의 형제로 두어야 콘텐츠 탭이 오버레이로 전파돼 닫히지 않음 (RN-web) */}
        <Pressable
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(28,28,26,0.4)' }}
        />
        <View className="rounded-t-3xl bg-paper px-6 pb-8 pt-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xl font-medium text-ink">
              {record ? formatTitle(record.date) : ''}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text className="text-[15px] text-ink-mute">닫기</Text>
            </Pressable>
          </View>

          {record && (
            <View>
              <Row label="집중 시간" value={formatClock(record.focusSeconds)} />
              <Row label="XP" value={`${record.xp}`} />
              <Row label="클리어" value={`${record.cleared}/${record.attempted}`} />
              <Row label="타임 세이브" value={formatClock(record.savedSeconds)} />
              <Row label="최대 콤보" value={`×${record.maxCombo}`} />
            </View>
          )}

          <Pressable onPress={handleDelete} className="mt-6 items-center py-2" hitSlop={8}>
            <Text className="text-[15px] text-racing">이 날 기록 삭제</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
