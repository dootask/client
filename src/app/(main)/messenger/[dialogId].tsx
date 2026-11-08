import { useLocalSearchParams } from 'expo-router';

import { ChatPlaceholder } from '../../../modules/messenger';

export default function DialogScreen() {
  const { dialogId } = useLocalSearchParams<{ dialogId: string }>();
  return <ChatPlaceholder dialogId={Number(dialogId) || 0} />;
}
