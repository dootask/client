import type { Dialog } from '../../../sync/api/dialog';
import type { Member } from '../../../sync/api/group';

export function groupPermissions(d: Dialog | undefined, me: number, admin: boolean) {
  const group = d?.type === 'group';
  const owner = group && me > 0 && d.owner_id === me;
  const deputy = group && me > 0 && !!d.deputy_ids?.includes(me);
  const allAdmin = group && d.group_type === 'all' && admin;
  return {
    owner,
    deputy,
    edit: group && (owner || deputy || allAdmin),
    rename: group && (d.group_type === 'user' ? owner || deputy : allAdmin),
    add: group && (d.group_type === 'all' ? admin : d.owner_id === 0 || owner || deputy),
    transfer: owner && d.group_type === 'user',
    disband: owner && d.group_type === 'user',
    exit: group && !owner,
    report: !!d && (group ? !owner || d.group_type === 'user' : !d.bot),
    anon: d?.type === 'user' && !d.bot && !!d.dialog_user?.userid && d.dialog_user.userid !== me,
  };
}

export function canRemove(d: Dialog, me: number, userid: number) {
  if (!me || userid === me || userid === d.owner_id) return false;
  return d.owner_id === me || (!!d.deputy_ids?.includes(me) && !d.deputy_ids.includes(userid));
}

export function memberList(members: readonly Member[], d: Dialog | undefined, key: string) {
  const word = key.trim().toLowerCase();
  const rank = (id: number) => id === d?.owner_id ? 0 : d?.deputy_ids?.includes(id) ? 1 : 2;
  return members.filter((m) => !word || `${m.nickname ?? ''} ${m.email ?? ''} ${m.pinyin ?? ''}`.toLowerCase().includes(word)).sort((a, b) => rank(a.userid) - rank(b.userid) || (a.created_at ?? '').localeCompare(b.created_at ?? ''));
}

export type HeaderCommand = 'search' | 'info' | 'detail' | 'edit' | 'editBot' | 'prompt' | 'avatar' | 'create' | 'transfer' | 'report' | 'exit' | 'disband';

export function headerCommands(d: Dialog, me: number, admin: boolean): HeaderCommand[] {
  const can = groupPermissions(d, me, admin);
  if (d.type === 'user') {
    const list: HeaderCommand[] = ['search', 'detail'];
    if (d.bot && (d.bot === me || (d.dialog_user?.userid === d.bot && admin))) list.push('editBot');
    if (d.bot && /^ai-[^@]+@bot\.system$/.test(d.email ?? '')) list.push('prompt');
    list.push('create');
    if (can.report) list.push('report');
    return list;
  }
  const list: HeaderCommand[] = ['search', 'info'];
  if (can.owner || (d.group_type === 'all' && admin)) list.push('edit');
  if (d.avatar) list.push('avatar');
  if (can.transfer) list.push('transfer');
  if (can.report) list.push('report');
  if (can.exit) list.push('exit');
  if (can.disband) list.push('disband');
  return list;
}
