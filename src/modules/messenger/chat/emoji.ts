/** 输入栏表情面板里的表情 */
export const EMOJIS = Array.from(
  '😀😁😂🤣😊😍😘😎🤔😴😭😡😅🙂😉😇🥳😱😳🤗🤝👍👎👏🙏💪👌✌️🎉❤️💔🔥✅❌⭐🌹☕🍺🎂🚀💯'.match(/\p{Extended_Pictographic}️?/gu) ?? [],
);

/** 消息菜单里的快捷回应 */
export const REACTIONS = ['👍', '❤️', '😂', '🎉', '🙏', '👌', '🔥', '✅'];
