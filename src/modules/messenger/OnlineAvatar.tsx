import { type AvatarSize, UserAvatar } from '../../ui/Avatar';
import { useSession } from '../session';
import { useUser } from './hooks';

/** 带在线点的用户头像（同旧版）：机器人和自己总是在线 */
export function OnlineAvatar(props: { uri?: string | null; userid: number; name: string; bot: boolean; size: AvatarSize }) {
  const selfId = useSession((s) => s.user?.userid ?? 0);
  const online = useUser(props.userid)?.online;
  return <UserAvatar {...props} online={props.bot || props.userid === selfId || !!online} />;
}
