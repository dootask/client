import { create } from 'zustand';

export const useContactsDialog = create<{ dialogId: number }>(() => ({ dialogId: 0 }));
